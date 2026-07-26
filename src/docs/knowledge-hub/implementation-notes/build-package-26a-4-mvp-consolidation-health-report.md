# Build #26A.4 — OrbitanOS MVP Health Report (COMPLETE)

**Date:** 2026-07-26 · **Build:** #26A.4 (MVP Consolidation — feature scope frozen)
**Verdict:** **ORBITANOS MVP IS NOT READY TO ENTER RC1** · **MVP Completion: ~95%**

This is the complete, evidence-based report. Every score is grounded in source read this build. No score is inflated. Three verified defects were fixed earlier in #26A.4 (P0 missing `public/manifest.json`; P1 Blueprint Studio audit actor impersonation; P2 Blueprint Advisor dropdown outside-click/Escape). Remaining issues are catalogued below by severity.

---

## Executive Summary

OrbitanOS is architecturally sound and code-complete for the pilot scope. The registry-driven navigation, RLS-tenant-isolated data model, single canonical readiness engines (`pilotReadiness`, `goLiveReadiness`, `customerSuccess`), single canonical Blueprint score (`calculateBlueprintScore`), Access Engine + ModuleAccessPolicy RBAC, Audit Centre with realtime + export + bundle, Orbit Inbox with canonical `NotificationPreference`, and the unified `/settings` hub are all coherent and non-duplicated. The platform is **not** RC1-ready because of a cluster of P1 defects concentrated in three areas: (1) hard-coded light-theme colour classes across at least eight surfaces that break WCAG-AA contrast in Dark mode, (2) governance/audit gaps (Capability Manager mutations are not audit-logged; Worker Portal notifications are scoped to a hard-coded tenant slug), and (3) broken deep links in the Worker Portal (`/t1/*` routes that do not exist). None of these require new features; all are verifiable from source.

## Source-of-Truth Reviewed

Frozen Foundations, Reference Architecture, accepted ADRs (incl. ADR-0025 Artifacts, ADR-0044 Self-Optimization, ADR-0046 Capability Tiering, ADR-0053 Orbit Inbox, ADR-0054 Audit Centre, ADR-0055 Stripe Connect lock), MVP Charter, Build Manifest, `navigation-registry.js`, `orbitan-config.js`, `onboarding/blueprint-registry.js`, `tenant-registry.js`, Access Engine, entity RLS (snapshot), design tokens (`index.css`, `tailwind.config.js`), App.jsx routes, AuthContext, WorkspaceLayout, WorkerPortal, LeaderOrg tabs, CapabilityManager, AuditCentre, CustomerSuccessPage, the four pilot-lifecycle pages, Blueprint Advisor/Studio, PWA (manifest + PWAUpdateListener + index.html), Account Settings hub, Integration Hub/Catalogue.

## Scores (0–100) with Evidence

