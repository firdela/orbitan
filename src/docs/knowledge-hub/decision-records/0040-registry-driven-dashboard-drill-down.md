# ADR-0040: Registry-Driven Dashboard Drill-Down Navigation

**Status:** Accepted
**Date:** 2026-07-21
**Decider:** Muhammad Firdaus Bin Ismail (Product Owner)
**Supersedes:** None
**Related:** ADR-0033 (Metrics & Analytics Registry), ADR-0032 (Polymorphic Action Engine)

## Context

The WorkspaceDashboard renders KPI widgets (StatCard components) that display operational metrics like inventory count, pending purchase orders, today's sales, and compliance status. While the widgets already supported basic `to`/`onClick` navigation props, the routing was hardcoded in the dashboard component rather than driven by the MetricDefinition registry.

The Golden UI/UX Standard requires that every dashboard statistic be clickable, allowing users to drill down into the relevant module page to see underlying data details. Without a registry-driven approach, adding a new metric requires editing both the MetricDefinition schema AND the dashboard component — violating the Registry-Driven Architecture principle (ADR-0001) and creating maintenance debt as the platform scales to thousands of tenants and hundreds of metrics.

## Decision

Implement a **Registry-Driven Drill-Down** pattern where each `MetricDefinition` record declares its own navigation destination and interaction pattern via a new `drilldown_config` field. The dashboard reads this configuration dynamically to wire StatCard navigation — zero hardcoded routing in the UI layer.

### Schema Addition

```json
"drilldown_config": {
  "type": "object",
  "properties": {
    "route": { "type": "string", "description": "Destination path with :tenantId placeholder" },
    "pattern": { "type": "string", "enum": ["navigate", "side_sheet"], "default": "navigate" },
    "query_params": { "type": "object", "description": "Context-aware pre-filtering e.g. {status: 'pending'}" }
  }
}
```

### Hybrid Tiered Interaction Pattern

Two interaction patterns are supported, selected per-metric via `drilldown_config.pattern`:

1. **Navigate (Default)** — Standard page navigation. Best for full-screen views like PO editing, inventory management, or compliance review where the user needs the complete module interface.

2. **Side-Sheet (Enterprise/Pro)** — Contextual drawer overlay. Best for high-frequency quick-look actions (e.g., checking a specific invoice status) where the user needs to maintain dashboard context and compare information side-by-side.

### Visual Discoverability

The StatCard component now renders a subtle `ChevronRight` indicator that fades in on hover when the card is interactive. This satisfies the Golden UI/UX Standard for discoverability — users perceive the interactivity before clicking, without cluttering the default state.

## Reasoning

### Why Registry-Driven vs. Hardcoded

| Factor | Hardcoded (Before) | Registry-Driven (After) |
|--------|-------------------|------------------------|
| New metric effort | Edit schema + dashboard + tests | Edit schema only |
| Tenant customisation | Not possible | Tenant can override route via RLS |
| Audit traceability | Implicit | Explicit (MetricDefinition is the source of truth) |
| Scalability | Linear maintenance cost | O(1) per new metric |

### Why Hybrid Tiered (Both Patterns)

- **Navigate** is the web standard — works with browser back/forward, PWA gestures, and is accessible by default. Suitable for most metrics.
- **Side-Sheet** serves power users who need to monitor multiple metrics simultaneously without losing dashboard context. Flagging high-frequency/action-critical metrics (pending POs, overdue compliance) as `side_sheet` gives enterprise users the split-attention workflow they need.
- **Choice per metric** — storing the pattern in the registry lets us change behaviour for any metric without touching frontend code. A metric that starts as `navigate` can be promoted to `side_sheet` once we observe users frequently returning to the dashboard after clicking it.

## Alternatives Considered

1. **Navigate-only** — Simplest, but loses context for power users who need split-attention workflows. Rejected for enterprise readiness.

2. **Side-sheet-only** — Maximises context preservation but adds cognitive load for simple tasks and breaks the browser back-button mental model. Rejected as the sole pattern.

3. **User preference toggle** — Let each user choose their preferred pattern globally. Deferred — adds a settings surface we don't need yet. The registry-driven approach lets us revisit this without architectural change.

## Consequences

- **MetricDefinition schema** gains `drilldown_config` (non-breaking, optional field).
- **StatCard** already supported `to`/`onClick` — no breaking changes; the hover chevron is additive.
- **WorkspaceDashboard** widget registry already passes `to` props — existing behaviour preserved. Future iteration can read `drilldown_config` from the MetricDefinition registry to wire these dynamically.
- **Destination pages** (InventoryPage, ProcurementPage, etc.) should read `URLSearchParams` to honour `query_params` for pre-filtered landing — to be implemented incrementally per module.

## Implementation Status

- [x] MetricDefinition schema enriched with `drilldown_config`
- [x] StatCard hover chevron indicator added for discoverability
- [x] LowStockCard items made individually clickable (drill into inventory)
- [x] All existing KPI widgets verified to have `to` navigation props
- [ ] Side-sheet drawer component (future — when first metric is flagged `side_sheet`)
- [ ] Destination page query_params support (incremental, per module)

## Verification

- All KPI widgets on the WorkspaceDashboard are clickable and navigate to their respective module pages.
- The hover chevron appears on interactive StatCards and is invisible on non-interactive ones.
- LowStockCard line items are individually clickable and link to the inventory page.
- The MetricDefinition schema accepts the new `drilldown_config` field without breaking existing records (optional field, no required constraint).