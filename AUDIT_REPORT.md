# Project Audit & Functional Test Report
**Date:** 2026-11-09  
**Repository:** Ourzo (`ourzo` pnpm/Turborepo monorepo, branch `main` @ `6d53493` + 21 modified / ~40 untracked uncommitted paths)

> Method: static inspection of the working tree (including uncommitted changes), `tsc`/ESLint/oxlint/Jest runs, direct HTTP calls against the running API, and a live browser walkthrough in Chrome against the Vite dev server. All runtime testing used a throwaway database (`ourzo_audit_tmp`) created with `prisma migrate deploy` on the local DBngin PostgreSQL 17 instance. That database was dropped afterwards, and every server started for the audit was stopped. No source files were modified. Secret values were not read into this report.

---

## 1. Executive Summary & Project Overview

- **What the Project Is About:** Ourzo is a lightweight multi-tenant SaaS workspace for startups and SMEs. Users sign up, create or join **workspaces** (tenants) and manage members with Owner/Admin/Member roles. Inside a workspace they run lightweight **projects** and **tasks**, and they also get API keys, usage limits, in-app notifications and an append-only audit log. The stated goal (see `AGENTS.md`) is to show architectural rigor around **tenant isolation, RBAC and test safety** rather than a large feature list.

- **Tech Stack & Architecture:**
  - **Frontend (`apps/web`):** React 19, Vite 8, TypeScript ~6.0, Tailwind v4, shadcn/Radix UI, React Router 8, Zustand (persisted to `localStorage`), TanStack Query, React Hook Form, sonner toasts. Linting uses **oxlint**. *Vitest/RTL are listed in the approved stack but are not installed.*
  - **Backend (`apps/api`):** NestJS 11 modular monolith, class-validator DTOs, Swagger at `/api/docs`, Passport JWT, `@node-rs/bcrypt`, ioredis, Jest 30.
  - **Data:** PostgreSQL through Prisma 7 + `@prisma/adapter-pg`. There are 14 models and 3 migrations, and `prisma migrate diff` reports **no drift** between the migrations and `schema.prisma`. Redis is used only for rate limiting.
  - **Infra:** pnpm 10.10 workspaces, Turborepo (`tasks` key, as required), `docker-compose.dev.yml`/`.prod.yml`, a multi-stage `apps/api/Dockerfile`, and a GitHub Actions CI file at `.github/workflows/ci.yml`.
  - **Third-party services:** none. There is no email, payments or external APIs, which matches the MVP scope.

- **Overall Health Score:** **MVP in Progress.**
  - The backend has broad, well-layered coverage of the MVP domain. Cross-tenant isolation **held** in every live test.
  - Several headline features are not actually usable end-to-end:
    - Token refresh always fails.
    - API keys can be created but cannot authenticate any route.
    - Rate limiting is never applied.
    - Invitations cannot be delivered.
    - Members cannot reach tasks.
  - The web build is red: `tsc -b` reports 4 errors, oxlint reports 15 errors, and several pages call React hooks conditionally.
  - Test coverage is effectively zero, and the CI/Docker pipeline cannot pass in its current form.

---

## 2. What Is Done (Implemented Features)

**Backend REST API: 11 feature modules, 37 routes mapped at startup**

| Module | Endpoints | Notes |
|---|---|---|
| Auth | `POST /api/auth/register`, `login`, `refresh`, `logout`, `GET /api/auth/me` | bcrypt passwords, access/refresh JWTs, hashed refresh tokens in DB |
| Organizations (workspaces) | `POST/GET /api/organizations`, `GET/PATCH/DELETE /:workspaceId` | Soft delete; owner-only delete |
| Members | `GET /api/members`, `PATCH /:userId/role`, `DELETE /:userId`, `POST /transfer-ownership` | Self-role-change and last-owner protections |
| Invitations | `POST/GET /api/invitations`, `POST /accept`, `DELETE /:id` | 32-byte `crypto.randomBytes` tokens |
| Projects | CRUD + `GET /:projectId/progress` | Status enum: Planned/In Progress/Paused/Completed/Archived |
| Tasks | CRUD on `/api/tasks` | Project-membership gate, assignee validation |
| Notifications | `GET`, `PATCH /:id/read`, `PATCH /read-all` | Created on project/task events |
| Audit | `GET /api/audit` (Owner/Admin) | Written for project, task, invitation and API-key events |
| API Keys | `POST/GET/GET :id/DELETE :id` (Owner-only) | bcrypt-hashed keys, prefix lookup, scopes, revocation |
| Usage | `GET /api/usage` (Owner/Admin) | Plan limit table (free/pro/business) |
| Health | `GET /health` | Checks DB connectivity |

