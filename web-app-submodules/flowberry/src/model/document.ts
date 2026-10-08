/**
 * Dateiformat .flowberry (Version 2): JSON mit Knoten, Kanten und Einstellungen.
 * Version 1 war BPMN-XML aus dem bpmn-js-Kontaktplan-Editor und wird nur noch
 * erkannt, nicht mehr geöffnet.
 */
import {type FbDoc, type FbEdge, type FbNode, type NodeKind, defaultData, SCAN_TIMES} from './types.ts';

export const FORMAT_VERSION = 2;

const KINDS: NodeKind[] = ['start', 'end', 'input', 'decision', 'action', 'pulse', 'wait'];

export class LegacyFormatError extends Error {}

export function emptyDoc(): FbDoc {
  return {
    nodes: [
      {id: 'start', type: 'start', position: {x: 0, y: 0}, data: {}},
      {id: 'end', type: 'end', position: {x: 0, y: 200}, data: {halt: false}},
    ],
    edges: [{id: 'e-start-end', source: 'start', sourceHandle: 'b', target: 'end', targetHandle: 't'}],
    settings: {scanMs: 50},
  };
}

export function parseDoc(content: string): FbDoc {
  const text = content.trim();
  if (!text) {
    return emptyDoc();
  }
  if (text.startsWith('<')) {
    throw new LegacyFormatError('Kontaktplan-Format (flowBerry 0.1, BPMN-XML)');
  }
  const raw = JSON.parse(text);
  if (raw?.flowberry !== FORMAT_VERSION) {
    throw new Error(`unbekannte Formatversion ${raw?.flowberry}`);
  }
  const nodes: FbNode[] = (Array.isArray(raw.nodes) ? raw.nodes : [])
    .filter((n: any) => n && typeof n.id === 'string' && KINDS.includes(n.type))
    .map((n: any) => ({
      id: n.id,
      type: n.type,
      position: {x: Number(n.position?.x) || 0, y: Number(n.position?.y) || 0},
      data: {...defaultData(n.type), ...(n.data ?? {})},
    }));
  const ids = new Set(nodes.map((n) => n.id));
  const edges: FbEdge[] = (Array.isArray(raw.edges) ? raw.edges : [])
    .filter((e: any) => e && typeof e.id === 'string' && ids.has(e.source) && ids.has(e.target))
    .map((e: any) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
      targetHandle: e.targetHandle ?? null,
      ...(e.data?.branch === '1' || e.data?.branch === '0' ? {data: {branch: e.data.branch}} : {}),
    }));
  const scanMs = Number(raw.settings?.scanMs);
  return {
    nodes,
    edges,
    settings: {scanMs: (SCAN_TIMES as readonly number[]).includes(scanMs) ? scanMs : 50},
  };
}

export function serializeDoc(doc: FbDoc): string {
  const round = (v: number) => Math.round(v * 10) / 10;
  const file = {
    flowberry: FORMAT_VERSION,
    settings: doc.settings,
    nodes: doc.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: {x: round(n.position.x), y: round(n.position.y)},
      data: n.data,
    })),
    edges: doc.edges.map((e) => ({
      id: e.id,
      source: e.source,
      sourceHandle: e.sourceHandle ?? null,
      target: e.target,
      targetHandle: e.targetHandle ?? null,
      ...(e.data?.branch ? {data: {branch: e.data.branch}} : {}),
    })),
  };
  return JSON.stringify(file, null, 2) + '\n';
}
