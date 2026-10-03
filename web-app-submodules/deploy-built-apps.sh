#!/usr/bin/env bash
set -euo pipefail

# Deploys already built web extensions to a server over ssh/scp.
#
# The target's .env decides what gets deployed: OC_WEB_APPS is the app list,
# OC_APPS_DIR (default config/opencloud/apps below the compose checkout) the
# destination. The apps are taken from the local OC_APPS_DIR, i.e. the
# output of build-web-extensions.sh - nothing is built here.

SUBMODULES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SUBMODULES_DIR}/.." && pwd)"
BUILD_SCRIPT="${SUBMODULES_DIR}/build-web-extensions.sh"

if [[ -f "${ROOT_DIR}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${ROOT_DIR}/.env"
  set +a
fi

SOURCE_DIR="${OC_APPS_DIR:-${ROOT_DIR}/config/opencloud/apps}"
SOURCE_DIR="${SOURCE_DIR/#\~/$HOME}"
REMOTE_DIR_DEFAULT="${OC_DEPLOY_DIR:-/opt/opencloud-compose}"
INCOMING_NAME=".incoming-web-apps"

usage() {
  cat <<USAGE
Usage: $(basename "$0") [OPTIONS] HOST [REMOTE_DIR]

Upload built web extensions to the OpenCloud server HOST (ssh target, e.g.
admin@oc.example.com). REMOTE_DIR is the opencloud-compose checkout on the
server that holds the .env (default: ${REMOTE_DIR_DEFAULT}, override with
OC_DEPLOY_DIR).

Steps:
  1. read REMOTE_DIR/.env on the server: OC_WEB_APPS (what) and OC_APPS_DIR (where)
  2. map the OC_WEB_APPS entries to deploy names (build-web-extensions.sh --resolve)
  3. check that every app is built locally in the source directory
  4. scp each app into a staging folder on the server and swap it into OC_APPS_DIR
  5. verify manifest.json on the server; optionally restart OpenCloud

Options:
  -s, --source DIR   local directory with the built apps
                     (default: OC_APPS_DIR from the local .env, ${SOURCE_DIR})
  -a, --apps LIST    deploy this comma-separated list instead of the server's OC_WEB_APPS
  -n, --dry-run      show what would be deployed, upload nothing
  -r, --restart      run "docker compose restart opencloud" in REMOTE_DIR afterwards
                     (override the command with OC_DEPLOY_RESTART_CMD)
  -h, --help         show this help

Environment:
  OC_SSH_OPTS        extra options for ssh (e.g. "-i ~/.ssh/deploy_key -p 2222")
  OC_SCP_OPTS        extra options for scp (e.g. "-i ~/.ssh/deploy_key -P 2222")
                     Prefer a Host entry in ~/.ssh/config so both stay empty.

Examples:
  $(basename "$0") admin@oc.example.com
  $(basename "$0") -n admin@oc.example.com /srv/opencloud-compose
  $(basename "$0") --apps emlviewer,calculator --restart admin@oc.example.com
USAGE
}

die() {
  echo "$*" >&2
  exit 1
}

HOST=""
REMOTE_DIR=""
APPS_OVERRIDE=""
DRY_RUN=false
RESTART=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h | --help)
      usage
      exit 0
      ;;
    -s | --source)
      [[ $# -ge 2 ]] || die "--source needs a directory"
      SOURCE_DIR="${2/#\~/$HOME}"
      shift 2
      ;;
    -a | --apps)
      [[ $# -ge 2 ]] || die "--apps needs a comma-separated list"
      APPS_OVERRIDE="$2"
      shift 2
      ;;
    -n | --dry-run)
      DRY_RUN=true
      shift
      ;;
    -r | --restart)
      RESTART=true
      shift
      ;;
    -*)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
    *)
      if [[ -z "${HOST}" ]]; then
        HOST="$1"
      elif [[ -z "${REMOTE_DIR}" ]]; then
        REMOTE_DIR="$1"
      else
        die "Unexpected argument: $1"
      fi
      shift
      ;;
  esac
done

[[ -n "${HOST}" ]] || {
  usage >&2
  exit 1
}
REMOTE_DIR="${REMOTE_DIR:-${REMOTE_DIR_DEFAULT}}"
[[ -x "${BUILD_SCRIPT}" ]] || die "Build script not found: ${BUILD_SCRIPT}"

# shellcheck disable=SC2206
SSH_OPTS=(${OC_SSH_OPTS:-})
# shellcheck disable=SC2206
SCP_OPTS=(${OC_SCP_OPTS:-})

remote_sh() {
  ssh "${SSH_OPTS[@]}" "${HOST}" "$@"
}

# Single-quotes a path for use in a remote shell command.
rq() {
  printf '%q' "$1"
}

# --- 1. read the server's .env ------------------------------------------------

echo "Reading ${HOST}:${REMOTE_DIR}/.env ..."
remote_env="$(remote_sh "cat $(rq "${REMOTE_DIR}/.env")")" \
  || die "Could not read ${REMOTE_DIR}/.env on ${HOST}"

env_value() {
  local key="$1"
  printf '%s\n' "${remote_env}" \
    | { grep -E "^[[:space:]]*(export[[:space:]]+)?${key}=" || true; } \
    | tail -n 1 \
    | sed -E "s/^[[:space:]]*(export[[:space:]]+)?${key}=//; s/^\"(.*)\"[[:space:]]*$/\1/; s/^'(.*)'[[:space:]]*$/\1/; s/[[:space:]]+$//"
}

