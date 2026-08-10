<template>
  <div class="pdf-annotator" :style="iconVars">
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
          <span class="tb-icon icon-page-up" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="tb-btn"
          title="Nächste Seite"
          aria-label="Nächste Seite"
          :disabled="!pdfLoaded || currentPage >= pageCount"
          @click="goPage(1)"
        >
          <span class="tb-icon icon-page-down" aria-hidden="true" />
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
          <span class="tb-icon icon-zoom-out" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="tb-btn"
          title="Vergrößern"
          aria-label="Vergrößern"
          :disabled="!pdfLoaded"
          @click="zoomIn"
        >
          <span class="tb-icon icon-zoom-in" aria-hidden="true" />
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
            <span class="tb-icon icon-select" aria-hidden="true" />
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
            <span class="tb-icon icon-highlight" aria-hidden="true" />
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
            <span class="tb-icon icon-freetext" aria-hidden="true" />
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
            <span class="tb-icon icon-ink" aria-hidden="true" />
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
            <span class="tb-icon icon-stamp" aria-hidden="true" />
          </button>
        </div>
      </template>
      <template v-else>
        <span class="separator" aria-hidden="true" />
        <span class="status-hint">Schreibgeschützt</span>
      </template>

      <span class="separator" aria-hidden="true" />
      <button
        type="button"
        class="tb-btn"
        title="Über PDF Annotator"
        aria-label="Über PDF Annotator"
        @click="aboutOpen = true"
      >
        <span class="tb-icon icon-about" aria-hidden="true" />
      </button>
    </header>

    <main ref="regionElement" class="viewer-region">
      <div ref="containerElement" class="viewer-scroll">
        <div ref="viewerElement" class="pdfViewer" />
      </div>
      <div v-if="error" class="error-banner">{{ error }}</div>
      <div v-if="aboutOpen" class="pdfa-about-backdrop" @pointerdown.self="aboutOpen = false">
        <div class="pdfa-about-dialog" role="dialog" aria-label="Über PDF Annotator">
          <h2 class="pdfa-about-title">PDF Annotator</h2>
          <dl class="pdfa-about-rows">
            <dt>Version</dt>
            <dd>{{ aboutInfo.version }}</dd>
            <dt>Git-Commit</dt>
            <dd class="pdfa-about-mono">{{ aboutInfo.commit }}</dd>
            <dt>Build</dt>
            <dd>{{ aboutInfo.buildTime }}</dd>
            <dt>pdf.js</dt>
            <dd>{{ aboutInfo.pdfjsVersion }}</dd>
          </dl>
          <div class="pdfa-about-actions">
            <button type="button" class="pdfa-about-close" @click="aboutOpen = false">
              Schließen
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import {
  AnnotationEditorType,
  getDocument,
  GlobalWorkerOptions,
  version as pdfjsVersion,
  type PDFDocumentLoadingTask,
  type PDFDocumentProxy,
} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {EventBus, GenericL10n, PDFLinkService, PDFViewer} from 'pdfjs-dist/legacy/web/pdf_viewer.mjs';
import PdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?worker&inline';
import 'pdfjs-dist/legacy/web/pdf_viewer.css';
import type {Resource} from '@opencloud-eu/web-client';
import {computed, onBeforeUnmount, onMounted, ref, shallowRef, watch} from 'vue';
import {PdfCommentManager} from './commentManager';
import iconCommentEdit from 'pdfjs-dist/legacy/web/images/comment-editButton.svg?url';
import iconEditorDelete from 'pdfjs-dist/legacy/web/images/editor-toolbar-delete.svg?url';
import iconSelect from 'pdfjs-dist/legacy/web/images/secondaryToolbarButton-selectTool.svg?url';
import iconFreeText from 'pdfjs-dist/legacy/web/images/toolbarButton-editorFreeText.svg?url';
import iconHighlight from 'pdfjs-dist/legacy/web/images/toolbarButton-editorHighlight.svg?url';
import iconInk from 'pdfjs-dist/legacy/web/images/toolbarButton-editorInk.svg?url';
import iconStamp from 'pdfjs-dist/legacy/web/images/toolbarButton-editorStamp.svg?url';
import iconPageDown from 'pdfjs-dist/legacy/web/images/toolbarButton-pageDown.svg?url';
import iconPageUp from 'pdfjs-dist/legacy/web/images/toolbarButton-pageUp.svg?url';
import iconZoomIn from 'pdfjs-dist/legacy/web/images/toolbarButton-zoomIn.svg?url';
import iconZoomOut from 'pdfjs-dist/legacy/web/images/toolbarButton-zoomOut.svg?url';

