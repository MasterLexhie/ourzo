# Ourzo — Database Migration Strategy

## 1. Overview

This document defines the process for managing database schema changes throughout the lifecycle of the Ourzo platform.

The database migration strategy ensures that:

- Database changes are version-controlled.
- Schema changes are reproducible.
- Development and production environments remain consistent.
- Tenant isolation is preserved.
- Database evolution follows a controlled process.

---

## 2. Migration Principles

All database changes must follow these principles.

### 2.1 Version Controlled

Every schema change must exist as a migration file inside the source repository.

No undocumented manual database changes should exist.

### 2.2 Reviewable

Every migration must be reviewed before being merged.

Review should verify:

- Correct schema changes.
- Data safety.
- Tenant isolation.
- Performance impact.
- Migration compatibility.

### 2.3 Repeatable

A new environment should be able to recreate the complete database state by executing migrations sequentially.

Example:

```text
Empty Database

      |

Run Migrations

      |

Current Database Schema
```

### 2.4 Tested

Migrations must be tested before deployment.

Testing should verify:

- Migration execution.
- Schema correctness.
- Existing data compatibility.
- Application compatibility.

---

## 3. Database Migration Lifecycle

The migration lifecycle follows:

```text
Schema Change Required

        |

Update Data Design

        |

Create Migration

        |

Review Migration

        |

Apply Locally

        |

Run Tests

        |

Merge

        |

Deploy

        |

Apply Production Migration
```

---

## 4. Migration Source of Truth

The database design has two different sources.

### Current Intended Schema

Defined in:

```text
schema.dbml
```

Purpose:

- Visual database representation.
- Current database structure.
- Entity relationships.
- Design communication.

### Historical Database Changes

Defined through:

```text
migration files
```

Purpose:

- Track how the database evolved.
- Recreate database state.
- Apply incremental changes.

Relationship:

```text
schema.dbml
=
Current Desired Structure


Migration History
=
Path Used To Reach Current Structure
```

---

## 5. Development Migration Workflow

When changing the database:

### Step 1 — Update Data Design

Review:

```text
data-design.md
```

Confirm:

- New entities.
- New relationships.
- New constraints.
- New indexes.

### Step 2 — Update Schema Definition

Update `schema.dbml` to represent the intended final state.

### Step 3 — Create Migration

Generate or manually create a migration.

Example:

```text
202608240001_create_projects_table
```

### Step 4 — Review SQL

The migration should be inspected before execution.

Review:

- Created tables.
- Modified columns.
- New indexes.
- Constraints.
- Potential locking issues.

### Step 5 — Run Locally

Apply migration against the local development database.

Verify:

- Migration succeeds.
- Application starts.
- Existing features still work.

### Step 6 — Commit

The migration file must be committed together with related application changes.

---

## 6. Migration Naming Convention

Migration names should describe the change.

Example:

```text
001_create_users_table

002_create_workspaces_table

003_create_projects_table

004_add_audit_logs

005_add_workspace_usage_tracking
```

The exact numbering format depends on the selected migration framework.

---

## 7. Migration Types

### 7.1 Schema Creation

Examples:

- Creating a new table.
- Adding relationships.
- Creating indexes.

Example: `Create projects table`

### 7.2 Schema Modification

Examples:

- Adding columns.
- Changing constraints.
- Adding indexes.

Example: `Add project status field`

### 7.3 Data Migration

Used when existing records must be transformed.

Examples:

- Moving data.
- Backfilling new fields.
- Updating existing records.

### 7.4 Cleanup Migration

Used after changes have been fully adopted.

Examples:

- Removing unused columns.
- Removing deprecated structures.

---

## 8. Expand and Contract Migration Strategy

Breaking database changes should use an expand-and-contract approach.

### Phase 1 — Expand

Introduce the new structure without removing existing functionality.

Example:

```text
Old Column
+
New Column
```

### Phase 2 — Compatibility

Update application code to support the new structure.

The application can temporarily support both versions.

### Phase 3 — Data Migration

Move existing data into the new structure.

Example:

```text
Old Field

      |

Transform

      |

New Field
```

