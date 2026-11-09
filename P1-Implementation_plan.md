# P1 Implementation Plan: Short-Term Completions
**Source:** `AUDIT_REPORT.md` §5.2 (2026-11-09)  
**Priority:** P1. Finish the features that are partially built, wire up dead code, and make the build and deploy pipeline work.  
**Prerequisite:** P0 complete.

## 1. Objective & Scope
Make the remaining "headline" capabilities actually work:
- Rate limiting
- API-key access
- Plan limits
- Explicit tenant scoping
- Audit coverage

Also polish the task board, workspace slug and dashboard UX, and make Docker and CI build successfully.

## 2. Constraints (from AGENTS.md)
- Use `pnpm` only. Do schema changes with Prisma Migrate only. Keep `docs/` in sync.
- Keep the controller → service → repository layering. Enforce authorization in the backend.
- Treat any tenant-owned query without a `workspaceId` filter as a severe bug.
- An API key must be scoped to exactly one workspace (High-Risk Rule #4).
- **Dependency flagged for approval:** Prettier for `apps/web` (P1-7). It is in the approved stack but not yet installed in web.

## 3. Work Items

### P1-1: Apply rate limiting
**Problem:** `RateLimitGuard` (`apps/api/src/rate-limit/rate-limit.guard.ts`) is never registered. 40 rapid logins produced zero 429 responses.

**Changes:**
1. Register `RateLimitGuard` as an `APP_GUARD` provider in `app.module.ts`. It is a no-op without `@RateLimit` metadata.
2. Add `@RateLimit({ keyPrefix: 'auth', maxRequests: 10, windowMs: 60_000 })` to `auth.controller.ts` `register`, `login` and `refresh` (IP-keyed).
3. Add a class-level default `@RateLimit({ keyPrefix: 'user', maxRequests: 300, windowMs: 60_000 })` on the workspace-scoped controllers.
4. Read the limits from env: add `RATE_LIMIT_AUTH_MAX`, `RATE_LIMIT_DEFAULT_MAX` and the window settings to `apps/api/.env.example`.
5. Correct the guard behaviour:
   - Throw `HttpException(..., HttpStatus.TOO_MANY_REQUESTS)` instead of `ForbiddenException`.
   - Set `Retry-After` and `X-RateLimit-Remaining` headers.
6. Make the Redis-failure policy explicit in `rate-limit.service.ts`:
   - **Fail closed** (reject) for `auth`.
   - **Fail open**, with an error log, elsewhere.

**Acceptance criteria:**
- The 11th login within 60 seconds from one IP returns 429 with `Retry-After`.
- Normal UI usage is unaffected.

### P1-2: Make API-key authentication work
**Problems:**
- `ApiKeyAuthGuard`/`ApiKeyScopesGuard`/`@RequireScopes` are never applied.
- JWT and API keys both use `Authorization: Bearer`.
- `WorkspaceContextGuard` requires `request.user`.

**Changes:**
1. **New composite guard** `JwtOrApiKeyGuard` in `apps/api/src/auth/guards/`:
   - If the bearer token starts with `ourzo_`, delegate to `ApiKeyAuthGuard` (sets `request.apiKey`). Otherwise delegate to `JwtAuthGuard`.
   - Return **401** for invalid or revoked keys (the current guard returns 403).
   - Delete the unused passport `ApiKeyStrategy`, so there is one implementation.
2. **Workspace context.** Extend `WorkspaceContextGuard`: when `request.apiKey` is set, the workspace **is** `apiKey.workspaceId`.
   - If a different `X-Workspace-Id`, param or query workspace is supplied, return **403**.
   - Skip the membership lookup but still reject soft-deleted workspaces.
3. **Scopes.** Apply `@RequireScopes(...)` + `ApiKeyScopesGuard` (scopes are only checked for API-key requests) using `VALID_SCOPES` from `api-keys.service.ts`:
   - `projects:read` / `projects:write` on project read and write routes
   - `tasks:read` / `tasks:write` on task routes
   - `members:read` on `GET /api/members`
   - `usage:read` on `GET /api/usage`
   - `audit:read` on `GET /api/audit`
4. **JWT-only routes.** Member mutations, invitations, API-key management, organization mutations and auth stay on `JwtAuthGuard`; keys cannot reach them.
5. **Actor attribution.** For key requests, resolve the acting user as the key's `createdBy`, and add `{ via: 'api_key', apiKeyId }` to audit metadata.
6. **Usage tracking.** Update `lastUsedAt` on successful auth. Apply `@RateLimit({ keyPrefix: 'api-key', ... })`.

**Acceptance criteria:**
- A key with `projects:read` gets 200 on `GET /api/projects` and 403 on `POST /api/projects`.
- A Workspace-A key with a Workspace-B header gets 403.
- A revoked key gets 401.
- Key requests appear in the audit log with `via: api_key`.

### P1-3: Fix usage reporting and enforce plan limits
**Problems:**
- `usage.controller.ts` passes `membership.plan` (undefined), so every limit is 0 and every resource reports "exceeded".
- `UsageService.checkLimit` has no callers.

**Changes:**
1. Use `membership.workspace.plan`. Better: have `UsageService.getUsage(workspaceId)` load the plan itself.
2. Define the counting semantics, and document them in `docs/architecture/usage-and-limits.md`:
   - **members, projects, api_keys:** current totals via count queries (non-deleted or non-revoked).
   - **tasks:** per billing period (the existing `Usage` table).
3. Call `UsageService.checkLimit` before:
   - project create (`projects.service.ts`)
   - task create (`tasks.service.ts`)
   - invitation create and accept (`invitations.service.ts`)
   - API-key create (`api-keys.service.ts`)

   On exceeding a limit, throw 403 `"<resource> limit reached (x/y)"` (business rule #44).
4. Import `UsageModule` into those modules.
5. Replace the ad-hoc `prisma.usage` code in `api-keys.service.ts` with `UsageService`/`UsageRepository`.
6. Frontend (`features/usage/pages/usage-page.tsx`):
   - Show the plan name.
   - Render the "Exceeded" state only when `limit > 0 && current >= limit`.

**Acceptance criteria:**
- On the free plan, the 4th project returns 403 with a limit message.
- The Usage page shows real counts and "Free".

### P1-4: Task form & board fixes
File: `apps/web/src/features/projects/pages/project-detail-page.tsx`.
1. Replace `{...register("status"|"priority"|"assigneeId")}` on the Radix `<Select>`s with react-hook-form `<Controller>` (`value` + `onValueChange`).
2. Restructure the task card so the title is on its own row above the controls. Remove the `truncate`/`min-w-0` collapse that makes the title 0px wide.
3. Change the Status card's `<p>` wrapping a `<Badge>` to a `<div>`. This fixes the DOM-nesting console error.
4. In `hooks/useTasks.ts`, invalidate the `tasks`, project-progress and `projects` query keys on create, update and delete success.

**Acceptance criteria:**
- A task created as Blocked/High lands in the Blocked column with its title visible.
- The progress card updates without a reload.
- No React console errors.

### P1-5: Workspace slug UX
Files: `features/organizations/pages/create-workspace-page.tsx`, and the slug field in `features/settings/pages/settings-page.tsx`.
1. Add a `slugTouched` state. Auto-generate the slug from the name (`slugify`) until the user edits the slug field.
2. Keep the per-keystroke sanitizer to lowercasing and stripping `[^a-z0-9-]`. Trim leading and trailing `-` on blur and submit only.
3. Render the `ourzo.app/` prefix as an adjacent input addon (flex) rather than an overlay.

**Acceptance criteria:**
- Typing "Carol Labs" yields `carol-labs`.
- A manually typed `my-team` is saved as `my-team`.
- The prefix does not overlap the text.

### P1-6: Dashboard live data
File: `features/dashboard/pages/dashboard-page.tsx`.
1. Derive the project and member counts from `useProjects(workspaceId)` and `useMembers(workspaceId)` instead of the persisted `currentOrganization.projectCount`.
2. Replace the hardcoded "Recent Activity" placeholder:
   - **Owner/Admin:** show the latest 5 entries from `useAudit`.
   - **Members:** show the latest notifications, or hide the panel.

**Acceptance criteria:** counts update immediately after a project is created, and Recent Activity shows real events.

### P1-7: Deployment & CI
1. **Build output.** In `apps/api/tsconfig.build.json`, add `"include": ["src/**/*"]` so `nest build` emits `dist/main.js`. The Prisma CLI loads `prisma.config.ts` directly. `start:prod` (`node dist/main`) and the Dockerfile `CMD` then become correct.
2. **Dockerfile** (`apps/api/Dockerfile`):
   - Build from the **repo root**: in `.github/workflows/ci.yml` and `docker-compose.dev.yml`/`.prod.yml`, set `context: .` and `file`/`dockerfile: apps/api/Dockerfile`.
   - Use `pnpm --filter ourzo-api prisma:generate` and `pnpm --filter ourzo-api build`.
   - Point HEALTHCHECK at `/health`.
3. **Duplicate route.** Remove `GET /health` from `app.controller.ts`; `HealthController` remains. Update `app.controller.spec.ts`.
4. **Root scripts** in `package.json`:
   - `"lint": "turbo lint"`, `"test": "turbo test"`, `"format:check": "turbo format:check"`
5. **Per-app scripts:**
   - **api:** `"lint": "eslint \"{src,test}/**/*.ts\""` (no `--fix`), `"lint:fix"`, and `"format:check": "prettier --check \"src/**/*.ts\" \"test/**/*.ts\""`.
   - **web:** `"format:check"` via Prettier (**requires approval** to add the dependency).

**Acceptance criteria:**
- `pnpm lint && pnpm test && pnpm build` pass from the root.
- `docker build -f apps/api/Dockerfile .` succeeds.
- `docker compose -f docker-compose.dev.yml up` gives a healthy API container.

### P1-8: Explicit tenant scoping & uniform 404s
1. In the tasks, projects, notifications, api-keys and invitations repositories, change every by-id method to take `(id, workspaceId)`:
   - Reads use `findFirst({ where: { id, workspaceId } })`.
   - Writes use `updateMany`/`deleteMany` with `{ id, workspaceId }` and check `count === 1`.
2. Start with `tasks/repositories/tasks.repository.ts` (`findById`, `update`, `delete` currently use `where: { id }`).
3. In `tasks.service.ts` and `projects.service.ts`, delete the "does not belong to this workspace" 403 branches. Missing and foreign IDs both return `NotFoundException`.

**Acceptance criteria:**
- A foreign project or task ID returns 404 with the same body as a random UUID.
- No tenant-owned query lacks `workspaceId`. Verify with a grep review of `repositories/`.

### P1-9: Secure API-key generation
In `apps/api/src/api-keys/api-keys.service.ts:52-57`, replace `Math.random()`-based `randomString` with `crypto.randomBytes` (base32 or hex). Keep the `ourzo_<8 chars>_<32 chars>` shape so prefix lookup still works.

**Acceptance criteria:** keys are generated only from `crypto.randomBytes`, and existing keys keep validating.

### P1-10: Extend audit coverage
1. Route all writes through `AuditService` (`apps/api/src/audit/`, exported by `AuditModule`).
2. Add events:
   - `workspace.created/updated/deleted` (organizations.service)
   - `member.role_changed`, `member.removed`, `ownership.transferred` (members.service)
   - `invitation.accepted`, `invitation.revoked` (invitations.service)
3. Failed logins have no workspace. Log them with the app logger (no IP or credential values in clear) rather than in the tenant audit log.

**Acceptance criteria:** each action above produces exactly one audit row with actor, resource and metadata.

## 4. Sequencing & Dependencies
1. **P1-8 → P1-9:** safe foundations.
2. **P1-2:** depends on scoped repositories.
3. **P1-1**
4. **P1-3**
5. **P1-4 / P1-5 / P1-6:** frontend, can run in parallel.
6. **P1-10**
7. **P1-7:** last, so CI validates everything.

## 5. Docs to Update
- `docs/architecture/usage-and-limits.md`: limit semantics, rate-limit values and the Redis fail mode.
- `docs/architecture/security-architecture.md`: API-key bearer-prefix detection and the key-workspace binding.
- `docs/architecture/architecture-decision-records.md`: a new ADR "API keys share the Bearer header, distinguished by `ourzo_` prefix".
- `docs/development/ci-cd-foundation.md` and `docs/development/development-setup.md`: Docker context and root scripts.
- `apps/api/.env.example`: rate-limit variables.

## 6. Verification
1. **Static checks:** `pnpm lint`, `pnpm test` and `pnpm build` from the root.
2. **API scenario script** against a disposable DB:
   - 429 after the auth limit
   - API key: read 200 / write 403 / cross-workspace 403 / revoked 401
   - plan limit 403 on the 4th project
   - foreign IDs 404
   - audit rows for member, role and workspace events
3. **Browser:**
   - Task form status/priority persist, and the title is visible.
   - Slug auto-generation works.
   - Dashboard counts and recent activity are live.
   - The Usage page shows the plan and correct numbers.
   - No console errors.
4. **Docker/CI:** `docker build -f apps/api/Dockerfile .`, compose up with a healthy healthcheck, and a CI run on a pushed branch (or locally with `act`).

## 7. Risks
- **Global rate-limit guard:** register it after auth guards so per-user keys resolve. Keep auth limits IP-based, and watch shared NAT environments.
- **Bearer-prefix detection:** must never let an API key reach JWT-only routes. Cover this with tests in P2-1.
- **Plan-limit enforcement:** may block existing seed or dev data that is over the free limits. Provide a dev override or seed workspaces on `pro`.
- **Docker context change:** CI and compose definitions must change together.
