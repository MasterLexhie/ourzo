# Ourzo — API Reference

Swagger/OpenAPI at `GET /api/docs` is the source of truth for request and response schemas. This page summarises the routes, who may call them, and the conventions every route shares.

## Conventions

| Topic | Rule |
|---|---|
| Authentication | `Authorization: Bearer <access JWT>`, or `Bearer ourzo_…` for API keys (ADR-009) |
| Workspace context | `X-Workspace-Id: <uuid>` on workspace-scoped routes. API keys are pinned to their own workspace, so the header is optional for them and a different value returns 403. |
| Tenant isolation | An id from another workspace returns **404**, the same as a missing id. A workspace you aren't a member of returns **403**. |
| API-key scopes | Keys only reach routes with a declared scope (table below). Any other route returns 403, and JWT-only routes return 401. |
| Rate limits | Auth routes are limited per IP and everything else per user or key (see `security-architecture.md` §8). Exceeding a limit returns 429 with `Retry-After`. |
| Plan limits | Creating beyond the plan limit returns 403 `"<Resource> limit reached (x/y)"` (see `usage-and-limits.md`). |
| Errors | `{ statusCode, timestamp, path, message }` |

## Authentication — `/api/auth`

| Method & path | Auth | Notes |
|---|---|---|
| `POST /register` | public | Body `{ email, password, firstName, lastName }`. Returns `{ user, tokens: { accessToken, tokenType, expiresIn } }` and sets the `ourzo_refresh` cookie. |
| `POST /login` | public | Same response and cookie as register. |
| `POST /refresh` | refresh cookie | Rotates the cookie and returns `{ accessToken, tokenType, expiresIn }`. A body `refreshToken` is deprecated but accepted for one release. |
| `POST /logout` | JWT + cookie | Revokes the session and clears the cookie. |
| `GET /me` | JWT | The current user. |

The refresh cookie is `HttpOnly; SameSite=Strict; Path=/api/auth`, plus `Secure` in production (ADR-010).

## Workspaces — `/api/organizations` (JWT only)

| Method & path | Role | Notes |
|---|---|---|
| `POST /` | any user | Creates a workspace; the caller becomes Owner. Audited as `workspace.created`. |
| `GET /` | any user | The caller's workspaces. |
| `GET /:workspaceId` | member | Workspace details with members. |
| `PATCH /:workspaceId` | Owner, Admin | Name or slug. Audited as `workspace.updated`. |
| `DELETE /:workspaceId` | Owner | Soft delete. Audited as `workspace.deleted`. |

## Members — `/api/members`

| Method & path | Role | Key scope | Notes |
|---|---|---|---|
| `GET /` | member | `members:read` | |
| `PATCH /:userId/role` | Owner, Admin | — | Nobody can change their own role. Admins can't assign Owner or change other Admins. |
| `DELETE /:userId` | Owner, Admin | — | The last Owner cannot be removed. |
| `POST /transfer-ownership` | Owner | — | Body `{ userId }`. The previous Owner becomes Admin. |

## Invitations — `/api/invitations` (JWT only)

| Method & path | Role | Notes |
|---|---|---|
| `POST /` | Owner, Admin | Body `{ email, role }`. The response includes **`inviteUrl`** (`<WEB_APP_URL>/accept-invitation?token=…`), the shareable single-use link (7-day expiry). |
| `GET /` | Owner, Admin | Pending and past invitations. Tokens are never listed. |
| `POST /accept` | invited user | Body `{ token }`. Must be signed in as the invited email. Atomic with the audit entry. |
| `DELETE /:invitationId` | Owner, Admin | Revokes a pending invitation. |

## Projects — `/api/projects`

| Method & path | Role | Key scope |
|---|---|---|
| `POST /` | Owner, Admin | `projects:write` |
| `GET /` (`?status=&page=&limit=`) | member | `projects:read` |
| `GET /:projectId` | project member, or Owner/Admin | `projects:read` |
| `GET /:projectId/progress` | project member, or Owner/Admin | `projects:read` |
| `PATCH /:projectId` | Owner, Admin | `projects:write` |
| `DELETE /:projectId` (archive) | Owner, Admin | `projects:write` |
| `POST /:projectId/members` | Owner, Admin | `projects:write` |
| `DELETE /:projectId/members/:userId` | Owner, Admin | `projects:write` |

Project member endpoints:
- Body for `POST …/members`: `{ userIds: uuid[] }` (1–100). Every user must already belong to the workspace, otherwise the request returns 400.
- Adding is idempotent, and added users are notified.
- Removing someone who isn't a project member returns 404.
- Both endpoints return 400 on archived projects. Both are audited as `project.member_added` / `project.member_removed`.
- The project creator is always added as a member when the project is created.

## Tasks — `/api/tasks`

| Method & path | Role | Key scope |
|---|---|---|
| `POST /` | project member, or Owner/Admin | `tasks:write` |
| `GET /?projectId=` (`&status=&priority=&assigneeId=`) | project member, or Owner/Admin | `tasks:read` |
| `GET /:taskId` | project member, or Owner/Admin | `tasks:read` |
| `PATCH /:taskId` | project member, assignee, creator, or Owner/Admin | `tasks:write` |
| `DELETE /:taskId` | creator, or Owner/Admin | `tasks:write` |

Status is one of `todo`, `in_progress`, `blocked` or `completed`. Priority is one of `low`, `medium`, `high` or `urgent`.

## Other workspace routes

| Method & path | Role | Key scope |
|---|---|---|
| `GET /api/usage` | Owner, Admin | `usage:read` |
| `GET /api/audit` (`?action=&resourceType=&actorId=&startDate=&endDate=`) | Owner, Admin | `audit:read` |
| `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all` | the recipient (JWT only) | — |
| `POST/GET/DELETE /api/api-keys…` | Owner (JWT only) | — |
| `GET /health` (200 only when PostgreSQL answers a query and Redis answers PING; otherwise 503 with the failing check marked `down`) | public | — |
