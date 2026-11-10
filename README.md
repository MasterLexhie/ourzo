# Ourzo

Ourzo is a lightweight multi-tenant SaaS workspace for startups and SMEs to organize projects, teams and day-to-day work. The MVP focuses on a production-grade foundation:

- strict tenant isolation (shared database, `workspaceId` on every tenant query)
- workspace RBAC (Owner / Admin / Member)
- lightweight projects and tasks
- hashed, scoped API keys
- Redis rate limiting
- plan limits
- notifications
- append-only audit logs

## Repository layout

| Path | Contents |
|---|---|
| `apps/api` | NestJS REST API: business logic, auth, tenant isolation, Prisma/PostgreSQL |
| `apps/web` | React + Vite SPA (TanStack Query, Zustand, shadcn/ui) |
| `docs/` | Product, architecture, database and development documentation, ADRs |
| `compose.yaml`, `compose.dev.yaml` | Full stack (Postgres, Redis, migrations, API, web) and local-dev overrides |
| `apps/*/Dockerfile` | API and web images (see `docs/deployment.md`) |
| `.github/workflows/` | CI (format, lint, type check, tests, build, Docker build) and GHCR publishing |

## Prerequisites

- Node.js 22
- pnpm 10.10 (`corepack enable`): the only supported package manager
- Docker with Docker Compose (recommended), **or** PostgreSQL 16 and Redis 7 installed locally

## Quick start with Docker

Requires only Docker Desktop, or Docker Engine 24+ with the Compose v2 plugin (`docker compose`, not `docker-compose`). Node and pnpm are not needed.

```bash
cp .env.example .env            # development values; never use them in production
docker compose up -d --build    # postgres, redis, migrations, api, web
# open http://localhost:8080 and register an account
```

- The first build takes a few minutes; later starts take seconds.
- Port 8080 already in use? Set `WEB_PORT` in `.env`.
- Stop with `docker compose down`; add `-v` to also delete the database.

See `docs/deployment.md` for logs, rebuilds, production images and the CI/CD workflows.

## Getting started (apps on the host)

```bash
# 1. Install dependencies (also installs the git pre-commit hook)
pnpm install

# 2. Start PostgreSQL (ourzo_dev + ourzo_test) and Redis in containers
cp .env.example .env
docker compose -f compose.yaml -f compose.dev.yaml up -d postgres redis
#    (or use local installs and run `createdb ourzo_dev`)

# 3. Configure environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
#    then set JWT_SECRET and JWT_REFRESH_SECRET in apps/api/.env (32+ random chars each)

# 4. Generate the Prisma client and apply migrations
pnpm --filter ourzo-api prisma:generate
pnpm --filter ourzo-api prisma:migrate:deploy

# 5. Run the API (http://localhost:3000) and the web app (http://localhost:5173)
pnpm dev
```

API docs are served by Swagger at <http://localhost:3000/api/docs>. The health endpoint is `GET /health`.

## Common commands

| Command | What it does |
|---|---|
| `pnpm dev` | Run API and web in watch mode |
| `pnpm build` | Build all apps |
| `pnpm lint` | ESLint (API) and oxlint (web) |
| `pnpm format:check` | Prettier check (API) |
| `pnpm test` | API unit + e2e tests and web tests (see below) |
| `pnpm --filter ourzo-api test:cov` | API e2e with the service coverage gate (70% lines) |

## Tests

The API e2e suites (tenant-isolation matrix, RBAC matrix, API keys, rate limiting, cookie auth, workflows) run against a **dedicated, disposable** database. They read `TEST_DATABASE_URL`, refuse any database whose name does not end in `_test`, and truncate it between suites.

```bash
# compose.dev.yaml creates ourzo_test automatically; with local installs: createdb ourzo_test
export TEST_DATABASE_URL=postgresql://ourzo:dev_password@localhost:5432/ourzo_test
pnpm test
```

Never point `TEST_DATABASE_URL` at a development or production database.

CI runs the same suites on every pull request (`.github/workflows/ci.yml`).

## Contributing

- Work on a feature branch. A Husky pre-commit hook runs lint-staged:
  - ESLint + Prettier on API files
  - oxlint on web files
- Read `AGENTS.md` and the ADRs in `docs/architecture/architecture-decision-records.md` before changing architecture.
- Schema changes go through Prisma Migrate only. Keep `docs/` in sync with behaviour changes.

## Documentation

Start with:
- `docs/product/mvp-scope.md`
- `docs/architecture/system-architecture.md`
- `docs/architecture/multi-tenancy.md`
- `docs/architecture/security-architecture.md`
- `docs/development/development-setup.md`
- `docs/development/api-reference.md`