**Cross-cutting backend pieces**
- `WorkspaceContextGuard` resolves the workspace from the path, query, body or `X-Workspace-Id` header, validates the UUID, and checks membership and soft-deleted status. `WorkspaceRolesGuard` is applied through `@WorkspaceRoles`.
- A global `ValidationPipe` runs with `whitelist` + `forbidNonWhitelisted`, alongside a global `HttpExceptionFilter`, CORS allow-listing and Swagger.
- A `SystemRolesGuard` exists for platform admins (unused so far).
- Controller → service → repository layering is followed in most modules.

**Frontend (`apps/web`), 71 source files**
- Login, register, onboarding/create-workspace, dashboard, projects list, project detail (Kanban-style task columns), team, accept-invitation, usage, audit log, API keys and settings (general + danger zone).
- A notification bell panel, protected routes, an error boundary, and an API client with refresh-token retry logic.

**Infra / docs**
- Docker Compose (dev/prod), API Dockerfile, CI workflow and `.env.example` files.
- An extensive `docs/` tree: product, architecture, database (`schema.dbml`) and development.

---

## 3. What Is Actually Working (Verified via Live Browser Test)

### Server & Build Status
| Check | Result |
|---|---|
| API `tsc --noEmit` | ✅ 0 errors |
| API ESLint (run **without** `--fix`) | ✅ 0 errors/warnings |
| API Jest | ✅ 1/1 passing. This is only the scaffolded `app.controller.spec.ts`. |
| API `nest build` | ✅ builds, but the output lands at `dist/src/main.js`, not `dist/main.js` (see §4) |
| API start | ✅ Started cleanly on `:3000`, connected to Postgres and Redis, and mapped all routes |
| Web `tsc -b --noEmit` | ❌ **4 errors** in `src/stores/organization.store.ts:65-66`, so `pnpm build` (`tsc -b && vite build`) fails |
| Web oxlint | ❌ **15 errors** (`rules-of-hooks`) + 7 warnings |
| Web dev server (Vite) | ✅ Served on `:5173`. Vite does not type-check, so the UI still runs. |
| Migrations | ✅ 3 migrations applied to a fresh DB; no schema drift |
| `GET /health`, `GET /api/docs` | ✅ 200 / 200 |

### Verified User Flows (browser + direct API)
| # | Flow | Result |
|---|---|---|
| 1 | `/` redirects unauthenticated users to `/login` | ✅ |
| 2 | **Register** through the UI form → redirect to `/onboarding/workspace` | ✅ Account persisted |
| 3 | **Create workspace** through the UI → redirect to `/dashboard` showing name, plan and member count | ✅ Persisted. The slug field has bugs; see §4. |
| 4 | **Create project** through the UI modal → card appears with "Planned" status | ✅ Persisted (`POST /api/projects` 201) |
| 5 | **Create task** through the UI modal | ⚠️ Persisted (`POST /api/tasks` 201), but the chosen status/priority is **ignored** (always saved as `todo`/`medium`) and the title renders at 0px width |
| 6 | **Change task status to "Blocked"** from the task card | ❌ `PATCH /api/tasks/:id` → **400** (the backend enum has no `blocked`) |
| 7 | **Audit Logs** page lists `Project.Created` and `Task.Created` with actor and metadata | ✅ |
| 8 | **Notifications** bell shows an unread count and the "Project Created" entry | ✅ |
| 9 | **API Keys**: create a key with a scope; it is shown once, then listed masked | ✅ Creation works (but the key cannot be *used*, see §4) |
| 10 | **Settings → General** loads the workspace name and slug | ✅ (save not exercised) |
| 11 | **Usage** page | ❌ Every resource shows **"Exceeded 0/0"** and the plan name is blank |
| 12 | **Team** page lists members | ⚠️ Lists the owner, but **no "Invite Member" button** appears even for the owner |
| 13 | **Dashboard** "Projects" counter and "Recent Activity" | ⚠️ Counter stays at 0 after a project is created; Recent Activity is a hardcoded placeholder |
| 14 | Login (API) / `GET /auth/me` | ✅ 200 / 200 |
| 15 | **Refresh token** (`POST /api/auth/refresh` with a freshly issued token) | ❌ **401 "Invalid or expired refresh token"** |
| 16 | Invite flow (API): create invitation → accept | ⚠️ Create works, but the token is never returned or emailed. Acceptance only worked by reading the token from the DB. |
| 17 | RBAC (API): Member tries to self-promote / archive a project | ✅ 403 for both |
| 18 | Last-owner guard (API): owner removes or demotes self | ✅ 400 for both |
| 19 | **Cross-tenant isolation** (API): User B reads/patches Workspace A's project or task, with B's own workspace header and with A's header | ✅ 403 in all 4 cases; no data leaked |
| 20 | Member creates or lists tasks in a project | ❌ 403 "Not a member of this project". There is no way to add project members afterwards (see §4). |
| 21 | API key used against `/api/projects` (`x-api-key` or `Bearer`) | ❌ 401 |
| 22 | 40 rapid failed logins | ❌ 0 × 429. No rate limiting is applied. |

