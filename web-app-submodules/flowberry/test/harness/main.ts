import {createApp, defineComponent, h, ref} from 'vue';
import {createGettext} from 'vue3-gettext';
import type {Resource, SpaceResource} from '@opencloud-eu/web-client';
import App from '../../src/App.vue';
import {ocContext} from '../../src/ocContext';
import example from '../../examples/notstrom.flowberry?raw';
import zaehler from '../../examples/zaehler.flowberry?raw';

type HarnessState = {
  emitted: string[];
  saves: number;
  siblings: Array<{path: string; content: string}>;
  errors: string[];
};

declare global {
  interface Window {
    __harness: HarnessState;
    __load: (content: string, readOnly?: boolean) => void;
    __examples: Record<string, string>;
  }
}

window.__harness = {emitted: [], saves: 0, siblings: [], errors: []};
window.__examples = {notstrom: example, zaehler};

// Mocks the OpenCloud WebDAV bridge: the Berry export must land here.
ocContext.saveSibling = async (_space, path, content) => {
  window.__harness.siblings.push({path, content});
};

window.addEventListener('error', (event) => {
  window.__harness.errors.push(String(event.error ?? event.message));
});
window.addEventListener('unhandledrejection', (event) => {
  window.__harness.errors.push(String(event.reason));
});

const params = new URLSearchParams(location.search);
const currentContent = ref<string>(params.has('empty') ? '' : example);
const readOnly = ref(params.has('readonly'));
const resource = ref({
  id: 'res-fb-1',
  name: 'notstrom.flowberry',
  path: '/steuerung/notstrom.flowberry',
  extension: 'flowberry',
  mimeType: 'application/octet-stream',
} as unknown as Resource);

// Mimics @opencloud-eu/web-pkg AppWrapper: currentContent is the fetched
// string, update:currentContent flows back, save triggers the PUT.
const Host = defineComponent({
  setup() {
    const space = {id: 'space-1', name: 'Testspace'} as unknown as SpaceResource;
    return () =>
      h(App, {
        key: resource.value.id,
        currentContent: currentContent.value,
        isReadOnly: readOnly.value,
        isDirty: false,
        applicationConfig: {},
        resource: resource.value,
        space,
        onSave: () => {
          window.__harness.saves += 1;
        },
        'onUpdate:currentContent': (value: string) => {
          window.__harness.emitted.push(value);
          currentContent.value = value;
        },
      });
  },
});

window.__load = (content, ro = false) => {
  currentContent.value = content;
  readOnly.value = ro;
  resource.value = {...resource.value, id: `res-${Date.now()}`} as unknown as Resource;
};

createApp(Host).use(createGettext({translations: {}, silent: true})).mount('#host');
