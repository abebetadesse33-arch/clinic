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

# Plesk's Git "Additional deployment actions" run in a bare shell that does
# NOT inherit the PATH Passenger sets up for the actual application process,
# so bun/node/npm are typically missing here even though the app runs fine.
# Try common Plesk-bundled locations first (both major-version and
# full-version directory naming, since Plesk uses either depending on
# version), then fall back to a filesystem search rather than guessing.
if ! command -v bun >/dev/null 2>&1 && ! command -v node >/dev/null 2>&1; then
  for node_dir in /opt/plesk/node/*/bin /opt/alt/node*/bin /opt/nodejs/*/bin ~/.nvm/versions/node/*/bin; do
    if [ -x "$node_dir/node" ]; then
      export PATH="$node_dir:$PATH"
      break
    fi
  done
fi

if ! command -v bun >/dev/null 2>&1 && ! command -v node >/dev/null 2>&1; then
  echo "Common Node.js paths not found; searching the filesystem (one-time cost)..."
  FOUND_NODE_BIN="$(find /opt /usr/local /var/www/vhosts/system -maxdepth 6 -type f -name node -perm -u+x 2>/dev/null | head -1)"
  if [ -n "$FOUND_NODE_BIN" ]; then
    echo "Found node at: $FOUND_NODE_BIN"
    export PATH="$(dirname "$FOUND_NODE_BIN"):$PATH"
  fi
fi

if ! command -v bun >/dev/null 2>&1 && ! command -v node >/dev/null 2>&1; then
  echo "Common bun paths not found; searching the filesystem (one-time cost)..."
  FOUND_BUN_BIN="$(find /opt /usr/local /root ~ -maxdepth 6 -type f -name bun -perm -u+x 2>/dev/null | head -1)"
  if [ -n "$FOUND_BUN_BIN" ]; then
    echo "Found bun at: $FOUND_BUN_BIN"
    export PATH="$(dirname "$FOUND_BUN_BIN"):$PATH"
  fi
fi

if ! command -v bun >/dev/null 2>&1 && ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Could not locate a node or bun executable anywhere searched." >&2
  echo "  Node.js panel reports a version is configured, but this deploy shell" >&2
  echo "  can't find its binary. Find the real path with, e.g.:" >&2
  echo "    find / -xdev -maxdepth 8 -type f -name node -perm -u+x 2>/dev/null" >&2
  echo "  (run over SSH, or via Plesk's Node.js panel if it exposes a shell)" >&2
  echo "  then add that directory to the node_dir list at the top of this script." >&2
  exit 1
fi

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

# Configure git safe.directory to prevent dubious ownership fatal errors
if command -v git >/dev/null 2>&1; then
  git config --global --add safe.directory "*" 2>/dev/null || true
  git config --global --add safe.directory "$(pwd)" 2>/dev/null || true
fi

# Clean up any stray Plesk auto-configure files that block Node.js startup
rm -f .plesk.startup.cjs 2>/dev/null || true

# Stamp this build with the commit it was actually built from, so
# /api/health can prove (or disprove) that this deploy took effect.
NEXT_PUBLIC_BUILD_SHA="$(git rev-parse HEAD 2>/dev/null || true)"
if [ -z "$NEXT_PUBLIC_BUILD_SHA" ] && [ -f .git/HEAD ]; then
  HEAD_CONTENT="$(cat .git/HEAD 2>/dev/null || true)"
  if [[ "$HEAD_CONTENT" =~ ^ref:\ (.*) ]]; then
    REF_FILE=".git/${BASH_REMATCH[1]}"
    if [ -f "$REF_FILE" ]; then
      NEXT_PUBLIC_BUILD_SHA="$(tr -d '\r\n' < "$REF_FILE")"
    elif [ -f .git/packed-refs ]; then
      NEXT_PUBLIC_BUILD_SHA="$(grep "${BASH_REMATCH[1]}" .git/packed-refs 2>/dev/null | head -1 | cut -d' ' -f1 || true)"
    fi
  elif [ -n "$HEAD_CONTENT" ]; then
    NEXT_PUBLIC_BUILD_SHA="$(echo "$HEAD_CONTENT" | tr -d '\r\n')"
  fi
fi
export NEXT_PUBLIC_BUILD_SHA="${NEXT_PUBLIC_BUILD_SHA:-unknown}"
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

  # Passenger starts from the Plesk application root.
  # server.js and app.js are tracked in git and delegate to standalone server.js
  # with scripts/server-prelude.js or plesk-prelude.js auto-loaded.
  cp -f scripts/server-prelude.js plesk-prelude.js 2>/dev/null || true

  # Keep git-tracked server.js and app.js clean so subsequent git pulls never encounter merge conflicts
  git checkout -- server.js app.js 2>/dev/null || true
  rm -f .plesk.startup.cjs 2>/dev/null || true
else
  echo "ERROR: Next.js standalone server was not generated at .next/standalone/server.js." >&2
  exit 1
fi

echo "=== [3.5/4] Synchronizing database schema & migrations ==="
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

# tmp/restart.txt is a *lazy* signal: Passenger only acts on it the next time
# it decides to check, which on some Plesk/Passenger configurations can be
# long after the next request (i.e. the old process keeps serving requests
# indefinitely). Force an immediate restart through every mechanism available
# on this host, best-effort, so a touched restart.txt is never the only shot.
APP_ROOT="$(pwd)"
if command -v passenger-config >/dev/null 2>&1; then
  echo "Forcing immediate restart via passenger-config..."
  passenger-config restart-app "$APP_ROOT" --ignore-app-not-running 2>&1 || true
fi
if command -v plesk >/dev/null 2>&1; then
  DETECTED_DOMAIN="$(basename "$(dirname "$APP_ROOT")" 2>/dev/null || true)"
  if [ -n "$DETECTED_DOMAIN" ]; then
    echo "Forcing immediate restart via Plesk CLI for domain: ${DETECTED_DOMAIN}..."
    plesk bin nodejs --restart -domain "$DETECTED_DOMAIN" 2>&1 || true
  fi
fi

# Ensure repository working directory is left clean so future git pulls never collide
git checkout -- server.js app.js package-lock.json bun.lock 2>/dev/null || true
rm -f .plesk.startup.cjs 2>/dev/null || true

echo "=== Plesk live deployment completed successfully! ==="
echo "Deployed commit: ${NEXT_PUBLIC_BUILD_SHA}"
echo "If the live site still serves old responses after this, the Application"
echo "Root in Plesk > Node.js must be restarted manually once from the panel —"
echo "that confirms whether the restart signal itself is the remaining gap."
