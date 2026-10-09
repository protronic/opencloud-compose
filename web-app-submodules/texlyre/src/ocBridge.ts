import type {SpaceResource} from '@opencloud-eu/web-client';
import {type FolderEntry, ocContext} from './ocContext';

/**
 * Bridge object TeXlyre's OpenCloud mode looks for in the parent window
 * (`window.__texlyreOpenCloud`, see upstream/patches). Paths are relative to
 * the folder of the opened document.
 */
export interface TexlyreBridge {
  version: 1;
  folderKey: string;
  folderName: string;
  openFile: string;
  projectType: 'typst' | 'latex';
  readOnly: boolean;
  userId: string;
  userName: string;
  list(path: string): Promise<FolderEntry[]>;
  read(path: string): Promise<ArrayBuffer>;
  write(path: string, data: ArrayBuffer): Promise<void>;
  mkdir(path: string): Promise<void>;
  remove(path: string): Promise<void>;
  ready?(): void;
}

declare global {
  interface Window {
    __texlyreOpenCloud?: TexlyreBridge;
  }
}

export function splitPath(path: string): {folder: string; name: string} {
  const clean = `/${path.replace(/^\/+/, '')}`;
  const index = clean.lastIndexOf('/');
  return {folder: clean.slice(0, index) || '/', name: clean.slice(index + 1)};
}

/** Relative bridge path -> absolute path in the space; ".." is rejected. */
export function resolveIn(folder: string, relative: string): string {
  const parts = relative.split('/').filter(Boolean);
  if (parts.some((part) => part === '..' || part === '.')) {
    throw new Error(`invalid path: ${relative}`);
  }
  return [folder.replace(/\/+$/, ''), ...parts].join('/') || '/';
}

export function createBridge(options: {
  space: SpaceResource;
  filePath: string;
  readOnly: boolean;
  onReady?: () => void;
}): TexlyreBridge {
  const {space, filePath, readOnly} = options;
  const {folder, name} = splitPath(filePath);
  const need = <T>(fn: T | undefined, what: string): T => {
    if (!fn) throw new Error(`OpenCloud-Zugriff nicht verfügbar (${what})`);
    return fn;
  };
  const user = ocContext.user?.() ?? {id: 'anonymous', name: 'anonymous'};
  const folderName = folder === '/' ? space.name || 'OpenCloud' : (folder.split('/').pop() ?? 'OpenCloud');

  return {
    version: 1,
    folderKey: `${space.id}:${folder}`,
    folderName,
    openFile: name,
    projectType: /\.tex$/i.test(name) ? 'latex' : 'typst',
    readOnly,
    userId: user.id,
    userName: user.name,
    list: (path) => need(ocContext.list, 'list')(space, resolveIn(folder, path)),
    read: (path) => need(ocContext.read, 'read')(space, resolveIn(folder, path)),
    write: async (path, data) => {
      if (readOnly) throw new Error('Datei ist schreibgeschützt');
      await need(ocContext.write, 'write')(space, resolveIn(folder, path), data);
    },
    mkdir: async (path) => {
      if (readOnly) throw new Error('Ordner ist schreibgeschützt');
      await need(ocContext.mkdir, 'mkdir')(space, resolveIn(folder, path));
    },
    remove: async (path) => {
      if (readOnly) throw new Error('Ordner ist schreibgeschützt');
      await need(ocContext.remove, 'remove')(space, resolveIn(folder, path));
    },
    ready: () => options.onReady?.(),
  };
}
