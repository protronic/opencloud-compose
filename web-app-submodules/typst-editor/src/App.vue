<template>
  <div class="typst-editor">
    <header class="toolbar">
      <span class="app-label">Typst</span>
      <span class="separator" aria-hidden="true" />
      <span v-if="statusText" class="status-hint" :class="{error: compileFailed}">
        {{ statusText }}
      </span>
      <span class="spacer" />
      <template v-if="!isReadOnly">
        <button
          type="button"
          class="tb-btn-text"
          title="In OpenCloud speichern"
          :disabled="!ready || saving"
          @click="saveToOpenCloud"
        >
          Speichern
        </button>
      </template>
      <template v-else>
        <span class="status-hint">Schreibgeschützt</span>
      </template>
      <button
        type="button"
        class="tb-btn-text"
        title="Über Typst Editor"
        aria-label="Über Typst Editor"
        @click="aboutOpen = true"
      >
        ⓘ
      </button>
    </header>

    <main class="panes">
      <div ref="editorElement" class="editor-pane" />
      <div class="preview-pane">
        <div v-if="compileError" class="error-banner">{{ compileError }}</div>
        <div ref="previewElement" class="typst-preview" />
      </div>
      <div v-if="aboutOpen" class="about-backdrop" @pointerdown.self="aboutOpen = false">
        <div class="about-dialog" role="dialog" aria-label="Über Typst Editor">
          <h2>Typst Editor</h2>
          <dl>
            <dt>Version</dt>
            <dd>{{ aboutInfo.version }}</dd>
            <dt>Git-Commit</dt>
            <dd class="mono">{{ aboutInfo.commit }}</dd>
            <dt>Build</dt>
            <dd>{{ aboutInfo.buildTime }}</dd>
          </dl>
          <div class="about-actions">
            <button type="button" @click="aboutOpen = false">Schließen</button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import {$typst, TypstSnippet} from '@myriaddreamin/typst.ts/contrib/snippet';
import {loadFonts} from '@myriaddreamin/typst.ts';
import compilerWasmUrl from '@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url';
import rendererWasmUrl from '@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm?url';
import fontSans from 'dejavu-fonts-ttf/ttf/DejaVuSans.ttf?url';
import fontSansBold from 'dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf?url';
import fontSansOblique from 'dejavu-fonts-ttf/ttf/DejaVuSans-Oblique.ttf?url';
import fontSansBoldOblique from 'dejavu-fonts-ttf/ttf/DejaVuSans-BoldOblique.ttf?url';
import fontSerif from 'dejavu-fonts-ttf/ttf/DejaVuSerif.ttf?url';
import fontSerifBold from 'dejavu-fonts-ttf/ttf/DejaVuSerif-Bold.ttf?url';
import fontSerifItalic from 'dejavu-fonts-ttf/ttf/DejaVuSerif-Italic.ttf?url';
import fontSerifBoldItalic from 'dejavu-fonts-ttf/ttf/DejaVuSerif-BoldItalic.ttf?url';
import fontMono from 'dejavu-fonts-ttf/ttf/DejaVuSansMono.ttf?url';
import fontMonoBold from 'dejavu-fonts-ttf/ttf/DejaVuSansMono-Bold.ttf?url';
import fontMath from 'dejavu-fonts-ttf/ttf/DejaVuMathTeXGyre.ttf?url';
import {basicSetup} from 'codemirror';
import {EditorView, keymap} from '@codemirror/view';
import {EditorState} from '@codemirror/state';
import {indentWithTab} from '@codemirror/commands';
import type {Resource} from '@opencloud-eu/web-client';
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue';

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

