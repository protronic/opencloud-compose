# Upstream: TeXlyre

- Repository: https://github.com/TeXlyre/texlyre (AGPL-3.0-or-later)
- Pinned commit: see `upstream.json` (TeXlyre 0.13.2, 2026-10-07)
- Build: `../scripts/build-texlyre.mjs` downloads exactly that commit, applies
  `patches/*.patch` in order and builds it with the base path
  `/assets/apps/texlyre/app/`

## Patches

`patches/0001-opencloud-mode.patch` - kept small; everything OpenCloud-specific
lives in the new file `src/opencloud/ocMode.ts`:

| File | Change |
|---|---|
| `src/opencloud/ocMode.ts` (new) | Bridge to the parent window (`window.parent.__texlyreOpenCloud`), `OcDirectoryHandle`/`OcFileHandle` (the FileSystemDirectoryHandle subset TeXlyre's workspace mode uses, on top of the bridge), automatic local account per OpenCloud user, one project per OpenCloud folder |
| `src/components/app/AppRouter.tsx` | in OpenCloud mode: sign in and open the folder project instead of showing login/project list |
| `src/services/DiskHandleStore.ts` | OpenCloud handles are stored as descriptors (functions cannot be cloned into IndexedDB) |
| `src/hooks/useDiskFiles.ts` | in OpenCloud mode the folder is re-read every 10 s (other clients change it) |
| `src/main.tsx` | no service worker in OpenCloud mode |
| `src/services/CollabService.ts` | no WebRTC signaling servers in OpenCloud mode - no connections to texlyre.org (see README: collaboration) |
| `src/contexts/PeerFileSyncContext.tsx` | no peer file transfer (FilePizza/PeerJS) in OpenCloud mode - the files come from the OpenCloud folder |
| `src/extensions/typst.ts/typst-worker.ts` | `disableDefaultFontAssets()`: the fonts are bundled; without it typst.ts also fetches fonts from cdn.jsdelivr.net, which fails offline/under the OpenCloud CSP and aborts every compile (worth upstreaming) |
| `scripts/setup-assets.cjs` | exit explicitly - keep-alive sockets of the asset downloads kept the process alive |
| `vite.config.ts` | base path from `TEXLYRE_BASE`; fonts are emitted as files instead of `data:` URLs (OpenCloud's CSP has no `data:` in `font-src`) |

Without the parent bridge (normal TeXlyre) none of this is active.

Not a patch but part of `../scripts/build-texlyre.mjs`: `oc-base.js` in `index.html`.
OpenCloud serves every `.html` file with `<base href="/">`; the script points the base
back to `/assets/apps/texlyre/app/`, otherwise TeXlyre's `#hash` routes move the iframe
to `/` (a reload would then load OpenCloud into the iframe).

## Updating

1. set the new commit in `upstream.json` (`commit` and `tarball`)
2. `node ../scripts/build-texlyre.mjs` - if `git apply` fails, rebase the patch:
   check out the new commit, apply the patch with `git apply --3way`, resolve,
   `git diff > patches/0001-opencloud-mode.patch`
3. run the harness (`../README.md`)
