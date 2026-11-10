# Ourzo — Development Setup

## Purpose

This document defines how developers run the Ourzo platform locally.

The goal is to provide a consistent development environment across machines.

---

## Development Environment Overview

Ourzo consists of:

```text
Frontend
    |
REST API
    |
Backend
    |
PostgreSQL
```

Additional infrastructure:

```text
Redis
```

is included for future background jobs and caching requirements.

---

## Required Developer Tools

Install:

| Tool | Purpose |
|---|---|
| Node.js LTS | JavaScript runtime |
| pnpm | Package manager |
| Docker + Compose | PostgreSQL, Redis and the full stack (recommended) |
| PostgreSQL 16 / Redis 7 | Only if not using Docker |
| Git | Version control |

---

## Repository Setup

Clone repository:

```bash
git clone <repository-url>
```

Navigate into project:

```bash
cd ourzo
```

Install dependencies:

```bash
pnpm install
```

---

## Workspace Structure

The repository uses pnpm workspaces.

Structure:

```text
ourzo/
├── apps/
│   ├── api/
│   └── web/
│
├── packages/
│
├── infrastructure/
│
├── docs/
│
└── package.json
```

---

## Environment Setup

Each application maintains its own environment variables.

Structure:

```text
apps/
├── api/
│   ├── .env
│   └── .env.example
│
└── web/
    ├── .env
    └── .env.example
```

Copy examples:

Backend:

```bash
cp apps/api/.env.example apps/api/.env
```

Frontend:

```bash
cp apps/web/.env.example apps/web/.env
```

---

## Backend Development

Backend location:

```text
apps/api
```

Technology:

- NestJS
- Prisma
- PostgreSQL

Run backend:

```bash
pnpm --filter api dev
```

Backend runs on:

```text
http://localhost:3000
```

---

## Frontend Development

Frontend location:

```text
apps/web
```

Technology:

- React
- Vite

Run frontend:

```bash
pnpm --filter web dev
```

Frontend runs on:

```text
http://localhost:5173
```

---

## Docker Development Environment

Docker Compose runs PostgreSQL, Redis and, optionally, the whole stack. Configuration comes from a root `.env` copied from `.env.example`.

Infrastructure only (apps run on the host with `pnpm dev`):

```bash
cp .env.example .env
docker compose -f compose.yaml -f compose.dev.yaml up -d postgres redis
```

This publishes PostgreSQL on `127.0.0.1:5432` (databases `ourzo_dev` and `ourzo_test`, created by `infrastructure/docker/postgres-init`) and Redis on `127.0.0.1:6379` (no password).

Full stack (web on `http://localhost:8080`, API also on `:3000`):

```bash
docker compose -f compose.yaml -f compose.dev.yaml up -d --build
```

See `docs/deployment.md` for logs, rebuilds and troubleshooting. Without Docker, install PostgreSQL 16 and Redis 7 locally and run `createdb ourzo_dev`.

---

## Local Services

### PostgreSQL

Development database:

```text
ourzo_dev
```

Connection:

```text
localhost:5432
```

---

### Test Database

Testing database:

```text
ourzo_test
```

Used for:

- Integration tests.
- Database verification.

---

### Redis

Local Redis:

```text
localhost:6379
```

Current MVP usage:

- Infrastructure readiness.

Future usage:

- Background jobs.
- Queues.
- Caching.

---

## Database Setup

After PostgreSQL is running:

Generate Prisma client:

```bash
pnpm prisma generate
```

Run migrations:

```bash
pnpm prisma migrate dev
```

Seed database:

```bash
pnpm prisma db seed
```

---

## Development Workflow

Typical workflow:

```text
1. Start PostgreSQL and Redis (Docker Compose)
↓
2. Start backend
↓
3. Start frontend
↓
4. Develop features
↓
5. Run tests
↓
6. Commit changes
```

---

## Available Commands

### Root Commands

Install dependencies:

```bash
pnpm install
```

Run all applications:

```bash
pnpm dev
```

Build:

```bash
pnpm build
```

Lint:

```bash
pnpm lint
```

Tests (API unit + e2e, web):

```bash
# e2e suites need a disposable database whose name ends in _test
# (compose.dev.yaml creates ourzo_test; with local installs: createdb ourzo_test)
export TEST_DATABASE_URL=postgresql://ourzo:dev_password@localhost:5432/ourzo_test
pnpm test
```

The e2e harness refuses any database that doesn't end in `_test`, and it checks `current_database()` before truncating tables. Never point it at a development or production database.

Format check (API):

```bash
pnpm format:check
```

Fix lint issues (API):

```bash
pnpm --filter ourzo-api lint:fix
```

Test:

```bash
pnpm test
```

---

## Development Rules

### Dependencies

Use:

```text
pnpm
```

Do not use:

```text
npm
yarn
```

---

### Environment Files

Allowed:

```text
.env
```

Never commit:

```text
.env
```

Commit:

```text
.env.example
```

---

### Database Changes

All schema changes must use:

```text
Prisma migrations
```

Do not manually modify production databases.

---

## Local Development Goals

The local environment should allow a developer to:

- Run the frontend.
- Run the backend.
- Connect to PostgreSQL.
- Execute migrations.
- Run tests.
- Develop without external dependencies.
