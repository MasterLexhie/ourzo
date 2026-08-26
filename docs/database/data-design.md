# Ourzo — Data Design

## 1. Overview

Ourzo is a multi-tenant SaaS platform designed as a lightweight project and workspace organizer for startups and SMEs.

The platform uses a shared-schema multi-tenant architecture.

The primary tenant boundary is the `workspace`.

Every tenant-owned resource must be associated with a workspace to ensure proper data isolation.

---

## 2. Data Architecture Principles

### 2.1 Multi-Tenant Data Model

Ourzo uses a shared database and shared schema approach.

All customers share the same database structure while tenant data is isolated logically through workspace ownership.

Example:

```text
Workspace A
 ├── Members
 ├── Projects
 ├── Tasks
 ├── Usage Records
 ├── Audit Logs
 └── API Keys


Workspace B
 ├── Members
 ├── Projects
 ├── Tasks
 ├── Usage Records
 ├── Audit Logs
 └── API Keys
```

---

### 2.2 Tenant Boundary

The workspace is the root ownership entity.

Tenant-owned resources must always contain a reference to their workspace.

Examples:

```text
Project → Workspace

Task → Workspace

API Key → Workspace

Audit Log → Workspace
```

---

### 2.3 Data Integrity Responsibility

The database is responsible for:

- Entity relationships
- Foreign key enforcement
- Unique constraints
- Required fields
- Data consistency

The application layer is responsible for:

- Authentication
- Authorization
- Role-based access control
- Permission checks
- Business rules
- Plan enforcement

---

## 3. Core Entities

The initial Ourzo data model contains:

| Entity | Purpose |
|---|---|
| Users | Represents platform user accounts |
| Workspaces | Represents customer/company tenants |
| Workspace Members | Controls workspace access |
| Projects | Represents business projects |
| Project Members | Controls project-level access |
| Tasks | Represents project work items |
| Usage | Tracks workspace resource consumption |
| Notifications | Stores user notifications |
| Audit Logs | Stores system activity history |
| API Keys | Provides programmatic access |

---

## 4. Entity Ownership Model

| Entity | Tenant Owned | Ownership Model |
|---|---|---|
| User | No | Platform-level entity |
| Workspace | Yes | Tenant root entity |
| Workspace Member | Yes | Workspace-owned relationship |
| Project | Yes | Owned by workspace |
| Project Member | Yes | Owned through project/workspace |
| Task | Yes | Owned by workspace and project |
| Usage | Yes | Owned by workspace |
| Notification | Yes | Owned by workspace/user |
| Audit Log | Yes | Owned by workspace |
| API Key | Yes | Owned by workspace |

---

## 5. Users

### Purpose

Users represent individuals who access the Ourzo platform.

Users are platform-level entities and are not directly tied to a single workspace.

A single user may belong to multiple workspaces.

### Main Responsibilities

Users provide:

- Authentication identity
- Account information
- Workspace access relationships

### Important Attributes

```text
id
email
password_hash
first_name
last_name
email_verified_at
created_at
updated_at
```

### Rules

- Email addresses must be unique.
- Passwords must never be stored in plaintext.
- User identity exists independently from workspace membership.

---

## 6. Workspaces

### Purpose

A workspace represents a tenant/customer environment.

Examples:

- A startup team
- An SME organization
- A company department

### Main Responsibilities

A workspace owns:

- Members
- Projects
- Tasks
- Usage information
- Notifications
- Audit history
- API keys

### Important Attributes

```text
id
name
slug
plan
created_at
updated_at
deleted_at
```

### Rules

- Workspace identifiers must be unique.
- Workspace data must never be accessible outside its tenant boundary.
- Deleted workspaces should not appear in normal application workflows.

---

## 7. Workspace Members

### Purpose

Workspace members represent the relationship between users and workspaces.

Relationship:

```text
User

  |

Workspace Member

  |

Workspace
```

### Relationship Type

Many-to-many.

A user can belong to multiple workspaces.

A workspace can contain multiple users.

### Roles

Initial workspace roles:

```text
owner
admin
member
```

### Rules

- A user cannot have duplicate membership in the same workspace.
- Every workspace member must reference an existing user.
- Every workspace member must reference an existing workspace.

---

## 8. Projects

### Purpose

Projects represent organized business initiatives inside a workspace.

Examples:

- Website redesign
- Mobile application
- Marketing campaign
- Internal improvement project

### Ownership

A project belongs to exactly one workspace.

Relationship:

```text
Workspace

    |

 Projects
```

### Important Attributes

```text
id
workspace_id
name
description
status
start_date
target_date
created_by
created_at
updated_at
deleted_at
```

### Project Lifecycle

Project states:

```text
planned
in_progress
paused
completed
archived
```

### Design Decision

Project status is manually managed.

It is not automatically calculated from task completion.

Reason:

A project may:

- Be paused while unfinished tasks exist.
- Require approval before completion.
- Be archived after completion.

