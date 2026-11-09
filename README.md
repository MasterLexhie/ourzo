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
| `docker-compose.*.yml` | Local (dev) and production container definitions |
| `.github/workflows/ci.yml` | Lint, format, tests (unit + e2e + web), build, Docker image |

## Prerequisites

- Node.js 22
- pnpm 10.10 (`corepack enable`): the only supported package manager
- Docker with Docker Compose, for PostgreSQL and Redis

## Getting started

```bash
# 1. Install dependencies (also installs the git pre-commit hook)
pnpm install

# 2. Start PostgreSQL and Redis
docker compose -f docker-compose.dev.yml up -d postgres redis

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
docker compose -f docker-compose.dev.yml exec postgres createdb -U ourzo ourzo_test
export TEST_DATABASE_URL=postgresql://ourzo:dev_password@localhost:5432/ourzo_test
pnpm test
```

Never point `TEST_DATABASE_URL` at a development or production database.

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