### Phase 4 — Switch

Application reads and writes use the new structure.

### Phase 5 — Contract

Remove the old structure.

Example:

```text
Remove Old Column

Remove Old Index

Remove Deprecated Table
```

---

## 9. Production Migration Process

Production migrations follow:

```text
Application Build

        |

Automated Tests

        |

Migration Review

        |

Backup Verification

        |

Apply Migration

        |

Verify Database

        |

Deploy Application
```

---

## 10. Production Migration Safety

Before applying production migrations, verify:

- Database backup availability.
- Migration execution time.
- Locking behavior.
- Application compatibility.
- Rollback/recovery strategy.

---

## 11. Rollback Strategy

Not every migration can safely be reversed.

### Reversible Migration

Example: Adding a nullable column.

Possible rollback:

```text
Remove Column
```

### Irreversible Migration

Example: Deleting data.

Rollback requires:

- Backup restoration.
- Data recovery process.
- Compensating migration.

---

## 12. Database Backup Considerations

Before destructive migrations, confirm:

- Backup exists.
- Backup restoration process works.
- Recovery point is acceptable.

---

## 13. Tenant Isolation Requirements

Every migration affecting tenant-owned data must preserve workspace isolation.

Affected entities include:

- Projects.
- Tasks.
- Members.
- Usage.
- Audit logs.
- API keys.

### Example

Invalid migration result:

```text
Task

workspace_id = Workspace A

project_id = Project belonging to Workspace B
```

Valid migration result:

```text
Task

workspace_id = Workspace A

project_id = Project belonging to Workspace A
```

---

## 14. Index Migration Strategy

Indexes should be created based on actual application query patterns.

Avoid unnecessary indexes because they:

- Increase storage usage.
- Slow writes.
- Increase migration time.

Before adding an index, evaluate:

- Query frequency.
- Query performance.
- Table size.
- Write impact.

---

## 15. Foreign Key Migration Strategy

Foreign keys protect data integrity.

Before adding a foreign key, check:

- Existing records comply.
- No orphaned records exist.
- Constraint creation will succeed.

Process:

```text
Inspect Existing Data

        |

Fix Invalid Records

        |

Create Constraint
```

---

## 16. Large Data Migration Strategy

Large migrations should avoid long blocking operations.

Recommended approach:

- Process data in batches.
- Avoid unnecessary table locks.
- Monitor execution.
- Make operations restartable.

Example:

```text
1000000 Records

      |

Process 1000 at a time

      |

Complete Migration
```

---

## 17. CI Database Validation

Continuous integration should verify:

### Fresh Database Creation

```text
Empty Database

      |

Run All Migrations

      |

Application Database Ready
```

### Migration Execution

Verify:

- All migrations run successfully.
- No migration conflicts exist.

### Application Testing

Run tests against the migrated database.

---

## 18. Migration Review Checklist

Before merging a migration:

```text
[ ] Schema change matches requirements

[ ] Tenant isolation is preserved

[ ] Foreign keys are correct

[ ] Constraints are correct

[ ] Indexes are justified

[ ] Existing data is handled

[ ] Migration has been tested locally

[ ] CI passes

[ ] Rollback/recovery approach is understood
```

---

## 19. Migration Folder Structure

Example:

```text
database/

└── migrations/

    ├── 001_create_users.sql

    ├── 002_create_workspaces.sql

    ├── 003_create_workspace_members.sql

    ├── 004_create_projects.sql

    ├── 005_create_tasks.sql

    └── 006_create_audit_logs.sql
```

The exact structure depends on the migration framework selected during implementation.

---

## 20. Database Evolution Example

Example evolution:

```text
Initial Database

      |

Add Workspaces

      |

Add Projects

      |

Add Tasks

      |

Add Multi-Tenant Permissions

      |

Add Audit System

      |

Current Database
```

---

## 21. Final Principle

Database changes are application changes.

They require the same discipline as source code:

- Design.
- Review.
- Testing.
- Version control.
- Deployment process.

The goal is to ensure the Ourzo database can safely evolve while maintaining reliability, security, and tenant isolation.
