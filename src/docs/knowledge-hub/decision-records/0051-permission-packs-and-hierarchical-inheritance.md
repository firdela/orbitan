# ADR-0051: Permission Packs & Hierarchical Inheritance

**Status:** Accepted (Architecture Version 1.0 — Frozen)
**Date:** 2026-07-22
**Deciders:** Founder (Firdela Holdings), Base44 Architecture
**Related:** ADR-0050 (Centralised Access Engine), ADR-0047 (Orbit Semantic Foundation)

---

## 1. Purpose

Define a granular, scalable, and manageable permission model decoupling role definitions from hardcoded permission logic. Roles are collections of **Permission Packs**; packs are collections of **atomic permissions**.

## 2. Design Principles

- **Granularity:** Permissions are atomic actions on resources, named `<module>.<verb>`.
- **Composability:** Roles compose packs; packs compose permissions.
- **Hierarchy:** Permissions inherit downwards (Org → Brand → Outlet → Department), never across tenants.
- **Precedence:** Explicit denials override all; explicit allow beats inherited allow beats role default.

## 3. Naming Convention

`<module>.<verb>`. Verbs: `read`, `read.self`, `create`, `update`, `update.self`, `adjust`, `approve`, `receive`, `assign`, `verify`, `sign`, `delete`, `export`, `manage`.

Examples: `inventory.read`, `inventory.adjust`, `purchaseorder.approve`, `task.assign`, `compliancerecord.sign`.

## 4. Permission Packs

Packs are named bundles (e.g. `Inventory.Manage`, `Tasks.Manage`, `Finance.Readonly`). Defined in `src/lib/access/PermissionPacks.js` (`PERMISSION_PACKS`). The registry is versioned (`PERMISSION_PACKS_VERSION = '1.0.0'`). Adding a capability = add a permission key and assign it to relevant packs — no core logic changes.

Industry packs may register additional packs at runtime via `withPack`.

## 5. Roles

Roles map to packs (`ROLE_PACKS`). MVP roles: `tenant_admin`, `client_manager`, `outlet_manager`, `supervisor`, `worker`. Platform Owner (`admin`) is **not** a pack-bearing role — handled by the Access Engine's Platform-Owner context rule (ADR-0050 §10).

## 6. Hierarchical Inheritance

- Permissions defined at a higher scope (tenant-wide) are inherited by lower scopes (outlet, department) within the same tenant.
- An outlet-scoped permission does not cover a different outlet (same tenant).
- Cross-tenant permissions are rejected (`permission_out_of_scope`).

## 7. Precedence

1. Explicit Deny (any level) — highest
2. Explicit Allow (most specific scope)
3. Inherited Allow (ancestor scope)
4. Role Default Allow (permission pack)
5. Subscription Entitlement
6. Feature Flag
7. Default Deny — lowest

Implemented in `src/lib/access/precedence.js`.

## 8. Membership Linkage

Permissions are derived from a membership's `role_assignments[]` (ADR-0048). Each assignment carries a role and a scope. The `PermissionResolver` expands the role's packs into atomic permissions tagged `source: 'role_default'` with the assignment's scope. Explicit/inherited grants (future) set `source: 'explicit'`/'`inherited'`.

## 9. Versioning

`PERMISSION_PACKS_VERSION`, `MEMBERSHIP_RESOLVER_VERSION`, `PERMISSION_RESOLVER_VERSION` are all pinned to `1.0.0`. Changes require a new ADR and a version bump so enterprise upgrades remain safe.

## 10. Consequences

- Positive: roles are reconfigurable without code changes; new capabilities are additive; cross-tenant safety is enforced at the precedence layer.
- Negative: every consumer must resolve permissions through the resolver; the pack registry must be maintained.
- Mitigation: the resolver is the single derivation point; the registry is the single source of truth.