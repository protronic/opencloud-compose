<template>
  <div
    class="fb-node"
    :class="[
      `fb-node--${kind}`,
      {
        'fb-node--selected': selected,
        'fb-node--active': isActive,
        'fb-node--error': level === 'error',
        'fb-node--warning': level === 'warning',
      },
    ]"
    :style="{width: `${size.width}px`, height: `${size.height}px`}"
    :title="tooltip"
  >
    <svg class="fb-node__shape" :width="size.width" :height="size.height" aria-hidden="true">
      <path :d="outline" :fill="color.fill" :stroke="color.stroke" stroke-width="1.5" />
      <template v-if="sideBars">
        <line x1="11" y1="1.5" x2="11" :y2="size.height - 1.5" :stroke="color.stroke" stroke-width="1.5" />
        <line
          :x1="size.width - 11"
          y1="1.5"
          :x2="size.width - 11"
          :y2="size.height - 1.5"
          :stroke="color.stroke"
          stroke-width="1.5"
        />
      </template>
    </svg>
    <div class="fb-node__label" :class="{'fb-node__label--placeholder': placeholder}">{{ label }}</div>
    <div v-if="isActive && progress !== null" class="fb-node__progress">
      <div :style="{width: `${Math.round(progress * 100)}%`}" />
    </div>
    <span v-if="stepNumber !== undefined" class="fb-node__step">{{ stepNumber }}</span>
    <Handle
      v-for="handle in handles"
      :id="handle.id"
      :key="handle.id"
      type="source"
      :position="handle.position"
      :connectable="!decorations?.readOnly"
      class="fb-handle"
    />
  </div>
</template>

<script setup lang="ts">
import {computed, inject} from 'vue';
import {Handle, Position} from '@vue-flow/core';
import {NODE_DECORATIONS} from '../editorState.ts';
import {DEFAULT_COLOR, type FbNodeData, NODE_COLORS, type NodeKind, nodeLabel} from '../model/types.ts';
import {hasSideBars, nodeSize, shapePath} from '../model/shapes.ts';

const props = defineProps<{
  id: string;
  type: string;
  data: FbNodeData;
  selected?: boolean;
}>();

const decorations = inject(NODE_DECORATIONS);

const kind = computed(() => props.type as NodeKind);
const size = computed(() => nodeSize(kind.value, props.data));
const outline = computed(() => shapePath(kind.value, size.value.width, size.value.height));
const sideBars = computed(() => hasSideBars(kind.value));
const color = computed(() => NODE_COLORS[props.data.color ?? ''] ?? NODE_COLORS[DEFAULT_COLOR[kind.value]]);
const label = computed(() => nodeLabel(kind.value, props.data));
const placeholder = computed(() => {
  const d = props.data;
  switch (kind.value) {
    case 'decision':
      return !d.cond?.trim();
    case 'action':
      return !d.text?.trim();
    case 'pulse':
      return !d.signal?.trim();
    default:
      return false;
  }
});

const nodeIssues = computed(() => decorations?.issues.get(props.id) ?? []);
const level = computed(() =>
  nodeIssues.value.some((i) => i.level === 'error')
    ? 'error'
    : nodeIssues.value.some((i) => i.level === 'warning')
      ? 'warning'
      : null
);
const tooltip = computed(() => nodeIssues.value.map((i) => i.msg).join('\n') || undefined);
const isActive = computed(() => decorations?.activeNodeId === props.id);
const progress = computed(() => decorations?.progress ?? null);
const stepNumber = computed(() => decorations?.stepOf.get(props.id));

const handles = [
  {id: 't', position: Position.Top},
  {id: 'r', position: Position.Right},
  {id: 'b', position: Position.Bottom},
  {id: 'l', position: Position.Left},
];
</script>

<style scoped>
.fb-node {
  position: relative;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fb-node__shape {
  position: absolute;
  inset: 0;
  overflow: visible;
}

.fb-node__label {
  position: relative;
  padding: 0 16px;
  color: #1d232a;
  font-size: 13px;
  font-weight: 600;
  line-height: 18px;
  text-align: center;
  white-space: pre-line;
  word-break: break-word;
  pointer-events: none;
}

.fb-node--decision .fb-node__label {
  padding: 0 34px;
  font-size: 12.5px;
}

.fb-node--pulse .fb-node__label,
.fb-node--wait .fb-node__label {
  padding: 0 20px;
}

.fb-node__label--placeholder {
  opacity: 0.55;
  font-style: italic;
}

.fb-node__step {
  position: absolute;
  top: -9px;
  left: -9px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  box-sizing: border-box;
  border-radius: 9px;
  background: var(--fb-step-bg, #44505c);
  color: #fff;
  font: 600 10px/18px ui-monospace, monospace;
  text-align: center;
  pointer-events: none;
}

.fb-node--decision .fb-node__step {
  left: 30px;
  top: 4px;
}

.fb-node__shape path {
  transition: filter 0.15s;
}

.fb-node--selected .fb-node__shape path {
  stroke: var(--fb-accent, #2f6fae);
  stroke-width: 3;
}

.fb-node--warning .fb-node__shape path {
  stroke: #c98a00;
  stroke-width: 2.5;
  stroke-dasharray: 6 3;
}

.fb-node--error .fb-node__shape path {
  stroke: #d0312d;
  stroke-width: 2.5;
  stroke-dasharray: 6 3;
}

.fb-node--active .fb-node__shape path {
  filter: drop-shadow(0 0 6px #ff9800) drop-shadow(0 0 2px #ff9800);
  stroke: #e65100;
  stroke-width: 3;
  stroke-dasharray: none;
}

.fb-node__progress {
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 6px;
  height: 4px;
  border-radius: 2px;
  background: rgb(0 0 0 / 15%);
  overflow: hidden;
  pointer-events: none;
}

.fb-node__progress > div {
  height: 100%;
  background: #e65100;
}

/* Anschlüsse liegen innen am Rand, damit die Kanten direkt am Symbol enden */
.fb-handle {
  width: 10px;
  height: 10px;
  min-width: 0;
  min-height: 0;
  border: 1.5px solid #fff;
  background: var(--fb-accent, #2f6fae);
  opacity: 0;
  transition: opacity 0.1s;
}

.fb-handle.vue-flow__handle-top {
  top: 0;
  transform: translate(-50%, 0);
}

.fb-handle.vue-flow__handle-bottom {
  bottom: 0;
  transform: translate(-50%, 0);
}

.fb-handle.vue-flow__handle-left {
  left: 0;
  transform: translate(0, -50%);
}

.fb-handle.vue-flow__handle-right {
  right: 0;
  transform: translate(0, -50%);
}

/* Parallelogramm: seitliche Anschlüsse auf die schrägen Kanten */
.fb-node--input .fb-handle.vue-flow__handle-left {
  left: 9px;
}

.fb-node--input .fb-handle.vue-flow__handle-right {
  right: 9px;
}

.fb-node:hover .fb-handle,
.fb-node--selected .fb-handle {
  opacity: 1;
}
</style>
