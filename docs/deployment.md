# Ourzo — Docker and Deployment

This guide covers the container images, the Docker Compose stack, and the GitHub Actions workflows that build and publish them. CI policy and branch rules are in `docs/development/ci-cd-foundation.md`.

---

## Architecture

```text
browser ──► web (nginx :8080) ──/api, /health──► api (NestJS :3000) ──► postgres :5432
                │                                     └──────────────► redis :6379
                └─ serves the Vite build (SPA fallback)

migrate (one-shot) ── prisma migrate deploy ──► postgres   (runs before api starts)
```

| Service | Image / target | Published port | Notes |
|---|---|---|---|
| `postgres` | `postgres:16-alpine` | none (dev: `127.0.0.1:5432`) | Named volume `postgres_data` (dev: `postgres_dev_data`) |
| `redis` | `redis:7-alpine` | none (dev: `127.0.0.1:6379`) | No password, so it must stay on the private network; ephemeral (rate-limit counters only) |
| `migrate` | `apps/api/Dockerfile` → `migrate` | none | Exits 0 after applying migrations; `api` waits for it |
| `api` | `apps/api/Dockerfile` → `runner` | none (dev: `127.0.0.1:3000`) | Healthcheck `GET /health`: 200 only if PostgreSQL answers a query and Redis answers PING, else 503 |
| `web` | `apps/web/Dockerfile` → `runner` | `${WEB_PORT:-8080}` | nginx proxies `/api` and `/health` to `api` |

**Why nginx proxies the API:** the refresh token is a `SameSite=Strict` cookie scoped to `/api/auth` (ADR-010). Serving the SPA and the API from one origin keeps the cookie working without CORS, so the web image is built with an empty `VITE_API_URL`.

**Client IPs:** the API sets Express `trust proxy` from `TRUST_PROXY` (Compose sets `1`, i.e. nginx). Without it, every user would share nginx's IP and therefore one rate-limit bucket. If you put another proxy or load balancer in front of `web`, raise it to `2`. Never set it when the API is reachable directly, or `X-Forwarded-For` can be spoofed.

### Images

| Image | Base | User | Contents |
|---|---|---|---|
| `ourzo-api` | `node:22-alpine` | `node` (1000) | Compiled `dist/` and production `node_modules` from `pnpm deploy --prod` |
| `ourzo-api-migrate` | `node:22-alpine` | `node` (1000) | Build stage with the Prisma CLI and `prisma/migrations` |
| `ourzo-web` | `nginxinc/nginx-unprivileged:1.27-alpine` | `nginx` (101) | Static Vite build and `nginx.conf` template |

Hardening in Compose:
- `no-new-privileges` on every service.
- Read-only root filesystems for `api` and `web`, with tmpfs where they need to write.
- Memory limits on each service.
- Only `web` is published.
- Every secret is required (`${VAR:?}`), so Compose refuses to start without it.

---

## Prerequisites

- Docker Engine 24+ (or Docker Desktop) with Compose v2.
- For host development: Node.js 22 and pnpm 10.10 (`corepack enable`).

---

## Configuration

Compose reads a root `.env` (or the file given with `--env-file`). Copy the template:

```bash
cp .env.example .env
```

| Variable | Required | Scope | Purpose |
|---|---|---|---|
| `POSTGRES_PASSWORD` | yes | all | PostgreSQL password; also used to build `DATABASE_URL` |
| `POSTGRES_USER` | no (`ourzo`) | all | PostgreSQL user |
| `POSTGRES_DB` | no | all | `ourzo` (base) / `ourzo_dev` (dev override) |
| `JWT_SECRET` | yes | all | Access-token signing key (32+ random chars) |
| `JWT_REFRESH_SECRET` | yes | all | Refresh-token signing key (32+ random chars, different) |
| `ALLOW_ORIGIN` | no (`http://localhost:8080`) | all | Exact public origin(s) for CORS |
| `WEB_APP_URL` | no (`http://localhost:8080`) | all | Public URL used in invitation links |
| `NODE_ENV` | no (`production`; `.env.example` sets `development`) | all | `production` adds `Secure` to the refresh cookie, which browsers drop over plain HTTP except on `localhost`. Use `production` only behind HTTPS |
| `TRUST_PROXY` | no (`1`) | all | Trusted proxy hops in front of the API |
| `WEB_PORT` | no (`8080`) | all | Host port for `web` |
| `JWT_ACCESS_TOKEN_EXPIRY`, `JWT_REFRESH_TOKEN_EXPIRY`, `BCRYPT_ROUNDS`, `RATE_LIMIT_*` | no | all | See `docs/development/environment-configuration.md` |
| `VITE_API_URL` | no (empty) | build | Only if the API is served from a different same-site host |
| `API_IMAGE`, `MIGRATE_IMAGE`, `WEB_IMAGE` | no | prod | Use published GHCR images instead of local builds |

The values in `.env.example` are development-only. Generate production secrets with `openssl rand -base64 48`, and keep the production env file outside the repository.

---

## Local development

### Infrastructure only (apps run on the host)

```bash
cp .env.example .env
docker compose -f compose.yaml -f compose.dev.yaml up -d postgres redis
```

- PostgreSQL is at `localhost:5432`. The first start of an empty volume creates the `ourzo_dev` and `ourzo_test` databases.
- Redis is at `localhost:6379` (no password).
- Then follow the README: `pnpm dev`, `pnpm test`.

If PostgreSQL or Redis already run natively on those ports, stop them or use the full stack below (base file only), which publishes nothing but the web port.

### Full stack

