# P0 Implementation Plan: Immediate Fixes
**Source:** `AUDIT_REPORT.md` §5.1 (2026-11-09)  
**Priority:** P0. These issues block core functionality or create security risk.

## 1. Objective & Scope
This plan restores the core user journeys that are currently broken end-to-end:
- Staying logged in
- Building the web app
- Using the "Blocked" task status
- Inviting teammates
- Letting Members work on tasks

It also closes one credential-leak path. Everything here is a fix to existing MVP features. No new product scope.

## 2. Constraints (from AGENTS.md)
- Use `pnpm` only.
- Make schema changes **only** through Prisma Migrate, and update `docs/database/*` in the same change.
- Keep the controller → service → repository layering. Enforce authorization in the backend service layer and guards; the frontend is UX only.
- Add no new third-party dependencies. Node `crypto` is built in.
- Every tenant-owned query must filter by `workspaceId`.

## 3. Work Items

### P0-1: Fix refresh-token and logout lookup
**Problem:**
- `apps/api/src/auth/auth.service.ts` `hashToken()` (around line 242) hashes with salted bcrypt.
- `refresh()` (around 89) and `logout()` (around 113) re-hash the presented token and look it up with `findFirst({ tokenHash })`. That can never match, so every refresh returns 401 and logout never revokes.

**Changes:**
1. Replace `hashToken` with a deterministic SHA-256:
   `createHash('sha256').update(token).digest('hex')` (import from `crypto`).
   Refresh JWTs are high-entropy, so a slow salted hash adds no protection.
2. Keep `storeRefreshToken`, `revokeRefreshToken` and the rotate-on-refresh logic unchanged.
3. No data migration. Existing bcrypt-hashed rows simply stop matching and users log in again. Optionally run a one-off `UPDATE refresh_tokens SET "revokedAt" = now() WHERE "revokedAt" IS NULL` in the migration notes.
4. Frontend: no change. `apps/web/src/services/api.client.ts` already implements `refreshAccessToken()` and `handle401()` retry.

**Acceptance criteria:**
- `POST /api/auth/refresh` with a freshly issued refresh token returns 200 with a new token pair.
- Reusing the previous refresh token returns 401 (rotation enforced).
- `POST /api/auth/logout` with `{ refreshToken }` revokes it, and a later refresh with it returns 401.

### P0-2: Make the web build green
**Problems:**
- `tsc -b` reports 4 errors.
- Hooks are called conditionally in three pages, which can throw "Rendered more hooks than during the previous render".

**Changes:**
1. In `apps/web/src/stores/organization.store.ts:64-66` (`onRehydrateStorage`), guard `state` and use `(state?.organizations?.length ?? 0) > 0` before assigning `currentOrganization`.
2. In each page below, move every hook call (`useState`, query/mutation hooks, `useForm`) **above** the `if (!workspaceId) return <Spinner/>` early return:
   - `features/projects/pages/projects-page.tsx` (lines 55–76)
   - `features/usage/pages/usage-page.tsx` (lines 52–59)
   - `features/organizations/pages/team-page.tsx` (lines 69–94)
3. Pass `workspaceId ?? ""` to the query hooks.
4. Ensure the hooks in `hooks/useProjects.ts`, `hooks/useUsage.ts` and `hooks/useOrganizations.ts` set `enabled: !!workspaceId`.

**Acceptance criteria:**
- `pnpm --filter web exec tsc -b --noEmit` reports 0 errors.
- `pnpm --filter web lint` (oxlint) reports 0 errors.
- `pnpm --filter web build` succeeds.

### P0-3: Align TaskStatus with scope (Todo / In Progress / Blocked / Completed)
**Problem:**
- The backend enum is `todo | in_progress | completed | cancelled`.
- Business rule #37 and the AGENTS.md scope rules require Blocked.
- The UI sends `blocked`, which gets a 400.

**Changes:**
1. In `apps/api/prisma/schema.prisma`, change the enum to `enum TaskStatus { todo in_progress blocked completed }`.
2. Create the migration with:
   `pnpm --filter ourzo-api exec prisma migrate dev --create-only --name task_status_blocked`
3. Replace the generated SQL with `ALTER TYPE "TaskStatus" RENAME VALUE 'cancelled' TO 'blocked';`. This keeps existing rows; any `cancelled` task becomes `blocked`.
4. Run `pnpm --filter ourzo-api prisma:generate`.
5. Update the `@IsEnum`/`@ApiProperty` enums in `apps/api/src/tasks/dto/*.ts`.
6. Grep for `cancelled` and replace any remaining references.

**Acceptance criteria:**
- `POST /api/tasks` with `status: "blocked"` returns 201, and `PATCH` to `blocked` returns 200.
- `cancelled` is rejected with 400.
- The UI "Blocked" column receives the task.

### P0-4: Fix the Team page current-user lookup
**Problem:** `team-page.tsx:186` compares `member.userId` with `currentOrganization?.id` (a workspace id). `currentUser` is always undefined, so the Invite button and role menus never render.

**Change:** `const { user } = useAuthStore();` then `members?.find((m) => m.userId === user?.id)`.

**Acceptance criteria:**
- The Owner sees "Invite Member" and the role menus.
- An Admin sees only the actions allowed by the existing `canManageMember`/`canChangeRole`.
- A Member sees neither.

