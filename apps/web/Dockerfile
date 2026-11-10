# syntax=docker/dockerfile:1.7
#
# Ourzo web image: Vite build served by unprivileged nginx, which also proxies
# /api and /health to the API so the refresh cookie stays same-origin (ADR-010).
# Build context is the repository root:
#   docker build -f apps/web/Dockerfile -t ourzo-web .

ARG NODE_IMAGE=node:22-alpine
ARG NGINX_IMAGE=nginxinc/nginx-unprivileged:1.27-alpine

# ---------- Build ----------
FROM ${NODE_IMAGE} AS build
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@10.10.0 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter web...

COPY apps/web ./apps/web

# Empty by default: the SPA calls the API on its own origin through nginx.
# Set a full URL only when the API is served from a different (same-site) host.
ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}
RUN pnpm --filter web build

# ---------- Runtime ----------
FROM ${NGINX_IMAGE} AS runner
# API upstream; override at runtime if the API service has another address.
ENV API_UPSTREAM=http://api:3000
COPY apps/web/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
