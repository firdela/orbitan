# Implementation Note — Access Engine Milestone 2 (Membership Compatibility)

**Architecture Version:** 1.0 (Frozen)
**Milestone:** 2 of 5 (Membership Compatibility & Permission Resolution)
**Date:** 2026-07-22
**Status:** Complete — pending founder review before Milestone 3

## Objective

> The `MembershipResolver` is the **only** module that understands the `Employee → Membership` mapping. When `Employee` is retired, only this file changes — nothing else.

This milestone delivers that single compatibility layer, the Permission Packs registry, and role/permission resolution — without touching any production wiring (M3) or backend enforcement (M4).

## Prerequisite Delivered

- **Compatibility Matrix** (`access-engine-compatibility-matrix.md`): documents the full `Employee → User/Membership/RoleAssignment/ScopeAssignment/EmployeeProfile` field mapping and status normalisation. The single migration reference for every future developer.

## Files

| File | Responsibility |
| --- | --- |
| `src/lib/access/PermissionPacks.js` | Versioned registry of permission packs, atomic permission keys, role→packs mapping. Pure. |
| `src/lib/access/membership/MembershipResolver.js` | **The sole Employee→Membership translation.** Normalises status, derives role assignments with scope. Pluggable `resolveEmployee` for DB fetches. |
| `src/lib/access/membership/PermissionResolver.js` | Derives the flat permission list from a membership's role assignments via the packs registry. De-duplicates. |
| `src/lib/access/membership/index.js` | M2 barrel. |
| `src/lib/access/__tests__/runMembershipTests.js` | Pure unit tests (25+ assertions). |
| `src/docs/.../0051-permission-packs-and-hierarchical-inheritance.md` | ADR-0051. |
| `src/docs/.../access-engine-compatibility-matrix.md` | Compatibility Matrix. |

## Design Decisions

1. **Single translation point.** `translateEmployee()` in `MembershipResolver.js` is the only function that reads `Employee.role`, `Employee.tenant_id`, `Employee.outlet_id`, `Employee.status` and produces authorization concepts. No other module will.

2. **Status normalisation (fail-closed).** `active`/`on_leave`→`active`; `inactive`→`suspended`; `terminated`→`revoked`; unknown→`suspended`. The Access Engine denies `suspended`/`revoked` immediately (verified in M1).

3. **Pluggable data fetch.** `resolveEmployee` is injected at the wiring point (M3: RoleGateway). The resolver itself has no `base44` import — it stays pure and testable.

4. **Pass-through for pre-normalized data.** If a caller supplies an already-normalized membership (future `Membership` entity), the resolver validates and passes through — no re-translation. This is the dual-read hook for the future migration.

5. **Permission source tagging.** Role-pack grants are tagged `source: 'role_default'`. The precedence resolver (M1) already handles `explicit`/`inherited`/`role_default` correctly, so future explicit grants slot in without precedence changes.

6. **Platform Owner excluded from packs.** Platform authority flows through the Access Engine's Platform-Owner context rule, not a permission pack — preventing an "everything" pack from leaking into tenant-scoped precedence.

## Verification

The 25+ unit assertions cover:
- Status normalisation for all `Employee.status` values.
- `translateEmployee` field mapping (Compatibility Matrix in code).
- MembershipResolver pass-through, translation, fetch, and null cases.
- `permissionsForRole` for `worker`, `outlet_manager`, and unknown roles.
- `derivePermissions` scope attachment, de-duplication, multi-role combination, null safety.
- PermissionResolver pass-through and derivation-from-membership.
- Outlet-scoped permissions carry the correct `outlet_id` (cross-outlet protection verified in M1).

## Backward Compatibility

No production module is modified. The M1 barrel (`index.js`) received additive exports only — existing M1 exports and behaviour are unchanged. Legacy `Employee.role` checks in `RoleGateway` and pages continue to function until M3.

## What Is NOT in Milestone 2

- RoleGateway / WorkspaceLayout integration (M3)
- Backend `shieldInterceptor` enforcement + AuditLog wiring (M4)
- Procurement module migration (M5)
- The `Membership` entity itself (future dual-read phase)

## Rollback

M2 adds files only (plus additive barrel exports). Rollback = delete the M2 files and remove the added barrel lines. No data migration, no entity changes, no route changes.

## Next Step

Await founder approval, then proceed to **Milestone 3**: RoleGateway + WorkspaceLayout integration — wiring the resolvers with real `base44.entities.Employee` fetches and enforcing tenant context via the Access Engine.