const aboutInfo = {
  version: __APP_VERSION__,
  commit: __APP_COMMIT__,
  buildTime: new Date(__APP_BUILD_TIME__).toLocaleString('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }),
};

const editorElement = ref<HTMLDivElement>();
const previewElement = ref<HTMLDivElement>();
const ready = ref(false);
const compiling = ref(false);
const compileFailed = ref(false);
const compileError = ref('');
const saving = ref(false);
const dirty = ref(false);
const aboutOpen = ref(false);

let editorView: EditorView | undefined;
let emitTimer = 0;
let compileTimer = 0;
let compileQueued = false;
let compileRunning = false;
let lastEmitted: string | undefined;
let destroyed = false;

const statusText = computed(() => {
  if (!ready.value) return 'Typst wird geladen …';
  if (compiling.value) return 'Kompiliere …';
  if (compileFailed.value) return 'Kompilierfehler';
  if (saving.value) return 'Speichern …';
  if (dirty.value) return 'Änderungen ausstehend';
  return '';
});

function contentToString(value: ContentValue | undefined): string {
  if (typeof value === 'string') return value;
  if (value instanceof Uint8Array) return new TextDecoder().decode(value);
  if (value instanceof ArrayBuffer) return new TextDecoder().decode(new Uint8Array(value));
  return '';
}

/** The typst.ts WASM pipeline is shared per page load. */
let typstConfigured = false;

function configureTypst(): void {
  if (typstConfigured) return;
  typstConfigured = true;
  // All assets are bundled and served same-origin: the instance CSP has no
  // CDN hosts in connect-src, so default remote font assets must stay off.
  $typst.use(TypstSnippet.disableDefaultFontAssets(), {
    key: 'access-model',
    forRoles: ['compiler'],
    // assets: false keeps loadFonts from appending the remote default font
    // assets (CDN), which the instance CSP would block anyway.
    provides: [
      loadFonts(
        [
          fontSans,
          fontSansBold,
          fontSansOblique,
          fontSansBoldOblique,
          fontSerif,
          fontSerifBold,
          fontSerifItalic,
          fontSerifBoldItalic,
          fontMono,
          fontMonoBold,
          fontMath,
        ],
        {assets: false},
      ),
    ],
  });
  $typst.setCompilerInitOptions({getModule: () => compilerWasmUrl});
  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__typst = $typst;
  // The user document is compiled through a wrapper that maps typst's
  // defaults (Libertinus/New Computer Modern, neither redistributable via
  // npm) onto the bundled DejaVu families, so text, code and math work out
  // of the box. Diagnostics keep pointing at the user file.
  void $typst.addSource(
    '/main.typ',
    [
      '#set text(font: ("DejaVu Serif", "DejaVu Sans"))',
      '#show math.equation: set text(font: "DejaVu Math TeX Gyre")',
      '#show raw: set text(font: "DejaVu Sans Mono")',
      '#include "doc.typ"',
    ].join('\n') + '\n',
  );
  $typst.setRendererInitOptions({getModule: () => rendererWasmUrl});
}

async function compileNow(): Promise<void> {
  if (destroyed || !editorView) return;
  if (compileRunning) {
    compileQueued = true;
    return;
  }
  compileRunning = true;
  compiling.value = true;
  const source = editorView.state.doc.toString();
  try {
    await $typst.addSource('/doc.typ', source);
    const svg = await $typst.svg({mainFilePath: '/main.typ'});
    if (!destroyed && previewElement.value) {
      previewElement.value.innerHTML = svg ?? '';
    }
    compileFailed.value = false;
    compileError.value = '';
    ready.value = true;
  } catch (err) {
    compileFailed.value = true;
    compileError.value = formatCompileError(err);
    ready.value = true;
  } finally {
    compileRunning = false;
    compiling.value = false;
    if (compileQueued) {
      compileQueued = false;
      void compileNow();
    }
  }
}

function formatCompileError(err: unknown): string {
  if (Array.isArray(err)) {
    // typst.ts rejects with a diagnostics array.
    const lines = err
      .map((diag) => {
        const entry = diag as {message?: string; range?: string; severity?: string};
        const range = entry.range ? ` (${entry.range})` : '';
        return entry.message ? `${entry.message}${range}` : '';
      })
      .filter(Boolean);
    if (lines.length) return lines.slice(0, 5).join('\n');
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

function scheduleCompile(): void {
  window.clearTimeout(compileTimer);
  compileTimer = window.setTimeout(() => {
    void compileNow();
  }, 500);
}

function scheduleEmit(): void {
  if (props.isReadOnly) return;
  dirty.value = true;
  window.clearTimeout(emitTimer);
  emitTimer = window.setTimeout(() => {
    emitContent();
  }, 800);
}

function emitContent(): void {
  if (!editorView || props.isReadOnly) return;
  const source = editorView.state.doc.toString();
  if (source === lastEmitted) {
    dirty.value = false;
    return;
  }
  lastEmitted = source;
  dirty.value = false;
  emit('update:currentContent', source);
}

function saveToOpenCloud(): void {
  if (props.isReadOnly) return;
  window.clearTimeout(emitTimer);
  emitContent();
  saving.value = true;
  emit('save');
  window.setTimeout(() => {
    saving.value = false;
  }, 800);
}

function setEditorContent(text: string): void {
  if (!editorView) return;
  const current = editorView.state.doc.toString();
  if (current === text) return;
  editorView.dispatch({
    changes: {from: 0, to: current.length, insert: text},
  });
}

watch(
  () => props.currentContent,
  (value) => {
    if (value === undefined || value === null) return;
    const text = contentToString(value);
    // Ignore the echo of our own update:currentContent emissions.
    if (text === lastEmitted) return;
    lastEmitted = text;
    setEditorContent(text);
    scheduleCompile();
  },
);

onMounted(() => {
  configureTypst();

  const initial = contentToString(props.currentContent);
  lastEmitted = initial;
  editorView = new EditorView({
    parent: editorElement.value!,
    state: EditorState.create({
      doc: initial,
      extensions: [
        basicSetup,
        keymap.of([indentWithTab]),
        EditorState.readOnly.of(props.isReadOnly),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            scheduleCompile();
            scheduleEmit();
          }
        }),
        EditorView.theme({
          '&': {height: '100%', fontSize: '13px'},
          '.cm-scroller': {overflow: 'auto', fontFamily: "'DejaVu Sans Mono', monospace"},
        }),
      ],
    }),
  });

  void compileNow();
});

