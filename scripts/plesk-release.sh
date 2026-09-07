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

if command -v plesk >/dev/null 2>&1; then
  plesk bin nodejs --restart "$plesk_domain"
elif [ -x /usr/local/psa/bin/nodejs ]; then
  /usr/local/psa/bin/nodejs --restart "$plesk_domain"
else
  printf 'Plesk nodejs CLI was not found; the application was not restarted.\n' >&2
  exit 1
fi
