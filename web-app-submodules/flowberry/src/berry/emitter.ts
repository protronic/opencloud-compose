/**
 * Berry-Emitter: Schrittprogramm → in sich geschlossenes Berry-Script.
 *
 * Das Script enthält die E/A-Anbindung (io_get/io_set) und die Klasse
 * FlowBerryLogic mit einer Schrittkette. scan() ist ein SPS-Zyklus nach dem
 * EVA-Prinzip: Signale werden einmal je Zyklus ins Prozessabbild gelesen, die
 * Schritte laufen nacheinander durch, bis einer wartet (Zeit, Bedingung) oder
 * ein Schritt im selben Zyklus ein zweites Mal drankäme (Schleife im
 * Ablaufplan), und erst am Zyklusende gehen geänderte Ausgänge per io_set
 * hinaus – kein Flackern, wenn ein Zyklus einen Ausgang aus- und wieder
 * einschaltet. Zeiten zählen Zyklen (SCAN_MS je Aufruf): deterministisch und
 * ohne Plattform-Uhr, also auch im Standard-Berry-Interpreter am PC testbar.
 */
import type {Expr} from '../model/expr.ts';
import type {Next, Program, Step} from '../model/compile.ts';
import {formatMs} from '../model/types.ts';
import {berryIoStubs, berryUsageHint} from './runtime.ts';

export interface EmitResult {
  code: string;
  /** Knoten-ID → [erste, letzte] Zeile (0-basiert) des zugehörigen Schritts */
  lineRanges: Record<string, [number, number]>;
}

// Rangfolge der erzeugten Berry-Ausdrücke (groß = bindet stärker)
const P_OR = 1;
const P_AND = 2;
const P_CMP = 3;
const P_ADD = 4;
const P_UNARY = 5;
const P_ATOM = 6;

interface Out {
  s: string;
  p: number;
}

function wrap(out: Out, min: number): string {
  return out.p < min ? `(${out.s})` : out.s;
}

function sigGet(name: string): string {
  return `self.get("${name}")`;
}

/** Ausdruck als Wahrheitswert (Bedingungen, Bit-Zuweisungen). */
function asBool(e: Expr): Out {
  switch (e.k) {
    case 'bool':
      return {s: String(e.v), p: P_ATOM};
    case 'num':
      return {s: e.v !== 0 ? 'true' : 'false', p: P_ATOM};
    case 'sig':
      return {s: sigGet(e.name), p: P_ATOM};
    case 'not':
      return {s: '!' + wrap(asBool(e.a), P_UNARY), p: P_UNARY};
    case 'and':
      return {s: `${wrap(asBool(e.a), P_AND)} && ${wrap(asBool(e.b), P_AND + 1)}`, p: P_AND};
    case 'or':
      return {s: `${wrap(asBool(e.a), P_OR)} || ${wrap(asBool(e.b), P_OR + 1)}`, p: P_OR};
    case 'cmp':
      return {s: `${wrap(asNum(e.a), P_ADD)} ${e.op} ${wrap(asNum(e.b), P_ADD)}`, p: P_CMP};
    case 'add':
    case 'sub':
    case 'neg':
      return {s: `${wrap(asNum(e), P_ADD)} != 0`, p: P_CMP};
  }
}

/** Ausdruck als Zahl (Zähler, Größenvergleiche). */
function asNum(e: Expr): Out {
  switch (e.k) {
    case 'num':
      return {s: String(e.v), p: P_ATOM};
    case 'bool':
      return {s: e.v ? '1' : '0', p: P_ATOM};
    case 'sig':
      return {s: `int(${sigGet(e.name)})`, p: P_ATOM};
    case 'neg':
      return {s: '-' + wrap(asNum(e.a), P_UNARY), p: P_UNARY};
    case 'add':
      return {s: `${wrap(asNum(e.a), P_ADD)} + ${wrap(asNum(e.b), P_ADD + 1)}`, p: P_ADD};
    case 'sub':
      return {s: `${wrap(asNum(e.a), P_ADD)} - ${wrap(asNum(e.b), P_ADD + 1)}`, p: P_ADD};
    default:
      return {s: `int(${asBool(e).s})`, p: P_ATOM};
  }
}

export function berryCondition(e: Expr): string {
  return asBool(e).s;
}

/** Verneinte Bedingung; "!!" wird gekürzt (Warte bis !SENSOR). */
function notCondition(e: Expr): string {
  return e.k === 'not' ? asBool(e.a).s : '!' + wrap(asBool(e), P_UNARY);
}

export function berryValue(e: Expr, numeric: boolean): string {
  return numeric ? asNum(e).s : asBool(e).s;
}

