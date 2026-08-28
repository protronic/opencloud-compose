import type {SpaceResource} from '@opencloud-eu/web-client';

type SavePdfFn = (space: SpaceResource, path: string, content: ArrayBuffer) => Promise<void>;

/**
 * Bridge to the OpenCloud WebDAV client. Filled by index.ts when the
 * extension is registered inside the OpenCloud runtime; stays empty outside
 * of it (the test harness injects a mock). Kept in its own module so App.vue
 * does not need to import @opencloud-eu/web-pkg, which only exists as a
 * shared module inside the OpenCloud host.
 */
export const ocContext: {savePdf?: SavePdfFn} = {};
