/**
 * Browser-Simulation des Schrittprogramms – gleiche Semantik wie das
 * generierte Berry-Script (siehe berry/emitter.ts), damit man den Ablauf
 * ohne Hardware durchspielen kann.
 */
import type {Expr} from '../model/expr.ts';
import type {Next, Program} from '../model/compile.ts';

export type Value = boolean | number;

/** Berry-Wahrheitswert: nil, false und 0 sind falsch. */
function truthy(v: Value | undefined): boolean {
  return v !== undefined && v !== false && v !== 0;
}

/** Berry int(): true → 1, false → 0 */
function toInt(v: Value | undefined): number {
  if (typeof v === 'number') {
    return Math.trunc(v);
  }
  return v ? 1 : 0;
}

export class Simulator {
  /** "Hardware": Eingänge setzt die Oberfläche, Ausgänge schreibt scan() */
  readonly io = new Map<string, Value>();
  step = 0;
  t = 0;
  entry = true;
  cycles = 0;
  private img = new Map<string, Value>();
  private changed = new Set<string>();
  private readonly q = new Map<string, Value>();

  constructor(public program: Program) {}

  /** Signalwert wie io_get im Berry-Script */
  value(name: string): Value {
    return this.io.get(name) ?? false;
  }

  /** Eingang setzen (wie FB_IO[name] = value) */
  input(name: string, value: Value) {
    this.io.set(name, value);
  }

  private get(name: string): Value {
    if (!this.img.has(name)) {
      this.img.set(name, this.value(name));
    }
    return this.img.get(name)!;
  }

  private set(name: string, value: Value) {
    this.img.set(name, value);
    this.changed.add(name);
  }

  restart() {
    this.goto(0);
  }

  goto(s: number) {
    this.step = s;
    this.t = 0;
    this.entry = true;
  }

  private next(next: Next) {
    this.goto(next ?? 0);
  }

  evalBool(e: Expr): Value {
    switch (e.k) {
      case 'bool':
        return e.v;
      case 'num':
        return e.v !== 0;
      case 'sig':
        return this.get(e.name);
      case 'not':
        return !truthy(this.evalBool(e.a));
      case 'and':
        return truthy(this.evalBool(e.a)) && truthy(this.evalBool(e.b));
      case 'or':
        return truthy(this.evalBool(e.a)) || truthy(this.evalBool(e.b));
      case 'cmp': {
        const a = this.evalNum(e.a);
        const b = this.evalNum(e.b);
        switch (e.op) {
          case '==':
            return a === b;
          case '!=':
            return a !== b;
          case '<':
            return a < b;
          case '<=':
            return a <= b;
          case '>':
            return a > b;
          case '>=':
            return a >= b;
        }
        return false;
      }
      default:
        return this.evalNum(e) !== 0;
    }
  }

  evalNum(e: Expr): number {
    switch (e.k) {
      case 'num':
        return e.v;
      case 'bool':
        return e.v ? 1 : 0;
      case 'sig':
        return toInt(this.get(e.name));
      case 'neg':
        return -this.evalNum(e.a);
      case 'add':
        return this.evalNum(e.a) + this.evalNum(e.b);
      case 'sub':
        return this.evalNum(e.a) - this.evalNum(e.b);
      default:
        return toInt(this.evalBool(e));
    }
  }

  /** Ein SPS-Zyklus, identisch zu FlowBerryLogic.scan() im Berry-Script. */
  scan() {
    this.cycles++;
    this.img = new Map();
    this.changed = new Set();
    this.run();
    for (const name of this.changed) {
      const value = this.img.get(name)!;
      if (!this.q.has(name) || this.q.get(name) !== value) {
        this.q.set(name, value);
        this.io.set(name, value);
      }
    }
  }

  private run() {
    const {steps, numeric, scanMs} = this.program;
    const seen = new Set<number>();
    while (!seen.has(this.step)) {
      const s = this.step;
      seen.add(s);
      if (s < 0) {
        return;
      }
      const step = steps[s];
      if (!step) {
        return;
      }
      switch (step.kind) {
        case 'start':
        case 'input':
          this.next(step.next);
          break;
        case 'end':
          this.goto(step.halt ? -1 : 0);
          break;
        case 'decision':
          this.next(truthy(this.evalBool(step.cond)) ? step.onTrue : step.onFalse);
          break;
        case 'action':
          for (const {target, expr} of step.assigns) {
            this.set(target, numeric.has(target) ? this.evalNum(expr) : this.evalBool(expr));
          }
          this.next(step.next);
          break;
        case 'pulse':
          if (this.entry) {
            this.set(step.signal, true);
            this.entry = false;
          }
          if (this.t < step.ms) {
            this.t += scanMs;
            return;
          }
          this.set(step.signal, false);
          this.next(step.next);
          break;
        case 'waitTime':
          if (this.t < step.ms) {
            this.t += scanMs;
            return;
          }
          this.next(step.next);
          break;
        case 'waitCond':
          if (!truthy(this.evalBool(step.cond))) {
            return;
          }
          this.next(step.next);
          break;
      }
    }
  }

  /** Knoten des aktiven Schritts (für die Hervorhebung im Diagramm). */
  activeNodeId(): string | undefined {
    return this.program.steps[this.step]?.nodeId;
  }
}
