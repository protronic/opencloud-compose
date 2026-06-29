# Scripts

## Web Extensions

Build OpenCloud Web extensions from the `web-extensions` submodule and deploy them for OpenCloud.

### How it works

```
web-extensions/packages/web-app-*/dist   →   OC_APPS_DIR/<app>/   →   OpenCloud container
        (build output)                         (deployment)              (/var/lib/opencloud/web/assets/apps)
```

- **Build output** stays in the submodule: `web-extensions/packages/web-app-<name>/dist`
- **`OC_APPS_DIR`** is the directory OpenCloud reads extensions from (default: `./config/opencloud/apps`)
- The build script symlinks each built app from `dist/` into `OC_APPS_DIR`
- `docker-compose.yml` bind-mounts `OC_APPS_DIR` into the container

`OC_APPS_DIR` should **not** point into the submodule. Keep it under this repo (e.g. `config/opencloud/apps`) or any other host path you mount into OpenCloud.

### Setup

```bash
git submodule update --init --recursive
```

Configure extensions in `.env`:

```
OC_WEB_APPS=maps,unzip,comments
```

Optional apps directory (default: `./config/opencloud/apps`):

```
OC_APPS_DIR=/your/local/opencloud/apps
```

### Build

```bash
./scripts/build-web-extensions.sh
```

The script reads `OC_WEB_APPS` from `.env`. App names can also be passed directly:

```bash
./scripts/build-web-extensions.sh maps unzip
```

After building, restart the OpenCloud container to load new extensions.

### Available extensions

`arcade`, `calculator`, `cast`, `comments`, `draw-io`, `external-sites`, `importer`, `json-viewer`, `maps`, `notes`, `pastebin`, `progress-bars`, `unzip`

For `external-sites` and `importer`, copy and customize the configuration first:

```bash
cp config/opencloud/apps.yaml.dist config/opencloud/apps.yaml
```
