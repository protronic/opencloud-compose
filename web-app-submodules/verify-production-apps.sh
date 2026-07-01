#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${OC_VERIFY_URL:-https://oc.protronic-gmbh.de}"
APPS=(comments 3dviewer web-calendar)

echo "Checking Module Federation manifests at ${BASE_URL}"
echo

failed=0

for app in "${APPS[@]}"; do
  url="${BASE_URL}/assets/apps/${app}/manifest.json"
  body="$(curl -sk "${url}" 2>/dev/null || true)"

  if [[ -z "${body}" ]]; then
    echo "[FAIL] ${app}: no response from ${url}"
    failed=1
    continue
  fi

  if grep -q 'remoteEntry.*\.mjs' <<<"${body}"; then
    entry="$(tr -d ' \n' <<<"${body}" | sed -n 's/.*"entrypoint":"\([^"]*\)".*/\1/p')"
    echo "[ OK ] ${app}: ${entry}"
    continue
  fi

  entry="$(tr -d ' \n' <<<"${body}" | sed -n 's/.*"entrypoint":"\([^"]*\)".*/\1/p')"
  echo "[FAIL] ${app}: legacy entrypoint ${entry:-unknown}"
  echo "       ${url}"
  failed=1
done

echo
if [[ "${failed}" -eq 0 ]]; then
  echo "All checked apps use Module Federation remoteEntry builds."
  exit 0
fi

echo "Deploy on the OpenCloud server, then restart the container:"
echo "  git pull"
echo "  ./web-app-submodules/deploy-standalone-apps.sh 3dviewer web-calendar comments"
echo "  docker compose restart opencloud"
exit 1
