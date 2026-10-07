# Web App Submodules

Build OpenCloud Web extensions from the submodules in this directory and deploy them for OpenCloud.

## How it works

```
web-extensions/packages/web-app-*/dist   →   OC_APPS_DIR/<app>/
web-app-comments/dist                    →   OC_APPS_DIR/comments/
opencloud-3dviewer/dist                  →   OC_APPS_DIR/3dviewer/
opencloud-web-calendar/dist              →   OC_APPS_DIR/web-calendar/
blockberry-editor/dist/web               →   OC_APPS_DIR/blockberry-editor/
pdf-annotator/dist/web                   →   OC_APPS_DIR/pdf-annotator/
typst-editor/dist/web                    →   OC_APPS_DIR/typst-editor/
typst-wysiwyg/dist/web                   →   OC_APPS_DIR/typst-wysiwyg/
flowberry/dist/web                       →   OC_APPS_DIR/flowberry/
emlviewer/dist/web                       →   OC_APPS_DIR/emlviewer/
webapp-lsm6/dist/web                     →   OC_APPS_DIR/webapp-lsm6/
web-app-presentation-viewer/dist/mdpresentation-viewer/   →   OC_APPS_DIR/mdpresentation-viewer/
external, prebuilt (e.g. from a CI runner)                 →   OC_APPS_DIR/<name>/  (deploy-built-apps.sh)
                                                              ↓
                                                   OpenCloud container
                                        (/var/lib/opencloud/web/assets/apps)
```

- **`OC_WEB_APPS`** is the complete build list when the script runs without app arguments -
  nothing outside it is built. It accepts every app name/alias the CLI accepts, monorepo
  apps and standalone extensions alike
