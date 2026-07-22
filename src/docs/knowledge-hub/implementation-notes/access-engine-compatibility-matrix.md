# Access Engine — Compatibility Matrix (Employee → Membership Model)

**Architecture Version:** 1.0 (Frozen)
**Milestone:** 2 prerequisite
**Date:** 2026-07-22
**Purpose:** The single migration reference for how the current `Employee`-based authorization model maps to the future `User` + `Membership` + `RoleAssignment` + `ScopeAssignment` + `EmployeeProfile` architecture. Every future developer must consult this before touching authorization.

---

## Principle

> The `MembershipResolver` (`src/lib/access/membership/MembershipResolver.js`) is the **only** module permitted to understand the `Employee → Membership` mapping. No other component translates `Employee` fields into authorization concepts. When `Employee` is eventually retired, only `MembershipResolver` changes — nothing else.

---

## Field Mapping

| Current (`Employee`)         | Future Entity         | Future Field                  | Notes / Transformation                                                                 |
| ---------------------------- | --------------------- | ----------------------------- | -------------------------------------------------------------------------------------- |
| `Employee.id`                | `EmployeeProfile`     | `id`                          | The HR profile record retains its own id.                                             |
| `Employee.user_id`           | `Membership`          | `user_id`                     | Links the global `User` identity to this membership. Nullable pre-claim.               |
| `Employee.email`             | `User`                | `email`                       | Global identity field, resolved at login, not stored on membership.                   |
| `Employee.full_name`         | `EmployeeProfile`     | `full_name`                   | HR display name.                                                                       |
| `Employee.role`              | `RoleAssignment`      | `role`                        | One entry in `Membership.role_assignments[]`. Supports multiple roles per membership.  |
| `Employee.tenant_id`         | `Membership`          | `organisation_id`             | The organisation this membership belongs to. Renamed for clarity.                      |
| `Employee.outlet_id`         | `ScopeAssignment`     | `scope.outlet_id`             | Scopes the role assignment to an outlet. Null = tenant-wide.                           |
| `Employee.company_id`        | `ScopeAssignment`     | `scope.company_id`            | Brand/company scope dimension.                                                         |
| `Employee.department`        | `ScopeAssignment`     | `scope.department`            | Department scope dimension.                                                            |
| `Employee.position`          | `EmployeeProfile`     | `position`                    | Job title — HR only.                                                                   |
| `Employee.employment_type`    | `EmployeeProfile`     | `employment_type`             | HR-only classification.                                                                |
| `Employee.status`            | `Membership`          | `status`                      | **Normalised:** `active`/`on_leave`→`active`; `inactive`→`suspended`; `terminated`→`revoked`. |
| `Employee.hire_date`         | `EmployeeProfile`     | `hire_date`                   | HR only.                                                                               |
| `Employee.skills`             | `EmployeeProfile`     | `skills`                      | HR only.                                                                               |
| `Employee.certifications`    | `EmployeeProfile`     | `certifications`              | HR only.                                                                               |
| `Employee.emergency_contact` | `EmployeeProfile`     | `emergency_contact`           | HR only.                                                                               |
| `Employee.employment_history`| `EmployeeProfile`     | `employment_history`          | HR only.                                                                               |
| `user.role` (AuthContext)    | `User`                | `platform_role`               | Platform-level role (`admin` = Platform Owner). Separate from tenant membership role.  |
| `user.data.tenant_id`        | resolved via `MembershipResolver` | —                   | The resolver derives `organisation_id`; no direct field reads in modules.             |
| `user.data.outlet_id`        | resolved via `MembershipResolver` | —                   | The resolver derives `scope.outlet_id`.                                                 |

---

## Status Normalisation

| `Employee.status` | `Membership.status` | Access Engine behaviour |
| --- | --- | --- |
| `active` | `active` | Granted (subject to permissions) |
| `on_leave` | `active` | Granted (still employed; future refinement may restrict write actions) |
| `inactive` | `suspended` | **Denied immediately** (`membership_inactive`) |
| `terminated` | `revoked` | **Denied immediately** (`membership_inactive`) |

---

## Role Mapping (MVP)

The current single `Employee.role` maps to one `RoleAssignment` with the same role key. Future memberships may carry multiple role assignments.

| `Employee.role` | `RoleAssignment.role` | MVP Permission Packs (see `PermissionPacks.js`) |
| --- | --- | --- |
| `tenant_admin` | `tenant_admin` | `Workforce.Manage`, `Inventory.Manage`, `Procurement.Manage`, `Sales.Manage`, `Finance.Manage`, `Compliance.Manage`, `Scheduling.Manage`, `Tasks.Manage`, `Reports.Read`, `Settings.Manage` |
| `client_manager` | `client_manager` | `Workforce.Read`, `Inventory.Read`, `Sales.Manage`, `Reports.Read` |
| `outlet_manager` | `outlet_manager` | `Workforce.Manage`, `Inventory.Manage`, `Procurement.Manage`, `Sales.Manage`, `Scheduling.Manage`, `Tasks.Manage`, `Compliance.Manage`, `Reports.Read` |
| `supervisor` | `supervisor` | `Workforce.Basic`, `Inventory.Read`, `Inventory.Adjust`, `Tasks.Manage`, `Scheduling.Read`, `Compliance.Basic` |
| `worker` | `worker` | `Tasks.Read`, `Tasks.UpdateOwn`, `Scheduling.Read`, `Clock.Manage`, `Compliance.Basic` |

Platform Owner (`user.role === 'admin'`) is handled by the Access Engine's Platform-Owner context rule (ADR-0050 §10), **not** by a permission pack.

---

## Migration Phases (non-destructive)

1. **Phase 2 (this milestone):** `MembershipResolver` translates `Employee` records into the normalized membership shape at runtime. No entity changes. The Access Engine reads through the resolver.
2. **Phase 3 (future):** Introduce a `Membership` entity. Dual-read: resolver checks `Membership` first, falls back to `Employee`.
3. **Phase 4 (future):** `Membership` becomes authoritative; `Employee` becomes `EmployeeProfile` (HR-only).
4. **Phase 5 (future):** Remove `Employee` authorization fields; `EmployeeProfile` retains HR data only.

At every phase, **only `MembershipResolver` changes**. The Access Engine, precedence resolver, policy engine, and all modules are unaffected.