/** Kommentartext: einzeilig, ohne "#-" (Blockkommentar in Berry). */
function comment(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function emitBerry(
  program: Program,
  options: {
    fileName?: string;
    /** Kennung des Erzeugers im Dateikopf, z. B. "flowBerry 0.2.0 (04022f5abc)" */
    generator?: string;
  } = {}
): EmitResult {
  const lines: string[] = [];
  const lineRanges: Record<string, [number, number]> = {};
  const out = (line = '') => lines.push(line);
  const scanMs = program.scanMs;

  const goto = (next: Next) => `self.goto(${next ?? 0})`;

  out(
    `# Generiert von ${options.generator ?? 'flowBerry'}${options.fileName ? ` aus ${options.fileName}` : ''}` +
      ' – Änderungen hier werden beim nächsten Export überschrieben.'
  );
  out('#');
  out(`# Eingänge:   ${program.inputs.join(', ') || '–'}`);
  out(`# Ausgänge:   ${program.outputs.join(', ') || '–'}`);
  out(`# Zykluszeit: ${scanMs} ms – scan() in diesem Abstand aufrufen`);
  out();
  for (const line of berryIoStubs().split('\n')) {
    out(line);
  }
  out('# ---- Ablauf -----------------------------------------------------------------');
  out('class FlowBerryLogic');
  out('  var SCAN_MS   # Zykluszeit in ms');
  out('  var step      # aktiver Schritt, -1 = angehalten');
  out('  var t         # Zeit im aktiven Schritt in ms');
  out('  var entry     # true beim ersten Durchlauf eines Schritts');
  out('  var img       # Prozessabbild des laufenden Zyklus');
  out('  var changed   # im Zyklus geschriebene Signale');
  out('  var q         # zuletzt ausgegebene Werte');
  out();
  out('  def init()');
  out(`    self.SCAN_MS = ${scanMs}`);
  out('    self.q = {}');
  out('    self.restart()');
  out('  end');
  out();
  out('  # Ablauf von vorn (START) beginnen');
  out('  def restart()');
  out('    self.goto(0)');
  out('  end');
  out();
  out('  def goto(s)');
  out('    self.step = s');
  out('    self.t = 0');
  out('    self.entry = true');
  out('  end');
  out();
  out('  # Signal aus dem Prozessabbild; beim ersten Zugriff im Zyklus gelesen');
  out('  def get(name)');
  out('    if !self.img.contains(name)');
  out('      self.img[name] = io_get(name)');
  out('    end');
  out('    return self.img[name]');
  out('  end');
  out();
  out('  # Signal im Prozessabbild setzen; hinaus geht es am Zyklusende');
  out('  def set(name, value)');
  out('    self.img[name] = value');
  out('    self.changed[name] = true');
  out('  end');
  out();
  out('  # Ein SPS-Zyklus: Eingänge lesen, Ablauf ausführen, geänderte Ausgänge schreiben');
  out('  def scan()');
  out('    self.img = {}');
  out('    self.changed = {}');
  out('    self.run()');
  out('    for name: self.changed.keys()');
  out('      var value = self.img[name]');
  out('      if !self.q.contains(name) || self.q[name] != value');
  out('        self.q[name] = value');
  out('        io_set(name, value)');
  out('      end');
  out('    end');
  out('  end');
  out();
  out('  # Schritte laufen, bis einer wartet oder ein Schritt im selben Zyklus');
  out('  # erneut drankäme (Schleife) – dann geht es im nächsten Zyklus weiter.');
  out('  def run()');
  out('    var seen = {}');
  out('    while !seen.contains(self.step)');
  out('      var s = self.step');
  out('      seen[s] = true');
  out(`${'      if s < 0'.padEnd(46)} # angehalten`);
  out('        return');

  const timeWait = (ms: number) => {
    out(`        if self.t < ${ms}`);
    out('          self.t += self.SCAN_MS');
    out('          return');
    out('        end');
  };

  for (const step of program.steps) {
    const first = lines.length;
    const head = `      elif s == ${step.index}`;
    out(`${head.padEnd(46)} # ${comment(stepComment(step))}`);
    switch (step.kind) {
      case 'start':
      case 'input':
        out(`        ${goto(step.next)}`);
        break;
      case 'end':
        out(step.halt ? '        self.goto(-1)' : '        self.goto(0)');
        break;
      case 'decision':
        out(`        if ${berryCondition(step.cond)}`);
        out(`          ${goto(step.onTrue)}`);
        out('        else');
        out(`          ${goto(step.onFalse)}`);
        out('        end');
        break;
      case 'action':
        for (const {target, expr} of step.assigns) {
          out(`        self.set("${target}", ${berryValue(expr, program.numeric.has(target))})`);
        }
        out(`        ${goto(step.next)}`);
        break;
      case 'pulse':
        out('        if self.entry');
        out(`          self.set("${step.signal}", true)`);
        out('          self.entry = false');
        out('        end');
        timeWait(step.ms);
        out(`        self.set("${step.signal}", false)`);
        out(`        ${goto(step.next)}`);
        break;
      case 'waitTime':
        timeWait(step.ms);
        out(`        ${goto(step.next)}`);
        break;
      case 'waitCond':
        out(`        if ${notCondition(step.cond)}`);
        out('          return');
        out('        end');
        out(`        ${goto(step.next)}`);
        break;
    }
    lineRanges[step.nodeId] = [first, lines.length - 1];
  }

  out('      end');
  out('    end');
  out('  end');
  out('end');
  out();
  for (const line of berryUsageHint(scanMs).split('\n')) {
    out(line);
  }

  return {code: lines.join('\n') + '\n', lineRanges};
}

function stepComment(step: Step): string {
  switch (step.kind) {
    case 'start':
      return 'START';
    case 'end':
      return step.halt ? 'ENDE (Halt)' : 'ENDE → START';
    case 'decision':
      return `Entscheidung: ${step.label}`;
    case 'pulse':
      return `Impuls: ${step.signal} = 1 für ${formatMs(step.ms)}`;
    default:
      return step.label;
  }
}
