/**
 * Zeichnet die reduzierten FlowBerry-Symbole anstelle der BPMN-Optik:
 *
 *   StartEvent          → kurze senkrechte Doppellinie (Stromschiene)
 *   Task kind=contact   → -| |-  bzw. -|/|- (negiert), Signalname darüber
 *   Task kind=ton/tof   → Rechteck mit "TON 500 ms"
 *   Task kind=coil      → -( )- Spule, Signalname darüber
 *   ExclusiveGateway    → kleiner Verteilerpunkt
 *
 * Alles andere fällt auf den normalen BPMN-Renderer zurück.
 */
import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer';
import {append as svgAppend, attr as svgAttr, create as svgCreate} from 'tiny-svg';

const HIGH_PRIORITY = 1500;

const STROKE = '#2f3b45';
const ACCENT = '#4f7a5a';

function fbKind(element: any): string | undefined {
  return element?.businessObject?.get?.('fb:kind');
}

function fbNegated(element: any): boolean {
  return element?.businessObject?.get?.('fb:negated') === true;
}

function fbPreset(element: any): number {
  const raw = element?.businessObject?.get?.('fb:preset');
  const n = parseInt(String(raw ?? ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function line(parent: SVGElement, x1: number, y1: number, x2: number, y2: number, width = 2, stroke = STROKE) {
  const el = svgCreate('line');
  svgAttr(el, {x1, y1, x2, y2, stroke, 'stroke-width': width, 'stroke-linecap': 'round'});
  svgAppend(parent, el);
  return el;
}

function text(parent: SVGElement, x: number, y: number, content: string, size = 11, anchor = 'middle') {
  const el = svgCreate('text');
  svgAttr(el, {
    x,
    y,
    'font-size': size,
    'font-family': 'ui-monospace, monospace',
    'text-anchor': anchor,
    fill: STROKE,
  });
  el.textContent = content;
  svgAppend(parent, el);
  return el;
}

export default class FlowberryRenderer extends BaseRenderer {
  static $inject = ['eventBus', 'bpmnRenderer'];

  private bpmnRenderer: any;

  constructor(eventBus: any, bpmnRenderer: any) {
    super(eventBus, HIGH_PRIORITY);
    this.bpmnRenderer = bpmnRenderer;
  }

  canRender(element: any): boolean {
    if (element.labelTarget) {
      // externe Labels normal rendern lassen
      return false;
    }
    const type = element?.businessObject?.$type;
    return (
      type === 'bpmn:StartEvent' ||
      type === 'bpmn:ExclusiveGateway' ||
      (type === 'bpmn:Task' && !!fbKind(element))
    );
  }

  drawShape(parentNode: SVGElement, element: any): SVGElement {
    const type = element.businessObject.$type;
    const w = element.width;
    const h = element.height;
    const midY = h / 2;
    const name = element.businessObject.name || '';

    // unsichtbares Trefferfeld, damit das Element anklickbar bleibt
    const hit = svgCreate('rect');
    svgAttr(hit, {x: 0, y: 0, width: w, height: h, fill: 'transparent', stroke: 'none'});
    svgAppend(parentNode, hit);

    if (type === 'bpmn:StartEvent') {
      // Stromschiene: dicke Doppellinie
      line(parentNode, w / 2 - 4, 2, w / 2 - 4, h - 2, 3);
      line(parentNode, w / 2 + 2, 2, w / 2 + 2, h - 2, 3);
      return hit;
    }

    if (type === 'bpmn:ExclusiveGateway') {
      // Verteilerpunkt
      const dot = svgCreate('circle');
      svgAttr(dot, {cx: w / 2, cy: h / 2, r: 6, fill: STROKE});
      svgAppend(parentNode, dot);
      return hit;
    }

    const kind = fbKind(element);

    if (kind === 'contact') {
      const gap = 8;
      // Zuleitungen
      line(parentNode, 0, midY, w / 2 - gap, midY);
      line(parentNode, w / 2 + gap, midY, w, midY);
      // Kontaktstriche
      line(parentNode, w / 2 - gap, midY - 12, w / 2 - gap, midY + 12, 2.5);
      line(parentNode, w / 2 + gap, midY - 12, w / 2 + gap, midY + 12, 2.5);
      if (fbNegated(element)) {
        line(parentNode, w / 2 - gap - 4, midY + 14, w / 2 + gap + 4, midY - 14, 2);
      }
      text(parentNode, w / 2, midY - 18, name || '?');
      return hit;
    }

    if (kind === 'coil') {
      const r = 13;
      line(parentNode, 0, midY, w / 2 - r, midY);
      line(parentNode, w / 2 + r, midY, w, midY);
      const arcL = svgCreate('path');
      svgAttr(arcL, {
        d: `M ${w / 2 - 4} ${midY - r} A ${r} ${r} 0 0 0 ${w / 2 - 4} ${midY + r}`,
        fill: 'none',
        stroke: ACCENT,
        'stroke-width': 2.5,
      });
      svgAppend(parentNode, arcL);
      const arcR = svgCreate('path');
      svgAttr(arcR, {
        d: `M ${w / 2 + 4} ${midY - r} A ${r} ${r} 0 0 1 ${w / 2 + 4} ${midY + r}`,
        fill: 'none',
        stroke: ACCENT,
        'stroke-width': 2.5,
      });
      svgAppend(parentNode, arcR);
      text(parentNode, w / 2, midY - 18, name || '?');
      return hit;
    }

    if (kind === 'ton' || kind === 'tof') {
      const box = svgCreate('rect');
      svgAttr(box, {
        x: 1,
        y: midY - 16,
        width: w - 2,
        height: 32,
        rx: 3,
        fill: '#fff',
        stroke: STROKE,
        'stroke-width': 1.5,
      });
      svgAppend(parentNode, box);
      text(parentNode, w / 2, midY - 2, kind.toUpperCase(), 12);
      text(parentNode, w / 2, midY + 12, `${fbPreset(element)} ms`, 10);
      return hit;
    }

    return this.bpmnRenderer.drawShape(parentNode, element);
  }
}