```bash
docker compose up -d --build                                          # production-shaped, http://localhost:8080
docker compose -f compose.yaml -f compose.dev.yaml up -d --build      # + API on :3000 (Swagger /api/docs)
```

### Everyday commands

| Task | Command |
|---|---|
| Status / health | `docker compose ps` |
| Logs (follow) | `docker compose logs -f api` (or `web`, `migrate`, `postgres`, `redis`) |
| Rebuild after code changes | `docker compose up -d --build api web` |
| Re-run migrations | `docker compose run --rm migrate` |
| Shell in a container | `docker compose exec api sh` |
| psql | `docker compose exec postgres psql -U ourzo -d ourzo` (dev: `-d ourzo_dev`) |
| redis-cli | `docker compose exec redis redis-cli` |
| Stop (keep data) | `docker compose down` |
| Stop and **delete all data** | `docker compose down -v` (irreversible: removes the PostgreSQL volume) |

Add `-f compose.yaml -f compose.dev.yaml` to each command when you started the dev variant.

### Building images directly

```bash
docker build -f apps/api/Dockerfile --target runner  -t ourzo-api .
docker build -f apps/api/Dockerfile --target migrate -t ourzo-api-migrate .
docker build -f apps/web/Dockerfile                  -t ourzo-web .
```

The build context is always the repository root, because the pnpm workspace files and lockfile live there.

---

## Production deployment

No hosting target is configured yet, so there is no deploy workflow. With any Docker host:

1. Create an env file outside the repo with strong secrets and the public URL:
   - Set `ALLOW_ORIGIN` and `WEB_APP_URL` to `https://your-domain`.
   - Set `NODE_ENV=production`.
2. Terminate TLS in front of `web` (load balancer or host proxy). The refresh cookie is `Secure` in production, so plain HTTP logins will not persist. Set `TRUST_PROXY=2` when that proxy forwards `X-Forwarded-For`.
3. Pull the images published by CI, then start the stack:

   ```bash
   # in /secure/ourzo.env (same commit for all three)
   API_IMAGE=ghcr.io/masterlexhie/ourzo-api:sha-<commit>
   MIGRATE_IMAGE=ghcr.io/masterlexhie/ourzo-api-migrate:sha-<commit>
   WEB_IMAGE=ghcr.io/masterlexhie/ourzo-web:sha-<commit>
   ```

   ```bash
   docker compose --env-file /secure/ourzo.env pull migrate api web
   docker compose --env-file /secure/ourzo.env up -d --no-build
   ```

   `migrate` runs first and `api` only starts if it exits 0.
4. With managed PostgreSQL or Redis, drop those services in an override file and point `DATABASE_URL` and `REDIS_HOST` at the managed endpoints (the API does not send a Redis password, so Redis must be reachable without one on a private network). Run `ourzo-api-migrate` once per release, before starting the new API.

### Image tags (GHCR)

| Event | Tags |
|---|---|
| Push to `main` | `sha-<short>`, `main`, `latest` |
| Tag `v1.2.3` | `sha-<short>`, `1.2.3`, `1.2` |

Deploy with an immutable `sha-` or version tag, not `latest`. Images carry SBOM and provenance attestations.

---

## GitHub Actions

| Workflow | Triggers | Jobs |
|---|---|---|
| `ci.yml` | pull requests; pushes to `develop` (code changes only); manual; called by `docker-publish.yml` | `quality` (format, lint, API and web type check), `test` (Postgres and Redis service containers: unit, e2e, web, 70% coverage gate), `build`, `docker` (Compose validation and image builds, not pushed) |
| `docker-publish.yml` | pushes to `main`; `v*.*.*` tags; manual | `ci` (the whole CI workflow), then `publish` (api, api-migrate and web images to GHCR) |

**Repository settings needed:**
- **Settings → Actions → General → Workflow permissions:** allow `GITHUB_TOKEN` to be granted `packages: write`. The workflow requests it only for the publish job.
- **Branch protection on `main` and `develop`:** require the CI checks `Format, lint & type check`, `Tests (unit + e2e + web)`, `Build`, `Docker build (api)` and `Docker build (web)`.
- **GHCR:** the first publish creates private packages `ourzo-api`, `ourzo-api-migrate` and `ourzo-web`. Change visibility or link them to the repository under the package settings if needed.

**Secrets:** none beyond the built-in `GITHUB_TOKEN`. CI uses throwaway credentials for its service containers, and the application's runtime secrets never enter GitHub Actions.

**Adding deployment later:** add a `deploy` job to `docker-publish.yml` that `needs: publish`. Run it in a protected GitHub environment with the host credentials stored as environment secrets, run `ourzo-api-migrate`, and then roll out the `sha-` tagged images.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `required variable … is missing a value` | Missing root `.env` / `--env-file`, or a required secret is empty |
| `pull access denied` for `ourzo-*:local` | `--no-build` without `API_IMAGE` / `MIGRATE_IMAGE` / `WEB_IMAGE` set |
| `migrate` exits non-zero | Database unreachable or a migration failed; see `docker compose logs migrate` |
| `/health` returns 503 | The check marked `down` (database or redis) is unreachable or failing; see `docker compose logs api` |
| Login works but the session is lost on reload | Serving over plain HTTP with `NODE_ENV=production` (cookie is `Secure`), or SPA and API on different sites |
| Every user is rate-limited together | `TRUST_PROXY` unset or too low for the number of proxies |
| `port is already allocated` | A native PostgreSQL or Redis on 5432/6379 (dev override) or something on `WEB_PORT` |
