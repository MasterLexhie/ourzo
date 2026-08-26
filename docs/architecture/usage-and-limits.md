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
