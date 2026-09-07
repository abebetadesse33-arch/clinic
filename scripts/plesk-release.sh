#!/usr/bin/env bash
set -Eeuo pipefail

if [ "$#" -ne 3 ]; then
  printf 'Usage: %s <package-dir> <deploy-path> <domain>\n' "$0" >&2
  exit 2
fi

package_dir="$1"
deploy_path="$2"
plesk_domain="$3"
release_id="$(basename "$package_dir")"
package_path="${package_dir}/deploy.tar.gz"
release_dir="${deploy_path}/releases/${release_id}"

trap 'rm -rf -- "$package_dir"' EXIT

[ -f "$package_path" ] || {
  printf 'Deployment package was not found: %s\n' "$package_path" >&2
  exit 1
}

mkdir -p "${deploy_path}/releases" "$release_dir"
tar -xzf "$package_path" -C "$release_dir"
test -f "${release_dir}/server.js"
node --check "${release_dir}/server.js"

ln -sfn "$release_dir" "${deploy_path}/current"
rm -rf "${deploy_path}/.next" "${deploy_path}/public" "${deploy_path}/node_modules"
ln -sfn "${deploy_path}/current/.next" "${deploy_path}/.next"
ln -sfn "${deploy_path}/current/public" "${deploy_path}/public"
ln -sfn "${deploy_path}/current/node_modules" "${deploy_path}/node_modules"

find "${deploy_path}/releases" -mindepth 1 -maxdepth 1 -type d ! -name "$release_id" -exec rm -rf {} +

# Phusion Passenger (Plesk Node.js engine) restarts when tmp/restart.txt is updated.
# This works reliably for non-root subscription users without requiring PSA CLI sudo rights.
mkdir -p "${deploy_path}/tmp" "${deploy_path}/current/tmp"
touch "${deploy_path}/tmp/restart.txt" "${deploy_path}/current/tmp/restart.txt"
printf 'Touched tmp/restart.txt to signal Phusion Passenger restart.\n'

# If the Plesk CLI is available and the user has permissions, also issue a CLI restart
if command -v plesk >/dev/null 2>&1; then
  plesk bin nodejs --restart "$plesk_domain" 2>/dev/null || true
elif [ -x /usr/local/psa/bin/nodejs ]; then
  /usr/local/psa/bin/nodejs --restart "$plesk_domain" 2>/dev/null || true
fi

printf 'Plesk deployment successfully activated for %s.\n' "$plesk_domain"
