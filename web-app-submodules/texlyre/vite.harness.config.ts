import {existsSync, readFileSync, statSync} from 'node:fs';
import {extname, join, normalize} from 'node:path';
import vue from '@vitejs/plugin-vue';
import {defineConfig, type Plugin} from 'vite';

// Dev-only config for test/harness: mounts src/App.vue like the OpenCloud
// AppWrapper and serves the built TeXlyre (dist/web/app) at its OpenCloud path
// /assets/apps/texlyre/app/ - like OpenCloud: with the CSP of
// config/opencloud/csp.yaml (requests OpenCloud would block fail here too) and
// with <base href="/"> injected into every HTML file.
const appDir = join(import.meta.dirname, 'dist/web/app');
const PREFIX = '/assets/apps/texlyre/app/';
const CSP = [
  "child-src 'self'", "connect-src 'self' blob:", "default-src 'none'", "font-src 'self'",
  "frame-ancestors 'self'", "frame-src 'self' blob:", "img-src 'self' data: blob:", "manifest-src 'self'",
  "media-src 'self'", "object-src 'self' blob:", "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' blob:", "worker-src 'self' blob:",
].join('; ');
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff2': 'font/woff2',
};

function serveTexlyre(): Plugin {
  return {
    name: 'serve-texlyre',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
        if (!pathname.startsWith(PREFIX)) return next();
        let file = join(appDir, normalize(pathname.slice(PREFIX.length)));
        if (!file.startsWith(appDir)) return next();
        if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
        res.setHeader('content-security-policy', CSP);
        if (!existsSync(file)) {
          res.statusCode = 404;
          res.end('not found');
          return;
        }
        res.setHeader('content-type', TYPES[extname(file)] ?? 'application/octet-stream');
        if (extname(file) === '.html') {
          res.end(readFileSync(file, 'utf8').replace(/<head>/i, '<head><base href="/"/>'));
          return;
        }
        res.end(readFileSync(file));
      });
    },
  };
}

export default defineConfig({
  root: 'test/harness',
  plugins: [serveTexlyre(), vue()],
  server: {
    port: 5303,
    strictPort: true,
  },
});
