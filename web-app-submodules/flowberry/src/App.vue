<template>
  <div class="fb-app" :class="{'fb-app--connecting': connecting, 'fb-app--readonly': isReadOnly}">
    <div class="fb-toolbar">
      <template v-if="!isReadOnly">
        <button :disabled="!canUndo" :title="$gettext('Rückgängig (Strg+Z)')" @click="undo">↶</button>
        <button :disabled="!canRedo" :title="$gettext('Wiederholen (Strg+Y)')" @click="redo">↷</button>
        <span class="fb-toolbar__sep" />
      </template>
      <button :title="$gettext('Ganzen Ablaufplan anzeigen')" @click="fit">{{ $gettext('Einpassen') }}</button>
      <label class="fb-toolbar__field" :title="$gettext('Abstand der scan()-Aufrufe – Zeiten zählen in Zyklen')">
        {{ $gettext('Zyklus') }}
        <select :value="scanMs" :disabled="isReadOnly" @change="setScanMs">
          <option v-for="ms in SCAN_TIMES" :key="ms" :value="ms">{{ ms }} ms</option>
        </select>
      </label>
      <button class="fb-status" :class="`fb-status--${statusLevel}`" @click="showTab('issues')">
        {{ statusText }}
      </button>
      <button
        v-if="!isReadOnly"
        class="fb-toolbar__primary"
        :title="$gettext('Berry-Script erzeugen und neben der Datei speichern')"
        @click="exportBerry"
      >
        {{ $gettext('Berry exportieren') }}
      </button>
      <button
        :class="{active: sideOpen}"
        :title="$gettext('Seitenleiste mit Berry-Code und Simulation')"
        @click="sideOpen = !sideOpen"
      >
        {{ $gettext('Seitenleiste') }}
      </button>
    </div>

    <div v-if="notice" class="fb-banner">{{ notice }}</div>

    <div ref="mainEl" class="fb-main">
      <FlowPalette v-if="!isReadOnly" @add="addFromPalette" />

      <div ref="canvasEl" class="fb-canvas" @dragover="onDragOver" @drop="onDrop">
        <VueFlow
          :id="flowId"
          :node-types="nodeTypes"
          :connection-mode="ConnectionMode.Loose"
          :connection-radius="28"
          :connection-line-options="{type: ConnectionLineType.SmoothStep}"
          :delete-key-code="isReadOnly ? null : ['Delete', 'Backspace']"
          :nodes-draggable="!isReadOnly"
          :nodes-connectable="!isReadOnly"
          :edges-updatable="!isReadOnly"
          :snap-to-grid="true"
          :snap-grid="[10, 10]"
          :min-zoom="0.2"
          :max-zoom="2.5"
          :zoom-on-double-click="false"
          :elevate-edges-on-select="true"
        >
          <Background :gap="20" :size="1.3" class="fb-background" />
          <Controls :show-interactive="false" position="bottom-left" />
          <MiniMap pannable zoomable :node-color="minimapColor" :node-stroke-width="0" position="bottom-right" />
        </VueFlow>
      </div>

      <template v-if="sideOpen">
        <div class="fb-splitter" :title="$gettext('Breite ziehen')" @pointerdown="startResize" />
        <aside class="fb-side" :style="{width: `${sideWidth}px`}">
          <PropsPanel
            v-if="selectedNode || selectedEdge"
            ref="propsPanel"
            :node="selectedNode"
            :edge="selectedNode ? null : selectedEdge"
            :from-decision="selectedEdgeFromDecision"
            :issues="selectedNode ? (issuesByNode.get(selectedNode.id) ?? []) : []"
            :read-only="isReadOnly"
            @changed="scheduleCommit"
            @delete="deleteSelection"
            @branch="(branch) => selectedEdge && setBranch(selectedEdge, branch)"
          />
          <div class="fb-tabs" role="tablist">
            <button role="tab" :class="{active: tab === 'code'}" @click="showTab('code')">
              {{ $gettext('Berry-Code') }}
            </button>
            <button role="tab" :class="{active: tab === 'sim'}" @click="showTab('sim')">
              {{ $gettext('Simulation') }}
              <span v-if="sim.running.value" class="fb-tabs__live" />
            </button>
            <button role="tab" :class="{active: tab === 'issues'}" @click="showTab('issues')">
              {{ $gettext('Prüfung') }}
              <span v-if="visibleIssues.length" class="fb-tabs__badge" :class="`fb-tabs__badge--${statusLevel}`">
                {{ visibleIssues.length }}
              </span>
            </button>
          </div>
          <CodePanel
            v-if="tab === 'code'"
            :code="emitted.code"
            :line-ranges="emitted.lineRanges"
            :selected-node-id="selectedNode?.id ?? null"
            :be-name="beName"
            :can-export="!isReadOnly"
            @export="exportBerry"
          />
          <SimPanel v-else-if="tab === 'sim'" :sim="sim" :program="program" />
          <section v-else class="fb-issues">
            <p v-if="!program.issues.length">{{ $gettext('Keine Auffälligkeiten.') }}</p>
            <ul>
              <li
                v-for="(issue, index) in program.issues"
                :key="index"
                :class="`fb-issue fb-issue--${issue.level}`"
                @click="issue.nodeId && focusNode(issue.nodeId)"
              >
                <span class="fb-issue__icon">{{ ISSUE_ICON[issue.level] }}</span>
                <span>
                  <strong v-if="issue.nodeId">{{ nodeTitle(issue.nodeId) }}: </strong>{{ issue.msg }}
                </span>
              </li>
            </ul>
          </section>
        </aside>
      </template>
    </div>

    <datalist id="fb-signal-list">
      <option v-for="name in allSignals" :key="name" :value="name" />
    </datalist>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  markRaw,
  nextTick,
  onBeforeUnmount,
  onMounted,
  provide,
  reactive,
  ref,
  useTemplateRef,
  watch,
  watchEffect,
} from 'vue';
import {useGettext} from 'vue3-gettext';
import {
  ConnectionLineType,
  ConnectionMode,
  type Edge,
  type GraphEdge,
  type GraphNode,
  MarkerType,
  type Node,
  type NodeTypesObject,
  VueFlow,
  useVueFlow,
} from '@vue-flow/core';
import {Background} from '@vue-flow/background';
import {Controls} from '@vue-flow/controls';
import {MiniMap} from '@vue-flow/minimap';
import type {AppConfigObject} from '@opencloud-eu/web-pkg';
import type {Resource, SpaceResource} from './ocContext.ts';
import {ocContext} from './ocContext.ts';
import FlowNode from './components/FlowNode.vue';
import FlowPalette from './components/FlowPalette.vue';
import PropsPanel from './components/PropsPanel.vue';
import CodePanel from './components/CodePanel.vue';
import SimPanel from './components/SimPanel.vue';
import {DRAG_MIME, NODE_DECORATIONS, type NodeDecorations} from './editorState.ts';
import {compile, type Issue} from './model/compile.ts';
import {emptyDoc, LegacyFormatError, parseDoc, serializeDoc} from './model/document.ts';
import {nodeSize} from './model/shapes.ts';
import {
  type Branch,
  DEFAULT_COLOR,
  defaultData,
  type FbDoc,
  type FbEdge,
  type FbNode,
  KIND_TITLE,
  NODE_COLORS,
  type NodeKind,
  nodeLabel,
  SCAN_TIMES,
} from './model/types.ts';
import {emitBerry} from './berry/emitter.ts';
import {useSimulation} from './sim/useSimulation.ts';

