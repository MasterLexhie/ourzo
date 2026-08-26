# Phase 1.7 — Acceptance Criteria

## 1. Authentication

- A user can register with a valid email and password.
- Invalid registration data is rejected.
- A registered user can log in.
- Invalid credentials are rejected.
- Protected endpoints reject unauthenticated requests.
- Passwords are never stored in plaintext.
- A user can log out.
- Logout invalidates the appropriate authentication state.
- A user can initiate a password-reset flow.
- A password-reset token is single-use and expires.
- A verified user's authentication state is handled correctly.
- Authentication failures do not expose sensitive information.

---

## 2. Workspace / Tenant Management

- An authenticated user can create a workspace.
- The workspace creator automatically becomes an **Owner**.
- A user can belong to multiple workspaces.
- A user can switch between workspaces they belong to.
- A user cannot switch into a workspace they do not belong to.
- Every tenant-owned resource is associated with exactly one workspace.
- Workspace data is isolated from other workspaces.
- Workspace settings can only be accessed by authorized members.
- Workspace deletion is restricted to the Owner.
- Workspace deletion follows the defined soft-delete behavior.
- Deleted workspaces cannot be accessed through normal application flows.

### Critical Tenant-Isolation Acceptance

The following must all fail when attempted across tenant boundaries:

- Reading another workspace's project.
- Updating another workspace's project.
- Deleting another workspace's project.
- Reading another workspace's task.
- Updating another workspace's task.
- Reading another workspace's members.
- Reading another workspace's usage.
- Reading another workspace's audit logs.
- Accessing another workspace's notifications.
- Using an API key from Workspace A against Workspace B.
- Manipulating resource IDs to bypass tenant boundaries.

---

## 3. Workspace Membership and RBAC

### Owner

- Owner can manage workspace settings.
- Owner can invite members.
- Owner can remove members.
- Owner can change member roles.
- Owner can transfer ownership.
- Owner can manage workspace projects.
- Owner can view workspace usage.
- Owner can manage API keys.
- Owner can view audit logs.
- Owner can delete the workspace.

### Admin

- Admin can invite members.
- Admin can remove members where permitted.
- Admin can manage projects.
- Admin can manage project membership.
- Admin can view usage.
- Admin can view audit logs.
- Admin cannot transfer ownership.
- Admin cannot delete the workspace.
- Admin cannot perform Owner-only actions.

### Member

- Member can access permitted workspace resources.
- Member can access permitted projects.
- Member can work with permitted tasks.
- Member cannot manage workspace members.
- Member cannot change roles.
- Member cannot manage API keys.
- Member cannot view restricted workspace administration functions.
- Member cannot delete the workspace.

### General RBAC

- Roles are enforced by the backend.
- Frontend restrictions are not treated as security controls.
- Unauthorized operations return an appropriate authorization error.
- Privilege escalation attempts are rejected.
- A user cannot assign themselves a higher role.
- A user cannot modify another member's role unless authorized.
- A workspace cannot be left without an Owner.

---

## 4. Invitations

- Owners can invite users.
- Admins can invite users.
- Invitations contain securely generated tokens.
- Invitation tokens expire after seven days.
- Expired invitations cannot be accepted.
- An invitation can only be accepted once.
- A user cannot be added to the same workspace more than once.
- Invalid invitations are rejected.
- Invitations can be cancelled by authorized users.
- Accepted invitations cannot be reused.
- Removed members lose workspace access.
- Invitation events are auditable.

---

## 5. Lightweight Project Management

### Project Model

Projects are **first-class tenant-owned resources**.

Each project has:

- Name
- Description
- Owner
- Members
- Status
- Tasks
- Progress
- Created timestamp
- Updated timestamp

### Project Lifecycle

Projects support:

| Status | Meaning |
|---|---|
| **Planned** | Project has been defined but work has not started |
| **In Progress** | Active work is currently happening |
| **Paused** | Work has intentionally been suspended |
| **Completed** | Project objectives have been completed |
| **Archived** | Project is no longer active but retained for historical purposes |

### Project Acceptance

- Authorized users can create projects.
- Projects belong to exactly one workspace.
- Projects cannot be accessed across tenant boundaries.
- Authorized users can update project information.
- Authorized users can change project status.
- Only valid project statuses can be stored.
- Project lifecycle status is independent of task status.
- A project can be **Paused** while its tasks retain their existing statuses.
- A paused project remains accessible.
- A paused project retains its tasks and historical information.
- A completed project remains accessible.
- Archived projects are read-only through normal application operations.
- Project members must belong to the same workspace.
- Unauthorized users cannot modify projects.
- Project lifecycle changes are recorded in the audit log.

### Project Progress

Project progress is calculated from task completion.

For example:

```text
10 total tasks
6 completed

Project progress = 60%
```

The following distinction must be maintained:

```text
Project status ≠ Task status ≠ Project progress
```

Project progress must **not automatically determine** whether a project is Planned, In Progress, Paused, Completed, or Archived.

---

## 6. Lightweight Tasks

Tasks exist to represent work within a project.

Each task supports:

- Title
- Description
- Status
- Priority
- Assignee
- Due date
- Project
- Created timestamp
- Updated timestamp

### Task Statuses

- Todo
- In Progress
- Blocked
- Completed

### Task Acceptance

- Authorized users can create tasks.
- A task belongs to exactly one project.
- A task inherits the project's tenant boundary.
- A task cannot be accessed across tenant boundaries.
- A task cannot be moved into another workspace's project.
- Tasks can be assigned to appropriate workspace/project members.
- Authorized users can update task information.
- Authorized users can change task status.
- Completed tasks contribute to project progress.
- Task status does not automatically change project status.
- Project status does not automatically change task status.
- Unauthorized users cannot modify tasks.
- Invalid task statuses are rejected.

