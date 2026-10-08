/**
 * Übersetzt einen Ablaufplan in ein Schrittprogramm (Schrittkette).
 *
 * Jeder vom START erreichbare Knoten wird ein Schritt; Schritt 0 ist immer
 * START, die Nummerierung folgt dem Ablauf (Zweig 1 vor Zweig 0). Aus dem
 * Programm erzeugen sowohl der Berry-Emitter als auch die Browser-Simulation
 * ihren Ablauf – beide verhalten sich dadurch gleich.
 */
import {
  type Assignment,
  collectNumericSignals,
  collectSignals,
  type Expr,
  ExprError,
  isNumeric,
  parseAssignment,
  parseExpr,
  SIGNAL_NAME,
  splitLines,
} from './expr.ts';
import {type Branch, type FbDoc, type FbEdge, type FbNode, nodeLabel, splitSignals} from './types.ts';

/** Folgeschritt; null = kein Nachfolger → Neustart bei START */
export type Next = number | null;

interface StepBase {
  index: number;
  nodeId: string;
  /** einzeilige Beschreibung für Kommentare im Code */
  label: string;
}

export type Step = StepBase &
  (
    | {kind: 'start'; next: Next}
    | {kind: 'end'; halt: boolean}
    | {kind: 'input'; signals: string[]; next: Next}
    | {kind: 'decision'; cond: Expr; onTrue: Next; onFalse: Next}
    | {kind: 'action'; assigns: Assignment[]; next: Next}
    | {kind: 'pulse'; signal: string; ms: number; next: Next}
    | {kind: 'waitTime'; ms: number; next: Next}
    | {kind: 'waitCond'; cond: Expr; next: Next}
  );

export interface Issue {
  level: 'error' | 'warning' | 'info';
  msg: string;
  nodeId?: string;
}

export interface Program {
  steps: Step[];
  /** Knoten-ID → Schrittnummer */
  stepOf: Map<string, number>;
  /** nur gelesene Signale (Eingänge) */
  inputs: string[];
  /** geschriebene Signale (Ausgänge, Merker, Zähler) */
  outputs: string[];
  /** Signale, die als Zahl geführt werden (Zähler) */
  numeric: Set<string>;
  scanMs: number;
  issues: Issue[];
}

const FALSE_EXPR: Expr = {k: 'bool', v: false};

function sortByPosition(a: FbNode, b: FbNode) {
  return a.position.y - b.position.y || a.position.x - b.position.x;
}

