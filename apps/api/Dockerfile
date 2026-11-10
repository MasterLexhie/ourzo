# syntax=docker/dockerfile:1.7
#
# Ourzo API image. Build context is the repository root:
#   docker build -f apps/api/Dockerfile --target runner -t ourzo-api .
#
# Targets:
#   runner  - production API (default, last stage)
#   migrate - one-shot `prisma migrate deploy` job (keeps the Prisma CLI)

ARG NODE_IMAGE=node:22-alpine

# ---------- Base: Node + pinned pnpm ----------
FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@10.10.0 --activate
WORKDIR /app

# ---------- Dependencies (cached on manifest + lockfile changes only) ----------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter ourzo-api... --ignore-scripts

# ---------- Build ----------
FROM deps AS build
COPY apps/api ./apps/api
WORKDIR /app/apps/api
# prisma.config.ts reads DATABASE_URL, but `generate` never connects:
# a placeholder is enough here; the real value is injected at runtime.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN pnpm prisma:generate && pnpm build

# ---------- Migrate job (dev deps kept for the Prisma CLI) ----------
FROM build AS migrate
ENV DATABASE_URL= \
    NODE_ENV=production
RUN chown -R node:node /app/apps/api
USER node
CMD ["pnpm", "prisma:migrate:deploy"]

# ---------- Production dependencies only ----------
FROM build AS prod-deps
# Pass the workspace root explicitly: from apps/api pnpm would only see its own package.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    cd /app && pnpm --filter ourzo-api deploy --prod --legacy --ignore-scripts /prod/api
# The generated Prisma client lives next to @prisma/client, so generate it
# into the slim tree too, using the CLI from the build stage.
RUN cp -r /app/apps/api/prisma /prod/api/prisma && \
    /app/apps/api/node_modules/.bin/prisma generate --schema /prod/api/prisma/schema.prisma

# ---------- Runtime ----------
FROM ${NODE_IMAGE} AS runner
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app
COPY --from=prod-deps --chown=node:node /prod/api/node_modules ./node_modules
COPY --from=prod-deps --chown=node:node /prod/api/package.json ./package.json
COPY --from=build --chown=node:node /app/apps/api/dist ./dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/health || exit 1
CMD ["node", "dist/main.js"]
