<template>
  <div class="pdf-annotator">
    <header class="toolbar">
      <div class="toolbar-group" aria-label="Seitennavigation">
        <button
          type="button"
          class="tb-btn"
          title="Vorherige Seite"
          aria-label="Vorherige Seite"
          :disabled="!pdfLoaded || currentPage <= 1"
          @click="goPage(-1)"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 5.2 13.4 10.6l-1.1 1.1L8 7.4l-4.3 4.3-1.1-1.1z" />
          </svg>
        </button>
        <button
          type="button"
          class="tb-btn"
          title="Nächste Seite"
          aria-label="Nächste Seite"
          :disabled="!pdfLoaded || currentPage >= pageCount"
          @click="goPage(1)"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 10.8 2.6 5.4l1.1-1.1L8 8.6l4.3-4.3 1.1 1.1z" />
          </svg>
        </button>
        <input
          v-model="pageInputValue"
          class="page-input"
          type="text"
          inputmode="numeric"
          title="Seite"
          aria-label="Seite"
          :disabled="!pdfLoaded"
          @change="onPageSubmit"
          @keydown.enter="onPageSubmit"
        />
        <span class="page-count">von {{ pageCount }}</span>
      </div>

      <span class="separator" aria-hidden="true" />

      <div class="toolbar-group" aria-label="Zoom">
        <button
          type="button"
          class="tb-btn"
          title="Verkleinern"
          aria-label="Verkleinern"
          :disabled="!pdfLoaded"
          @click="zoomOut"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3 7.25h10v1.5H3z" />
          </svg>
        </button>
        <button
          type="button"
          class="tb-btn"
          title="Vergrößern"
          aria-label="Vergrößern"
          :disabled="!pdfLoaded"
          @click="zoomIn"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M7.25 3h1.5v4.25H13v1.5H8.75V13h-1.5V8.75H3v-1.5h4.25z" />
          </svg>
        </button>
        <select
          v-model="zoomSelect"
          class="zoom-select"
          title="Zoom"
          aria-label="Zoom"
          :disabled="!pdfLoaded"
          @change="onZoomSelect"
        >
          <option v-if="zoomSelect === 'custom'" value="custom">{{ customZoomLabel }}</option>
          <option v-for="preset in zoomPresets" :key="preset.value" :value="preset.value">
            {{ preset.label }}
          </option>
        </select>
      </div>

      <span class="spacer" />

      <span v-if="statusText" class="status-hint">{{ statusText }}</span>

      <template v-if="!isReadOnly">
        <span class="separator" aria-hidden="true" />
        <div class="toolbar-group" role="toolbar" aria-label="Anmerkungswerkzeuge">
          <button
            type="button"
            class="tb-btn"
            :class="{toggled: editorMode === modes.NONE}"
            title="Auswahlwerkzeug"
            aria-label="Auswahlwerkzeug"
            :disabled="!pdfLoaded"
            @click="setMode(modes.NONE)"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4.5 1.7 12.9 9l-3.9.6 2.2 4.3-1.7.9-2.2-4.4-2.8 2.8z" />
            </svg>
          </button>
          <button
            type="button"
            class="tb-btn"
            :class="{toggled: editorMode === modes.HIGHLIGHT}"
            title="Text markieren"
            aria-label="Text markieren"
            :disabled="!pdfLoaded"
            @click="setMode(modes.HIGHLIGHT)"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M1.5 13.4h13v1.6h-13z" />
              <path d="m9.7 2 3.8 3.8-5.6 5.6-4.6.8.8-4.6zm-5 6.9-.4 2.3 2.3-.4 4.7-4.7-1.9-1.9z" />
            </svg>
          </button>
          <button
            type="button"
            class="tb-btn"
            :class="{toggled: editorMode === modes.FREETEXT}"
            title="Textnotiz einfügen"
            aria-label="Textnotiz einfügen"
            :disabled="!pdfLoaded"
            @click="setMode(modes.FREETEXT)"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M7.1 2h1.8l4.4 12h-1.9l-1-2.9H5.6l-1 2.9H2.7zm.9 2.7L6.2 9.4h3.6z" />
            </svg>
          </button>
          <button
            type="button"
            class="tb-btn"
            :class="{toggled: editorMode === modes.INK}"
            title="Freihand zeichnen"
            aria-label="Freihand zeichnen"
            :disabled="!pdfLoaded"
            @click="setMode(modes.INK)"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M11.2 1.7a1.4 1.4 0 0 1 2 0l1.1 1.1a1.4 1.4 0 0 1 0 2L6 13.1l-4.4 1.3L2.9 10zm-6.9 9.1-.6 2 2-.6 7.5-7.5-1.4-1.4z"
              />
            </svg>
          </button>
          <button
            type="button"
            class="tb-btn"
            :class="{toggled: editorMode === modes.STAMP}"
            title="Bild einfügen"
            aria-label="Bild einfügen"
            :disabled="!pdfLoaded"
            @click="setMode(modes.STAMP)"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M2.5 3h11a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm.5 8.5h10L9.8 7l-2.6 3-1.6-1.6z"
              />
              <circle cx="5.4" cy="6" r="1.1" />
            </svg>
          </button>
        </div>
      </template>
      <template v-else>
        <span class="separator" aria-hidden="true" />
        <span class="status-hint">Schreibgeschützt</span>
      </template>
    </header>

    <main class="viewer-region">
      <div ref="containerElement" class="viewer-scroll">
        <div ref="viewerElement" class="pdfViewer" />
      </div>
      <div v-if="error" class="error-banner">{{ error }}</div>
    </main>
  </div>
