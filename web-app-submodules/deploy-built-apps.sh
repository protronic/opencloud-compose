#!/usr/bin/env bash
set -euo pipefail

# Deploys already built web extensions to a server over ssh/scp.
#
# The target's .env decides what gets deployed: OC_WEB_APPS is the app list,
# OC_APPS_DIR (default config/opencloud/apps below the compose checkout) the
# destination. The apps are taken from the local OC_APPS_DIR, i.e. the
# output of build-web-extensions.sh - nothing is built here.
#
# External apps are built elsewhere (e.g. by a Forgejo runner) and come as a
# directory, an archive or an archive URL: OC_EXTERNAL_WEB_APPS in the
# target's .env (name=source,...) or --external name=source.
#
# OC_WEB_APPS may also list apps of other pipelines (e.g. rz25-webapp, deployed by
# its own runner): names build-web-extensions.sh does not know are skipped here.

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
  1. read REMOTE_DIR/.env on the server: OC_WEB_APPS (what), OC_EXTERNAL_WEB_APPS
     (prebuilt apps) and OC_APPS_DIR (where)
  2. map the OC_WEB_APPS entries to deploy names (build-web-extensions.sh --resolve)
  3. check that every app is built locally in the source directory; fetch and
     unpack the external apps into a local temp folder
  4. scp each app into a staging folder on the server and swap it into OC_APPS_DIR
  5. verify manifest.json on the server; optionally restart OpenCloud

Options:
  -s, --source DIR   local directory with the built apps
                     (default: OC_APPS_DIR from the local .env, ${SOURCE_DIR})
  -a, --apps LIST    deploy this comma-separated list instead of the server's OC_WEB_APPS
                     (+ all OC_EXTERNAL_WEB_APPS); may name external apps as well
  -x, --external NAME=SOURCE
                     deploy the prebuilt app NAME from SOURCE (repeatable); overrides
                     an OC_EXTERNAL_WEB_APPS entry of the same name. SOURCE is a local
                     directory, a .zip / .tar.gz / .tar archive or an http(s) URL of
                     such an archive. manifest.json has to be at the top level or
                     inside a single top-level folder.
  -l, --list         only print the apps of this repository the server wants (deploy
                     names from OC_WEB_APPS, one per line) and exit - what CI has to build
  -w, --list-wanted  only print every app name the server wants (OC_WEB_APPS and
                     OC_EXTERNAL_WEB_APPS as written, one per line) and exit - lets
                     another pipeline check whether its app is wanted
  -n, --dry-run      show what would be deployed, upload nothing
  -r, --restart      run "docker compose restart opencloud" in REMOTE_DIR afterwards
                     (override the command with OC_DEPLOY_RESTART_CMD)
  -h, --help         show this help

Environment:
  OC_SSH_OPTS        extra options for ssh (e.g. "-i ~/.ssh/deploy_key -p 2222")
  OC_SCP_OPTS        extra options for scp (e.g. "-i ~/.ssh/deploy_key -P 2222")
                     Prefer a Host entry in ~/.ssh/config so both stay empty.
  OC_EXTERNAL_TOKEN  token sent as "Authorization: token ..." when downloading
                     external apps (e.g. Forgejo token with read:package)
  OC_EXTERNAL_CURL_OPTS
                     extra options for curl (e.g. "--netrc")

Examples:
  $(basename "$0") admin@oc.example.com
  $(basename "$0") -n admin@oc.example.com /srv/opencloud-compose
  $(basename "$0") --apps emlviewer,calculator --restart admin@oc.example.com
  $(basename "$0") --apps my-app \\
    --external my-app=https://forgejo.example.com/api/packages/<owner>/generic/my-app/1.0.0/my-app-1.0.0.tar.gz \\
    admin@oc.example.com
USAGE
}

die() {
  echo "$*" >&2
  exit 1
}

HOST=""
REMOTE_DIR=""
APPS_OVERRIDE=""
EXTERNAL_ARGS=()
DRY_RUN=false
LIST_ONLY=false
LIST_WANTED=false
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
    -x | --external)
      [[ $# -ge 2 ]] || die "--external needs NAME=SOURCE"
      EXTERNAL_ARGS+=("$2")
      shift 2
      ;;
    -l | --list)
      LIST_ONLY=true
      shift
      ;;
    -w | --list-wanted)
      LIST_WANTED=true
      shift
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
# shellcheck disable=SC2206
CURL_OPTS=(${OC_EXTERNAL_CURL_OPTS:-})
if [[ -n "${OC_EXTERNAL_TOKEN:-}" ]]; then
  CURL_OPTS+=(-H "Authorization: token ${OC_EXTERNAL_TOKEN}")
