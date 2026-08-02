# ADR-0065: Workspace Resolution State Model (Build #28.2F.1)

**Date:** 2026-08-02
**Status:** Accepted
**Build:** #28.2F.1
**Supersedes:** None (patches ADR-0063 workspace switcher repair)

## Context

After Build #28.2F (Xero Organisation Confirmation), the Testing Agent
reproduced a "Workspace unavailable" fallback when navigating to:

```
/workspace/6a21598721243d26f81e0153/finance-integration
```

The fallback rendered for valid tenants (Taqueria, Renewed Fashion)
and persisted across workspace selection and browser refresh.

## Root Cause

The root cause is **not** OAuth-related. It is a React Query v5
timing artefact in `WorkspaceLayout.jsx`.

### React Query v5 `isLoading` Semantics

In TanStack Query v5, the `isLoading` flag is defined as:

```
isLoading = isPending && isFetching
```

- `isPending`: `true` when the query has no data yet (status === 'pending')
- `isFetching`: `true` when the query is actively fetching

When a query transitions from `enabled: false` to `enabled: true`
(e.g., when `isAuthenticated` becomes true), there is a brief render
cycle where:

- `isPending = true` (no data)
- `isFetching = false` (fetch not yet started)
- `isLoading = false`

### Impact on WorkspaceLayout

The original `WorkspaceLayout.jsx` used `isLoading` to guard the
"Workspace unavailable" fallback:

```javascript
// ORIGINAL (BUGGY)
const { data: tenantRecord, isLoading: tenantLoading } = useQuery({...});

if (tenantLoading || navLoading) {
  return <Loader />;
}

const effectiveTenant = tenantRecord || null;
if (!effectiveTenant) {
  return <WorkspaceUnavailable />;  // ← FIRED PREMATURELY
}
```

During the brief window where `isLoading` was `false` but `isPending`
was `true` (no data yet), the code fell through to the
`!effectiveTenant` check. Since `tenantRecord` was `undefined` in
that window, `effectiveTenant` was `null`, and the "Workspace
unavailable" fallback rendered prematurely.

### Additional Manifest Hydration Race

The `useManifestHydration` hook also had a race condition. When
`tenantRecord` transitioned from `undefined` to the real tenant:

1. First hydration (with `undefined` tenant) resolved synchronously
2. `isLoading` was set to `false`
3. `tenantRecord` changed → effect re-ran
4. Second hydration started (async DB fetch)
5. During this async fetch, `isLoading` was still `false` from step 2
6. Combined with `tenantLoading` being `false`, the layout could
   render with stale navigation or fall through to the fallback

### IntegrationHubPage Same Pattern

`IntegrationHubPage.jsx` (`/platform/integrations`) had the same
pattern: it checked `!tenantId` after `isLoadingWorkspace` was `false`.
Since `isLoadingWorkspace` includes `(activeTenantId && tenantLoading)`,
when `activeTenantId` was `null` (platform admin with no tenant on
User record), `isLoadingWorkspace` was `false` even though the
workspace context hadn't resolved yet.

## Decision

### Explicit Resolution State Model

Replace implicit boolean-flag checks with an explicit state machine:

```
RESOLVING_TENANT    → Auth, memberships, or tenant query in flight
HYDRATING_MANIFEST  → Tenant resolved + authorized; manifest hydrating
READY               → Tenant resolved, authorized, manifest hydrated
NOT_FOUND           → Tenant query completed; no record returned
ACCESS_DENIED       → Tenant exists but user lacks membership/admin
ERROR               → Query or hydration threw a runtime error
```

The "Workspace unavailable" fallback renders **only** in `NOT_FOUND`
or `ERROR`, never while a query is still pending.

### Key Changes

1. **Use `isPending` instead of `isLoading`** for the tenant query.
   `isPending` is `true` whenever there's no data, regardless of
   fetch status. This eliminates the enable→fetch-start window.

2. **Reset `isLoading` at the start of every `useManifestHydration`
   effect run**, not just the initial state. This prevents the
   stale `isLoading: false` from a previous hydration cycle.

3. **Separate `ACCESS_DENIED` from `NOT_FOUND`**. Previously, an
   unauthorized user saw "Workspace unavailable" (misleading). Now
   they see "Access Denied" with appropriate recovery actions.

4. **Add `ERROR` state** for actual query/hydration errors, with
   Retry, Return to Previous Workspace, Return to Platform Console,
   and Choose Another Workspace actions.

5. **Accessibility**: Loading states use `role="status"` and
   `aria-live="polite"` for screen reader announcements.

### IntegrationHubPage Fix

- Gate data fetching behind `isLoadingWorkspace` check
- Only evaluate `!tenantId` after workspace is resolved
- Add `role="status"` and `aria-live="polite"` to loading state

## Platform Admin vs Tenant Admin

### Platform Admin (`role: 'admin'`)

- May access any tenant workspace without an Employee membership
- `WorkspaceProvider` synthesizes in-memory memberships for all
  tenants (Build #28.2E)
- Authorization: `isPlatformAdmin || !!membershipForTenant`
- The `isPending` fix ensures the tenant query completes before
  authorization is evaluated

### Tenant Admin (`role: 'tenant_admin'`)

- Must have a valid Employee membership for the tenant
- Authorization: `!!membershipForTenant || userTenantId === tenantId`
- RBAC/RLS unchanged — no weakening

## What Was NOT Changed

- Xero OAuth scopes, secrets, redirect URI, token encryption
- OAuthTransaction logic
- Organisation confirmation flow (Build #28.2F)
- Audit model and audit logging
- RBAC/RLS rules on any entity
- WorkspaceProvider architecture
- Navigation registry or route definitions

## Files Modified

| File | Change |
|------|--------|
| `src/components/workspace/WorkspaceLayout.jsx` | Replaced implicit flag checks with explicit resolution state model; switched `isLoading` → `isPending`; fixed `useManifestHydration` to reset `isLoading` on every effect run; added `ACCESS_DENIED` and `ERROR` fallback components |
| `src/pages/platform/IntegrationHubPage.jsx` | Gated data fetching behind `isLoadingWorkspace`; added `role="status"` / `aria-live="polite"` to loading state |

## Verification

### Test A — Direct Route

```
/workspace/6a21598721243d26f81e0153/finance-integration
```

- Loading state appears during resolution
- No "Workspace unavailable" during loading
- Finance Integration loads
- Refresh succeeds

### Test B — Normal Navigation

Platform Owner Console → select Taqueria → Integrations →
Integration Hub → Finance Integration

### Test C — Workspace Switch

- Open Taqueria Finance Integration
- Refresh
- Switch to Renewed Fashion
- Verify workspace name changes
- Refresh
- Switch back to Taqueria
- Verify context and Xero status change

### Test D — Clean Session

Repeat direct route and switching from incognito/private session.

### Test E — Without OAuth

Run route and workspace tests without any OAuth query parameters.

### Test F — With Callback State

Complete or simulate valid callback return and verify:
- Tenant resolution waits correctly
- Organisation confirmation loads
- No "Workspace unavailable"
- No race-condition fallback

## Regression Safety

- Xero Connect still redirects successfully ✓
- No INVALID_SCOPE ✓
- No blank page ✓
- OAuth tenant context remains correct ✓
- Organisation confirmation intact ✓
- PWA direct route and refresh functional ✓
- Other workspace modules still load ✓
- Invalid Tenant IDs produce genuine NOT_FOUND ✓
- Unauthorized users receive ACCESS_DENIED ✓