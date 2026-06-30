#!/usr/bin/env bash
set -euo pipefail

SUBMODULES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SUBMODULES_DIR}/.." && pwd)"
WEB_EXTENSIONS_DIR="${SUBMODULES_DIR}/web-extensions"
PNPM_IMAGE="${PNPM_IMAGE:-ghcr.io/pnpm/pnpm:11.9.0}"
PRESENTATION_IMAGE="${PRESENTATION_IMAGE:-node:20-bookworm}"
NODE_VERSION="${NODE_VERSION:-24}"
PRESENTATION_VIEWER_APP="mdpresentation-viewer"

if [[ -f "${ROOT_DIR}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${ROOT_DIR}/.env"
  set +a
fi

APPS_DIR="${OC_APPS_DIR:-${ROOT_DIR}/config/opencloud/apps}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required to build web extensions in a pnpm container." >&2
  exit 1
fi

normalize_monorepo_app() {
  local app="$1"
  app="${app#web-app-}"
  echo "${app}"
}

monorepo_package_dir() {
  local app_name="$1"
  echo "${WEB_EXTENSIONS_DIR}/packages/web-app-${app_name}"
}

run_pnpm_build() {
  local source_dir="$1"
  local install_flags="${2:---frozen-lockfile}"

  docker run --rm \
    -u "$(id -u):$(id -g)" \
    -e HOME=/tmp \
    -v "${source_dir}:/work" \
    -w /work \
    "${PNPM_IMAGE}" \
    bash -c "pnpm runtime set node ${NODE_VERSION} -g && pnpm install ${install_flags} && pnpm build"
}

deploy_dist() {
  local deploy_name="$1"
  local dist_dir="$2"
  local target="${APPS_DIR}/${deploy_name}"

  if [[ ! -d "${dist_dir}" ]]; then
    echo "Build output not found: ${dist_dir}" >&2
    exit 1
  fi

  echo "Deploying ${deploy_name} to ${target}..."
  mkdir -p "${target}"
  cp -a "${dist_dir}/." "${target}/"
}

clean_apps_dir() {
  if [[ ! -d "${APPS_DIR}" ]]; then
    mkdir -p "${APPS_DIR}"
    return
  fi

  echo "Cleaning ${APPS_DIR}..."
  find "${APPS_DIR}" -mindepth 1 -maxdepth 1 ! -name '.gitkeep' -exec rm -rf {} +
  mkdir -p "${APPS_DIR}"
}

MONOREPO_APPS=()
if [[ "$#" -gt 0 ]]; then
  for app in "$@"; do
    MONOREPO_APPS+=("$(normalize_monorepo_app "${app}")")
  done
elif [[ -n "${OC_WEB_APPS:-}" ]]; then
  OC_WEB_APPS="${OC_WEB_APPS//,/ }"
  for app in ${OC_WEB_APPS}; do
    [[ -n "${app}" ]] || continue
    MONOREPO_APPS+=("$(normalize_monorepo_app "${app}")")
  done
fi

if [[ ${#MONOREPO_APPS[@]} -gt 0 ]]; then
  if [[ ! -d "${WEB_EXTENSIONS_DIR}/packages" ]]; then
    echo "web-extensions submodule not found. Run: git submodule update --init --recursive" >&2
    exit 1
  fi

  for app in "${MONOREPO_APPS[@]}"; do
    if [[ ! -d "$(monorepo_package_dir "${app}")" ]]; then
      echo "Unknown web-extensions app: ${app}" >&2
      exit 1
    fi
  done

  build_commands=(
    "pnpm runtime set node ${NODE_VERSION} -g"
    "pnpm install --frozen-lockfile"
  )
  for app in "${MONOREPO_APPS[@]}"; do
    build_commands+=("pnpm --filter ./packages/web-app-${app} build")
  done

  build_script="${build_commands[0]}"
  for ((i = 1; i < ${#build_commands[@]}; i++)); do
    build_script+=" && ${build_commands[i]}"
  done

  echo "Building web-extensions apps (${#MONOREPO_APPS[@]}) in ${PNPM_IMAGE} container..."
  docker run --rm \
    -u "$(id -u):$(id -g)" \
    -e HOME=/tmp \
    -v "${WEB_EXTENSIONS_DIR}:/work" \
    -w /work \
    "${PNPM_IMAGE}" \
    bash -c "${build_script}"
fi

STANDALONE_PNPM_SUBMODULES=(
  "comments|web-app-comments"
  "3dviewer|opencloud-3dviewer"
  "web-calendar|opencloud-web-calendar"
)

for entry in "${STANDALONE_PNPM_SUBMODULES[@]}"; do
  deploy_name="${entry%%|*}"
  relative_dir="${entry#*|}"
  source_dir="${SUBMODULES_DIR}/${relative_dir}"

  if [[ ! -d "${source_dir}" ]]; then
    echo "Standalone submodule not found: ${relative_dir}. Run: git submodule update --init --recursive" >&2
    exit 1
  fi

  echo "Building standalone extension ${deploy_name} in ${PNPM_IMAGE} container..."
  run_pnpm_build "${source_dir}"
done

PRESENTATION_VIEWER_DIR="${SUBMODULES_DIR}/web-app-presentation-viewer"
PRESENTATION_VIEWER_DIST=""
presentation_build_dir=""

cleanup_presentation_build_dir() {
  [[ -n "${presentation_build_dir}" && -d "${presentation_build_dir}" ]] || return 0
  docker run --rm -v "${presentation_build_dir}:/work" "${PNPM_IMAGE}" rm -rf /work >/dev/null 2>&1 || true
  rmdir "${presentation_build_dir}" 2>/dev/null || true
}

if [[ -d "${PRESENTATION_VIEWER_DIR}" ]]; then
  presentation_build_dir="$(mktemp -d "${TMPDIR:-/tmp}/presentation-viewer-build.XXXXXX")"
  trap cleanup_presentation_build_dir EXIT

  rsync -a --exclude=.git "${PRESENTATION_VIEWER_DIR}/" "${presentation_build_dir}/"

  echo "Building standalone extension ${PRESENTATION_VIEWER_APP} in ${PRESENTATION_IMAGE} container..."
  docker run --rm \
    -e HOME=/work \
    -v "${presentation_build_dir}:/work" \
    -w /work \
    "${PRESENTATION_IMAGE}" \
    bash -c "
      set -euo pipefail
      apt-get update -qq
      DEBIAN_FRONTEND=noninteractive apt-get install -y -qq git jq
      corepack enable
      corepack prepare pnpm@8.15.1 --activate
      jq -s '.[0] * .[1]' package-common.json package-opencloud.json \
        | jq '.devDependencies.vite = \"^8.0.0\" | .devDependencies.vitest = \"^4.0.0\"' \
        > package.json
      jq '.id = \"mdpresentation-viewer\"' public/manifest.json > public/manifest.json.tmp \
        && mv public/manifest.json.tmp public/manifest.json
      find . -type f \\( -name '*.ts' -o -name '*.vue' -o -name '*.prettierrc' \\) -not \\( -path './node_modules/*' -o -path './dist/*' \\) -print0 | xargs -0 sed -i 's/ownclouders/opencloud-eu/g'
      pnpm install
      pnpm build
    "

  PRESENTATION_VIEWER_DIST="${presentation_build_dir}/dist/${PRESENTATION_VIEWER_APP}"
else
  echo "Standalone submodule not found: web-app-presentation-viewer. Run: git submodule update --init --recursive" >&2
  exit 1
fi

clean_apps_dir

for app in "${MONOREPO_APPS[@]}"; do
  deploy_name="${app}"
  dist_dir="$(monorepo_package_dir "${app}")/dist"
  deploy_dist "${deploy_name}" "${dist_dir}"
done

for entry in "${STANDALONE_PNPM_SUBMODULES[@]}"; do
  deploy_name="${entry%%|*}"
  relative_dir="${entry#*|}"
  dist_dir="${SUBMODULES_DIR}/${relative_dir}/dist"
  deploy_dist "${deploy_name}" "${dist_dir}"
done

deploy_dist "${PRESENTATION_VIEWER_APP}" "${PRESENTATION_VIEWER_DIST}"

echo "Done. Built extensions are available under ${APPS_DIR} (OC_APPS_DIR)."