### P0-5: Stop logging Authorization headers
**Problem:** `apps/api/src/authorization/guards/workspace-context.guard.ts` logs `JSON.stringify(request.headers)` when the workspace id is missing. That leaks bearer tokens into the logs.

**Change:** log only `${request.method} ${request.url} user=${user.id}`.

**Acceptance criteria:** no logger call in `apps/api/src` serializes `request.headers`.

### P0-6: Make invitations deliverable without email
Email infrastructure is explicitly out of MVP scope (`docs/product/mvp-scope.md`), so the inviter shares a link instead.

**Backend:**
1. Add `WEB_APP_URL` to `apps/api/.env.example` and `docs/development/environment-configuration.md`.
2. In `apps/api/src/invitations/invitations.service.ts` and the controller, return `inviteUrl = ${WEB_APP_URL}/accept-invitation?token=<token>` **only** in the `POST /api/invitations` response. The creator is already guarded as Owner/Admin. Never include the token in `GET /api/invitations`.
3. Add `inviteUrl` to the invitation creation response DTO, with Swagger docs.

**Frontend:**
1. Add `inviteUrl?: string` to the invitation type in `apps/web/src/types/organization.types.ts`.
2. In the Team page invite modal success state, show the link with a Copy button. Reuse the copy pattern in `features/api-keys/pages/api-keys-page.tsx`.

**Acceptance criteria:** the Owner creates an invite in the UI and copies the link. The invited user (logged in with the invited email) opens it and becomes a workspace member.

### P0-7: Unblock members on tasks (project-membership management)
**Problem:**
- Non-admin task access requires a `ProjectMember` row, but those rows can only be set via `memberIds` at project creation.
- The UI never sends `memberIds`, and no endpoint adds members later.
- Business rules #28–31 require project membership.

**Backend:**
1. Add these routes to `apps/api/src/projects/projects.controller.ts`, guarded by `WorkspaceContextGuard` + `WorkspaceRolesGuard` with `@WorkspaceRoles(Owner, Admin)`:
   - `GET /api/projects/:projectId/members`. This one also allows any workspace member, since members may see their teammates.
   - `POST /api/projects/:projectId/members` with body `{ userIds: string[] }` (DTO with `@IsUUID('4', { each: true })`).
   - `DELETE /api/projects/:projectId/members/:userId`.
2. Service (`projects.service.ts`):
   - Reuse the existing workspace-membership validation (the `memberIds` check around lines 87–100) and reject users outside the workspace (rule #29).
   - Reject changes on archived projects (rule #33).
   - Load the project with `{ id, workspaceId }`.
3. Repository (`projects/repositories/projects.repository.ts`): add `listMembers`, `addMembers` (`createMany` with `skipDuplicates`) and `removeMember`, all scoped by project and workspace.
4. In `create()`, always add the creator as a project member.
5. Write audit logs `project.member_added` / `project.member_removed`, and notify the added user.

**Frontend:**
1. Add a service and hooks: `projectsService.getMembers/addMembers/removeMember` and `useProjectMembers`, `useAddProjectMembers`, `useRemoveProjectMember`, following the `services/tasks.service.ts` and `hooks/useTasks.ts` pattern.
2. Add a "Members" card on `features/projects/pages/project-detail-page.tsx` that lists members. Owner/Admin get add and remove controls, with workspace members sourced from `useMembers`.
3. Optional: a member multi-select in the create-project modal that sends `memberIds`.

**Acceptance criteria:**
- After the Owner adds a Member to a project, that Member can list and create tasks there (previously 403).
- Adding a user from another workspace returns 400.
- A Member calling `POST …/members` gets 403.

## 4. Sequencing & Dependencies
1. **P0-5**: trivial security fix.
2. **P0-1**: sessions must survive before long manual testing.
3. **P0-2**: needed for a reliable UI.
4. **P0-4**: needed for P0-6's UI.
5. **P0-3**: migration.
6. **P0-6**
7. **P0-7**

## 5. Docs to Update
- `docs/database/schema.dbml` and `docs/database/data-design.md`: TaskStatus.
- `docs/development/environment-configuration.md`: `WEB_APP_URL`.
- API docs and Swagger annotations: project-member endpoints and the invite `inviteUrl`.
- `docs/product/user-journeys.md`: invite-by-link step.

## 6. Verification
1. **API static checks:**
   - `pnpm --filter ourzo-api exec tsc --noEmit`
   - `pnpm --filter ourzo-api exec eslint "{src,test}/**/*.ts"`
   - `pnpm --filter ourzo-api test`
2. **Web static checks:** `tsc -b --noEmit`, oxlint and `pnpm --filter web build`.
3. **Database:** create a disposable DB and run `prisma migrate deploy`. Confirm `prisma migrate diff` shows no drift.
4. **API scenarios** (re-run the audit script):
   - refresh 200, then the old token 401
   - logout revokes
   - blocked 201/200
   - invite returns `inviteUrl`, and accept succeeds
   - project member add, then member task access 200
   - cross-tenant reads still 403/404
5. **Browser walkthrough:** register → workspace → project → add member → copy invite link → second user accepts → creates a task → moves it to Blocked. Expect no console errors.

## 7. Risks
- **Session reset:** the hash change logs out everyone with an existing session. This is acceptable in the MVP.
- **Migration:** the enum rename is a one-way migration. Back up any non-local DB first.
- **Token exposure:** the invite token is shown to the inviter. That is intentional (the bearer link model); tokens stay single-use with a 7-day expiry (rules #11–12).
