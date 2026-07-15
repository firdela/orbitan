# ADR-0027: Standardised Staff Directory Governance

**Date:** 2026-07-15
**Status:** Proposed
**Deciders:** Muhammad Firdaus Bin Ismail (Product Owner), Base44 (Product Architect)
**Related:** ADR-0016 (RLS Tenant Isolation Standard), ADR-0003 (Shield Governance Interceptor), Golden UI/UX & Accessibility Standard

---

## Context

As OrbitanOS approaches its MVP delivery window (North Star: production-quality MVP by 30 July 2026), the need for a centralised, governance-ready Staff Directory has become a foundational priority. The existing `WorkforcePage` provides a read-only directory tab, but pilot tenants — particularly Taqueria Pte Ltd (La Birria Tacos) — require full employee profile management, skills tracking, employment history, and audit-bound role changes for SOC 2 readiness.

The Staff Directory is the bedrock of all workforce-dependent modules: Scheduling, Shift Logs, Payroll, Compliance, and the future Operational Overview dashboard. Without a correctly governed directory, every downstream module inherits a weak identity foundation.

---

## Decision

We will implement the Staff Directory as a **standalone, registry-driven module** (`staff_directory`) that reuses the existing `Employee` entity (enhanced with skills, certifications, emergency contacts, and employment history) rather than creating a new entity.

### Key architectural decisions:

1. **No new entity.** The `Employee` entity is extended in-place with `skills`, `certifications`, `emergency_contact`, `employment_history`, `team`, and `termination_date` fields. This prevents data duplication and preserves existing RLS policies.

2. **RBAC via `ModuleAccessPolicy`.** The directory uses the existing `useModuleAccess('workforce')` hook for permission resolution. No new permission model is introduced.

3. **Audit-bound edits.** Every profile update (especially role and position changes) writes to the global `AuditLog` via `auditFrontend` with `previous_state` and `new_state` snapshots, and appends to the employee's `employment_history` array for chronological traceability.

4. **Separate route, shared data.** The Staff Directory page lives at `/workspace/:tenantId/staff-directory` as a focused module, while the existing `WorkforcePage` retains its broader "Workforce Control Room" role (invitations, access requests, punctuality). This avoids duplication and respects single-responsibility.

5. **Registry-driven navigation.** The `staff_directory` key is added to `MODULE_REGISTRY` in `orbitan-nav.js`, making it available to all tenant navigation manifests without hardcoding.

---

## Rationale

### Why a standalone page rather than enhancing the existing WorkforcePage tab?

The WorkforcePage already handles four tabs (Directory, Access Requests, Invitations, Punctuality). Adding full profile management, filtering, and audit history would overload the component, violating the Golden UI/UX principle of focused interfaces. A standalone directory allows:
- Richer filtering and grouping without competing for screen real estate.
- A dedicated audit trail view per employee.
- Future expansion (skills matrix, org chart, reporting) without bloating the Workforce page.

### Why extend `Employee` rather than create a new entity?

Creating a `StaffProfile` entity would duplicate identity data, break existing RLS policies, and force every workforce module (Shift, ClockRecord, PayrollSnapshot) to join two entities. The `Employee` entity already has robust tenant-scoped RLS and is referenced by every workforce integration. Extending in-place is the lowest-risk, highest-scalability option.

### Why `employment_history` as an array field?

A separate `EmploymentHistory` entity would require an additional join for every profile view and add API complexity. For MVP scale (pilot tenants with <50 employees), an embedded array is performant, queryable, and self-contained. At enterprise scale, this can be extracted to a dedicated entity without breaking the UI contract.

---

## Trade-offs

| Approach | Benefit | Risk/Disadvantage |
|---|---|---|
| **Extend `Employee` (chosen)** | No data migration, preserves RLS, single source of identity | Array fields grow with tenure; may need extraction at very large scale |
| New `StaffProfile` entity | Clean separation of profile vs identity | Duplicate data, RLS duplication, join complexity for downstream modules |
| Enhance WorkforcePage tab | No new route | Component bloat, violates single-responsibility, poor scalability |

---

## Security & Compliance

- **Tenant isolation:** Inherited from `Employee` RLS — no cross-tenant access is possible.
- **RBAC:** `useModuleAccess('workforce')` gates create/update/delete. Workers can view the directory (read RLS permits this); only managers+ can edit.
- **Audit trail:** Every profile update writes to `AuditLog` with full state snapshots, satisfying SOC 2 "change tracking" evidence requirements.
- **Employment history:** Role and position changes are appended to `employment_history` with `change_reason`, providing a tamper-evident chronological record.
- **Sensitive data:** Emergency contact info is only visible in the profile dialog, not exposed in the directory grid.

---

## Verification

1. **Tenant isolation:** A `tenant_admin` in Tenant A should see zero records from Tenant B.
2. **RBAC:** A `worker` should see the directory (read) but the "Edit" button should be hidden.
3. **Audit:** After updating an employee's role, an `AuditLog` entry should exist with `previous_state` and `new_state`.
4. **Employment history:** After a role change, the `employment_history` array should contain a new entry with `change_reason: "Role change"`.
5. **No duplicate data:** The Staff Directory should not create a second copy of employee records — it reads the same `Employee` entity used by WorkforcePage, Scheduling, and Payroll.

---

## Future Considerations

- **Skills matrix:** The `skills` array can be indexed for a future skills-gap analysis report.
- **Certifications:** The `certifications` array supports expiry tracking — to be wired into `complianceAlertEngine` for renewal reminders.
- **Org chart:** The `department`, `team`, and `outlet_id` fields provide the structure for a visual organisational chart.
- **ABAC readiness:** The current RBAC model can be extended to Attribute-Based Access Control (e.g., "can only edit employees in the same department") without schema changes.