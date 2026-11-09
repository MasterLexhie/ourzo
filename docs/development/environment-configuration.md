# Ourzo — Environment Configuration

## Purpose

This document defines how environment variables and application configuration are managed across the Ourzo platform.

The goal is to ensure:

- Consistent local development.
- Safe handling of secrets.
- Clear separation between environments.
- Predictable application startup behaviour.

---

## Environment Strategy

Ourzo uses environment variables for application configuration.

Environment files are separated by application.

Structure:

```text
ourzo/

├── apps/
│
│   ├── api/
│   │   ├── .env
│   │   └── .env.example
│   │
│   └── web/
│       ├── .env
│       └── .env.example
```

---

## Environment File Rules

### Local Development

Developers use:

```text
.env
```

Example:

```text
apps/api/.env
apps/web/.env
```

These files are:

- Local only.
- Not committed.
- Added to `.gitignore`.

### Environment Templates

Each application provides:

```text
.env.example
```

Purpose:

- Documents required variables.
- Allows new developers to configure their environment.
- Provides deployment reference.

Example:

```text
apps/api/.env.example
apps/web/.env.example
```

---

## Environment Separation

### Development

Purpose: Local development and feature implementation.

Database:

```text
ourzo_dev
```

### Testing

Purpose: Automated testing and integration testing.

Database:

```text
ourzo_test
```

### Production

Purpose: Live application workloads.

Configuration is provided through:

- Container platform secrets.
- Managed service environment variables.

---

## Backend Configuration

Backend location:

```text
apps/api
```

Configuration management:

```text
NestJS ConfigModule
```

Responsibilities:

- Load environment variables.
- Validate required configuration.
- Provide configuration through dependency injection.

---

## Backend Environment Variables

Example:

```env
NODE_ENV=

PORT=

WEB_APP_URL=

DATABASE_URL=

JWT_SECRET=

JWT_REFRESH_SECRET=

REDIS_HOST=

REDIS_PORT=

RATE_LIMIT_AUTH_MAX=
RATE_LIMIT_AUTH_WINDOW_MS=
RATE_LIMIT_DEFAULT_MAX=
RATE_LIMIT_API_KEY_MAX=
RATE_LIMIT_WINDOW_MS=
```

---

## Backend Variable Definitions

| Variable | Purpose |
|---|---|
| NODE_ENV | Application environment |
| PORT | API server port |
| WEB_APP_URL | Public URL of the web app; used to build shareable invitation links (`<WEB_APP_URL>/accept-invitation?token=…`). Defaults to `http://localhost:5173` |
| DATABASE_URL | PostgreSQL connection string |
| JWT_SECRET | Access token signing key |
| JWT_REFRESH_SECRET | Refresh token signing key |
| REDIS_HOST | Redis connection host |
| REDIS_PORT | Redis connection port |
| RATE_LIMIT_AUTH_MAX | Max register/login/refresh requests per IP per auth window (default 10) |
| RATE_LIMIT_AUTH_WINDOW_MS | Auth rate-limit window in ms (default 60000) |
| RATE_LIMIT_DEFAULT_MAX | Max authenticated requests per user per window (default 300) |
| RATE_LIMIT_API_KEY_MAX | Max requests per API key per window (default 120) |
| RATE_LIMIT_WINDOW_MS | Window for user/API-key limits in ms (default 60000) |

---

## Frontend Configuration

Frontend location:

```text
apps/web
```

Frontend environment variables use Vite conventions.

Required prefix:

```text
VITE_
```

---

## Frontend Environment Variables

Example:

```env
VITE_API_URL=
```

| Variable | Purpose |
|---|---|
| VITE_API_URL | Backend API endpoint |

Example:

```env
VITE_API_URL=http://localhost:3000
```

---

## Secret Management

### Development

Secrets are stored locally:

```text
.env
```

### Production

Secrets are managed externally.

Examples:

- Container platform secrets.
- Managed hosting environment variables.
- Cloud secret managers.

---

## Secrets That Must Not Be Committed

Examples:

```text
DATABASE_URL

JWT_SECRET

JWT_REFRESH_SECRET

API_KEYS

PASSWORDS
```

---

## Configuration Validation

Backend configuration must be validated during application startup.

Purpose: Prevent missing database connections, missing authentication secrets, and runtime configuration failures.

Application should fail immediately if:

```text
DATABASE_URL is missing

or

JWT_SECRET is missing
```

---

## Configuration Ownership

### Backend Owns

```text
DATABASE_URL
JWT configuration
Redis configuration
API configuration
```

### Frontend Owns

```text
API endpoint configuration
Frontend runtime settings
```

---

## Development Workflow

New developer setup:

```text
1. Clone repository

↓

2. Install dependencies

↓

3. Copy .env.example files

↓

4. Configure local values

↓

5. Start Docker services

↓

6. Start applications
```

---

## Environment Principles

Ourzo follows:

- Secrets are never committed.
- Configuration is environment-specific.
- Applications fail early on invalid configuration.
- Production secrets are managed externally.
- Development setup is reproducible.
