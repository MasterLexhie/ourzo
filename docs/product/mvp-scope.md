# Ourzo MVP Scope

## MVP Objective

A small team can create an Ourzo workspace, invite members, assign permissions, create and manage projects and tasks, monitor usage, and inspect an auditable history of important actions.

The MVP is intentionally designed to demonstrate **multi-tenant SaaS architecture**, rather than to implement a complete project-management product.

---

## In Scope

### Authentication

- User registration
- Login
- Logout
- Email verification
- Password reset
- Session/token management

### Workspace / Tenant Management

- Workspace creation
- Multiple workspace membership
- Workspace switching
- Workspace settings
- Tenant isolation
- Workspace soft deletion

### Membership and RBAC

- Owner role
- Admin role
- Member role
- Member invitations
- Invitation expiration
- Role management
- Member removal
- Ownership transfer

### Lightweight Project Management

- Project creation
- Project editing
- Project membership
- Project status
- Project archival
- Task creation
- Task editing
- Task status
- Project progress calculation

### Usage and Plans

- Free, Pro, and Business plans
- Resource limits
- Usage tracking
- Usage enforcement
- Usage warnings
- Monthly usage reset

### Audit and Notifications

- Audit logs
- Audit-log filtering/querying
- In-app notifications
- Read/unread notification state

### API Access

- API-key creation
- API-key scopes
- API-key revocation
- API authentication
- Rate limiting

### Security and Tenant Isolation

- Backend authorization
- Tenant-scoped access checks
- Cross-tenant access prevention
- Tenant-isolation tests
- Basic security testing

### UI

- Basic responsive web application
- Authentication screens
- Workspace dashboard
- Member management
- Project/task interfaces
- Usage dashboard
- Audit-log interface
- Notifications
- API-key management
- Workspace settings

---

## Out of Scope

- Real billing
- Real payment processing
- Stripe integration
- Mobile applications
- Microservices
- Kubernetes
- Real-time collaboration
- Advanced analytics
- AI features
- Advanced project-management features
- Complex task hierarchies/subtasks
- Email infrastructure
- File storage
- Third-party integrations
- Custom roles
- MFA
- Advanced reporting
- Multi-region deployment

---

## Project Management Boundary

Projects are a **supporting business domain**.

A project has:

- Name
- Description
- Status
- Owner
- Members
- Tasks
- Progress
- Created date
- Updated date

### Project Statuses

- Planned
- In Progress
- Paused
- Completed
- Archived

Tasks have:

- Title
- Description
- Status
- Assignee
- Priority
- Due date
- Project
- Created date
- Updated date

### Task Statuses

- Todo
- In Progress
- Blocked
- Completed

**Subtasks are outside the MVP.**

---

## Engineering Priority

The most important technical capabilities are:

1. Tenant isolation
2. Authentication
3. RBAC
4. Tenant-scoped database access
5. Resource-level authorization
6. Usage metering
7. Rate limiting
8. API keys
9. Audit logging
10. Security testing
11. Observability
12. Automated testing

---

## MVP Constraint

The MVP should be small enough to build rapidly with AI assistance while remaining understandable, testable, and defensible in a technical interview.
