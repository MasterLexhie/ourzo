# Ourzo — Repository Structure

## Purpose

This document defines the repository organization for the Ourzo SaaS platform.

    The structure is designed to support:

    - Multi-tenant SaaS development.
- Clear separation between frontend and backend.
- Independent application ownership.
- Maintainable MVP development.
- Future scalability.

---

## Repository Approach

### Monorepo

Ourzo uses a monorepo structure.

    Reasons:

- Frontend and backend are maintained together.
- Shared tooling configuration is centralized.
- Development workflow is simplified.
- Applications can still be deployed independently.

---

## Root Repository Structure

    ```text
ourzo/

├── apps/
│   ├── api/
│   └── web/
│
├── packages/
│
├── docs/
│
├── infrastructure/
│
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── docker-compose.yml
├── pnpm-lock.yaml
└── README.md
```

---

## Applications

### Backend Application

Location:

    ```text
apps/api
```

Technology:

    - NestJS
    - TypeScript
    - Prisma
    - PostgreSQL

Responsibilities:

    - Business logic.
- Authentication.
- Authorization.
- Multi-tenancy enforcement.
- Database access.
- REST API implementation.

---

### Frontend Application

Location:

    ```text
apps/web
```

Technology:

    - React
    - Vite
    - TypeScript

Responsibilities:

    - User interface.
- Client-side state management.
- API communication.
- User workflows.

---

## Packages

Location:

    ```text
packages/
```

Purpose: Contains shared tooling or configuration.

    MVP decision: No shared application packages.

    Not included:

    ```text
packages/ui
packages/types
packages/api-client
```

Reason: The frontend and backend remain independently structured. Shared code will only be introduced when there is a clear requirement.

---

## Documentation

Location:

    ```text
docs/
```

Purpose: Stores project documentation.

    Structure:

```text
docs/

├── product/
├── architecture/
├── database/
├── adr/
└── development/
```

---

## Infrastructure

Location:

    ```text
infrastructure/
```

Purpose: Contains infrastructure-related configuration.

    Structure:

```text
infrastructure/

├── docker/
└── github-actions/
```

---

## Backend Ownership

The backend owns:

    - Database schema.
- Database migrations.
- Prisma configuration.
- Database access.
- API contracts.

    Database location:

    ```text
apps/api/prisma
```

---

## Frontend Ownership

The frontend owns:

    - Components.
    - Pages.
    - Client state.
- User interaction logic.

    The frontend does not directly access the database.

    Communication flow:

    ```text
React Frontend

↓

REST API

↓

NestJS Backend

↓

PostgreSQL
```

---

## Development Principles

The repository follows:

    - Clear application boundaries.
- Technology-specific conventions.
- Minimal shared code.
- Explicit ownership.
- Simple MVP architecture.