/**
 * Tests für Parser, Compiler, Simulation und Berry-Emitter.
 *
 *   pnpm test                          # ohne Berry-Interpreter
 *   BERRY=/pfad/zu/berry pnpm test     # zusätzlich Abgleich Berry ↔ Simulation
 *
 * Der Abgleich lässt das generierte Script im echten Berry-Interpreter laufen
 * und vergleicht Zyklus für Zyklus Schritt und Ausgänge mit der Simulation.
 */
import {execFileSync} from 'node:child_process';
import {mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe, test} from 'node:test';
import assert from 'node:assert/strict';
import {parseAssignment, parseExpr} from '../src/model/expr.ts';
import {compile, type Program} from '../src/model/compile.ts';
import {parseDoc, serializeDoc} from '../src/model/document.ts';
import {emitBerry} from '../src/berry/emitter.ts';
import {Simulator, type Value} from '../src/sim/simulator.ts';

const example = (name: string) =>
  compile(parseDoc(readFileSync(new URL(`../examples/${name}.flowberry`, import.meta.url), 'utf8')));

type Inputs = Record<string, Value>;
/** Eingänge je Zyklus: ab Zyklus n gelten die angegebenen Werte */
type Scenario = {cycles: number; changes: Record<number, Inputs>};

function simTrace(program: Program, scenario: Scenario, watch: string[]): string[] {
  const sim = new Simulator(program);
  const trace: string[] = [];
  for (let i = 0; i < scenario.cycles; i++) {
    for (const [name, value] of Object.entries(scenario.changes[i] ?? {})) {
      sim.input(name, value);
    }
    sim.scan();
    trace.push([sim.step, ...watch.map((w) => String(sim.value(w)))].join('|'));
  }
  return trace;
}

function berryTrace(berry: string, program: Program, scenario: Scenario, watch: string[]): string[] {
  const lit = (v: Value) => (typeof v === 'number' ? String(v) : v ? 'true' : 'false');
  const driver = ['var logic = FlowBerryLogic()'];
  for (let i = 0; i < scenario.cycles; i++) {
    for (const [name, value] of Object.entries(scenario.changes[i] ?? {})) {
      driver.push(`FB_IO["${name}"] = ${lit(value)}`);
    }
    driver.push('logic.scan()');
    driver.push(
      `print(${['str(logic.step)', ...watch.map((w) => `str(FB_IO.find("${w}", false))`)].join(' + "|" + ')})`
    );
  }
  const dir = mkdtempSync(join(tmpdir(), 'flowberry-'));
  const file = join(dir, 'logic.be');
  writeFileSync(file, emitBerry(program).code + '\n' + driver.join('\n') + '\n');
  return execFileSync(berry, [file], {encoding: 'utf8'}).trimEnd().split('\n');
}

describe('Ausdrücke', () => {
  test('Logik, Vergleich und Rangfolge', () => {
    assert.deepEqual(parseExpr('A & !B | C'), {
      k: 'or',
      a: {k: 'and', a: {k: 'sig', name: 'A'}, b: {k: 'not', a: {k: 'sig', name: 'B'}}},
      b: {k: 'sig', name: 'C'},
    });
    assert.deepEqual(parseExpr('MPS = 1 ?'), {k: 'cmp', op: '==', a: {k: 'sig', name: 'MPS'}, b: {k: 'num', v: 1}});
    assert.deepEqual(parseExpr('nicht A und B'), parseExpr('!A && B'));
    assert.deepEqual(parseExpr('N <> 3'), parseExpr('N != 3'));
  });

  test('Zuweisung und Fehler', () => {
    assert.deepEqual(parseAssignment('N := N + 1'), {
      target: 'N',
      expr: {k: 'add', a: {k: 'sig', name: 'N'}, b: {k: 'num', v: 1}},
    });
    assert.throws(() => parseAssignment('= 1'));
    assert.throws(() => parseExpr('A &'));
    assert.throws(() => parseExpr('(A | B'));
    assert.throws(() => parseExpr('A # B'));
  });
});

