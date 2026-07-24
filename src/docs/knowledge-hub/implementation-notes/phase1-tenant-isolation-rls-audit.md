# Phase 1 Increment #3 — Tenant Isolation: RLS Hardening (Attendance/Compliance Cluster)

> **Status:** Implemented — 2026-07-24
> **Phase:** Build Manifest Phase 1 (Foundation Layer)
> **Priority:** #1 — Complete tenant isolation verification
> **Predecessors:** AFR rule #4 (RLS tenant-isolation tests), Base44 RLS authoring guide

## Finding

A static audit of the RLS `user_condition` usage — checked against the
Base44 RLS authoring guide (plain-value `user_condition`, must be the only
key in its object) and Orbitan's own AFR rule #4 ("no `$in` operator in
`user_condition`") — found a systemic violation in the attendance/compliance
core:

| Entity | Operations | Violation |
| :--- | :--- | :--- |
| `ClockRecord` | create, read, update | `user_condition: { role: { $in: [...] } }` **and** `user_condition` placed alongside `data.outlet_id` in the same object |
| `Shift` | read | `user_condition: { role: { $in: [...] } }` alongside `data.outlet_id` |
| `ComplianceRecord` | create, read, update | `user_condition: { role: { $in: [...] } }` (alone in its object, but still an operator inside `user_condition`) |
| `FoodSafetyLog` | create, read, update | `user_condition: { role: { $in: [...] } }` (lone `$in` inside `user_condition`) |

**Risk:** The guide only documents **plain-value** `user_condition` (exact
equality). `$in` inside `user_condition` is undocumented. If the RLS engine
does not evaluate it, the outlet-scoped manager/supervisor grant branch
silently never matches — meaning **outlet managers and supervisors could be
denied read access to their own outlet's clock/shift/compliance records**
(falling back to seeing only their own records via `employee_id`). This would
break timesheet review and compliance oversight — the MVP's core workforce
flows. Regardless of engine behaviour, the form violates AFR #4 and must be
remediated to the documented shape.

## Corrective action

Rewrote the RLS for `ClockRecord`, `Shift`, and `ComplianceRecord` to the
**documented form**:

- Role lists expressed as an `$or` of plain `user_condition` branches
  (`{ "user_condition": { "role": "outlet_manager" } }` …), never `$in`.
- `user_condition` is always the only key in its object.
- Outlet-scoped grants wrapped as `$and` of `{ data.outlet_id }` + the
  role `$or`, so the outlet boundary is preserved exactly (no access widening).
- Top-level `tenant_id` boundary preserved via an explicit `$and`.

Semantics are **identical** to the prior rules — the change is strictly a
correction to the documented structural form. No access was widened or
narrowed; the tenant and outlet boundaries are byte-for-byte equivalent.

## Evidence

`base44/shared/rlsStructureValidator.ts` — a pure validator enforcing the two
hard rules (user_condition-alone, no operators inside user_condition). Wired
into `accessValidationHarness` as **before/after** tests:

- **Before:** the pre-fix `ClockRecord` read rule is flagged with both
  `operator_in_user_condition` and `user_condition_not_alone`.
- **After:** the corrected `ClockRecord` read rule validates clean (`[]`),
  and the tenant boundary is confirmed retained.

Run via the platform test runner — see the Backend Suite on
`/dev/access-validation`.

## Scope decision (what we did NOT change)

The guide also states `$or`/`$and` must be the only key in their object. The
top-level `{ "data.tenant_id": X, "$or": [...] }` implicit-AND pattern is
**pervasive** across the codebase (Employee, Task, AuditLog, …) and works
(Mongo implicit-AND semantics). Mass-rewriting every entity to explicit `$and`
wrapping is high-churn, low-risk-reduction work and would touch dozens of
working rules — deliberately **deferred** to a separate hardening pass. The
validator intentionally does **not** flag the logical-operator-alone rule to
avoid noisy false positives on working rules; it enforces only the two
`user_condition`-specific hard rules.

## Cluster 2 — Operational/Financial (audited, evidence-first)

Following the evidence-first sequence (build validator → run → capture → fix
only confirmed → re-run), the operational/financial cluster was audited against
the same validator:

| Entity | Result |
| :--- | :--- |
| `InventoryItem` | ✅ Compliant — plain `user_condition` in `$or` across all ops. No change. |
| `PurchaseOrder` | ✅ Compliant — plain `user_condition`. No change. |
| `SalesInvoice` | ✅ Compliant — plain `user_condition`. No change. |
| `ExpenseRecord` | ✅ Compliant — plain `user_condition` + `created_by_id` ownership. No change. |
| `FoodSafetyLog` | ❌ Confirmed violation — `$in` inside `user_condition` (create/read/update). **Fixed** to documented `$or`-of-plain form; semantics identical. |

Harness evidence: `accessValidationHarness` runs the FoodSafetyLog before/after
fixtures (pre-fix flagged `operator_in_user_condition`; post-fix clean). See
`/dev/access-validation`.

## Remaining technical debt

1. Audit the remaining non-snapshot entities (InventoryItem, PurchaseOrder,
   SalesInvoice, ExpenseRecord, FoodSafetyLog, etc.) for the same
   `$in`-in-`user_condition` violation and remediate.
2. App-wide pass to wrap top-level `{ field, "$or" }` in explicit `$and`
   (spec-compliance, low priority).
3. Runtime cross-tenant / cross-user RLS verification in the Orbitan Test Lab
   (requires temp tenants + multi-user tokens — deferred to avoid polluting
   pilot/prod data; the structural validator is the deterministic guard).

## Next increment

Continue the tenant-isolation audit across the remaining module entities
(InventoryItem, PurchaseOrder, SalesInvoice, ExpenseRecord, FoodSafetyLog),
applying the same validator + documented-form remediation.