#!/usr/bin/env bash
set -Eeuo pipefail

: "${DATABASE_URL:?DATABASE_URL is required for CI}"
export NODE_ENV=test

if command -v bun >/dev/null 2>&1; then
  runner=(bun run)
else
  runner=(npm run)
fi

"${runner[@]}" typecheck
"${runner[@]}" db:migrate
"${runner[@]}" db:seed
"${runner[@]}" build
