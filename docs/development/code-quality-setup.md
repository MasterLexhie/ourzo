# Ourzo — Code Quality Setup

## Purpose

This document defines the code quality standards and tooling used across the Ourzo platform.

The goal is to maintain:

- Consistent coding practices.
- Readable code.
- Automated formatting.
- Early detection of common issues.
- A predictable development workflow.

---

## Code Quality Overview

Ourzo uses:

```text
ESLint
Prettier
Husky
lint-staged
```

These tools run locally during development and before commits.

---

## ESLint

### Decision

```text
ESLint
```

### Purpose

ESLint is used for:

- Detecting code issues.
- Enforcing coding rules.
- Maintaining TypeScript quality.

ESLint applies separately to:

```text
apps/api
apps/web
```

---

## Prettier

### Decision

```text
Prettier
```

### Purpose

Prettier is responsible for:

- Code formatting.
- Consistent style.
- Automatic formatting.

Examples:

- Indentation.
- Line length.
- Quotes.
- Trailing commas.

---

## ESLint and Prettier Integration

Decision:

```text
ESLint
+
Prettier
+
eslint-config-prettier
```

Responsibility separation:

| Tool | Responsibility |
|---|---|
| ESLint | Code correctness |
| Prettier | Formatting |
| eslint-config-prettier | Prevent rule conflicts |

---

## Husky

### Decision

```text
Husky
```

### Purpose

Husky manages Git hooks.

Used to run automated checks before commits.

Workflow:

```text
Developer

↓

git commit

↓

Husky Hook

↓

lint-staged

↓

Commit accepted
```

---

## lint-staged

### Decision

```text
lint-staged
```

### Purpose

Runs checks only against modified files.

Example:

Changed:

```text
apps/api/src/auth/auth.service.ts
```

Workflow:

```text
Changed File

↓

ESLint

↓

Prettier

↓

Commit
```

Benefits:

- Faster commits.
- Avoids checking unchanged files.
- Keeps development workflow efficient.

---

## Commit Convention

### Decision

```text
Conventional Commits
```

Convention is followed manually.

Commit validation tooling is not included.

---

## Commit Examples

Feature:

```text
feat: add organization creation
```

Bug fix:

```text
fix: prevent unauthorized project access
```

Documentation:

```text
docs: update database strategy
```

Refactoring:

```text
refactor: simplify authentication service
```

---

## Removed Tooling

### commitlint

Decision:

```text
Not used
```

Reason:

- Not required for MVP.
- Adds additional tooling complexity.
- Conventional Commits can be followed without enforcement.

---

## TypeScript Configuration

Decision:

```text
Strict TypeScript Mode
```

Purpose:

- Detect errors earlier.
- Improve maintainability.
- Improve refactoring safety.

Strict mode applies to:

```text
apps/api
apps/web
```

---

## Package Manager Rules

Decision:

```text
pnpm only
```

Allowed:

```text
pnpm install
pnpm add
pnpm run
```

Not used:

```text
npm
yarn
```

Reason: Maintains consistent dependency management and is required for monorepo workflows.

---

## Root Tooling Structure

Repository:

```text
ourzo/
├── .husky/
│   └── pre-commit
│
├── eslint.config.js
├── prettier.config.js
├── .prettierignore
│
├── package.json
├── pnpm-lock.yaml
└── pnpm-workspace.yaml
```

---

## Scripts

### Root Commands

Lint:

```bash
pnpm lint
```

Format:

```bash
pnpm format
```

Check formatting:

```bash
pnpm format:check
```

Tests:

```bash
pnpm test
```

---

## Backend Quality Tools

Location:

```text
apps/api
```

Tools:

```text
ESLint
Prettier
Jest
```

---

## Frontend Quality Tools

Location:

```text
apps/web
```

Tools:

```text
ESLint
Prettier
Vitest
React Testing Library
```

---

## Development Workflow

Recommended workflow:

```text
Write Code

↓

Run Tests

↓

Run Lint

↓

Format Code

↓

Commit Changes
```

---

## Code Quality Principles

Ourzo follows:

- Automated formatting.
- Consistent linting.
- Small focused commits.
- Clear commit messages.
- Strict TypeScript usage.
- Minimal tooling complexity.
