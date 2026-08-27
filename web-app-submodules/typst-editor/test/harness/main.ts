import {createApp, defineComponent, h, ref} from 'vue';
import type {Resource} from '@opencloud-eu/web-client';
import App from '../../src/App.vue';

type HarnessState = {
  emitted: string[];
  saves: number;
  errors: string[];
};

declare global {
  interface Window {
    __harness: HarnessState;
  }
}

window.__harness = {
  emitted: [],
  saves: 0,
  errors: [],
};

window.addEventListener('error', (event) => {
  window.__harness.errors.push(String(event.error ?? event.message));
});
window.addEventListener('unhandledrejection', (event) => {
  window.__harness.errors.push(String(event.reason));
});

const sampleTypst = `#set page(width: 10cm, height: auto, margin: 1cm)

= Testdokument

Dies ist ein *Typst*-Beispiel mit einer Formel:

$ integral_0^1 x^2 dif x = 1/3 $
`;

// Mimics @opencloud-eu/web-pkg AppWrapper for text files: currentContent is
// the fetched string; update:currentContent flows back; save triggers PUT.
const Host = defineComponent({
  setup() {
    const currentContent = ref<string>(sampleTypst);
    const resource = {
      id: 'res-typ-1',
      name: 'notizen.typ',
      path: '/notizen.typ',
      size: sampleTypst.length,
      extension: 'typ',
      mimeType: 'text/plain',
    } as unknown as Resource;

    return () =>
      h(App, {
        currentContent: currentContent.value,
        isReadOnly: false,
        resource,
        onSave: () => {
          window.__harness.saves += 1;
        },
        'onUpdate:currentContent': (value: string) => {
          if (typeof value !== 'string') {
            window.__harness.errors.push(
              `emitted content must be a string, got ${Object.prototype.toString.call(value)}`,
            );
          }
          window.__harness.emitted.push(value);
          currentContent.value = value;
        },
      });
  },
});

createApp(Host).mount('#host');
