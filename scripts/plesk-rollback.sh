#!/usr/bin/env bash
set -Eeuo pipefail

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
  printf 'Usage: %s <deploy-path> [release-id]\n' "$0" >&2
  exit 2
fi

deploy_path="$1"
requested_release="${2:-}"
releases_dir="${deploy_path}/releases"

[ -d "$releases_dir" ] || {
  printf 'Release directory was not found: %s\n' "$releases_dir" >&2
  exit 1
}

if [ -n "$requested_release" ]; then
  release_dir="${releases_dir}/${requested_release}"
else
  release_dir=$(find "$releases_dir" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | sed -n '2s/^[^ ]* //p')
fi

[ -d "${release_dir:-}" ] || {
  printf 'A rollback target was not found in %s\n' "$releases_dir" >&2
  exit 1
}

ln -sfn "$release_dir" "${deploy_path}/current"
ln -sfn "${deploy_path}/current/.next" "${deploy_path}/.next"
ln -sfn "${deploy_path}/current/public" "${deploy_path}/public"
cp -f "${release_dir}/server.js" "${deploy_path}/server.js"
cp -f "${release_dir}/server.js" "${deploy_path}/app.js"
mkdir -p "${deploy_path}/tmp" "${deploy_path}/current/tmp"
touch "${deploy_path}/tmp/restart.txt" "${deploy_path}/current/tmp/restart.txt"
printf 'Rolled back to %s and signaled Passenger restart.\n' "$(basename "$release_dir")"
