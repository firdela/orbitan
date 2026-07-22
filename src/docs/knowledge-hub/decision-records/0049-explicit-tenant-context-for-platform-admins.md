# ADR-0049: Explicit Tenant Context for Platform Administrators

**Status:** Accepted
**Date:** 2026-07-22
**Principle:** Regulate (Access & Identity), Relate (Tenant Isolation)
**Supersedes/Extends:** ADR-0016 (RLS Tenant Isolation), ADR-0048 (Orbit Identity Model)

## Context

The Workforce Synchronization fix (ADR-0048) revealed a latent multi-tenancy defect: several `WorkspaceDashboard` widgets called unscoped `Entity.list()` and relied on Row-Level Security (RLS) to filter results. For ordinary tenant users this was safe — RLS scoped every query to `data.tenant_id == user.data.tenant_id`. But **platform administrators** (`role: 'admin'`) bypass tenant RLS by design, so the unscoped queries returned platform-wide totals inside a tenant workspace. A platform admin opening the *Taqueria* workspace could see Renewed Resources inventory counts mixed in.

A proposed remedy — a `GlobalAdminGuard` that silently returns unscoped data whenever `user.role === 'admin'` — would have **recreated the exact bug we just fixed**. Platform role must not silently determine query scope.

## Decision

**Platform role does not equal query scope.** Authorisation (may this user access this tenant?) and data scope (which tenant has the user explicitly selected?) are two separate concepts. A platform admin may be *authorised* to access every tenant, but every tenant-workspace query still requires an **explicit active tenant context**.

### Three operating modes

1. **Tenant Workspace Mode** (`/workspace/:tenantId/*`) — all operational data is scoped to the active tenant, including Employees, Tasks, Inventory, Purchase Orders, Sales, Compliance, Reports, Scheduling, Notifications, and future Industry Pack entities. **This rule applies even when the current user is a platform admin.** Opening the Taqueria workspace returns only Taqueria data.

2. **Platform Administration Mode** (`/platform-admin/*` and existing `/platform/*` + `/leader-org` routes) — a separate boundary for legitimate cross-tenant management: tenant directory, platform health, subscription administration, global feature flags, tenant provisioning, support operations, aggregate analytics, security/audit monitoring. Cross-tenant access uses dedicated routes, services, permissions, query functions, audit events, and UI indicators. It never reuses ordinary tenant dashboard queries.

3. **Administrative Tenant Access** — when a platform admin inspects a tenant for support, they select a tenant explicitly and a persistent indicator reads *"Platform Admin Access · Viewing: Taqueria Pte Ltd"*. The administrator retains their own identity in AuditLog (not impersonation). Entry/exit and actions are recorded.

### Query-layer requirements

Tenant-workspace queries MUST send an explicit tenant scope. The canonical pattern (implemented in `src/lib/useTenantQueries.js`):

```js
// FAIL CLOSED + EXPLICIT SCOPE — for all users, including platform admins
const query = useQuery({
  queryKey: ['tenant', 'inventory', tenantId],
  queryFn: () => base44.entities.InventoryItem.filter({ tenant_id: tenantId }, '-created_date', 50),
  enabled: !!tenantId, // no query if no active tenant
});
```

The query must **fail closed** if `activeTenantId` is missing — no partial or cross-tenant results. The forbidden anti-pattern:

```js
// FORBIDDEN — recreates the cross-tenant leak for admins
if (user.role === 'admin') { return Entity.list(); }
```

### RLS alignment

RLS and the query layer complement each other:
- For **tenant users**: `requested tenant == authorised membership tenant`. RLS independently enforces `data.tenant_id == user.data.tenant_id`.
- For **platform admins**: `platform admin permission AND requested tenant explicitly supplied AND tenant exists`. The query layer supplies the explicit scope; RLS permits the read; the result is scoped to the requested tenant only.

Frontend filtering is never the sole control — the tenant filter is sent to the server in every request.

## Consequences

**Positive:**
- Eliminates the cross-tenant data-leak vector for platform admins inside tenant workspaces.
- Separates authorisation from data scope — a clean mental model that scales to the Firdela ecosystem (one person, many companies).
- Platform-wide analytics remain available, but only through a dedicated, auditable boundary — they cannot contaminate tenant dashboards.
- Tenant switching is safe: query keys embed `tenantId`, so React Query yields a fresh cache per tenant with no stale-data flash.

**Negative / trade-offs:**
- Platform admins lose the convenience of seeing "everything at once" inside a tenant workspace. This is intentional — convenience that compromises isolation is rejected. Cross-tenant visibility lives in the platform-admin area.
- Every operational widget must adopt the canonical hooks; a widget that reverts to `Entity.list()` reintroduces the leak. Enforced by code review against `useTenantQueries.js`.

## Verification (2026-07-22)

Dashboard audit completed for WorkspaceDashboard (Inventory, PurchaseOrder, Task, SalesInvoice, Shift, ComplianceRecord). All six queries migrated from unscoped `.list()` to tenant-scoped `useTenantQueries` hooks with fail-closed `enabled` guards and realtime invalidation. Regression tests 1–10 defined in the directive are the acceptance criteria.

## Related

- ADR-0048 — Orbit Identity Model (User vs Employee membership)
- ADR-0016 — RLS Tenant Isolation Standard
- ADR-0027 — Staff Directory Governance