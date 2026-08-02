# ADR-0058: Build #28.2 — Workspace Identity, Xero Recovery, Leader Console IA & Dashboard Refinement

**Date:** 2026-08-02
**Status:** Accepted
**Build:** #28.2
**Supersedes:** None
**Related:** ADR-0050 (Centralised Access Engine), ADR-0048 (Orbit Identity Model), ADR-0049 (Explicit Tenant Context)

## Context

Build #28.1 pre-implementation validation identified several verified user-facing defects in the Leader Console and workspace switching experience. This ADR documents the surgical corrections applied in Build #28.2 and the architectural decisions behind them.

## Decisions

### 1. Workspace Switcher Identity Correction

**Problem:** The `TenantSwitcher` displayed the authenticated user's personal name ("Firdaus (Founder)") for every workspace entry instead of the actual tenant/business name.

**Root Cause:** `MembershipResolver.translateEmployee()` sets `display_name: employee.full_name`. The `TenantSwitcher` used `membership.display_name` as the primary label. Since the platform admin holds Employee records in 4 tenants — all with the same `full_name` — all entries appeared identical.

**Decision:** Add a presentation-layer query in `TenantSwitcher` to hydrate `Tenant` records for all membership `organisation_id`s. Display `tenant.name` as the primary label with a building icon, role badge, industry, and status. Do NOT modify the `MembershipResolver` or `WorkspaceProvider` — this is a display-only correction.

**Alternatives Considered:**
- Modify `translateEmployee` to include tenant name → Rejected: would require a join or separate fetch in the membership resolution pipeline, adding latency to every access check.
- Store tenant name on the Employee record → Rejected: denormalises data; tenant name changes would require updating every Employee record.
- Make `WorkspaceProvider` fetch all tenant records → Rejected: adds query overhead to every page mount, not just the switcher.

### 2. Xero OAuth Workspace Context

**Problem:** "No Workspace Selected" error appeared even when a workspace was visibly selected in the header.

**Root Cause:** `IntegrationHubPage` resolved `tenantId` only from `user.data.tenant_id || user.tenant_id`. Platform admins have no `tenant_id` on their User record — they access tenants via workspace switching, not via a bound tenant.

**Decision:** Add `useWorkspace().activeTenantId` as the primary fallback for tenant resolution in `IntegrationHubPage`. This reuses the existing `WorkspaceProvider` context (ADR-0050) — no new providers, no URL query parameters, no megaprovider.

**Security:** The Xero OAuth `state` parameter currently carries the raw `tenant_id`. This is an existing pattern in the repository. A cryptographically random nonce with server-side state storage is recommended for a future hardening pass but is not changed in this build to avoid introducing a new entity or breaking the existing flow.

### 3. Toast Notification Dismiss & Auto-Dismiss

**Problem:** Toast close button was invisible (`opacity-0` unless hovering), and toasts had no auto-dismiss timer, persisting indefinitely and stacking.

**Decision:** Correct the existing `useToast` abstraction:
- Make `ToastClose` always visible (`opacity-100`).
- Add auto-dismiss: 6 seconds for default toasts; destructive toasts persist.
- Reduce `TOAST_LIMIT` from 20 to 5.
- No migration to Sonner or another library — the existing system was corrected.

### 4. Governance / Compliance IA

**Problem:** Tenant operational Compliance was incorrectly placed under the platform Governance dropdown.

**Decision:** Remove `compliance` from the Governance dropdown. Shield Command, Audit Centre, and Access Control remain as platform governance tools. Tenant operational compliance belongs in the tenant workspace navigation.

**Do NOT create a new `/trust` route.** Existing routes (`/governance`, `/legal`, `/audit-centre`, `/platform/shield`, `/platform/security-dashboard`) already cover public trust, legal, audit, and security. The issue was navigation placement, not missing destinations.

### 5. Leader Console Dashboard Hierarchy

**Problem:** KPI StatCards were above the Nexus Daily Brief, and Quick Access was hidden inside the Overview tab.

**Decision:** Reorder to: Nexus Daily Brief → Quick Access (always visible) → Tabs (Overview → Configurable KPI Widgets).

### 6. Configurable Leader Overview Widgets

**Decision:** Create `LeaderOverviewWidgets` component that reuses the same `base44.auth.updateMe` preference pattern as Quick Access. Do NOT create a generic `DashboardEngine` or `WidgetManifest`. The existing `DashboardLayout` entity is tenant-scoped (requires `tenant_id` matching the user's tenant) and is not suitable for platform-level personal preferences.

## Files Modified

| File | Change |
|------|--------|
| `src/components/shared/TenantSwitcher.jsx` | Added tenant hydration query; display tenant.name as primary label |
| `src/pages/platform/IntegrationHubPage.jsx` | Added `useWorkspace().activeTenantId` fallback for tenantId |
| `src/components/ui/toast.jsx` | Made ToastClose always visible |
| `src/components/ui/use-toast.jsx` | Added auto-dismiss; reduced TOAST_LIMIT and TOAST_REMOVE_DELAY |
| `src/components/leader/UnifiedCommandNav.jsx` | Removed `compliance` from Governance dropdown; added mobile aria-label |
| `src/lib/navigation-registry.js` | Removed `compliance` from Governance group in PLATFORM_NAVIGATION |
| `src/pages/LeaderOrg.jsx` | Reordered dashboard hierarchy; integrated LeaderOverviewWidgets; removed personal names |
| `src/docs/knowledge-hub/CHANGELOG.md` | Added Build #28.2 entry |

## Files Created

| File | Purpose |
|------|---------|
| `src/components/leader/LeaderOverviewWidgets.jsx` | Configurable KPI widget grid for Leader Console Overview |
| `src/docs/knowledge-hub/decision-records/0058-build-28-2-workspace-identity-xero-ia.md` | This ADR |

## RBAC/RLS Impact

No RLS changes. No entity schema changes. All fixes are presentation-layer or context-resolution corrections that work within the existing RBAC/RLS model.

## Rejected Proposals

- `/trust` route — Existing routes already cover trust/legal/audit/security. Issue was navigation placement, not missing destinations.
- `DashboardEngine` / `WidgetManifest` — Over-engineering for 4 KPI cards. Reused existing `base44.auth.updateMe` preference pattern.
- `?tenant=id` URL parameters — The existing `/workspace/:tenantId` canonical routing is correct. No URL parameter changes needed.
- Complete Sonner migration — The existing `useToast` system was correctable. Migration would introduce a competing toast system.
- New footer components — Only one `PlatformFooter` exists per surface. No duplicate found in code.
- Provider consolidation — `WorkspaceProvider`, `TenantProvider`, and `GlobalOutletContext` serve distinct purposes. No megaprovider needed.