# Ourzo

## What This Project Is
Ourzo is a lightweight multi-tenant SaaS workspace for startups and SMEs to organize projects, teams, and business work.
The current build phase focuses on establishing a production-grade multi-tenant SaaS architecture with robust logical tenant isolation and strict workspace-scoped RBAC.
Features include lightweight project/task tracking, secure hashed API-key management, rate limiting, in-app notifications, and comprehensive append-only audit logging.
High-level capabilities such as real payment processing, third-party integrations, real-time collaboration, and mobile applications are explicitly out of scope for the current MVP phase.
The primary engineering goal of this repository is to demonstrate extreme architectural rigor, system security, and test safety over a massive feature list.

## Repository Structure
- `apps/` — Contains deployable applications including the frontend and backend.
- `packages/` — Reserved for shared packages and tooling configuration, left empty for now.
- `docs/` — Stores Visual models, design documents, requirements, and architectural decision records.
- `infrastructure/` — Contains local development containers and continuous integration setup.

- `apps/api` — NestJS backend. Responsible for all business logic, authorization, authentication, tenant isolation, and PostgreSQL database access. It must never run client-side code, serve raw static assets, or trust arbitrary client-supplied workspace IDs.
- `apps/web` — React frontend. Responsible for client-side routing, user interfaces, frontend state management, and REST API consumption. It must never connect to the database directly, contain business rules, or be treated as a security boundary.

## Technology Stack
Approved technologies:

**Frontend:**
- **React:** Used as the client UI rendering library for constructing the authenticated SaaS workspace dashboard.
- **Vite:** Used as the fast build tool and hot-reloading development server for client-side builds.
- **TypeScript:** Used to ensure strict static type safety and compile-time correctness across the entire codebase.
- **Tailwind CSS:** Used as the utility-first CSS framework for styling components rapidly and responsively.
- **shadcn/ui:** Used for reusable, accessible visual design components to keep the layout highly polished and clean.
- **React Router:** Used for managing client-side routing and establishing secure route guards for authenticated dashboards.
- **Zustand:** Used for lightweight, non-bloated global client-side state management of user sessions and current workspace context.
- **TanStack Query (React Query):** Used for server state management, caching, automatic refetching, and API request handling.
- **React Hook Form:** Used for input validation and form state management across authentication and settings screens.
- **Vitest & React Testing Library:** Used for component-level tests and user interaction test coverage.

**Backend:**
- **NestJS:** Used as the structured, module-based framework for organizing the REST API.
- **class-validator:** Used for type-safe schema and request input validation via DTOs on every API endpoint.
- **Swagger/OpenAPI:** Used for automatic documentation generation and REST API schema discovery during development.
- **JWT (JSON Web Tokens):** Used with short-lived access tokens and refresh tokens to secure SPA authentication.
- **Jest:** Used as the primary testing framework for backend unit, integration, and E2E isolation suites.

**Database & Caching:**
- **PostgreSQL:** Used as the primary relational database and persistent system of record.
- **Prisma ORM:** Used as the database client for type-safe query building and database schema migrations.
- **pg & @prisma/adapter-pg:** Used as the underlying database driver and Prisma adapter for connection management.
- **Redis:** Used exclusively for fast, ephemeral rate-limiting and temporary caching workloads.

**Infrastructure & Tooling:**
- **pnpm:** Used as the fast workspace package manager to manage monorepo dependencies cleanly.
- **Turborepo:** Used for task runner coordination, build pipelines, and caching test/lint/build operations.
- **Docker & Docker Compose:** Used to orchestrate local development containers for PostgreSQL and Redis.
- **ESLint & Prettier:** Used for automated static code analysis, formatting enforcement, and style consistency.
- **Husky & lint-staged:** Used to automatically run ESLint and Prettier formatting checks prior to committing files.

