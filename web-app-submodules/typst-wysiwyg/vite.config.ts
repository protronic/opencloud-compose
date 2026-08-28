import {defineConfig} from '@opencloud-eu/extension-sdk';

// Builds the Module-Federation wrapper (src/). The embedded editor app
// (app/) is built separately by vite.app.config.ts into dist/web/wysiwyg/;
// `pnpm build` runs both.
export default defineConfig({
  name: 'typst-wysiwyg',
  build: {
    outDir: 'dist/web',
    // The app build writes into dist/web/wysiwyg afterwards; the wrapper
    // build runs first and may clean the directory.
    emptyOutDir: true,
  },
});
