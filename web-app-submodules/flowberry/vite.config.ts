import {defineConfig} from '@opencloud-eu/extension-sdk';

export default defineConfig({
  name: 'flowberry',
  build: {
    outDir: 'dist/web',
    emptyOutDir: true,
  },
});
