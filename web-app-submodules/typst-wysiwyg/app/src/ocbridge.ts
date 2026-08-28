// OpenCloud vendor patch: postMessage bridge to the OpenCloud wrapper.
//
// The wrapper (web-app-submodules/typst-wysiwyg/src/App.vue) embeds this app
// in a same-origin iframe with ?oc=1. The protocol:
//   app → host  {type: 'typwys:ready'}                 bridge is listening
//   host → app  {type: 'typwys:load', text}            .typ content to open
//   app → host  {type: 'typwys:content', text, explicit}  current .typ
//                                                      (explicit = user save)
//   host → app  {type: 'typwys:request-content'}       force a content post
//   app → host  {type: 'typwys:error', message}        load failed
//
// Outside the wrapper (?oc missing) every function is a no-op and the app
// behaves exactly like upstream.

export type OcBridgeHooks = {
  openDocText: (text: string) => void;
  currentTypFile: () => string;
  flashSaved: () => void;
};

export const ocMode = new URLSearchParams(window.location.search).has('oc');

let hooks: OcBridgeHooks | undefined;
let notifyTimer: number | undefined;
// Set while a typwys:load is being applied: the load itself runs through
// the app's change paths, but must not count as a user edit (opening a
// file would otherwise immediately mark it dirty with normalized content).
let loadingDoc = false;

function post(explicit: boolean): void {
  if (!hooks) return;
  window.parent.postMessage(
    {type: 'typwys:content', text: hooks.currentTypFile(), explicit},
    window.origin,
  );
  if (explicit) hooks.flashSaved();
}

export function initOcBridge(bridgeHooks: OcBridgeHooks): void {
  if (!ocMode) return;
  hooks = bridgeHooks;
  window.addEventListener('message', (event) => {
    if (event.source !== window.parent) return;
    const msg = event.data as {type?: string; text?: string} | null;
    if (msg?.type === 'typwys:load' && typeof msg.text === 'string') {
      loadingDoc = true;
      try {
        hooks!.openDocText(msg.text);
      } catch (error) {
        window.parent.postMessage(
          {type: 'typwys:error', message: String(error)},
          window.origin,
        );
      } finally {
        loadingDoc = false;
        window.clearTimeout(notifyTimer);
      }
    } else if (msg?.type === 'typwys:request-content') {
      window.clearTimeout(notifyTimer);
      post(true);
    }
  });
  window.parent.postMessage({type: 'typwys:ready'}, window.origin);
}

/** Debounced change notification towards the OpenCloud wrapper. */
export function ocDocChanged(): void {
  if (!ocMode || !hooks || loadingDoc) return;
  window.clearTimeout(notifyTimer);
  notifyTimer = window.setTimeout(() => post(false), 900);
}

/** Explicit save (Ctrl+S / save button). Returns true when handled. */
export function ocSave(): boolean {
  if (!ocMode || !hooks) return false;
  window.clearTimeout(notifyTimer);
  post(true);
  return true;
}
