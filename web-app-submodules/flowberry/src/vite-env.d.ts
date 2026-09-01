/// <reference types="vite/client" />

declare module '*.vue' {
  import type {DefineComponent} from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

declare module 'bpmn-js/lib/Modeler' {
  const Modeler: any;
  export default Modeler;
}
declare module 'bpmn-js/lib/Viewer' {
  const Viewer: any;
  export default Viewer;
}
declare module 'diagram-js-minimap' {
  const MinimapModule: any;
  export default MinimapModule;
}
declare module 'diagram-js/lib/draw/BaseRenderer' {
  const BaseRenderer: any;
  export default BaseRenderer;
}
declare module 'tiny-svg' {
  export function create(name: string): SVGElement;
  export function append(parent: SVGElement, child: SVGElement): void;
  export function attr(el: SVGElement, attrs: Record<string, unknown>): void;
}
