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
