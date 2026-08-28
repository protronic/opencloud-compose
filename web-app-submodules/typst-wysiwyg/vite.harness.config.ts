import vue from '@vitejs/plugin-vue';
import {defineConfig} from 'vite';

// Dev-only config for test/harness: mounts src/App.vue the same way the
// OpenCloud AppWrapper does. The embedded editor app must be built first
// (`vite build --config vite.app.config.ts`); publicDir then serves it
// under /wysiwyg/ exactly like the production layout.
export default defineConfig({
  root: 'test/harness',
  plugins: [vue()],
  publicDir: '../../dist/web',
  server: {
    port: 5302,
    strictPort: true,
  },
});
