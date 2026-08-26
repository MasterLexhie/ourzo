# Ourzo Functional Requirements

## Authentication

- **FR-001:** Users can register with email and password.
- **FR-002:** Users can log in and log out.
- **FR-003:** Users can verify their email.
- **FR-004:** Users can reset their password.
- **FR-005:** Protected resources require an authenticated session.

---

## Workspace / Tenant Management

- **FR-006:** A user can create a workspace.
- **FR-007:** The workspace creator becomes its Owner.
- **FR-008:** A user can belong to multiple workspaces.
- **FR-009:** Users can switch between workspaces they belong to.
- **FR-010:** Workspace resources are isolated from other workspaces.
- **FR-011:** Users can view only workspaces they belong to.
- **FR-012:** A workspace can be soft-deleted.

---

## Membership and RBAC

- **FR-013:** Owners and Admins can invite users.
- **FR-014:** Users can accept valid invitations.
- **FR-015:** Invitations expire after seven days.
- **FR-016:** Owners and Admins can remove members.
- **FR-017:** Owners can transfer ownership.
- **FR-018:** Authorized users can change member roles.
- **FR-019:** The API enforces role permissions independently of the frontend.
- **FR-020:** The system supports Owner, Admin, and Member roles.
- **FR-021:** Custom roles are not supported in the MVP.

---

## Projects and Tasks

- **FR-022:** Authorized users can create projects.
- **FR-023:** Projects belong to exactly one workspace.
- **FR-024:** Projects can have members.
- **FR-025:** Projects support Planned, In Progress, Paused, Completed, and Archived statuses.
- **FR-026:** Projects contain tasks.
- **FR-027:** Tasks belong to exactly one project.
- **FR-028:** Tasks support Todo, In Progress, Blocked, and Completed statuses.
- **FR-029:** Authorized users can create, update, and archive projects.
- **FR-030:** Authorized users can create and update tasks.
- **FR-031:** Project progress can be calculated from completed tasks.
- **FR-032:** Subtasks are outside the MVP.

---

## Usage and Plans

- **FR-033:** Each workspace has a plan.
- **FR-034:** The MVP supports Free, Pro, and Business plans.
- **FR-035:** Plans define resource limits.
- **FR-036:** The system records workspace usage.
- **FR-037:** The system checks limits before applicable operations.
- **FR-038:** The system blocks operations that exceed hard limits.
- **FR-039:** The system provides usage warnings.
- **FR-040:** Monthly usage can reset at the beginning of a billing period.

---

## API Keys and Rate Limiting

- **FR-041:** Owners can create API keys.
- **FR-042:** API keys belong to a workspace.
- **FR-043:** API keys support scopes.
- **FR-044:** API keys can be revoked.
- **FR-045:** Revoked keys cannot authenticate requests.
- **FR-046:** API requests are associated with the correct workspace.
- **FR-047:** API requests are rate-limited.
- **FR-048:** Stored API keys are not recoverable in plaintext.

---

## Audit Logs

- **FR-049:** Security-sensitive actions generate audit events.
- **FR-050:** Workspace membership changes generate audit events.
- **FR-051:** Project lifecycle changes generate audit events.
- **FR-052:** API-key actions generate audit events.
- **FR-053:** Authorized users can query workspace audit logs.
- **FR-054:** Audit records cannot be modified through normal application operations.
- **FR-055:** Audit records include actor, action, resource, workspace, and timestamp.

---

## Notifications

- **FR-056:** The system creates notifications for relevant events.
- **FR-057:** Users can view their notifications.
- **FR-058:** Users can mark notifications as read.
- **FR-059:** Users cannot access another user's notifications.

---

## Tenant Isolation — Critical Requirements

- **FR-060:** Every tenant-owned resource is associated with a workspace.
- **FR-061:** Every workspace-scoped API operation validates workspace membership.
- **FR-062:** A user cannot access another workspace's projects by manipulating resource IDs.
- **FR-063:** A user cannot access another workspace's tasks by manipulating resource IDs.
- **FR-064:** An API key from Workspace A cannot access Workspace B.
- **FR-065:** Cross-tenant access attempts are rejected.
- **FR-066:** Tenant-isolation tests cover every major tenant-owned resource.
- **FR-067:** Tenant boundaries are enforced server-side and are not dependent on frontend behavior.

---

## System Administration

- **FR-068:** System Admins can view platform-level organizations.
- **FR-069:** System Admins can manage platform-level users/organizations where necessary.
- **FR-070:** System Admin permissions are separate from tenant-level permissions.

---

## Engineering Interpretation

The requirements above should be implemented as a **modular monolith** for the MVP.

The project-management domain is intentionally lightweight.

The primary engineering demonstration is the implementation and verification of:

- Multi-tenancy
- Tenant isolation
- Authentication
- RBAC
- Resource-level authorization
- Usage metering
- API-key security
- Rate limiting
- Auditability
- Automated testing
- Basic observability
