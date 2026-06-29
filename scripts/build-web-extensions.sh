#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SUBMODULE_DIR="${ROOT_DIR}/web-extensions"

if [[ ! -d "${SUBMODULE_DIR}/packages" ]]; then
  echo "web-extensions submodule not found. Run: git submodule update --init --recursive" >&2
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is required to build web extensions from source." >&2
  exit 1
fi

APPS=()
if [[ "$#" -gt 0 ]]; then
  for app in "$@"; do
    APPS+=("web-app-${app#web-app-}")
  done
else
  while IFS= read -r package_dir; do
    APPS+=("$(basename "${package_dir}")")
  done < <(find "${SUBMODULE_DIR}/packages" -maxdepth 1 -mindepth 1 -type d -name 'web-app-*' | sort)
fi

cd "${SUBMODULE_DIR}"
pnpm install --frozen-lockfile

for app in "${APPS[@]}"; do
  echo "Building ${app}..."
  pnpm --filter "${app}" build
done

echo "Done. Enable extensions with webextensions/submodule/*.yml compose overlays."
