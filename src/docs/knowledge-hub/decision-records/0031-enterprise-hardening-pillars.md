# ADR-0031: Enterprise Hardening Pillars — Access, Notifications, Audit Bundles

**Status:** Accepted
**Date:** 2026-07-16
**Principle:** Regulate (governance, least-privilege, evidence)
**Supersedes:** —
**Related:** ADR-0003 (Shield), ADR-0025 (Artifact Registry), ADR-0027 (Staff Directory Governance), ADR-0030 (Contextual Help)

---

## Context

As OrbitanOS approaches the two-month MVP deadline, three systemic gaps
threaten enterprise readiness and long-term scalability:

1. **Scattered access checks.** Pages contain inline role-array checks
   (`['admin','tenant_admin','outlet_manager'].includes(user.role)`).
   These are brittle, drift-prone, and do not scale when new roles
   (e.g. `auditor`, `viewer`) are introduced — every page must be
   hand-edited.

2. **Notification sprawl.** `shiftReminderEngine` and
   `complianceAlertEngine` each implement their own email composition,
   recipient lookup, and delivery logic. Adding procurement, finance, or
   replenishment alerts would duplicate this logic a fourth and fifth time.

3. **Fragmented audit evidence.** `AuditLog` records events and
   `ArtifactRecord` stores evidence, but there is no single export that
   packages an auditable event with its linked evidence into a compliance
   bundle for SOC 2 / Vanta evidence requests.

These three concerns are addressed by three reusable platform capabilities,
collectively the **Enterprise Hardening Pillars**.

---

## Decision

### Pillar 1 — Unified Audit Bundle Generator

A backend function `auditBundleGenerator` that, given a `target_record_id`
(or date range + module), queries `AuditLog` and collects linked
`evidence_urls`, then assembles a structured PDF bundle with a manifest
summary page. Each bundle is immutable and referenceable by its source
`AuditLog` entry IDs.

**Why a function over inline UI export:** the bundle may include hundreds
of log entries and evidence files; generating server-side avoids browser
memory limits and keeps the logic reusable by automations (e.g. auto-
generate a bundle when Shield hard-blocks an action).

**Alternatives considered:**
- *On-demand only (UI button):* simplest, but misses automated compliance
  gates. **Rejected** — hybrid (on-demand + automation-triggered) is
  more scalable.
- *Store bundles as entities:* adds a `Bundle` entity. **Deferred** — for
  MVP, bundles are generated on demand; persistence can be layered later
  without changing the generator contract.

### Pillar 2 — Unified Notification Pipeline

A `NotificationTemplate` entity (registry-driven, tenant-overridable) +
a `notificationDispatcher` backend function. Modules send a payload
`{ template_key, recipient_email, recipient_name, context: {...} }`;
the dispatcher resolves the template (tenant override → system default),
performs `{{mustache}}` substitution, and delivers via the template's
configured channels (email / in-app / webhook).

**Why registry-driven:** new notification types are added by creating a
`NotificationTemplate` record — no code change, no redeploy. Tenant
admins can customise copy for white-label deployments. Delivery channels
can evolve (add SMS/push) without touching the dozens of trigger sites.

**Alternatives considered:**
- *Refactor existing engines inline:* keeps logic in each engine.
  **Rejected** — duplicates template resolution and delivery N times.
- *Hardcode templates in a JS map:* faster initially but not tenant-
  configurable. **Rejected** — fails the white-label/enterprise
  scalability test.

### Pillar 3 — Declarative Role-Based UI Hardening

Two reusable components — `AccessGuard` and `AccessButton` — built on
the existing `useModuleAccess` hook (which reads `ModuleAccessPolicy`).
Pages declare intent (`<AccessButton module="procurement" action="update">`)
instead of checking role arrays. When permissions change, the UI
auto-adjusts with zero page-level edits.

**Why declarative components over hook-only:** components encapsulate the
hide-vs-disable decision and keep JSX readable. The page calls
`useModuleAccess(module)` once and passes `can` down to avoid per-button
policy fetches.

**Alternatives considered:**
- *Route-level guards only:* hides pages but not in-page actions.
  **Rejected** — least-privilege requires action-level granularity.
- *ABAC engine now:* future-ready but over-built for MVP. **Deferred** —
  the component contract is ABAC-compatible; only the resolver changes
  later.

---

## Consequences

- **Positive:** New roles, notification types, and audit exports require
  configuration/registry changes, not code scattered across pages.
- **Positive:** SOC 2 evidence is one button-click away; the bundle
  generator is automation-triggerable for hard-blocked actions.
- **Cost:** One new entity (`NotificationTemplate`), two new backend
  functions, two new shared components. All reuse existing entities
  (`ModuleAccessPolicy`, `AuditLog`, `ArtifactRecord`) — no new
  data-model proliferation.
- **Risk:** `NotificationTemplate` tenant overrides must be seeded for
  pilot tenants; missing templates fall back to system defaults, so
  delivery never silently fails.

---

## Verification

- `AccessButton`/`AccessGuard` replace inline role checks on
  `ProcurementPage` (the reference integration).
- `shiftReminderEngine` delegates to `notificationDispatcher` with the
  `shift_reminder` template.
- `auditBundleGenerator` produces a PDF from `AuditTrail`'s
  "Export Audit Bundle" action for a given target record.
- All three capabilities are industry-agnostic and tenant-isolated.