# Vendored: ortic/typst-wysiwyg

This directory is a vendored copy of the block-based Typst WYSIWYG editor

- Upstream: https://github.com/ortic/typst-wysiwyg (MIT, see LICENSE)
- Demo: https://ortic.github.io/typst-wysiwyg/
- Vendored commit: `267a9e0` (2026-08)
- Omitted: `src-tauri/` (desktop shell), `docs/`, tests + fixtures, screenshots

## OpenCloud patches

Kept as small and localized as possible so upstream updates can be re-applied
by copying `src/` over this directory and re-doing the list below:

1. **`src/ocbridge.ts`** (new): postMessage bridge to the OpenCloud wrapper
   (`../src/App.vue`). Active only when the page is loaded with `?oc=1`.
2. **`src/main.ts`**: import + four hook lines - `ocDocChanged()` in
   `schedulePreview()`, `if (ocSave()) return;` in `saveToFile()`, skip
   localStorage autosave/restore in OC mode, `initOcBridge(...)` at boot.
3. **`src/typst.worker.ts`**: bundle the DejaVu fonts (dejavu-fonts-ttf) with
   `assets: false` instead of the typst.ts CDN default assets (the OpenCloud
   CSP has no CDN hosts), plus a font preamble prepended to every compile.
4. **`src/desktop.ts`**: replaced by a browser-only stub so the Tauri
   packages are not needed.

Build setup (vite config, package.json) lives in the parent directory; the
upstream `vite.config.ts`/`package.json` are not vendored.
