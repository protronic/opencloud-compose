import {computed, onBeforeUnmount, ref, shallowRef, type Ref, watch} from 'vue';
import type {Program} from '../model/compile.ts';
import {Simulator, type Value} from './simulator.ts';

/**
 * Simulation im Browser: führt das Schrittprogramm im Takt der Zykluszeit aus.
 * Ändert sich der Ablaufplan, beginnt die Simulation neu; gesetzte Eingänge
 * bleiben erhalten.
 */
export function useSimulation(program: Ref<Program>) {
  const sim = shallowRef(new Simulator(program.value));
  const running = ref(false);
  const speed = ref(1);
  /** zählt bei jeder Änderung hoch, damit die Anzeige neu rendert */
  const tick = ref(0);
  let timer: ReturnType<typeof setInterval> | undefined;

  function rebuild() {
    const previous = sim.value;
    const next = new Simulator(program.value);
    for (const name of program.value.inputs) {
      if (previous.io.has(name)) {
        next.input(name, previous.io.get(name)!);
      }
    }
    sim.value = next;
    tick.value++;
  }

  watch(program, rebuild);

  function schedule() {
    clearInterval(timer);
    timer = undefined;
    if (running.value) {
      timer = setInterval(() => {
        for (let i = 0; i < speed.value; i++) {
          sim.value.scan();
        }
        tick.value++;
      }, program.value.scanMs);
    }
  }

  watch([running, speed, () => program.value.scanMs], schedule);

  onBeforeUnmount(() => clearInterval(timer));

  const state = computed(() => {
    void tick.value;
    const s = sim.value;
    const step = program.value.steps[s.step];
    let progress: number | null = null;
    if (step && (step.kind === 'pulse' || step.kind === 'waitTime')) {
      progress = step.ms > 0 ? Math.min(1, s.t / step.ms) : 1;
    }
    return {
      cycles: s.cycles,
      timeMs: s.cycles * program.value.scanMs,
      stepIndex: s.step,
      step,
      activeNodeId: s.activeNodeId() ?? null,
      progress,
      elapsedMs: s.t,
    };
  });

  function value(name: string): Value {
    void tick.value;
    return sim.value.value(name);
  }

  function setInput(name: string, v: Value) {
    sim.value.input(name, v);
    tick.value++;
  }

  return {
    running,
    speed,
    state,
    value,
    setInput,
    start() {
      running.value = true;
    },
    stop() {
      running.value = false;
    },
    stepOnce() {
      running.value = false;
      sim.value.scan();
      tick.value++;
    },
    reset() {
      running.value = false;
      rebuild();
    },
  };
}

export type Simulation = ReturnType<typeof useSimulation>;
