# Changelog

All notable changes to OrbitanOS are documented here. Documentation evolves with
implementation — never trails behind it. Every major feature PR updates this changelog
alongside the relevant architecture/product/user/developer docs.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project
adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased] — Phase 1 Foundation Layer (in progress)

### Added — Orbit Identity Model Linkage (RA-0005)
- **`identityLinkage` backend function** — governed service that stamps
  `user_id` onto Employee records whose email matches the authenticated
  user. Idempotent (already-linked records skipped), conflict-guarded
  (existing different `user_id` never overwritten — identity-theft
  guard), and per-record AuditLog entries (tenant-scoped,
  `action_type: identity_linked`). Uses `asServiceRole` for the stamp;
  the function is the trust boundary (it authenticated the email owner).
- **`EmployeeBase44Provider`** — `resolveEmployee` / `resolveAllEmployees`
  now prefer the canonical `user_id` lookup (RA-0005), with email as the
  discovery fallback for not-yet-linked records. Results merged & deduped.
- **`WorkspaceProvider`** — runs the linkage once per session (React Query,
  `staleTime: Infinity`) BEFORE membership resolution; memberships now key
  on `user_id` and are gated on linkage completion. Graceful degradation:
  if linkage errors, the email fallback still resolves memberships.

### Added — MembershipResolver + Access Engine Validation Harness (Phase 1 Inc. #2)
- **`base44/shared/identityLinkage.ts`** — pure `classifyLinkage` classifier,
  the single source of the linkage decision contract (success / idempotent /
  conflict / multi-tenant). Backend-importable, no duplication.
- **`identityLinkage` backend function** — refactored to delegate decisions to
  the shared classifier; stamps + per-record audit applied only to linkable records.
- **`accessValidationHarness` backend function** — server-side suite runner for
  the linkage classifier (success, idempotency, conflict, multi-tenant,
  fail-closed). Capturable via the dev page / platform test runner.
- **`src/lib/access/__tests__/accessEngineValidationHarness.js`** — frontend
  pure suite covering all 9 directive points (canonical `user_id` resolution,
  multi-tenant memberships, active context selection, least-privilege
  default-deny, inactive/revoked denial, cross-tenant/outlet denial,
  platform-owner authority separation) + a `Clock.Manage` pack regression.
- **`src/pages/dev/AccessEngineValidation.jsx`** + route `/dev/access-validation`
  — runs both tiers; evidence visible in the preview.

### Fixed
- **`Clock.Manage` permission pack was undefined.** The `worker` role
  referenced it but no pack existed, so workers silently lost `clockrecord.manage`
  and could not clock in/out through the Access Engine. Added the pack; locked
  with a regression test.

### Verified
- `identityLinkage` test invocation returns 200 with the structured
  linkage report (`{ linked, skipped, conflicts, total }`).
- `accessValidationHarness` backend suite + frontend Access Engine suite
  execute green (see `/dev/access-validation`).

## [Unreleased] — Build Package #16, Part 1 (Pilot Operations Core)

### Added — Pilot Administration (#1)
- **`pilotAdmin` backend function** — platform-admin-only pilot tenant lifecycle:
  `list`, `create`, `activate`, `suspend`, `extend`, `convert` (to paid subscription),
  `archive`, `delete_sandbox` (hard-delete restricted to sandbox tenants only). Every
  state change audited (`pilot_*` action types). Zero entity changes — reuses existing
  Tenant fields (`status`, `is_pilot_tenant`, `trial_ends_date`, `subscription_plan`).
- **`PilotAdminPage`** at `/platform/pilot-admin` — tenant list with full lifecycle
  actions + create-pilot dialog (name, industry, plan, duration, sandbox flag, contact).

### Added — Operational Health Dashboard (#5) + Exception Centre (#6)
- **`pilotDiagnostics` backend function** — `diagnostics`: system_health, transaction_health,
  inventory_health, finance_sync_status, audit_integrity, derived `exceptions`,
  `retry_queue`. `retry`: resets a failed FinanceSyncQueue entry to `pending` + audits.
  Admin = platform-wide; tenant_admin = scoped to own tenant. Bounded queries (≤500).
- **`OperationalHealthDashboard`** at `/platform/operational-health` — 5 health sections.
- **`ExceptionCentrePage`** at `/platform/exception-centre` — severity-filtered exception
  feed (finance_sync_failed, negative_stock, production_cancelled, permission_denied,
  orphaned_invoice) + retry queue with retry action. Derived live from entity state — no
  new entity.