onBeforeUnmount(() => {
  destroyed = true;
  window.clearTimeout(emitTimer);
  window.clearTimeout(compileTimer);
  editorView?.destroy();
  editorView = undefined;
});
</script>

<style scoped>
.typst-editor {
  --toolbar-bg: #f9f9fa;
  --toolbar-border: #b6b6b8;
  --toolbar-text: #2a2a2e;
  --toolbar-muted: #6f6f77;
  --button-hover: #dddedf;
  --field-bg: #ffffff;
  --field-border: #8f8f9d;
  --accent: #239dad;
  --body-bg: #d4d4d7;
  --error-bg: #fdecea;
  --error-border: #f2b8b5;
  --error-text: #8c1d18;

  color-scheme: light;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  background: var(--body-bg);
  font-family: system-ui, sans-serif;
}

@media (prefers-color-scheme: dark) {
  .typst-editor {
    --toolbar-bg: #38383d;
    --toolbar-border: #0c0c0d;
    --toolbar-text: #f9f9fa;
    --toolbar-muted: #b1b1b9;
    --button-hover: #4a4a4f;
    --field-bg: #2a2a2e;
    --field-border: #8f8f9d;
    --body-bg: #2a2a2e;
    color-scheme: dark;
  }
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
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

.separator {
  width: 1px;
  height: 20px;
  background: var(--toolbar-border);
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

.panes {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
}

.editor-pane {
  flex: 1 1 50%;
  min-width: 0;
  overflow: hidden;
  background: var(--field-bg);
  border-right: 1px solid var(--toolbar-border);
}

.editor-pane :deep(.cm-editor) {
  height: 100%;
}

.preview-pane {
  position: relative;
  flex: 1 1 50%;
  min-width: 0;
  overflow: auto;
  background: var(--body-bg);
}

.typst-preview {
  padding: 16px;
}

.typst-preview :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.error-banner {
  position: sticky;
  top: 8px;
  z-index: 5;
  margin: 8px 16px 0;
  padding: 8px 12px;
  border: 1px solid var(--error-border);
  border-radius: 6px;
  background: var(--error-bg);
  color: var(--error-text);
  font-family: 'DejaVu Sans Mono', monospace;
  font-size: 12px;
  white-space: pre-wrap;
}

.about-backdrop {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: rgba(0, 0, 0, 0.25);
}

.about-dialog {
  margin-top: 12vh;
  width: min(360px, 90%);
  padding: 14px 16px;
  border: 1px solid var(--toolbar-border);
  border-radius: 8px;
  background: var(--toolbar-bg);
  color: var(--toolbar-text);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  font-size: 13px;
}

.about-dialog h2 {
  margin: 0 0 10px;
  font-size: 15px;
}

.about-dialog dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 5px 16px;
  margin: 0;
}

.about-dialog dt {
  color: var(--toolbar-muted);
}

.about-dialog dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.about-dialog .mono {
  font-family: ui-monospace, monospace;
  user-select: all;
}

.about-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.about-actions button {
  padding: 4px 12px;
  border: 1px solid var(--field-border);
  border-radius: 4px;
  background: var(--field-bg);
  color: var(--toolbar-text);
  font-size: 13px;
  cursor: pointer;
}

.about-actions button:hover {
  background: var(--button-hover);
}
</style>
