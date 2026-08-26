# Ourzo — Backend Architecture

## Purpose

This document defines the backend architecture for the Ourzo SaaS platform.

The goal is to establish:

- Clear backend organization.
- Maintainable business logic boundaries.
- Consistent NestJS patterns.
- Separation between API, business logic, and database access.

---

## Backend Technology

Backend application:

```text
NestJS
TypeScript
Prisma
PostgreSQL
```

Location:

```text
apps/api
```

---

## Architecture Approach

Ourzo uses a modular backend architecture based on NestJS modules.

Structure:

```text
Controller

↓

Service

↓

Repository / Prisma Access

↓

Database
```

---

## Backend Responsibilities

The backend is responsible for:

- Authentication.
- Authorization.
- Multi-tenancy enforcement.
- Business rules.
- Data validation.
- Database operations.
- API exposure.

---

## Application Structure

```text
apps/api/

├── src/
│
│   ├── auth/
│   ├── users/
│   ├── organizations/
│   ├── memberships/
│   ├── projects/
│   ├── tasks/
│   ├── permissions/
│   ├── notifications/
│   ├── audit/
│   ├── usage/
│   ├── api-keys/
│   │
│   ├── prisma/
│   ├── config/
│   └── common/
│
├── prisma/
├── test/
└── package.json
```

---

## Module Organization

Each feature follows NestJS module conventions.

Example:

```text
projects/

├── projects.module.ts
├── projects.controller.ts
├── projects.service.ts
│
├── dto/
│   ├── create-project.dto.ts
│   └── update-project.dto.ts
│
├── repositories/
│   └── projects.repository.ts
│
└── entities/
```

---

## Controller Layer

Responsibility:

- Handle HTTP requests.
- Validate incoming requests.
- Return API responses.
- Delegate business logic.

Example flow:

```text
HTTP Request

↓

Controller

↓

Service
```

Controllers should not contain:

- Database queries.
- Business rules.
- Complex logic.

---

## Service Layer

Responsibility:

- Business logic.
- Application rules.
- Coordination between modules.

Example:

```text
Create Project

↓

Check Organization Membership

↓

Validate Permissions

↓

Create Project

↓

Record Audit Event
```

---

## Database Access Layer

Decision:

```text
Prisma ORM
+
Selective Raw SQL
```

Database flow:

```text
Service

↓

Prisma Repository

↓

Prisma Client

↓

PostgreSQL Adapter

↓

PostgreSQL
```

---

## Prisma Integration

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

Responsibilities:

- Create Prisma Client.
- Manage database connection.
- Provide database access.

---

## API Structure

Ourzo uses:

```text
REST API
```

API organization:

```text
/api

├── auth
├── users
├── organizations
├── projects
└── tasks
```

---

## Authentication Architecture

Decision:

```text
JWT Access Token
+
Refresh Token
```

Authentication flow:

```text
User Login

↓

Validate Credentials

↓

Generate Tokens

↓

Return Tokens

↓

Authenticated API Requests
```

---

## Authorization Architecture

Authorization is handled separately from authentication.

Authentication answers:

```text
Who is the user?
```

Authorization answers:

```text
What can the user do?
```

Ourzo uses:

```text
RBAC
+
Resource-level permissions
```

---

## Multi-Tenancy Architecture

Ourzo uses organization-based tenancy.

Structure:

```text
User

↓

Organization

↓

Projects

↓

Tasks
```

Every tenant-owned resource must include organization context.

Example:

```text
Project → organization_id

User → organization_id
```

---

## Validation

Decision:

```text
class-validator
```

Validation occurs through:

```text
Request

↓

DTO Validation

↓

Controller

↓

Service
```

---

## Error Handling

Backend uses:

- NestJS exception filters.
- Standard API error responses.
- HTTP status codes.

Example:

```json
{
  "statusCode": 404,
  "message": "Project not found"
}
```

---

## Configuration

Configuration is managed through:

```text
NestJS ConfigModule
```

Responsibilities:

- Environment loading.
- Configuration validation.
- Application settings.

---

## Logging

Decision:

```text
NestJS Logger
```

Used for:

- Application startup.
- Errors.
- Important system events.

---

## API Documentation

Decision:

```text
Swagger/OpenAPI
```

Available during development:

```text
/api/docs
```

Purpose:

- API discovery.
- Frontend integration.
- Testing.

---

## Testing Strategy

Backend testing:

```text
Jest
```

### Unit Tests

Used for:

- Services.
- Business rules.
- Utility functions.

### Integration Tests

Used for:

- Prisma operations.
- Database behaviour.
- Tenant isolation.

### End-to-End Tests

Used for:

- Complete user workflows.
- Authentication flows.
- Permission checks.

---

## Backend Design Principles

The backend follows:

- Modular architecture.
- Separation of concerns.
- Explicit business rules.
- Database ownership within backend.
- Secure tenant isolation.
- Testable services.
