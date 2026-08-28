<template>
  <div class="typwys-app">
    <header class="toolbar">
      <span class="app-label">Typst WYSIWYG</span>
      <span v-if="statusText" class="status-hint" :class="{error: hasError}">
        {{ statusText }}
      </span>
      <span class="spacer" />
      <button
        v-if="sourceEditorAvailable"
        type="button"
        class="tb-btn-text"
        title="Im Quelltext-Editor öffnen"
        @click="openInSource"
      >
        Quelltext
      </button>
      <button
        v-if="!isReadOnly"
        type="button"
        class="tb-btn-text"
        title="In OpenCloud speichern"
        :disabled="!editorReady"
        @click="requestSave"
      >
        Speichern
      </button>
      <span v-else class="status-hint">Schreibgeschützt</span>
    </header>
    <iframe
      v-if="frameSrc"
      ref="frameElement"
      class="editor-frame"
      :src="frameSrc"
      title="Typst WYSIWYG Editor"
    />
  </div>
</template>

<script setup lang="ts">
import type {Resource} from '@opencloud-eu/web-client';
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue';
import {ocContext} from './ocContext';

type ContentValue = string | ArrayBuffer | Uint8Array;

const props = withDefaults(
  defineProps<{
    currentContent: ContentValue;
    isReadOnly?: boolean;
    resource: Resource;
  }>(),
  {isReadOnly: false},
);

const emit = defineEmits<{
  (event: 'update:currentContent', value: string): void;
  (event: 'save'): void;
}>();

const frameElement = ref<HTMLIFrameElement>();
const editorReady = ref(false);
const dirty = ref(false);
const saving = ref(false);
const hasError = ref(false);
const errorText = ref('');
const savedFlash = ref(false);
const sourceEditorAvailable = ref(false);
const frameLoaded = ref(false);

let lastEmitted: string | undefined;
let savedFlashTimer = 0;
let watchdogTimer = 0;
// Set while waiting for the editor's content reply before switching to the
// source editor, so unsent edits are flushed first.
let pendingSourceSwitch = false;

/**
 * The vendored editor app is built as static files into wysiwyg/ next to
 * the bundle. Candidate URLs are probed with a fetch (checking for the
 * app's marker, so an SPA fallback response is not mistaken for the page).
 * Resolved through a variable so Vite's static analysis does not rewrite
 * the `new URL(..., import.meta.url)` pattern into a single-asset
 * reference.
 */
const frameSrc = ref('');

function frameCandidates(): string[] {
  if (import.meta.env.DEV) return ['/wysiwyg/index.html'];
  const moduleUrl = import.meta.url;
  return [
    new URL('../wysiwyg/index.html', moduleUrl).href,
    new URL('/assets/apps/typst-wysiwyg/wysiwyg/index.html', window.location.origin).href,
  ];
}

async function probeCandidate(url: string): Promise<string> {
  const response = await fetch(url, {cache: 'no-store'});
  if (!response.ok) return `HTTP ${response.status}`;
  const body = await response.text();
  if (!body.includes('typst-wysiwyg-embed')) return 'liefert fremden Inhalt (SPA-Fallback?)';
  return '';
}

