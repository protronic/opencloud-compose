<template>
  <div class="fb-app">
    <div class="fb-toolbar">
      <button :title="$gettext('Diagramm einpassen')" @click="fitViewport">
        {{ $gettext('Einpassen') }}
      </button>
      <button
        v-if="!isReadOnly"
        :title="$gettext('Berry-Script erzeugen und neben der Datei speichern')"
        @click="exportBerry"
      >
        {{ $gettext('Berry exportieren') }}
      </button>
      <button
        :class="{active: showCode}"
        :title="$gettext('Generierten Berry-Code anzeigen')"
        @click="toggleCode"
      >
        {{ $gettext('Code') }}
      </button>
      <span class="fb-status">{{ status }}</span>
    </div>

    <div class="fb-editor">
      <div ref="canvasEl" class="fb-canvas" />

      <aside v-if="!isReadOnly && selectedInfo" class="fb-props">
        <h3>{{ selectedInfo.title }}</h3>
        <label v-if="selectedInfo.hasSignal">
          {{ $gettext('Signal') }}
          <input v-model="propSignal" type="text" spellcheck="false" @change="applyProps" />
        </label>
        <label v-if="selectedInfo.isContact" class="fb-check">
          <input v-model="propNegated" type="checkbox" @change="applyProps" />
          {{ $gettext('Negiert (Öffner)') }}
        </label>
        <label v-if="selectedInfo.isTimer">
          {{ $gettext('Preset (ms)') }}
          <input v-model.number="propPreset" type="number" min="0" step="10" @change="applyProps" />
        </label>
        <p class="fb-hint">
          {{ $gettext('Reihe = UND, parallele Zweige über den Verteiler = ODER.') }}
        </p>
      </aside>

      <aside v-if="showCode" class="fb-code">
        <pre>{{ generatedCode }}</pre>
        <ul v-if="codeWarnings.length" class="fb-warnings">
          <li v-for="(warning, index) in codeWarnings" :key="index">{{ warning }}</li>
        </ul>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref, shallowRef, useTemplateRef, watch} from 'vue';
import {useGettext} from 'vue3-gettext';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import BpmnViewer from 'bpmn-js/lib/Viewer';
import MinimapModule from 'diagram-js-minimap';
import type {AppConfigObject} from '@opencloud-eu/web-pkg';
import type {Resource, SpaceResource} from './ocContext.ts';
import {ocContext} from './ocContext.ts';
import {FlowberryModule} from './flowberry/index.ts';
import flowberryModdle from './flowberry/flowberry.moddle.json';
import {emitBerry} from './berry/emitter.ts';
import {BERRY_IO_STUBS, BERRY_RUNTIME, BERRY_TASMOTA_HINT} from './berry/runtime.ts';
import {emptyDiagram} from './emptyDiagram.ts';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import 'diagram-js-minimap/assets/diagram-js-minimap.css';
import './flowberry/palette.css';

const {$gettext} = useGettext();

const props = defineProps<{
  resource: Resource;
  space?: SpaceResource;
  applicationConfig: AppConfigObject;
  currentContent: string;
  isReadOnly: boolean;
  isDirty: boolean;
}>();

const emit = defineEmits<{
  'update:currentContent': [value: string];
  save: [];
  close: [];
}>();

const canvasEl = useTemplateRef<HTMLElement>('canvasEl');
const modeler = shallowRef<any>();
const status = ref('');
const showCode = ref(false);
const generatedCode = ref('');
const codeWarnings = ref<string[]>([]);

const selectedElement = shallowRef<any>(null);
const selectedInfo = ref<null | {
  title: string;
  hasSignal: boolean;
  isContact: boolean;
  isTimer: boolean;
}>(null);
const propSignal = ref('');
const propNegated = ref(false);
const propPreset = ref(0);

function describeSelection(element: any) {
  const bo = element?.businessObject;
  const kind = bo?.get?.('fb:kind');
  if (!kind) {
    selectedInfo.value = null;
    return;
  }
  const titles: Record<string, string> = {
    contact: $gettext('Kontakt'),
    coil: $gettext('Spule'),
    ton: $gettext('TON — Einschaltverzögerung'),
    tof: $gettext('TOF — Ausschaltverzögerung'),
  };
  selectedInfo.value = {
    title: titles[kind] ?? kind,
    hasSignal: kind === 'contact' || kind === 'coil',
    isContact: kind === 'contact',
    isTimer: kind === 'ton' || kind === 'tof',
  };
  propSignal.value = bo.name ?? '';
  propNegated.value = bo.get('fb:negated') === true;
  propPreset.value = parseInt(String(bo.get('fb:preset') ?? '0'), 10) || 0;
}

function applyProps() {
  const element = selectedElement.value;
  const instance = modeler.value;
  if (!element || !instance) {
    return;
  }
  const modeling = instance.get('modeling');
  const update: Record<string, unknown> = {};
  if (selectedInfo.value?.hasSignal) {
    update['name'] = propSignal.value.trim();
  }
  if (selectedInfo.value?.isContact) {
    update['fb:negated'] = propNegated.value;
  }
  if (selectedInfo.value?.isTimer) {
    update['fb:preset'] = propPreset.value;
  }
  modeling.updateProperties(element, update);
}

function fitViewport() {
  modeler.value?.get('canvas')?.zoom('fit-viewport');
}

