# Build context: repository root
#   docker build -f apps/api/Dockerfile .

# ---------- Builder ----------
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable pnpm

# Workspace manifests first for better layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json

# Install only the API and its dependencies (workspace-aware)
RUN pnpm install --frozen-lockfile --filter ourzo-api...

COPY apps/api ./apps/api

# prisma.config.ts reads DATABASE_URL; generate does not connect, so a
# placeholder is enough at build time (the real value is injected at runtime).
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    pnpm --filter ourzo-api prisma:generate

RUN pnpm --filter ourzo-api build

# ---------- Runtime ----------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

# pnpm keeps packages in the root store and symlinks them into
# apps/api/node_modules, so both trees are copied to keep links intact.
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/prisma.config.ts ./apps/api/prisma.config.ts

WORKDIR /app/apps/api

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
