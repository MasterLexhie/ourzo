# Ourzo — System Architecture

## 1. Architecture Goal

Ourzo is designed as a modular monolith that demonstrates production-oriented SaaS engineering without introducing unnecessary distributed-system complexity.

The product-management functionality remains intentionally lightweight.

The primary engineering focus is:

- Multi-tenancy
- Tenant isolation
- Authentication
- Authorization/RBAC
- Resource access control
- Data architecture
- Security
- Testing
- Observability
- Scalability
- Architectural trade-offs

---

## 2. High-Level Architecture

```text
                         ┌──────────────────────┐
                         │       Ourzo Web      │
                         │   React + TypeScript │
                         │        + Vite        │
                         └──────────┬───────────┘
                                    │
                              HTTPS / REST
                                    │
                                    ▼
                    ┌──────────────────────────────┐
                    │        Ourzo API             │
                    │   NestJS Modular Monolith    │
                    │                              │
                    │ Authentication               │
                    │ Users                        │
                    │ Workspaces / Tenancy         │
                    │ Membership / RBAC            │
                    │ Projects                     │
                    │ Tasks                        │
                    │ Usage                        │
                    │ Audit Logs                   │
                    │ Notifications                │
                    │ API Keys                     │
                    └─────────────┬────────────────┘
                                  │
                     ┌────────────┴────────────┐
                     │                         │
                     ▼                         ▼
              ┌──────────────┐         ┌──────────────┐
              │ PostgreSQL   │         │    Redis     │
              │              │         │              │
              │ Primary data │         │ Rate limits  │
              │ Tenant data  │         │ Caching      │
              │ Audit data   │         │ Short-lived  │
              └──────────────┘         │ state        │
                                       └──────────────┘
```

---

## 3. Frontend

### Technology

- React
- TypeScript
- Vite
- React Router
- TanStack Query

The frontend is a standalone React SPA that communicates with the NestJS backend through a REST API.

### Responsibilities

The frontend handles:

- Registration
- Login
- Workspace onboarding
- Workspace selection
- Workspace dashboard
- Member management
- Invitations
- RBAC interfaces
- Project management
- Task management
- Project status
- Project progress
- Usage dashboard
- Audit logs
- Notifications
- API-key management
- Workspace settings
- Loading states
- Error states
- Empty states
- Responsive UI

### Security Boundary

The frontend is not a security boundary.

It may hide UI elements based on permissions, but every security-sensitive decision is enforced by the backend.

---

## 4. Backend

### Technology

- NestJS
- TypeScript
- REST API

The backend is a single deployable modular monolith.

Internal modules:

```text
Ourzo API
│
├── Auth
├── Users
├── Workspaces
├── Membership
├── Authorization
├── Projects
├── Tasks
├── Usage
├── Audit
├── Notifications
└── API Keys
```

Each module has a defined responsibility.

Modules communicate through explicit application-level interfaces.

---

## 5. Database

PostgreSQL is the primary source of truth.

It stores:

- Users
- Workspaces
- Memberships
- Roles
- Projects
- Tasks
- Usage
- Notifications
- API-key metadata
- Audit logs

Tenant-owned resources have an explicit relationship to their workspace.

---

## 6. Redis

Redis is not the primary datastore.

Initial uses:

- Rate limiting
- Short-lived state
- Selective caching

Redis should only be introduced where it provides a clear architectural benefit.

---

## 7. Request Flow

```text
React Client
     │
     ▼
HTTP Request
     │
     ▼
Authentication
     │
     ▼
Identify User
     │
     ▼
Resolve Workspace
     │
     ▼
Verify Membership
     │
     ▼
Check Permission
     │
     ▼
Check Resource Tenant
     │
     ▼
Execute Business Logic
     │
     ▼
PostgreSQL / Redis
     │
     ▼
Audit Event where applicable
     │
     ▼
HTTP Response
     │
     ▼
React Client
```

The backend must never assume that possession of a resource ID is sufficient authorization.

---

## 8. Architectural Style

Ourzo uses:

> React SPA + NestJS Modular Monolith + PostgreSQL + Redis

The MVP does not use:

- Kubernetes
- Service meshes
- Multiple backend services
- Message brokers
- Multiple databases
- Event-driven microservices

unless a demonstrated requirement later justifies them.

---

## 9. Infrastructure

| Component | Technology | Purpose |
|---|---|---|
| Frontend | React + Vite | Web application |
| Routing | React Router | Client-side routing |
| Server state | TanStack Query | API/server-state management |
| Backend | NestJS | REST API |
| Language | TypeScript | Frontend + backend |
| Database | PostgreSQL | Persistent storage |
| Cache/state | Redis | Rate limiting/cache |
| Containers | Docker | Reproducible environment |
| CI | GitHub Actions | Automated validation |

---

## 10. Core Architectural Principle

> Keep the infrastructure simple; make the application architecture deliberate.

Complexity should primarily exist in:

- Multi-tenancy
- Authorization
- Security
- Data integrity
- Failure handling
- Testing
- Observability
- Scalability reasoning

rather than infrastructure count.
