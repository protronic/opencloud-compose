<template>
  <div class="typst-editor">
    <header class="toolbar">
      <span class="app-label">Typst</span>
      <span class="separator" aria-hidden="true" />
      <template v-if="!isReadOnly && !viewMode">
        <div class="toolbar-group" aria-label="Verlauf">
          <button type="button" class="tb-btn" title="Rückgängig" @click="runUndo">↶</button>
          <button type="button" class="tb-btn" title="Wiederholen" @click="runRedo">↷</button>
        </div>
        <span class="separator" aria-hidden="true" />
        <div class="toolbar-group" aria-label="Formatierung">
          <button
            type="button"
            class="tb-btn"
            title="Überschrift"
            @click="insertLinePrefix('= ')"
          >
            H
          </button>
          <button type="button" class="tb-btn bold" title="Fett" @click="wrapSelection('*')">
            B
          </button>
          <button
            type="button"
            class="tb-btn italic"
            title="Kursiv"
            @click="wrapSelection('_')"
          >
            I
          </button>
          <button type="button" class="tb-btn mono" title="Code" @click="wrapSelection('`')">
            &lt;&gt;
          </button>
          <button type="button" class="tb-btn" title="Liste" @click="insertLinePrefix('- ')">
            ≔
          </button>
          <button
            type="button"
            class="tb-btn"
            title="Nummerierte Liste"
            @click="insertLinePrefix('+ ')"
          >
            ⒈
          </button>
          <button
            type="button"
            class="tb-btn"
            title="Link"
            @click="insertSnippet('#link(&quot;https://&quot;)[', ']')"
          >
            🔗
          </button>
          <button type="button" class="tb-btn" title="Formel" @click="wrapSelection('$ ', ' $')">
            Σ
          </button>
          <button
            type="button"
            class="tb-btn mono"
            title="Wiki-Link zu einer .typ-Datei"
            @click="insertSnippet('#link(&quot;seite.typ&quot;)[', ']')"
          >
            [[]]
          </button>
        </div>
        <span class="separator" aria-hidden="true" />
      </template>
      <span v-if="statusText" class="status-hint" :class="{error: compileFailed}">
        {{ statusText }}
      </span>
      <span class="spacer" />
      <button
        v-if="!isReadOnly"
        type="button"
        class="tb-btn-text"
        :title="viewMode ? 'Zum Bearbeiten wechseln' : 'Zum Lesemodus wechseln'"
        @click="toggleViewMode"
      >
        {{ viewMode ? 'Bearbeiten' : 'Lesemodus' }}
      </button>
      <button
        type="button"
        class="tb-btn-text"
        title="Als PDF nach OpenCloud exportieren"
        :disabled="!ready || exporting"
        @click="exportPdf"
      >
        PDF
      </button>
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

    <main ref="panesElement" class="panes">
      <div v-show="!viewMode" class="editor-pane" :style="{flexBasis: `${editorPct}%`}">
        <div ref="editorElement" class="editor-host" />
      </div>
      <div
        v-show="!viewMode"
        class="pane-divider"
        title="Teilung anpassen"
        @pointerdown="onDividerDown"
        @pointermove="onDividerMove"
        @pointerup="onDividerUp"
        @pointercancel="onDividerUp"
      />
      <div class="preview-pane" :class="{reading: viewMode}">
        <div v-if="compileError" class="error-banner">{{ compileError }}</div>
        <div v-if="!ready" class="boot-hint">
          <span class="boot-spinner" aria-hidden="true" />
          <strong>Typst wird vorbereitet …</strong>
          <span>
            Der Typst-Compiler (~28&nbsp;MB) wird beim ersten Öffnen heruntergeladen und danach
            aus dem Browser-Cache geladen.
          </span>
        </div>
        <div class="preview-zoom" role="group" aria-label="Vorschau-Zoom">
          <button type="button" title="Verkleinern" @click="zoomPreview(-1)">−</button>
          <span>{{ Math.round(previewZoom * 100) }}%</span>
          <button type="button" title="Vergrößern" @click="zoomPreview(1)">+</button>
        </div>
        <div ref="previewElement" class="typst-preview" :style="previewStyle" />
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
import {indentWithTab, redo, undo} from '@codemirror/commands';
import type {Resource, SpaceResource} from '@opencloud-eu/web-client';
import {ocContext} from './ocContext';
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue';

