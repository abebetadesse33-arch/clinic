#!/usr/bin/env bash
# ==============================================================================
# NiniMed - Plesk Git Extension Deployment Script (Zero-SSH 30s Deploy)
# ==============================================================================
# Add this command to:
# Plesk > Domains > [Your Domain] > Git > Additional deployment actions:
# bash scripts/plesk-git-deploy.sh
# ==============================================================================
set -Eeuo pipefail

echo "=== Starting Plesk Git deployment for NiniMed ==="

# Determine Node/Bun package manager
if command -v bun >/dev/null 2>&1; then
  echo "Using Bun to install and build..."
  bun install --frozen-lockfile
  bun run build
elif command -v npm >/dev/null 2>&1; then
  echo "Using npm to install and build..."
  npm install --production=false
  npm run build
elif [ -x /opt/plesk/node/20/bin/npm ]; then
  export PATH="/opt/plesk/node/20/bin:$PATH"
  npm install --production=false
  npm run build
else
  echo "Error: Neither bun nor npm was found on PATH." >&2
  exit 1
fi

# Signal Phusion Passenger (Plesk Node.js extension) to reload the application
mkdir -p tmp
touch tmp/restart.txt

echo "=== Deployment finished. Phusion Passenger reload triggered. ==="