// The original pdf.js icon set ships with pdfjs-dist; the files are small
// enough for Vite to inline them as data URIs (Module-Federation-safe).
// `--comment-edit-button-icon` is referenced by the components stylesheet
// for the annotation comment buttons but never defined there.
const aboutIconSvg =
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'>" +
  "<path d='M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1zm0 1.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM8 3.9a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2zM7.1 7h1.8v5.2H7.1z'/>" +
  '</svg>';

const iconVars = {
  '--tbi-select': `url("${iconSelect}")`,
  '--tbi-about': `url("data:image/svg+xml,${encodeURIComponent(aboutIconSvg)}")`,
  '--tbi-freetext': `url("${iconFreeText}")`,
  '--tbi-highlight': `url("${iconHighlight}")`,
  '--tbi-ink': `url("${iconInk}")`,
  '--tbi-stamp': `url("${iconStamp}")`,
  '--tbi-page-up': `url("${iconPageUp}")`,
  '--tbi-page-down': `url("${iconPageDown}")`,
  '--tbi-zoom-in': `url("${iconZoomIn}")`,
  '--tbi-zoom-out': `url("${iconZoomOut}")`,
  '--comment-edit-button-icon': `url("${iconCommentEdit}")`,
  // Fallback for the delete icon in case the pdfjs-dist components
  // stylesheet (which defines --editor-toolbar-delete-image on .editToolbar)
  // is overridden by host styles.
  '--pdfa-delete-icon': `url("${iconEditorDelete}")`,
  // pdf.js positions the edit toolbar and the standalone comment button via
  // inline `calc(...% + var(...))` styles whose variables live in a :root
  // rule of pdf_viewer.css - i.e. on the shared <html> of the whole
  // OpenCloud page, where any other extension (e.g. another pdf.js copy)
  // can clobber them. A missing variable turns the whole calc() invalid,
  // `top` collapses to auto and the element falls to the bottom of the
  // page while its inline-end offset keeps working - annotations icons
  // then render detached near the page bottom. Defining the variables
  // inline on the app root makes our subtree independent of :root.
  '--editor-toolbar-vert-offset': '6px',
  '--comment-button-dim': '24px',
  '--dir-factor': '1',
};

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

const regionElement = ref<HTMLElement>();
const containerElement = ref<HTMLDivElement>();
const viewerElement = ref<HTMLDivElement>();
const editorMode = ref<number>(modes.NONE);
const currentPage = ref(1);
const pageInputValue = ref('1');
const pageCount = ref(0);
const scale = ref(1);
const zoomSelect = ref('page-width');
const pdfLoaded = ref(false);
const aboutOpen = ref(false);
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
let commentManager: PdfCommentManager | undefined;
let commitTimer = 0;
let commitInFlight = false;
let commitQueued = false;
let loadToken = 0;
let lastEmitted: ArrayBuffer | undefined;
let lastAppliedContent: ContentValue | undefined;

const aboutInfo = {
  version: __PDFA_VERSION__,
  commit: __PDFA_COMMIT__,
  buildTime: new Date(__PDFA_BUILD_TIME__).toLocaleString('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }),
  pdfjsVersion,
};

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

function onWindowKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && aboutOpen.value) {
    event.stopPropagation();
    aboutOpen.value = false;
  }
}

