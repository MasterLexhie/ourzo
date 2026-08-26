# Ourzo Business Rules

## Workspace / Tenant Rules

1. A registered user can create a workspace.
2. The workspace creator becomes its Owner.
3. A user can belong to multiple workspaces.
4. A workspace has at least one Owner.
5. A workspace can have multiple Owners.
6. Workspace data must be isolated from other workspaces.
7. A user cannot access a workspace they do not belong to.
8. Workspace-owned resources must be associated with exactly one workspace.
9. A workspace is soft-deleted before permanent deletion.

---

## Membership Rules

10. Owners and Admins can invite members.
11. Invitations expire after seven days.
12. An invitation can only be accepted once.
13. A user cannot be added to the same workspace twice.
14. Owners and Admins can remove members.
15. Removing a member immediately revokes workspace access.
16. Historical activity belonging to removed members remains in audit logs.
17. Only Owners can transfer ownership.
18. An Owner cannot remove the last remaining Owner.
19. An Owner must transfer ownership before leaving if they are the only Owner.

---

## Role Rules

20. The tenant-level roles are Owner, Admin, and Member.
21. Roles are predefined in the MVP.
22. Custom roles are not supported.
23. Owner has unrestricted workspace permissions.
24. Admin can manage members and projects but cannot perform Owner-only actions.
25. Members can access only resources they are permitted to access.
26. Authorization must be enforced on the backend.

---

## Project Rules

27. Projects belong to exactly one workspace.
28. A project can have multiple members.
29. Project membership cannot include someone outside the workspace.
30. Owners and Admins can manage all workspace projects.
31. Project members can access their assigned projects.
32. Projects have Planned, In Progress, Paused, Completed, or Archived status.
33. Archived projects are read-only.
34. Only authorized users can archive or delete projects.
35. Deleting or archiving a project does not delete the workspace or its members.
36. Tasks belong to exactly one project.
37. Tasks have Todo, In Progress, Blocked, or Completed status.
38. Project progress can be calculated from completed tasks.
39. Subtasks are not supported in the MVP.

---

## Usage and Plan Rules

40. Each workspace has a plan.
41. Plans define resource limits.
42. Usage is tracked per workspace.
43. Usage is checked before consuming a limited resource.
44. When a hard limit is reached, the relevant action is blocked.
45. Users receive warnings before reaching relevant limits.
46. Monthly usage resets at the beginning of each billing period.
47. Usage calculations must be consistent and auditable.

---

## API-Key Rules

48. Only Owners can create API keys.
49. API keys belong to exactly one workspace.
50. API keys have defined scopes.
51. An API key is shown in plaintext only when initially generated.
52. Stored API keys must be hashed.
53. Revoked API keys cannot be reused.
54. API requests must respect workspace and key-level permissions.
55. API access is subject to rate limits.

---

## Audit Rules

56. Important security and workspace actions generate audit events.
57. Audit records cannot be modified by normal users.
58. Owners and Admins can view workspace audit logs.
59. Audit logs are retained for 90 days in the MVP.
60. Audit events identify the actor, action, resource, workspace, and timestamp.

---

## Notification Rules

61. Notifications are generated for relevant workspace events.
62. Users only receive notifications they are authorized to see.
63. Users can mark notifications as read.
64. Notifications remain available after being read.

---

## Security and Tenant-Isolation Rules

65. Every protected API request must establish the user's identity.
66. Every workspace-scoped request must verify workspace membership.
67. Every privileged action must verify role/permission.
68. Every tenant-owned resource must have an enforceable workspace relationship.
69. Users must never be able to access another workspace's data by modifying an ID in a request.
70. API keys from one workspace cannot access another workspace's resources.
71. Cross-tenant access attempts are rejected.
72. Tenant-isolation tests cover every major tenant-owned resource.
73. Secrets and credentials must never be stored in source control.
74. Sensitive actions should generate audit events.

---

## MVP Boundary Rules

75. No custom roles.
76. No real billing.
77. No payment processing.
78. No MFA.
79. No third-party integrations.
80. No real-time collaboration.
81. No microservices requirement.
82. No Kubernetes requirement.