**Forbidden or Rejected Technologies:**
- **Next.js:** Rejected because SSR/SEO capabilities are not required for this authenticated, dashboard-heavy SaaS application (ADR-002).
- **Microservices:** Rejected to avoid premature distribution, network latency, and operational complexity at this scale (ADR-001, ADR-007).
- **gRPC:** Rejected because in-process modular monolith communication has no need for networking overhead in the MVP phase (ADR-008).
- **Database/Schema per Tenant:** Rejected to avoid migration bottlenecks and massive operational complexity at the MVP scale (ADR-004).

## Core Rules
1. **Use pnpm exclusively:** Execute all package installations and workspaces tasks using `pnpm` and never fallback to `npm` or `yarn` under any circumstances.
2. **Obtain approval for dependencies:** Do not introduce new third-party dependencies unless explicitly requested by the user or pre-approved in the technology stack documentation.
3. **Respect the MVP scope boundaries:** Implement only features explicitly listed in the current MVP scope; immediately reject or halt any request to build out-of-scope features such as Stripe billing, MFA, or real-time chat.
4. **Follow existing patterns:** Mimic existing design patterns, module layouts, and naming conventions within `apps/api` and `apps/web` before attempting any refactoring or introducing new abstractions.
5. **Keep documentation updated:** Update visual models, DBML schemas, and API documentation files inside `docs/` whenever any schema or configuration change is made.
6. **Escalate decision conflicts:** Stop and immediately ask the user for clarification if a requested change conflicts with a decision recorded in `docs/architecture/architecture-decision-records.md`.
7. **Ensure zero plaintext secrets:** Always read secrets and credentials from environment variables at runtime and never hardcode or commit them to the repository.
8. **Keep logic in appropriate layers:** Enforce controllers to delegate to services, which in turn delegate to repositories or database access layers.

## Architecture Boundaries
- **Frontend vs Backend:** The frontend (React SPA) and the backend (NestJS API) must remain strictly separate. The React client owns only UI rendering and UX logic, while the backend owns all business logic, tenant isolation, and database querying. No database connections, raw credentials, or security-sensitive evaluations may ever cross into the frontend application. Details: `docs/development/frontend-architecture.md`
- **Backend vs Database:** The backend modular monolith communicates with the PostgreSQL database through Prisma ORM or parameterized raw SQL. Application controllers must never perform database actions directly; they must delegate to service layers, which interact with repositories. Raw SQL queries must never bypass parameterization or be used for standard CRUD operations. Details: `docs/architecture/database-access-strategy.md`
- **Tenant Data Isolation:** A strict boundary separates tenant workspaces. A user can belong to multiple workspaces, but must be validated as a member of the target workspace on every request. Data or resource IDs from Workspace A must never cross into or be accessed by requests resolving to Workspace B. Details: `docs/architecture/multi-tenancy.md`
- **Authentication vs Authorization:** Authentication verifies a user's platform identity, whereas authorization establishes what that identity is permitted to do inside a specific tenant workspace. These must remain separate concerns; session verification must precede tenant membership checks and resource-level permission validation. Details: `docs/architecture/security-architecture.md`
- **Platform-level vs Tenant-level:** Platform-level roles (System Admin) exist independently of tenant-level roles (Owner, Admin, Member). System Admin access must remain completely decoupled from workspace contexts and must never be implemented by simply granting tenant Owner permissions. Details: `docs/product/user-types-and-roles.md`

## High-Risk Rules

### Tenant Isolation
1. Verify workspace membership for the resolved user context on every workspace-scoped API operation.
2. Require both `projectId` and `workspaceId` explicitly in data access query parameters to prevent cross-tenant ID manipulation.
3. Treat any database query for a tenant-owned resource that lacks an explicit `workspaceId` filter as a severe security bug.
4. Verify that API keys are scoped to exactly one workspace and reject any attempt to use a key from Workspace A against Workspace B.
5. Cover tenant-isolation verification with automated tests for every tenant-owned resource (projects, tasks, memberships, usage, notifications, audit logs, API keys).
6. Fail requests immediately if workspace membership check or tenant context cannot be established on any protected endpoint.
7. Prevent users from horizontal privilege escalation by manipulating project or task IDs across workspaces.

