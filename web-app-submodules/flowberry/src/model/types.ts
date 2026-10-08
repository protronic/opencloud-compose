/**
 * Datenmodell eines flowBerry-Ablaufplans (PAP nach DIN 66001, reduziert auf
 * das, was eine einfache SPS-Schrittsteuerung braucht).
 *
 *   start     START (Terminator)              – Einsprung, genau einmal
 *   end       ENDE (Terminator)               – Neustart bei START oder Halt
 *   input     Eingabe (Parallelogramm)        – dokumentiert gelesene Eingänge
 *   decision  Entscheidung (Raute)            – Bedingung, Ausgänge "1" / "0"
 *   action    Aktion (Rechteck)               – Zuweisungen, je Zeile "A = Ausdruck"
 *   pulse     Impuls (Rechteck, Doppelrand)   – Signal = 1 für eine Zeit, danach 0
 *   wait      Warten (Rechteck, Doppelrand)   – Zeit abwarten oder bis Bedingung
 */

export type NodeKind = 'start' | 'end' | 'input' | 'decision' | 'action' | 'pulse' | 'wait';

export type Branch = '1' | '0';

export interface FbNodeData {
  /** Füllfarbe (Schlüssel aus NODE_COLORS), sonst Standard der Elementart */
  color?: string;
  /** input: gelesene Signale, durch Komma, Leerzeichen oder & getrennt */
  signals?: string;
  /** decision, wait (mode cond): Bedingung */
  cond?: string;
  /** action: Zuweisungen, eine pro Zeile */
  text?: string;
  /** pulse: Ausgangssignal */
  signal?: string;
  /** pulse, wait (mode time): Dauer in ms */
  ms?: number;
  /** wait: auf Zeit oder auf Bedingung warten */
  waitMode?: 'time' | 'cond';
  /** end: anhalten statt bei START neu beginnen */
  halt?: boolean;
}

export interface FbNode {
  id: string;
  type: NodeKind;
  position: {x: number; y: number};
  data: FbNodeData;
}

export interface FbEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  data?: {branch?: Branch};
}

export interface FbSettings {
  /** Zykluszeit: Abstand der scan()-Aufrufe in ms */
  scanMs: number;
}

export interface FbDoc {
  nodes: FbNode[];
  edges: FbEdge[];
  settings: FbSettings;
}

/** Zykluszeiten, für die Tasmota einen passenden Driver-Hook hat. */
export const SCAN_TIMES = [50, 100, 250, 1000] as const;

export const NODE_COLORS: Record<string, {label: string; fill: string; stroke: string}> = {
  yellow: {label: 'Gelb', fill: '#fff27a', stroke: '#b59f00'},
  grey: {label: 'Grau', fill: '#d9d9d9', stroke: '#7a7a7a'},
  magenta: {label: 'Magenta', fill: '#f39cf3', stroke: '#a23ea2'},
  red: {label: 'Rot', fill: '#f4877f', stroke: '#b23b33'},
  green: {label: 'Grün', fill: '#7fdc7f', stroke: '#2f8f2f'},
  blue: {label: 'Blau', fill: '#9cc8f4', stroke: '#2f6fae'},
  white: {label: 'Weiß', fill: '#ffffff', stroke: '#6b7480'},
};

export const DEFAULT_COLOR: Record<NodeKind, string> = {
  start: 'yellow',
  end: 'yellow',
  input: 'grey',
  decision: 'magenta',
  action: 'white',
  pulse: 'green',
  wait: 'blue',
};

export const KIND_TITLE: Record<NodeKind, string> = {
  start: 'START',
  end: 'ENDE',
  input: 'Eingabe',
  decision: 'Entscheidung',
  action: 'Aktion',
  pulse: 'Impuls',
  wait: 'Warten',
};

export function defaultData(kind: NodeKind): FbNodeData {
  switch (kind) {
    case 'input':
      return {signals: ''};
    case 'decision':
      return {cond: ''};
    case 'action':
      return {text: ''};
    case 'pulse':
      return {signal: '', ms: 1000};
    case 'wait':
      return {waitMode: 'time', ms: 1000, cond: ''};
    case 'end':
      return {halt: false};
    default:
      return {};
  }
}

/** 3000 → "3 s", 1500 → "1,5 s", 250 → "250 ms" */
export function formatMs(ms: number | undefined): string {
  const value = Number(ms) || 0;
  if (value >= 1000 && value % 100 === 0) {
    return `${String(value / 1000).replace('.', ',')} s`;
  }
  return `${value} ms`;
}

export function splitSignals(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(/[\s,;&]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Beschriftung im Diagramm – so wie man sie auf Papier schreiben würde. */
export function nodeLabel(kind: NodeKind, data: FbNodeData): string {
  switch (kind) {
    case 'start':
      return 'START';
    case 'end':
      return data.halt ? 'ENDE (Halt)' : 'ENDE';
    case 'input': {
      const signals = splitSignals(data.signals);
      return signals.length ? `Lese ${signals.join(' & ')}` : 'Lese Eingänge';
    }
    case 'decision':
      return data.cond?.trim() ? `${data.cond.trim().replace(/\s*\?$/, '')} ?` : '? Bedingung';
    case 'action':
      return data.text?.trim() || 'Aktion';
    case 'pulse':
      return `${data.signal?.trim() || '?'} = 1\nfür ${formatMs(data.ms)}`;
    case 'wait':
      return data.waitMode === 'cond'
        ? `Warte bis\n${data.cond?.trim() || '?'}`
        : `Warte ${formatMs(data.ms)}`;
  }
}
