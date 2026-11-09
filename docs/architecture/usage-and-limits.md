# Ourzo — Usage and Limits

## 1. Purpose

Usage limits demonstrate SaaS plan enforcement and tenant-level resource management.

---

## 2. Plans

The MVP supports:

- Free
- Pro
- Business

Exact limits will be finalized during data design and implementation.

---

## 3. Tenant-Level Usage

Usage belongs to the workspace.

```text
Workspace
   ↓
Plan
   ↓
Usage
   ↓
Limits
```

Usage from one workspace must never affect another workspace.

---

## 4. Usage Enforcement

Before a limited operation:

```text
Request
 ↓
Identify Workspace
 ↓
Load Plan
 ↓
Check Usage
 ↓
Check Limit
 ↓
Allow / Reject
```

---

## 5. Potential Limited Resources

Potential limits include:

- Members
- Projects
- Tasks
- API keys

Final limits are implementation decisions rather than architectural assumptions.

### Implemented limits

| Resource | Free | Pro | Business | Counted as |
|---|---|---|---|---|
| Members | 5 | 25 | 100 | current workspace members |
| Projects | 3 | 20 | 100 | current non-archived projects |
| API keys | 2 | 10 | 50 | current non-revoked keys |
| Tasks | 50 | 500 | 5000 | tasks created in the current calendar month (`Usage` table) |

Where the limit is checked (`UsageService.assertWithinLimit`):

- Project create.
- Task create. The monthly task counter is incremented afterwards.
- Invitation create and accept, for members.
- API-key create.

When a limit is reached the API returns `403` with the message `"<Resource> limit reached (current/limit)"`.

`GET /api/usage` loads the plan from the workspace record. A resource only counts as "exceeded" when its limit is greater than 0.

**Note:** workspaces that are already over their plan's limits can keep their existing resources, but they can't create more until they're back under the limit or move to a higher plan.

Request rate limits are covered in `security-architecture.md` §8.

---

## 6. Usage Integrity

Usage must be updated consistently with the operation that creates the resource.

Example:

```text
Create Project
      ↓
Check Limit
      ↓
Create Project
      ↓
Record Usage
```

The implementation must prevent race conditions from allowing a tenant to exceed its configured limit unintentionally.

---

## 7. Isolation

Usage is always evaluated within the current workspace context.

```text
Workspace A usage ≠ Workspace B usage
```
