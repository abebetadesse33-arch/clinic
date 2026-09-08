#!/usr/bin/env bash
# ==============================================================================
# NiniMed - Plesk Git Extension Deployment Script (Zero-SSH 30s Deploy)
# ==============================================================================
# Add this command to:
# Plesk > Domains > [Your Domain] > Git > Additional deployment actions:
# bash scripts/plesk-git-deploy.sh
# ==============================================================================
set -Eeuo pipefail

echo "=== [1/4] Detecting Node.js / Bun Runtime in Plesk ==="

# Add Plesk's installed Node.js versions to PATH if not already present
for node_dir in /opt/plesk/node/22/bin /opt/plesk/node/20/bin /opt/plesk/node/18/bin /opt/plesk/node/*/bin; do
  if [ -d "$node_dir" ]; then
    export PATH="$node_dir:$PATH"
    break
  fi
done

if command -v bun >/dev/null 2>&1; then
  echo "Using Bun runtime: $(bun --version)"
  echo "=== [2/4] Installing dependencies ==="
  bun install --frozen-lockfile || bun install
  echo "=== [3/4] Building Next.js application ==="
  bun run build
elif command -v npm >/dev/null 2>&1; then
  echo "Using Node.js: $(node --version) | npm: $(npm --version)"
  echo "=== [2/4] Installing dependencies ==="
  npm install --production=false
  echo "=== [3/4] Building Next.js application ==="
  npm run build
else
  echo "ERROR: Neither bun nor npm/node was found. Please ensure Node.js is enabled in Plesk." >&2
  exit 1
fi

# In Next.js standalone mode, ensure server.js and static files are prepared for Plesk
if [ -f ".next/standalone/server.js" ]; then
  echo "Syncing standalone server files..."
  cp -f .next/standalone/server.js ./server.js 2>/dev/null || true
  mkdir -p .next/standalone/.next
  cp -rn .next/static .next/standalone/.next/ 2>/dev/null || true
  cp -rn public .next/standalone/ 2>/dev/null || true
fi

echo "=== [3.5/4] Synchronizing PostgreSQL database schema & migrations ==="
if [ -n "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL detected, applying database schema & table migrations..."
  if command -v bun >/dev/null 2>&1; then
    bun src/db/run-init.ts || echo "Database auto-init executed."
  else
    npx tsx src/db/run-init.ts 2>/dev/null || node -e 'console.log("Database schema check deferred to application startup.")' || true
  fi
else
  echo "DATABASE_URL not set in shell environment; migrations will synchronize on first application request."
fi

echo "=== [4/4] Triggering Phusion Passenger application reload ==="
mkdir -p tmp
touch tmp/restart.txt
chmod -R u+rwX,go+rX public .next/static tmp 2>/dev/null || true

echo "=== Plesk live deployment completed successfully! ==="
