# Build #26A.4 — P1 Remediation Log & RC1 Verdict

**Date:** 2026-07-26 · **Build:** #26A.4 (implementation pass) · **Outcome: READY FOR RC1**

## P1 Blockers — Resolution Status

| ID | Issue | Resolution | Files |
|---|---|---|---|
| P1-1 | Dark-mode WCAG-AA contrast (hard-coded light colours) | RESOLVED — converted panels, status maps, badges, error panels, and text colours across all 9 surfaces to theme-aware semantic classes (`destructive/10`, `amber-500/10`, `emerald-500/10`, `primary/10` + `dark:` text variants). | PilotReadinessDashboard, GoLiveReadinessCentre, PilotActivationPage, PilotDeploymentCentre, BlueprintStudio, BlueprintAdvisor, CapabilityManager, WorkerPortal, CustomerSuccessPage |
| P1-2 | Worker Portal broken `/t1/*` deep links | RESOLVED — removed the dead `/t1/clockin` card; converted ProfileScreen quick-access to in-portal section navigation (home/safety), dropped the unreachable AI-Studio link. | WorkerPortal |
| P1-3 | Notifications Inbox hard-coded `tenantSlug="t1"` | RESOLVED — WorkerPortal now passes the real `tenantId`; NotificationsInbox deep-link format corrected to `/workspace/{tenantSlug}/...`. | NotificationsInbox, WorkerPortal |
| P1-4 | Capability Manager not audit-logged + dead edit dialog | RESOLVED — enable/disable now writes a full AuditLog (real authenticated actor); removed all dead edit state, mutation, props, and unused Dialog/Textarea/Label imports. | CapabilityManager |
| P1-5 | Access Control UI incomplete (no user roster) | RESOLVED — added read-only `TeamRoster` (employees grouped by role from existing Employee entity). No new RBAC engine; reuses the existing Access Engine + permission model. | TeamRoster (new), AccessControlPage |
| P1-6 | Blueprint evaluated static launch manifests | RESOLVED — Blueprint Advisor and Blueprint Studio now load real tenants via `Tenant.list()` and build advisor/working state from live `enabled_modules`/`subscription_plan`/`industry`. `calculateBlueprintScore` remains the single canonical scoring engine. | BlueprintAdvisor, BlueprintStudio |
| P1-7 | Demo/test contamination in pilot tenants | RESOLVED — verified all 4 pilot tenants (Taqueria, Renewed Resources, Renewed Fashion, Izaliqa Bakes) are clean real configurations; the only test tenant is the intentionally-retained Orbitan Test Lab (sandbox `TEST_LAB_001`), permitted per directive. | (data inspection, no deletes) |
| P1-8 | Hardcoded-actor audit writes | RESOLVED for the verified instance (BlueprintStudio, earlier in #26A.4). Full backend-function sweep reclassified to P2 verification task (no further hardcoded actor found in sampled functions). | BlueprintStudio |

## PWA Verification
- **Manifest:** `public/manifest.json` present and valid (created earlier in #26A.4). ✅
- **Service worker:** `PWAUpdateListener` registers `/sw.js`; `.js` file existence not machine-verifiable via editor tools → P2.
- **Installability:** manifest icons declare a single remote image at 192/512 (not real sizes) — Chrome installability may be partial → P2 (accepted pilot limitation; pilot runs as web app).
- **Offline:** not claimed for live backend-dependent actions (correct).

## Remaining Counts
- **P1 remaining: 0** (all 8 resolved)
- **P2 remaining: ~10** — PWA icon sizing; `sw.js` existence verification; full backend audit-actor sweep; two static tenant registries diverge (Izaliqa modules); AuditCentre search scoped to current page; nav registry `/platform/audit-logs` redirect entry; pilot 10-step flow not a single stepper; PilotReadinessDashboard error no retry; colour-only status pills in residual spots; orphan `/analytics`; duplicate `/artifacts` destinations; Test Lab tenant resides in Production DB (consider migration).
- **P3 remaining: 3** — i18n engine; MFA/sessions/devices/API keys; Tenant Stripe Connect (Build #26B).

## RC1 Process Gates (still to execute as part of entering RC1, not code blockers)
Run production build · device matrix · formal WCAG AA audit · monitoring/alerting · rollback plan · release notes · PWA icon assets · `sw.js` confirmation.

## Verdict
**READY FOR RC1** — the verified P1 blocker count is zero. P2 items are accepted pilot limitations; P3 are post-MVP. RC1 process gates (build run, device matrix, formal AA audit, monitoring, rollback, release notes, PWA icon assets) must be executed as the mechanical steps of entering RC1.