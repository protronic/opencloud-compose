#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SUBMODULE_DIR="${ROOT_DIR}/web-extensions"
PNPM_IMAGE="${PNPM_IMAGE:-ghcr.io/pnpm/pnpm:11.9.0}"
NODE_VERSION="${NODE_VERSION:-24}"

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

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required to build web extensions in a pnpm container." >&2
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

build_commands=(
  "pnpm runtime set node ${NODE_VERSION} -g"
  "pnpm install --frozen-lockfile"
)
for app in "${APPS[@]}"; do
  build_commands+=("pnpm --filter ${app} build")
done

build_script="${build_commands[0]}"
for ((i = 1; i < ${#build_commands[@]}; i++)); do
  build_script+=" && ${build_commands[i]}"
done

echo "Building extensions in ${PNPM_IMAGE} container..."
docker run --rm \
  -u "$(id -u):$(id -g)" \
  -e HOME=/tmp \
  -v "${SUBMODULE_DIR}:/work" \
  -w /work \
  "${PNPM_IMAGE}" \
  bash -c "${build_script}"

mkdir -p "${APPS_DIR}"

for app in "${APPS[@]}"; do
  app_name="${app#web-app-}"
  dist_dir="${SUBMODULE_DIR}/packages/${app}/dist"

  echo "Deploying ${app_name} to ${APPS_DIR}/${app_name}..."
  rm -rf "${APPS_DIR:?}/${app_name}"
  ln -sfn "${dist_dir}" "${APPS_DIR}/${app_name}"
done

echo "Done. Built extensions are available under ${APPS_DIR} (OC_APPS_DIR)."
