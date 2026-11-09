# P2 Implementation Plan: Hardening & Polish
**Source:** `AUDIT_REPORT.md` §5.3 (2026-11-09)  
**Priority:** P2. Covers test safety, strictness, repo hygiene, token storage, layering and docs.  
**Prerequisite:** P0 and P1 complete. Tests written here lock in their behaviour.

## 1. Objective & Scope
Deliver the "extreme architectural rigor, system security, and test safety" that AGENTS.md names as this repo's primary goal. In particular:
- The automated tenant-isolation test matrix (High-Risk Rule #5)
- Strict type-checking
- Pre-commit tooling
- Safer token storage
- Clean layering
- Accurate documentation

## 2. Constraints (from AGENTS.md)
- Use `pnpm` only. Keep `docs/` in sync. Respect the ADRs; record any new decision as an ADR.
- **New dependencies need explicit approval before work starts.** Each is in the approved stack unless noted:
  - Vitest, @testing-library/react, jsdom (web tests)
  - Husky, lint-staged (pre-commit)
  - Prettier for web (if not already approved in P1)
  - `cookie-parser` + `@types/cookie-parser` (P2-4). **Not** in the approved stack.

## 3. Work Items

### P2-1: Test suite (High-Risk Rule #5)
**Current state:**
- There is one scaffolded test.
- `test/jest-e2e.json` and the unit `moduleNameMapper` reference `test/__mocks__/*.mock.ts` files that do not exist.
- No `*.e2e-spec.ts` files exist.

**Backend unit tests** (`apps/api/src/**/*.spec.ts`):
1. Fix the Jest config: create the referenced mocks, or remove the mappers if the real `@nestjs/jwt`/`passport`/`config` modules load under ts-jest.
2. Write service tests with mocked repositories:
   - **auth:** register/login; refresh rotation; old token rejected; logout revokes
   - **members:** no self-role change, last-owner protection, admin cannot promote to owner
   - **projects:** archive rules; project-member add rejects non-workspace users
   - **tasks:** status enum; project-membership gate
   - **api-keys:** scope validation, hashing, revocation, `crypto.randomBytes` usage
   - **usage:** limit math

**Backend E2E tests** (`apps/api/test/*.e2e-spec.ts`, `@nestjs/testing` + supertest, both already devDependencies):
1. Run against a dedicated Postgres DB (CI already provisions `ourzo_test`) with `prisma migrate deploy` in global setup and truncation between suites.
2. Add a fixture helper `test/utils/tenant-fixture.ts`. It creates users A and B and workspaces A and B, and seeds one project, task, notification, invitation, API key and audit entry in each.
3. **Isolation matrix.** For each resource (projects, tasks, memberships, usage, notifications, audit logs, API keys), test these attacker paths against Workspace A:

   | Attacker path | Expected |
   |---|---|
   | User B + B's header + A's resource id | 404 |
   | User B + A's header | 403 |
   | Key B + A's header or id | 403/404 |

   In every case, assert that no A data appears in the response body.
4. **RBAC matrix:**
   - Owner, Admin and Member × role change, invite, settings update, project archive, API-key create.
   - Self-promotion is blocked, and the last owner cannot be removed.
5. **Rate-limit and API-key-scope tests** from P1: 429, read/write scopes, revoked key.

**Web tests** (Vitest + RTL + jsdom, **dependency approval required**):
1. Add `vitest.config.ts` and a `"test": "vitest run"` script.
2. Specs: `ProtectedRoute` redirect, Team page permission rendering per role, task form submits the selected status/priority, slug generation, invite-link copy state.

**Coverage:** a `test:cov` threshold (e.g. 70% lines on `src/**/*.service.ts`) enforced in CI.

**Acceptance criteria:** `pnpm test` runs api unit + e2e and web tests, all green. The isolation matrix covers all 7 resources.

### P2-2: Strictness
1. Set `"strict": true` in `apps/api/tsconfig.json` and fix the resulting errors (mostly `strictPropertyInitialization` on DTOs, so use `!` or defaults).
2. In `apps/api/eslint.config.mjs`:
   - Set `@typescript-eslint/no-floating-promises` and `no-unsafe-argument` to error.
   - Move `no-explicit-any` from off to warn to error in stages.

**Acceptance criteria:** `tsc --noEmit` and ESLint pass with the stricter settings.

### P2-3: Repo hygiene
1. **Husky + lint-staged** at the root (dependency approval required): `pnpm add -Dw husky lint-staged`, `husky init`. The pre-commit hook runs `lint-staged`:
   - `apps/api/**/*.ts`: eslint + prettier
   - `apps/web/**/*.{ts,tsx}`: oxlint + prettier
2. **Root `README.md`** covering:
   - Product summary and repo layout
   - Prerequisites (Node 22, pnpm 10.10, Docker)
   - `docker compose -f docker-compose.dev.yml up -d postgres redis`
   - Copying the `.env.example` files
   - `pnpm install`
   - `pnpm --filter ourzo-api prisma:migrate:deploy`
   - `pnpm dev`, `pnpm test`
   - A link to `docs/`
3. Create `apps/api/.env.production.example`, which `.env.example` already references, with placeholder values only. Alternatively, remove the reference.

**Acceptance criteria:** a commit with a lint or format violation is blocked, and a new contributor can run the app from the README alone.

### P2-4: Move tokens out of localStorage
**Problem:** access and refresh tokens are persisted in `localStorage` (`auth-storage`), where XSS can exfiltrate them.

**Backend:**
1. Add `cookie-parser` (**approval required**) and `app.use(cookieParser())` in `main.ts`.
2. On login, register and refresh, set the refresh token as an `httpOnly; Secure (prod); SameSite=Strict; Path=/api/auth; Max-Age=<refresh expiry>` cookie. Return only the access token in the body.
3. `refresh`/`logout` read the cookie, with a body fallback for one release. `logout` clears the cookie.
4. CORS already has `credentials: true`. Confirm that `ALLOW_ORIGIN` is exact.

**Frontend:**
1. In `stores/auth.store.ts`, change `partialize` to persist only `user`. Hold the access token in memory (store or `apiClient` field only).
2. In `services/api.client.ts`:
   - Send `credentials: 'include'` on all requests.
   - `refreshAccessToken()` posts with no body.
3. On app boot (in `app/router.tsx` or the root provider), call `/api/auth/refresh` to restore the session.

**Docs/ADR:**
- Add an ADR entry "Refresh token in httpOnly cookie".
- Add a CSRF note in `docs/architecture/security-architecture.md`: SameSite=Strict plus a cookie scoped only to `/api/auth`.
- Update `docs/development/frontend-architecture.md` (token handling section, around lines 480–510).

**Acceptance criteria:** after login, `localStorage` contains no tokens. A reload keeps the user logged in via the cookie, and logout clears it.

### P2-5: Layering cleanup
Move the direct `this.prisma.*` calls out of these services into their repositories:
- `api-keys.service.ts`
- `tasks.service.ts`
- `projects.service.ts`
- `invitations.service.ts`

Supporting changes:
- Shared workspace-membership lookups go into an exported `MembersRepository` method.
- Audit and notification writes go only through `AuditService`/`NotificationsService`.

Pattern: the service calls a repository method; only the repository holds Prisma calls, and each takes `workspaceId`.

**Acceptance criteria:** `grep -rn "this.prisma\." apps/api/src --include=*.service.ts` returns only `health.service.ts` and `prisma.service.ts`.

### P2-6: Docs sync
| File | Update |
|---|---|
| `docs/development/technology-stack.md` | oxlint on web, ioredis v6 (remove the redundant `@types/ioredis` dependency), Vitest/Husky status |
| `docs/database/schema.dbml` + `data-design.md` | TaskStatus (if not done in P0) |
| `docs/architecture/usage-and-limits.md` | Limit semantics and rate-limit fail mode (if not done in P1) |
| `docs/development/code-quality-setup.md` | Husky/lint-staged and strict settings |
| `docs/architecture/architecture-decision-records.md` | New ADRs: API-key bearer prefix, cookie refresh token |
| API docs | Project-member endpoints and invite link |

**Acceptance criteria:** every behaviour changed in P0–P2 is reflected in `docs/`.

### P2-7: Commit hygiene
**Problem:** about 60 paths are uncommitted on `main`, including most new modules.

**Steps:**
1. Create a feature branch.
2. Commit in reviewable slices, in this order:
   - (a) infra/CI/Docker
   - (b) backend modules: rate-limit, api-keys, audit, notifications, usage, projects, tasks, common
   - (c) web features
   - (d) docs
3. Run `pnpm lint && pnpm test` before each commit, and open PRs for review.

**Acceptance criteria:** `git status` is clean on the feature branch, and the history is split into reviewable commits.

## 4. Sequencing & Dependencies
1. **P2-7** first, to establish a reviewable baseline before more change.
2. **P2-1**: tests lock in P0/P1 behaviour.
3. **P2-2**
4. **P2-5**: refactor under test protection.
5. **P2-4**
6. **P2-3**
7. **P2-6**

## 5. Docs to Update
Listed in P2-6, plus the root `README.md` (new) and an `apps/api/.env.production.example` placeholder.

## 6. Verification
1. `pnpm test` runs api unit, api e2e (with the isolation and RBAC matrices) and web Vitest, all green. The coverage threshold is met in CI.
2. `pnpm lint` and `tsc --noEmit` pass with strict settings.
3. A deliberately misformatted commit is rejected by Husky.
4. Browser check:
   - Log in.
   - Confirm `localStorage` has no tokens and an httpOnly refresh cookie is present.
   - Reload; the session persists.
   - Log out; the cookie is cleared.
5. The grep check from P2-5 passes.
6. Cold start from the README succeeds on a clean clone.

## 7. Risks
- **Strict mode:** may surface many DTO initialization errors. Fix them incrementally, per module.
- **Cookie auth:** changes CORS/credentials behaviour. Test with the exact `ALLOW_ORIGIN`, and keep the body fallback for one release to avoid breaking clients.
- **E2E database:** tests need an isolated Postgres DB. Never point them at the dev database.
- **Branch split:** splitting the uncommitted work after the P0/P1 changes could create conflicts. Do P2-7 promptly, or commit P0/P1 work as it lands.