</template>

<script setup lang="ts">
import {
  AnnotationEditorType,
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentLoadingTask,
  type PDFDocumentProxy,
} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {EventBus, GenericL10n, PDFLinkService, PDFViewer} from 'pdfjs-dist/legacy/web/pdf_viewer.mjs';
import PdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?worker&inline';
import 'pdfjs-dist/legacy/web/pdf_viewer.css';
import type {Resource} from '@opencloud-eu/web-client';
import {computed, onBeforeUnmount, onMounted, ref, shallowRef, watch} from 'vue';

type ContentValue = ArrayBuffer | Uint8Array | string;

const props = withDefaults(
  defineProps<{
    currentContent: ContentValue;
    isReadOnly?: boolean;
    resource: Resource;
  }>(),
  {isReadOnly: false},
);

const emit = defineEmits<{
  (event: 'update:currentContent', value: ArrayBuffer): void;
}>();

const modes = {
  NONE: AnnotationEditorType.NONE,
  FREETEXT: AnnotationEditorType.FREETEXT,
  HIGHLIGHT: AnnotationEditorType.HIGHLIGHT,
  INK: AnnotationEditorType.INK,
  STAMP: AnnotationEditorType.STAMP,
} as const;

const zoomPresets = [
  {value: 'auto', label: 'Automatisch'},
  {value: 'page-fit', label: 'Seitengröße'},
  {value: 'page-width', label: 'Seitenbreite'},
  {value: '0.5', label: '50 %'},
  {value: '0.75', label: '75 %'},
  {value: '1', label: '100 %'},
  {value: '1.25', label: '125 %'},
  {value: '1.5', label: '150 %'},
  {value: '2', label: '200 %'},
  {value: '3', label: '300 %'},
  {value: '4', label: '400 %'},
];

const containerElement = ref<HTMLDivElement>();
const viewerElement = ref<HTMLDivElement>();
const editorMode = ref<number>(modes.NONE);
const currentPage = ref(1);
const pageInputValue = ref('1');
const pageCount = ref(0);
const scale = ref(1);
const zoomSelect = ref('page-width');
const pdfLoaded = ref(false);
const saving = ref(false);
const pendingCommit = ref(false);
const error = ref('');

