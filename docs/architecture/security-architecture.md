# Ourzo — Security Architecture

## 1. Security Priorities

Ourzo prioritizes:

1. Authentication
2. Authorization
3. Tenant isolation
4. Input validation
5. Secret protection
6. API abuse prevention
7. Auditability
8. Dependency security

---

## 2. Authentication

### Authentication Model

Ourzo uses email/password authentication with secure server-managed authentication state.

The authentication system supports:

- Registration
- Login
- Logout
- Password reset
- Email verification
- Session management

Authentication answers:

> Who is this user?

Authorization answers:

> What is this user allowed to do?

These remain separate concerns.

---

## 3. Authorization / RBAC

### Roles

Workspace roles:

- Owner
- Admin
- Member

Authorization operates across:

```text
Workspace
    ↓
Role
    ↓
Permission
    ↓
Resource
```

The backend independently verifies authorization for every protected operation.

Frontend permission checks are only a UX feature.

---

## 4. Project Access

A user must belong to a workspace before accessing its projects.

Projects may have explicit project members.

```text
Project Member
    ⊂
Workspace Member
```

A user cannot become a project member without being a workspace member.

---

## 5. Tenant Security Boundary

```text
Browser
   ↓
Untrusted
   ↓
API
   ↓
Security Enforcement
   ↓
Application
   ↓
Database
```

The browser is never trusted.

---

## 6. API Keys

API keys support:

- Creation
- Scopes
- Secure storage
- Authentication
- Revocation
- Auditing

Lifecycle:

```text
Generate
   ↓
Display once
   ↓
Store securely
   ↓
Use
   ↓
Revoke
```

Raw API keys must not be stored in plaintext.

Every API key belongs to exactly one workspace.

### Implementation

- **Generation:** `crypto.randomBytes` with rejection sampling over `[a-z0-9]`. Shape is `ourzo_<8>_<32>`. Only a bcrypt hash and the lookup prefix (`ourzo_<8>`) are stored.
- **Transport:** `Authorization: Bearer ourzo_...`. The `ourzo_` prefix tells a key apart from a JWT (ADR-009).
- **Authentication:** `JwtOrApiKeyGuard` → `ApiKeyAuthGuard`. Invalid, revoked or expired keys get `401`, and `lastUsedAt` is updated on success.
- **Workspace binding:** `WorkspaceContextGuard` resolves the workspace from the key itself. A different `X-Workspace-Id` header, or a different workspace id in the param, query or body, gets `403`.
- **Identity:** the request acts as the key's creator. The creator's membership is re-checked on every request.
- **Auditing:** key-originated writes are tagged `via: api_key` with the `apiKeyId`.

---

## 7. API-Key Scopes

API keys should support restricted scopes.

Examples:

```text
projects:read
projects:write
tasks:read
tasks:write
```

API-key access remains subject to tenant boundaries and authorization rules.

Implemented scopes and routes (anything else is closed to keys):

| Scope | Routes |
|---|---|
| `projects:read` | `GET /api/projects`, `GET /api/projects/:id`, `GET /api/projects/:id/progress` |
| `projects:write` | `POST/PATCH/DELETE /api/projects…`, project member add/remove |
| `tasks:read` | `GET /api/tasks`, `GET /api/tasks/:id` |
| `tasks:write` | `POST/PATCH/DELETE /api/tasks…` |
| `members:read` | `GET /api/members` |
| `usage:read` | `GET /api/usage` |
| `audit:read` | `GET /api/audit` |

---

## 8. Rate Limiting

Redis-backed rate limiting is used to protect the API.

Conceptual categories:

```text
Authentication endpoints
    → strict

Normal authenticated API
    → moderate

API-key requests
    → workspace/client based

Sensitive operations
    → stricter
```

### Implemented policies

`RateLimitGuard` runs after authentication, and limits are read from the environment.

| Policy | Applied to | Key | Default | Env vars | Redis down |
|---|---|---|---|---|---|
| `auth` | register, login, refresh | client IP | 10 / 60 s | `RATE_LIMIT_AUTH_MAX`, `RATE_LIMIT_AUTH_WINDOW_MS` | **fail closed** (503) |
| `user` | all authenticated controllers | user id | 300 / 60 s | `RATE_LIMIT_DEFAULT_MAX`, `RATE_LIMIT_WINDOW_MS` | fail open (logged) |
| `api-key` | key-authenticated requests | API key id | 120 / 60 s | `RATE_LIMIT_API_KEY_MAX`, `RATE_LIMIT_WINDOW_MS` | fail open (logged) |

- Exceeding a limit returns `429 Too Many Requests` with a `Retry-After` header.
- Every limited response carries `X-RateLimit-Limit` and `X-RateLimit-Remaining`.

---

## 9. Input Validation

All external input must be validated.

This includes:

- Request bodies
- Query parameters
- Route parameters
- Authentication inputs
- API-key inputs

---

## 10. Secrets

Secrets must come from environment/configuration management.

Never commit:

- Passwords
- API keys
- Database credentials
- Authentication secrets

---

## 11. Password Security

Passwords must use a modern password-hashing algorithm.

Passwords must never be stored in plaintext.

---

## 12. OWASP-Oriented Testing

Relevant security testing includes:

- Broken access control
- Authentication failures
- Injection
- Security misconfiguration
- Sensitive-data exposure
- Rate-limit/abuse scenarios
- Tenant-isolation failures

---

## 13. Security Principle

> Every security-sensitive decision is enforced on the backend.

The frontend is considered untrusted.