onMounted(() => {
  window.addEventListener('keydown', onWindowKeydown, true);
  GlobalWorkerOptions.workerPort ??= new PdfWorker();

  eventBus = new EventBus();
  linkService = new PDFLinkService({eventBus});
  commentManager = new PdfCommentManager({
    container: regionElement.value!,
    // Comment edits do not touch the annotation storage's modified flag,
    // so schedule the OpenCloud commit explicitly.
    onChanged: () => scheduleCommit(),
  });
  viewer.value = new PDFViewer({
    container: containerElement.value!,
    viewer: viewerElement.value!,
    eventBus,
    linkService,
    // Supported by the runtime (threaded through to the annotation editors
    // and layers); the shipped PDFViewerOptions typings lag behind.
    ...({commentManager} as object),
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
  window.removeEventListener('keydown', onWindowKeydown, true);
  window.clearTimeout(commitTimer);
  loadToken++;
  resizeObserver?.disconnect();
  commentManager?.destroy();
  commentManager = undefined;
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

.tb-icon {
  display: block;
  width: 16px;
  height: 16px;
  background-color: currentColor;
  -webkit-mask: var(--tb-icon) center / contain no-repeat;
  mask: var(--tb-icon) center / contain no-repeat;
}

.icon-select {
  --tb-icon: var(--tbi-select);
}
.icon-freetext {
  --tb-icon: var(--tbi-freetext);
}
.icon-highlight {
  --tb-icon: var(--tbi-highlight);
}
.icon-ink {
  --tb-icon: var(--tbi-ink);
}
.icon-stamp {
  --tb-icon: var(--tbi-stamp);
}
.icon-page-up {
  --tb-icon: var(--tbi-page-up);
}
.icon-page-down {
  --tb-icon: var(--tbi-page-down);
}
.icon-zoom-in {
  --tb-icon: var(--tbi-zoom-in);
}
.icon-zoom-out {
  --tb-icon: var(--tbi-zoom-out);
}
.icon-about {
  --tb-icon: var(--tbi-about);
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

.pdfa-about-backdrop {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: rgba(0, 0, 0, 0.25);
}

.pdfa-about-dialog {
  margin-top: 12vh;
  width: min(340px, 90%);
  padding: 14px 16px;
  border: 1px solid var(--toolbar-border);
  border-radius: 8px;
  background: var(--toolbar-bg);
  color: var(--toolbar-text);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  font-size: 13px;
}

.pdfa-about-title {
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 600;
}

.pdfa-about-rows {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 5px 16px;
  margin: 0;
}

.pdfa-about-rows dt {
  color: var(--toolbar-muted);
}

.pdfa-about-rows dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.pdfa-about-mono {
  font-family: ui-monospace, 'SF Mono', Consolas, monospace;
  user-select: all;
}

.pdfa-about-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.pdfa-about-close {
  padding: 4px 12px;
  border: 1px solid var(--field-border);
  border-radius: 4px;
  background: var(--field-bg);
  color: var(--toolbar-text);
  font-size: 13px;
  cursor: pointer;
}

.pdfa-about-close:hover {
  background: var(--button-hover);
}

.pdfa-about-close:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}
</style>

<!-- Unscoped: the comment dialog/popup are created programmatically by the
     comment manager, so scoped attributes would not reach them. -->
<style>
.pdf-annotator .pdfa-comment-backdrop {
  position: absolute;
  inset: 0;
  z-index: 20;
  background: rgba(0, 0, 0, 0.1);
}

.pdf-annotator .pdfa-comment-backdrop.hidden,
.pdf-annotator .pdfa-comment-popup.hidden {
  display: none;
}

.pdf-annotator .pdfa-comment-dialog {
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: min(320px, 90%);
  padding: 12px;
  border: 1px solid var(--toolbar-border);
  border-radius: 8px;
  background: var(--toolbar-bg);
  color: var(--toolbar-text);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  font-family: system-ui, sans-serif;
  font-size: 13px;
}

.pdf-annotator .pdfa-comment-text {
  resize: vertical;
  min-height: 64px;
  padding: 6px 8px;
  border: 1px solid var(--field-border);
  border-radius: 4px;
  background: var(--field-bg);
  color: var(--toolbar-text);
  font: inherit;
}

.pdf-annotator .pdfa-comment-text:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.pdf-annotator .pdfa-comment-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pdf-annotator .pdfa-comment-spacer {
  flex: 1;
}

.pdf-annotator .pdfa-comment-actions button {
  padding: 4px 12px;
  border: 1px solid var(--field-border);
  border-radius: 4px;
  background: var(--field-bg);
  color: var(--toolbar-text);
  font-size: 13px;
  cursor: pointer;
}

.pdf-annotator .pdfa-comment-actions button:hover {
  background: var(--button-hover);
}

.pdf-annotator .pdfa-comment-actions .pdfa-comment-save {
  background: var(--accent);
  border-color: var(--accent);
  color: #ffffff;
  font-weight: 600;
}

.pdf-annotator .pdfa-comment-actions .pdfa-comment-delete {
  color: #c50042;
}

.pdf-annotator .pdfa-comment-actions .pdfa-comment-delete.hidden {
  display: none;
}

.pdf-annotator .pdfa-comment-popup {
  position: absolute;
  z-index: 15;
  max-width: 280px;
  padding: 8px 10px;
  border: 1px solid var(--toolbar-border);
  border-radius: 6px;
  background: var(--toolbar-bg);
  color: var(--toolbar-text);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  font-family: system-ui, sans-serif;
  font-size: 12px;
  white-space: pre-wrap;
  overflow-wrap: break-word;
}

/* pdf.js builds its per-annotation edit toolbar from buttons with generic
   class names (.buttons, .basic, .comment, .commentButton, .deleteButton,
   .highlightButton). Inside OpenCloud the extension shares the document
   with the runtime and every other enabled extension, and a global rule
   for one of those names (e.g. a comments app styling `.comment`) tears
   the buttons out of the toolbar or hides their icons — seen in
   production as empty toolbar cells with the bubble/trash icons pinned to
   the bottom of the viewer. Re-assert layout and icons with scoped
   !important rules so host stylesheets cannot displace them. */
.pdf-annotator :is(.annotationEditorLayer, .textLayer, .annotationLayer) .editToolbar {
  position: absolute !important;
  background: var(--toolbar-bg) !important;
  border: 1px solid var(--toolbar-border) !important;
  border-radius: 6px;
  box-shadow: 0 2px 6px 0 rgba(58, 57, 68, 0.2);
}

.pdf-annotator .editToolbar.hidden {
  display: none !important;
}

.pdf-annotator .editToolbar .buttons {
  display: flex !important;
  position: static !important;
  align-items: center;
  justify-content: center;
}

.pdf-annotator .editToolbar .buttons > .hidden {
  display: none !important;
}

.pdf-annotator
  .editToolbar
  .buttons
  > :is(.basic, .comment, .commentButton, .deleteButton, .highlightButton, .altText) {
  position: static !important;
  inset: auto !important;
  margin: 0 !important;
  transform: none !important;
  float: none !important;
}

.pdf-annotator
  .editToolbar
  .buttons
  > :is(.basic, .comment, .commentButton, .deleteButton, .highlightButton):not(.hidden) {
  display: block !important;
  width: var(--editor-toolbar-height, 28px) !important;
  height: var(--editor-toolbar-height, 28px) !important;
  min-width: 0 !important;
  min-height: 0 !important;
  max-width: none !important;
  max-height: none !important;
  padding: 0 !important;
  border: none !important;
  background-color: transparent;
  cursor: pointer;
}

.pdf-annotator .editToolbar .buttons .divider {
  position: static !important;
  display: inline-block !important;
  width: 1px !important;
  background-color: var(--separator) !important;
}

/* The color-picker button needs position:relative as anchor for its
   dropdown; the plain ink color swatch is a regular flow child. */
.pdf-annotator .editToolbar .buttons > .colorPicker {
  position: relative !important;
  inset: auto !important;
  margin: 0 !important;
  float: none !important;
}

.pdf-annotator .editToolbar .buttons > .basicColorPicker {
  position: static !important;
  inset: auto !important;
  margin: 0 !important;
  float: none !important;
}

.pdf-annotator .editToolbar .buttons > :not(.divider):hover {
  border-radius: 2px;
  background-color: var(--editor-toolbar-hover-bg-color, #e0e0e6);
}

.pdf-annotator
  .editToolbar
  .buttons
  > :is(.basic, .comment, .commentButton, .deleteButton, .highlightButton)::before {
  content: '' !important;
  display: inline-block !important;
  position: static !important;
  width: 100% !important;
  height: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  /* The app's own theme variables instead of the pdf.js ones: the pdf.js
     colors run through a light-dark() polyfill keyed on :root state that
     the host page controls, which can paint the icons white-on-white. */
  background-color: var(--toolbar-icon) !important;
  -webkit-mask-repeat: no-repeat !important;
  mask-repeat: no-repeat !important;
  -webkit-mask-position: center !important;
  mask-position: center !important;
  -webkit-mask-size: auto !important;
  mask-size: auto !important;
}

.pdf-annotator
  .editToolbar
  .buttons
  > :is(.basic, .comment, .commentButton, .deleteButton, .highlightButton):hover::before {
  background-color: var(--toolbar-text) !important;
}

.pdf-annotator .editToolbar .buttons > :is(.comment, .commentButton)::before {
  -webkit-mask-image: var(--comment-edit-button-icon) !important;
  mask-image: var(--comment-edit-button-icon) !important;
}

.pdf-annotator .editToolbar .buttons > .deleteButton::before {
  -webkit-mask-image: var(--editor-toolbar-delete-image, var(--pdfa-delete-icon)) !important;
  mask-image: var(--editor-toolbar-delete-image, var(--pdfa-delete-icon)) !important;
}

.pdf-annotator .editToolbar .buttons > .highlightButton::before {
  -webkit-mask-image: var(--editor-toolbar-highlight-image, var(--tbi-highlight)) !important;
  mask-image: var(--editor-toolbar-highlight-image, var(--tbi-highlight)) !important;
}

/* Standalone comment bubble on annotations that carry a comment. */
.pdf-annotator :is(.annotationLayer, .annotationEditorLayer) .annotationCommentButton {
  position: absolute !important;
  width: var(--comment-button-dim, 24px) !important;
  height: var(--comment-button-dim, 24px) !important;
  margin: 0 !important;
  transform: none !important;
}

.pdf-annotator
  :is(.annotationLayer, .annotationEditorLayer)
  .annotationCommentButton::before {
  content: '' !important;
  display: inline-block !important;
  position: static !important;
  inset: auto !important;
  transform: none !important;
  width: 100% !important;
  height: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  -webkit-mask-image: var(--comment-edit-button-icon) !important;
  mask-image: var(--comment-edit-button-icon) !important;
  -webkit-mask-repeat: no-repeat !important;
  mask-repeat: no-repeat !important;
  -webkit-mask-size: cover !important;
  mask-size: cover !important;
  /* Literal color: the bubble background is always a light pastel mixed
     from the annotation color, independent of the host color scheme. */
  background-color: #5b5b66 !important;
}

.pdf-annotator .annotationLayer.disabled .annotationCommentButton {
  display: none !important;
}
</style>
