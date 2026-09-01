import FlowberryPaletteProvider from './FlowberryPalette.ts';
import FlowberryRenderer from './FlowberryRenderer.ts';

/**
 * Reduziertes Context-Pad: nur Verbinden und Löschen,
 * kein BPMN-Replace-Menü, keine Task/Event-Schnellanlage.
 */
class FlowberryContextPadProvider {
  static $inject = ['contextPad', 'connect', 'modeling', 'translate'];

  private connect: any;
  private modeling: any;

  constructor(contextPad: any, connect: any, modeling: any) {
    this.connect = connect;
    this.modeling = modeling;
    contextPad.registerProvider(1000, this);
  }

  getContextPadEntries(element: any) {
    const connect = this.connect;
    const modeling = this.modeling;

    // vorhandene (BPMN-)Einträge komplett ersetzen
    return function () {
      const entries: Record<string, unknown> = {};

      if (element.type !== 'label') {
        entries['connect'] = {
          group: 'edit',
          className: 'bpmn-icon-connection-multi',
          title: 'Verbinden',
          action: {
            click: (event: Event) => connect.start(event, element),
            dragstart: (event: Event) => connect.start(event, element),
          },
        };
      }

      entries['delete'] = {
        group: 'edit',
        className: 'bpmn-icon-trash',
        title: 'Löschen',
        action: {
          click: () => modeling.removeElements([element]),
        },
      };

      return entries;
    };
  }
}

export const FlowberryModule = {
  __init__: ['flowberryPaletteProvider', 'flowberryRenderer', 'flowberryContextPadProvider'],
  flowberryPaletteProvider: ['type', FlowberryPaletteProvider],
  flowberryRenderer: ['type', FlowberryRenderer],
  flowberryContextPadProvider: ['type', FlowberryContextPadProvider],
};