---

## 9. Project Members

### Purpose

Project members define which workspace users participate in a project.

Relationship:

```text
Workspace Member

        |

Project Member

        |

Project
```

### Rules

A project member:

- Must belong to the project workspace.
- Cannot exist without a valid project.
- Cannot be duplicated within the same project.

---

## 10. Tasks

### Purpose

Tasks represent actionable work inside projects.

### Ownership

A task belongs to:

- One workspace
- One project

Relationship:

```text
Workspace

    |

Project

    |

Task
```

### Important Attributes

```text
id
workspace_id
project_id
title
description
status
priority
assignee_id
due_date
created_by
created_at
updated_at
deleted_at
```

### Task Status

Initial task states:

```text
todo
in_progress
completed
cancelled
```

### Task Priority

Initial priorities:

```text
low
medium
high
urgent
```

### Tenant Integrity Rule

A task workspace must match its project workspace.

Valid:

```text
Workspace A

 └── Project A

      └── Task A
```

Invalid:

```text
Workspace A

 └── Task A

      └── Project from Workspace B
```

---

## 11. Usage

### Purpose

Usage tracking supports SaaS functionality.

It enables:

- Plan limits
- Usage monitoring
- Future billing features

### Tracked Resources

Initial resources:

```text
members
projects
tasks
api_keys
```

### Important Attributes

```text
id
workspace_id
resource
count
period_start
period_end
created_at
updated_at
```

### Rules

Usage belongs to the workspace.

Usage data should not be calculated from individual users.

---

## 12. Notifications

### Purpose

Notifications provide application-level communication.

Examples:

- Workspace invitations
- Project assignments
- Usage warnings
- System events

### Important Attributes

```text
id
workspace_id
user_id
type
title
message
read_at
created_at
```

### Rules

A notification belongs to:

- One workspace
- One recipient user

---

## 13. Audit Logs

### Purpose

Audit logs provide a historical record of important system actions.

Examples:

```text
User invited member

Project created

Role changed

API key generated
```

### Important Attributes

```text
id
workspace_id
actor_id
action
resource_type
resource_id
metadata
created_at
```

### Rules

Audit logs are append-only.

They should not contain:

- Passwords
- Authentication tokens
- API secrets
- Sensitive credentials

---

## 14. API Keys

### Purpose

API keys provide external programmatic access to Ourzo.

### Important Attributes

```text
id
workspace_id
created_by
name
key_prefix
key_hash
scopes
last_used_at
expires_at
revoked_at
created_at
```

### Security Rules

The raw API key is only displayed once.

Stored:

```text
key_hash
```

Never stored:

```text
raw_key
```

---

## 15. Entity Relationships

### User ↔ Workspace

Type: Many-to-many

Implemented through: `workspace_members`

### Workspace → Projects

Type: One-to-many

### Project → Tasks

Type: One-to-many

### Project ↔ Users

Type: Many-to-many

Implemented through: `project_members`

### Workspace → Usage

Type: One-to-many

### Workspace → Notifications

Type: One-to-many

### Workspace → Audit Logs

Type: One-to-many

### Workspace → API Keys

Type: One-to-many

---

## 16. Indexing Strategy

Indexes should be created based on expected query patterns.

### Users

Primary lookup: `email`

Purpose: Authentication lookup.

### Workspaces

Primary lookup: `slug`

Purpose: Workspace identification.

### Workspace Members

Indexes:

```text
workspace_id
user_id
(workspace_id, user_id)
```

### Projects

Indexes:

```text
workspace_id
(workspace_id, status)
(workspace_id, created_at)
```

### Tasks

Indexes:

```text
workspace_id
project_id
assignee_id
(workspace_id, status)
(project_id, status)
due_date
```

### Audit Logs

Indexes:

```text
workspace_id
(workspace_id, created_at)
actor_id
(resource_type, resource_id)
```

---

## 17. Soft Delete Strategy

Soft deletion is used where historical references are valuable.

Resources using soft delete:

- Workspaces
- Projects
- Tasks

### Implementation

```text
deleted_at TIMESTAMP NULL
```

### Active Records

```text
deleted_at IS NULL
```

### Deleted Records

```text
deleted_at IS NOT NULL
```

### Audit Logs

Audit logs are not soft deleted.

They represent historical system records.

---

## 18. Database Evolution

Database changes must be:

- Version controlled
- Reviewed
- Tested
- Applied through migrations

The schema should never depend on undocumented manual changes.

---

## 19. Data Model Summary

```text
Users

    |

Workspace Members

    |

Workspaces

    |
    |---- Projects
    |          |
    |          |---- Tasks
    |
    |---- Usage
    |
    |---- Notifications
    |
    |---- Audit Logs
    |
    |---- API Keys
```

---

## 20. Related Documents

This document defines the data model.

Database visualization schema:

```text
schema.dbml
```

Database evolution process:

```text
database-migrations.md
```
