<template>
  <section class="fb-props">
    <template v-if="node">
      <header>
        <h3>{{ KIND_TITLE[kind!] }}</h3>
        <button v-if="!readOnly" class="fb-props__delete" :title="$gettext('Element löschen (Entf)')" @click="emit('delete')">
          {{ $gettext('Löschen') }}
        </button>
      </header>

      <p v-if="kind === 'start'" class="fb-props__help">
        {{ $gettext('Hier beginnt der Ablauf. Nach ENDE (oder einem Element ohne Nachfolger) geht es wieder hier los – wie der Zyklus einer SPS.') }}
      </p>

      <fieldset v-if="kind === 'end'" :disabled="readOnly">
        <label class="fb-props__radio">
          <input type="radio" :checked="!data.halt" @change="update('halt', false)" />
          {{ $gettext('danach wieder bei START beginnen') }}
        </label>
        <label class="fb-props__radio">
          <input type="radio" :checked="data.halt" @change="update('halt', true)" />
          {{ $gettext('anhalten (bis restart())') }}
        </label>
      </fieldset>

      <label v-if="kind === 'input'">
        {{ $gettext('Gelesene Eingänge') }}
        <input
          type="text"
          spellcheck="false"
          :value="data.signals"
          :disabled="readOnly"
          placeholder="MPS, DGS"
          @input="update('signals', valueOf($event))"
        />
        <small>{{ $gettext('Nur Dokumentation: Eingänge werden je Zyklus einmal gelesen (Prozessabbild).') }}</small>
      </label>

      <label v-if="kind === 'decision' || (kind === 'wait' && data.waitMode === 'cond')">
        {{ kind === 'decision' ? $gettext('Bedingung') : $gettext('Warten bis') }}
        <input
          ref="mainField"
          type="text"
          spellcheck="false"
          :value="data.cond"
          :disabled="readOnly"
          placeholder="MPS = 1"
          list="fb-signal-list"
          @input="update('cond', valueOf($event))"
        />
        <small v-if="kind === 'decision'">
          {{ $gettext('Ausgang 1 = Bedingung erfüllt, Ausgang 0 = nicht erfüllt. Zweig ändern: Verbindung anklicken.') }}
        </small>
      </label>

      <label v-if="kind === 'action'">
        {{ $gettext('Zuweisungen – eine pro Zeile') }}
        <textarea
          ref="mainField"
          rows="4"
          spellcheck="false"
          :value="data.text"
          :disabled="readOnly"
          placeholder="SPS = 1&#10;DGS = 0"
          @input="update('text', valueOf($event))"
        />
      </label>

      <template v-if="kind === 'pulse'">
        <label>
          {{ $gettext('Ausgang') }}
          <input
            ref="mainField"
            type="text"
            spellcheck="false"
            :value="data.signal"
            :disabled="readOnly"
            placeholder="DGSS"
            list="fb-signal-list"
            @input="update('signal', valueOf($event))"
          />
        </label>
        <small class="fb-props__help">{{ $gettext('Wird beim Eintritt 1 und nach Ablauf der Zeit wieder 0.') }}</small>
      </template>

      <fieldset v-if="kind === 'wait'" :disabled="readOnly">
        <label class="fb-props__radio">
          <input type="radio" :checked="data.waitMode !== 'cond'" @change="update('waitMode', 'time')" />
          {{ $gettext('Zeit abwarten') }}
        </label>
        <label class="fb-props__radio">
          <input type="radio" :checked="data.waitMode === 'cond'" @change="update('waitMode', 'cond')" />
          {{ $gettext('warten, bis Bedingung erfüllt') }}
        </label>
      </fieldset>

      <label v-if="kind === 'pulse' || (kind === 'wait' && data.waitMode !== 'cond')">
        {{ $gettext('Dauer') }}
        <span class="fb-props__duration">
          <input
            type="number"
            min="0"
            :step="unit === 's' ? 0.1 : 10"
            :value="unit === 's' ? (data.ms ?? 0) / 1000 : data.ms"
            :disabled="readOnly"
            @input="setDuration(valueOf($event))"
          />
          <select v-model="unit" :disabled="readOnly">
            <option value="s">s</option>
            <option value="ms">ms</option>
          </select>
        </span>
        <small>{{ $gettext('Wird in Zyklen gezählt; kleinste Auflösung = Zykluszeit.') }}</small>
      </label>

      <details v-if="kind === 'decision' || kind === 'action' || kind === 'wait'" class="fb-props__syntax">
        <summary>{{ $gettext('Schreibweise') }}</summary>
        <table>
          <tr><td><code>A = 1</code>, <code>A = 0</code></td><td>{{ $gettext('setzen / prüfen') }}</td></tr>
          <tr><td><code>!A</code>, <code>nicht A</code></td><td>{{ $gettext('Negation') }}</td></tr>
          <tr><td><code>A &amp; B</code>, <code>A und B</code></td><td>{{ $gettext('UND') }}</td></tr>
          <tr><td><code>A | B</code>, <code>A oder B</code></td><td>{{ $gettext('ODER') }}</td></tr>
          <tr><td><code>N = N + 1</code></td><td>{{ $gettext('Zähler') }}</td></tr>
          <tr><td><code>N &gt;= 5</code>, <code>N &lt;&gt; 0</code></td><td>{{ $gettext('Vergleich') }}</td></tr>
        </table>
      </details>

      <div v-if="!readOnly" class="fb-props__colors">
        <span>{{ $gettext('Farbe') }}</span>
        <button
          v-for="(color, key) in NODE_COLORS"
          :key="key"
          class="fb-props__swatch"
          :class="{active: (data.color ?? DEFAULT_COLOR[kind!]) === key}"
          :style="{background: color.fill, borderColor: color.stroke}"
          :title="color.label"
          @click="update('color', key === DEFAULT_COLOR[kind!] ? undefined : key)"
        />
      </div>

      <ul v-if="issues.length" class="fb-props__issues">
        <li v-for="(issue, index) in issues" :key="index" :class="`fb-issue--${issue.level}`">{{ issue.msg }}</li>
      </ul>
    </template>

    <template v-else-if="edge">
      <header>
        <h3>{{ $gettext('Verbindung') }}</h3>
        <button v-if="!readOnly" class="fb-props__delete" @click="emit('delete')">{{ $gettext('Löschen') }}</button>
      </header>
      <fieldset v-if="fromDecision" :disabled="readOnly">
        <legend>{{ $gettext('Zweig der Entscheidung') }}</legend>
        <label class="fb-props__radio">
          <input type="radio" :checked="edge.data?.branch === '1'" @change="setBranch('1')" />
          {{ $gettext('1 – Bedingung erfüllt') }}
        </label>
        <label class="fb-props__radio">
          <input type="radio" :checked="edge.data?.branch === '0'" @change="setBranch('0')" />
          {{ $gettext('0 – nicht erfüllt') }}
        </label>
        <small>{{ $gettext('Doppelklick auf die Verbindung wechselt den Zweig.') }}</small>
      </fieldset>
      <p v-else class="fb-props__help">{{ $gettext('Ablaufrichtung: vom Start der Verbindung zum Pfeil.') }}</p>
    </template>
  </section>
