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

# Auto-source .env file if present in app root or parent directory
for env_file in .env .env.production ../.env; do
  if [ -f "$env_file" ]; then
    echo "Found environment file at $env_file, exporting variables..."
    while IFS= read -r line || [ -n "$line" ]; do
      line="$(echo "$line" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
      if [ -n "$line" ] && [[ ! "$line" =~ ^# ]] && [[ "$line" =~ = ]]; then
        key="${line%%=*}"
        val="${line#*=}"
        # Strip single or double quotes
        val="${val#\"}"
        val="${val%\"}"
        val="${val#\'}"
        val="${val%\'}"
        if [ -z "${!key:-}" ]; then
          export "$key"="$val"
        fi
      fi
    done < "$env_file"
    break
  fi
done

export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=2048}"

# Stamp this build with the commit it was actually built from, so
# /api/health can prove (or disprove) that this deploy took effect.
export NEXT_PUBLIC_BUILD_SHA="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
echo "Building commit: ${NEXT_PUBLIC_BUILD_SHA}"

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
  cp -Rf .next/static .next/standalone/.next/static 2>/dev/null || true
  cp -Rf public .next/standalone/public 2>/dev/null || true

  # Passenger starts from the Plesk application root. Keep Next's generated
  # server in its own module context and package the prelude beside the wrapper.
  cp -f scripts/server-prelude.js plesk-prelude.js
  cat > server.js <<'NODE_ENTRYPOINT'
require('./plesk-prelude.js');
try {
  require('./.next/standalone/server.js');
} catch (error) {
  const fs = require('fs');
  const message = `[${new Date().toISOString()}] Synchronous startup failure:\n${error?.stack || error}\n\n`;
  try { fs.appendFileSync('./passenger-startup-error.log', message); } catch (_) {}
  console.error(message);
  throw error;
}
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
    NINIMED_STRICT_DB=true bun run db:migrate || echo "⚠️  Database migration exited with warning (continuing deployment)..."
  else
    NINIMED_STRICT_DB=true npx tsx scripts/db-migrate.ts || echo "⚠️  Database migration exited with warning (continuing deployment)..."
  fi
else
  echo "⚠️  DATABASE_URL not found in git hook shell environment."
  echo "    Skipping local migration step (migrations are applied automatically during CI or by the application on boot)."
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
mkdir -p tmp .next/standalone/tmp
touch tmp/restart.txt
touch .next/standalone/tmp/restart.txt 2>/dev/null || true
chmod -R a+rX public .next/static tmp 2>/dev/null || true

echo "=== Plesk live deployment completed successfully! ==="
