import {defineConfig} from 'vite';

// Builds the vendored typst-wysiwyg app (app/) as a self-contained static
// page into dist/web/wysiwyg/. The OpenCloud wrapper loads it in a
// same-origin iframe, so all asset paths must be relative.
export default defineConfig({
  root: 'app',
  base: './',
  // The compiler runs in a Web Worker that code-splits the WASM loaders,
  // which requires the ES module worker format (upstream setting).
  worker: {format: 'es'},
  optimizeDeps: {
    exclude: ['@myriaddreamin/typst-ts-renderer', '@myriaddreamin/typst-ts-web-compiler'],
  },
  build: {
    outDir: '../dist/web/wysiwyg',
    emptyOutDir: true,
  },
});
