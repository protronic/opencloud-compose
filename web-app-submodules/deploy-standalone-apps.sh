#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SUBMODULES_DIR="${ROOT_DIR}/web-app-submodules"

if [[ -f "${ROOT_DIR}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${ROOT_DIR}/.env"
  set +a
fi

APPS_DIR="${OC_APPS_DIR:-${ROOT_DIR}/config/opencloud/apps}"
APPS_DIR="${APPS_DIR/#\~/$HOME}"

declare -A STANDALONE_APPS=(
  [comments]="web-app-comments"
  [3dviewer]="opencloud-3dviewer"
  [web-calendar]="opencloud-web-calendar"
)

usage() {
  cat <<EOF
Build and deploy standalone OpenCloud 7 web apps (Module Federation).

Usage:
  $(basename "$0") [app...]
  $(basename "$0") all

Apps: comments, 3dviewer, web-calendar, all

Local deploy target:
  OC_APPS_DIR=${APPS_DIR}

Optional remote deploy (rsync over SSH):
  OC_DEPLOY_HOST=user@oc.protronic-gmbh.de
  OC_DEPLOY_APPS_DIR=/path/on/server/to/opencloud/apps

Examples:
  $(basename "$0") 3dviewer web-calendar
  OC_DEPLOY_HOST=admin@10.19.28.1 OC_DEPLOY_APPS_DIR=/opt/opencloud-compose/config/opencloud/apps \\
    $(basename "$0") 3dviewer web-calendar
EOF
}

verify_manifest() {
  local app_name="$1"
  local manifest="${APPS_DIR}/${app_name}/manifest.json"

  if [[ ! -f "${manifest}" ]]; then
    echo "Missing manifest after deploy: ${manifest}" >&2
    exit 1
  fi

  if grep -q 'remoteEntry.*\.mjs' "${manifest}"; then
    echo "  manifest OK: $(tr -d '\n' < "${manifest}")"
    return
  fi

  echo "Legacy manifest for ${app_name} (OpenCloud 7 needs remoteEntry*.mjs):" >&2
  cat "${manifest}" >&2
  exit 1
}

build_app() {
  local app_name="$1"
  local submodule="${STANDALONE_APPS[${app_name}]}"
  local source_dir="${SUBMODULES_DIR}/${submodule}"

  echo "Building ${app_name} in ${source_dir}..."
  (
    cd "${source_dir}"
    pnpm install --frozen-lockfile
    pnpm build
  )

  local remote_entry
  remote_entry="$(find "${source_dir}/dist" -name 'remoteEntry*.mjs' -print -quit)"
  if [[ -z "${remote_entry}" ]]; then
    echo "No remoteEntry*.mjs found for ${app_name}. Rebuild with extension-sdk 7.1.2." >&2
    exit 1
  fi

  if grep -q '__mf_module_cache__' "${remote_entry}"; then
    echo "Incompatible MF runtime in ${remote_entry}. Pin extension-sdk to 7.1.2." >&2
    exit 1
  fi

  echo "Deploying ${app_name} -> ${APPS_DIR}/${app_name}/"
  mkdir -p "${APPS_DIR}/${app_name}"
  rsync -a --delete "${source_dir}/dist/" "${APPS_DIR}/${app_name}/"
  verify_manifest "${app_name}"
}

deploy_remote() {
  local app_name="$1"
  echo "Remote sync ${app_name} -> ${OC_DEPLOY_HOST}:${OC_DEPLOY_APPS_DIR}/${app_name}/"
  rsync -az --delete "${APPS_DIR}/${app_name}/" "${OC_DEPLOY_HOST}:${OC_DEPLOY_APPS_DIR}/${app_name}/"
}

selected_apps=()
if [[ "$#" -eq 0 ]]; then
  usage
  exit 1
fi

for arg in "$@"; do
  case "${arg}" in
    all)
      selected_apps=(comments 3dviewer web-calendar)
      ;;
    comments|3dviewer|web-calendar)
      selected_apps+=("${arg}")
      ;;
    -h|--help|help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown app: ${arg}" >&2
      usage
      exit 1
      ;;
  esac
done

for app_name in "${selected_apps[@]}"; do
  build_app "${app_name}"
  if [[ -n "${OC_DEPLOY_HOST:-}" && -n "${OC_DEPLOY_APPS_DIR:-}" ]]; then
    deploy_remote "${app_name}"
  fi
done

echo
echo "Done. Local apps are in ${APPS_DIR}"
if [[ -n "${OC_DEPLOY_HOST:-}" && -n "${OC_DEPLOY_APPS_DIR:-}" ]]; then
  echo "Remote apps synced to ${OC_DEPLOY_HOST}:${OC_DEPLOY_APPS_DIR}"
  echo "Restart OpenCloud on the server if apps are bind-mounted."
else
  echo "Production still unchanged until you rsync OC_APPS_DIR to the server or set OC_DEPLOY_HOST + OC_DEPLOY_APPS_DIR."
fi
