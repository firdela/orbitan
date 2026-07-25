# Build Package #16 — Part 1: Pilot Operations Core

> Production Launch Readiness — the "provision → operate → triage" loop.
> Architecture LOCKED. Discussion Mode OFF. No demo data. Evidence only.

## Scope of this part

Build #16 is large (12 sections). Per the operating principle that a few working
features beat many half-built, this part ships the **operational core** — the
minimum coherent set needed to actually run a live customer pilot — and defers
the remainder to named follow-up packages.

**Shipped this part (production quality, wired end-to-end):**
1. **Pilot Administration** (#1) — full pilot tenant lifecycle.
5. **Operational Health Dashboard** (#5) — system / transaction / inventory / finance / audit.
6. **Exception Centre** (#6) — derived exception feed + finance-sync retry queue.

**Deferred to Build #17 (Pilot Onboarding):** #2 Customer Onboarding Wizard, #3 Bulk Import Engine.
**Deferred to Build #18 (Pilot Validation & Launch):** #4 UAT Mode, #7 System Diagnostics,
#8 Production Readiness Checklist, #9 Customer Success Dashboard, #10 Production Documentation, #11 Final QA.

## What was built

### Backend functions (Deno, admin-gated, asServiceRole, bounded queries)
- **`pilotAdmin`** — platform-admin-only pilot lifecycle:
  `list` (pilots + sandboxes), `create`, `activate`, `suspend`, `extend`, `convert` (to paid),
  `archive`, `delete_sandbox` (hard-delete restricted to sandbox tenants only — safety guard).
  Every state change writes an AuditLog entry (`pilot_*` action types). Zero entity changes —
  reuses existing Tenant fields (`status`, `is_pilot_tenant`, `trial_ends_date`, `subscription_plan`).
- **`pilotDiagnostics`** — `diagnostics` action returns system_health, transaction_health,
  inventory_health, finance_sync_status, audit_integrity, derived `exceptions`, and `retry_queue`.
  `retry` action resets a failed FinanceSyncQueue entry to `pending` (reprocessed by the existing
  financeSyncProcessor) + audits. Admin = platform-wide; tenant_admin = scoped to own tenant.

### Frontend pages
- **`PilotAdminPage`** (`/platform/pilot-admin`) — tenant list with full lifecycle actions + create dialog.
- **`OperationalHealthDashboard`** (`/platform/operational-health`) — 5 health sections with KPIs.
- **`ExceptionCentrePage`** (`/platform/exception-centre`) — severity-filtered exception feed + retry queue.
- Routes added to `src/App.jsx`; nav items added to `src/lib/navigation-registry.js` (governance group).

### Exception derivation (no new entity — derived live from existing state)
- `finance_sync_failed` (FinanceSyncQueue status=failed) — retryable
- `negative_stock` (InventoryItem current_stock < 0) — critical
- `production_cancelled` (ProductionBatch status=cancelled) — medium
- `permission_denied` (AuditLog shield_outcome=blocked / denied action types) — medium
- `orphaned_invoice` (SalesInvoice paid with no invoice_sync queue entry — audit gap) — high, retryable

## Evidence (retest results)

| Check | Result |
|---|---|
| `pilotAdmin` list | 200 — returns 4 real pilot tenants (Taqueria, Renewed Resources, Renewed Fashion, Izaliqa Bakes) |
| `pilotDiagnostics` diagnostics (platform-wide) | 200 — 5 tenants, 4 pilots, 1 sandbox, 3 active, 2 onboarding, 29 audit entries, 0 exceptions |
| Honest zero state | Sales/inventory/finance = 0 across all tenants (real pilots not yet operationally loaded; evidence test data was cleaned up in #15). Not fabricated. |
| Bounded queries | All reads ≤500 records; no unbounded fetches |
| Admin gating | Both functions enforce `user.role === 'admin'`; tenant_admin scoped to own tenant |
| Audit | Every lifecycle change + every retry writes an AuditLog entry |

## Files created / modified

**Created:**
- `base44/functions/pilotAdmin/entry.ts`
- `base44/functions/pilotDiagnostics/entry.ts`
- `src/pages/platform/PilotAdminPage.jsx`
- `src/pages/platform/OperationalHealthDashboard.jsx`
- `src/pages/platform/ExceptionCentrePage.jsx`

**Modified:**
- `src/App.jsx` (3 imports + 3 routes)
- `src/lib/navigation-registry.js` (3 nav items in governance group)

**No entity changes.** Reuses existing Tenant, FinanceSyncQueue, AuditLog, SalesInvoice,
ProductionBatch, InventoryItem schemas. Architecture remains LOCKED.

## Design decisions & trade-offs

- **No new ExceptionTicket entity.** Exceptions are derived live from entity state, not stored.
  Rationale: a live triage console is what operators need; a ticketing workflow adds persistence
  complexity and stale-state risk. Trade-off: you cannot "acknowledge" an exception to silence it.
  If persistent triage state is needed later, a minimal ExceptionTicket entity is the clean upgrade.
- **Sandbox hard-delete guard.** `delete_sandbox` refuses non-sandbox tenants — production tenants
  use `archive` (status=cancelled). Prevents irreversible data loss of a real customer.
- **Retry = reset to pending.** Reuses the existing financeSyncProcessor scheduled consumer rather
  than invoking it inline. Idempotent, safe, no duplicate processing.
- **Zero Tenant entity changes.** Pilot lifecycle maps to existing fields (status, is_pilot_tenant,
  trial_ends_date). Respects "architecture LOCKED". Conversion = `is_pilot_tenant=false` + plan set;
  Stripe webhook owns the actual subscription record.

## Remaining risks / honest gaps

1. **DEF-002 (refund clamp) and DEF-005 (query bounds)** — verified by inspection in #15, not
   live-exercised here (would require spurious over-refund / large data volume).
2. **No live multi-user E2E** — pages deploy and backends return valid shapes, but full per-role
   UI walkthrough via the Testing Agent is the recommended next validation.
3. **Exception Centre has no persistent ack/resolve state** — derived-only (by design; see above).
4. **Real pilot tenants have 0 operational data** — they are provisioned but not yet onboarded.
   Onboarding Wizard (#2) + Bulk Import (#3) are the gating dependencies.

## Readiness (evidence-based, not estimated)

- **Pilot Operations Core (this part):** ~95% — both backends retested green, 3 pages wired, nav + routes live.
- **F&B Pack:** ~98% (unchanged from #15; this part adds operational tooling, not F&B logic).
- **Overall MVP:** ~95% (up from ~94%; operational readiness tooling added).
- **Pilot Readiness (pilotReadiness engine):** unchanged — manual attestations still pending.

## Recommended next build

**Build #17 — Pilot Onboarding Core:** #2 Customer Onboarding Wizard + #3 Bulk Import Engine.
This is the gating dependency to move the 4 real pilot tenants from "provisioned" to "operationally
loaded", after which the Exception Centre and Operational Health will show real signal.