import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/controls/dist/style.css';
import '@vue-flow/minimap/dist/style.css';

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

const {$gettext} = useGettext();

const ISSUE_ICON: Record<Issue['level'], string> = {error: '⛔', warning: '⚠', info: 'ℹ'};

const flowId = `flowberry-${Math.random().toString(36).slice(2, 10)}`;
const {
  nodes,
  edges,
  addNodes,
  addEdges,
  removeNodes,
  removeEdges,
  setNodes,
  setEdges,
  findNode,
  fitView,
  setCenter,
  getViewport,
  getSelectedNodes,
  getSelectedEdges,
  addSelectedNodes,
  removeSelectedElements,
  updateEdge,
  onConnect,
  onConnectStart,
  onConnectEnd,
  onNodeDragStop,
  onNodesChange,
  onEdgesChange,
  onEdgeUpdate,
  onNodeDoubleClick,
  onEdgeDoubleClick,
  onNodesInitialized,
} = useVueFlow(flowId);

// Ein Bauteil für alle Elementarten; FlowNode liest nur id, type, data und selected
const nodeTypes = Object.fromEntries(
  (['start', 'end', 'input', 'decision', 'action', 'pulse', 'wait'] as NodeKind[]).map((kind) => [
    kind,
    markRaw(FlowNode),
  ])
) as unknown as NodeTypesObject;

const mainEl = useTemplateRef<HTMLElement>('mainEl');
const canvasEl = useTemplateRef<HTMLElement>('canvasEl');
const propsPanel = useTemplateRef<InstanceType<typeof PropsPanel>>('propsPanel');

