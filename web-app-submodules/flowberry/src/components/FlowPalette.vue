<template>
  <nav class="fb-palette" :aria-label="$gettext('Elemente')">
    <button
      v-for="item in items"
      :key="item.kind"
      class="fb-palette__item"
      draggable="true"
      :title="item.hint"
      @dragstart="onDragStart($event, item.kind)"
      @click="emit('add', item.kind)"
    >
      <svg width="44" height="26" viewBox="0 0 44 26" aria-hidden="true">
        <path
          :d="item.icon"
          :transform="`translate(0 ${item.offset})`"
          :fill="item.fill"
          :stroke="item.stroke"
          stroke-width="1.2"
        />
        <template v-if="item.bars">
          <line x1="6" y1="1" x2="6" y2="25" :stroke="item.stroke" stroke-width="1.2" />
          <line x1="38" y1="1" x2="38" y2="25" :stroke="item.stroke" stroke-width="1.2" />
        </template>
      </svg>
      <span>{{ item.title }}</span>
    </button>
    <p class="fb-palette__hint">
      {{ $gettext('Ziehen oder klicken. Auf eine Verbindung fallen lassen fügt das Element dort ein.') }}
    </p>
  </nav>
</template>

<script setup lang="ts">
import {useGettext} from 'vue3-gettext';
import {DRAG_MIME} from '../editorState.ts';
import {DEFAULT_COLOR, KIND_TITLE, NODE_COLORS, type NodeKind} from '../model/types.ts';
import {hasSideBars, shapePath} from '../model/shapes.ts';

const emit = defineEmits<{add: [kind: NodeKind]}>();
const {$gettext} = useGettext();

const hints: Record<NodeKind, string> = {
  start: $gettext('Einsprung des Ablaufs'),
  end: $gettext('Ende – danach wieder bei START beginnen oder anhalten'),
  input: $gettext('Eingänge lesen (Dokumentation, z. B. „Lese MPS & DGS“)'),
  decision: $gettext('Bedingung prüfen – Ausgänge 1 und 0'),
  action: $gettext('Ausgänge/Merker setzen, je Zeile z. B. „SPS = 1“'),
  pulse: $gettext('Ausgang für eine Zeit einschalten, z. B. „DGSS = 1 für 3 s“'),
  wait: $gettext('Zeit abwarten oder warten, bis eine Bedingung erfüllt ist'),
};

const kinds: NodeKind[] = ['start', 'input', 'decision', 'action', 'pulse', 'wait', 'end'];
const items = kinds.map((kind) => {
  const color = NODE_COLORS[DEFAULT_COLOR[kind]];
  const h = kind === 'start' || kind === 'end' ? 20 : 26;
  return {
    kind,
    title: KIND_TITLE[kind],
    hint: hints[kind],
    icon: shapePath(kind, 44, h, 1),
    offset: (26 - h) / 2,
    bars: hasSideBars(kind),
    fill: color.fill,
    stroke: color.stroke,
  };
});

function onDragStart(event: DragEvent, kind: NodeKind) {
  event.dataTransfer?.setData(DRAG_MIME, kind);
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
  }
}
</script>

<style scoped>
.fb-palette {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 112px;
  padding: 8px 6px;
  box-sizing: border-box;
  border-right: 1px solid var(--oc-role-outline-variant, #d0d4d9);
  background: var(--oc-role-surface-container-low, #f6f7f8);
  overflow-y: auto;
}

.fb-palette__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 2px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: none;
  color: var(--oc-role-on-surface, #1d232a);
  font-size: 12px;
  cursor: grab;
}

.fb-palette__item:hover,
.fb-palette__item:focus-visible {
  border-color: var(--oc-role-outline-variant, #d0d4d9);
  background: var(--oc-role-surface-container-high, #eceef0);
}

.fb-palette__item svg {
  overflow: visible;
}

.fb-palette__hint {
  margin: 8px 2px 0;
  color: var(--oc-role-on-surface-variant, #5b6670);
  font-size: 11px;
  line-height: 1.35;
}
</style>
