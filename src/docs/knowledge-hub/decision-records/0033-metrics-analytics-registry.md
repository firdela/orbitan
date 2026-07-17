# ADR-0033: Metrics & Analytics Registry

**Status:** Accepted
**Date:** 2026-07-17
**Principle:** Refine (consistency, single-source-of-truth)
**Supersedes:** —
**Related:** ADR-0001 (Registry-Driven Architecture), ADR-0032 (Action Engine)

---

## Context

Today, metrics like "Labour Cost %" or "Inventory Turnover" are computed
inline in whichever page displays them. The Workforce page calculates shift
coverage one way; the Reporting page may calculate the *same* metric
differently. At enterprise scale this produces **conflicting numbers** across
dashboards — an unacceptable trust failure for SOC 2 / audit-readiness and for
commercial credibility with paying customers.

Every new Industry Pack or dashboard widget risks re-implementing a metric
that already exists elsewhere under a slightly different formula.

---

## Decision

Introduce a **`MetricDefinition`** registry entity that is the *single source
of truth* for every quantitative KPI across OrbitanOS.

Each `MetricDefinition` record declares:

- `metric_key` — unique identifier (e.g. `labour_cost_pct`, `inventory_turnover`)
- `module` — owning module
- `display_name` / `description` / `unit`
- `formula_ref` — a reference to a named computation (executed by a
  `metricsEngine` backend function), not an inline lambda
- `aggregation_mode` — `sum` / `ratio` / `count` / `custom`
- `source_entities` — the entities the metric reads from
- `tenant_id` — `system` for platform defaults; tenant-specific overrides for
  white-label / enterprise customisation

A backend function **`metricsEngine`** evaluates a `MetricDefinition` against
its `source_entities` and returns a standardised result object
`{ value, unit, computed_at, source_count }`. Dashboards call the engine by
`metric_key` — they never re-implement the formula.

### Why a registry over inline calculation

- **Consistency:** "Gross Margin" means exactly one thing everywhere —
  Workforce, Reporting, Analytics, Orbit Nexus, future Industry Packs.
- **Pluggable:** a new Industry Pack adds its metrics by creating
  `MetricDefinition` records, not by forking dashboard code.
- **Audit-ready:** a metric's formula is a versioned, documented record —
  not buried in a JSX component — so an auditor can be pointed at the exact
  definition used for any reported number.

### Alternatives considered

- *Shared JS `metrics` utility module:* reduces duplication but stays
  code-bound and is not tenant-overridable or auditable as data.
  **Rejected.**
- *Pre-materialised analytics table:* fastest for reads but introduces a
  sync pipeline and stale-data risk. **Deferred** — the engine computes on
  demand for the MVP; a materialised snapshot can be layered later behind the
  same `metric_key` contract without changing any dashboard.

---

## Scope for MVP (Phase 1)

1. Create the `MetricDefinition` entity (this ADR).
2. Seed two platform-default metric definitions:
   - `inventory_value_sgd` (module: `inventory`, mode: `sum`)
   - `po_pending_count` (module: `procurement`, mode: `count`)
3. The `metricsEngine` function is **deferred** beyond a stub until at least
   one real dashboard consumes a metric — this ADR establishes the *contract*
   (the registry), not the full compute pipeline, to protect the MVP timeline.

---

## Consequences

- **Positive:** Every reported number across OrbitanOS traces to one
  versioned definition — no conflicting dashboards.
- **Positive:** New Industry Packs / Marketplace modules add analytics via
  registry records, not code forks.
- **Cost:** One new entity (`MetricDefinition`). The compute engine is
  stubbed initially to avoid over-building.
- **Risk:** If dashboards bypass the engine and compute inline, the registry
  becomes documentation rather than enforcement. Mitigation: code review
  discipline + a future lint rule that flags inline KPI math.

---

## Verification

- A `MetricDefinition` with `metric_key: "inventory_value_sgd"` exists and
  its `source_entities` reference `InventoryItem`.
- The registry is tenant-isolated (`system` defaults + tenant overrides) and
  RLS-restricted to admin / tenant_admin writes.