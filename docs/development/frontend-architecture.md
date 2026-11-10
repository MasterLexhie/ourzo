# Ourzo — Frontend Architecture

## Purpose

This document defines the frontend architecture for the Ourzo SaaS platform.

The goal is to establish:

- Clear frontend organization.
- Maintainable React application structure.
- Separation between UI, state, and API communication.
- Consistent development patterns.

---

## Frontend Technology

Frontend application:

```text
React
Vite
TypeScript
```

Location:

```text
apps/web
```

Supporting technologies:

```text
Tailwind CSS
shadcn/ui
React Router
Zustand
TanStack Query
React Hook Form
```

---

## Architecture Approach

Ourzo uses a feature-based React architecture.

The application is organized around business capabilities rather than technical file types.

Structure:

```text
Feature

↓

Components

↓

Hooks

↓

Services

↓

API
```

---

## Frontend Responsibilities

The frontend is responsible for:

- Rendering user interfaces.
- Managing client-side state.
- Handling user interactions.
- Communicating with backend APIs.
- Managing application navigation.
- Providing user feedback.

The frontend does not:

- Access the database directly.
- Contain backend business rules.
- Enforce security decisions.

---

## Application Structure

```text
apps/web/

├── src/
│
│   ├── app/
│   │
│   ├── features/
│   │
│   ├── components/
│   │
│   ├── layouts/
│   │
│   ├── services/
│   │
│   ├── hooks/
│   │
│   ├── stores/
│   │
│   ├── utils/
│   │
│   ├── types/
│   │
│   └── assets/
│
├── public/
└── package.json
```

---

## Application Layer

Location:

```text
src/app
```

Responsibilities:

- Application initialization.
- Router configuration.
- Global providers.
- Application-level configuration.

Example:

```text
app/

├── router.tsx
└── providers.tsx
```

---

## Feature Structure

Location:

```text
src/features
```

Features represent business capabilities.

Example:

```text
features/

├── auth/
├── organizations/
├── projects/
├── tasks/
└── settings/
```

---

## Feature Organization

Each feature follows:

```text
projects/

├── components/
├── hooks/
├── services/
├── types/
└── pages/
```

Example:

```text
projects/

├── components/
│   └── project-card.tsx
│
├── hooks/
│   └── use-projects.ts
│
├── services/
│   └── project.service.ts
│
├── types/
│   └── project.types.ts
│
└── pages/
    └── projects-page.tsx
```

---

## Component Architecture

### Shared Components

Location:

```text
src/components
```

Used for:

- Reusable UI elements.
- Application-wide components.

Examples:

```text
components/

├── ui/
├── forms/
└── common/
```

---

## UI Components

Decision:

```text
shadcn/ui
```

Purpose:

- Reusable components.
- Consistent styling.
- Accessible UI patterns.

Location:

```text
src/components/ui
```

Examples:

```text
Button
Dialog
Input
Table
Card
```

---

## Styling Architecture

Decision:

```text
Tailwind CSS
```

Usage:

- Component styling.
- Layouts.
- Responsive design.

Avoid:

- Large CSS files.
- Inline style duplication.
- Component-specific CSS unless required.

---

## Routing Architecture

Decision:

```text
React Router
```

Responsible for:

- Page navigation.
- Protected routes.
- Application layout routing.

Example:

```text
Routes

├── /login
├── /register
├── /dashboard
├── /projects
└── /settings
```

---

## API Communication

Decision:

```text
REST API
+
TanStack Query
```

Communication flow:

```text
React Component

↓

TanStack Query Hook

↓

API Service

↓

NestJS API
```

---

## API Services

Location:

```text
src/services
```

Responsibilities:

- API client configuration.
- HTTP communication.
- Request handling.

Example:

```text
services/

├── api.client.ts
├── auth.service.ts
├── project.service.ts
└── organization.service.ts
```

---

## Server State Management

Decision:

```text
TanStack Query
```

Used for:

- API data fetching.
- Caching.
- Synchronization.
- Loading states.
- Error handling.

Example:

```text
Projects Page

↓

useProjects()

↓

TanStack Query

↓

GET /projects
```

---

## Client State Management

Decision:

```text
Zustand
```

Used for:

- Authentication state.
- Selected organization.
- UI preferences.
- Client-only state.

Example:

```text
stores/

├── auth.store.ts
└── organization.store.ts
```

---

## Forms

Decision:

```text
React Hook Form
```

Used for:

- Login.
- Registration.
- Project creation.
- Settings forms.

Validation approach:

```text
Frontend validation

↓

User experience

↓

Backend validation

↓

Security enforcement
```

Backend remains the source of truth.

---

## Authentication Flow

Frontend responsibilities:

- Store authentication state.
- Attach access token to API requests.
- Handle session expiration.
- Redirect unauthenticated users.

Token handling (ADR-010):

- The **access token lives in memory only**: the `apiClient` and the non-persisted `tokens` field of `auth.store`.
- `auth-storage` in `localStorage` holds only the user profile. Store version 1 drops tokens left there by older builds.
- The **refresh token is never visible to JavaScript.** It is an httpOnly `ourzo_refresh` cookie set by the API.
- Every request uses `credentials: 'include'`. On a 401 from a non-auth endpoint, the client calls `POST /api/auth/refresh` (no body), retries once, and queues any concurrent requests.
- **On boot**, if a user profile is remembered, `initializeAuth()` restores the session with the refresh cookie and then loads `/api/auth/me`. If that fails, auth state is cleared and protected routes redirect to `/login`.
- Logout calls `POST /api/auth/logout`, which revokes the session and clears the cookie. The client then clears the auth store, the workspace store and the query cache.
- The workspace store is cleared whenever the authenticated identity changes, so one user's workspace is never shown to the next user on a shared browser.

Flow:

```text
User Login

↓

React Form

↓

API Request

↓

Receive access token (body)
+ refresh cookie (httpOnly)

↓

Store Auth State (user persisted, token in memory)

↓

Access Protected Routes
```

---

## Error Handling

Frontend handles:

- API errors.
- Loading states.
- Empty states.
- User feedback.

Examples:

```text
Loading Projects...

No Projects Found

Unable To Load Data
```

---

## Testing Strategy

Frontend testing:

```text
Vitest
+
React Testing Library
```

### Component Tests

Examples:

- Button behaviour.
- Form rendering.
- UI states.

### Feature Tests

Examples:

- Login flow.
- Project creation.
- Organization switching.

---

## Frontend Design Principles

The frontend follows:

- Feature-based organization.
- Separation of UI and business logic.
- Server state managed separately from client state.
- Reusable components.
- Backend-driven security.
- Simple MVP architecture.
