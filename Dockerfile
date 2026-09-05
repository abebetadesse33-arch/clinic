# ==========================================
# 1. BASE IMAGE (OVEN/BUN ALPINE)
# ==========================================
FROM oven/bun:1-alpine AS base
WORKDIR /app
RUN apk upgrade --no-cache && apk add --no-cache libc6-compat

# ==========================================
# 2. DEPENDENCIES STAGE
# ==========================================
FROM base AS deps
WORKDIR /app

COPY package.json bun.lock* package-lock.json* ./
RUN bun install --frozen-lockfile 2>/dev/null || bun install

# ==========================================
# 3. BUILDER STAGE
# ==========================================
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable telemetry and runtime-only integrations during the static build.
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_CPU_COUNT=1
ENV NEXT_PHASE=phase-production-build
ENV NEXT_PUBLIC_APP_NAME="NiniMed Enterprise CDSS"
ENV NEXT_PUBLIC_APP_VERSION="3.0.0-enterprise"

RUN bun run build

# Bundle the idempotent schema initializer so existing PostgreSQL volumes are
# upgraded before the production server accepts requests.
RUN bun build src/db/run-init.ts --target bun --outfile /tmp/db-init.js

# ==========================================
# 4. PRODUCTION RUNNER STAGE
# ==========================================
FROM oven/bun:1-alpine AS runner
WORKDIR /app

RUN apk upgrade --no-cache && apk add --no-cache libc6-compat

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy standalone output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /tmp/db-init.js ./db-init.js

EXPOSE 3000

CMD ["sh", "-c", "bun db-init.js && bun server.js"]