### Console & Network Health
- **Console:** no runtime JS exceptions. React reports a DOM-nesting error on the project detail page: `<div>` (Badge) inside `<p>` at `project-detail-page.tsx` (Status card), which would cause a hydration error.
- **Network:**
  - The expected failures were reproduced: `PATCH /api/tasks/:id` **400** (blocked status). The 401s on refresh and on API-key use came from direct API calls.
  - All other UI requests (`/api/projects`, `/api/tasks`, `/api/api-keys`, `/api/notifications`, `/api/audit`, `/api/usage`) returned 2xx.
  - No missing static assets.
- **Not tested:**
  - Access-token expiry in the browser (would require waiting 15 minutes). The underlying refresh bug was proven directly against the API.
  - Workspace deletion and ownership transfer, which are destructive by design.
  - Responsive/mobile layouts.

---

## 4. What Is Left (Gaps, Bugs & Incomplete Work)

### Broken or Non-Functional Features
1. **Token refresh is broken for every user.**
   - `auth.service.ts:89-103` hashes the presented refresh token with **salted bcrypt** and then looks it up with `findFirst({ tokenHash: <new hash> })`. A new salted hash never equals the stored one, so refresh always returns 401.
   - `logout(refreshToken)` (`:113-121`) has the same flaw and silently never revokes.
   - Effect: sessions die when the 15-minute access token expires.
2. **API keys cannot authenticate anything.** `ApiKeyAuthGuard` / `ApiKeyScopesGuard` / `@RequireScopes` are defined and provided but are **never applied** to any controller.
3. **Rate limiting is never applied.** `RateLimitGuard` is not referenced by any controller or `APP_GUARD`. The service also **fails open** when Redis is down (`rate-limit.service.ts`).
4. **Task status "Blocked" is impossible, and the enum contradicts the MVP rules.**
   - The backend `TaskStatus` enum is `todo | in_progress | completed | cancelled` (`schema.prisma`, `schema.dbml`).
   - The frontend and AGENTS.md scope rule require `Todo / In Progress / Blocked / Completed`.
   - Result: `blocked` → 400, and `cancelled` is accepted but invisible in the UI.
5. **Usage endpoint is broken.**
   - `usage.controller.ts` passes `membership.plan`, but the plan lives at `membership.workspace.plan`.
   - `getLimit(undefined)` returns 0, so every resource reports `exceeded: true`.
   - Plan limits are also **never enforced**: `UsageService.checkLimit` has no callers, and usage counters are incremented only for API keys.
6. **Invitations cannot be delivered.** The token is neither returned in the API response nor emailed, and the Team UI has no copy-link feature. `/accept-invitation?token=` is unreachable in practice.
7. **Invite / role-management UI never renders.** `team-page.tsx:186` uses `members.find(m => m.userId === currentOrganization?.id)`, comparing a **user id to a workspace id**. `currentUser` is always undefined, so the Invite button and role menus are hidden for everyone.
8. **Members are locked out of tasks.**
   - Task read/write requires a `ProjectMember` row for non-admins.
   - `ProjectMember` rows can only be set through `memberIds` at project creation. The UI form does not send them, and no endpoint adds members later.
