# ADR-0054: Global Activity Timeline & Audit Centre

**Date:** 2026-07-26
**Status:** Accepted
**Related:** ADR-0031 (Unified Notification Pipeline), ADR-0053 (Orbit Inbox & Event Engine), ADR-0003 (Shield Governance Interceptor), ADR-0022 (Enterprise Compliance Readiness), ADR-0047 (Orbit Semantic Foundation)
**Decider:** Muhammad Firdaus Bin Ismail (Founder)

## Context

OrbitanOS already had an immutable `AuditLog` entity (ADR-0022) written by the `auditEngine` on 11 high-value operational entities, plus two fragmented read pages — `AuditTrail` (tenant-scoped) and `AuditLogPage` (platform-admin-scoped). As the platform scales toward multi-domain MVP, three gaps emerged:

1. **No unified Activity Timeline.** The audit view was table-only and split across two pages with overlapping filters — a "unified operational history" did not exist.
2. **No severity / category / source classification.** The AuditLog captured `shield_outcome` (policy evaluation) but had no deterministic severity or higher-level event category for timeline prioritisation and Orbit Nexus consumption.
3. **No worker self-visibility.** RBAC allowed only admins/managers to read AuditLog; workers — who perform most actions — could not see their own activity history.

The Orbit Inbox (ADR-0053) handles *actionable* work; the Audit Centre must complement it as the *immutable historical record* — without duplicating event generation, storage, or rendering.

## Decision

**Do not create a new entity or a new event source.** Extend `AuditLog` additively and build one unified, timeline-first read + governance layer.

### 1. AuditLog — Additive Enrichment (no new entity)

Six new **optional** fields, fully backward-compatible (existing writers unaffected; missing values default on read):

| Field | Type | Purpose |
|-------|------|---------|
| `severity` | enum `info / success / warning / critical` (default `info`) | Deterministic severity for timeline prioritisation. Independent of `shield_outcome`. |
| `category` | enum `operational / lifecycle / access / governance / security / ai / system` (default `operational`) | Higher-level event classification for timeline grouping + Orbit Nexus. |
| `event_source` | string | Engine/function that wrote the record (`auditEngine`, `shieldInterceptor`, `digitalSignature`, `notificationDispatcher`, `system`). |
| `link` | string | Best-effort deep link to the source record's page. |
| `related_user_id` | string | The *subject* user (e.g. onboarded/invited/role-changed) — distinct from `actor_id` (the *performer*). |
| `related_workflow` | string | Workflow name if part of a multi-step flow (`payroll_run`, `po_approval`). |

**RBAC change (read only):** added a worker self-read clause — a user can read AuditLog where `actor_id === user.id` within their tenant. Managers+ retain tenant-wide read; platform admin sees all. Create/update/delete rules unchanged.

### 2. auditEngine — Same Events, Richer Metadata (zero new generation)

The engine's core logic (compliance gate, finance gateway, snapshot writer, action-type resolution) is **untouched**. Only the final `AuditLog.create` call is enriched with `severity`, `category`, `event_source`, and `link`, derived from the existing `action_type` / `module` / `entityName`. This means **no new event generation, no duplicate storage** — the same automation-triggered events now carry richer metadata.

### 3. Global Activity Timeline & Audit Centre — One Unified Page

A single page (`/audit-centre`) supersedes the two fragmented pages:
- **Timeline + Table toggle** — timeline-first for scanning; table for dense review.
- **Comprehensive filters** — keyword search (covers actor/action/entity/details/tenant), module, severity, category, shield outcome, tenant (admin only), date range.
- **Role-aware scope** — platform admin → cross-tenant; tenant users → their tenant (enforced by RLS); workers → their own activity.
- **KPI strip** — events, critical, warnings, shield blocks, overrides, actors.
- **Export** — CSV (all metadata) + Audit Bundle PDF (via existing `auditBundleGenerator`, with integrity hash).
- **Detail drawer** — Sheet showing every stored field: actor, role, tenant, module, category, severity, source, target entity/record, IP, related user/workflow, shield outcome, policy, override, justification, evidence attachments, previous/new state diff, and a deep link.
- **Realtime refresh** — entity subscription invalidates the query on new events (not polling).

Legacy routes `/audit-trail` and `/platform/audit-logs` redirect to `/audit-centre`.

### 4. Orbit Nexus — Architecture Prepared, No Fabricated AI

The enriched AuditLog is queryable by the existing `nexusIntelligence` function without code changes — it can now reason over `severity`, `category`, `event_source`, and time series for anomaly/trend analysis. **No AI call is added in this build** (per directive: "Prepare architecture only"). The contract is documented for future Nexus consumption.

## Alternatives Considered

| Alternative | Why not |
|-----------|---------|
| New `PlatformEvent` ledger entity (deferred from ADR-0053) | Over-engineering for MVP — AuditLog already is the immutable ledger; the additive fields cover timeline needs. A separate entity would duplicate storage and require a new writer. Re-evaluate only if analytics demand event shapes AuditLog cannot model. |
| New `auditCentre` backend function to aggregate | Unnecessary — the read layer queries AuditLog directly via the SDK; no server-side aggregation is needed for MVP volumes. Adding a function would add latency + maintenance. |
| Broaden event capture now (login, config, lifecycle) | Out of MVP scope and risks duplicate generation. The auditEngine already covers the 11 high-value operational entities. Lifecycle/access/security sources arrive with their owning builds; the schema + filters are ready for them. |
| Keep three audit pages | Explicitly prohibited ("prevent duplicate rendering") and confusing for users. One unified, role-aware page is cleaner. |
| Per-event LLM severity | Credit cost + latency for every event. Deterministic derivation from `action_type` is explainable, instant, and free. Reserved for future batch Nexus job. |

## Consequences

**Positive:**
- One canonical audit surface; no duplicate rendering.
- Timeline + severity + category make the audit trail scannable and prioritised.
- Workers gain self-visibility (transparency) without exposing others' data.
- Orbit Nexus has a richer, queryable contract — no fabricated insights.
- Fully backward-compatible — existing auditEngine callers and AuditLog readers unaffected.

**Negative / Trade-offs:**
- AuditLog schema grew (6 optional fields) — acceptable, pure schema, exit-ready.
- Legacy `AuditTrail` / `AuditLogPage` files deleted — bookmarks redirect; no functionality lost (all features ported: CSV + bundle export, filters, detail view).
- Worker self-read broadens read RLS — bounded to `actor_id === user.id` within tenant, so privacy preserved.
- Category values beyond `operational`/`governance`/`system` are currently empty until other event sources arrive — by design (architecture prepared, sources deferred).

## Security & Privacy

- **RLS:** read is admin OR (tenant match AND manager) OR (tenant match AND actor self). No cross-tenant leak. Workers see only their own actions.
- **Immutability:** update/delete remain admin-only (existing behaviour).
- **No source data duplication:** the detail drawer shows snapshots + provenance + deep links, never raw source business records.

## Future Evolution

- **Lifecycle/access/security sources:** tenant created, user invited, role changed, login, config changes — arrive with their owning builds; populate `category` = `lifecycle`/`access`/`security`. Schema + filters ready.
- **Orbit Nexus consumption:** `nexusIntelligence` reads AuditLog for anomaly detection and trend analysis (future build — no code change needed to AuditLog).
- **Batch severity re-classification:** scheduled Nexus job to promote/demote `severity` across historical events when policy thresholds change.
- **`PlatformEvent` ledger:** re-evaluate at the Activity Analytics build only if a need emerges that AuditLog cannot model.