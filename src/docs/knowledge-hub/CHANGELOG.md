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