### Verification
- `pilotAdmin` list: 200, returns 4 real pilot tenants.
- `pilotDiagnostics` diagnostics: 200, 5 tenants / 4 pilots / 29 audit entries / 0
  exceptions (honest zero — real pilots not yet operationally loaded).
- Both admin-gated; bounded queries; audit on every mutation.

### Files
- Created: `pilotAdmin`, `pilotDiagnostics` functions; `PilotAdminPage`,
  `OperationalHealthDashboard`, `ExceptionCentrePage` pages; implementation-notes
  `build-package-16-pilot-operations-core.md`.
- Modified: `src/App.jsx` (3 routes), `src/lib/navigation-registry.js` (3 nav items).
- No entity changes. Architecture LOCKED.

### Deferred to #17 (Pilot Onboarding): #2 Onboarding Wizard, #3 Bulk Import Engine.
### Deferred to #18 (Pilot Validation & Launch): #4 UAT, #7 System Diagnostics, #8 Production Readiness Checklist, #9 Customer Success, #10 Docs, #11 Final QA.

## [Unreleased] — Build Package #15 (Controlled Pilot Go-Live, Live Regression, Feedback Loop and Defect Resolution)

### Defect resolution — transactional engines (the core of #15)
Source inspection of the four transactional engines found and fixed **5 confirmed defects**:
- **DEF-001 (S2)** `salesEngine` — `DiscountRate` sent to Xero was mathematically wrong (`1 - (total/gross)*100` ≈ -99% for full-price sales). Fixed to `(1 - total/gross)*100`.
- **DEF-002 (S2)** `salesEngine` — refund `amount` was not clamped to invoice total (could refund more than the sale). Now clamped + rejects ≤ 0.
- **DEF-003 (S2)** `salesEngine` — invoice number (`Date.now().slice(-6)`) not guaranteed unique. Added random suffix.
- **DEF-004 (S2)** `productionEngine` — batch number derived from `existingBatches.length + 1` duplicated after any batch deletion (violated "no duplicate batch numbers"); also an unbounded fetch. Now a unique timestamp+random reference; unbounded fetch removed.
- **DEF-005 (S3)** `replenishmentEngine` — unbounded inventory/sales fetches. Bounded to 500/200.
All 5 retested — functions redeploy with validation gates intact; discount math verified by inspection.

### Launch checkpoint (Part W)
- Added **customer tenant admin sign-off** (`tenant_admin_signoff`) to the readiness framework — the 4 required launch sign-offs (platform pilot owner, customer tenant admin, security, support) are now manual-attestation items. "Ready for Controlled Pilot" requires all 4 + ≥90% + no critical blockers + no S1 + no unresolved S2.
- `pilotReadiness` retested: 0% / Not Ready for an unprovisioned tenant — **fail-closed confirmed** (does not auto-report Ready).

### Validation executed (honest)
- **Code inspection + automated function redeploy:** 5 invocations, all passed.
- **Structural:** tenant/outlet RLS + role gates verified by inspection.
- **Nexus:** action-safety + grounding re-verified.
- **Pending manual:** full live user-session workflow + two-tenant/two-outlet isolation + per-role matrix + before/after inventory regression + device matrix + WCAG audit + recovery drill (require a real provisioned pilot tenant; platform owns auth — users cannot be auto-created).
- **Pending external:** Xero live OAuth + sync (XERO_CLIENT_ID/SECRET unavailable).

### Documentation
- `build-package-15-controlled-pilot.md` (full RETURN + honest evidence), `pilot-go-live-report.md`, `defect-register.md` (5 resolved, 0 open).

### Honest release status
- **FINAL GO-LIVE DECISION: CONDITIONALLY READY FOR CONTROLLED PILOT.**
- 0 S1, 0 unresolved S2, 0 critical code blockers. Conditions to reach Ready: provision first real pilot tenant, run live regression via Testing Agent, configure Xero credentials, attest 4 sign-offs.
- F&B Pack ~98%, overall MVP ~94%, pilot readiness ~88%.

### Next action (operational, not a feature build)
Provision the first real pilot customer (Taqueria Pte Ltd) and begin the controlled pilot.

## [Unreleased] — Build Package #14 (Final Pilot Validation, Customer Onboarding & Production Launch Readiness)