### Explicit MVP Boundary

Subtasks are **not part of the MVP**.

The project-management functionality must remain intentionally lightweight.

The product is not intended to become a Jira, Linear, Asana, or Monday.com clone.

---

## 7. Usage and Plans

- Every workspace has a plan.
- MVP plans are Free, Pro, and Business.
- Each plan has defined resource limits.
- Usage is tracked per workspace.
- Usage from one workspace cannot affect another workspace.
- Usage is checked before consuming a limited resource.
- Operations that exceed hard limits are rejected.
- Users receive usage warnings before relevant limits are reached.
- Usage resets correctly at the beginning of a new period.
- Usage calculations are consistent between backend and frontend.
- Users can view their workspace's current usage.
- Unauthorized users cannot access restricted usage information.

---

## 8. Audit Logs

- Defined security-sensitive operations generate audit events.
- Workspace membership changes generate audit events.
- Role changes generate audit events.
- Project lifecycle changes generate audit events.
- API-key actions generate audit events.
- Important security failures can generate audit events.
- Audit records identify the actor.
- Audit records identify the workspace.
- Audit records identify the action.
- Audit records identify the affected resource where applicable.
- Audit records include a timestamp.
- Normal users cannot modify audit records.
- Normal users cannot delete audit records.
- Authorized Owners/Admins can query workspace audit logs.
- Users cannot query another workspace's audit logs.
- Audit retention follows the defined 90-day MVP policy.

---

## 9. Notifications

- Relevant system events generate notifications.
- Notifications belong to the correct user.
- Notifications are associated with the appropriate workspace context.
- Users can view their notifications.
- Users cannot access another user's notifications.
- Users can mark notifications as read.
- Read/unread state persists.
- Notifications generated by another workspace cannot appear in the current workspace's notification context.

---

## 10. API Keys

- Only authorized users can create API keys.
- API keys belong to exactly one workspace.
- API keys have defined scopes.
- API keys can be revoked.
- Revoked API keys cannot authenticate.
- The raw API key is exposed only at creation time.
- Stored API keys are hashed or otherwise securely protected.
- Raw API keys are never stored in plaintext.
- API-key requests are associated with the correct workspace.
- API-key permissions are enforced independently of the frontend.
- An API key from Workspace A cannot access Workspace B.
- API-key creation and revocation are auditable.

---

## 11. Rate Limiting

- API requests are subject to defined rate limits.
- Excessive requests are rejected.
- Rate-limit responses are predictable.
- Rate limiting cannot be bypassed by changing resource IDs.
- API keys cannot bypass rate limits.
- Rate-limit state is correctly associated with the relevant client/tenant policy.
- Abuse scenarios are covered by automated tests.

---

## 12. Security

The MVP must demonstrate security as an **engineering concern**, not merely as documentation.

Acceptance includes testing for:

- Authentication bypass
- Authorization bypass
- Horizontal privilege escalation
- Vertical privilege escalation
- Cross-tenant access
- Resource-ID manipulation
- Invalid API-key usage
- Revoked API-key usage
- Input validation failures
- Rate-limit abuse
- Sensitive-data exposure
- Secret exposure
- Common OWASP risks relevant to the application

### Security Boundary

The frontend must never be considered a security boundary.

Security-critical decisions must be enforced server-side.

---

## 13. API and Error Handling

- APIs use consistent request/response conventions.
- Validation failures return predictable errors.
- Authentication failures return predictable errors.
- Authorization failures return predictable errors.
- Missing resources return predictable errors.
- Rate-limit failures return predictable errors.
- Internal errors do not expose stack traces or secrets to clients.
- APIs cannot be used to bypass tenant boundaries.

---

## 14. Engineering Quality

- Critical business logic has automated tests.
- Authentication has automated tests.
- Authorization has automated tests.
- Tenant isolation has dedicated automated tests.
- Project lifecycle has automated tests.
- Usage enforcement has automated tests.
- Audit logging has automated tests.
- API-key behavior has automated tests.
- Rate limiting has automated tests.
- Critical user journeys have E2E coverage.
- Database migrations can reproduce the required schema.
- The application can be started locally from documented instructions.
- Secrets are not committed to source control.
- Logging does not expose sensitive credentials.
- Application failures are handled consistently.

---

## 15. Architectural Acceptance

Ourzo must be implemented as a **modular monolith** for the MVP.

The architecture must demonstrate intentional boundaries between major capabilities.

At minimum, the implementation must clearly separate:

- Authentication
- Users
- Workspaces/Tenants
- Membership
- Authorization
- Projects
- Tasks
- Usage
- Audit
- Notifications
- API Keys

Acceptance requires:

- Clear module responsibilities.
- Clear tenant boundaries.
- Consistent tenant-scoping strategy.
- Centralized or consistently implemented authorization.
- Separation of authentication and authorization.
- Separation of platform-level and tenant-level permissions.
- Defined error-handling strategy.
- Defined logging strategy.
- Defined scalability considerations.
- Documented architectural trade-offs.

---

## 16. Product Scope Acceptance

The MVP is considered appropriately scoped only if the implementation remains focused on:

```text
Multi-Tenant SaaS
        ↓
Workspace
        ↓
Members + RBAC
        ↓
Lightweight Projects
        ↓
Lightweight Tasks
```

The following are intentionally **outside the MVP**:

- Subtasks
- Gantt charts
- Sprints
- Epics
- Milestones
- Task dependencies
- Time tracking
- Advanced project analytics
- Resource planning
- Project templates
- Workflow automation
- Real-time collaboration
- Chat
- File management
- Calendar integrations
- Mobile application
- Real billing
- Payment processing
- Third-party integrations
- Custom roles
- Kubernetes
- Microservices