- Pass app names as arguments to build a selection regardless of `OC_WEB_APPS`
- **`pdf-annotator`** ([protronic/pdf-annotator](https://github.com/protronic/pdf-annotator))
  views PDFs with pdf.js, offers the pdf.js annotation tools (highlight, free text, ink, stamp)
  and saves the annotated PDF back to OpenCloud through the regular file interface instead of a
  browser download
- **`typst-editor`** lives directly in this repository (no submodule); it edits Typst documents
  (`.typ`) with CodeMirror and an in-browser typst.ts WASM compiler for the live preview, bundles
  the DejaVu fonts (no CDN access needed) and saves through the regular OpenCloud file interface
- **`typst-wysiwyg`** lives directly in this repository and embeds a vendored copy of
  [ortic/typst-wysiwyg](https://github.com/ortic/typst-wysiwyg) (MIT) - a block-based,
  Word-style WYSIWYG editor for `.typ` files - in an iframe wired to the OpenCloud file
  interface via postMessage. Registered as an additional "Öffnen mit" entry for `.typ`
  (the typst-editor keeps priority); see `typst-wysiwyg/app/UPSTREAM.md` for the local patches
- **`flowberry`** lives directly in this repository; a reduced bpmn-js-based logic editor for
  relay/ladder-style Verknüpfungslogik (`.flowberry`, BPMN-2.0-XML with `fb:*` attributes) that
  generates self-contained Berry scripts (`.be`) next to the diagram via WebDAV - see
  `flowberry/README.md`
- **`emlviewer`** ([protronic/emlviewer](https://github.com/protronic/emlviewer)) previews `.eml`
  e-mail files (`message/rfc822`): headers, sanitised HTML/text body in a sandboxed iframe with
  inlined `cid:` images and blocked remote content, attachments (download or save next to the
  `.eml`), print / PDF via the browser print dialog. OpenCloud port of the Nextcloud Eml Viewer by
  newroco - everything runs client-side (postal-mime + DOMPurify), no server component needed
- **`webapp-lsm6`** (`ssh://git@forgejo/Protronic/WebApp-LSM6.git`, private, branch `feature/opencloud-lsmprj`)
  opens and saves `.lsmprj` files via the Angular app's Projekt laden/speichern functions.
  Opt-in build only: `./web-app-submodules/build-web-extensions.sh webapp-lsm6`
- **Build output** stays in each submodule's `dist/` directory (`dist/web` for blockberry-editor)
- **`OC_APPS_DIR`** is the directory OpenCloud reads extensions from (default: `./config/opencloud/apps`)
- The build script **cleans** `OC_APPS_DIR` (except `.gitkeep`) and **copies** each built app into it (no symlinks)
- `docker-compose.yml` bind-mounts `OC_APPS_DIR` into the container

`OC_APPS_DIR` should **not** point into a submodule. Keep it under the repo root (e.g. `config/opencloud/apps`) or any other host path you mount into OpenCloud.

## Setup

From the repository root:

```bash
git submodule update --init --recursive
```

Docker is required on the host. The build script runs `pnpm install` and `pnpm build` inside temporary containers and removes them when finished. Most apps use [pnpm](https://pnpm.io/docker) (`ghcr.io/pnpm/pnpm:11.9.0` by default, override with `PNPM_IMAGE`); the presentation viewer uses `node:20-bookworm` by default (`PRESENTATION_IMAGE`). Node.js is installed via `pnpm runtime set` where needed (default: Node 24, override with `NODE_VERSION`).

Configure the default build list in `.env` at the repository root - monorepo apps and
standalone extensions can be mixed freely:

```
OC_WEB_APPS=calculator,draw-io,json-viewer,notes,unzip,comments,pdf-annotator,typst-editor,emlviewer
```

Optional apps directory (default: `./config/opencloud/apps`):

```
OC_APPS_DIR=/your/local/opencloud/apps
```

## Build

From the repository root:

```bash
./web-app-submodules/build-web-extensions.sh
```

Without app arguments the script builds exactly the apps listed in `OC_WEB_APPS` (`.env`) - no implicit defaults. With an empty or missing `OC_WEB_APPS` it exits with a hint instead of building anything.

Build only selected extensions (monorepo apps or standalone repos):

```bash
./web-app-submodules/build-web-extensions.sh comments
./web-app-submodules/build-web-extensions.sh emlviewer
./web-app-submodules/build-web-extensions.sh calculator draw-io
./web-app-submodules/build-web-extensions.sh --all
./web-app-submodules/build-web-extensions.sh --list
```

App names from web-extensions can use the short name (`calculator`) or `web-app-calculator`. Standalone repos accept deploy names or directory names (`comments`, `web-app-comments`, `calendar` for web-calendar, `blockberry` for blockberry-editor, `eml` or `eml-viewer` for emlviewer).

After building, restart the OpenCloud container to load new extensions.

Without Docker - e.g. inside a CI job container - pass `--native` (or set `OC_BUILD_NATIVE=true`):
the same build commands then run directly on the machine, which needs node, pnpm, git, jq and rsync.

### Build and deploy on a Forgejo runner

`.forgejo/workflows/web-extensions.yml` builds and deploys from a Forgejo runner (label
`linux-amd64`, job container `node:24-bookworm`) - meant for a Forgejo mirror of this repository,
where a mirror sync triggers the push event (Actions have to be enabled in the mirror):

1. reads `OC_WEB_APPS` from the server's `.env` over ssh (`deploy-built-apps.sh --list`; names of
   other pipelines are skipped)
2. builds exactly these apps from the checkout (`build-web-extensions.sh --native`); the protronic
   GitHub submodules are fetched over HTTPS, `webapp-lsm6` (private, same Forgejo) only when listed
3. runs `deploy-built-apps.sh --restart`: uploads them plus the server's `OC_EXTERNAL_WEB_APPS`,
   swaps them into `OC_APPS_DIR` and restarts OpenCloud

Repository settings (Settings -> Actions):

| Kind | Name | Value |
|---|---|---|
| variable | `OC_DEPLOY_HOST` | ssh target, e.g. `deploy@oc.example.com` |
| variable | `OC_DEPLOY_KNOWN_HOSTS` | output of `ssh-keyscan -t ed25519 <server>` (host key check) |
| variable | `OC_DEPLOY_DIR` | compose checkout on the server, default `/opt/opencloud-compose` |
| variable | `OC_DEPLOY_PORT` | ssh port, default `22` |
| secret | `DEPLOY_SSH_KEY` | private key of a key pair made for the runner |
| secret | `PACKAGES_TOKEN` | Forgejo token: `read:package` for external app downloads, `read:repository` for `webapp-lsm6` (or a separate `REPO_READ_TOKEN`) |

On the server the public key goes into `~/.ssh/authorized_keys` of the user that owns the compose
checkout and may run `docker compose` (the deploy uses ssh/scp with `cat`, `mkdir`, `mv`, `rm` and
`docker compose restart opencloud`). Restricting the key with `from="<runner address>"` and
`no-port-forwarding,no-agent-forwarding,no-X11-forwarding` is recommended.

## Deploy built apps to a server

`deploy-built-apps.sh` uploads apps that were already built by `build-web-extensions.sh`
(the contents of the local `OC_APPS_DIR`) to an OpenCloud server over ssh/scp. The server's
own `.env` decides what and where:

1. reads `REMOTE_DIR/.env` on the server: `OC_WEB_APPS` is the app list, `OC_EXTERNAL_WEB_APPS`
   the prebuilt apps (see below), `OC_APPS_DIR` the destination (default `config/opencloud/apps`
   below `REMOTE_DIR`; `~` and relative paths work)
2. maps the entries to deploy names (`build-web-extensions.sh --resolve`, same aliases as the build)
3. refuses to start when one of the apps is not built locally; fetches and checks the external apps
4. uploads each app into a staging folder next to the apps and swaps it in (old files are removed)
5. verifies the `manifest.json` on the server and restarts OpenCloud on request

```bash
./web-app-submodules/build-web-extensions.sh                       # build what the local .env lists
./web-app-submodules/deploy-built-apps.sh -n admin@oc.example.com  # dry run: show the plan
./web-app-submodules/deploy-built-apps.sh admin@oc.example.com /opt/opencloud-compose --restart
```

`REMOTE_DIR` defaults to `/opt/opencloud-compose` (`OC_DEPLOY_DIR`). `--apps a,b` overrides the
server's `OC_WEB_APPS`, `--source DIR` the local build output. ssh options go into a `Host` entry
in `~/.ssh/config` or `OC_SSH_OPTS` / `OC_SCP_OPTS`. The uploaded files must be readable by the
OpenCloud container user (`OC_CONTAINER_UID_GID`, default 1000:1000).

### External (prebuilt) apps

Apps that are built elsewhere - e.g. in their own repository on a Forgejo runner - are not part
of `build-web-extensions.sh`. They are declared as `name=source` pairs, comma-separated, in the
server's `.env`:

```
OC_EXTERNAL_WEB_APPS=my-app=https://forgejo.example.com/api/packages/<owner>/generic/my-app/1.0.0/my-app-1.0.0.tar.gz
```

or per call with `--external name=source` (repeatable, overrides the `.env` entry of the same
name). `source` is a local directory, a `.zip` / `.tar.gz` / `.tar` archive or an http(s) URL of
such an archive; `manifest.json` has to be at the top level or inside a single top-level folder.
Downloads happen on the deploying machine (the server needs no access to Forgejo); a token for
private packages goes into `OC_EXTERNAL_TOKEN` (sent as `Authorization: token ...`), further curl
options into `OC_EXTERNAL_CURL_OPTS`. Before the upload the script checks `manifest.json`, the
entrypoint and the Module Federation runtime (see below).

Without `--apps` every external app is deployed together with `OC_WEB_APPS`; `--apps` may name
external apps as well:

```bash
./web-app-submodules/deploy-built-apps.sh admin@oc.example.com                    # OC_WEB_APPS + OC_EXTERNAL_WEB_APPS
./web-app-submodules/deploy-built-apps.sh --apps my-app admin@oc.example.com      # only the external app
./web-app-submodules/deploy-built-apps.sh --apps my-app \
  --external my-app=../my-app/dist/my-app-1.0.0.tar.gz admin@oc.example.com
```

`OC_WEB_APPS` may also list apps that other pipelines deploy, e.g. `my-app` from the runner of its
own repository: `build-web-extensions.sh` and `deploy-built-apps.sh` skip names they do not know,
so the runners do not get in each other's way. Another pipeline checks with
`deploy-built-apps.sh --list-wanted` whether the server wants its app and then deploys it with
`--apps my-app --external my-app=<dir>`.

Do not list external apps in `OC_WEB_APPS` - `build-web-extensions.sh` does not know them.

`deploy-standalone-apps.sh` is the older build-and-rsync script for the four original standalone
apps; `verify-production-apps.sh` checks the Module Federation manifests of a running server.

## Module Federation compatibility (OpenCloud 7.2.x)

External apps built with `@opencloud-eu/extension-sdk` 7.0.x can pull in Module Federation runtime **2.4.x**, which breaks other apps on OpenCloud **7.2.0** (host runtime **2.3.1**) with errors like:

`Shared module '@opencloud-eu/web-client' must be provided by host`

Pin standalone submodules to an extension-sdk that keeps the host runtime 2.3.1 - **7.1.2** or
**8.1.0** (the `web-extensions` lockfile, for OpenCloud 8.x; it still ships Module Federation
runtime 2.3.1). The build script rejects `remoteEntry*.mjs` files that use the 2.4.x
`__mf_module_cache__` pattern.

## web-extensions apps

`arcade`, `bpmn`, `calculator`, `cast`, `draw-io`, `excalidraw`, `external-sites`, `importer`, `json-viewer`, `maps`, `notes`, `pastebin`, `progress-bars`, `unzip`

## Default build (no arguments)

Exactly the apps listed in `OC_WEB_APPS` - monorepo apps and standalone extensions alike.

Use `--all` to build every web-extensions app plus all standalone extensions except `maps` (build `maps` separately when configured).

For `external-sites` and `importer`, copy and customize the configuration first:

```bash
cp config/opencloud/apps.yaml.dist config/opencloud/apps.yaml
```