export function compile(doc: FbDoc): Program {
  const issues: Issue[] = [];
  const nodes = new Map(doc.nodes.map((n) => [n.id, n]));
  const outgoing = new Map<string, FbEdge[]>();
  for (const edge of doc.edges) {
    if (!nodes.has(edge.source) || !nodes.has(edge.target)) {
      continue;
    }
    const list = outgoing.get(edge.source) ?? [];
    list.push(edge);
    outgoing.set(edge.source, list);
  }

  const program: Program = {
    steps: [],
    stepOf: new Map(),
    inputs: [],
    outputs: [],
    numeric: new Set(),
    scanMs: doc.settings.scanMs,
    issues,
  };

  const starts = doc.nodes.filter((n) => n.type === 'start').sort(sortByPosition);
  if (starts.length === 0) {
    issues.push({level: 'error', msg: 'Kein START-Element vorhanden.'});
    return program;
  }
  for (const extra of starts.slice(1)) {
    issues.push({level: 'warning', msg: 'Mehrere START-Elemente – nur das oberste wird verwendet.', nodeId: extra.id});
  }

  /** Zweig-Zuordnung der Ausgänge einer Entscheidung; fehlende Angaben der Reihe nach. */
  function decisionTargets(node: FbNode): {one?: string; zero?: string} {
    const edges = outgoing.get(node.id) ?? [];
    const result: {one?: string; zero?: string} = {};
    const unlabeled: FbEdge[] = [];
    for (const edge of edges) {
      const branch = edge.data?.branch;
      const key = branch === '1' ? 'one' : branch === '0' ? 'zero' : undefined;
      if (!key) {
        unlabeled.push(edge);
      } else if (result[key]) {
        issues.push({level: 'warning', msg: `Zweig ${branch} ist mehrfach belegt – nur einer zählt.`, nodeId: node.id});
      } else {
        result[key] = edge.target;
      }
    }
    for (const edge of unlabeled) {
      if (!result.one) {
        result.one = edge.target;
      } else if (!result.zero) {
        result.zero = edge.target;
      } else {
        issues.push({level: 'warning', msg: 'Mehr als zwei Ausgänge – überzählige werden ignoriert.', nodeId: node.id});
      }
    }
    return result;
  }

  function successors(node: FbNode): string[] {
    if (node.type === 'end') {
      return [];
    }
    if (node.type === 'decision') {
      const {one, zero} = decisionTargets(node);
      return [one, zero].filter((id): id is string => !!id);
    }
    const edges = outgoing.get(node.id) ?? [];
    return edges.length ? [edges[0].target] : [];
  }

  // Nummerierung in Ablaufreihenfolge (Breitensuche ab START)
  const order: FbNode[] = [];
  const queue = [starts[0]];
  program.stepOf.set(starts[0].id, 0);
  while (queue.length) {
    const node = queue.shift()!;
    order.push(node);
    for (const id of successors(node)) {
      if (!program.stepOf.has(id)) {
        program.stepOf.set(id, program.stepOf.size);
        queue.push(nodes.get(id)!);
      }
    }
  }

  for (const node of doc.nodes) {
    if (!program.stepOf.has(node.id) && !(node.type === 'start' && node !== starts[0])) {
      issues.push({level: 'warning', msg: 'Nicht mit dem Ablauf ab START verbunden – wird ignoriert.', nodeId: node.id});
    }
  }

  const reads = new Set<string>();
  const writes = new Set<string>();
  const numeric = program.numeric;

  const stepIndex = (id: string | undefined): Next => (id === undefined ? null : program.stepOf.get(id)!);

  function expr(src: string | undefined, node: FbNode, what: string): Expr {
    try {
      const parsed = parseExpr(src ?? '');
      collectSignals(parsed, reads);
      collectNumericSignals(parsed, numeric);
      return parsed;
    } catch (err) {
      const msg = err instanceof ExprError ? err.message : String(err);
      issues.push({level: 'error', msg: `${what}: ${msg}`, nodeId: node.id});
      return FALSE_EXPR;
    }
  }

  /** gültiger Signalname oder Platzhalter, damit der erzeugte Code syntaktisch korrekt bleibt */
  function signalName(raw: string | undefined, node: FbNode): string {
    const name = (raw ?? '').trim();
    if (SIGNAL_NAME.test(name)) {
      return name;
    }
    issues.push({
      level: 'error',
      msg: name ? `"${name}" ist kein gültiger Signalname.` : 'Signalname fehlt.',
      nodeId: node.id,
    });
    return 'UNBENANNT';
  }

  function single(node: FbNode): Next {
    const edges = outgoing.get(node.id) ?? [];
    if (edges.length > 1) {
      issues.push({
        level: 'warning',
        msg: 'Mehrere Ausgänge – ein Ablaufplan geht immer nur einen Weg; verwendet wird der erste.',
        nodeId: node.id,
      });
    }
    if (edges.length === 0) {
      issues.push({level: 'info', msg: 'Kein Nachfolger – danach beginnt der Ablauf wieder bei START.', nodeId: node.id});
      return null;
    }
    return stepIndex(edges[0].target);
  }

  for (const node of order) {
    const base = {
      index: program.stepOf.get(node.id)!,
      nodeId: node.id,
      label: nodeLabel(node.type, node.data).replace(/\s*\n\s*/g, node.type === 'action' ? ', ' : ' '),
    };
    const data = node.data;
    switch (node.type) {
      case 'start':
        program.steps.push({...base, kind: 'start', next: single(node)});
        break;
      case 'end':
        if ((outgoing.get(node.id) ?? []).length) {
          issues.push({level: 'warning', msg: 'ENDE hat Ausgänge – sie werden ignoriert.', nodeId: node.id});
        }
        program.steps.push({...base, kind: 'end', halt: data.halt === true});
        break;
      case 'input': {
        const signals = splitSignals(data.signals);
        for (const s of signals) {
          if (SIGNAL_NAME.test(s)) {
            reads.add(s);
          } else {
            issues.push({level: 'error', msg: `"${s}" ist kein gültiger Signalname.`, nodeId: node.id});
          }
        }
        program.steps.push({...base, kind: 'input', signals, next: single(node)});
        break;
      }
      case 'decision': {
        const cond = expr(data.cond, node, 'Bedingung');
        const {one, zero} = decisionTargets(node);
        for (const [branch, target] of [
          ['1', one],
          ['0', zero],
        ] as [Branch, string | undefined][]) {
          if (!target) {
            issues.push({
              level: 'warning',
              msg: `Ausgang ${branch} fehlt – in diesem Fall beginnt der Ablauf wieder bei START.`,
              nodeId: node.id,
            });
          }
        }
        program.steps.push({...base, kind: 'decision', cond, onTrue: stepIndex(one), onFalse: stepIndex(zero)});
        break;
      }
      case 'action': {
        const assigns: Assignment[] = [];
        const lines = splitLines(data.text);
        if (lines.length === 0) {
          issues.push({level: 'warning', msg: 'Aktion ohne Zuweisung (z. B. "SPS = 1").', nodeId: node.id});
        }
        for (const line of lines) {
          try {
            const assign = parseAssignment(line);
            collectSignals(assign.expr, reads);
            collectNumericSignals(assign.expr, numeric);
            if (isNumeric(assign.expr)) {
              numeric.add(assign.target);
            }
            writes.add(assign.target);
            assigns.push(assign);
          } catch (err) {
            const msg = err instanceof ExprError ? err.message : String(err);
            issues.push({level: 'error', msg: `"${line}": ${msg}`, nodeId: node.id});
          }
        }
        program.steps.push({...base, kind: 'action', assigns, next: single(node)});
        break;
      }
      case 'pulse': {
        const signal = signalName(data.signal, node);
        writes.add(signal);
        program.steps.push({...base, kind: 'pulse', signal, ms: Math.max(0, Number(data.ms) || 0), next: single(node)});
        break;
      }
      case 'wait':
        if (data.waitMode === 'cond') {
          const cond = expr(data.cond, node, 'Bedingung');
          program.steps.push({...base, kind: 'waitCond', cond, next: single(node)});
        } else {
          program.steps.push({...base, kind: 'waitTime', ms: Math.max(0, Number(data.ms) || 0), next: single(node)});
        }
        break;
    }
  }

  // Zahlen-Eigenschaft über Zuweisungen weiterreichen ("B = A" mit Zähler A)
  let changed = true;
  while (changed) {
    changed = false;
    for (const step of program.steps) {
      if (step.kind !== 'action') {
        continue;
      }
      for (const {target, expr: value} of step.assigns) {
        if (value.k === 'sig' && numeric.has(value.name) && !numeric.has(target)) {
          numeric.add(target);
          changed = true;
        }
      }
    }
  }

  const byName = (a: string, b: string) => a.localeCompare(b, 'de', {numeric: true});
  program.inputs = [...reads].filter((s) => !writes.has(s)).sort(byName);
  program.outputs = [...writes].sort(byName);
  return program;
}
