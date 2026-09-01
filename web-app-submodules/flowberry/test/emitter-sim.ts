import {emitBerry} from '../src/berry/emitter.ts';
import {BERRY_RUNTIME, BERRY_IO_STUBS} from '../src/berry/runtime.ts';

// Fake-elementRegistry: Selbsthaltung mit Not-Aus + TON auf zweite Spule
//   Netzwerk 1:  Schiene --[START]--+--[!STOP]--( RUN )
//                Schiene --[RUN]----'          (ODER-Verteiler)
//   Netzwerk 2:  Schiene --[RUN]--[TON 200ms]--( MOTOR )
type El = any;
function bo(type: string, attrs: Record<string, unknown> = {}) {
  return {
    $type: type,
    name: attrs.name,
    get(key: string) {
      if (key === 'fb:kind') return attrs.kind;
      if (key === 'fb:negated') return attrs.negated;
      if (key === 'fb:preset') return attrs.preset;
      return undefined;
    },
  };
}
const els: Record<string, El> = {};
function el(id: string, type: string, attrs: Record<string, unknown> = {}) {
  els[id] = {id, businessObject: bo(type, attrs), incoming: [], outgoing: []};
  return els[id];
}
function flow(from: string, to: string) {
  els[to].incoming.push({source: els[from]});
}
el('a_rail1', 'bpmn:StartEvent');
el('b_start', 'bpmn:Task', {kind: 'contact', name: 'START'});
el('c_run_fb', 'bpmn:Task', {kind: 'contact', name: 'RUN'});
el('d_or', 'bpmn:ExclusiveGateway');
el('e_stop', 'bpmn:Task', {kind: 'contact', name: 'STOP', negated: true});
el('f_run', 'bpmn:Task', {kind: 'coil', name: 'RUN'});
el('g_rail2', 'bpmn:StartEvent');
el('h_run2', 'bpmn:Task', {kind: 'contact', name: 'RUN'});
el('i_ton', 'bpmn:Task', {kind: 'ton', name: 'anlauf', preset: 200});
el('j_motor', 'bpmn:Task', {kind: 'coil', name: 'MOTOR'});
flow('a_rail1', 'b_start');
flow('a_rail1', 'c_run_fb');
flow('b_start', 'd_or');
flow('c_run_fb', 'd_or');
flow('d_or', 'e_stop');
flow('e_stop', 'f_run');
flow('g_rail2', 'h_run2');
flow('h_run2', 'i_ton');
flow('i_ton', 'j_motor');

const registry = {getAll: () => Object.values(els)};
const {code, warnings} = emitBerry(registry, {fileName: 'test.flowberry', scanMs: 50});
const full = code.replace('%RUNTIME%', BERRY_RUNTIME).replace('%IO%', BERRY_IO_STUBS);
console.log(full);
console.error('WARNINGS:', warnings);
