/**
 * Ersetzt die BPMN-Palette durch einen reduzierten Satz von Logik-Elementen:
 *
 *   Schiene (StartEvent)  – linke Stromschiene, Startpunkt jedes Netzwerks
 *   Kontakt (Task, fb:kind=contact)          – Schließer, UND in Reihe
 *   Kontakt negiert (fb:negated=true)        – Öffner
 *   Verzweigung (ExclusiveGateway)           – ODER (parallele Zweige)
 *   TON / TOF (Task, fb:kind=ton|tof)        – Einschalt-/Ausschaltverzögerung
 *   Spule (Task, fb:kind=coil)               – Ausgang (Zuweisung)
 *
 * Element-Name (Doppelklick) = Signalname für Kontakte und Spulen.
 */

const PALETTE_ELEMENTS: {
  key: string;
  title: string;
  className: string;
  type: string;
  fb?: Record<string, unknown>;
}[] = [
  {
    key: 'fb-rail',
    title: 'Schiene (Netzwerk-Start)',
    className: 'fb-palette-rail',
    type: 'bpmn:StartEvent',
  },
  {
    key: 'fb-contact',
    title: 'Kontakt (Schließer) — UND in Reihe',
    className: 'fb-palette-contact',
    type: 'bpmn:Task',
    fb: { kind: 'contact', negated: false },
  },
  {
    key: 'fb-contact-neg',
    title: 'Kontakt negiert (Öffner)',
    className: 'fb-palette-contact-neg',
    type: 'bpmn:Task',
    fb: { kind: 'contact', negated: true },
  },
  {
    key: 'fb-or',
    title: 'Verzweigung — parallele Zweige sind ODER',
    className: 'fb-palette-or',
    type: 'bpmn:ExclusiveGateway',
  },
  {
    key: 'fb-ton',
    title: 'TON — Einschaltverzögerung',
    className: 'fb-palette-ton',
    type: 'bpmn:Task',
    fb: { kind: 'ton', preset: 500 },
  },
  {
    key: 'fb-tof',
    title: 'TOF — Ausschaltverzögerung',
    className: 'fb-palette-tof',
    type: 'bpmn:Task',
    fb: { kind: 'tof', preset: 500 },
  },
  {
    key: 'fb-coil',
    title: 'Spule (Ausgang)',
    className: 'fb-palette-coil',
    type: 'bpmn:Task',
    fb: { kind: 'coil' },
  },
];

export default class FlowberryPaletteProvider {
  static $inject = [
    'palette',
    'create',
    'elementFactory',
    'bpmnFactory',
    'handTool',
    'lassoTool',
    'globalConnect',
  ];

  private create: any;
  private elementFactory: any;
  private bpmnFactory: any;
  private handTool: any;
  private lassoTool: any;
  private globalConnect: any;

  constructor(
    palette: any,
    create: any,
    elementFactory: any,
    bpmnFactory: any,
    handTool: any,
    lassoTool: any,
    globalConnect: any
  ) {
    this.create = create;
    this.elementFactory = elementFactory;
    this.bpmnFactory = bpmnFactory;
    this.handTool = handTool;
    this.lassoTool = lassoTool;
    this.globalConnect = globalConnect;
    palette.registerProvider(this);
  }

  getPaletteEntries() {
    const entries: Record<string, unknown> = {
      'hand-tool': {
        group: 'tools',
        className: 'bpmn-icon-hand-tool',
        title: 'Verschieben',
        action: {
          click: (event: Event) => this.handTool.activateHand(event),
        },
      },
      'lasso-tool': {
        group: 'tools',
        className: 'bpmn-icon-lasso-tool',
        title: 'Auswählen',
        action: {
          click: (event: Event) => this.lassoTool.activateSelection(event),
        },
      },
      'global-connect-tool': {
        group: 'tools',
        className: 'bpmn-icon-connection-multi',
        title: 'Verbinden',
        action: {
          click: (event: Event) => this.globalConnect.start(event),
        },
      },
      'tool-separator': {
        group: 'tools',
        separator: true,
      },
    };

    for (const def of PALETTE_ELEMENTS) {
      entries[def.key] = {
        group: 'flowberry',
        className: def.className,
        title: def.title,
        action: {
          dragstart: (event: Event) => this.startCreate(event, def),
          click: (event: Event) => this.startCreate(event, def),
        },
      };
    }

    return entries;
  }

  private startCreate(event: Event, def: (typeof PALETTE_ELEMENTS)[number]) {
    const businessObject = this.bpmnFactory.create(def.type);
    if (def.fb) {
      for (const [key, value] of Object.entries(def.fb)) {
        businessObject.set(`fb:${key}`, value);
      }
    }
    const shape = this.elementFactory.createShape({
      type: def.type,
      businessObject,
    });
    this.create.start(event, shape);
  }
}
