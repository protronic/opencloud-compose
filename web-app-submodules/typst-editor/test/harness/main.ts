import {createApp, defineComponent, h, ref} from 'vue';
import type {Resource} from '@opencloud-eu/web-client';
import App from '../../src/App.vue';
import {ocContext} from '../../src/ocContext';

type HarnessState = {
  emitted: string[];
  saves: number;
  pdfSaves: Array<{path: string; size: number; head: number[]}>;
  wikiNav: Array<{space: string | null; to: string}>;
  errors: string[];
};

declare global {
  interface Window {
    __harness: HarnessState;
    __remount: () => void;
  }
}

window.__harness = {
  emitted: [],
  saves: 0,
  pdfSaves: [],
  wikiNav: [],
  errors: [],
};

// Mocks the OpenCloud WebDAV bridge: the PDF export must land here.
ocContext.savePdf = async (_space, path, content) => {
  window.__harness.pdfSaves.push({
    path,
    size: content.byteLength,
    head: Array.from(new Uint8Array(content.slice(0, 5))),
  });
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

Weiter zur #link("zweite-seite.typ")[zweiten Seite] oder ins
#link("https://typst.app")[Typst-Web].
`;

const currentContent = ref<string>(sampleTypst);
const resource = ref({
  id: 'res-typ-1',
  name: 'notizen.typ',
  path: '/notizen.typ',
  size: sampleTypst.length,
  extension: 'typ',
  mimeType: 'text/plain',
} as unknown as Resource);

// Mocks the router bridge: wiki link clicks must resolve and land here. The
// mock then simulates the AppWrapper reload after navigation - resource
// first, content afterwards, like the real wrapper - with an empty document
// (the "new page" case).
ocContext.openTyp = async (space, targetResourcePath) => {
  window.__harness.wikiNav.push({
    space: (space as {id?: string})?.id ?? null,
    to: targetResourcePath,
  });
  resource.value = {
    ...resource.value,
    id: `res-${targetResourcePath}`,
    name: targetResourcePath.split('/').pop() ?? targetResourcePath,
    path: targetResourcePath,
  } as unknown as Resource;
  await Promise.resolve();
  currentContent.value = '';
};

// Mimics @opencloud-eu/web-pkg AppWrapper for text files: currentContent is
// the fetched string; update:currentContent flows back; save triggers PUT.
const Host = defineComponent({
  setup() {
    const space = {id: 'space-1', name: 'Testspace'} as unknown as Parameters<
      NonNullable<typeof ocContext.savePdf>
    >[0];

    return () =>
      h(App, {
        currentContent: currentContent.value,
        isReadOnly: false,
        resource: resource.value,
        space,
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

let app = createApp(Host);
app.mount('#host');

// Simulates closing and re-opening the file in OpenCloud: the app is
// unmounted and a fresh instance mounts against the shared typst singleton.
window.__remount = () => {
  app.unmount();
  currentContent.value = sampleTypst;
  resource.value = {
    id: 'res-typ-1',
    name: 'notizen.typ',
    path: '/notizen.typ',
    size: sampleTypst.length,
    extension: 'typ',
    mimeType: 'text/plain',
  } as unknown as Resource;
  app = createApp(Host);
  app.mount('#host');
};
