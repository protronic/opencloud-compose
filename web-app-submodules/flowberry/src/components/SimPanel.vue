<template>
  <section class="fb-sim">
    <div class="fb-sim__bar">
      <button v-if="!sim.running.value" class="fb-sim__run" @click="sim.start()">▶ {{ $gettext('Start') }}</button>
      <button v-else class="fb-sim__run" @click="sim.stop()">❚❚ {{ $gettext('Pause') }}</button>
      <button :title="$gettext('Einen Zyklus ausführen')" @click="sim.stepOnce()">{{ $gettext('1 Zyklus') }}</button>
      <button :title="$gettext('Ablauf auf START zurücksetzen, Ausgänge löschen')" @click="sim.reset()">
        {{ $gettext('Reset') }}
      </button>
      <label class="fb-sim__speed">
        <select v-model.number="sim.speed.value" :title="$gettext('Zeitraffer')">
          <option :value="1">1×</option>
          <option :value="5">5×</option>
          <option :value="20">20×</option>
        </select>
      </label>
    </div>

    <div class="fb-sim__status">
      <div>
        <strong>{{ $gettext('Schritt') }} {{ state.stepIndex < 0 ? '–' : state.stepIndex }}</strong>
        <span v-if="state.stepIndex < 0"> · {{ $gettext('angehalten') }}</span>
        <span v-else-if="state.step"> · {{ state.step.label }}</span>
      </div>
      <div v-if="state.progress !== null" class="fb-sim__time">
        {{ formatMs(state.elapsedMs) }} / {{ formatMs(stepMs) }}
      </div>
      <div class="fb-sim__clock">
        {{ $gettext('Zyklus') }} {{ state.cycles }} · {{ formatSeconds(state.timeMs) }}
      </div>
    </div>

    <h4>{{ $gettext('Eingänge') }}</h4>
    <p v-if="!program.inputs.length" class="fb-sim__empty">
      {{ $gettext('Keine – Eingänge sind Signale, die nur gelesen werden.') }}
    </p>
    <div v-for="name in program.inputs" :key="name" class="fb-sim__row">
      <span class="fb-sim__name">{{ name }}</span>
      <template v-if="program.numeric.has(name)">
        <input
          type="number"
          step="1"
          :value="Number(sim.value(name))"
          @input="sim.setInput(name, parseInt(($event.target as HTMLInputElement).value, 10) || 0)"
        />
      </template>
      <template v-else>
        <button
          class="fb-sim__switch"
          :class="{on: isOn(name)}"
          :title="$gettext('Schalter: umschalten')"
          @click="sim.setInput(name, !isOn(name))"
        >
          {{ isOn(name) ? '1' : '0' }}
        </button>
        <button
          class="fb-sim__push"
          :title="$gettext('Taster: 1, solange gedrückt')"
          @pointerdown="sim.setInput(name, true)"
          @pointerup="sim.setInput(name, false)"
          @pointerleave="pressedLeave($event, name)"
        >
          {{ $gettext('Taster') }}
        </button>
      </template>
    </div>

    <h4>{{ $gettext('Ausgänge und Merker') }}</h4>
    <p v-if="!program.outputs.length" class="fb-sim__empty">{{ $gettext('Keine') }}</p>
    <div v-for="name in program.outputs" :key="name" class="fb-sim__row">
      <span class="fb-sim__name">{{ name }}</span>
      <span v-if="program.numeric.has(name)" class="fb-sim__number">{{ Number(sim.value(name)) }}</span>
      <span v-else class="fb-sim__lamp" :class="{on: isOn(name)}" />
    </div>
  </section>
</template>

<script setup lang="ts">
import {computed} from 'vue';
import {useGettext} from 'vue3-gettext';
import type {Program} from '../model/compile.ts';
import {formatMs} from '../model/types.ts';
import type {Simulation} from '../sim/useSimulation.ts';

const props = defineProps<{
  sim: Simulation;
  program: Program;
}>();

const {$gettext} = useGettext();

const state = computed(() => props.sim.state.value);
const stepMs = computed(() => {
  const step = state.value.step;
  return step && (step.kind === 'pulse' || step.kind === 'waitTime') ? step.ms : 0;
});

function isOn(name: string) {
  const v = props.sim.value(name);
  return v !== false && v !== 0;
}

function pressedLeave(event: PointerEvent, name: string) {
  if (event.buttons) {
    props.sim.setInput(name, false);
  }
}

function formatSeconds(ms: number) {
  return `${(ms / 1000).toFixed(1).replace('.', ',')} s`;
}
</script>

<style scoped>
.fb-sim {
  flex: 1;
  min-height: 0;
  padding: 8px 10px 12px;
  overflow-y: auto;
  font-size: 13px;
}

.fb-sim__bar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.fb-sim__run {
  min-width: 78px;
  font-weight: 600;
}

.fb-sim__speed select {
  padding: 3px 4px;
}

.fb-sim__status {
  margin: 10px 0 4px;
  padding: 8px;
  border-radius: 6px;
  background: var(--oc-role-surface-container-high, #eceef0);
  line-height: 1.5;
}

.fb-sim__time {
  font-variant-numeric: tabular-nums;
  color: #e65100;
}

.fb-sim__clock {
  opacity: 0.7;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

h4 {
  margin: 14px 0 6px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.75;
}

.fb-sim__empty {
  margin: 0;
  font-size: 12px;
  opacity: 0.7;
}

.fb-sim__row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 0;
}

.fb-sim__name {
  flex: 1;
  font: 600 12.5px ui-monospace, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fb-sim__switch {
  width: 40px;
  font: 600 12px ui-monospace, monospace;
}

.fb-sim__switch.on {
  background: #2f8f2f !important;
  border-color: #2f8f2f !important;
  color: #fff !important;
}

.fb-sim__push {
  font-size: 11px;
  user-select: none;
  touch-action: none;
}

.fb-sim__push:active {
  background: #2f8f2f !important;
  color: #fff !important;
}

.fb-sim__row input[type='number'] {
  width: 80px;
}

.fb-sim__lamp {
  width: 16px;
  height: 16px;
  border: 1.5px solid #7a7a7a;
  border-radius: 50%;
  background: #cfd3d6;
}

.fb-sim__lamp.on {
  border-color: #b23b00;
  background: #ff9800;
  box-shadow: 0 0 8px #ff9800;
}

.fb-sim__number {
  min-width: 40px;
  font: 600 13px ui-monospace, monospace;
  text-align: right;
}
</style>
