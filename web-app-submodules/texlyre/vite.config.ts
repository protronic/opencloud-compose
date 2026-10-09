import {defineConfig} from '@opencloud-eu/extension-sdk';

// Builds the Module-Federation wrapper (src/). TeXlyre itself is built by
// scripts/build-texlyre.mjs into dist/web/app/ afterwards; `pnpm build` runs both.
export default defineConfig({
  name: 'texlyre',
  build: {
    outDir: 'dist/web',
    // runs first and may clean the directory, the TeXlyre build follows
    emptyOutDir: true,
  },
});