const scanMs = ref(50);
const notice = ref('');
const connecting = ref(false);
const sideOpen = ref(true);
const tab = ref<'code' | 'sim' | 'issues'>('code');
const sideWidth = ref(readStoredWidth());
const exportStatus = ref('');

// ---- Modell ↔ Vue Flow -------------------------------------------------------

let idCounter = 0;
function newId(prefix: string) {
  idCounter++;
  return `${prefix}${Date.now().toString(36)}${idCounter}`;
}

function toFlowNode(node: FbNode): Node {
  return {id: node.id, type: node.type, position: {...node.position}, data: {...node.data}};
}

function toFlowEdge(edge: FbEdge): Edge {
  const branch = edge.data?.branch;
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? undefined,
    targetHandle: edge.targetHandle ?? undefined,
    type: 'smoothstep',
    pathOptions: {borderRadius: 8, offset: 16},
    markerEnd: {type: MarkerType.ArrowClosed, width: 16, height: 16},
    data: branch ? {branch} : {},
    label: branch,
    class: branch ? `fb-edge fb-edge--b${branch}` : 'fb-edge',
  };
}

function currentDoc(): FbDoc {
  return {
    nodes: nodes.value.map((n) => ({
      id: n.id,
      type: n.type as NodeKind,
      position: {x: n.position.x, y: n.position.y},
      data: {...n.data},
    })),
    edges: edges.value.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
      targetHandle: e.targetHandle ?? null,
      data: e.data?.branch ? {branch: e.data.branch} : undefined,
    })),
    settings: {scanMs: scanMs.value},
  };
}

let pendingFit = false;

function loadDoc(doc: FbDoc) {
  scanMs.value = doc.settings.scanMs;
  setNodes(doc.nodes.map(toFlowNode));
  setEdges(doc.edges.map(toFlowEdge));
  pendingFit = true;
}

onNodesInitialized(() => {
  if (pendingFit) {
    pendingFit = false;
    fit();
  }
});

/** Für den Compiler: Positionen nur von START (Auswahl bei mehreren), sonst egal. */
const logicDoc = computed<FbDoc>(() => ({
  nodes: nodes.value.map((n) => ({
    id: n.id,
    type: n.type as NodeKind,
    position: n.type === 'start' ? {x: n.position.x, y: n.position.y} : {x: 0, y: 0},
    data: n.data,
  })),
  edges: edges.value.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    data: e.data?.branch ? {branch: e.data.branch} : undefined,
  })),
  settings: {scanMs: scanMs.value},
}));

const program = computed(() => compile(logicDoc.value));
const emitted = computed(() => emitBerry(program.value, {fileName: props.resource?.name}));
const allSignals = computed(() => [...new Set([...program.value.inputs, ...program.value.outputs])]);

const issuesByNode = computed(() => {
  const map = new Map<string, Issue[]>();
  for (const issue of program.value.issues) {
    if (issue.nodeId) {
      map.set(issue.nodeId, [...(map.get(issue.nodeId) ?? []), issue]);
    }
  }
  return map;
});

const visibleIssues = computed(() => program.value.issues.filter((i) => i.level !== 'info'));
const statusLevel = computed(() => {
  const issues = program.value.issues;
  return issues.some((i) => i.level === 'error') ? 'error' : issues.some((i) => i.level === 'warning') ? 'warning' : 'ok';
});
const statusText = computed(() => {
  if (exportStatus.value) {
    return exportStatus.value;
  }
  const errors = program.value.issues.filter((i) => i.level === 'error').length;
  const warnings = program.value.issues.filter((i) => i.level === 'warning').length;
  if (errors) {
    return `${errors} ${$gettext('Fehler')}` + (warnings ? `, ${warnings} ⚠` : '');
  }
  if (warnings) {
    return `${warnings} ${warnings === 1 ? $gettext('Hinweis') : $gettext('Hinweise')}`;
  }
  return `✓ ${program.value.steps.length} ${$gettext('Schritte')}`;
});

watch(program, () => {
  exportStatus.value = '';
});

// ---- Simulation & Knoten-Dekoration ------------------------------------------

const sim = useSimulation(program);

const decorations = reactive<NodeDecorations>({
  issues: new Map(),
  stepOf: new Map(),
  activeNodeId: null,
  progress: null,
  readOnly: false,
});

watchEffect(() => {
  const showSim = sim.running.value || (sideOpen.value && tab.value === 'sim');
  decorations.issues = issuesByNode.value;
  decorations.stepOf = program.value.stepOf;
  decorations.activeNodeId = showSim ? sim.state.value.activeNodeId : null;
  decorations.progress = showSim ? sim.state.value.progress : null;
  decorations.readOnly = props.isReadOnly;
});

