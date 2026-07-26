# Build Package #23 — Global Activity Timeline & Audit Centre

**Date:** 2026-07-26
**Build:** #23
**ADR:** ADR-0054
**Status:** Production-complete
**MVP Completion:** ~97%

## Executive Summary

Implemented the **Global Activity Timeline & Audit Centre** as the unified operational history and governance layer for OrbitanOS. It complements the Orbit Inbox (actionable work) with an immutable historical record — without duplicating event generation, storage, or rendering.

The core architectural decision: **extend, do not recreate.** The existing `AuditLog` entity and `auditEngine` function were enriched additively (6 optional metadata fields), and the two fragmented audit pages were consolidated into one unified, timeline-first, role-aware page. Zero new entities, zero new event-generating automations, zero duplicate storage.

## Architecture

```
Existing entity automations (unchanged)
        ↓
auditEngine (core logic unchanged; AuditLog.create enriched with
   severity, category, event_source, link)
        ↓
AuditLog entity (6 additive optional fields + worker self-read RLS)
        ↓
Audit Centre (unified read layer: timeline + table, filters, export)
        ↓
Orbit Nexus (architecture prepared — queryable, no fabricated AI)
```

## Entities Extended (1 — no new entity)

### AuditLog (additive — ADR-0054)
New optional fields: `severity` (info/success/warning/critical, default info), `category` (operational/lifecycle/access/governance/security/ai/system, default operational), `event_source` (string), `link` (deep link), `related_user_id` (subject user), `related_workflow` (workflow name). All backward-compatible — existing writers unaffected; missing values default on read.

**RLS read change:** added worker self-read — a user can read AuditLog where `actor_id === user.id` within their tenant. Managers retain tenant-wide read; platform admin sees all. Create/update/delete unchanged.

## Backend Functions Extended (1)

### auditEngine — enrichment only
Core logic (compliance gate, compliance→finance gateway, snapshot writer, action-type resolution) is **untouched**. Only the final `AuditLog.create` call adds `severity`, `category`, `event_source`, `link`, derived from the existing `action_type` / `module` / `entityName` via three pure helper functions (`resolveSeverity`, `resolveCategory`, `resolveLink`). Same events, richer metadata — zero new event generation.

## Frontend

### New Components
- `src/components/audit-centre/auditConfig.js` — shared config: module labels, severity config (icons + badge classes), category labels, shield-outcome styles, action/timestamp formatters. Single source of truth.
- `src/components/audit-centre/TimelineItem.jsx` — single timeline row; icon dot + connector, severity badge, shield badge, actor, module, relative time, deep-link affordance; keyboard-accessible (role=button, aria-label).
- `src/components/audit-centre/AuditDetailSheet.jsx` — right-hand Sheet drawer rendering every stored field (actor, role, tenant, module, category, severity, source, target entity/record, IP, related user/workflow, shield outcome, policy, override, justification, evidence attachments, previous/new state diff, deep link) — no source data duplication.

### New Page
- `src/pages/AuditCentre.jsx` — the unified Audit Centre:
  - **Timeline + Table toggle** (aria-pressed group).
  - **KPI strip** — events, critical, warnings, shield blocks, overrides, actors (StatCard).
  - **Filters** — keyword search, module, severity, category, shield outcome, tenant (admin only), date range, clear-all.
  - **Role-aware scope** — platform admin → cross-tenant + tenant dropdown; tenant users → their tenant; workers → own activity (RLS-enforced).
  - **Export** — CSV (all metadata) + Audit Bundle PDF (existing `auditBundleGenerator`, integrity hash).
  - **Realtime** — entity subscription invalidates query on new events (not polling).
  - **Pagination** — page-based with hasMore detection.
  - **Detail drawer** — AuditDetailSheet.
  - Loading skeleton + empty state.

### Pages Removed (superseded — consolidated to prevent duplicate rendering)
- `src/pages/AuditTrail.jsx` (tenant-scoped) — features ported (CSV, bundle export, detail, filters).
- `src/pages/platform/AuditLogPage.jsx` (platform-scoped) — features ported (cross-tenant, CSV).

### Routing
- New route: `/audit-centre` → AuditCentre.
- Redirects: `/audit-trail` → `/audit-centre`, `/platform/audit-logs` → `/audit-centre` (bookmarks preserved).

## Components Reused
PageHeader, StatCard, EmptyState, LoadingState, Card, Button, Input, Select, Skeleton, Sheet, useToast, useQuery + useQueryClient (TanStack), base44 SDK + realtime subscriptions, cn, useAuth, useTenant, lucide-react icons, jsPDF (dynamic import for bundle export).

## Services & Backend Functions Reused
- `auditEngine` (enriched, not duplicated)
- `auditBundleGenerator` (PDF bundle, unchanged)
- `AuditLog` entity (extended additively)
- `Tenant` entity (admin tenant filter)
- base44 realtime entity subscriptions

