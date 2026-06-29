#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SUBMODULE_DIR="${ROOT_DIR}/web-extensions"

if [[ -f "${ROOT_DIR}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${ROOT_DIR}/.env"
  set +a
fi

APPS_DIR="${OC_APPS_DIR:-${ROOT_DIR}/config/opencloud/apps}"

if [[ ! -d "${SUBMODULE_DIR}/packages" ]]; then
  echo "web-extensions submodule not found. Run: git submodule update --init --recursive" >&2
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is required to build web extensions from source." >&2
  exit 1
fi

normalize_app() {
  local app="$1"
  app="${app#web-app-}"
  echo "web-app-${app}"
}

APPS=()
if [[ "$#" -gt 0 ]]; then
  for app in "$@"; do
    APPS+=("$(normalize_app "${app}")")
  done
elif [[ -n "${OC_WEB_APPS:-}" ]]; then
  OC_WEB_APPS="${OC_WEB_APPS//,/ }"
  for app in ${OC_WEB_APPS}; do
    [[ -n "${app}" ]] || continue
    APPS+=("$(normalize_app "${app}")")
  done
else
  echo "No extensions configured. Set OC_WEB_APPS in .env or pass app names as arguments." >&2
  echo "Example: OC_WEB_APPS=maps,unzip,comments" >&2
  exit 1
fi

for app in "${APPS[@]}"; do
  if [[ ! -d "${SUBMODULE_DIR}/packages/${app}" ]]; then
    echo "Unknown extension: ${app#web-app-}" >&2
    exit 1
  fi
done

cd "${SUBMODULE_DIR}"
pnpm install --frozen-lockfile

mkdir -p "${APPS_DIR}"

for app in "${APPS[@]}"; do
  app_name="${app#web-app-}"
  dist_dir="${SUBMODULE_DIR}/packages/${app}/dist"

  echo "Building ${app}..."
  pnpm --filter "${app}" build

  echo "Deploying ${app_name} to ${APPS_DIR}/${app_name}..."
  rm -rf "${APPS_DIR:?}/${app_name}"
  ln -sfn "${dist_dir}" "${APPS_DIR}/${app_name}"
done

echo "Done. Built extensions are available under ${APPS_DIR} (OC_APPS_DIR)."
