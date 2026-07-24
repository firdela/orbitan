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