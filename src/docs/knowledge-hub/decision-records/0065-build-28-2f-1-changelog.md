# Build #28.2F.1 — Workspace Resolution State Fix

**Date:** 2026-08-02
**Status:** Implemented
**Type:** Bug Fix — Workspace Routing Regression

## Summary

Fixes the "Workspace unavailable" regression that blocked access to
`/workspace/:tenantId/finance-integration` for valid tenants after
Build #28.2F. The root cause was a React Query v5 `isLoading`
timing artefact, not OAuth.

## Root Cause

React Query v5 defines `isLoading = isPending && isFetching`. When a
query transitions from `enabled: false` to `enabled: true`, there is a
brief render cycle where `isPending` is `true` (no data) but
`isFetching` is `false` (fetch not yet started), making `isLoading`
return `false` even though no data exists.

The original `WorkspaceLayout.jsx` used `isLoading` to guard the
"Workspace unavailable" fallback. During this brief window,
`tenantRecord` was `undefined`, `isLoading` was `false`, and the code
fell through to `!effectiveTenant` → `null` → "Workspace unavailable".

## Changes

### `src/components/workspace/WorkspaceLayout.jsx`

- **Switched `isLoading` → `isPending`** for the tenant query.
  `isPending` is `true` whenever there's no data, regardless of
  fetch status. This eliminates the enable→fetch-start window.

- **Implemented explicit resolution state model**:
  `RESOLVING_TENANT → HYDRATING_MANIFEST → READY | NOT_FOUND | ACCESS_DENIED | ERROR`

- **Fixed `useManifestHydration` hook** to reset `isLoading` to `true`
  at the start of every effect run, not just the initial state. This
  prevents stale `isLoading: false` from a previous hydration cycle
  when `tenantRecord` transitions from `undefined` to the real tenant.

- **Separated `ACCESS_DENIED` from `NOT_FOUND`**. Previously, an
  unauthorized user saw "Workspace unavailable" (misleading). Now they
  see "Access Denied" with appropriate recovery actions.

- **Added `ERROR` state** with Retry, Return to Previous Workspace,
  Return to Platform Console, and Choose Another Workspace actions.

- **Accessibility**: Loading states use `role="status"` and
  `aria-live="polite"` for screen reader announcements.

### `src/pages/platform/IntegrationHubPage.jsx`

- **Gated data fetching behind `isLoadingWorkspace` check**. Previously,
  data fetching started immediately and `!tenantId` was evaluated before
  the workspace was resolved. Now, fetching only starts after
  `isLoadingWorkspace` is `false`.

- **Added `role="status"` and `aria-live="polite"`** to the loading state.

## What Was NOT Changed

- Xero OAuth scopes, secrets, redirect URI, token encryption
- OAuthTransaction logic
- Organisation confirmation flow (Build #28.2F)
- Audit model and audit logging
- RBAC/RLS rules on any entity
- WorkspaceProvider architecture
- Navigation registry or route definitions
- App.jsx route definitions

## Platform Admin vs Tenant Admin

| Role | Authorization | Memberships |
|------|---------------|-------------|
| Platform Admin (`admin`) | `isPlatformAdmin` bypass | Synthesized in-memory (Build #28.2E) |
| Tenant Admin (`tenant_admin`) | `!!membershipForTenant` | Real Employee records |

No RBAC or RLS was weakened or modified.