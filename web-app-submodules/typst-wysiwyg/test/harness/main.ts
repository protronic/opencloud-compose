import {createApp, defineComponent, h, ref} from 'vue';
import type {Resource} from '@opencloud-eu/web-client';
import App from '../../src/App.vue';
import {ocContext} from '../../src/ocContext';

type HarnessState = {
  emitted: string[];
  saves: number;
  sourceSwitches: number;
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
  sourceSwitches: 0,
  errors: [],
};

// Mocks the app-switch bridge: the Quelltext toolbar button must land here
// after the pre-switch content flush.
ocContext.openInSource = async () => {
  window.__harness.sourceSwitches += 1;
};

window.addEventListener('error', (event) => {
  window.__harness.errors.push(String(event.error ?? event.message));
});
window.addEventListener('unhandledrejection', (event) => {
  window.__harness.errors.push(String(event.reason));
});

// Plain Typst source (no embedded editor state): exercises the structural
// .typ import of the vendored editor.
const sampleTypst = `= Testdokument

Dies ist ein *Beispiel* für den WYSIWYG-Import.
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
