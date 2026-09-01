import type {Resource, SpaceResource} from '@opencloud-eu/web-client';

/**
 * Brücke zwischen App-Setup (Composables verfügbar) und der App.vue:
 * speichert das generierte .be-Script neben der .flowberry-Datei.
 */
export const ocContext: {
  saveSibling?: (space: SpaceResource, path: string, content: string) => Promise<void>;
} = {};

export type {Resource, SpaceResource};