| Dimension | Score | Evidence |
|---|---|---|
| Architecture | 83 | Single canonical `calculateBlueprintScore` (critical40+path30+gov20+dep10) consumed by both Blueprint surfaces — no competing score. `pilotReadiness`/`goLiveReadiness`/`customerSuccess` are distinct single-owner engines. RLS tenant isolation present. **Knocks:** Blueprint evaluates static `LAUNCH_MANIFESTS`, not live tenant records; two static registries (`LAUNCH_TENANTS` vs `LAUNCH_MANIFESTS`) diverge on Izaliqa modules; `ROLE_ROUTES` contains dead `/client`; nav registry has 5 groups vs brief's 6. |
| UI | 75 | Design system + tokens strong. **Knock:** hard-coded light-theme classes in ≥8 surfaces: PilotReadinessDashboard, GoLiveReadinessCentre, PilotActivationPage, PilotDeploymentCentre, BlueprintStudio, BlueprintAdvisor, **CapabilityManager** (all tier/module/sanitization badges), **WorkerPortal** (urgent pill, compliance gate, priority badges, quick-access icons), **CustomerSuccessPage** (access-denied + error panels). These break contrast in Dark. |
| UX | 79 | Good states + forms across audited pages. **Knocks:** WorkerPortal quick-access links (`/t1/dashboard`, `/t1/compliance`, `/t1/ai-studio`) and ShiftsScreen `/t1/clockin` are dead (no such routes); CapabilityManager edit dialog state exists but no button opens it (dead UI); AuditCentre client-side search/date filter only applies to the current page (PAGE_SIZE+1), not the full dataset; PilotReadinessDashboard error panel has no retry. |
| Accessibility | 74 | AuditCentre has aria-labels, `aria-pressed`, `sr-only`, semantic table, skip via main landmark. WorkerPortal has safe-area insets + bottom nav. **Knocks:** status communicated by colour alone in multiple StatusPill maps (CapabilityManager, PilotDeploymentCentre, WorkerPortal priorities); custom dropdowns (BlueprintAdvisor fixed for Escape but no arrow-key/roving); skip link not confirmed on app shell; no formal WCAG AA contrast pass. |
| Security | 82 | RLS scoping comprehensive on audited entities (admin not trapped — top-level `user_condition role admin` `$or`); WorkspaceLayout fail-closed + worker redirect; ProtectedRoute; audit logging in AccessControlPage, WorkerPortal clock, Blueprint Studio (now real user). **Knocks:** CapabilityManager toggle + metadata-edit mutations write NO AuditLog (governance gap for capability enable/disable); WorkerPortal `NotificationsInbox tenantSlug="t1"` scopes notifications to a hard-coded slug instead of the real tenant; full 50-entity RLS sweep not completed. |
| Performance | 76 | React Query caching used widely; no duplicate queries in audited surfaces; Blueprint computes over cheap static data. **Knocks:** AuditCentre search/filter is client-side over a single page (correctness + scale); WorkerPortal `clock-status` refetches every 30s; not formally profiled. |
| Navigation | 76 | Registry authoritative for platform nav; WorkspaceLayout resolves tenant from DB + hydrates manifest; legacy redirects consolidate. **Knocks:** WorkerPortal `/t1/*` deep links broken; `ROLE_ROUTES.client_manager → /client` dead; registry lists `/platform/audit-logs` (a redirect) instead of `/audit-centre`; orphan `/analytics`; `/artifacts` duplicated standalone + embedded. |
| PWA | 70 | `public/manifest.json` created (was 404 → P0 fixed); `index.html` manifest/apple/touch meta present; `PWAUpdateListener` registers `/sw.js` with update toast + controllerchange reload. **Knocks:** manifest icons declare a single remote image at 192/512 (not real sizes — Chrome installability may still fail); `sw.js` existence unverified; offline not claimed for live backend actions (correct). |
| Documentation | 86 | Extensive Knowledge Hub, ADRs, runbooks, build notes through #26A.2; this note completes #26A.4. Completion % reconciled from earlier 98.5%/99% to 95%. |
| Maintainability | 81 | Focused ≤50-line components, shared utils, single-owner calculations. **Knocks:** two static tenant registries (config + tenant-registry) with divergent module lists; CapabilityManager dead edit dialog; some one-off duplicated destination components (ArtifactRegistry ×2, OutletDashboard vs WorkspaceDashboard). |
| Pilot Readiness | 85 | `pilotReadiness` deterministic + explainable; PilotActivationPage gates activation on `critical.length>0`; PilotDeploymentCentre lifecycle via `pilotAdmin` with AuditLog timeline; 10-step flow not yet a single connected stepper. |
| Release Readiness | 72 | P0 fixed; P1 contrast sweep + Capability audit logging + WorkerPortal links/scoping + Access Control UI + Blueprint-live-tenant + demo hygiene remain. |
| **MVP Completion** | **~95%** | Code-complete; not configuration-/operationally-validated. |

## Duplicate / Dead-Code / Legacy Registers

- **Duplicate components:** `ArtifactRegistry` (`/artifacts` + `/workspace/:tenantId/artifacts`); `OutletDashboard` vs `WorkspaceDashboard`.
- **Duplicate routes:** `/company` vs `/workspace/:tenantId/dashboard`; `/outlet` legacy.
- **Duplicate services/business logic:** none found in audited surfaces — readiness + blueprint + customer-success are single-owner.
- **Dead code / dead UI:** CapabilityManager edit dialog (state + mutation wired, no opener); `ROLE_ROUTES.client_manager → /client` (no route); WorkerPortal `/t1/*` links.
- **Legacy:** `/outlet`, `/company` (candidates for redirect).
- **Technical debt:** two static tenant registries with divergent Izaliqa modules; hard-coded light-theme colour classes platform-wide; AuditCentre search scoped to a page.

## Issue Register

