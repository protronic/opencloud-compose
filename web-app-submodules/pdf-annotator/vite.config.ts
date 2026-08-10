import {defineConfig} from '@opencloud-eu/extension-sdk';
import {buildInfoDefine} from './build-info';

export default defineConfig({
  name: 'pdf-annotator',
  define: buildInfoDefine(),
  build: {
    outDir: 'dist/web',
    emptyOutDir: true,
  },
});
