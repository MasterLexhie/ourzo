# Ourzo User Types & Roles

## Role Model

Ourzo has three tenant-level roles:

- Owner
- Admin
- Member

It also has a separate platform-level role:

- System Admin

```text
Ourzo Platform
│
├── System Admin
│
└── Organizations / Workspaces
    ├── Owner
    ├── Admin
    └── Member
```

System Admin permissions are completely separate from tenant-level permissions.

---

## Owner

The Owner has full control over a workspace.

### Permissions

- Manage workspace settings
- Invite members
- Remove members
- Assign roles
- Transfer ownership
- Create and manage projects
- Manage project membership
- View usage
- Manage API keys
- View audit logs
- Manage the workspace plan
- Delete the workspace

An Owner cannot leave the workspace if they are the only Owner without first transferring ownership.

---

## Admin

Admins support operational management of a workspace.

### Permissions

- Invite members
- Remove members
- Manage members
- Manage projects
- Manage project membership
- View usage
- View audit logs
- Manage operational workspace settings

### Restrictions

Admins cannot:

- Transfer ownership
- Delete the workspace
- Perform Owner-only security actions

---

## Member

Members work within projects and resources to which they have access.

### Permissions

- View the workspace
- View assigned projects
- Work within assigned projects
- Receive notifications
- View permitted project information

### Restrictions

Members cannot:

- Manage workspace members
- Change roles
- Manage API keys
- View organization-wide audit logs
- Delete the workspace
- Perform Owner/Admin-only operations

---

## System Admin

System Admin is a **platform-level role**, not a workspace role.

### Responsibilities

- View platform-level organizations
- Investigate platform issues
- View system-level metrics
- Manage platform-level users/organizations when necessary
- Suspend users or organizations when necessary

System Admin access must not be implemented by simply granting tenant-level Owner permissions.

---

## Role Principles

1. Roles are predefined in the MVP.
2. Custom roles are not supported.
3. Authorization is enforced by the backend.
4. Frontend permission checks are for user experience only and are not a security boundary.
5. Every privileged operation must validate the authenticated user's role and permissions.
6. Tenant membership must be validated before tenant-scoped authorization.