describe('Compiler', () => {
  test('Bild-Beispiel: Schritte, Signale, keine Fehler', () => {
    const program = example('notstrom');
    assert.deepEqual(
      program.issues.filter((i) => i.level !== 'info'),
      []
    );
    assert.deepEqual(program.inputs, ['DGS_IN', 'MPS_IN']);
    assert.deepEqual(program.outputs, ['DGS', 'DGSS', 'OPL', 'SPS']);
    assert.equal(program.steps[0].kind, 'start');
    assert.equal(program.steps.length, 10);
  });

  test('meldet fehlende Ausgänge und Syntaxfehler am Knoten', () => {
    const doc = parseDoc(readFileSync(new URL('../examples/zaehler.flowberry', import.meta.url), 'utf8'));
    doc.edges = doc.edges.filter((e) => e.id !== 'e-voll-ende');
    doc.nodes.find((n) => n.id === 'zaehlen')!.data.text = 'N = N +';
    const program = compile(doc);
    assert.ok(program.issues.some((i) => i.nodeId === 'voll' && /Ausgang 0 fehlt/.test(i.msg)));
    assert.ok(program.issues.some((i) => i.nodeId === 'zaehlen' && i.level === 'error'));
  });

  test('Datei-Rundreise', () => {
    const text = readFileSync(new URL('../examples/notstrom.flowberry', import.meta.url), 'utf8');
    assert.equal(serializeDoc(parseDoc(text)), text);
    assert.throws(() => parseDoc('<?xml version="1.0"?><bpmn:definitions/>'), /Kontaktplan/);
  });
});

const notstromScenario: Scenario = {
  cycles: 260,
  changes: {
    0: {MPS_IN: true, DGS_IN: false},
    5: {MPS_IN: false},
    150: {DGS_IN: true},
  },
};
const notstromWatch = ['SPS', 'DGSS', 'DGS', 'OPL'];

const zaehlerScenario: Scenario = {
  cycles: 80,
  changes: Object.fromEntries(Array.from({length: 12}, (_, i) => [i * 4 + 2, {SENSOR: i % 2 === 0}])),
};

describe('Simulation', () => {
  test('Bild-Beispiel: Netz da → Last an; Netzausfall → Anlasser-Impuls 3 s', () => {
    const program = example('notstrom');
    const sim = new Simulator(program);
    sim.input('MPS_IN', true);
    sim.scan();
    assert.equal(sim.value('OPL'), true);
    assert.equal(sim.value('SPS'), false);

    sim.input('MPS_IN', false);
    sim.scan();
    assert.equal(sim.value('SPS'), true);
    assert.equal(sim.value('DGSS'), true);
    let pulseCycles = 1;
    while (sim.value('DGSS') === true && pulseCycles < 1000) {
      sim.scan();
      pulseCycles++;
    }
    // 3000 ms bei 50 ms Zykluszeit: 60 Zyklen an, im 61. Zyklus wieder aus
    assert.equal(pulseCycles, 61);
  });

  test('Zähler: nach 5 Flanken Auswerfer-Impuls', () => {
    const program = example('zaehler');
    assert.ok(program.numeric.has('N'));
    const trace = simTrace(program, zaehlerScenario, ['N', 'AUSWERFER']);
    assert.ok(trace.some((line) => line.endsWith('|0|true')));
    assert.ok(trace.some((line) => line.endsWith('|4|false')));
  });

  test('Selbsthaltung', () => {
    const sim = new Simulator(example('selbsthaltung'));
    sim.input('START', true);
    sim.scan();
    sim.input('START', false);
    sim.scan();
    assert.equal(sim.value('RUN'), true);
    sim.input('STOP', true);
    sim.scan();
    assert.equal(sim.value('RUN'), false);
    assert.equal(sim.value('LAMPE'), false);
  });
});

const berry = process.env.BERRY;

describe('Berry-Interpreter', {skip: !berry && 'BERRY=/pfad/zu/berry setzen'}, () => {
  test('Bild-Beispiel läuft in Berry wie in der Simulation', () => {
    const program = example('notstrom');
    assert.deepEqual(
      berryTrace(berry!, program, notstromScenario, notstromWatch),
      simTrace(program, notstromScenario, notstromWatch)
    );
  });

  test('Zähler läuft in Berry wie in der Simulation', () => {
    const program = example('zaehler');
    const watch = ['N', 'AUSWERFER'];
    assert.deepEqual(berryTrace(berry!, program, zaehlerScenario, watch), simTrace(program, zaehlerScenario, watch));
  });

  test('Selbsthaltung läuft in Berry wie in der Simulation', () => {
    const program = example('selbsthaltung');
    const scenario: Scenario = {
      cycles: 8,
      changes: {0: {START: true}, 1: {START: false}, 4: {STOP: true}, 6: {STOP: false}},
    };
    const watch = ['RUN', 'LAMPE'];
    assert.deepEqual(berryTrace(berry!, program, scenario, watch), simTrace(program, scenario, watch));
  });
});