9. **Task create form ignores Status/Priority.** In `project-detail-page.tsx:454-502`, Radix `<Select>` is spread with `{...register()}`, which never wires `onValueChange`.
10. **Workspace slug input bugs** (`create-workspace-page.tsx`):
    - Auto-slug stops after the first character (line 47 compares against the slug of the *current* name).
    - The `onChange` sanitizer strips trailing hyphens on every keystroke, so `carol-labs` was saved as `carollabs`.
    - The `ourzo.app/` prefix overlaps the input text.
11. **Conditional hooks (runtime crash risk).** `projects-page.tsx:55-76`, `usage-page.tsx:52-59` and `team-page.tsx:69-94` return early before calling hooks. When `workspaceId` goes from undefined to defined, React throws "Rendered more hooks than during the previous render".
12. **Dashboard shows stale/placeholder data.** The project count comes from the persisted Zustand org object, not live data, and "Recent Activity" is hardcoded.
13. **Task card title is invisible** (0px width) because the status `<Select>` consumes the narrow Kanban column.
14. **`/profile` route** renders the stub text "Profile page - coming soon" (`router.tsx:71`).

### Incomplete Implementations
- **TODO/FIXME/HACK scan:** none found in `apps/api/src` or `apps/web/src`. Incompleteness shows up as dead code instead: unused API-key and rate-limit guards, an unused `SystemRolesGuard`, an unused `UsageService.checkLimit`, and `UsageRepository` upserts only for API keys.
- **Audit coverage is partial.** Workspace create/update/delete, member role changes and removals, ownership transfer and failed auth are not audited.
- **Duplicate `/health` route.** Both `AppController` and `HealthController` map `GET /health`.
- **Deployment artifacts:**
  - `start:prod` runs `node dist/main` and the Dockerfile `CMD` runs `dist/main.js`, but `nest build` emits `dist/src/main.js`, because `prisma.config.ts` at the API root widens `rootDir`.
  - The Dockerfile `COPY`s root-level files (`pnpm-workspace.yaml`, `apps/api/...`), but both CI and Compose use `context: ./apps/api`.
  - It runs `pnpm prisma:generate` at root (no such root script) and `pnpm --filter=api` (the package is now named `ourzo-api`).
  - Its HEALTHCHECK probes `/api/health`, but the route is `/health`.
- **CI cannot pass.**
  - The root `package.json` only defines `dev` and `build`, so `pnpm lint`, `pnpm format:check` and `pnpm test` in `ci.yml` fail.
  - The web build also fails on type errors.
- `.env.example` references `apps/api/.env.production.example`, which does not exist.
- There is **no root `README.md`**, and Husky/lint-staged (required by AGENTS.md) are **not configured**.

### Code Quality & Technical Debt
- **Tests:** a single scaffold test.
  - There are **no tenant-isolation tests** for any resource, which AGENTS.md High-Risk Rule #5 requires.
  - `jest-e2e.json` and the unit `moduleNameMapper` point to `test/__mocks__/*.mock.ts` files that **do not exist**, and there are no `*.e2e-spec.ts` files.
  - The web app has no Vitest/RTL setup at all.
- **Security concerns:**
  - **Token leakage in logs.** `workspace-context.guard.ts` logs `JSON.stringify(request.headers)` when the workspace id is missing. That includes the `Authorization: Bearer …` header.
  - **Weak API-key entropy.** `api-keys.service.ts:52-57` builds keys with `Math.random()`; it should use `crypto.randomBytes`.
  - **Existence oracle across tenants.** Foreign IDs return 403 "Project/Task does not belong to this workspace" instead of a uniform 404.
  - **Unscoped queries by ID.** `tasks.repository.ts` (`findById`, `update`, `delete`) queries `where: { id }` without `workspaceId`; isolation relies on a post-fetch service check. AGENTS.md classifies this as a severe bug pattern.
  - **Tokens in localStorage.** Access and refresh tokens are persisted there (`auth-storage`), which exposes them to XSS.
  - Logout does not invalidate the access token (expected for short-lived JWTs, but combined with the broken refresh revocation, nothing is revoked).
  - Several services (`api-keys`, `tasks`, `projects`, `invitations`) call `this.prisma.*` directly instead of going through their repositories, which breaks the mandated layering.
