# ADR-0004: Dynamic Workspace Routing

**Date:** 2026-06-05
**Status:** Accepted
**Impacted Modules:** App.jsx routes, WorkspaceLayout, RoleGateway, all workspace module pages (Inventory, Procurement, Sales, etc.)

## Context

OrbitanOS initially had hardcoded per-tenant routes (`/tenant1/inventory`, `/tenant2/inventory`, etc.) with duplicate page files for each tenant. This was unsustainable:

1. Adding a tenant required creating new route entries + new page files
2. The same module logic was duplicated 3x (tenant1, tenant2, tenant3 copies)
3. Bug fixes had to be applied to every copy
4. Scaling to thousands of tenants was impossible
5. Pilot tenant names were hardcoded into the route structure

## Alternatives Considered

1. **Subdomain-based routing** (`acme.orbitan.app/inventory`)
   - Rejected: Requires DNS configuration per tenant — not self-service
   - Rejected: Base44 hosting model doesn't support dynamic subdomains easily
   - Deferred: Could be a future enterprise/white-label feature

2. **Query-parameter routing** (`/workspace?tenant=acme&page=inventory`)
   - Rejected: Poor UX — URLs aren't shareable or bookmarkable cleanly
   - Rejected: Search engines don't index query-param routes well

3. **Path-parameter routing** (`/workspace/:tenantId/inventory`)
   - Selected: Clean, shareable, bookmarkable URLs
   - Selected: Single set of page components reused for all tenants
   - Selected: `tenantId` is a UUID, not a hardcoded name — no pilot tenant leakage
   - Selected: `WorkspaceLayout` validates that the session user belongs to the requested tenant

## Decision

Adopt **Dynamic Path-Parameter Routing**:

### Route Structure
```jsx
<Route path="/workspace/:tenantId" element={<WorkspaceLayout />}>
  <Route index element={<WorkspaceDashboard />} />
  <Route path="dashboard" element={<WorkspaceDashboard />} />
  <Route path="inventory" element={<InventoryPage />} />
  <Route path="procurement" element={<ProcurementPage />} />
  {/* ... all module routes */}
</Route>
```

### Access Control (WorkspaceLayout)
1. Extract `tenantId` from URL params
2. Fetch the `Tenant` record from the database
3. If the authenticated user's `user.data.tenant_id` matches → allow
4. If `user.role === 'admin'` (platform owner) → allow
5. Otherwise → redirect to their own workspace or show access denied

### Entry Point
`RoleGateway` component at `/workspace` resolves the authenticated user's `tenant_id` and redirects to `/workspace/:tenantId/dashboard`. This means users never need to type a tenant ID — they just go to `/workspace` and are routed automatically.

### Legacy Routes
The old `/outlet/*` routes were kept for backward compatibility but point to the same component instances. `/company` and `/outlet` dashboard routes remain as aliases.

## Trade-offs

**Positive:**
- One set of page components serves all tenants — zero duplication
- Adding a tenant = zero code changes (just a database record)
- Tenant ID is a UUID — no pilot tenant names in route code
- Access control is enforced at the layout level, not per-page
- Clean, shareable URLs

**Negative:**
- Tenant switching requires navigation to a new URL (not a dropdown that swaps context silently) — this is actually a feature (explicit context switch prevents cross-tenant data leaks)
- `WorkspaceLayout` adds a render layer — minor performance consideration (mitigated: tenant record is cached in context)

## Migration

All 28 orphaned per-tenant page files (`tenant1/*.jsx`, `tenant2/*.jsx`, `tenant3/*.jsx`) were deleted. Zero imports remained. Generic `/workspace/:tenantId/*` routes are the sole path.

## Future Review Date

**2027-01-01** — Evaluate whether subdomain routing (`acme.orbitan.app`) should be offered as an enterprise/white-label feature. The dynamic path-parameter architecture supports this as a progressive enhancement.

---

**Related ADRs:** ADR-0005 (Manifest-Driven Navigation)