### Authorization
1. Enforce all permission and role-based checks exclusively within the backend service layer, never in controllers or on the frontend.
2. Reject any privileged operation immediately with an appropriate authorization error if the required role check or membership validation is missing.
3. Validate that a user cannot assign themselves a higher role or modify another member's role unless they hold Owner or Admin permissions.
4. Block any attempt to remove the last remaining Owner from a workspace.
5. Treat any frontend permission verification as a user experience (UX) feature only and never rely on it as a security boundary.
6. Enforce that role changes, invitations, settings updates, and project archival are restricted to Owner or Admin roles specifically as documented.

### Tooling
1. Execute all dependency management and build tasks exclusively using `pnpm`.
2. Configure all Turborepo tasks under the `tasks` key in `turbo.json` and never use the deprecated `pipeline` key.
3. Enable and satisfy strict type-checking in `tsconfig.json` for both `apps/api` and `apps/web`.
4. Read all secrets and credentials exclusively from environment variables at runtime and never commit them to source control.
5. Use Husky and lint-staged to run ESLint and Prettier formatting checks prior to committing any file.
6. Run all database schema changes exclusively through Prisma Migrate and never make manual schema adjustments.
7. Ensure that the root `package.json` specifies the exact `packageManager` and matches the lockfile.

### Scope
1. Implement only the predefined MVP features including JWT auth, workspace management, Owner/Admin/Member RBAC, lightweight projects, and tasks.
2. Reject the implementation of payment processing, custom roles, MFA, microservices, or subtasks.
3. Confine lightweight project tracking to Planned, In Progress, Paused, Completed, or Archived statuses.
4. Keep lightweight tasks restricted to Todo, In Progress, Blocked, or Completed statuses.
5. Prevent the introduction of Gantt charts, real-time collaboration chats, calendar integrations, or third-party integrations as they are explicitly out of scope.

## Documentation Reference
| Topic | File |
|---|---|
| Product requirements and scope | docs/product/mvp-scope.md |
| Business rules | docs/product/business-rules.md |
| User Journeys | docs/product/user-journeys.md |
| Acceptance Criteria | docs/product/acceptance-criteria.md |
| MVP Success Criteria | docs/product/mvp-success-criteria.md |
| Functional requirements | docs/product/functional-requirements.md |
| User Types and Roles | docs/product/user-types-and-roles.md |
| System architecture | docs/architecture/system-architecture.md |
| Multi-tenancy strategy | docs/architecture/multi-tenancy.md |
| Security architecture | docs/architecture/security-architecture.md |
| Database design and schema | docs/database/data-design.md |
| Database visual representation | docs/database/schema.dbml |
| Database access patterns | docs/architecture/database-access-strategy.md |
| Migration strategy | docs/database/database-migrations.md |
| Reliability and Scalability | docs/architecture/reliability-and-scalability.md |
| Usage and limits | docs/architecture/usage-and-limits.md |
| Frontend architecture | docs/development/frontend-architecture.md |
| Backend architecture | docs/development/backend-architecture.md |
| Technology stack decisions | docs/development/technology-stack.md |
| Repository structure | docs/development/repository-structure.md |
| Development setup | docs/development/development-setup.md |
| CI/CD | docs/development/ci-cd-foundation.md |
| Environment configuration | docs/development/environment-configuration.md |
| Database tooling | docs/development/database-tooling.md |
| Code quality setup | docs/development/code-quality-setup.md |
| Architecture decision records | docs/architecture/architecture-decision-records.md |

## Agent Workflow
1. Confirm the task is within approved scope before starting.
2. Read the relevant existing code before writing new code.
3. Identify and read the specific documentation file for the area being changed.
4. Check whether an ADR covers this decision. If yes, follow it. If the task conflicts with it, stop and state the conflict.
5. Implement the smallest solution that satisfies the requirement.
6. Validate the change using the project's defined validation commands.
7. Check the diff for unintended changes before finishing.
8. If an architectural decision was changed, update the relevant documentation file.

If a requested change conflicts with an approved architectural decision recorded in `docs/`, do not proceed silently. State the conflict, identify the relevant ADR or architecture document, and ask for clarification before implementing.