### P0 — blocks RC1 + pilot
- (none remaining — P0-1 missing manifest fixed earlier in #26A.4)

### P1 — must fix before pilot
- **P1-1 Dark-mode WCAG-AA contrast:** hard-coded light classes in PilotReadinessDashboard, GoLiveReadinessCentre, PilotActivationPage, PilotDeploymentCentre, BlueprintStudio, BlueprintAdvisor, CapabilityManager, WorkerPortal, CustomerSuccessPage. *(Top remediation — token sweep.)*
- **P1-2 WorkerPortal broken deep links:** quick-access `/t1/dashboard`, `/t1/compliance`, `/t1/ai-studio` and ShiftsScreen `/t1/clockin` resolve to no route.
- **P1-3 WorkerPortal notifications tenant scoping:** `NotificationsInbox tenantSlug="t1"` uses a hard-coded slug, not the worker's real tenant.
- **P1-4 CapabilityManager audit gap:** enable/disable + metadata edits write no AuditLog (governance/regulate violation for Tier-2/3 capabilities).
- **P1-5 Access Control UI incomplete:** policy CRUD only — no assigned-users roster, inherited-permission, or effective-permission view.
- **P1-6 Blueprint static-manifest evaluation:** Advisor + Studio evaluate `LAUNCH_MANIFESTS`, not live tenant records → recommendations can mismatch the real tenant.
- **P1-7 Demo/test contamination:** verify + remove from pilot tenants before go-live.
- **P1-8 Audit-actor sweep:** confirm no remaining hardcoded-actor audit writes across backend functions (only Blueprint Studio found + fixed).

### P2 — accepted pilot limitations
- P2-1 PWA icons not real-sized; `sw.js` unvalidated.
- P2-2 Two static tenant registries diverge (Izaliqa modules).
- P2-3 AuditCentre search/filter scoped to current page only.
- P2-4 Nav registry `/platform/audit-logs` points to a redirect.
- P2-5 Pilot lifecycle 10-step flow not a single connected stepper.
- P2-6 PilotReadinessDashboard error panel has no retry button.
- P2-7 Custom dropdowns lack arrow-key/roving focus; status pills colour-only.
- P2-8 Orphan `/analytics`; duplicate `/artifacts` destinations.
- P2-9 CapabilityManager edit dialog unreachable (dead UI).

### P3 — post-MVP
- P3-1 i18n engine + central date/time formatter (Account Settings flags Planned).
- P3-2 MFA / sessions / devices / API keys (provider-limited).
- P3-3 Tenant Stripe Connect (Build #26B, deferred).

## Checklists

### RC1 Checklist
Feature freeze ✅ · main clean ⏳ · build ⏳ · routes ⚠ (worker `/t1/*` dead) · RBAC ⚠ (Access Control UI partial) · RLS ⚠ (partial sweep) · tenant isolation ✅ (WorkspaceLayout) · device matrix ❌ · accessibility ❌ (contrast) · security ⚠ (P1-4/8) · PWA ❌ (icons/sw) · backups ⏳ · monitoring ⏳ · support process ⏳ · rollback plan ⏳ · pilot tenants ⏳ (external Xero secrets) · contamination ❌ (P1-7) · external credentials ✅ · release notes ❌ · known limitations ⏳.

### Pilot Checklist
4 pilot tenants provisioned (Taqueria, Renewed Resources, Renewed Fashion, Izaliqa) ✅ (static manifests) · Xero secrets configured ❌ (external) · Stripe live ✅ · readiness ≥ threshold per tenant ⏳ · tenant_admin sign-off ⏳ · worker accounts linked ⏳ · demo data purged ❌ (P1-7) · support contact confirmed ⏳.

### Production Checklist
Live Stripe billing ✅ · Xero connected per tenant ⏳ · RLS enforced ✅ (audited) · audit immutability ✅ · backups (platform-managed) ⏳ · monitoring/alerting ⏳ · incident runbook ✅ (docs) · rollback plan ⏳ · custom domain ⏳ · PWA installable ❌ (icons) · accessibility AA ❌.

## FINAL DECISION

**ORBITANOS MVP IS NOT READY TO ENTER RC1.**

Blocking issues (precise):
1. **P1-1** — Dark-mode WCAG-AA contrast defects across ≥9 surfaces (hard-coded light colours).
2. **P1-2** — WorkerPortal broken `/t1/*` deep links (no such routes).
3. **P1-3** — WorkerPortal `NotificationsInbox tenantSlug="t1"` wrong tenant scoping.
4. **P1-4** — CapabilityManager toggle/edit not audit-logged.
5. **P1-5** — Access Control UI incomplete (no users/inheritance/effective view).
6. **P1-6** — Blueprint evaluates static launch manifests, not live tenant records.
7. **P1-7** — Demo/test contamination not verified/removed from pilot tenants.
8. **P1-8** — Audit-actor sweep across backend functions not completed.

**Recommended remediation order:** P1-1 (contrast sweep) → P1-2/3 (worker links + scoping) → P1-4 (capability audit) → P1-5 (Access Control UI) → P1-6 (Blueprint live-tenant) → P1-7 (data hygiene) → P1-8 (audit sweep) → P2-1 (PWA icons/sw) → re-run Go-Live Readiness → RC1.

I will not begin RC1, Build #26B, or pilot activation automatically.