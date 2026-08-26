# Ourzo — Multi-Tenancy Strategy

## 1. Tenant Definition

For Ourzo:

> Workspace = Tenant

A user can belong to multiple workspaces.

```text
User
 ├── Workspace A
 ├── Workspace B
 └── Workspace C
```

Each workspace represents an isolated customer/team environment.

---

## 2. Selected Tenancy Model

Ourzo uses:

> Shared application + shared PostgreSQL database + shared schema + explicit `workspace_id` tenant isolation

```text
                 Ourzo
                   │
          ┌────────┴────────┐
          │                 │
     Workspace A       Workspace B
          │                 │
          └────────┬────────┘
                   │
             PostgreSQL
             Shared Schema
```

The MVP does not use:

- Database-per-tenant
- Schema-per-tenant
- Separate backend deployment per tenant

---

## 3. Tenant-Owned Resources

The following resources are tenant-scoped:

- Projects
- Tasks
- Workspace memberships
- Usage
- Notifications
- Audit logs
- API keys
- Workspace settings

Users are platform-level entities. Workspace membership determines tenant access.

---

## 4. Tenant Context

Every authenticated request accessing tenant data must have a resolved workspace context.

```text
Request
   ↓
Authentication
   ↓
User
   ↓
Workspace Context
   ↓
Membership Verification
   ↓
Authorization
   ↓
Tenant Resource
```

The backend must not trust an arbitrary workspace ID supplied by the client.

---

## 5. Tenant Isolation

Tenant isolation exists at multiple levels.

### Application Level

Business operations execute within the resolved workspace context.

### Authorization Level

The user must belong to the workspace and have the required permission.

### Resource Level

The requested resource must belong to the current workspace.

Example:

```text
User → Workspace A
Project → Workspace B

Access = DENIED
```

---

## 6. Repository-Level Tenant Scoping

Tenant-owned repositories should require workspace context.

Preferred:

```text
findProject(projectId, workspaceId)
```

rather than:

```text
findProject(projectId)
```

This reduces the possibility of accidentally performing unscoped tenant queries.

---

## 7. Tenant Isolation Testing

Tenant isolation is a P0 security requirement.

Tests must verify:

```text
Tenant A → Tenant A resource = ALLOWED
Tenant A → Tenant B resource = DENIED
```

Tests should cover:

- Read
- Create
- Update
- Delete
- List
- Search
- API access
- Membership
- Audit logs
- Usage
- Notifications

Resource-ID manipulation must also be tested.

---

## 8. Future Scalability

Potential future evolution:

```text
Shared Schema
     ↓
Database Optimization
     ↓
Read Replicas / Partitioning
     ↓
Tenant Sharding
     ↓
Schema / Database Isolation for Selected Tenants
```

These are not implemented prematurely.