</template>

<script setup lang="ts">
import {computed, ref, useTemplateRef} from 'vue';
import {useGettext} from 'vue3-gettext';
import type {GraphEdge, GraphNode} from '@vue-flow/core';
import type {Issue} from '../model/compile.ts';
import {type Branch, DEFAULT_COLOR, type FbNodeData, KIND_TITLE, NODE_COLORS, type NodeKind} from '../model/types.ts';

const props = defineProps<{
  node: GraphNode | null;
  edge: GraphEdge | null;
  fromDecision: boolean;
  issues: Issue[];
  readOnly: boolean;
}>();

const emit = defineEmits<{
  changed: [];
  delete: [];
  branch: [branch: Branch];
}>();

const {$gettext} = useGettext();

const kind = computed(() => props.node?.type as NodeKind | undefined);
const data = computed(() => (props.node?.data ?? {}) as FbNodeData);
const unit = ref<'s' | 'ms'>('s');
const mainField = useTemplateRef<HTMLInputElement | HTMLTextAreaElement>('mainField');

function valueOf(event: Event): string {
  return (event.target as HTMLInputElement).value;
}

function update<K extends keyof FbNodeData>(key: K, value: FbNodeData[K]) {
  if (!props.node || props.readOnly) {
    return;
  }
  if (value === undefined) {
    delete props.node.data[key];
  } else {
    props.node.data[key] = value;
  }
  emit('changed');
}

