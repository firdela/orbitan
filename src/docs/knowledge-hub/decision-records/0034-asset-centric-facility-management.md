# ADR-0034: Asset-Centric Facility Management

**Status:** Accepted
**Date:** 2026-07-17
**Principle:** Refine (reuse) + Regulate (lifecycle governance)
**Supersedes:** —
**Related:** ADR-0025 (Artifact Registry), ADR-0032 (Action Engine), ADR-0001 (Registry-Driven Architecture)

---

## Context

The upcoming **Facility Manager** module needs to track physical assets
(industrial ovens, recycling equipment, POS terminals), their maintenance
lifecycle, inspections, and depreciation. The naive approach — create a
`FacilityTask` + `MaintenanceTask` + `EquipmentRecord` trio per module —
duplicates the existing `Task` entity and the `ArtifactRecord` evidence store.

At platform scale (multiple industries, thousands of tenants), per-module
task duplicates multiply technical debt and make cross-module analytics
impossible ("how many open maintenance tasks across all asset types?").

---

## Decision

Adopt a **polymorphic, asset-centric** model:

1. **Reuse the existing `Task` entity** as the *single* action/work-order store
   across all modules. A `task_type` discriminator (`operational`,
   `maintenance`, `compliance`, `inspection`, `cleaning`) + a
   `linked_asset_id` field connect a task to any asset — no `FacilityTask`
   entity is created.

2. **Introduce an `AssetRecord` entity** that models any trackable physical or
   high-value digital asset (equipment, vehicle, facility sub-location,
   digital tool). It links to the owning `Outlet` (spatial context) and to
   `ArtifactRecord` for manuals, warranties, inspection certificates.

3. **Lifecycle events emit to the Action Engine (ADR-0032).** A maintenance
   task completing, an inspection expiring, or a warranty lapsing emits
   `asset.*` trigger events that `AutomationRule` records can react to —
   fully decoupled, tenant-configurable.

### Why reuse over new entities

- **One task list to query, not N.** Workforce, Facility, and Compliance
  all draw from the same `Task` store — a single source for dashboards and
  the Shift/Workforce analytics drill-down.
- **Action Engine does the wiring.** "Auto-create a maintenance task when an
  asset's inspection is 7 days from expiry" is an `AutomationRule`, not code.
- **Evidence stays unified.** Warranties, manuals, and inspection photos
  already have a home in `ArtifactRecord` — no new document store.

### Alternatives considered

- *Dedicated `FacilityTask` entity:* seems clearer per-module but fragments
  task analytics and forces the Action Engine to know N task types.
  **Rejected** — violates the reuse principle.
- *Embed assets inside `InventoryItem`:* conflates consumable stock with
  durable assets (depreciation, maintenance schedules don't apply to a bag
  of flour). **Rejected** — distinct lifecycle semantics.

---

## Scope for MVP (Phase 1)

1. This ADR records the **decision and contract** (polymorphic `Task` +
   `AssetRecord` + Action-Engine wiring).
2. The `AssetRecord` entity schema is created in a **later phase** once the
   Action Engine reference integration (Procurement → Wallet, ADR-0032) is
   proven — to protect the two-month MVP timeline and avoid building a
   second module surface before the foundation is validated.

---

## Consequences

- **Positive:** Facility Management inherits the existing `Task` UI,
  permissions, and audit pipeline — zero duplicate CRUD.
- **Positive:** Cross-module analytics ("open maintenance vs. operational
  tasks") work natively because there is one task store.
- **Cost:** One new entity (`AssetRecord`) in a later phase; `Task` gains
  `task_type` + `linked_asset_id` fields.
- **Risk:** Overloading `Task` with many `task_type` values can clutter the
  task UI if not filtered. Mitigation: the Tasks page filters by
  `task_type` / `module_context` — already standard practice.

---

## Verification

- No `FacilityTask` entity is created.
- The `Task` entity gains `task_type` and `linked_asset_id` (when the
  Facility module phase begins).
- Asset lifecycle events route through `AutomationRule`, not inline code.