## Event Sources Reused (no new event generation)
- Existing entity automations on 11 high-value entities (SalesInvoice, PurchaseOrder, GoodsReceipt, ClockRecord, FoodSafetyLog, ComplianceRecord, MaterialCollection, ProductCatalog, DailyReconciliation, InventoryItem, ArtifactRecord) → `auditEngine` → `AuditLog`.
- Existing `shieldInterceptor`, `digitalSignature` writers continue to populate AuditLog (their records default severity `info` / category `operational` until their owning builds enrich them).

## RBAC Validation

| Role | Scope | Mechanism |
|------|-------|-----------|
| Platform Admin | All tenants | `user_condition: role=admin` (RLS) + cross-tenant tenant filter |
| Tenant Owner / Tenant Admin | Own tenant (all events) | `data.tenant_id === user.data.tenant_id` (RLS) |
| Outlet Manager | Own tenant (all events) | same RLS clause |
| Supervisor | Own tenant (all events) | same RLS clause |
| Worker | Own actions only | NEW: `data.tenant_id match AND data.actor_id === user.id` (RLS) |

RLS enforces scoping server-side; the frontend adds role-aware filter defaults for efficiency and UX. No client-side trust — the backend never returns unauthorized rows.

## Accessibility Validation (WCAG AA)

| Check | Status |
|-------|--------|
| Keyboard navigation | ✅ Timeline rows are buttons (Enter activates); table rows clickable; view toggle is aria-pressed group; selects/filters keyboard-operable |
| Screen readers | ✅ aria-label on search, filters, timeline rows, view toggle; sr-only labels on date inputs; semantic table headers |
| Focus management | ✅ Sheet (Radix) traps + restores focus; focus-visible rings via Tailwind |
| Colour contrast | ✅ Standard Tailwind palette (blue/emerald/amber/red 500/10 + 600 text) — AA compliant; severity/shield badges use 600 text |
| Reduced motion | ✅ Only hover transitions; no auto-playing animations |

## Responsive Validation

| Breakpoint | Layout |
|-----------|--------|
| Mobile (<640) | KPI 2-col; filters stack; timeline full-width; table horizontal-scroll; header buttons icon-only |
| Tablet (640-1024) | KPI 3-col; filters 2-row; timeline full-width |
| Desktop (1024+) | KPI 6-col; filters inline; timeline full-width |
| PWA standalone | ✅ Safe-area insets respected (global); no horizontal overflow on timeline |

## Performance Validation

| Metric | Status |
|--------|--------|
| Duplicate event generation | ✅ None — auditEngine is the only writer; same automations, enriched metadata |
| Duplicate storage | ✅ None — no new entity; AuditLog is the single record |
| Duplicate rendering | ✅ Eliminated — two legacy pages removed; one unified page |
| Unnecessary polling | ✅ None — react-query caching (no refetchInterval); realtime subscription invalidates on change |
| Query efficiency | ✅ Server-side filter (module/severity/category/outcome/tenant) + client-side search/date on the page |

## Files Created (6)
1. `src/components/audit-centre/auditConfig.js`
2. `src/components/audit-centre/TimelineItem.jsx`
3. `src/components/audit-centre/AuditDetailSheet.jsx`
4. `src/pages/AuditCentre.jsx`
5. `src/docs/knowledge-hub/decision-records/0054-global-activity-timeline-audit-centre.md`
6. `src/docs/knowledge-hub/implementation-notes/build-package-23-global-activity-timeline-audit-centre.md`

## Files Modified (2)
1. `base44/entities/AuditLog.jsonc` — 6 additive optional fields + worker self-read RLS
2. `base44/functions/auditEngine/entry.ts` — enrich AuditLog.create (severity, category, event_source, link) + 3 pure helpers
3. `src/App.jsx` — add AuditCentre route + import; redirect `/audit-trail` and `/platform/audit-logs`

## Files Deleted (2 — superseded)
1. `src/pages/AuditTrail.jsx`
2. `src/pages/platform/AuditLogPage.jsx`

## GitHub Commit Summary
```
Build #23: Global Activity Timeline & Audit Centre (ADR-0054)

- Extend AuditLog with additive metadata (severity, category, event_source,
  link, related_user_id, related_workflow) + worker self-read RLS
- Enrich auditEngine AuditLog.create with derived severity/category/source/link
  (same events, richer metadata — zero new generation)
- Build unified Audit Centre page: timeline + table toggle, KPI strip,
  comprehensive filters (module/severity/category/outcome/tenant/date/search),
  CSV + audit-bundle export, detail Sheet, realtime refresh
- Consolidate AuditTrail + AuditLogPage into AuditCentre (redirect legacy routes)
- Add auditConfig, TimelineItem, AuditDetailSheet components
- Prepare Orbit Nexus contract (queryable, no fabricated AI)
- ADR-0054 + build documentation
```

## Remaining Technical Debt
- Lifecycle/access/security event sources (tenant created, user invited, role changed, login, config changes) — arrive with their owning builds; schema + filters ready
- Enrich `shieldInterceptor` / `digitalSignature` AuditLog writes with severity/category (deferred to their owning builds)
- Orbit Nexus anomaly/trend analysis over AuditLog (future build — contract ready)
- Batch severity re-classification scheduled job (future Nexus build)
- Standalone `PlatformEvent` ledger — re-evaluate only if analytics demand it

## Updated MVP Completion: ~97%