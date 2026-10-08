import type {InjectionKey} from 'vue';
import type {Issue} from './model/compile.ts';

/**
 * Zustand, den die Knoten im Diagramm zusätzlich zu ihren Daten anzeigen:
 * Prüfmeldungen und – während der Simulation – aktiven Schritt und Zeitfortschritt.
 */
export interface NodeDecorations {
  issues: Map<string, Issue[]>;
  /** Knoten-ID → Schrittnummer im generierten Code */
  stepOf: Map<string, number>;
  activeNodeId: string | null;
  /** 0..1 für Impuls/Warten im aktiven Schritt, sonst null */
  progress: number | null;
  readOnly: boolean;
}

export const NODE_DECORATIONS: InjectionKey<NodeDecorations> = Symbol('flowberry-node-decorations');

/** MIME-Typ beim Ziehen aus der Palette */
export const DRAG_MIME = 'application/x-flowberry-node';
