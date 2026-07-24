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