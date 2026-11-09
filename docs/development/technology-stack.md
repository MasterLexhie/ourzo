# Ourzo — Technology Stack

## Purpose

This document defines the technology choices for the Ourzo SaaS platform.

The goal is to document the selected technologies, their responsibilities, and the reasoning behind the decisions.

---

## Technology Overview

### Frontend

| Category | Technology |
|---|---|
| Framework | React |
| Build Tool | Vite |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| Routing | React Router |
| Client State | Zustand |
| Server State | TanStack Query |
| Forms | React Hook Form |
| Testing | Vitest + React Testing Library (jsdom) |
| Linting | oxlint |

---

### Backend

| Category | Technology |
|---|---|
| Framework | NestJS |
| Language | TypeScript |
| API Style | REST API |
| Authentication | JWT Access + Refresh Tokens |
| Validation | class-validator |
| API Documentation | Swagger/OpenAPI |
| Logging | NestJS Logger |
| Testing | Jest (unit) + supertest (e2e against a dedicated `*_test` database) |
| Rate limiting client | ioredis 6 (bundles its own types) |

---

### Database

| Category | Technology |
|---|---|
| Database | PostgreSQL |
| ORM | Prisma |
| Database Driver | pg |
| Prisma Adapter | @prisma/adapter-pg |
| Migration Tool | Prisma Migrations |

---

### Infrastructure

| Category | Technology |
|---|---|
| Containerization | Docker |
| Local Backend Environment | Docker Compose |
| Cache / Future Jobs | Redis |
| Frontend Deployment | Static Hosting |
| Backend Deployment | Container Platform |
| Database Hosting | Managed PostgreSQL |

---

## Frontend Decisions

### React + Vite

Decision:

```text
React + Vite
```

Reason:

- Ourzo is an authenticated SaaS application.
- SEO and server rendering are not MVP requirements.
- A client-side application is sufficient.
- Vite provides a simpler and faster development experience.

---

### Tailwind CSS

Decision:

```text
Tailwind CSS
```

Used for:

- Utility-based styling.
- Rapid MVP development.
- Consistent design implementation.

---

### shadcn/ui

Decision:

```text
shadcn/ui
```

Used for:

- Reusable UI components.
- Consistent user interface patterns.
- Faster feature development.

---

### State Management

#### Zustand

Used for:

- Client-side application state.
- Authentication state.
- Workspace selection state.
- UI state.

#### TanStack Query

Used for:

- Server state management.
- API requests.
- Data caching.
- Loading and error handling.

---

### Forms

Decision:

```text
React Hook Form
```

Used for:

- Authentication forms.
- Project creation.
- Organization settings.
- User input handling.

---

## Backend Decisions

### NestJS

Decision:

```text
NestJS
```

Reason:

- Structured backend architecture.
- Module-based organization.
- Dependency injection.
- Strong TypeScript support.

---

### REST API

Decision:

```text
REST
```

Reason:

- Simple frontend integration.
- Well understood.
- Suitable for SaaS CRUD operations.
- Works well with Swagger/OpenAPI documentation.

---

## Authentication

Decision:

```text
JWT Access Tokens
+
Refresh Tokens (httpOnly cookie, rotated on use — ADR-010)
```

Reason:

- Suitable for SPA applications.
- Supports API-first architecture.
- Works well for future mobile/API consumers.

### Authentication Flow

```text
User Login

↓

Backend generates:

Access Token
+
Refresh Token

↓

Frontend keeps Access Token in memory;
Refresh Token is set as an httpOnly cookie

↓

Cookie-only POST /api/auth/refresh obtains a new
Access Token and rotates the Refresh Token
```

---

## Database Decisions

### PostgreSQL

Decision:

```text
PostgreSQL
```

Reason:

- Strong relational model.
- Supports complex relationships.
- Suitable for multi-tenant SaaS applications.
- Supports transactions and indexing.

---

### Prisma ORM

Decision:

```text
Prisma
+
PostgreSQL Driver Adapter
```

Packages:

```text
@prisma/client

@prisma/adapter-pg

pg
```

Database access flow:

```text
NestJS Service

↓

Prisma Client

↓

PostgreSQL Adapter

↓

pg Driver

↓

PostgreSQL
```

---

### Raw SQL Strategy

Decision: Use Prisma by default.

Raw SQL is allowed only for:

- Complex reporting queries.
- Performance-critical queries.
- PostgreSQL-specific features.

---

## Development Tools

### Package Manager

Decision:

```text
pnpm
```

Reason:

- Fast dependency installation.
- Workspace support.
- Suitable for monorepos.

---

### Monorepo Tooling

Decision:

```text
Turborepo
```

Used for:

- Managing workspace tasks.
- Running builds and tests.
- Improving development workflow.

---

## Code Quality

Tools:

```text
ESLint + Prettier   (apps/api)
oxlint              (apps/web)
Husky + lint-staged (pre-commit, repository root)
```

Purpose:

- Maintain consistent code quality.
- Automate formatting.
- Prevent poor-quality commits.

---

## Testing Strategy

### Backend

```text
Jest
```

Used for:

- Unit tests of services and guards, with mocked repositories.
- E2E tests (`apps/api/test/*.e2e-spec.ts`) through the real HTTP pipeline. These cover:
  - the tenant-isolation matrix
  - the RBAC matrix
  - API keys and rate limits
  - cookie auth
  - the core workflows
- E2E tests run serially against `TEST_DATABASE_URL`, which must name a `*_test` database. CI enforces 70% line coverage of `src/**/*.service.ts`.

---

### Frontend

```text
Vitest

React Testing Library
```

Used for:

- Component testing.
- User interaction testing.

---

## Final Stack Summary

```text
Frontend

React
Vite
TypeScript
Tailwind CSS
shadcn/ui
React Router
Zustand
TanStack Query
React Hook Form


Backend

NestJS
TypeScript
REST API
JWT Authentication
Swagger/OpenAPI
class-validator


Database

PostgreSQL
Prisma ORM
@prisma/adapter-pg
pg driver


Infrastructure

Docker
Docker Compose
Redis
Managed PostgreSQL


Tooling

pnpm
Turborepo
ESLint
Prettier
Husky
lint-staged
```