// pdf.js objects rely on identity checks internally; keep them out of Vue's
// deep reactivity (same class of bug as the Blockly workspace in
// blockberry-editor).
const viewer = shallowRef<PDFViewer>();
let eventBus: EventBus | undefined;
let linkService: PDFLinkService | undefined;
let loadingTask: PDFDocumentLoadingTask | undefined;
let pdfDocument: PDFDocumentProxy | undefined;
let resizeObserver: ResizeObserver | undefined;
let commitTimer = 0;
let commitInFlight = false;
let commitQueued = false;
let loadToken = 0;
let lastEmitted: ArrayBuffer | undefined;
let lastAppliedContent: ContentValue | undefined;

const customZoomLabel = computed(() => `${Math.round(scale.value * 100)} %`);
const statusText = computed(() => {
  if (saving.value) return 'Anmerkungen werden übernommen …';
  if (pendingCommit.value) return 'Anmerkung ausstehend';
  return '';
});

watch(currentPage, (page) => {
  pageInputValue.value = String(page);
});

function toBytes(value: ContentValue | undefined): Uint8Array {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (typeof value === 'string') {
    const bytes = new Uint8Array(value.length);
    for (let index = 0; index < value.length; index++) {
      bytes[index] = value.charCodeAt(index) & 0xff;
    }
    return bytes;
  }
  return new Uint8Array(0);
}

async function loadDocumentFrom(source: ContentValue): Promise<void> {
  const token = ++loadToken;
  error.value = '';
  const bytes = toBytes(source);
  if (!bytes.length) {
    pdfLoaded.value = false;
    error.value = 'Die Datei ist leer oder konnte nicht geladen werden.';
    return;
  }

  // getDocument transfers the buffer to the worker, so hand over a copy.
  const task = getDocument({data: bytes.slice()});
  try {
    const document = await task.promise;
    if (token !== loadToken) {
      void document.destroy();
      return;
    }
    if (loadingTask && loadingTask !== task) {
      void loadingTask.destroy();
    }
    loadingTask = task;
    pdfDocument = document;
    // Fires once whenever the annotation storage transitions to "modified"
    // (editor added, edited, moved or removed); resetModified() re-arms it
    // after each commit. The upstream typings declare the hook as `null`.
    (document.annotationStorage as {onSetModified: (() => void) | null}).onSetModified = () =>
      scheduleCommit();
    pageCount.value = document.numPages;
    currentPage.value = 1;
    viewer.value!.setDocument(document);
    linkService!.setDocument(document, null);
    lastAppliedContent = source;
    pendingCommit.value = false;
    pdfLoaded.value = true;
    editorMode.value = modes.NONE;
  } catch (loadError) {
    if (token !== loadToken) return;
    pdfLoaded.value = false;
    error.value = `PDF konnte nicht geladen werden: ${
      loadError instanceof Error ? loadError.message : String(loadError)
    }`;
  }
}

function setMode(mode: number): void {
  if (!viewer.value || !pdfLoaded.value || props.isReadOnly) return;
  try {
    viewer.value.annotationEditorMode = {mode};
    editorMode.value = mode;
  } catch (modeError) {
    console.error(modeError);
  }
}

function scheduleCommit(): void {
  if (props.isReadOnly) return;
  pendingCommit.value = true;
  window.clearTimeout(commitTimer);
  commitTimer = window.setTimeout(() => {
    void commitAnnotations();
  }, 1200);
}

async function commitAnnotations(): Promise<void> {
  if (!pdfDocument || props.isReadOnly || !pdfLoaded.value) return;
  if (commitInFlight) {
    commitQueued = true;
    return;
  }
  commitInFlight = true;
  saving.value = true;
  try {
    const bytes = await pdfDocument.saveDocument();
    pdfDocument.annotationStorage.resetModified();
    // Emit an exact-size ArrayBuffer, never a Uint8Array view: axios sends
    // `view.buffer` for typed-array bodies, so a view over a larger buffer
    // would upload surrounding garbage bytes and corrupt the stored PDF.
    const payload =
      bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
        ? (bytes.buffer as ArrayBuffer)
        : (bytes.slice().buffer as ArrayBuffer);
    lastEmitted = payload;
    lastAppliedContent = payload;
    pendingCommit.value = false;
    emit('update:currentContent', payload);
  } catch (saveError) {
    error.value = `Anmerkungen konnten nicht übernommen werden: ${
      saveError instanceof Error ? saveError.message : String(saveError)
    }`;
  } finally {
    commitInFlight = false;
    saving.value = false;
    if (commitQueued) {
      commitQueued = false;
      void commitAnnotations();
    }
  }
}

