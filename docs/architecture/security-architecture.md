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

Exact limits will be defined during implementation.

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