- **Type safety:** the API `tsconfig` does not enable `"strict": true` (only selected strict flags), and the web app has 4 TS errors.
- **Lint config softening:** ESLint downgrades `no-explicit-any` to off and the `no-unsafe-*` / floating-promise rules to warnings. The `lint` script runs with `--fix`, so it mutates files when CI runs it.
- **Dependency drift vs. approved stack:** `@types/ioredis` is listed with `ioredis@6` (which ships its own types), and oxlint is used instead of ESLint+Prettier on web. Neither change is recorded in the tech-stack docs.

---

## 5. Recommended Next Steps (Prioritized Roadmap)

### 1. Immediate Fixes (P0): blocking core functionality or security
1. **Fix refresh/logout token lookup.** Store a deterministic SHA-256 HMAC of the refresh token (or look up by the JWT `jti`/id and then `bcrypt.verify`) in `auth.service.ts`.
2. **Fix the web build.**
   - Resolve the 4 TS errors in `organization.store.ts`.
   - Move all hooks above the early `return`s in `projects-page`, `usage-page` and `team-page`.
3. **Align TaskStatus with scope.**
   - Replace `cancelled` with `blocked` via a Prisma migration.
   - Update the DTOs and `schema.dbml`.
4. **Fix the Team page `currentUser` lookup** (compare against the auth store's `user.id`) so invites and role management appear.
5. **Remove header logging** from `WorkspaceContextGuard`, or redact `authorization`.
6. **Make invitations deliverable.** Return an accept link to Owner/Admin on creation (with a copy button in the UI) until email exists.
7. **Unblock members on tasks.** Add project-member management (endpoint + UI), or auto-add the creator and allow workspace members per the business rules.

### 2. Short-Term Completions (P1): finish partially built features
1. **Apply guards.**
   - Add `RateLimitGuard` globally, with a stricter limit on `auth/login|register`.
   - Wire `ApiKeyAuthGuard` + `ApiKeyScopesGuard` onto the routes meant for programmatic access.
   - Decide fail-open vs. fail-closed for Redis.
2. **Fix the usage plan source** (`membership.workspace.plan`). Call `UsageService.checkLimit` and increment counters on project/task/member/API-key creation.
3. **Fix the task form.** Bind Radix Selects via `Controller`/`setValue`, fix the card layout so titles show, and invalidate the progress/counter queries after mutations.
4. **Fix the slug UX:**
   - Track a "user edited" flag for auto-slug.
   - Stop stripping trailing hyphens mid-typing.
   - Fix the prefix overlap.
5. **Dashboard.** Fetch live counts, and wire Recent Activity to `/api/audit` (or remove it).
6. **Fix deployment.**
   - Correct the `start:prod`/Docker entrypoint paths (or move `prisma.config.ts` out of the TS root).
   - Fix the Docker build context and filter name.
   - Point HEALTHCHECK at `/health` and remove the duplicate route.
   - Add root `lint`/`test`/`format:check` scripts so CI runs.
7. **Make tenant isolation explicit.** Add `workspaceId` to every tenant-owned `where` clause (tasks repository first), and return a uniform 404 for foreign IDs.
8. **Replace `Math.random()`** with `crypto.randomBytes` for API keys.
9. **Extend audit logging** to workspace, member, role and ownership events.

### 3. Hardening & Polish (P2): tests, performance, refactoring
1. **Build the test suite AGENTS.md requires:**
   - E2E tenant-isolation tests (Workspace A vs. B) for projects, tasks, memberships, usage, notifications, audit logs and API keys.
   - RBAC tests (self-promotion, last owner).
   - Auth refresh/logout tests.
   - Create the missing `test/__mocks__` files.
   - Add Vitest + RTL to web.
2. Enable `"strict": true` in the API `tsconfig`, restore the stricter ESLint rules, and drop `--fix` from the CI lint script.
3. Add Husky + lint-staged, a root `README.md`, and the missing `.env.production.example`.
4. Move tokens out of `localStorage`: put the refresh token in an httpOnly cookie and keep the access token in memory.
5. Route all service DB access through repositories for consistent layering.
6. Update `docs/` (tech stack: oxlint, ioredis v6; `schema.dbml` task statuses) to match the code.
7. Commit the large uncommitted working set in reviewable chunks. About 60 paths, including most new modules, currently exist only in the working tree.
