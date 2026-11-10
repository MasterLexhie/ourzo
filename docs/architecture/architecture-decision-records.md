# Ourzo — Architecture Decision Records

---

## ADR-001 — Modular Monolith

### Status

Accepted

### Decision

Ourzo will use a modular monolith for the MVP.

### Reason

The product requires clear domain boundaries and production-oriented architecture, but does not currently require independently deployed services.

A modular monolith provides:

- Clear module boundaries
- Lower operational complexity
- Easier local development
- Simpler deployment
- Strong architectural organization
- Future service-extraction options

### Rejected Alternative

Microservices were rejected for the MVP because there is no demonstrated requirement for distributed services.

---

## ADR-002 — React + Vite Frontend

### Status

Accepted

### Decision

Ourzo will use React, TypeScript and Vite for the frontend.

### Reason

Ourzo is primarily an authenticated SaaS application and does not require SSR or SEO-heavy architecture.

A standalone React SPA provides a clean separation between:

```text
Frontend
↓
REST API
↓
Backend
```

### Rejected Alternative

Next.js was not selected because its additional server-side capabilities are not required for the current application architecture.

---

## ADR-003 — NestJS Backend

### Status

Accepted

### Decision

Ourzo will use NestJS and TypeScript for the backend.

### Reason

NestJS provides a structured architecture suitable for:

- Modular design
- Dependency injection
- REST APIs
- Authentication
- Authorization
- Testing
- Enterprise-style backend organization

It also allows the frontend and backend to share the TypeScript ecosystem.

---

## ADR-004 — Shared Database and Shared Schema

### Status

Accepted

### Decision

Ourzo will use PostgreSQL with a shared schema and explicit workspace-based tenant isolation.

### Reason

This model is appropriate for the MVP and provides a meaningful engineering challenge around tenant isolation.

Tenant-owned records will be associated with a workspace.

### Rejected Alternatives

**Database per tenant** — Rejected because it introduces unnecessary operational complexity at the current scale.

**Schema per tenant** — Rejected because it adds migration and operational complexity without providing sufficient MVP value.

---

## ADR-005 — REST API

### Status

Accepted

### Decision

React will communicate with the NestJS backend through a REST API.

### Reason

REST provides:

- Browser compatibility
- Simplicity
- Mature tooling
- Clear API boundaries
- Straightforward testing
- Appropriate semantics for the application's CRUD-oriented SaaS operations

### Rejected Alternative

gRPC is not required for browser-to-backend communication in this architecture.

---

## ADR-006 — Redis

### Status

Accepted

### Decision

Redis will be used for rate limiting and selected short-lived or cached state.

### Reason

These workloads benefit from fast ephemeral storage.

PostgreSQL remains the system of record.

### Principle

Redis should only be used where it provides a clear architectural benefit.

---

## ADR-007 — No Microservices in MVP

### Status

Accepted

### Decision

Ourzo will remain a modular monolith during the MVP.

### Reason

There is currently no demonstrated requirement for:

- Independent service deployment
- Independent service scaling
- Service isolation
- Distributed data ownership

Introducing microservices would increase operational and architectural complexity without solving a current problem.

### Future

A module may be extracted if actual scale, reliability, organizational, or performance requirements justify it.

---

## ADR-008 — No gRPC in MVP

### Status

Accepted

### Decision

gRPC will not be used in the MVP.

### Reason

The backend is a single process.

Modules communicate in-process, so gRPC would add unnecessary serialization, networking and operational complexity.

### Future Consideration

If a module such as Notifications, Usage or Audit becomes an independently deployed service, gRPC may become appropriate for internal service-to-service communication.

### Current API

```text
React → REST → NestJS
```

---

## ADR-009 — API Keys Share the Bearer Header

### Status

Accepted

### Decision

API keys are sent as `Authorization: Bearer <key>`, the same header as user JWTs. They are told apart by the `ourzo_` prefix (key shape `ourzo_<8 chars>_<32 chars>`).

### Reason

- One header keeps clients and Swagger simple.
- The prefix is unambiguous: a JWT always starts with `eyJ`.
- A key only ever reaches the routes that opt in.

### Rules

- `JwtOrApiKeyGuard` sends `ourzo_` tokens to `ApiKeyAuthGuard` and everything else to `JwtAuthGuard`. Key-capable controllers use it.
- An invalid, revoked or expired key gets **401**.
- A key is bound to exactly one workspace. `WorkspaceContextGuard` pins the request to it, and returns **403** if any other workspace id is supplied.
- A key acts as its creator. If the creator is no longer a workspace member, the key stops working.
- `ApiKeyScopesGuard` is deny-by-default for keys: a route must declare `@RequireScopes(...)`.
- Invitations, API-key management, organization management, member mutations, notifications and auth stay JWT-only.
- Audit entries written during key requests carry `metadata.via = "api_key"` and `apiKeyId`.

### Consequences

Any new controller that should accept API keys must opt in explicitly with the guard and scopes. Without that, keys are rejected.

---

## ADR-010 — Refresh Token in an httpOnly Cookie

### Status

Accepted

### Decision

- The refresh token is delivered only as the `ourzo_refresh` cookie, with these attributes: `HttpOnly`, `SameSite=Strict`, `Path=/api/auth`, `Secure` in production, and `Max-Age` equal to the refresh expiry.
- Response bodies carry only the short-lived access token.
- The web app keeps the access token in memory and persists only the user profile.

### Reason

Tokens in `localStorage` can be exfiltrated by any XSS payload. An httpOnly cookie can't be read by JavaScript, and the access token in memory is short-lived (15 minutes).

### Rules

- `POST /api/auth/refresh` and `POST /api/auth/logout` read the cookie.
- A `refreshToken` body field is still accepted for **one release** for older clients. It is marked deprecated in Swagger.
- Refresh rotates the token. The presented token is revoked, so replaying it returns 401.
- Every JWT carries a unique `jti`, so tokens issued within the same second never collide.
- Logout revokes the session and clears the cookie.
- On boot the SPA restores the session with a cookie-only `POST /api/auth/refresh` (`credentials: 'include'`).
- CORS allows credentials only for the exact `ALLOW_ORIGIN` list.

### Consequences

- The web app and the API must be served from the **same site** (for example `app.example.com` and `api.example.com`), otherwise `SameSite=Strict` blocks the cookie. Local development (`localhost:5173` → `localhost:3000`) is same-site.
- Users signed in before this change have to sign in once more.