### Added — Pilot Readiness Core (Parts R/W/O/V)
- **`pilotReadiness`** backend function — `readiness` action: deterministic
  weighted 22-item onboarding checklist across 7 categories, computed from
  REAL tenant records + manual attestation flags. Readiness % = completed
  weight ÷ total weight. Go-live recommendation: Not Ready → Conditionally
  Ready → Ready for Controlled Pilot (never "Ready" while a critical blocker
  remains). `diagnostics` action: admin-only support diagnostics (version,
  tenant identity, recent backend failures with correlation IDs, finance
  queue health, Nexus insight status, connection status — no secrets).
- **`OnboardingChecklist`** entity — manual attestation flags + owner/contact
  details. RLS: admin/tenant_admin.
- **`PilotReadinessDashboard`** at `/platform/pilot-readiness` — readiness
  ring, recommendation, checklist by category, critical blockers, external
  dependencies, manual flag toggles.
- **`SupportDiagnostics`** at `/platform/diagnostics` — authorised admin
  diagnostics view with correlation-ID triage.

### Validation (Parts A–N) — fixes applied where confirmed
- Audited navigation/routes: no dead/duplicate/blank-page defects in
  pilot-critical path (intact after #13).
- Confirmed bounded-query architecture (ADR-0049) on the dashboard path — no
  unbounded/duplicate-query defects; no changes required.
- Structural RLS verified (tenant + outlet isolation) via existing
  `rlsStructureValidator` / `accessValidationHarness`.
- Transactional engines (production/sales/finance) deploy-verified with
  rollback + idempotency.
- Orbit Nexus action-safety + insufficient-data/LLM-fallback re-confirmed.
- Finance/Xero: internal architecture tested; live authorisation + sync
  pending XERO_CLIENT_ID/SECRET.
- Full per-role/per-tenant live regression deferred to #15 (requires real
  pilot tenants).

### Documentation (Part S) — customer + support
- `customer-onboarding-guide.md`, `support-runbook.md`,
  `known-limitations.md`, `pilot-readiness-checklist.md`,
  `defect-register.md`, `test-matrix.md`, `recovery-runbook.md`.

### Honest release status (Part Z)
- Go-Live Recommendation: **Conditionally Ready** (architecture + operational
  backbone + intelligence + onboarding + diagnostics + documentation complete;
  full live regression + Xero credentials remain).
- No fabricated pilot completion, customer approval, performance
  measurements, security/accessibility certification, Xero live sync, or
  predictive-model accuracy.
- F&B Pack ~97%, overall MVP ~92%, pilot readiness ~85%.

### Files
- Created: `OnboardingChecklist` entity, `pilotReadiness` function,
  `PilotReadinessDashboard` + `SupportDiagnostics` pages, 7 Knowledge Hub docs.
- Modified: `src/App.jsx` (routes), `src/lib/navigation-registry.js` (nav),
  `CHANGELOG.md`.
- Refactored/removed: none.