type ContentValue = string | ArrayBuffer | Uint8Array;

const props = withDefaults(
  defineProps<{
    currentContent: ContentValue;
    isReadOnly?: boolean;
    resource: Resource;
    space?: SpaceResource;
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

const panesElement = ref<HTMLElement>();
const editorElement = ref<HTMLDivElement>();
const previewElement = ref<HTMLDivElement>();
const ready = ref(false);
const compiling = ref(false);
const compileFailed = ref(false);
const compileError = ref('');
const saving = ref(false);
const exporting = ref(false);
const dirty = ref(false);
const aboutOpen = ref(false);
const previewZoom = ref(1);
const pdfNotice = ref('');
const editorPct = ref(50);
// Wiki reading mode: existing documents open as rendered page, empty (new)
// documents jump straight into the editor. Read-only always stays in view.
const viewMode = ref(
  props.isReadOnly || contentToString(props.currentContent).trim().length > 0,
);

let editorView: EditorView | undefined;
let previewContainer: HTMLDivElement | undefined;
let emitTimer = 0;
let compileTimer = 0;
let compileQueued = false;
let compileRunning = false;
let lastEmitted: string | undefined;
let destroyed = false;
let dividerPointer: number | null = null;

const statusText = computed(() => {
  if (!ready.value) return 'Typst wird geladen …';
  if (compiling.value) return 'Kompiliere …';
  if (compileFailed.value) return 'Kompilierfehler';
  if (exporting.value) return 'PDF wird erstellt …';
  if (pdfNotice.value) return pdfNotice.value;
  if (saving.value) return 'Speichern …';
  if (dirty.value) return 'Änderungen ausstehend';
  return '';
});

// In reading mode the page gets a fixed, centered column instead of filling
// the pane; the zoom control scales that column width.
const previewStyle = computed(() =>
  viewMode.value
    ? {width: `${Math.round(previewZoom.value * 850)}px`}
    : {width: `${previewZoom.value * 100}%`},
);

function toggleViewMode(): void {
  if (props.isReadOnly) return;
  viewMode.value = !viewMode.value;
}

watch(viewMode, (isViewing) => {
  if (isViewing) return;
  // CodeMirror was mounted inside a v-show-hidden pane and needs a
  // re-measure once the pane becomes visible.
  window.requestAnimationFrame(() => {
    editorView?.requestMeasure();
    editorView?.focus();
  });
});

function contentToString(value: ContentValue | undefined): string {
  if (typeof value === 'string') return value;
  if (value instanceof Uint8Array) return new TextDecoder().decode(value);
  if (value instanceof ArrayBuffer) return new TextDecoder().decode(new Uint8Array(value));
  return '';
}

/**
 * The typst.ts pipeline is a shared singleton that survives component
 * remounts and even re-evaluations of this module (Module Federation can
 * load a fresh copy of the app chunk while the singleton lives on). The
 * configured marker therefore sits on the instance itself, and the calls
 * are guarded: use() throws "already prepare uses for instances" when a
 * previous copy already configured it.
 */
function configureTypst(): void {
  const instance = $typst as unknown as Record<string, unknown>;
  if (instance.__typstEditorConfigured) return;
  instance.__typstEditorConfigured = true;
  try {
    configureTypstOnce();
  } catch (configError) {
    console.warn('typst-editor: Typst-Singleton war bereits konfiguriert', configError);
  }
  // Idempotent and safe on an initialized compiler.
  void $typst.addSource(
    '/main.typ',
    [
      '#set text(font: ("DejaVu Serif", "DejaVu Sans"))',
      '#show math.equation: set text(font: "DejaVu Math TeX Gyre")',
      '#show raw: set text(font: "DejaVu Sans Mono")',
      '#include "doc.typ"',
    ].join('\n') + '\n',
  );
}

function configureTypstOnce(): void {
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
  $typst.setRendererInitOptions({getModule: () => rendererWasmUrl});
  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__typst = $typst;
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
    if (!destroyed && previewContainer) {
      previewContainer.innerHTML = svg ?? '';
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

async function exportPdf(): Promise<void> {
  if (!editorView || exporting.value) return;
  exporting.value = true;
  try {
    await $typst.addSource('/doc.typ', editorView.state.doc.toString());
    const bytes = await $typst.pdf({mainFilePath: '/main.typ'});
    if (!bytes) throw new Error('leere PDF-Ausgabe');
    // Exact-size ArrayBuffer: the WebDAV transport sends `view.buffer`.
    const content =
      bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
        ? (bytes.buffer as ArrayBuffer)
        : (bytes.slice().buffer as ArrayBuffer);
    const pdfName = (props.resource?.name ?? 'dokument.typ').replace(/\.typ$/i, '') + '.pdf';
    if (ocContext.savePdf && props.space) {
      // Write the PDF next to the .typ file in OpenCloud.
      const pdfPath = (props.resource?.path ?? `/${pdfName}`).replace(/\.typ$/i, '.pdf');
      await ocContext.savePdf(props.space, pdfPath, content);
      pdfNotice.value = `PDF gespeichert: ${pdfName}`;
    } else {
      // Outside the OpenCloud runtime: hand the PDF to the browser.
      const url = URL.createObjectURL(new Blob([content], {type: 'application/pdf'}));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = pdfName;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      pdfNotice.value = `PDF heruntergeladen: ${pdfName}`;
    }
    window.setTimeout(() => {
      pdfNotice.value = '';
    }, 4000);
  } catch (err) {
    compileFailed.value = true;
    compileError.value = `PDF-Export fehlgeschlagen: ${formatCompileError(err)}`;
  } finally {
    exporting.value = false;
  }
}

// --- Wiki navigation ---------------------------------------------------------

/**
 * Resolves a wiki link target from the rendered document against the
 * directory of the currently open .typ file. Accepts `seite`, `seite.typ`,
 * `./unter/seite.typ`, `../andere.typ` and space-absolute `/wiki/seite.typ`;
 * a missing .typ extension is appended. Returns null when the target
 * escapes the space root.
 */
function resolveWikiPath(currentPath: string, target: string): string | null {
  let path = (target.split('#')[0] ?? '').split('?')[0]?.trim() ?? '';
  if (!path) return null;
  if (!/\.typ$/i.test(path)) path += '.typ';
  const baseDir = currentPath.replace(/[^/]*$/, '');
  const combined = path.startsWith('/') ? path : baseDir + path;
  const parts: string[] = [];
  for (const segment of combined.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      if (!parts.length) return null;
      parts.pop();
      continue;
    }
    parts.push(segment);
  }
  return parts.length ? `/${parts.join('/')}` : null;
}

async function openWikiTarget(target: string): Promise<void> {
  const currentPath = props.resource?.path ?? '/';
  const resolved = resolveWikiPath(currentPath, target);
  if (!resolved || resolved === currentPath) return;
  if (!ocContext.openTyp || !props.space) {
    pdfNotice.value = 'Wiki-Navigation außerhalb von OpenCloud nicht verfügbar';
    window.setTimeout(() => (pdfNotice.value = ''), 4000);
    return;
  }
  // Flush pending edits before leaving the page.
  if (!props.isReadOnly && dirty.value) {
    window.clearTimeout(emitTimer);
    emitContent();
    emit('save');
  }
  pdfNotice.value = `Öffne ${resolved.split('/').pop()} …`;
  try {
    await ocContext.openTyp(props.space, resolved);
    pdfNotice.value = '';
  } catch (err) {
    pdfNotice.value = `Navigation fehlgeschlagen: ${formatCompileError(err)}`;
    window.setTimeout(() => (pdfNotice.value = ''), 6000);
  }
}

function onPreviewClick(event: MouseEvent): void {
  const anchor = (event.target as Element | null)?.closest?.('a');
  if (!anchor) return;
  const href = anchor.getAttribute('href') ?? anchor.getAttribute('xlink:href') ?? '';
  // Absolute URLs (https:, mailto:, …) keep the typst default: new tab.
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return;
  event.preventDefault();
  event.stopPropagation();
  // In-document anchors (#label) have no wiki target.
  if (!href || href.startsWith('#')) return;
  void openWikiTarget(href);
}

// --- Editor helpers (typst.app-style formatting toolbar) --------------------

function wrapSelection(prefix: string, suffix = prefix): void {
  if (!editorView || props.isReadOnly) return;
  const {from, to} = editorView.state.selection.main;
  const selected = editorView.state.sliceDoc(from, to);
  editorView.dispatch({
    changes: {from, to, insert: `${prefix}${selected}${suffix}`},
    selection: {anchor: from + prefix.length, head: from + prefix.length + selected.length},
  });
  editorView.focus();
}

function insertSnippet(prefix: string, suffix: string): void {
  wrapSelection(prefix, suffix);
}

function insertLinePrefix(prefix: string): void {
  if (!editorView || props.isReadOnly) return;
  const {state} = editorView;
  const range = state.selection.main;
  const fromLine = state.doc.lineAt(range.from);
  const toLine = state.doc.lineAt(range.to);
  const changes = [];
  for (let lineNo = fromLine.number; lineNo <= toLine.number; lineNo++) {
    changes.push({from: state.doc.line(lineNo).from, insert: prefix});
  }
  editorView.dispatch({changes});
  editorView.focus();
}

function runUndo(): void {
  if (editorView) undo(editorView);
  editorView?.focus();
}

function runRedo(): void {
  if (editorView) redo(editorView);
  editorView?.focus();
}

// --- Preview zoom and pane divider ------------------------------------------

function zoomPreview(direction: number): void {
  const next = previewZoom.value * (direction > 0 ? 1.2 : 1 / 1.2);
  previewZoom.value = Math.min(3, Math.max(0.4, Math.round(next * 100) / 100));
}

function onDividerDown(event: PointerEvent): void {
  dividerPointer = event.pointerId;
  (event.target as HTMLElement).setPointerCapture(event.pointerId);
  event.preventDefault();
}

function onDividerMove(event: PointerEvent): void {
  if (dividerPointer !== event.pointerId || !panesElement.value) return;
  const rect = panesElement.value.getBoundingClientRect();
  const pct = ((event.clientX - rect.left) / rect.width) * 100;
  editorPct.value = Math.min(80, Math.max(20, pct));
}

function onDividerUp(event: PointerEvent): void {
  if (dividerPointer === event.pointerId) dividerPointer = null;
}

function setEditorContent(text: string): void {
  if (!editorView) return;
  const current = editorView.state.doc.toString();
  if (current === text) return;
  editorView.dispatch({
    changes: {from: 0, to: current.length, insert: text},
  });
}

// The wrapped component is reused when the wiki navigation swaps the route
// to another .typ file: the wrapper first updates the resource, then loads
// and passes the new content. The flag defers the mode reset to the moment
// the new content actually arrives.
let pendingDocSwitch = false;

watch(
  () => props.resource?.id ?? props.resource?.path,
  (id, previous) => {
    if (id !== previous) pendingDocSwitch = true;
  },
);

watch(
  () => props.currentContent,
  (value) => {
    if (value === undefined || value === null) return;
    const text = contentToString(value);
    if (pendingDocSwitch) {
      pendingDocSwitch = false;
      lastEmitted = text;
      dirty.value = false;
      setEditorContent(text);
      // Wiki flow: existing pages open for reading, new (empty) pages for
      // writing.
      viewMode.value = props.isReadOnly || text.trim().length > 0;
      scheduleCompile();
      return;
    }
    // Ignore the echo of our own update:currentContent emissions.
    if (text === lastEmitted) return;
    lastEmitted = text;
    setEditorContent(text);
    scheduleCompile();
  },
);

onMounted(() => {
  configureTypst();

  // The typst SVG output embeds global style rules (e.g. `svg { fill:
  // none; }`) that would apply to the whole OpenCloud document as inline
  // SVG - hiding every host icon, including the app's close button. A
  // shadow root keeps those styles contained.
  const host = previewElement.value!;
  const shadow = host.shadowRoot ?? host.attachShadow({mode: 'open'});
  shadow.innerHTML =
    '<style>' +
    ':host { display: block; }' +
    '.typst-doc-host svg { display: block; width: 100%; height: auto;' +
    ' background: #ffffff; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2); }' +
    '</style>' +
    '<div class="typst-doc-host"></div>';
  previewContainer = shadow.querySelector('.typst-doc-host') as HTMLDivElement;
  // Wiki links: clicks on relative .typ targets navigate inside OpenCloud
  // instead of opening a new tab.
  previewContainer.addEventListener('click', onPreviewClick);

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
  previewContainer?.removeEventListener('click', onPreviewClick);
  previewContainer = undefined;
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
  gap: 4px;
  flex-wrap: wrap;
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

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.tb-btn {
  display: grid;
  place-items: center;
  min-width: 28px;
  height: 28px;
  padding: 0 4px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--toolbar-text);
  font-size: 14px;
  cursor: pointer;
}

.tb-btn:hover:enabled {
  background: var(--button-hover);
}

.tb-btn.bold {
  font-weight: 700;
}

.tb-btn.italic {
  font-style: italic;
}

.tb-btn.mono {
  font-family: ui-monospace, monospace;
  font-size: 12px;
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
  flex: 0 0 50%;
  min-width: 0;
  overflow: hidden;
  background: var(--field-bg);
}

.editor-host {
  height: 100%;
}

.editor-host :deep(.cm-editor) {
  height: 100%;
}

.pane-divider {
  flex: 0 0 5px;
  cursor: col-resize;
  background: var(--toolbar-border);
  touch-action: none;
}

.pane-divider:hover {
  background: var(--accent);
}

.preview-pane {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  overflow: auto;
  background: var(--body-bg);
}

.boot-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  max-width: 340px;
  margin: 15vh auto 0;
  padding: 16px;
  border: 1px solid var(--toolbar-border);
  border-radius: 8px;
  background: var(--toolbar-bg);
  color: var(--toolbar-muted);
  font-size: 13px;
  text-align: center;
}

.boot-hint strong {
  color: var(--toolbar-text);
}

.boot-spinner {
  width: 22px;
  height: 22px;
  border: 3px solid var(--toolbar-border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: typst-spin 0.9s linear infinite;
}

@keyframes typst-spin {
  to {
    transform: rotate(360deg);
  }
}

.preview-zoom {
  position: sticky;
  top: 8px;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 4px;
  width: fit-content;
  margin-left: auto;
  margin-right: 12px;
  padding: 2px 6px;
  border: 1px solid var(--toolbar-border);
  border-radius: 6px;
  background: var(--toolbar-bg);
  color: var(--toolbar-text);
  font-size: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
}

.preview-zoom button {
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  font-size: 14px;
  cursor: pointer;
}

.preview-zoom button:hover {
  background: var(--button-hover);
}

.typst-preview {
  min-width: 100%;
  padding: 0 16px 16px;
  box-sizing: border-box;
}

.preview-pane.reading .typst-preview {
  min-width: 0;
  max-width: 100%;
  margin: 0 auto;
  padding-top: 16px;
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