function buildBerry(): string {
  const instance = modeler.value;
  if (!instance) {
    return '';
  }
  const registry = instance.get('elementRegistry');
  const {code, warnings} = emitBerry(registry, {
    fileName: props.resource?.name,
    scanMs: 50,
  });
  codeWarnings.value = warnings;
  return code
    .replace('%RUNTIME%', BERRY_RUNTIME)
    .replace('%IO%', BERRY_IO_STUBS + '\n' + BERRY_TASMOTA_HINT);
}

function toggleCode() {
  showCode.value = !showCode.value;
  if (showCode.value) {
    generatedCode.value = buildBerry();
  }
}

async function exportBerry() {
  const code = buildBerry();
  generatedCode.value = code;
  const beName = (props.resource?.name ?? 'logik.flowberry').replace(/\.flowberry$/i, '') + '.be';

  if (ocContext.saveSibling && props.space) {
    const bePath = (props.resource?.path ?? `/${beName}`).replace(/\.flowberry$/i, '.be');
    try {
      await ocContext.saveSibling(props.space, bePath, code);
      status.value = $gettext('Gespeichert:') + ' ' + beName;
      return;
    } catch (err) {
      console.error('flowberry: sibling save failed, falling back to download', err);
    }
  }

  const blob = new Blob([code], {type: 'text/plain'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = beName;
  link.click();
  URL.revokeObjectURL(url);
  status.value = $gettext('Als Download exportiert:') + ' ' + beName;
}

async function importXml(xml: string) {
  const instance = modeler.value;
  if (!instance || !xml) {
    return;
  }
  try {
    await instance.importXML(xml);
    fitViewport();
  } catch (err) {
    console.error('flowberry: failed to import diagram XML', err);
    status.value = $gettext('Datei konnte nicht gelesen werden.');
  }
}

async function handleChange() {
  const instance = modeler.value;
  if (!instance || props.isReadOnly) {
    return;
  }
  try {
    const {xml} = await instance.saveXML({format: true});
    if (xml) {
      emit('update:currentContent', xml);
    }
    if (showCode.value) {
      generatedCode.value = buildBerry();
    }
  } catch (err) {
    console.error('flowberry: failed to serialize diagram', err);
  }
}

function handleKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault();
    emit('save');
  }
}

function createInstance() {
  const common = {
    container: canvasEl.value,
    moddleExtensions: {fb: flowberryModdle},
  };
  if (props.isReadOnly) {
    return new BpmnViewer({
      ...common,
      additionalModules: [MinimapModule],
    });
  }
  return new BpmnModeler({
    ...common,
    additionalModules: [FlowberryModule, MinimapModule],
  });
}

onMounted(async () => {
  const instance = createInstance();
  modeler.value = instance;

  if (!props.isReadOnly) {
    instance.on('commandStack.changed', handleChange);
    instance.on('selection.changed', (event: any) => {
      const element = event.newSelection?.[0] ?? null;
      selectedElement.value = element;
      describeSelection(element);
    });
  }

  window.addEventListener('keydown', handleKeydown);
  await importXml(props.currentContent || emptyDiagram);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
  modeler.value?.destroy();
});

watch(
  () => props.resource?.id ?? props.resource?.path,
  () => {
    importXml(props.currentContent);
  }
);
</script>

<style scoped>
.fb-app {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.fb-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--oc-role-outline-variant);
  background: var(--oc-role-surface-container);
  color: var(--oc-role-on-surface);
}

.fb-toolbar button {
  padding: 4px 10px;
  border: 1px solid var(--oc-role-outline-variant);
  border-radius: 4px;
  background: var(--oc-role-surface);
  color: var(--oc-role-on-surface);
  cursor: pointer;
  font-size: 13px;
}

.fb-toolbar button:hover {
  background: var(--oc-role-surface-container-high);
}

.fb-toolbar button.active {
  background: var(--oc-role-primary-container);
  color: var(--oc-role-on-primary-container);
  border-color: var(--oc-role-primary);
}

.fb-status {
  margin-left: auto;
  font-size: 12px;
  opacity: 0.8;
}

.fb-editor {
  display: flex;
  flex: 1;
  min-height: 0;
}

/* bpmn-js kennt keinen Dark-Mode → Zeichenfläche erzwungen hell */
.fb-canvas {
  flex: 1;
  min-height: 0;
  background: #fdfdfb;
  color-scheme: light;
  color: #2f3b45;
}

.fb-props,
.fb-code {
  width: 300px;
  border-left: 1px solid #e0e0e0;
  overflow-y: auto;
  background: #fafafa;
  color-scheme: light;
  color: #2f3b45;
  padding: 12px;
  font-size: 13px;
}

.fb-props h3 {
  margin: 0 0 10px;
  font-size: 14px;
}

.fb-props label {
  display: block;
  margin-bottom: 10px;
}

.fb-props input[type='text'],
.fb-props input[type='number'] {
  display: block;
  width: 100%;
  margin-top: 3px;
  padding: 4px 6px;
  border: 1px solid #c9c9c9;
  border-radius: 3px;
  font-family: ui-monospace, monospace;
  box-sizing: border-box;
}

.fb-check input {
  margin-right: 6px;
}

.fb-hint {
  font-size: 12px;
  opacity: 0.7;
}

.fb-code {
  width: 380px;
}

.fb-code pre {
  margin: 0;
  font-family: ui-monospace, monospace;
  font-size: 11.5px;
  white-space: pre-wrap;
  word-break: break-word;
}

.fb-warnings {
  margin: 10px 0 0;
  padding-left: 18px;
  color: #8a5a00;
  font-size: 12px;
}
</style>
