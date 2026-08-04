import {defineConfig} from '@opencloud-eu/extension-sdk';

export default defineConfig({
  name: 'pdf-annotator',
  build: {
    outDir: 'dist/web',
    emptyOutDir: true,
  },
});
