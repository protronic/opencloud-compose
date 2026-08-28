import type {SpaceResource} from '@opencloud-eu/web-client';

type SavePdfFn = (space: SpaceResource, path: string, content: ArrayBuffer) => Promise<void>;

/**
 * Bridge to the OpenCloud WebDAV client and router. Filled by index.ts when
 * the extension is registered inside the OpenCloud runtime; stays empty
 * outside of it (the test harness injects a mock). Kept in its own module so
 * App.vue does not need to import @opencloud-eu/web-pkg, which only exists
 * as a shared module inside the OpenCloud host.
 *
 * openTyp navigates to another .typ file of the given space, creating the
 * file empty first when it does not exist yet (wiki "new page" flow).
 */
type OpenTypFn = (space: SpaceResource, targetResourcePath: string) => Promise<void>;

export const ocContext: {savePdf?: SavePdfFn; openTyp?: OpenTypFn} = {};
