import {createApp, h} from 'vue';
import type {Resource, SpaceResource} from '@opencloud-eu/web-client';
import App from '../../src/App.vue';
import {ocContext} from '../../src/ocContext';

// In-memory OpenCloud space: absolute paths -> file data or folder marker.
type Entry = {dir?: boolean; data?: ArrayBuffer; mtime: number};
const enc = new TextEncoder();
const now = Date.now();
const fs = new Map<string, Entry>([
  ['/Dokumente', {dir: true, mtime: now}],
  ['/Dokumente/Bericht', {dir: true, mtime: now}],
  [
    '/Dokumente/Bericht/main.typ',
    {
      data: enc.encode(
        '#set page(width: 12cm, height: auto)\n#import "kapitel.typ": gruss\n\n= Hallo aus OpenCloud\n\nDieses Dokument liegt in OpenCloud. #gruss\n\n$ sum_(k=1)^n k = (n(n+1))/2 $\n',
      ).buffer,
      mtime: now,
    },
  ],
  ['/Dokumente/Bericht/kapitel.typ', {data: enc.encode('#let gruss = [Viele Grüße aus *kapitel.typ*.]\n').buffer, mtime: now}],
  ['/Dokumente/Bericht/bilder', {dir: true, mtime: now}],
  ['/Dokumente/Bericht/bilder/notiz.txt', {data: enc.encode('Unterordner\n').buffer, mtime: now}],
  ['/Dokumente/Anderes.typ', {data: enc.encode('= Nicht im Ordner\n').buffer, mtime: now}],
]);

type HarnessState = {calls: Array<[string, string]>; errors: string[]};
declare global {
  interface Window {
    __harness: HarnessState;
    __fs: Map<string, Entry>;
  }
}
window.__harness = {calls: [], errors: []};
window.__fs = fs;
window.addEventListener('error', (event) => window.__harness.errors.push(String(event.error ?? event.message)));

const parentOf = (path: string) => path.slice(0, path.lastIndexOf('/')) || '/';
const record = (op: string, path: string) => window.__harness.calls.push([op, path]);

// Mocks the WebDAV functions index.ts wires to the OpenCloud client service.
ocContext.list = async (_space, path) => {
  record('list', path);
  const folder = path.replace(/\/+$/, '') || '/';
  return [...fs.entries()]
    .filter(([p]) => p !== folder && parentOf(p) === folder)
    .map(([p, e]) => ({
      name: p.slice(p.lastIndexOf('/') + 1),
      isDirectory: !!e.dir,
      size: e.data?.byteLength ?? 0,
      lastModified: Math.floor(e.mtime / 1000) * 1000, // WebDAV: seconds
    }));
};
ocContext.read = async (_space, path) => {
  record('read', path);
  const entry = fs.get(path);
  if (!entry?.data) throw new Error(`404 ${path}`);
  return entry.data.slice(0);
};
ocContext.write = async (_space, path, data) => {
  record('write', path);
  fs.set(path, {data: data.slice(0), mtime: Date.now()});
};
ocContext.mkdir = async (_space, path) => {
  record('mkdir', path);
  fs.set(path, {dir: true, mtime: Date.now()});
};
ocContext.remove = async (_space, path) => {
  record('remove', path);
  for (const key of [...fs.keys()]) if (key === path || key.startsWith(`${path}/`)) fs.delete(key);
};
ocContext.user = () => ({id: 'user-1', name: 'mathias'});

const space = {id: 'space-1', name: 'Persönlich'} as unknown as SpaceResource;
const resource = {
  id: 'res-1',
  name: 'main.typ',
  path: '/Dokumente/Bericht/main.typ',
  extension: 'typ',
} as unknown as Resource;

createApp({render: () => h(App, {resource, space, isReadOnly: false, currentContent: ''})}).mount('#host');