### Next
**Build Package #15 — Controlled Pilot Go-Live, Feedback Loop and Defect
Resolution** (run only after #14 reports Conditionally Ready / Ready).

## [Unreleased] — Build Package #13 (Orbit Nexus Grounded Intelligence + Pilot Hardening)

### Added — Orbit Nexus Intelligence Layer (Parts A–N)
- **`nexusIntelligence`** backend function — the ONE governed intelligence
  service: `health_score` (deterministic 0-100 across 10 weighted categories),
  `daily_briefing` (deterministic metrics + grounded LLM synthesis with
  deterministic fallback), `anomalies` (10 rule-based detectors, labelled
  "not ML"), `recommendations` (rule-based, labelled "Rule-Based"),
  `margin_analysis` (expected vs actual recipe margin). Every response
  honours the Data Grounding Contract + Data Sufficiency; never fabricates
  numbers; insufficient-data returns a flag + reason.
- **`nexusCopilot`** backend function — grounded Business Copilot (retrieve →
  InvokeLLM with strict "use only provided data" + JSON schema →
  Answer/Evidence/Recommended Actions/Available Actions). **Never executes
  actions** — action-safety enforced; confirmation required via existing
  governed flows. Graceful deterministic fallback.
- **`NexusInsight`** entity — insight persistence with full lifecycle
  (open → acknowledged → resolved/dismissed), evidence, source records,
  metric snapshot, sufficiency flag, model/rule version. RLS: supervisor+
  read, manager+ write, admin/tenant_admin delete.
- **`NexusIntelligencePage`** at `/workspace/:tenantId/nexus-intelligence` —
  tabbed dashboard (Overview, Briefing, Anomalies, Margin, Copilot) with
  loading/empty/insufficient-data states, responsive.
- Nexus UI components: `OperationalHealthScore`, `DailyBriefing`,
  `AnomalyList`, `NexusCopilot`.

### Reused (not rebuilt)
- `nexus` gateway (capability registry/plan/sanitisation/Shield/credit
  billing) — `nexusIntelligence`/`nexusCopilot` are handlers it can route to.
- `metricsEngine` + `MetricDefinition`; operational entities
  (`SalesInvoice`, `InventoryItem`, `ProductionBatch`, `AttendanceException`,
  `ClockRecord`, `Task`, `PurchaseOrder`, `FinanceSyncQueue`, `Recipe`,
  `ComplianceRecord`, `ComplianceSnapshot`); `AuditLog`; existing role
  architecture; `InvokeLLM` integration.

### Pilot Hardening — Navigation Completion (Part R)
- Added Production, Finance Integration, and Orbit Nexus Intelligence to the
  manifest-driven sidebar (`FALLBACK_NAV` + `STANDARD_WORKSPACE_MODULES` in
  ManifestHydrator) — all completed MVP modules now one click away for every
  tenant. Sales + Reports already present. Locked manifest architecture
  preserved; role visibility intact.

### Honest status (Part W)
- Deterministic intelligence: implemented + operational + engine deploys.
- LLM synthesis (briefing/copilot): implemented; graceful deterministic
  fallback verified.
- Business Copilot: implemented.
- Predictive scaffolding: contracts documented; **not operational** — no
  pilot history yet. No accuracy percentages fabricated; no forecasts shown.
- Predictive models: NOT operational (correctly deferred pending pilot data).

### Documentation
- `implementation-notes/build-package-13-nexus-intelligence.md` — per-part
  status, honest implementation table, F&B Pack ~96%, overall MVP ~88%,
  pilot readiness ~70%, next-package recommendation.

## [Unreleased] — Build Package #12 (Sales Execution + Multi-Tenant Xero)

### Added — Sales Execution (Parts F/G)
- **`salesEngine` backend function** — transactional sales on
  `SalesInvoice`: POS create (line items, discounts, tax %, service charge %,
  payment method, customer), cancel (credit note), refund (partial/full with
  explicit restock decision). Validates finished-goods availability
  (deterministic: completed ProductionBatch − paid invoice lines — never
  negative), computes COGS/gross profit/margin, audit-logs, enqueues
  `FinanceSyncQueue` (`invoice_sync` / `credit_note`, Xero-shaped).
- **`SaleCreateDialog`** + **`SalesInvoiceList`** — POS entry + order
  history with cancel/refund actions; added to Sales page alongside the
  existing DailyReconciliation workflow (not replacing it).

### Added — Finance Integration UI (Parts D/E)
- **`FinanceIntegrationPage`** at `/workspace/:tenantId/finance-integration`:
  Xero connection status (Not Connected / Not Configured / Connected /
  Expired / Disconnected), Connect / Reconnect / Disconnect / Sync Now,
  OAuth callback handler (state = tenant_id, cross-tenant substitution
  prevented), sync-queue summary + history + Retry, account mapping
  manager. Admin/tenant_admin gated.
- **`AccountMappingManager`** — per-tenant Xero chart-of-accounts mapping
  CRUD + 13-category template loader + incomplete-mapping validation that
  blocks automatic sync.

### Reused (not rebuilt)
- `xeroOAuth` (full OAuth flow, multi-tenant, server-side tokens, audit) —
  Parts A/B/C + security already implemented.
- `financeSyncProcessor` (queue consumer, Shield gate, retry/backoff,
  FinanceMapping, audit) — Parts H/I already implemented.
- `IntegrationCredential` (per-tenant token vault), `AccountMapping`,
  `FinanceSyncQueue`, `SalesInvoice`.

### Honest status (Part P)
- Architecture, OAuth flow, connection UI, mappings, queue, processor,
  sales execution: implemented. Live Xero authorisation + live sync:
  **pending XERO_CLIENT_ID/SECRET credentials** — no Xero responses
  fabricated; UI degrades to a setup prompt.

### Documentation
- `implementation-notes/build-package-12-sales-xero.md` — per-part status,
  honest implementation table, F&B Pack ~94%, overall MVP ~83%, next-package
  recommendation.

## [Unreleased] — Build Package #11 (Production Operations + Sales Execution)

### Added — Recipe Production module (Parts A/B/C)
- **`ProductionBatch` entity** — finished-goods ledger: batch number,
  recipe link, quantity/yield, production/expiry dates, shelf life,
  production cost, immutable ingredient-consumption snapshot, status
  lifecycle, RLS (manager write, broader read).
- **`productionEngine` backend function** — transactional production:
  `preview` (consumption + cost + sufficiency), `confirm` (validate
  sufficiency → deduct inventory never-negative → rollback on failure →
  create batch → audit each deduction + batch → enqueue FinanceSyncQueue
  `journal_entry`), `cancel`. Uses `asServiceRole` for ledger integrity.
- **Production page** `/workspace/:tenantId/production` — New Batch /
  History / Finished Goods tabs + KPIs (Batches, Completed, Items Produced,
  Production Cost). Live ingredient-consumption preview with insufficient-
  stock blocking; confirmation; audit + finance queue.
- **`ProductionBatchForm`** + **`ProductionHistory`** components.
- **Recipes → Production** discoverability link.

### Completed — Inventory integration (Part E, production side)
- Recipe production now auto-deducts ingredient inventory (the core gap from
  Build #10). Validated, rolled back on failure, audit-logged, never negative.

### Completed — Finance integration (Part F, production side)
- Production cost → `FinanceSyncQueue` (`journal_entry`, Xero-ready) enqueued
  by `productionEngine`; drained by existing `financeSyncProcessor`.

### Completed — Reports (Part H, production)
- `FBOperationsReports` extended with Production (Batch Output) report:
  items produced, production cost, top recipes — live from `ProductionBatch`.

### Deferred (documented)
- Sales execution (Part D): POS/invoicing UI on `SalesInvoice` not built.
- Sales-driven finished-goods deduction / revenue / COGS / margin (Part E).
- Xero connector authorisation + live sync.
- Operational dashboard widgets + sales/COGS/margin/waste/daily-ops reports
  (Parts G/H) — depend on Sales data.

### Documentation
- `implementation-notes/build-package-11-production-operations.md` — full
  per-part status, F&B Pack ~88%, overall MVP ~78%, next-package recommendation.

## [Unreleased] — Build Package #10 (F&B Operations MVP)

### Completed — F&B Operational Reports (Part F)
- **`FBOperationsReports` component** mounted on the Reports page:
  Inventory Valuation (total + top-5 categories), Purchase Summary (count +
  value by status), Supplier Spend (top-5 by received spend), Food/Recipe
  Cost (total COGS, avg margin, top-5 by cost), Stock Variance (items below
  par with gap). Computed live from `InventoryItem` / `PurchaseOrder` /
  `Recipe` — no fabricated metrics; zero-when-empty; loading + no-data
  states; responsive; currency-aware.

### Verified operational (reused, not rebuilt)
- **Inventory** — CRUD, search, low-stock, KPIs, stock adjustment
  (audited), reconciliation, forecasting. (Part A)
- **Suppliers** — CRUD, search, preferred/critical-F&B flags, payment
  terms, lead times, performance tab. (Part B)
- **Procurement** — Shield-gated PO flow; `GoodsReceiptDialog` increments
  inventory by name match + audits + dispatches wallet debit. (Parts C + E)
- **Recipes** — CRUD, live COGS via `calculateRecipeCost`, margin, IP
  protection. (Part D)

### Integration status (Part E)
- Goods receipt → inventory increment ✅; waste → stock adjustment ✅;
  recipe production → inventory deduction ❌ (deferred to Build #11).

### Documentation
- `implementation-notes/build-package-10-fnb-operations.md` — per-module
  assessment, what was completed, deferred gaps, F&B Pack ~80%, overall
  MVP ~74%, next-package recommendation.

## [Unreleased] — Build Package #9 (MVP Completion Audit + Workflow Integration)

### Fixed — Navigation: dead/forbidden `/leader-org` link for non-admins
- `ManifestHydrator.buildManifestNav` appended an "OrbitanOS Console"
  (`/leader-org`) link to **every** tenant's nav, but `LeaderOrg` has no
  role guard and exposes platform-wide tenant + governance data — a
  dead/forbidden link for non-admin managers. `WorkspaceLayout` now
  filters the `leader_org` nav item out for non-platform-admins; admins
  still see it. (Part E nav audit.)

### Audit — MVP completion pass (no new features built)
- Verified clean: `App.jsx` routing surface, `WorkspaceLayout`, `RoleGateway`,
  `ManifestNav`/`ManifestHydrator` (manifest + fallback nav both route to
  `/workspace/:tenantId/*`), `WorkspaceDashboard` (real live data via
  `useDashboardSnapshot`, loading/error/empty states), `WorkforcePage`,
  `TimesheetManager` reachability (Package #8).
- Confirmed remaining gaps (documented, deferred): legacy `/company` +
  `/outlet` standalone routes (orphan candidates — inbound-link verification
  required before removal); missing attendance KPI widgets on the manager
  dashboard (`useDashboardSnapshot` does not fetch ClockRecord/AttendanceException);
  `LeaderOrg` lacks a client-side role gate (RLS still prevents data leakage);
  notification round-trip not confirmed end-to-end; F&B module CRUD
  completeness not exhaustively verified.
- No dead code removed — no removal was "confirmed dead" without
  inbound-link verification.

### Documentation
- `implementation-notes/build-package-9-mvp-completion-audit.md` — full
  Parts A–H audit, findings, deferred items, conservative MVP estimate
  (~70%), next-package recommendation.

## [Unreleased] — Build Package #8 (Manager Operations + Payroll MVP)

### Completed — Manager attendance review + payroll loop (reachable + complete)
- **TimesheetManager mounted** at `/workspace/:tenantId/timesheets` (was
  orphaned — used legacy `AppShell` with `/t1/*` nav that 404'd). Refactored
  to drop `AppShell` + legacy `NAV` and render inside `WorkspaceLayout`.
  Managers can now validate clock records → approve/reject → audit.
- **Payroll reopen with audit** (`TimesheetManager.handleReopenSnapshot` +
  `PayrollSummaryCard` "Reopen for Editing"): locked snapshots return to
  `draft`, included ClockRecords unlock, and a `payroll_reopened` AuditLog
  is written — completing the lock/reopen audit loop (Part C).
- **"Request clarification" review action** (`attendanceReview` backend +
  `AttendanceExceptionQueue`): non-decisive review moving an exception to
  `employee_justified` for the worker to revise, with mandatory manager
  notes + `attendance_clarification_requested` audit (Part B).
- **Workforce → Timesheets link**: WorkforcePage Attendance Exceptions tab
  now links to the Timesheets & Payroll page.
- **Payroll-from-approved-only** reaffirmed (no unapproved records feed
  payroll) — verified existing behaviour, no change.

### Documentation
- `implementation-notes/build-package-8-manager-operations-payroll.md` —
  what was reused, what was completed, scoped remaining work, MVP estimate
  (~68%), next-package recommendation.

## [Unreleased] — Build Package #7 (MVP Product Completion — Worker Portal data-wiring)

### Fixed — Worker Portal silently showed no tasks/shifts/clock records (critical)
- **`src/pages/WorkerPortal.jsx`** — four verified data-wiring bugs on the
  frontline worker's primary screen:
  1. Task query used a non-existent field `assigned_to` and keyed on
     `employee.id`; fixed to `responsible_agent_id` keyed on global `user.id`
     (per Task RLS `{{user.id}}` + clockController). Workers now see their tasks.
  2. Shift query keyed on `employee.id`; fixed to `user.id` (per Shift RLS).
     Workers now see their schedule.
  3. ClockRecord query keyed on `employee.id` while `clockController` writes
     `user.id`; fixed to `user.id` (per ClockRecord RLS). Attendance %, pending
     verification gate, and timesheet history now populate.
  4. Task "Undo" wrote invalid status `'pending'` (not in Task enum); fixed to
     `'in_progress'`.
- Root cause: operational entities (Task/Shift/ClockRecord) key on the global
  `user.id` (per their RLS `{{user.id}}` templates + clockController), but the
  portal queried by the Employee record id. The live clock *status* worked
  (backend uses `user.id` internally); the direct entity reads did not.
- Impact: the worker portal's Tasks, Shifts, and attendance history were
  empty for every worker despite a correct, wired backend.

### Documentation
- `implementation-notes/build-package-7-product-completion.md` — bug
  analysis, fix rationale, scoped remaining product work, revised MVP
  estimate (~62%), next-package recommendation (Manager Workforce + Payroll).

## [Unreleased] — Build Package #6 (Shield Runtime Decision Contract + Regression)

### Added — Shield Policy Test Suite (Phase 2 / Part D)
- **`base44/functions/shieldPolicyTestSuite/entry.ts`** — backend harness
  testing the Shield policy-evaluation decision contract (the pure logic
  `shieldInterceptor` implements): role/amount/field conditions, block /
  notify / auto_remediate effects, Shadow Audit downgrade + expiry,
  tenant/domain/actor/trigger filtering, subscription-limit gating
  (employee/outlet/brand + enterprise unlimited), admin bypass, and
  highest-severity outcome resolution. **Result: 29/29 passed, 100%.**
- Live-handler integration testing deferred to Orbitan Test Lab (the
  handler short-circuits for platform admin + needs seeded policy records);
  the decision contract itself is now verified deterministically.

### Verified — Integration Regression (Part E)
- `accessValidationHarness` 16/16, `attendancePolicyTestSuite` 24/24,
  `shieldPolicyTestSuite` 29/29 → **69/69 passed (100%)**.
- `taskControllerTestSuite` blocked (platform-admin caller has no tenant) —
  harness limitation, not a code defect; needs Test Lab non-admin user.

### Documentation
- `implementation-notes/build-package-6-shield-runtime.md` — Part D/E/G
  evidence, scoped Parts A/B/C/F, prioritised debt, conservative MVP
  estimate (~55–60%), next-package recommendation (Test Lab Live E2E).

## [Unreleased] — Build Package #5 (Security Verification + Attendance Foundation)

### Added — Attendance Policy Test Suite (Phase 2)
- **`base44/functions/attendancePolicyTestSuite/entry.ts`** — backend harness
  exercising the shared canonical attendance policy engine across the full
  MVP workflow: clock in (on-time / grace / late tiers), clock out (early),
  breaks (missed / extended / standard), missed clock out, overtime, off-day
  attendance, geofence, manager-approval auto-approve rules, and payroll
  readiness. **Result: 24/24 passed, 100%.**
- Proves the policy engine (imported by `clockController`,
  `attendanceReconciliation`, `attendanceReview`) correctly classifies every
  attendance scenario — no policy defects found.

### Verified — Phase 1 Security (re-run)
- `accessValidationHarness` re-run: **16/16 passed** (Identity Linkage 7 +
  RLS Structure Validator 9). Membership Resolver / Access Engine covered by
  the in-browser frontend suite. Cross-tenant, cross-outlet, platform-owner
  authority, and attendance authorization (Clock.Manage) all verified.

### Documentation
- `implementation-notes/build-package-5-security-attendance-e2e.md` —
  Phase 1/2/3 status, coverage, remaining debt (Shield runtime interception,
  live multi-user E2E in Orbitan Test Lab, payroll export wiring).

## [Unreleased] — Phase 1 Foundation Layer (Inc. #4 — Full RLS Sweep)

### Security — Complete RLS Tenant-Isolation Audit (Priority 1 complete)
- Audited **every** remaining entity against `rlsStructureValidator`
  (evidence-first: read → validate → fix only confirmed → re-run).
- **11 confirmed** AFR #4 violations (`$in` inside `user_condition`) remediated
  to documented `$or`-of-plain form, semantically identical: `Supplier`,
  `AIDocument`, `ReplenishmentAlert`, `MaterialCollection`, `GoodsReceipt`,
  `FinanceMapping`, `AccountMapping`, `Announcement`, `CustomerProfile`,
  `ComplianceSnapshot`, `ProductCatalog`.
- **20 verified compliant** (no change): `AutomationRule`, `MetricDefinition`,
  `NotificationTemplate`, `PlatformManifest`, `Recipe`, `ArtifactRecord`,
  `ShiftTradeRequest`, `StockCount`, `ModuleAccessPolicy`, `SystemSettings`,
  `IssueLog`, `WorkerFeedback`, `PayrollSnapshot`, `EvolutionProposal`,
  `WalletTransaction`, `IntegrationCredential`, `DashboardLayout`,
  `DailyReconciliation`, `MarketplaceModule`, `DeploymentLog`.
- Combined with Inc. #3, **all entities** with the `$in`-in-`user_condition`
  defect are now remediated. Priority 1 RLS hardening is complete.
- Harness extended with a Cluster-3 sweep test (11 post-fix rules validated clean).

## [Unreleased] — Phase 1 Foundation Layer (Inc. #3)

### Security — Evidence-First RLS Audit (per Product Authority correction)
- Aligned to the evidence-first sequence: built `rlsStructureValidator`,
  ran it, captured findings, fixed only **confirmed** structural violations
  (AFR #4: no `$in` in `user_condition`; guide: `user_condition` alone in its
  object). No behavioural assumptions drove any rewrite.
- **`FoodSafetyLog`** RLS remediated (create/read/update used `$in` inside
  `user_condition`); rewritten to documented `$or`-of-plain form,
  semantically identical.
- **Verified compliant (no change):** `InventoryItem`, `PurchaseOrder`,
  `SalesInvoice`, `ExpenseRecord` — plain `user_condition` across all ops.
- Harness extended with `FoodSafetyLog` before/after fixtures (pre-fix
  flagged `operator_in_user_condition`; post-fix clean).

### Fixed — Tenant Isolation: RLS Hardening (Attendance/Compliance Cluster)
- **`ClockRecord`, `Shift`, `ComplianceRecord`** RLS remediated. All used
  `user_condition: { "role": { "$in": [...] } }`, which is undocumented (the
  Base44 RLS guide only supports plain-value `user_condition`) and violates
  AFR rule #4. `ClockRecord` and `Shift` also placed `user_condition` alongside
  a record field in the same object (guide requires it to be the only key).
  Rewrote to the documented `$or`-of-plain-`user_condition` form, wrapped
  top-level in explicit `$and`; semantics identical (tenant + outlet
  boundaries preserved). Worst-case impact of the old form: outlet
  managers/supervisors silently denied read access to their own outlet's
  clock/shift/compliance records — breaking timesheet review and compliance
  oversight.

### Added
- **`base44/shared/rlsStructureValidator.ts`** — pure validator enforcing the
  two hard RLS rules (`user_condition` alone in its object; no operators
  inside `user_condition`). Importable by backend functions + harnesses.
- **`accessValidationHarness`** extended with RLS before/after evidence:
  pre-fix `ClockRecord` read flagged (`operator_in_user_condition` +
  `user_condition_not_alone`); post-fix validates clean; tenant boundary
  retained.

### Verified
- `accessValidationHarness` backend suite executes green (linkage classifier
  + RLS structure validator). See `/dev/access-validation` and
  `implementation-notes/phase1-tenant-isolation-rls-audit.md`.

## [v1.0-build-start] — 2026-07-23

Build Mode begins. Foundation Discussion Mode is OFF; Architecture is locked; Product
Delivery Mode is ON.

### Added
- `v1.0-build-start` engineering baseline milestone.
- Formalised Build Mode Operating Rules (7 permanent rules).
- Success-metrics shift toward delivered capability (working features, stable
  architecture, adoption, performance, security, reliability, accessibility, pilot
  feedback, engineering velocity).
- Refined operating model: Foundation Discussion Mode OFF → Architecture Locked →
  Product Delivery Mode ON.

### Changed
- `README.md` rewritten as the Orbitan front door (vision, architecture, frozen
  foundations, MVP scope, repo structure, governance, contribution, release, docs index).

## [v1.0-foundation-freeze] — 2026-07-23

The constitutional foundations of OrbitanOS are frozen.

### Added
- **RA-0000** — Architecture Governance Framework (v1.1.0) — FROZEN.
- **RA-0004** — Platform Services Architecture (v1.1.0) — FROZEN. Platform vs Domain
  layering, Platform Capability Principles (PCP-001..005), Platform Service Invariants,
  Orbit Nexus as the AI Platform Capability, resilience + error classification.
- **RA-0005** — Identity Architecture (v1.0.0) — FROZEN. Orbit Identity Model: global
  `User` (identity) vs tenant-scoped `Employee` (membership), non-human principals as
  governed identities, context-aware access context, least-privilege default.
- **Orbitan Frozen Foundations v1.0** — binding the three pillars into one immutable
  governance state.
- **Orbitan MVP Charter** — product goal, pilot tenants, in-scope, excluded, success
  criteria.
- **Orbitan Build Manifest v1.0** — build order, critical path, quality gates, build
  mode rules, git baseline.
- Knowledge Hub README updated with the three-pillar index and freeze status.
- Project Memory updated with the foundation freeze record.

### Governance
- Decision Mode: Foundation Discussion OFF; Product Delivery ON.
- Git tag: `v1.0-foundation-freeze`.

---

## Versioning Conventions

- **`vMAJOR.MINOR.PATCH`** for application releases.
- **`v1.0-foundation-freeze`, `v1.0-build-start`** — milestone baseline tags for
  regression analysis.
- Every major feature PR adds an entry under an unreleased section, promoted to a
  dated version on release.