app_list="${APPS_OVERRIDE:-$(env_value OC_WEB_APPS)}"
[[ -n "${app_list}" ]] || die "OC_WEB_APPS is empty in ${HOST}:${REMOTE_DIR}/.env (or pass --apps)."

remote_apps_value="$(env_value OC_APPS_DIR)"
case "${remote_apps_value}" in
  "") remote_apps_expr="${REMOTE_DIR}/config/opencloud/apps" ;;
  "~" | "~/"*) remote_apps_expr="\$HOME${remote_apps_value#\~}" ;;
  /*) remote_apps_expr="${remote_apps_value}" ;;
  *) remote_apps_expr="${REMOTE_DIR}/${remote_apps_value#./}" ;;
esac

# Resolve to an absolute path on the server so every later command can quote
# it. A missing directory is only created right before the upload.
remote_apps_dir="$(remote_sh "cd \"${remote_apps_expr}\" 2>/dev/null && pwd" || true)"
remote_apps_dir_display="${remote_apps_dir:-${remote_apps_expr} (does not exist yet)}"

# --- 2. map OC_WEB_APPS entries to deploy names --------------------------------

app_list="${app_list//,/ }"
# shellcheck disable=SC2086
resolved="$("${BUILD_SCRIPT}" --resolve ${app_list})" \
  || die "Could not map the app list to deploy names: ${app_list}"
mapfile -t DEPLOY_APPS <<<"${resolved}"
[[ ${#DEPLOY_APPS[@]} -gt 0 && -n "${DEPLOY_APPS[0]}" ]] || die "No apps resolved from: ${app_list}"

# --- 3. check the local build output -----------------------------------------

[[ -d "${SOURCE_DIR}" ]] || die "Source directory not found: ${SOURCE_DIR} (run build-web-extensions.sh first or pass --source)"

missing=()
for app in "${DEPLOY_APPS[@]}"; do
  app_dir="${SOURCE_DIR}/${app}"
  if [[ ! -f "${app_dir}/manifest.json" ]]; then
    missing+=("${app}")
    continue
  fi
  entry="$(sed -n 's/.*"entrypoint"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "${app_dir}/manifest.json" | head -n 1)"
  if [[ -n "${entry}" && ! -f "${app_dir}/${entry}" ]]; then
    echo "Entrypoint ${entry} missing in ${app_dir} - incomplete build?" >&2
    missing+=("${app}")
  fi
done
if [[ ${#missing[@]} -gt 0 ]]; then
  echo "Not built locally in ${SOURCE_DIR}: ${missing[*]}" >&2
  die "Build them first: ./web-app-submodules/build-web-extensions.sh ${missing[*]}"
fi

echo
echo "Server:      ${HOST}"
echo "Compose dir: ${REMOTE_DIR}"
echo "Apps dir:    ${remote_apps_dir_display}"
echo "Source:      ${SOURCE_DIR}"
echo "Apps:        ${DEPLOY_APPS[*]}"
echo

if [[ "${DRY_RUN}" == true ]]; then
  echo "Dry run - nothing uploaded."
  exit 0
fi

# --- 4. upload into a staging folder, then swap --------------------------------

if [[ -z "${remote_apps_dir}" ]]; then
  remote_apps_dir="$(remote_sh "mkdir -p \"${remote_apps_expr}\" && cd \"${remote_apps_expr}\" && pwd")" \
    || die "Could not create ${remote_apps_expr} on ${HOST}"
fi

incoming="${remote_apps_dir}/${INCOMING_NAME}"
remote_sh "rm -rf $(rq "${incoming}") && mkdir -p $(rq "${incoming}")"

for app in "${DEPLOY_APPS[@]}"; do
  echo "Uploading ${app} ..."
  scp -q -r "${SCP_OPTS[@]}" "${SOURCE_DIR}/${app}" "${HOST}:${incoming}/${app}"
  remote_sh "rm -rf $(rq "${remote_apps_dir}/${app}") && mv $(rq "${incoming}/${app}") $(rq "${remote_apps_dir}/${app}")"
done

remote_sh "rmdir $(rq "${incoming}") 2>/dev/null || true"

# --- 5. verify, restart ---------------------------------------------------------

failed=0
for app in "${DEPLOY_APPS[@]}"; do
  if remote_sh "test -f $(rq "${remote_apps_dir}/${app}/manifest.json")"; then
    echo "  OK   ${app}"
  else
    echo "  FAIL ${app}: manifest.json missing on the server" >&2
    failed=1
  fi
done
[[ "${failed}" -eq 0 ]] || exit 1

echo
if [[ "${RESTART}" == true ]]; then
  restart_cmd="${OC_DEPLOY_RESTART_CMD:-cd $(rq "${REMOTE_DIR}") && docker compose restart opencloud}"
  echo "Restarting OpenCloud: ${restart_cmd}"
  remote_sh "${restart_cmd}"
else
  echo "Done. Restart OpenCloud on the server to load the extensions:"
  echo "  ssh ${HOST} 'cd $(rq "${REMOTE_DIR}") && docker compose restart opencloud'"
  echo "(or rerun with --restart)"
fi
