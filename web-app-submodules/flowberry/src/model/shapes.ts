/** Größen und SVG-Umrisse der PAP-Symbole (Diagramm und Palette). */
import {type FbNodeData, type NodeKind, splitSignals} from './types.ts';

/**
 * Maße sind Vielfache von 20, damit die Mitten auf dem 10er-Raster liegen:
 * übereinander/nebeneinander gesetzte Elemente ergeben gerade Verbindungen.
 */
export function nodeSize(kind: NodeKind, data: FbNodeData = {}): {width: number; height: number} {
  switch (kind) {
    case 'start':
    case 'end':
      return {width: 120, height: 40};
    case 'decision':
      return {width: 180, height: 100};
    case 'action': {
      const lines = Math.max(1, (data.text ?? '').split('\n').filter((l) => l.trim()).length);
      return {width: 180, height: Math.max(60, Math.ceil((20 + lines * 18) / 20) * 20)};
    }
    case 'input': {
      const long = splitSignals(data.signals).join(' & ').length > 18;
      return {width: long ? 220 : 180, height: 60};
    }
    default:
      return {width: 180, height: 60};
  }
}

/** Umriss als Pfad in einem w×h-Rahmen; i = Einzug für die Strichstärke. */
export function shapePath(kind: NodeKind, w: number, h: number, i = 1.5): string {
  switch (kind) {
    case 'start':
    case 'end': {
      const r = (h - 2 * i) / 2;
      return `M${i + r},${i} H${w - i - r} A${r},${r} 0 0 1 ${w - i - r},${h - i} H${i + r} A${r},${r} 0 0 1 ${i + r},${i} Z`;
    }
    case 'input': {
      const skew = Math.min(18, w / 6);
      return `M${i + skew},${i} H${w - i} L${w - i - skew},${h - i} H${i} Z`;
    }
    case 'decision':
      return `M${w / 2},${i} L${w - i},${h / 2} L${w / 2},${h - i} L${i},${h / 2} Z`;
    default:
      return `M${i},${i} H${w - i} V${h - i} H${i} Z`;
  }
}

/** Doppelte Seitenlinien („vordefinierter Prozess“) für Impuls und Warten. */
export function hasSideBars(kind: NodeKind): boolean {
  return kind === 'pulse' || kind === 'wait';
}
