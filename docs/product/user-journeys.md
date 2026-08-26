# Ourzo User Journeys

## 1. New User Onboarding

```text
Register
  ↓
Verify email
  ↓
Login
  ↓
Create workspace
  ↓
Enter dashboard
```

The registering user becomes the workspace Owner.

---

## 2. Workspace Management

```text
Login
  ↓
Select workspace
  ↓
View workspace
  ↓
Manage workspace settings
```

Users can switch between workspaces they belong to.

---

## 3. Invite Team Member

```text
Owner/Admin
  ↓
Members
  ↓
Invite user
  ↓
Invitation created
  ↓
User accepts
  ↓
User added to workspace
```

Invitations expire after seven days.

---

## 4. Role Management

```text
Owner/Admin
  ↓
Members
  ↓
Select user
  ↓
Change role
  ↓
Permissions updated
```

Ownership changes remain Owner-only.

---

## 5. Project Management

```text
Authorized user
  ↓
Projects
  ↓
Create project
  ↓
Add project details
  ↓
Add members
  ↓
Create/manage tasks
  ↓
Track project status and progress
  ↓
Archive project
```

Project management remains intentionally lightweight.

---

## 6. Usage Management

```text
User performs action
  ↓
System records usage
  ↓
Usage calculated
  ↓
Limit checked
  ├── Within limit → operation succeeds
  └── Limit reached → operation blocked
```

Users receive warnings before relevant hard limits are reached.

---

## 7. Audit and Notifications

```text
Important action occurs
  ↓
Audit event recorded
  ↓
Relevant notification generated
  ↓
User views notification
  ↓
User marks notification as read
```

Users can only access notifications belonging to themselves.

---

## 8. API Access

```text
Owner
  ↓
API settings
  ↓
Generate API key
  ↓
Select scopes
  ↓
Client uses API
  ↓
Workspace and permission checks
  ↓
Rate limit enforced
  ↓
Request succeeds or is rejected
```

API keys are workspace-scoped.

---

## 9. Tenant Isolation / Security Journey

This is a **cross-cutting P0 engineering journey**.

```text
User attempts protected operation
  ↓
Authenticate user
  ↓
Resolve target workspace
  ↓
Verify workspace membership
  ↓
Verify role/permission
  ↓
Verify resource belongs to workspace
  ↓
Allow or reject operation
  ↓
Audit relevant security event
```

Examples that must be rejected:

- Member attempts to access another workspace's project
- Member attempts an Admin/Owner action
- Admin attempts an Owner-only action
- Revoked API key attempts authentication
- API key from Workspace A attempts to access Workspace B
- User manipulates a resource ID to cross a tenant boundary

---

## Journey Priorities

| Priority | Journey |
|---|---|
| P0 | New User Onboarding |
| P0 | Workspace Management |
| P0 | Invite Team Member |
| P0 | Role Management |
| P0 | Project Management |
| P0 | Usage Management |
| P0 | Tenant Isolation / Authorization |
| P1 | Audit & Notifications |
| P1 | API Access |