fi

STAGE_DIR=""
cleanup() {
  [[ -n "${STAGE_DIR}" && -d "${STAGE_DIR}" ]] && rm -rf "${STAGE_DIR}"
  return 0
}
trap cleanup EXIT

remote_sh() {
  ssh "${SSH_OPTS[@]}" "${HOST}" "$@"
}

# Single-quotes a path for use in a remote shell command.
rq() {
  printf '%q' "$1"
}

# --- 1. read the server's .env ------------------------------------------------

echo "Reading ${HOST}:${REMOTE_DIR}/.env ..." >&2
remote_env="$(remote_sh "cat $(rq "${REMOTE_DIR}/.env")")" \
  || die "Could not read ${REMOTE_DIR}/.env on ${HOST}"

env_value() {
  local key="$1"
  printf '%s\n' "${remote_env}" \
    | { grep -E "^[[:space:]]*(export[[:space:]]+)?${key}=" || true; } \
    | tail -n 1 \
    | sed -E "s/^[[:space:]]*(export[[:space:]]+)?${key}=//; s/^\"(.*)\"[[:space:]]*$/\1/; s/^'(.*)'[[:space:]]*$/\1/; s/[[:space:]]+$//"
}

trim() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  printf '%s' "${value%"${value##*[![:space:]]}"}"
}

# External apps: server's OC_EXTERNAL_WEB_APPS first, --external overrides by name.
declare -A EXTERNAL_SOURCES=()
EXTERNAL_NAMES=()