provide(NODE_DECORATIONS, decorations);

// ---- Verlauf (Rückgängig/Wiederholen) und Speichern ------------------------------

const history: string[] = [];
const historyIndex = ref(-1);
const canUndo = computed(() => historyIndex.value > 0);
const canRedo = computed(() => historyIndex.value < history.length - 1 && historyIndex.value >= 0);
let lastEmitted = '';
let commitTimer: ReturnType<typeof setTimeout> | undefined;

function resetHistory() {
  history.length = 0;
  history.push(serializeDoc(currentDoc()));
  historyIndex.value = 0;
  lastEmitted = history[0];
}

function publish(snapshot: string) {
  if (snapshot !== lastEmitted) {
    lastEmitted = snapshot;
    emit('update:currentContent', snapshot);
  }
}

function commit() {
  clearTimeout(commitTimer);
  commitTimer = undefined;
  if (props.isReadOnly) {
    return;
  }
  const snapshot = serializeDoc(currentDoc());
  if (snapshot === history[historyIndex.value]) {
    return;
  }
  history.splice(historyIndex.value + 1);
  history.push(snapshot);
  if (history.length > 200) {
    history.shift();
  }
  historyIndex.value = history.length - 1;
  publish(snapshot);
}

function scheduleCommit() {
  clearTimeout(commitTimer);
  commitTimer = setTimeout(commit, 400);
}

function flushCommit() {
  if (commitTimer) {
    commit();
  }
}

function restore(index: number) {
  historyIndex.value = index;
  const doc = parseDoc(history[index]);
  scanMs.value = doc.settings.scanMs;
  setNodes(doc.nodes.map(toFlowNode));
  setEdges(doc.edges.map(toFlowEdge));
  publish(history[index]);
}

function undo() {
  flushCommit();
  if (canUndo.value) {
    restore(historyIndex.value - 1);
  }
}

function redo() {
  flushCommit();
  if (canRedo.value) {
    restore(historyIndex.value + 1);
  }
}

function setScanMs(event: Event) {
  scanMs.value = parseInt((event.target as HTMLSelectElement).value, 10) || 50;
  commit();
}

// ---- Bearbeiten -------------------------------------------------------------------

const selectedNode = computed(() => (getSelectedNodes.value.length === 1 ? getSelectedNodes.value[0] : null));
const selectedEdge = computed(() =>
  getSelectedNodes.value.length === 0 && getSelectedEdges.value.length === 1 ? getSelectedEdges.value[0] : null
);
const selectedEdgeFromDecision = computed(
  () => !!selectedEdge.value && findNode(selectedEdge.value.source)?.type === 'decision'
);

function nodeTitle(id: string) {
  const node = findNode(id);
  if (!node) {
    return id;
  }
  const label = nodeLabel(node.type as NodeKind, node.data).replace(/\s*\n\s*/g, ' ');
  return `${KIND_TITLE[node.type as NodeKind]}${label && node.type !== 'start' && node.type !== 'end' ? ` „${label}“` : ''}`;
}

function freeBranch(sourceId: string): Branch | undefined {
  const used = edges.value.filter((e) => e.source === sourceId).map((e) => e.data?.branch);
  return !used.includes('1') ? '1' : !used.includes('0') ? '0' : undefined;
}

function connect(fbEdge: Omit<FbEdge, 'id' | 'data'>) {
  if (fbEdge.source === fbEdge.target) {
    return;
  }
  const duplicate = edges.value.some((e) => e.source === fbEdge.source && e.target === fbEdge.target);
  if (duplicate) {
    return;
  }
  const branch = findNode(fbEdge.source)?.type === 'decision' ? freeBranch(fbEdge.source) : undefined;
  addEdges([toFlowEdge({...fbEdge, id: newId('e'), data: branch ? {branch} : undefined})]);
}

onConnect((connection) => {
  if (props.isReadOnly) {
    return;
  }
  connect({
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle,
    targetHandle: connection.targetHandle,
  });
  commit();
});

onConnectStart(() => (connecting.value = true));
onConnectEnd(() => (connecting.value = false));

onEdgeUpdate(({edge, connection}) => {
  if (props.isReadOnly || connection.source === connection.target) {
    return;
  }
  updateEdge(edge, connection);
  commit();
});

function setBranch(edge: GraphEdge, branch: Branch) {
  // der andere Ausgang derselben Entscheidung bekommt den Gegenwert
  const sibling = edges.value.find((e) => e.source === edge.source && e.id !== edge.id && e.data?.branch === branch);
  for (const [target, value] of [
    [edge, branch],
    [sibling, branch === '1' ? '0' : '1'],
  ] as [GraphEdge | undefined, Branch][]) {
    if (target) {
      target.data = {...target.data, branch: value};
      target.label = value;
      target.class = `fb-edge fb-edge--b${value}`;
    }
  }
  commit();
}

