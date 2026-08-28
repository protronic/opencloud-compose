/**
 * Bridge to the OpenCloud router. Filled by index.ts when the extension is
 * registered inside the OpenCloud runtime; stays empty outside of it (the
 * test harness injects a mock). Kept in its own module so App.vue does not
 * need to import @opencloud-eu/web-pkg, which only exists as a shared
 * module inside the OpenCloud host.
 *
 * openInSource switches the currently open file to the typst-editor app
 * (source view).
 */
type OpenInSourceFn = () => Promise<void>;

export const ocContext: {openInSource?: OpenInSourceFn} = {};
