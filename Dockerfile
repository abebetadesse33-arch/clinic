# ==========================================
# 1. BASE IMAGE (OVEN/BUN ALPINE)
# ==========================================
FROM oven/bun:1-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

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

# Disable telemetry & set dummy DB URL so Next.js build doesn't fail
# (actual DB connection happens at runtime via docker-compose)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_CPU_COUNT=1
ENV DATABASE_URL=postgres://postgres:postgres@localhost:5432/clinic_enterprise
ENV REDIS_URL=redis://localhost:6379
ENV GEMINI_API_KEY_1=placeholder
ENV NEXT_PUBLIC_APP_NAME="NiniMed Enterprise CDSS"
ENV NEXT_PUBLIC_APP_VERSION="3.0.0-enterprise"

RUN bun run build

# ==========================================
# 4. PRODUCTION RUNNER STAGE
# ==========================================
FROM oven/bun:1-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy standalone output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["bun", "server.js"]
