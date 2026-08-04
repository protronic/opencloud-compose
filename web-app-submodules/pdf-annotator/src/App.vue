<template>
  <div class="pdf-annotator">
    <header class="toolbar">
      <div v-if="!isReadOnly" class="tool-group" role="toolbar" aria-label="Anmerkungswerkzeuge">
        <button
          type="button"
          :class="{active: editorMode === modes.NONE}"
          title="Auswählen und Navigieren"
          @click="setMode(modes.NONE)"
        >
          Auswahl
        </button>
        <button
          type="button"
          :class="{active: editorMode === modes.HIGHLIGHT}"
          title="Text markieren"
          @click="setMode(modes.HIGHLIGHT)"
        >
          Markieren
        </button>
        <button
          type="button"
          :class="{active: editorMode === modes.FREETEXT}"
          title="Textnotiz einfügen"
          @click="setMode(modes.FREETEXT)"
        >
          Notiz
        </button>
        <button
          type="button"
          :class="{active: editorMode === modes.INK}"
          title="Freihand zeichnen"
          @click="setMode(modes.INK)"
        >
          Zeichnen
        </button>
        <button
          type="button"
          :class="{active: editorMode === modes.STAMP}"
          title="Bild oder Stempel einfügen"
          @click="setMode(modes.STAMP)"
        >
          Stempel
        </button>
      </div>
      <span v-else class="readonly-hint">Schreibgeschützt</span>

      <div class="tool-group zoom" aria-label="Zoom">
        <button type="button" title="Verkleinern" @click="zoomOut">−</button>
        <span class="zoom-label">{{ zoomLabel }}</span>
        <button type="button" title="Vergrößern" @click="zoomIn">+</button>
        <button type="button" title="An Seitenbreite anpassen" @click="fitWidth">Breite</button>
      </div>

      <span class="page-indicator">Seite {{ currentPage }} / {{ pageCount }}</span>

      <span class="spacer" />

      <span v-if="statusText" class="status">{{ statusText }}</span>
      <button
        v-if="!isReadOnly"
        type="button"
        class="save-button"
        :disabled="!pdfLoaded || saving"
        title="Anmerkungen in OpenCloud speichern"
        @click="saveNow"
      >
        Speichern
      </button>
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
  (event: 'update:currentContent', value: Uint8Array): void;
  (event: 'save'): void;
}>();

const modes = {
  NONE: AnnotationEditorType.NONE,
  FREETEXT: AnnotationEditorType.FREETEXT,
  HIGHLIGHT: AnnotationEditorType.HIGHLIGHT,
  INK: AnnotationEditorType.INK,
  STAMP: AnnotationEditorType.STAMP,
} as const;

const containerElement = ref<HTMLDivElement>();
const viewerElement = ref<HTMLDivElement>();
const editorMode = ref<number>(modes.NONE);
const currentPage = ref(1);
const pageCount = ref(0);
const scale = ref(1);
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
let lastEmitted: Uint8Array | undefined;
let lastAppliedContent: ContentValue | undefined;

const zoomLabel = computed(() => `${Math.round(scale.value * 100)} %`);
const statusText = computed(() => {
  if (saving.value) return 'Anmerkungen werden übernommen …';
  if (pendingCommit.value) return 'Ungespeicherte Anmerkungen';
  return '';
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
    lastEmitted = bytes;
    lastAppliedContent = bytes;
    pendingCommit.value = false;
    emit('update:currentContent', bytes);
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

async function saveNow(): Promise<void> {
  // Leaving the editor mode commits any annotation that is still open.
  setMode(modes.NONE);
  window.clearTimeout(commitTimer);
  await commitAnnotations();
  emit('save');
}

function zoomIn(): void {
  if (!viewer.value || !pdfLoaded.value) return;
  viewer.value.currentScale = Math.min(4, viewer.value.currentScale * 1.1);
}

function zoomOut(): void {
  if (!viewer.value || !pdfLoaded.value) return;
  viewer.value.currentScale = Math.max(0.25, viewer.value.currentScale / 1.1);
}

function fitWidth(): void {
  if (!viewer.value || !pdfLoaded.value) return;
  viewer.value.currentScaleValue = 'page-width';
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
  });
  eventBus.on('pagechanging', ({pageNumber}: {pageNumber: number}) => {
    currentPage.value = pageNumber;
  });
  eventBus.on('scalechanging', ({scale: newScale}: {scale: number}) => {
    scale.value = newScale;
  });
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
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  background: #f0f2f4;
  font-family: system-ui, sans-serif;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 8px 12px;
  background: #ffffff;
  border-bottom: 1px solid #d8dde2;
}

.tool-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar button {
  padding: 5px 10px;
  border: 1px solid #c6ccd2;
  border-radius: 6px;
  background: #ffffff;
  color: #1f2428;
  font-size: 13px;
  cursor: pointer;
}

.toolbar button:hover:not(:disabled) {
  background: #eef1f4;
}

.toolbar button.active {
  background: #1f2428;
  border-color: #1f2428;
  color: #ffffff;
}

.toolbar button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.save-button {
  font-weight: 600;
}

.zoom-label {
  min-width: 48px;
  text-align: center;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.page-indicator,
.readonly-hint,
.status {
  font-size: 13px;
  color: #4a5560;
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
  background: #f0f2f4;
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