function goPage(delta: number): void {
  if (!viewer.value || !pdfLoaded.value) return;
  const target = Math.min(Math.max(currentPage.value + delta, 1), pageCount.value || 1);
  viewer.value.currentPageNumber = target;
}

function onPageSubmit(): void {
  if (!viewer.value || !pdfLoaded.value) return;
  const parsed = Number.parseInt(pageInputValue.value, 10);
  const target = Number.isFinite(parsed)
    ? Math.min(Math.max(parsed, 1), pageCount.value || 1)
    : currentPage.value;
  pageInputValue.value = String(target);
  viewer.value.currentPageNumber = target;
}

function zoomIn(): void {
  if (!viewer.value || !pdfLoaded.value) return;
  viewer.value.currentScale = Math.min(4, viewer.value.currentScale * 1.1);
}

function zoomOut(): void {
  if (!viewer.value || !pdfLoaded.value) return;
  viewer.value.currentScale = Math.max(0.25, viewer.value.currentScale / 1.1);
}

function onZoomSelect(): void {
  if (!viewer.value || !pdfLoaded.value || zoomSelect.value === 'custom') return;
  const value = zoomSelect.value;
  if (value === 'auto' || value === 'page-fit' || value === 'page-width') {
    viewer.value.currentScaleValue = value;
  } else {
    viewer.value.currentScale = Number.parseFloat(value);
  }
}

watch(
  () => props.currentContent,
  (value) => {
    if (!viewer.value || value === undefined || value === null) return;
    // Ignore the echo of our own update:currentContent emissions.
    if (value === lastEmitted || value === lastAppliedContent) return;
    void loadDocumentFrom(value);
  },
);

onMounted(() => {
  GlobalWorkerOptions.workerPort ??= new PdfWorker();

  eventBus = new EventBus();
  linkService = new PDFLinkService({eventBus});
  viewer.value = new PDFViewer({
    container: containerElement.value!,
    viewer: viewerElement.value!,
    eventBus,
    linkService,
    // Without a language GenericL10n uses its baked-in fallback bundle and
    // performs no locale fetches.
    l10n: new (GenericL10n as unknown as new (lang?: string) => InstanceType<typeof GenericL10n>)(),
    annotationEditorMode: props.isReadOnly
      ? AnnotationEditorType.DISABLE
      : AnnotationEditorType.NONE,
    annotationEditorHighlightColors:
      'yellow=#FFFF98,green=#53FFBC,blue=#80EBFF,pink=#FFCBE6,red=#FF4F5F',
  });
  linkService.setViewer(viewer.value);

  eventBus.on('pagesinit', () => {
    if (!viewer.value) return;
    viewer.value.currentScaleValue = 'page-width';
    zoomSelect.value = 'page-width';
  });
  eventBus.on('pagechanging', ({pageNumber}: {pageNumber: number}) => {
    currentPage.value = pageNumber;
  });
  eventBus.on(
    'scalechanging',
    ({scale: newScale, presetValue}: {scale: number; presetValue?: string}) => {
      scale.value = newScale;
      if (presetValue) {
        zoomSelect.value = String(presetValue);
        return;
      }
      const preset = zoomPresets.find(
        (entry) => Math.abs(Number.parseFloat(entry.value) - newScale) < 0.001,
      );
      zoomSelect.value = preset ? preset.value : 'custom';
    },
  );
  resizeObserver = new ResizeObserver(() => {
    if (!viewer.value || !pdfLoaded.value) return;
    const scaleValue = viewer.value.currentScaleValue;
    if (scaleValue === 'page-width' || scaleValue === 'page-fit' || scaleValue === 'auto') {
      viewer.value.currentScaleValue = scaleValue;
    }
    viewer.value.update();
  });
  resizeObserver.observe(containerElement.value!);

  void loadDocumentFrom(props.currentContent);
});

