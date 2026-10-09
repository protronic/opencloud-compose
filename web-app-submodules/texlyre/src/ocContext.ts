import type {Resource, SpaceResource} from '@opencloud-eu/web-client';

/** One entry of a folder listing, as TeXlyre's bridge expects it. */
export interface FolderEntry {
  name: string;
  isDirectory: boolean;
  size: number;
  lastModified: number;
  /** WebDAV ETag - changes with every write, mtimes only have seconds */
  etag?: string;
}

/**
 * OpenCloud access captured in the app setup (composables are available
 * there) and used by App.vue: WebDAV on the space plus the signed-in user.
 */
export const ocContext: {
  list?: (space: SpaceResource, path: string) => Promise<FolderEntry[]>;
  read?: (space: SpaceResource, path: string) => Promise<ArrayBuffer>;
  write?: (space: SpaceResource, path: string, data: ArrayBuffer) => Promise<void>;
  mkdir?: (space: SpaceResource, path: string) => Promise<void>;
  remove?: (space: SpaceResource, path: string) => Promise<void>;
  user?: () => {id: string; name: string};
} = {};

export type {Resource, SpaceResource};
