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
  mkdir -p .next/standalone/.next
  cp -rn .next/static .next/standalone/.next/ 2>/dev/null || true
  cp -rn public .next/standalone/ 2>/dev/null || true

  # Passenger starts from the Plesk application root. Keep the standalone
  # runtime in its own directory and use a stable wrapper as the startup file.
  cat > server.js <<'NODE_ENTRYPOINT'
require('./scripts/server-prelude.js');
require('./.next/standalone/server.js');
NODE_ENTRYPOINT
  cp -f server.js app.js
else
  echo "ERROR: Next.js standalone server was not generated at .next/standalone/server.js." >&2
  exit 1
fi

echo "=== [3.5/4] Synchronizing PostgreSQL database schema & migrations ==="
if [ -n "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL detected, applying database schema & table migrations..."
  if command -v bun >/dev/null 2>&1; then
    NINIMED_STRICT_DB=true bun run db:migrate
  else
    NINIMED_STRICT_DB=true npx tsx scripts/db-migrate.ts
  fi
else
  echo "ERROR: DATABASE_URL is required for deployment migrations." >&2
  exit 1
fi

if [ "${ALLOW_PRODUCTION_SEED:-false}" = "true" ]; then
  echo "Explicit production seed requested."
  if command -v bun >/dev/null 2>&1; then
    NODE_ENV=production ALLOW_PRODUCTION_SEED=true bun run db:seed
  else
    NODE_ENV=production ALLOW_PRODUCTION_SEED=true npx tsx scripts/db-seed.ts
  fi
fi

echo "=== [4/4] Triggering Phusion Passenger application reload ==="
mkdir -p tmp
touch tmp/restart.txt
chmod -R u+rwX,go+rX public .next/static tmp 2>/dev/null || true

echo "=== Plesk live deployment completed successfully! ==="
