# ADR-0028: Workforce-Financial Correlation Logic

**Status:** Accepted
**Date:** 2026-07-15
**Principle:** Regulate
**Depends on:** ADR-0003 (Shield Governance Interceptor)
**Supersedes:** None

---

## Context

Pilot tenants (notably Taqueria Pte Ltd — La Birria Tacos) require real-time visibility into labor costs relative to sales. Current silos between `Shift` (labor cost) and `SalesInvoice` (revenue) prevent automated decision-making and allow inefficient shifts to be published without warning.

This creates a governance gap: a manager can publish a shift whose projected labor cost exceeds the outlet's average daily revenue — a classic labor-to-revenue ratio breach — with no system-level guardrail.

## Decision

1. **Virtual Aggregation Layer** — an `OperationalPerformanceEngine` maps `Shift` records to `SalesInvoice` data by `outlet_id` + `date` to compute labor-to-revenue ratios without a new transactional entity.

2. **Governance-Gated Thresholds** — link to the `ShieldInterceptor`. Publishing a shift whose projected labor cost exceeds a defined revenue percentage (e.g. >30% of average daily revenue for F&B, >20% for Retail) triggers a `GovernanceOverride` requirement before the shift is committed.

3. **Cached Performance Snapshots** — store computed metrics in a cached snapshot for dashboard performance at scale, avoiding raw transactional queries on every render. Snapshots are refreshed nightly by `orbitanOrchestrator` and on-demand after shift/sales mutations.

## Rationale

Treating labor planning as a **financial activity** (not just an HR task) moves OrbitanOS from passive "reporting" to "active governance." Using the Shield to block inefficient shifts *before* they occur embeds proactive risk mitigation into the platform's core.

Thresholds are stored as `GovernancePolicy` records, so ADR-0029 agentic gates can enforce them when AI-suggested schedules are generated — the same policy engine governs both human and agent shift publishing.

**Alternatives considered:**
- *Post-hoc reporting only* — rejected: surfaces problems after the shift is worked; no cost recovery path.
- *Hardcoded per-industry constants* — rejected: not tenant-configurable; violates the Platform Scalability Principle.

## Consequences

- Enables data-driven shift publishing decisions across pilot tenants.
- Cached snapshots keep dashboards performant for enterprise tenants with hundreds of outlets.
- Thresholds are `GovernancePolicy` records, so they inherit Shadow Audit Mode (ADR-0029) for safe calibration.

## Cross-references

- ADR-0003: Shield Governance Interceptor
- ADR-0029: Autonomous Governance Thresholds for Agentic AI