# add_external SPEC [server]: NAME=SOURCE; from the server's .env also just NAME
# (wanted, but provided by another pipeline: empty source, skipped here).
add_external() {
  local spec name source
  spec="$(trim "$1")"
  [[ -n "${spec}" ]] || return 0
  if [[ "${spec}" == *=* ]]; then
    name="$(trim "${spec%%=*}")"
    source="$(trim "${spec#*=}")"
    [[ -n "${source}" ]] || die "External app ${name} has no source"
  elif [[ "${2:-}" == server ]]; then
    name="${spec}"
    source=""
  else
    die "External app needs NAME=SOURCE: ${spec}"
  fi
  [[ "${name}" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]] || die "Invalid external app name: ${name}"
  [[ -v "EXTERNAL_SOURCES[${name}]" ]] || EXTERNAL_NAMES+=("${name}")
  EXTERNAL_SOURCES["${name}"]="${source}"
}

IFS=',' read -r -a server_external_specs <<<"$(env_value OC_EXTERNAL_WEB_APPS)"
for spec in "${server_external_specs[@]}"; do
  add_external "${spec}" server
done

if [[ "${LIST_WANTED}" == true ]]; then
  wanted="$(env_value OC_WEB_APPS)"
  # shellcheck disable=SC2086
  for app in ${wanted//,/ } "${EXTERNAL_NAMES[@]}"; do
    [[ -z "${app}" ]] || printf '%s\n' "${app}"
  done | awk '!seen[$0]++'
  exit 0
fi

for spec in "${EXTERNAL_ARGS[@]}"; do
  add_external "${spec}"
done

is_external() {
  [[ -v "EXTERNAL_SOURCES[$1]" ]]
}

if [[ -n "${APPS_OVERRIDE}" ]]; then
  app_list="${APPS_OVERRIDE}"
  all_externals=false
else
  app_list="$(env_value OC_WEB_APPS)"
  all_externals=true
fi
if [[ -z "${app_list}" && ( "${all_externals}" == false || ${#EXTERNAL_NAMES[@]} -eq 0 ) ]]; then
  die "OC_WEB_APPS and OC_EXTERNAL_WEB_APPS are empty in ${HOST}:${REMOTE_DIR}/.env (or pass --apps / --external)."
fi

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

EXTERNAL_APPS=()
add_external_app() {
  [[ " ${EXTERNAL_APPS[*]:-} " == *" $1 "* ]] || EXTERNAL_APPS+=("$1")
}

build_names=()
for app in ${app_list//,/ }; do
  if is_external "${app}"; then
    add_external_app "${app}"
  else
    build_names+=("${app}")
  fi
done
if [[ "${all_externals}" == true ]]; then
  for app in "${EXTERNAL_NAMES[@]}"; do
    add_external_app "${app}"
  done
fi

# Names from the server's OC_WEB_APPS that this repository cannot build belong to other
# pipelines (e.g. rz25-webapp). With --apps every name has to be known.
OTHER_APPS=()
known_names=()
for app in "${build_names[@]}"; do
  if [[ "${all_externals}" == false ]] || "${BUILD_SCRIPT}" --resolve "${app}" >/dev/null 2>&1; then
    known_names+=("${app}")
  else
    OTHER_APPS+=("${app}")
  fi
done

DEPLOY_APPS=()
if [[ ${#known_names[@]} -gt 0 ]]; then
  resolved="$("${BUILD_SCRIPT}" --resolve "${known_names[@]}")" \
    || die "Could not map the app list to deploy names: ${known_names[*]}"
  mapfile -t resolved_apps <<<"${resolved}"
  for app in "${resolved_apps[@]}"; do
    [[ -n "${app}" ]] || continue
    # An alias can resolve to the name of an external app - the external one wins.
    if is_external "${app}"; then
      add_external_app "${app}"
    else
      DEPLOY_APPS+=("${app}")
    fi
  done
fi

# External apps without source are provided by another pipeline as well.
with_source=()
for app in "${EXTERNAL_APPS[@]}"; do
  if [[ -n "${EXTERNAL_SOURCES[${app}]}" ]]; then
    with_source+=("${app}")
  else
    OTHER_APPS+=("${app}")
  fi
done
EXTERNAL_APPS=("${with_source[@]}")

if [[ ${#DEPLOY_APPS[@]} -eq 0 && ${#EXTERNAL_APPS[@]} -eq 0 ]]; then
  if [[ ${#OTHER_APPS[@]} -gt 0 ]]; then
    [[ "${LIST_ONLY}" == true ]] || echo "Nothing to deploy here - ${OTHER_APPS[*]}: provided by other pipelines."
    exit 0
  fi
  die "No apps resolved from: ${app_list}"
fi

# For CI: build exactly what this server wants (build-web-extensions.sh $(... --list)).
if [[ "${LIST_ONLY}" == true ]]; then
  [[ ${#DEPLOY_APPS[@]} -eq 0 ]] || printf '%s\n' "${DEPLOY_APPS[@]}"
  exit 0
fi

# --- 3. check the local build output, fetch external apps -----------------------

# Prints the entrypoint from manifest.json when it is set but missing.
missing_entrypoint() {
  local app_dir="$1" entry
  entry="$(sed -n 's/.*"entrypoint"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "${app_dir}/manifest.json" | head -n 1)"
  if [[ -n "${entry}" && ! -f "${app_dir}/${entry}" ]]; then
    printf '%s' "${entry}"
  fi
}

if [[ ${#DEPLOY_APPS[@]} -gt 0 ]]; then
  [[ -d "${SOURCE_DIR}" ]] || die "Source directory not found: ${SOURCE_DIR} (run build-web-extensions.sh first or pass --source)"
fi

missing=()
for app in "${DEPLOY_APPS[@]}"; do
  app_dir="${SOURCE_DIR}/${app}"
  if [[ ! -f "${app_dir}/manifest.json" ]]; then
    missing+=("${app}")
    continue
  fi
  entry="$(missing_entrypoint "${app_dir}")"
  if [[ -n "${entry}" ]]; then
    echo "Entrypoint ${entry} missing in ${app_dir} - incomplete build?" >&2
    missing+=("${app}")
  fi
done
if [[ ${#missing[@]} -gt 0 ]]; then
  echo "Not built locally in ${SOURCE_DIR}: ${missing[*]}" >&2
  die "Build them first: ./web-app-submodules/build-web-extensions.sh ${missing[*]}"
fi

extract_archive() {
  local file="$1" dest="$2" magic
  mkdir -p "${dest}"
  magic="$(head -c 4 "${file}" | od -An -tx1 | tr -d ' \n')"
  case "${magic}" in
    504b0304*)
      command -v unzip >/dev/null 2>&1 || die "unzip is required to unpack ${file}"
      unzip -q "${file}" -d "${dest}"
      ;;
    1f8b*)
      tar -xzf "${file}" -C "${dest}"
      ;;
    *)
      tar -xf "${file}" -C "${dest}" 2>/dev/null \
        || die "Unsupported archive (zip, tar.gz or tar expected): ${file}"
      ;;
  esac
}

# manifest.json at the top level or inside a single top-level folder.
find_app_root() {
  local dir="$1" entries
  if [[ -f "${dir}/manifest.json" ]]; then
    printf '%s' "${dir}"
    return 0
  fi
  mapfile -t entries < <(find "${dir}" -mindepth 1 -maxdepth 1)
  if [[ ${#entries[@]} -eq 1 && -f "${entries[0]}/manifest.json" ]]; then
    printf '%s' "${entries[0]}"
    return 0
  fi
  return 1
}

declare -A EXTERNAL_DIRS=()
prepare_external() {
  local app="$1" source="${EXTERNAL_SOURCES[$1]}" unpack root entry incompatible

  unpack="${STAGE_DIR}/${app}"
  case "${source}" in
    http://* | https://*)
      echo "Downloading ${app}: ${source}"
      curl -fsSL "${CURL_OPTS[@]}" -o "${unpack}.download" "${source}" \
        || die "Download of ${app} failed: ${source}"
      extract_archive "${unpack}.download" "${unpack}"
      ;;
    *)
      source="${source/#\~/$HOME}"
      if [[ -d "${source}" ]]; then
        unpack="${source}"
      elif [[ -f "${source}" ]]; then
        extract_archive "${source}" "${unpack}"
      else
        die "Source of external app ${app} not found: ${source}"
      fi
      ;;
  esac

  root="$(find_app_root "${unpack}")" \
    || die "No manifest.json in ${source} (${app}) - expected at the top level or in a single folder"
  entry="$(missing_entrypoint "${root}")"
  [[ -z "${entry}" ]] || die "Entrypoint ${entry} missing in external app ${app} (${source})"
  # Same check as build-web-extensions.sh: Module Federation runtime 2.4.x breaks other apps.
  incompatible="$(find "${root}" -name 'remoteEntry*.mjs' -exec grep -l '__mf_module_cache__' {} + 2>/dev/null || true)"
  [[ -z "${incompatible}" ]] \
    || die "External app ${app} uses Module Federation runtime 2.4.x (${incompatible}) - rebuild it with extension-sdk 8.1.0."
  if [[ "${unpack}" != "${source}" ]]; then
    chmod -R u+rwX,go+rX "${unpack}"
  fi
  EXTERNAL_DIRS["${app}"]="${root}"
}

if [[ ${#EXTERNAL_APPS[@]} -gt 0 ]]; then
  STAGE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/oc-external-apps.XXXXXX")"
  for app in "${EXTERNAL_APPS[@]}"; do
    prepare_external "${app}"
  done
fi

ALL_APPS=("${DEPLOY_APPS[@]}" "${EXTERNAL_APPS[@]}")

app_source_dir() {
  if is_external "$1"; then
    printf '%s' "${EXTERNAL_DIRS[$1]}"
  else
    printf '%s' "${SOURCE_DIR}/$1"
  fi
}

echo
echo "Server:      ${HOST}"
echo "Compose dir: ${REMOTE_DIR}"
echo "Apps dir:    ${remote_apps_dir_display}"
echo "Source:      ${SOURCE_DIR}"
echo "Apps:        ${DEPLOY_APPS[*]:-(none)}"
for app in "${EXTERNAL_APPS[@]}"; do
  echo "External:    ${app} <- ${EXTERNAL_SOURCES[${app}]}"
done
for app in "${OTHER_APPS[@]}"; do
  echo "Other:       ${app} (not built here - provided by another pipeline)"
done
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

for app in "${ALL_APPS[@]}"; do
  echo "Uploading ${app} ..."
  scp -q -r "${SCP_OPTS[@]}" "$(app_source_dir "${app}")" "${HOST}:${incoming}/${app}"
  remote_sh "rm -rf $(rq "${remote_apps_dir}/${app}") && mv $(rq "${incoming}/${app}") $(rq "${remote_apps_dir}/${app}")"
done

remote_sh "rmdir $(rq "${incoming}") 2>/dev/null || true"

# --- 5. verify, restart ---------------------------------------------------------

failed=0
for app in "${ALL_APPS[@]}"; do
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