onEdgeDoubleClick(({edge}) => {
  if (!props.isReadOnly && findNode(edge.source)?.type === 'decision') {
    setBranch(edge, edge.data?.branch === '1' ? '0' : '1');
  }
});

onNodeDoubleClick(() => {
  sideOpen.value = true;
  nextTick(() => propsPanel.value?.focus());
});

// Hinzufügen schreibt seinen Verlaufseintrag selbst (inkl. Verbindungen), hier nur Löschen per Taste
onNodesChange((changes) => {
  if (changes.some((c) => c.type === 'remove')) {
    nextTick(commit);
  }
});

onEdgesChange((changes) => {
  if (changes.some((c) => c.type === 'remove')) {
    nextTick(commit);
  }
});

onNodeDragStop(({node, nodes: dragged}) => {
  if (dragged.length <= 1) {
    insertIntoEdge(node.id, {
      x: node.position.x,
      y: node.position.y,
      width: node.dimensions.width,
      height: node.dimensions.height,
    });
  }
  commit();
});

function deleteSelection() {
  if (selectedNode.value) {
    removeNodes([selectedNode.value]);
  } else if (selectedEdge.value) {
    removeEdges([selectedEdge.value]);
  }
  nextTick(commit);
}

/**
 * Ein frei abgelegtes Element, das auf einer Verbindung landet, wird in diese
 * eingefügt: A → B wird zu A → neu → B.
 */
function insertIntoEdge(nodeId: string, rect: {x: number; y: number; width: number; height: number}) {
  const node = findNode(nodeId);
  if (!node || node.type === 'start' || node.type === 'end') {
    return false;
  }
  if (edges.value.some((e) => e.source === nodeId || e.target === nodeId)) {
    return false;
  }
  const inset = 6;
  const inside = (p: DOMPoint) =>
    p.x > rect.x + inset && p.x < rect.x + rect.width - inset && p.y > rect.y + inset && p.y < rect.y + rect.height - inset;
  const hit = edges.value.find((edge) => {
    const path = canvasEl.value?.querySelector<SVGPathElement>(
      `.vue-flow__edge[data-id="${CSS.escape(edge.id)}"] path.vue-flow__edge-path`
    );
    if (!path) {
      return false;
    }
    const length = path.getTotalLength();
    for (let at = 0; at <= length; at += 6) {
      if (inside(path.getPointAtLength(at))) {
        return true;
      }
    }
    return false;
  });
  if (!hit) {
    return false;
  }
  removeEdges([hit]);
  addEdges([
    toFlowEdge({
      id: newId('e'),
      source: hit.source,
      sourceHandle: hit.sourceHandle,
      target: nodeId,
      targetHandle: 't',
      data: hit.data?.branch ? {branch: hit.data.branch} : undefined,
    }),
    toFlowEdge({
      id: newId('e'),
      source: nodeId,
      sourceHandle: 'b',
      target: hit.target,
      targetHandle: hit.targetHandle,
      data: node.type === 'decision' ? {branch: '1'} : undefined,
    }),
  ]);
  return true;
}

function snap(v: number) {
  return Math.round(v / 10) * 10;
}

function createNode(kind: NodeKind, center: {x: number; y: number}): string {
  const data = defaultData(kind);
  const size = nodeSize(kind, data);
  const id = newId(kind === 'decision' ? 'd' : 'n');
  addNodes([{id, type: kind, position: {x: snap(center.x - size.width / 2), y: snap(center.y - size.height / 2)}, data}]);
  return id;
}

function selectOnly(id: string) {
  nextTick(() => {
    const node = findNode(id);
    if (node) {
      removeSelectedElements();
      addSelectedNodes([node]);
    }
  });
}

/**
 * Klick in der Palette: ist ein Element gewählt, das noch einen freien Ausgang
 * hat, wird das neue darunter (bzw. bei Zweig 0 daneben) angehängt und
 * verbunden – so entsteht ein Ablauf Klick für Klick. Sonst Mitte der Ansicht.
 */
