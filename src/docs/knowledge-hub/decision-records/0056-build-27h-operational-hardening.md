# ADR-0056: Build #27H — Surgical Operational Hardening

**Date:** 2026-08-01  
**Status:** Implemented  
**Build:** #27H  
**Supersedes:** None (extends ADR-0054, ADR-0053, ADR-0027)

---

## Context

Build #27G introduced Inventory Transfers, Workflow Templates, and Task Analytics. Architectural review identified three verified areas requiring hardening before RC1:

1. **Audit event consistency** — new operational entities lacked canonical audit events; existing `audit.js` had no normalisation or secret-stripping layer.
2. **Inventory Transfer lifecycle integrity** — state transitions and stock mutations were authored entirely in the browser, bypassing server-side validation.
3. **Navigation route metadata** — alias resolution lacked a registry-level contract; route drift between `App.jsx` and `navigation-registry.js` was not detectable.

## Decision

### Package 1: Audit Event Standardisation

**Extended existing systems — no competing dispatcher created.**

- `src/lib/audit.js` extended with `normalizeAuditPayload()` — compatibility-safe normalisation layer that maps legacy field names to canonical AuditLog fields, applies safe defaults, strips secret/token values from state snapshots, and validates required identifiers (`tenant_id`, `actor_id`, `action_type`, `target_entity`, `target_record_id`).
- `logAuditCritical()` added — fail-closed variant for security/compliance-critical mutations. Throws on write failure so calling mutations can roll back. Existing `logAudit()` remains fire-and-forget for operational events.
- `auditFrontend()` now normalises before writing; rejects malformed events with actionable console errors.
- New canonical `ACTION_TYPES` added: `TRANSFER_*` (9 events) and `WORKFLOW_*` (5 events).
- **Failure policy:** Security-critical mutations (inventory transfers, stock movements) fail closed. Lower-risk operational events follow existing approved failure policy (log + continue).

### Package 2: Server-Side Inventory Transfer Service

**New backend function: `base44/functions/inventoryTransferService/entry.ts`**

- **Canonical lifecycle enforced server-side:** Draft → Requested → Approved → Preparing → Dispatched → Partially Received → Received → Reconciled. Cancelled valid from pre-reconciliation states.
- **Transition map:** Explicit `TRANSITIONS` object rejects invalid order, stale-state, repeated, unauthorised, and cross-tenant transitions.
- **Server-side validation:** Authenticated actor, role, tenant scope, outlet pair (both belong to tenant, source ≠ destination), required line items, positive quantities, stock availability at dispatch.
- **Ledger integrity:** Reuses canonical `InventoryItem` entity. Dispatch deducts from source; receive adds to destination (resolves or creates matching item by name+unit). Cancellation after dispatch reverses source deduction. No second ledger created.
- **Transactional safeguards:** Pre-validates all stock before any write; rollback on failure (compensating mutations).
- **Idempotency:** Repeat transition to current status returns success no-op (`idempotent: true`).
- **Audit:** Every transition writes a canonical `AuditLog` via `logAuditCritical` (fail-closed). Each stock mutation writes an individual `AuditLog` event. If audit write fails, the entire transition (status update + stock mutations) is rolled back.
- **Platform admin:** Must specify explicit `tenant_id`; unscoped mutations rejected with 400.
- **Cross-tenant denial:** Non-admin users are rejected if transfer `tenant_id` ≠ `user.data.tenant_id`.

### Package 3: Navigation Registry Hardening

**Extended existing registry — no competing resolver created.**

- `ROUTE_ALIASES` map added to `navigation-registry.js` — documents every old route → canonical destination pair. `App.jsx` remains the authoritative React Router configuration.
- `resolveAlias(oldRoute)` — resolves an alias to its canonical destination, preserving query parameters. Canonical query params override alias params.
- `getNavByRoute(routePath)` — retrieves nav item by route path (for breadcrumbs, active-state).
- `isDeprecatedAlias(oldRoute)` — checks deprecation status.
- `canAccessRoute(routePath, userRole)` — role access check by route.
- `safeNavDestination(key, userRole)` — returns null if access denied.
- **All existing redirects preserved.** No alias removed. No redirect loops introduced.

## Rejected Proposals

The following proposals from the Build #27H discussion were **rejected** to prevent duplicate abstractions:

| Proposal | Verdict | Reason |
|----------|---------|--------|
| `auditDispatcher` (new) | **Modified** | Extended existing `audit.js` instead |
| `useOrbitQuery` | **Rejected** | Duplicates `useTenantScopedQuery` |
| `ManifestResolver` | **Modified** | Extended `navigation-registry.js` instead |
| `OrbitanStateProvider` | **Rejected** | Breaks intentional tenant/outlet scope separation |
| `CrudManager` | **Rejected** | Generic framework debt |
| `OperationsOrchestrator` | **Rejected** | Violates domain logic boundaries |
| `OrbitModal` | **Rejected** | Unnecessary Radix wrapper |
| `LeaderOrg` chunking | **Deferred** | No verified performance evidence |
| RLS sandbox/pilot bypass | **Rejected** | Violates security architecture |
| Removing legacy redirects | **Deferred** | Compatibility risk; deep links preserved |

## Security Controls

- No cross-tenant transfer access (server-side `tenant_id` comparison)
- No unscoped platform-admin mutation (explicit `tenant_id` required)
- No client-authorised lifecycle transition (all transitions go through service)
- No worker approval/dispatch/reconcile access (role matrix enforced)
- No secret exposure in AuditLog (secret-stripping normalisation)
- No audit actor spoofing (actor resolved from `base44.auth.me()`, never from client payload)
- No sandbox/pilot automatic security bypass

## Impact

- **Short-term:** Inventory transfers are now transactional and auditable. Workflow template lifecycle events are logged.
- **Medium-term:** Audit normalisation prevents inconsistent metadata across future modules.
- **Long-term:** Alias resolution contract enables automated route-drift detection in CI.