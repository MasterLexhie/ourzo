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

Use:

```text
GitHub Actions
```

Reason:

- Native integration with GitHub repositories.
- Suitable for MVP development.
- Supports automated testing and deployment workflows.
- Reduces infrastructure complexity.

---

## Current CI/CD Scope

For the MVP, CI focuses on:

```text
Code Validation

↓

Testing

↓

Build Verification
```

Deployment automation is introduced when deployment environments are finalized.

---

## CI Workflow Location

GitHub Actions workflows are stored at:

```text
.github/

└── workflows/
```

Example:

```text
.github/

└── workflows/

    ├── pull-request.yml
    └── main.yml
```

---

## Pull Request Workflow

### Purpose

Validate changes before merging into the main branch.

Workflow:

```text
Developer creates PR

↓

GitHub Actions starts

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

---

### Testing

Command:

```bash
pnpm test
```

Purpose: Validate application behaviour.

---

### Build Verification

Command:

```bash
pnpm build
```

Purpose: Ensure applications compile successfully.

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

- Passing CI checks.
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

Build Docker image

↓

Deploy backend container

↓

Deploy frontend static application

↓

Connect managed PostgreSQL
```

---

## Frontend Deployment

Planned approach:

```text
Static Hosting
```

Requirements:

- Build React application.
- Serve generated assets.
- Configure API environment variable.

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

- Docker image.
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

CI runs using:

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

- Automated deployments.
- Docker image publishing.
- Database migration automation.
- Preview environments.
- Security scanning.
- Dependency updates.

These are not required for the MVP.

---

## CI/CD Principles

Ourzo follows:

- Automate verification before merging.
- Keep CI simple for MVP.
- Fail early on quality issues.
- Avoid unnecessary infrastructure.
- Add deployment automation when operational requirements exist.
