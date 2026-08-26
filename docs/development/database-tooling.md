# Ourzo — Database Tooling

## Purpose

This document defines the database technology choices, Prisma setup approach, and database access strategy for the Ourzo SaaS platform.

The goal is to establish:

- A consistent database development workflow.
- Clear ownership of database operations.
- A maintainable ORM strategy.
- A path for performance optimization when required.

---

## Database Technology

### Database

Decision:

```text
PostgreSQL
```

Reason:

PostgreSQL is selected because it provides:

- Strong relational data modelling.
- Transaction support.
- Advanced indexing capabilities.
- Reliable consistency guarantees.
- Support for multi-tenant SaaS architectures.

---

## Database Ownership

The backend owns all database concerns.

Database responsibilities belong to:

```text
apps/api
```

The frontend does not directly access PostgreSQL.

Data flow:

```text
React Frontend

↓

REST API

↓

NestJS Backend

↓

Prisma

↓

PostgreSQL
```

---

## ORM Decision

Decision:

```text
Prisma ORM
```

Prisma is used as the primary database access layer.

Reasons:

- Strong TypeScript integration.
- Type-safe database queries.
- Schema-driven migrations.
- Developer productivity.
- Clear database modelling.

---

## Prisma PostgreSQL Adapter

Decision:

```text
@prisma/adapter-pg
```

with:

```text
pg PostgreSQL driver
```

Packages:

```text
@prisma/client

@prisma/adapter-pg

pg
```

---

## Database Access Flow

Ourzo database communication:

```text
NestJS Service

↓

Prisma Service

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

## Prisma Location

Prisma belongs inside the backend application.

Location:

```text
apps/api/prisma
```

Structure:

```text
apps/api/

├── prisma/
│
│   ├── schema.prisma
│   ├── prisma.config.ts
│   ├── migrations/
│   └── seed.ts
│
└── src/
    └── prisma/
        ├── prisma.module.ts
        └── prisma.service.ts
```

---

## Prisma Schema

The Prisma schema defines:

- Database models.
- Relationships.
- Constraints.
- Indexes.

Location:

```text
apps/api/prisma/schema.prisma
```

Example responsibility:

```text
User
Organization
Membership
Project
Task
```

---

## Prisma Configuration

Prisma configuration is managed through:

```text
prisma.config.ts
```

Responsibilities:

- Define schema location.
- Configure datasource connection.
- Load environment configuration.

---

## Prisma Client Initialization

Prisma Client is initialized through the PostgreSQL adapter.

Flow:

```text
Application Startup

↓

Create PostgreSQL Adapter

↓

Initialize Prisma Client

↓

Connect To Database
```

The Prisma Client should be managed through a NestJS service.

---

## NestJS Prisma Module

Location:

```text
apps/api/src/prisma
```

Structure:

```text
prisma/

├── prisma.module.ts
├── prisma.service.ts
└── prisma.client.ts
```

### Prisma Module

Provides Prisma service through dependency injection.

### Prisma Service

- Manages Prisma lifecycle.
- Provides database access to application services.

---

## Migration Strategy

Decision:

```text
Prisma Migrations
```

Database changes must be performed through migrations.

Workflow:

```text
Modify schema.prisma

↓

Create migration

↓

Review migration

↓

Apply migration
```

Development:

```bash
pnpm prisma migrate dev
```

Production:

```bash
pnpm prisma migrate deploy
```

---

## Database Seeding

Decision: Use Prisma seed scripts.

Location:

```text
apps/api/prisma/seed.ts
```

Purpose: Provide development data.

Examples:

- Test users.
- Sample organizations.
- Sample projects.

---

## Query Strategy

Decision:

```text
Prisma Client First
+
Selective Raw SQL
```

### Default Query Approach

Application services use Prisma Client.

Example:

```text
Service

↓

Prisma Query

↓

Database
```

Benefits:

- Type safety.
- Easier maintenance.
- Consistent development patterns.

### Raw SQL Usage

Raw SQL is allowed when justified.

Examples:

- Complex reporting.
- Heavy aggregation.
- PostgreSQL-specific functionality.
- Performance-critical operations.

Raw SQL should not replace normal application queries.

---

## Connection Management

Database connections are managed through:

```text
PostgreSQL Driver Adapter
+
pg connection handling
```

The application should avoid manually creating database connections outside Prisma.

---

## Database Environments

### Development

Database:

```text
ourzo_dev
```

Purpose: Local development and feature development.

### Testing

Database:

```text
ourzo_test
```

Purpose: Automated tests and integration tests.

### Production

Database:

```text
Managed PostgreSQL
```

Purpose: Production workloads, automated backups, reliability.

---

## Database Testing Strategy

Testing uses a dedicated test database.

Structure:

```text
Development Database → ourzo_dev

Testing Database → ourzo_test
```

Reason:

- Prevent tests from modifying development data.
- Allow realistic database testing.
- Validate Prisma queries against PostgreSQL.

### Unit Tests

Mock external dependencies where appropriate.

Used for:

- Business logic.
- Services.

### Integration Tests

Use a real PostgreSQL test database.

Used for:

- Prisma queries.
- Database relationships.
- Constraints.
- Tenant isolation.

### End-to-End Tests

Validate:

- API workflows.
- Authentication.
- Authorization.
- Complete user flows.

---

## Database Principles

Ourzo database strategy follows:

- PostgreSQL as the source of truth.
- Prisma as the default access layer.
- Raw SQL only when justified.
- Migration-driven schema changes.
- Backend-controlled database access.
- Separate development and testing databases.
