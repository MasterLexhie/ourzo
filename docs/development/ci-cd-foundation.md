# Ourzo — CI/CD Foundation

## Purpose

This document defines the initial Continuous Integration and Continuous Deployment (CI/CD) approach for the Ourzo SaaS platform.

The goal is to establish:

- Automated verification of code changes.
- Consistent build and test execution.
- A foundation for future deployment automation.
- Confidence when merging changes.

---

## CI/CD Approach

### Decision

Use **GitHub Actions** for CI and **GitHub Container Registry (GHCR)** for images.

- Native integration with the GitHub repository; no extra infrastructure.
- `GITHUB_TOKEN` is enough to publish images, so no long-lived registry secrets are needed.
- A Husky pre-commit hook still runs lint-staged locally (ESLint + Prettier on API files, oxlint on web files).

Deployment automation is introduced when a hosting target is chosen (see `docs/deployment.md`).

---

## Workflows

| Workflow | File | Triggers | Does |
|---|---|---|---|
| CI | `.github/workflows/ci.yml` | pull requests, pushes to `develop` (code changes only), manual, `workflow_call` | format, lint, type check, tests + coverage gate, build, Compose validation, Docker image build (not pushed) |
| Docker Publish | `.github/workflows/docker-publish.yml` | pushes to `main`, `v*.*.*` tags, manual | runs CI first, then builds and pushes `ourzo-api`, `ourzo-api-migrate` and `ourzo-web` to GHCR |

Pushes to `main` run CI only through Docker Publish, so a commit is never validated twice, and no image is published unless CI passed for that commit.

### CI job graph

```text
quality (format, lint, type check) ─┐
test (unit + e2e + web, coverage)  ─┼─► docker (api, web images; compose config)
build (pnpm build)                 ─┘
```

### Engineering rules

- Third-party actions are pinned to full commit SHAs, with the release tag in a comment. Update them deliberately (e.g. with Dependabot).
- Least-privilege permissions: `contents: read` everywhere; `packages: write` only on the publish job.
- Concurrency: superseded pull request runs are cancelled; publish runs are queued, never cancelled.
- Docker builds use Buildx with the GitHub Actions cache (scope `ourzo-api` / `ourzo-web`).
- pnpm's version comes from `packageManager` in the root `package.json`.

---

## Pull Request Workflow

### Purpose

Validate changes before merging into the main branch.

Workflow:

```text
Developer opens PR

↓

GitHub Actions CI starts

↓

Install dependencies

↓

Lint

↓

Run tests

↓

Build applications

↓

PR approved
```

---

## Pull Request Checks

### Dependency Installation

Command:

```bash
pnpm install
```

Purpose: Verify dependencies install correctly and ensure lockfile consistency.

---

### Code Quality

Command:

```bash
pnpm lint
```

Purpose: Detect code issues and enforce standards.

---

### Formatting Check

Command:

```bash
pnpm format:check
```

Purpose: Ensure formatting consistency.

Currently enforced for `apps/api` (Prettier). `apps/web` uses oxlint only. Adding Prettier to web needs dependency approval.

---

### Testing

Command:

```bash
pnpm test
```

Purpose: Validate application behaviour.

In CI, `pnpm test` runs:
- API unit tests (Jest)
- API e2e suites (supertest, run serially against the `ourzo_test` service-container database via `TEST_DATABASE_URL`)
- web tests (Vitest + jsdom)

`pnpm --filter ourzo-api test:cov` then fails the job if line coverage of `src/**/*.service.ts` drops below 70%. Turbo passes `TEST_DATABASE_URL`, `REDIS_HOST` and `REDIS_PORT` through to the test task.

---

### Build Verification

Command:

```bash
pnpm build
```

Purpose: Ensure applications compile successfully.

The root scripts `lint`, `test`, `build` and `format:check` all run through Turborepo. CI runs `prisma generate` before lint and build, because type-aware lint and `nest build` need the generated client.

---

## Branch Workflow

Decision:

```text
Gitflow-style workflow
```

Branches:

```text
main

develop

feature/*

bugfix/*
```

---

## Branch Responsibilities

### main

Purpose: Production-ready code.

Rules:

- Protected branch.
- Changes require review.

### develop

Purpose: Integration branch containing completed features before release.

### feature branches

Pattern:

```text
feature/project-management
```

Purpose: Individual feature development.

### bugfix branches

Pattern:

```text
bugfix/authentication-error
```

Purpose: Bug corrections.

---

## Merge Requirements

Before merging into `develop`, required:

- Passing CI checks (`quality`, `test`, `build`, `docker`).
- Code review.
- No failing tests.

---

## Deployment Strategy

### MVP Decision

Deployment automation is not fully implemented initially.

Reason:

- Deployment platforms are still being finalized.
- Avoid unnecessary infrastructure complexity.

---

## Future Deployment Flow

Target:

```text
main branch

↓

CI validation

↓

Publish images to GHCR

↓

Run ourzo-api-migrate, then deploy ourzo-api and ourzo-web

↓

Deploy frontend static application

↓

Connect managed PostgreSQL
```

---

## Frontend Deployment

Planned approach:

```text
Container (`ourzo-web`: nginx serving the Vite build and proxying /api to the API)
```

Static hosting is still possible if the host serves the API on the same site (ADR-010).

Requirements:

- Build React application.
- Serve generated assets.
- Configure API environment variable (empty in the container image: same origin).

Build command:

```bash
pnpm build
```

Output:

```text
dist/
```

---

## Backend Deployment

Planned approach:

```text
Container Platform
```

Requirements:

- `ourzo-api` image from GHCR.
- `ourzo-api-migrate` run once per release, before the new API starts.
- Environment variables.
- Database connection.
- Health checks.

---

## Database Deployment

Production database:

```text
Managed PostgreSQL
```

Requirements:

- Automated backups.
- Secure connections.
- Migration deployment.

Migration command:

```bash
pnpm prisma migrate deploy
```

---

## CI Environment

CI runs on `ubuntu-latest` using:

```text
Node.js LTS
```

Package manager:

```text
pnpm
```

Database-dependent tests use:

```text
PostgreSQL test database
```

---

## Future Improvements

Possible future additions:

- Deployment workflow (`deploy.yml`) once a hosting target exists.
- Dependabot for action SHAs and base images.
- Image vulnerability scanning.
- Preview environments.
- Smaller API image (drop the Prisma CLI that pnpm installs as an optional peer of `@prisma/client`).

These are not required for the MVP.

---

## CI/CD Principles

Ourzo follows:

- Automate verification before merging.
- Keep CI simple for MVP.
- Fail early on quality issues.
- Avoid unnecessary infrastructure.
- Add deployment automation when operational requirements exist.