function addFromPalette(kind: NodeKind) {
  const anchor = selectedNode.value;
  const size = nodeSize(kind, defaultData(kind));
  if (anchor && anchor.type !== 'end') {
    const outgoing = edges.value.filter((e) => e.source === anchor.id);
    const branch = anchor.type === 'decision' ? freeBranch(anchor.id) : undefined;
    const free = anchor.type === 'decision' ? !!branch : outgoing.length === 0;
    if (free) {
      const {width, height} = anchor.dimensions;
      const sideways = branch === '0';
      const center = sideways
        ? {x: anchor.position.x + width + 70 + size.width / 2, y: anchor.position.y + height / 2}
        : {x: anchor.position.x + width / 2, y: anchor.position.y + height + 50 + size.height / 2};
      const id = createNode(kind, center);
      connect({
        source: anchor.id,
        sourceHandle: sideways ? 'r' : 'b',
        target: id,
        targetHandle: sideways ? 'l' : 't',
      });
      selectOnly(id);
      nextTick(commit);
      return;
    }
  }
  const rect = canvasEl.value?.getBoundingClientRect();
  const center = rect ? toFlowPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) : {x: 0, y: 0};
  const id = createNode(kind, center);
  selectOnly(id);
  nextTick(commit);
}

function toFlowPoint(clientX: number, clientY: number) {
  const rect = canvasEl.value!.getBoundingClientRect();
  const {x, y, zoom} = getViewport();
  return {x: (clientX - rect.left - x) / zoom, y: (clientY - rect.top - y) / zoom};
}

function onDragOver(event: DragEvent) {
  if (!props.isReadOnly && event.dataTransfer?.types.includes(DRAG_MIME)) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }
}

function onDrop(event: DragEvent) {
  const kind = event.dataTransfer?.getData(DRAG_MIME) as NodeKind | undefined;
  if (!kind || props.isReadOnly) {
    return;
  }
  event.preventDefault();
  const point = toFlowPoint(event.clientX, event.clientY);
  const id = createNode(kind, point);
  const size = nodeSize(kind, defaultData(kind));
  nextTick(() => {
    insertIntoEdge(id, {x: point.x - size.width / 2, y: point.y - size.height / 2, ...size});
    selectOnly(id);
    commit();
  });
}

function fit() {
  fitView({padding: 0.15, maxZoom: 1.2});
}

function focusNode(id: string) {
  const node = findNode(id);
  if (!node) {
    return;
  }
  removeSelectedElements();
  addSelectedNodes([node]);
  setCenter(node.position.x + node.dimensions.width / 2, node.position.y + node.dimensions.height / 2, {
    zoom: Math.max(getViewport().zoom, 1),
    duration: 300,
  });
}

function showTab(name: 'code' | 'sim' | 'issues') {
  sideOpen.value = true;
  tab.value = name;
}

function minimapColor(node: GraphNode) {
  const kind = node.type as NodeKind;
  return (NODE_COLORS[node.data?.color ?? ''] ?? NODE_COLORS[DEFAULT_COLOR[kind]] ?? NODE_COLORS.white).fill;
}

// ---- Berry-Export -------------------------------------------------------------------

const beName = computed(() => (props.resource?.name ?? 'logik.flowberry').replace(/\.flowberry$/i, '') + '.be');