async function resolveFrameSrc(): Promise<void> {
  const failures: string[] = [];
  for (const candidate of frameCandidates()) {
    try {
      const failure = await probeCandidate(candidate);
      if (!failure) {
        frameSrc.value = `${candidate}?oc=1`;
        startWatchdog();
        return;
      }
      failures.push(`${candidate}: ${failure}`);
    } catch (err) {
      failures.push(`${candidate}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  hasError.value = true;
  errorText.value = `Editor-Dateien nicht erreichbar – ${failures.join(' | ')}`;
}

const statusText = computed(() => {
  if (hasError.value) return errorText.value;
  if (!editorReady.value) return 'Editor wird geladen …';
  if (saving.value) return 'Speichern …';
  if (savedFlash.value) return 'Gespeichert';
  if (dirty.value) return 'Änderungen ausstehend';
  return '';
});

function contentToString(value: ContentValue | undefined): string {
  if (typeof value === 'string') return value;
  if (value instanceof Uint8Array) return new TextDecoder().decode(value);
  if (value instanceof ArrayBuffer) return new TextDecoder().decode(new Uint8Array(value));
  return '';
}

function postToEditor(message: Record<string, unknown>): void {
  frameElement.value?.contentWindow?.postMessage(message, window.location.origin);
}

/**
 * Turns a silent hang into a diagnosable status: the page posts
 * typwys:frame-loaded from an inline script before any module loads, the
 * bridge posts typwys:ready once the editor booted.
 */
function startWatchdog(): void {
  window.clearTimeout(watchdogTimer);
  watchdogTimer = window.setTimeout(() => {
    if (editorReady.value || hasError.value) return;
    hasError.value = true;
    errorText.value = frameLoaded.value
      ? 'Editor startet nicht (Seite geladen, Skripte melden sich nicht – Browser-Konsole prüfen)'
      : `Editor-Seite wird nicht geladen (${frameSrc.value.split('?')[0]})`;
  }, 20000);
}

function loadIntoEditor(): void {
  const text = contentToString(props.currentContent);
  lastEmitted = text;
  postToEditor({type: 'typwys:load', text});
}

function requestSave(): void {
  if (props.isReadOnly || !editorReady.value) return;
  saving.value = true;
  postToEditor({type: 'typwys:request-content'});
}

async function switchToSource(): Promise<void> {
  if (!ocContext.openInSource) return;
  try {
    await ocContext.openInSource();
  } catch (err) {
    hasError.value = true;
    errorText.value = `Wechsel fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`;
    window.setTimeout(() => {
      hasError.value = false;
      errorText.value = '';
    }, 6000);
  }
}

function openInSource(): void {
  if (!ocContext.openInSource) return;
  if (!props.isReadOnly && editorReady.value) {
    // Flush the editor's current state (also triggers the wrapper save)
    // before the route switch tears the iframe down.
    pendingSourceSwitch = true;
    postToEditor({type: 'typwys:request-content'});
    return;
  }
  void switchToSource();
}

function onMessage(event: MessageEvent): void {
  if (event.source !== frameElement.value?.contentWindow) return;
  const msg = event.data as {type?: string; text?: string; explicit?: boolean; message?: string} | null;
  if (!msg?.type) return;
  if (msg.type === 'typwys:frame-loaded') {
    frameLoaded.value = true;
    return;
  }
  if (msg.type === 'typwys:boot-error') {
    hasError.value = true;
    errorText.value = `Editor-Start fehlgeschlagen: ${msg.message ?? 'unbekannter Fehler'}`;
    return;
  }
  if (msg.type === 'typwys:ready') {
    editorReady.value = true;
    hasError.value = false;
    errorText.value = '';
    window.clearTimeout(watchdogTimer);
    loadIntoEditor();
    return;
  }
  if (msg.type === 'typwys:content' && typeof msg.text === 'string') {
    if (props.isReadOnly) return;
    if (msg.text !== lastEmitted) {
      lastEmitted = msg.text;
      dirty.value = true;
      emit('update:currentContent', msg.text);
    }
    if (msg.explicit) {
      emit('save');
      dirty.value = false;
      saving.value = false;
      savedFlash.value = true;
      window.clearTimeout(savedFlashTimer);
      savedFlashTimer = window.setTimeout(() => (savedFlash.value = false), 1500);
      if (pendingSourceSwitch) {
        pendingSourceSwitch = false;
        void switchToSource();
      }
    }
    return;
  }
  if (msg.type === 'typwys:error') {
    hasError.value = true;
    errorText.value = `Dokument konnte nicht geladen werden: ${msg.message ?? 'unbekannter Fehler'}`;
  }
}

watch(
  () => props.currentContent,
  (value) => {
    if (value === undefined || value === null || !editorReady.value) return;
    const text = contentToString(value);
    // Ignore the echo of our own update:currentContent emissions.
    if (text === lastEmitted) return;
    lastEmitted = text;
    postToEditor({type: 'typwys:load', text});
  },
);

onMounted(() => {
  sourceEditorAvailable.value = !!ocContext.openInSource;
  window.addEventListener('message', onMessage);
  void resolveFrameSrc();
});

onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage);
  window.clearTimeout(savedFlashTimer);
  window.clearTimeout(watchdogTimer);
});
</script>

<style scoped>
.typwys-app {
  --toolbar-bg: #f9f9fa;
  --toolbar-border: #b6b6b8;
  --toolbar-text: #2a2a2e;
  --toolbar-muted: #6f6f77;
  --button-hover: #dddedf;
  --field-bg: #ffffff;
  --field-border: #8f8f9d;
  --accent: #2a9d8f;

  color-scheme: light;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  background: #fff;
  font-family: system-ui, sans-serif;
}

@media (prefers-color-scheme: dark) {
  .typwys-app {
    --toolbar-bg: #38383d;
    --toolbar-border: #0c0c0d;
    --toolbar-text: #f9f9fa;
    --toolbar-muted: #b1b1b9;
    --button-hover: #4a4a4f;
    --field-bg: #2a2a2e;
    color-scheme: dark;
  }
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 4px 10px;
  background: var(--toolbar-bg);
  border-bottom: 1px solid var(--toolbar-border);
  color: var(--toolbar-text);
  font-size: 13px;
}

.app-label {
  font-weight: 600;
  color: var(--accent);
}

.spacer {
  flex: 1;
}

.status-hint {
  color: var(--toolbar-muted);
  font-size: 12px;
  white-space: nowrap;
}

.status-hint.error {
  color: #c50042;
}

.tb-btn-text {
  padding: 4px 12px;
  border: 1px solid var(--field-border);
  border-radius: 4px;
  background: var(--field-bg);
  color: var(--toolbar-text);
  font-size: 13px;
  cursor: pointer;
}

.tb-btn-text:hover:enabled {
  background: var(--button-hover);
}

.tb-btn-text:disabled {
  opacity: 0.4;
  cursor: default;
}

.editor-frame {
  flex: 1;
  min-height: 0;
  width: 100%;
  border: 0;
  background: #fff;
}
</style>