function setDuration(raw: string) {
  const n = parseFloat(raw.replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) {
    return;
  }
  update('ms', Math.round(unit.value === 's' ? n * 1000 : n));
}

function setBranch(branch: Branch) {
  emit('branch', branch);
}

defineExpose({
  focus() {
    mainField.value?.focus();
    mainField.value?.select();
  },
});
</script>

<style scoped>
.fb-props {
  padding: 10px 12px;
  border-bottom: 1px solid var(--oc-role-outline-variant, #d0d4d9);
  font-size: 13px;
  max-height: 55%;
  overflow-y: auto;
  flex-shrink: 0;
}

header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

h3 {
  flex: 1;
  margin: 0;
  font-size: 14px;
}

label {
  display: block;
  margin-bottom: 10px;
}

input[type='text'],
input[type='number'],
textarea {
  display: block;
  width: 100%;
  margin-top: 3px;
  padding: 5px 7px;
  box-sizing: border-box;
  border: 1px solid var(--oc-role-outline, #9aa3ab);
  border-radius: 4px;
  background: var(--oc-role-surface, #fff);
  color: var(--oc-role-on-surface, #1d232a);
  font: 13px ui-monospace, monospace;
}

textarea {
  resize: vertical;
  line-height: 1.5;
}

small,
.fb-props__help {
  display: block;
  margin: 3px 0 8px;
  color: var(--oc-role-on-surface-variant, #5b6670);
  font-size: 11.5px;
  line-height: 1.4;
}

fieldset {
  margin: 0 0 10px;
  padding: 0;
  border: 0;
}

legend {
  margin-bottom: 4px;
}

.fb-props__radio {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.fb-props__duration {
  display: flex;
  gap: 4px;
  align-items: center;
}

.fb-props__duration input {
  flex: 1;
}

.fb-props__duration select {
  margin-top: 3px;
  padding: 4px;
}

.fb-props__syntax {
  margin: 0 0 10px;
  font-size: 12px;
}

.fb-props__syntax summary {
  cursor: pointer;
  color: var(--oc-role-on-surface-variant, #5b6670);
}

.fb-props__syntax table {
  margin-top: 4px;
  border-collapse: collapse;
}

.fb-props__syntax td {
  padding: 2px 8px 2px 0;
  vertical-align: top;
}

.fb-props__colors {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 4px 0 6px;
}

.fb-props__colors span {
  margin-right: 4px;
}

.fb-props__swatch {
  width: 20px;
  height: 20px;
  padding: 0 !important;
  border: 1.5px solid;
  border-radius: 50%;
  cursor: pointer;
}

.fb-props__swatch.active {
  outline: 2px solid var(--oc-role-primary, #2f6fae);
  outline-offset: 1px;
}

.fb-props__delete {
  font-size: 12px;
}

.fb-props__issues {
  margin: 8px 0 0;
  padding-left: 18px;
  font-size: 12px;
}

.fb-issue--error {
  color: #d0312d;
}

.fb-issue--warning {
  color: #b07800;
}

.fb-issue--info {
  color: var(--oc-role-on-surface-variant, #5b6670);
}
</style>