async function exportBerry() {
  const code = emitted.value.code;
  const errors = program.value.issues.filter((i) => i.level === 'error').length;
  const suffix = errors ? ` (${errors} ${$gettext('Fehler')})` : '';

  if (ocContext.saveSibling && props.space) {
    const bePath = (props.resource?.path ?? `/${beName.value}`).replace(/\.flowberry$/i, '') + '.be';
    try {
      await ocContext.saveSibling(props.space, bePath, code);
      exportStatus.value = `${$gettext('Gespeichert:')} ${beName.value}${suffix}`;
      return;
    } catch (err) {
      console.error('flowberry: sibling save failed, falling back to download', err);
    }
  }

  const blob = new Blob([code], {type: 'text/plain'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = beName.value;
  link.click();
  URL.revokeObjectURL(url);
  exportStatus.value = `${$gettext('Als Download exportiert:')} ${beName.value}${suffix}`;
}

// ---- Seitenleiste ------------------------------------------------------------------

function readStoredWidth(): number {
  try {
    const stored = parseInt(localStorage.getItem('flowberry.sideWidth') ?? '', 10);
    return Number.isFinite(stored) ? stored : 420;
  } catch {
    return 420;
  }
}

function startResize(event: PointerEvent) {
  const startX = event.clientX;
  const startWidth = sideWidth.value;
  const max = Math.max(320, (mainEl.value?.clientWidth ?? 1200) - 360);
  const move = (e: PointerEvent) => {
    sideWidth.value = Math.min(max, Math.max(280, startWidth + startX - e.clientX));
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    try {
      localStorage.setItem('flowberry.sideWidth', String(sideWidth.value));
    } catch {
      // nur Komfort
    }
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

// ---- Laden ----------------------------------------------------------------------

function importContent(content: string) {
  notice.value = '';
  let doc: FbDoc;
  try {
    doc = parseDoc(content);
  } catch (err) {
    doc = emptyDoc();
    notice.value =
      err instanceof LegacyFormatError
        ? $gettext(
            'Diese Datei stammt aus dem früheren Kontaktplan-Editor (flowBerry 0.1, BPMN-XML) und kann nicht mehr geöffnet werden. Beim Speichern wird sie durch den neuen Ablaufplan ersetzt.'
          )
        : `${$gettext('Datei konnte nicht gelesen werden:')} ${err instanceof Error ? err.message : String(err)}`;
    if (!(err instanceof LegacyFormatError)) {
      console.error('flowberry: failed to parse file', err);
    }
  }
  loadDoc(doc);
  nextTick(resetHistory);
}

function handleKeydown(event: KeyboardEvent) {
  const mod = event.ctrlKey || event.metaKey;
  if (!mod) {
    return;
  }
  const key = event.key.toLowerCase();
  if (key === 's') {
    event.preventDefault();
    flushCommit();
    emit('save');
    return;
  }
  const target = event.target as HTMLElement | null;
  const typing = !!target?.closest('input, textarea, select, [contenteditable]');
  if (typing || props.isReadOnly) {
    return;
  }
  if (key === 'z' && !event.shiftKey) {
    event.preventDefault();
    undo();
  } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
    event.preventDefault();
    redo();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  importContent(props.currentContent);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
  flushCommit();
});

watch(
  () => props.resource?.id ?? props.resource?.path,
  () => importContent(props.currentContent)
);
</script>

<style scoped>
.fb-app {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: var(--oc-role-surface, #fff);
  color: var(--oc-role-on-surface, #1d232a);
}

.fb-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--oc-role-outline-variant, #d0d4d9);
  background: var(--oc-role-surface-container, #f1f3f4);
}

.fb-toolbar__sep {
  width: 1px;
  height: 20px;
  margin: 0 4px;
  background: var(--oc-role-outline-variant, #d0d4d9);
}

.fb-toolbar__field {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 6px;
  font-size: 13px;
}

.fb-status {
  margin-left: auto;
  border-color: transparent !important;
  background: none !important;
  font-size: 12.5px;
}

.fb-status--ok {
  color: #2f8f2f !important;
}

.fb-status--warning {
  color: #b07800 !important;
}

.fb-status--error {
  color: #d0312d !important;
  font-weight: 600;
}

.fb-banner {
  padding: 8px 12px;
  border-bottom: 1px solid #e0c46c;
  background: #fff5d6;
  color: #5c4500;
  font-size: 13px;
}

.fb-main {
  display: flex;
  flex: 1;
  min-height: 0;
}

.fb-canvas {
  position: relative;
  flex: 1;
  min-width: 0;
  background: var(--oc-role-surface-container-lowest, var(--oc-role-surface, #fbfbfa));
}

.fb-splitter {
  width: 5px;
  margin-left: -2px;
  margin-right: -3px;
  z-index: 5;
  cursor: col-resize;
  background: linear-gradient(
    to right,
    transparent 2px,
    var(--oc-role-outline-variant, #d0d4d9) 2px,
    var(--oc-role-outline-variant, #d0d4d9) 3px,
    transparent 3px
  );
}

.fb-splitter:hover {
  background: var(--oc-role-primary, #4f7a5a);
  opacity: 0.5;
}

.fb-side {
  display: flex;
  flex-direction: column;
  min-width: 280px;
  max-width: 70%;
  min-height: 0;
  background: var(--oc-role-surface-container-low, #f6f7f8);
}

.fb-tabs {
  display: flex;
  gap: 2px;
  padding: 6px 8px 0;
  border-bottom: 1px solid var(--oc-role-outline-variant, #d0d4d9);
}

.fb-tabs button {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: -1px;
  border-bottom-color: transparent !important;
  border-radius: 6px 6px 0 0 !important;
  background: none !important;
}

.fb-tabs button.active {
  border-color: var(--oc-role-outline-variant, #d0d4d9) !important;
  border-bottom-color: var(--oc-role-surface-container-low, #f6f7f8) !important;
  background: var(--oc-role-surface-container-low, #f6f7f8) !important;
  font-weight: 600;
}

.fb-tabs__live {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff9800;
  box-shadow: 0 0 6px #ff9800;
}

.fb-tabs__badge {
  min-width: 18px;
  padding: 0 5px;
  box-sizing: border-box;
  border-radius: 9px;
  color: #fff;
  font-size: 11px;
  line-height: 18px;
}

.fb-tabs__badge--warning {
  background: #b07800;
}

.fb-tabs__badge--error {
  background: #d0312d;
}

.fb-issues {
  flex: 1;
  min-height: 0;
  padding: 8px 10px;
  overflow-y: auto;
  font-size: 13px;
}

.fb-issues ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.fb-issue {
  display: flex;
  gap: 8px;
  padding: 6px 4px;
  border-bottom: 1px solid var(--oc-role-outline-variant, #e3e6e8);
  line-height: 1.4;
  cursor: pointer;
}

.fb-issue:hover {
  background: var(--oc-role-surface-container-high, #eceef0);
}

.fb-issue--error strong {
  color: #d0312d;
}

.fb-issue--info {
  opacity: 0.75;
}
</style>

<style>
/* Gemeinsame Optik der Bedienelemente und Vue-Flow-Theme (nicht scoped, gilt nur in .fb-app) */
.fb-app button,
.fb-app select {
  padding: 4px 10px;
  border: 1px solid var(--oc-role-outline-variant, #c9ced3);
  border-radius: 5px;
  background: var(--oc-role-surface, #fff);
  color: var(--oc-role-on-surface, #1d232a);
  font-size: 13px;
  cursor: pointer;
}

.fb-app button:hover:not(:disabled) {
  background: var(--oc-role-surface-container-high, #eceef0);
}

.fb-app button:disabled {
  opacity: 0.45;
  cursor: default;
}

.fb-app button.active {
  border-color: var(--oc-role-primary, #4f7a5a);
  background: var(--oc-role-primary-container, #dcebdf);
  color: var(--oc-role-on-primary-container, #12301b);
}

.fb-app .fb-toolbar__primary {
  border-color: transparent;
  background: var(--oc-role-primary, #4f7a5a);
  color: var(--oc-role-on-primary, #fff);
  font-weight: 600;
}

.fb-app .fb-toolbar__primary:hover:not(:disabled) {
  background: var(--oc-role-primary, #4f7a5a);
  filter: brightness(1.1);
}

.fb-app .vue-flow__edge-path {
  stroke: var(--oc-role-on-surface-variant, #44505c);
  stroke-width: 1.6;
}

.fb-app .vue-flow__edge.selected .vue-flow__edge-path,
.fb-app .vue-flow__edge:focus .vue-flow__edge-path {
  stroke: var(--fb-accent, #2f6fae);
  stroke-width: 2.6;
}

.fb-app .vue-flow__connection-path {
  stroke: var(--fb-accent, #2f6fae);
  stroke-width: 2;
  stroke-dasharray: 5 4;
}

.fb-app .vue-flow__edge-textbg {
  fill: var(--oc-role-surface, #fff);
}

.fb-app .vue-flow__edge-text {
  fill: var(--oc-role-on-surface, #1d232a);
  font: 700 13px ui-monospace, monospace;
}

.fb-app .fb-edge--b1 .vue-flow__edge-text {
  fill: #2f8f2f;
}

.fb-app .fb-edge--b0 .vue-flow__edge-text {
  fill: #c0392b;
}

.fb-app .vue-flow__arrowhead polyline {
  stroke: var(--oc-role-on-surface-variant, #44505c);
  fill: var(--oc-role-on-surface-variant, #44505c);
}

.fb-app .fb-background {
  color: var(--oc-role-outline-variant, #cdd2d6);
}

.fb-app .fb-background pattern circle {
  fill: var(--oc-role-outline-variant, #cdd2d6);
}

/* das Standard-Theme gestaltet den Knotentyp "input" (150 px, Rahmen) – hier zeichnet FlowNode alles selbst */
.fb-app .vue-flow__node,
.fb-app .vue-flow__node-input,
.fb-app .vue-flow__node-input.selected,
.fb-app .vue-flow__node-input:focus,
.fb-app .vue-flow__node-input:focus-visible {
  width: auto;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: none;
  font-size: inherit;
  text-align: initial;
  outline: none;
  box-shadow: none !important;
}

.fb-app--connecting .fb-handle {
  opacity: 1 !important;
}

.fb-app .vue-flow__controls {
  box-shadow: 0 1px 4px rgb(0 0 0 / 18%);
}

.fb-app .vue-flow__controls-button {
  padding: 5px;
  border-radius: 0;
}

.fb-app .vue-flow__minimap {
  border: 1px solid var(--oc-role-outline-variant, #d0d4d9);
  background: var(--oc-role-surface, #fff);
}

.fb-app .vue-flow__minimap-mask {
  fill: var(--oc-role-on-surface, #1d232a);
  fill-opacity: 0.08;
}
</style>
