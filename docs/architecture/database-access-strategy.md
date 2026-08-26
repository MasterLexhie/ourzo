# Ourzo — Database Access Strategy

## 1. Overview

This document defines how the Ourzo application interacts with the PostgreSQL database.

The strategy defines:

- Database access technology
- ORM usage
- Raw SQL usage
- Data access patterns
- Tenant isolation enforcement
- Transaction handling
- Query optimization approach

---

## 2. Database Access Decision

### Decision

Ourzo will use a hybrid database access approach.

Primary database access:

```text
Prisma ORM
```

Database:

```text
PostgreSQL
```

Backend framework:

```text
NestJS
```

Secondary database access:

```text
Raw SQL queries for specialized workloads
```

---

## 3. Database Access Philosophy

Ourzo will follow a Prisma-first approach.

The majority of application operations will use Prisma because the platform is primarily a CRUD-based SaaS application.

Raw SQL will be introduced only when:

- Query complexity requires it.
- Performance optimization requires it.
- Aggregation workloads require it.
- PostgreSQL-specific capabilities are needed.

The goal is:

```text
Use abstraction by default.

Remove abstraction when justified.
```

---

## 4. Why Prisma ORM

Prisma is selected because:

- Strong TypeScript integration.
- Type-safe database queries.
- Schema-driven development.
- Clear relationship modeling.
- Built-in migration workflow.
- Good developer productivity.
- Suitable for SaaS application development.

---

## 5. Why Not Raw SQL Everywhere

Raw SQL provides maximum database control but introduces additional maintenance responsibility.

Using raw SQL everywhere would require manually managing:

- Query typing.
- Data mapping.
- Schema changes.
- Query consistency.
- Database relationships.

For a SaaS product with many CRUD operations, this increases development complexity without providing meaningful benefits.

---

## 6. Database Interaction Model

The application will not directly query the database from controllers.

Database access follows:

```text
Controller

    |

Service Layer

    |

Repository / Data Access Layer

    |

Prisma Client OR Raw SQL

    |

PostgreSQL
```

---

## 7. Data Access Responsibilities

### Controllers

Responsible for:

- Receiving HTTP requests.
- Validating request input.
- Returning responses.

Controllers do not:

- Execute database queries.
- Contain business rules.

### Services

Responsible for:

- Business logic.
- Workflow execution.
- Permission checks.
- Calling data access methods.

Example:

```text
Create Project Flow

1. Validate workspace access

2. Validate project rules

3. Create project

4. Create audit record

5. Trigger notification
```

### Repository / Data Access Layer

Responsible for:

- Database communication.
- Prisma queries.
- Raw SQL queries.
- Query optimization.
- Database-specific operations.

---

## 8. ORM Query Strategy

Prisma is the default database interaction method.

Used for:

- User management.
- Authentication data.
- Workspace operations.
- Membership management.
- Project CRUD.
- Task CRUD.
- Notifications.
- API key management.

Examples:

Create:

```ts
prisma.project.create()
```

Read:

```ts
prisma.project.findMany()
```

Update:

```ts
prisma.project.update()
```

Delete:

```ts
prisma.project.delete()
```

---

## 9. Raw SQL Strategy

Raw SQL is allowed for specific scenarios.

### Complex Aggregations

Examples:

```text
Workspace productivity metrics

Task completion statistics

Usage calculations
```

### Reporting Queries

Examples:

```text
Monthly activity reports

Project performance summaries

Audit history reports
```

### Performance-Critical Queries

Examples:

```text
Large audit log searches

Large dataset filtering

Complex joins
```

### PostgreSQL-Specific Features

Examples:

```text
Advanced indexing

Database functions

Specialized PostgreSQL operators
```

---

## 10. Raw SQL Rules

Raw SQL queries must:

- Be reviewed.
- Be parameterized.
- Maintain tenant isolation.
- Include proper indexes.
- Have performance justification.

Avoid raw SQL for simple CRUD operations.

---

## 11. Multi-Tenant Query Strategy

Workspace isolation is enforced at the data access layer.

Every tenant-owned entity query must include:

```text
workspace_id
```

Correct:

```ts
prisma.project.findMany({
  where: {
    workspaceId
  }
})
```

Incorrect:

```ts
prisma.project.findMany()
```

---

## 12. Tenant Isolation Rules

The following entities require workspace filtering:

- Projects
- Tasks
- Workspace Members
- Usage
- Notifications
- Audit Logs
- API Keys

---

## 13. Authentication and Database Context

Every authenticated request contains:

```text
user_id
workspace_id
```

The workspace context determines:

- Accessible records.
- Allowed operations.
- Tenant boundary.

---

## 14. Repository Pattern Decision

Ourzo will use a repository/data access layer.

Initial implementation:

```text
Service Layer

      |

Repository

      |

Prisma / Raw SQL

      |

PostgreSQL
```

### Repository Responsibilities

Repositories handle:

- Database queries.
- Entity retrieval.
- Persistence operations.
- Query optimization.

Repositories do not handle:

- Authentication.
- Business workflows.
- Permission decisions.

---

## 15. Transaction Strategy

Transactions are required when multiple database operations must succeed or fail together.

Examples:

Creating a project:

```text
Create Project

+

Create Audit Log

+

Create Notification
```

should execute inside a transaction.

Example:

```text
BEGIN TRANSACTION

Create Project

Create Audit Record

Create Notification

COMMIT
```

If any step fails:

```text
ROLLBACK
```

---

## 16. Migration Strategy

Database schema changes are managed through:

```text
Prisma Migrate
```

Migration workflow:

```text
Update Prisma Schema

        |

Generate Migration

        |

Review Migration

        |

Apply Migration

        |

Update Application Code
```

---

## 17. Prisma Schema Ownership

The Prisma schema represents the application database model.

Location:

```text
prisma/schema.prisma
```

It defines:

- Database tables.
- Relationships.
- Enums.
- Constraints.

Relationship:

```text
schema.dbml
      |
Database Design Reference


schema.prisma
      |
Application Database Model


PostgreSQL
      |
Actual Database
```

---

## 18. Serverless PostgreSQL Consideration

Ourzo can support serverless PostgreSQL providers.

Examples:

- Neon
- Supabase PostgreSQL
- Other PostgreSQL-compatible providers

Database access remains:

```text
Application

↓

Prisma

↓

PostgreSQL
```

The database hosting model does not change the application data access strategy.

---

## 19. Prisma Driver Strategy

Initial approach:

```text
Prisma Client

+

Default Prisma database driver
```

The driver approach can be evaluated during deployment based on:

- Hosting environment.
- Connection management.
- Serverless requirements.
- Performance observations.

---

## 20. Query Performance Rules

Database queries must consider:

- Index usage.
- Query size.
- Pagination.
- Relationship loading.
- Data selection.

Avoid:

- Returning unnecessary fields.
- Loading unused relationships.
- Unbounded queries.
- Duplicate database calls.

---

## 21. Pagination Strategy

Large datasets must use pagination.

Initial approach:

```text
Offset pagination
```

Example:

```text
page=1
limit=20
```

Future consideration:

```text
Cursor pagination
```

for:

- Audit logs.
- Activity feeds.
- Large task lists.

---

## 22. Relationship Loading Strategy

Related data should only be loaded when required.

Avoid:

```text
Workspace

+

All Members

+

All Projects

+

All Tasks
```

in one request.

Use explicit selection:

```text
select

include
```

based on API requirements.

---

## 23. Soft Delete Handling

Soft-deleted records must not appear in normal queries.

Entities affected:

- Workspaces.
- Projects.
- Tasks.

Default query behavior:

```text
deleted_at IS NULL
```

---

## 24. Database Error Handling

Database errors are handled at the service layer.

Examples:

- Duplicate records.
- Constraint violations.
- Missing records.
- Transaction failures.

---

## 25. Testing Strategy

### Unit Tests

Test:

- Service behavior.
- Business rules.
- Repository interactions.

### Integration Tests

Test:

- Prisma queries.
- Database operations.
- Constraints.
- Transactions.

### Tenant Isolation Tests

Verify that Workspace A users cannot access:

```text
Workspace B Projects

Workspace B Tasks

Workspace B Audit Logs
```

---

## 26. Final Database Access Architecture

```text
HTTP Request

      |

Controller

      |

Service Layer

      |

Repository Layer

      |

---------------------

Prisma ORM

OR

Raw SQL

---------------------

      |

PostgreSQL
```

---

## 27. Final Decisions

| Area | Decision |
|---|---|
| Database | PostgreSQL |
| Database access approach | Hybrid |
| Default query method | Prisma ORM |
| Complex queries | Raw SQL |
| Analytics queries | Raw SQL |
| Migration tool | Prisma Migrate |
| Data access layer | Repository pattern |
| Tenant isolation | Workspace-based filtering |
| Transactions | Prisma transactions |
| Driver strategy | Evaluate based on deployment requirements |
| Query optimization | Index-driven and workload-based |

```text
Use Prisma for application development speed.

Use raw SQL when database control or performance requires it.
```