onBeforeUnmount(() => {
  window.clearTimeout(commitTimer);
  loadToken++;
  resizeObserver?.disconnect();
  if (loadingTask) {
    void loadingTask.destroy();
  }
  loadingTask = undefined;
  pdfDocument = undefined;
});
</script>

<style scoped>
.pdf-annotator {
  --toolbar-bg: #f9f9fa;
  --toolbar-border: #b6b6b8;
  --toolbar-text: #2a2a2e;
  --toolbar-icon: #5b5b66;
  --toolbar-muted: #6f6f77;
  --button-hover: #dddedf;
  --toggled-bg: #cfcfd4;
  --toggled-hover: #c2c2c9;
  --separator: #b6b6b8;
  --field-bg: #ffffff;
  --field-border: #8f8f9d;
  --accent: #0060df;
  --body-bg: #d4d4d7;

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
  .pdf-annotator {
    --toolbar-bg: #38383d;
    --toolbar-border: #0c0c0d;
    --toolbar-text: #f9f9fa;
    --toolbar-icon: #fbfbfe;
    --toolbar-muted: #b1b1b9;
    --button-hover: #4a4a4f;
    --toggled-bg: #5b5b66;
    --toggled-hover: #67676f;
    --separator: #5b5b66;
    --field-bg: #2a2a2e;
    --field-border: #8f8f9d;
    --accent: #4db2ff;
    --body-bg: #2a2a2e;
    color-scheme: dark;
  }
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: wrap;
  min-height: 40px;
  padding: 4px 8px;
  background: var(--toolbar-bg);
  border-bottom: 1px solid var(--toolbar-border);
  color: var(--toolbar-text);
  font-size: 13px;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.tb-btn {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--toolbar-icon);
  cursor: pointer;
}

.tb-btn svg {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.tb-btn:hover:enabled {
  background: var(--button-hover);
}

.tb-btn.toggled {
  background: var(--toggled-bg);
  color: var(--toolbar-text);
}

.tb-btn.toggled:hover:enabled {
  background: var(--toggled-hover);
}

.tb-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.tb-btn:focus-visible,
.page-input:focus-visible,
.zoom-select:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.separator {
  width: 1px;
  height: 20px;
  margin: 0 6px;
  background: var(--separator);
}

.page-input {
  width: 40px;
  height: 24px;
  margin-left: 4px;
  border: 1px solid var(--field-border);
  border-radius: 4px;
  background: var(--field-bg);
  color: var(--toolbar-text);
  font-size: 13px;
  text-align: center;
}

.page-count {
  margin-left: 6px;
  color: var(--toolbar-muted);
  white-space: nowrap;
}

.zoom-select {
  height: 24px;
  min-width: 120px;
  margin-left: 4px;
  padding: 0 22px 0 8px;
  border: 1px solid var(--field-border);
  border-radius: 4px;
  appearance: none;
  background-color: var(--field-bg);
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%238f8f9d' d='M8 10.8 2.6 5.4l1.1-1.1L8 8.6l4.3-4.3 1.1 1.1z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 6px center;
  background-size: 12px;
  color: var(--toolbar-text);
  font-size: 12px;
}

.status-hint {
  color: var(--toolbar-muted);
  font-size: 12px;
  white-space: nowrap;
}

.spacer {
  flex: 1;
}

.viewer-region {
  position: relative;
  flex: 1;
  min-height: 0;
}

.viewer-scroll {
  position: absolute;
  inset: 0;
  overflow: auto;
  background: var(--body-bg);
}

.error-banner {
  position: absolute;
  left: 50%;
  top: 16px;
  transform: translateX(-50%);
  max-width: min(90%, 640px);
  padding: 10px 16px;
  border-radius: 8px;
  background: #fdecea;
  border: 1px solid #f2b8b5;
  color: #8c1d18;
  font-size: 13px;
}
</style>
