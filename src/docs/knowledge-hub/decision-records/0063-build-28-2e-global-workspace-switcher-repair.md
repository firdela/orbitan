# ADR-0063: Global Workspace Switcher and Tenant Resolution Repair (Build #28.2E)

**Date:** 2026-08-02
**Status:** Accepted
**Build:** #28.2E
**Predecessor:** ADR-0062 (Build #28.2D — Workspace Context Integration Hub Fix)

## Context

Build #28.2D added a local `selectedTenantId` inside IntegrationHubPage with
`sessionStorage` persistence to work around platform admins lacking Employee
memberships. This created a **competing source of truth** alongside the
canonical WorkspaceProvider, and the global Workspace Switcher
(TenantSwitcher) remained broken.

The verified failure path (Test C):

1. Platform Owner Console → Integration Hub → refresh succeeds
2. Open Workspace Switcher (TenantSwitcher in LeaderOrg header)
3. Select "Renewed Fashion"
4. **"Workspace not found"** error from WorkspaceLayout

## Root Cause

Three compounding defects:

### 1. TenantSwitcher Always Navigates to `/workspace/:tenantId/dashboard`

`TenantSwitcher.handleSwitch` unconditionally called
`navigate('/workspace/${id}/dashboard')` after `switchWorkspace()`. When
switching from `/leader-org` (Platform Console), this navigated the admin
into WorkspaceLayout — a route designed for tenant-scoped workspace pages,
not platform console context.

### 2. WorkspaceLayout Tenant.get Query Had No Fallback

WorkspaceLayout's `useQuery(['workspace-tenant', tenantId])` queryFn
returned `null` on any `Tenant.get` failure (catch → null). Unlike
WorkspaceProvider's identical query (which falls back to DEMO_TENANTS),
WorkspaceLayout had no fallback. A transient query failure or race condition
between the two shared queryFn observers could produce `tenantRecord = null`,
triggering the "Workspace not found" UI.

### 3. Competing Workspace State in sessionStorage

`integration_selected_tenant` in sessionStorage was a second workspace
identifier alongside WorkspaceProvider's canonical `activeTenantId`. This
could temporarily mask the real issue inside Integration Hub while the
global switcher remained broken.

## Decision

### One Canonical Tenant Identifier

The Base44 `Tenant.id` (database record ID) is the **sole** internal
workspace identifier. No slugs, tenant_refs, or display names are used as
lookup keys. This was already the case in the data; the fix ensures the
code consistently uses it through the WorkspaceProvider.

### Platform Admin Tenant Access (WorkspaceProvider)

For `role: admin` users, WorkspaceProvider now synthesizes in-memory
membership objects for **all** Tenant records that don't already have an
Employee record. This ensures `switchWorkspace()` always finds the target
membership for platform admins, even for tenants where they have no
Employee record.

- No database writes (no fabricated Employee records)
- No RLS weakening (authorization still enforced by RLS: role=admin reads all)
- Synthesized memberships are marked `_synthesized: true` for debugging
- Tenant users are unaffected (no synthesis for non-admin roles)

### Context-Aware Navigation (TenantSwitcher + UserMenu)

When switching from `/leader-org` or `/platform/*` routes,
`switchWorkspace()` is called but navigation does NOT occur. The current
page (e.g. Integration Hub) re-renders with the new `activeTenantId` from
WorkspaceProvider automatically.

When switching from `/workspace/*` or any other route, the original
navigation to `/workspace/:tenantId/dashboard` is preserved.

### Removed Competing State

- `integration_selected_tenant` sessionStorage entry: **removed**
- `selectedTenantId` state in IntegrationHubPage: **removed**
- Admin tenant selection UI in IntegrationHubPage: **removed**
- IntegrationHubPage now uses `activeTenantId` from WorkspaceProvider as the
  sole tenant identifier
- Stale sessionStorage cleanup runs on mount

### WorkspaceLayout Fallback

WorkspaceLayout's `Tenant.get` query now has the same DEMO_TENANTS fallback
as WorkspaceProvider, preventing "Workspace not found" during transient
query failures.

### Cache Invalidation

`switchWorkspace()` now also invalidates `['tenant-scoped']` queries to
prevent stale data from the previous tenant from flashing after the switch.

## Consequences

- WorkspaceProvider is the **single source of truth** for workspace context
- Platform admins can switch to any tenant from the global TenantSwitcher
- Integration Hub stays on the current page when switching tenants
- No competing workspace state in sessionStorage or component state
- Future platform admins without Employee records can still switch tenants

## Files Modified

- `src/lib/workspace/WorkspaceProvider.jsx` — Admin tenant synthesis, cache invalidation
- `src/components/shared/TenantSwitcher.jsx` — Context-aware navigation
- `src/components/shared/UserMenu.jsx` — Context-aware navigation
- `src/pages/platform/IntegrationHubPage.jsx` — Removed competing state, canonical context
- `src/components/workspace/WorkspaceLayout.jsx` — DEMO_TENANTS fallback