# Build #26A.4 — OrbitanOS MVP Architecture Stabilisation, Consolidation & RC1 Preparation

**Date:** 2026-07-26
**Build:** #26A.4 (MVP Consolidation — feature scope frozen)
**Status:** Audit + verified-defect fixes + Health Report. RC1 verdict: **NOT READY** (P1 blockers remain).
**MVP Completion:** ~96% (de-scored from earlier estimates after evidence-based audit)

---

## 1. Executive Summary

This is a consolidation build, not a feature build. I read-first audited the highest-signal platform implementations (navigation registry, Access Control, the four pilot-lifecycle pages, Blueprint Studio + Advisor, PWA manifest/service-worker wiring, AuthContext, Account Settings, Integration Hub, theme engine) before scoring anything. Three verified defects were fixed this build: a **P0 missing PWA manifest**, a **P1 audit-integrity impersonation** in Blueprint Studio, and a **P2 dropdown-closure** defect in the Blueprint Advisor. The remaining release blockers are P1: hard-coded light-theme colours across the pilot/go-live/blueprint surfaces (WCAG-AA contrast risk in Dark mode), an incomplete Access Control UI (policy CRUD only — no assigned-users / inherited-permission view), Blueprint operating on static launch manifests rather than live tenant records, and PWA icon sizing. The verdict is **NOT READY to enter RC1**; the precise blocker list and remediation order are below.

## 2. Source-of-Truth Documents Reviewed

Frozen Foundations, Reference Architecture, accepted ADRs (incl. ADR-0053 Orbit Inbox, ADR-0054 Audit Centre, ADR-0055 Stripe Connect lock), MVP Charter, Build Manifest, navigation registry (`src/lib/navigation-registry.js`), Access Engine (`src/lib/access/*`), entity RLS (snapshot schemas), design-system tokens (`src/index.css`, `tailwind.config.js`), and Build Package notes through #26A.2.

## 3–11. Architecture / UI / UX / Theme Findings & Fixes

**Architecture findings:** registry-driven navigation + RLS tenant isolation + Access Engine authority + canonical readiness engines (`pilotReadiness` for tenant, `goLiveReadiness` for platform) are coherent. **Finding A1:** Blueprint Advisor + Studio both consume the *same* `calculateBlueprintScore` (no competing score) — good — but both evaluate **static `LAUNCH_MANIFESTS`**, not live tenant DB records, so recommendations can be unrelated to a real tenant's actual configuration. **Finding A2:** `canAccessNavItem` checks only `admin`/`platform_admin`, but `platform_admin` is not a role used elsewhere (roles are admin/tenant_admin/outlet_manager/supervisor/worker). **Finding A3:** navigation registry has 5 groups, not the brief's named 6 (Customer Success/Integrations sit under "Governance & Pilot"; Marketplace under "Revenue Engine") — coherent but differs from the brief's taxonomy.

**UI/theme findings (verified, fixed where safe):** the platform defaulted to Dark after #26A.2 because `DEFAULT_PREFS.theme` was `'system'` and the Base44 preview OS-prefers dark — **fixed** (default now Light; Dark/System remain opt-in; FOUC prevented via early `applyPreferences`). **Unfixed P1:** PilotReadinessDashboard, GoLiveReadinessCentre, PilotActivationPage, PilotDeploymentCentre, BlueprintStudio, and BlueprintAdvisor use **hard-coded light-theme classes** (`bg-red-50`, `border-red-200`, `bg-amber-50`, `bg-green-50`, `bg-orbitan-red-light/60`, StatusPill `bg-green-100 text-green-800` …) that fail WCAG AA contrast and look broken in Dark mode. These were **not** swept this turn to avoid risky mass edits — they are the top P1.

**UX findings:** most read pages have loading + empty + error states (AccessControlPage, PilotDeploymentCentre, GoLiveReadinessCentre). **Finding U1:** PilotReadinessDashboard shows an error panel with **no retry button**. **Finding U2 (fixed):** Blueprint Advisor tenant dropdown did not close on outside-click/Escape.

**Architecture/UI/UX fixes applied:** theme default → Light + FOUC prevention; Blueprint Studio audit actor now the real authenticated user; Blueprint Advisor dropdown closes on outside-click + Escape + exposes `aria-expanded`.

## 12. Route Inventory (canonical)

Public/auth: `/` (Landing), `/login`, `/register`, `/forgot-password`, `/reset-password`, `/auth/gateway`, `/join`, `/onboarding`, `/request-access`, `/checkout`, `/checkout/success`, `/checkout/cancelled`.
Workspace: `/workspace` (RoleGateway), `/workspace/:tenantId` + 24 module children (dashboard, inventory, procurement, hbb, sales, recipes, tasks, workforce, staff-directory, scheduling, compliance, reports, feedback, access-requests, expenses, shift-trades, clients, sustainability, facility-settings, artifacts, timesheets, production, finance-integration, nexus-intelligence, data-migration).
Platform (`/platform/*`): wallet, marketplace, shield, integrations, access-control, capabilities, pilot-readiness, diagnostics, pilot-admin, operational-health, exception-centre, pilot-activation, customer-success, go-live-readiness, pilot-deployment. (`audit-logs` redirected → `/audit-centre`.)
Standalone: `/leader-org` (Leader Workspace, tab-based), `/company`, `/outlet` (legacy), `/worker`, `/settings`, `/notifications`, `/audit-centre`, `/governance-log`, `/suppliers`, `/knowledge-hub`, `/artifacts`, `/user-roles`, `/data-import`, `/data-explorer`, `/analytics`, `/dev/task-tests`, `/dev/access-validation`.

## 13. Redirect / Deprecation Matrix

| Old route | Redirects to | Status |
|---|---|---|
| `/welcome` | `/join` | active |
| `/audit-trail` | `/audit-centre` | active |
| `/platform/audit-logs` | `/audit-centre` | active (⚠ registry still lists old URL — P2) |
| 14 legacy outlet/expense/etc. paths | `/workspace` | active (LEGACY_REDIRECTS) |
| `*` (unmatched) | `PageNotFound` | active |

## 14–16. Blueprint / Access Control / Pilot Lifecycle Status

**Blueprint:** Studio = authoring surface (toggle modules, drag-reorder, live score, export JSON, audit) — **canonical**. Advisor = read-only evaluator of the same `calculateBlueprintScore` — **canonical, not a competing engine**. Status: **functional but constrained** by static-manifest evaluation (A1) and hard-coded light colours (P1).

**Access Control:** `AccessControlPage` is a coherent **ModuleAccessPolicy CRUD** editor (per-tenant × module × role × data-scope × view/create/edit/delete) with full audit logging and a truthful empty state. **Not complete** as a full RBAC surface: it shows no assigned-users roster, no inherited-permission visualisation, no effective-permissions preview. The Access Engine remains authoritative at runtime. Status: **partial** (P1 to round out the UI; no new permission engine).

**Pilot Lifecycle:** four distinct purposes preserved — Readiness (assess), Activation (gate + activate), Deployment (lifecycle + audit timeline), Go-Live (platform-wide). PilotReadinessDashboard + PilotActivationPage both consume the **canonical `pilotReadiness`** function (no duplicate calc); activation is **gated on critical blockers** (`disabled={critical.length > 0}`). PilotDeploymentCentre consumes `pilotAdmin` lifecycle actions with an AuditLog timeline. GoLiveReadinessCentre consumes **canonical `goLiveReadiness`** + client PWA/a11y/perf checks. Status: **coherent**; the 10-step flow is not yet rendered as a single connected stepper (P2).

## 17. Readiness Calculation Ownership

| Score | Canonical owner | Consumers | Duplicate? |
|---|---|---|---|
| Blueprint Configuration Score | `calculateBlueprintScore` (blueprint-registry) | Blueprint Advisor, Blueprint Studio | No (same fn) |
| Customer Success Health | `customerSuccess` backend | CustomerSuccessPage | Not audited in depth |
| Pilot Readiness % | `pilotReadiness` backend | PilotReadinessDashboard, PilotActivationPage | No (single fn) |
| Platform Go-Live % | `goLiveReadiness` backend + client checks | GoLiveReadinessCentre | No (single fn) |

No competing calculations found in the audited surfaces. Embedded summaries should call these functions rather than recompute — confirmed for pilot pages.

## 18–21. Orbit Inbox / Audit Centre / Integration / Account Settings Regression

- **Orbit Inbox:** canonical `NotificationPreference` entity is the sole preference store (#26A.2 removed the duplicate `user.data.notifications`). Account Settings Notifications section reuses `InboxPreferences`. No second event ledger. ✅
- **Audit Centre:** canonical `/audit-centre`; `/audit-trail` + `/platform/audit-logs` redirect to it. (Registry still references the old `/platform/audit-logs` — P2 nav consistency.)
- **Integration:** Xero = Configuration Required (secrets external), Stripe Platform Billing = Connected, Tenant Stripe Connect = Coming Soon, catalogue = truthful Planned/Coming Soon (#26A.1). No fake connectors. ✅ No Build #26B started.
- **Account Settings:** unified hub (#26A.2) — Profile/Account/Security/Preferences/Accessibility/Notifications/Privacy/Connected Accounts/Developer; `full_name`/email protected; theme + currency + accessibility genuine; MFA/sessions/API-keys truthful-planned; deletion = request/review. ✅

## 22. State-Completeness Findings

Most audited pages have loading + empty + error. **Defects:** PilotReadinessDashboard error panel has **no retry** (P2); GoLiveReadinessCentre shows "client check pending" indefinitely if `clientChecks` never resolves (low risk — runs sync on mount). No permanent infinite spinners found in audited pages.

## 23–27. Responsive / Accessibility / Performance / Security / PWA

- **Responsive:** grids + max-w containers hold at 320→ultrawide in audited pages. `PilotDeploymentCentre` CreatePilotDialog is a fixed overlay (ok). No clipped drawers in audited pages.
- **Accessibility:** semantic headings + `main` landmark + aria-labels present in many surfaces; **defects:** custom dropdowns (BlueprintAdvisor now has Escape, but no arrow-key/roving focus); status is colour-only in several `StatusPill` maps (green/amber/red backgrounds without text) — P1; skip link not confirmed on app shell.
- **Performance:** React Query caching used; no duplicate queries found in audited pages; not formally profiled (conservative score).
- **Security:** RLS scoping is comprehensive on audited entities (admin not trapped — top-level `user_condition role admin` `$or`); ProtectedRoute guards routes; tenant_id scoping enforced; **fixed** Blueprint Studio audit impersonation. Full 50-entity RLS sweep not performed this pass.
- **PWA:** **P0 fixed** — `public/manifest.json` was 404 (index.html linked it); created a valid manifest. **Remaining P2:** icons declare a single remote image at 192/512 (not real sizes — Chrome installability may still fail); `sw.js` existence unverified (read tool cannot read `.js`); offline not claimed for live backend actions.

## 28–32. Component / Service / Entity / Documentation / Dead-Code Registers

- **Duplicate components:** `ArtifactRegistry` mounted at both `/artifacts` and `/workspace/:tenantId/artifacts` (P2 — pick canonical). `OutletDashboard` (`/outlet`) overlaps `WorkspaceDashboard` (legacy, P2).
- **Duplicate routes:** `/company` vs `/workspace/:tenantId/dashboard` (P2); `/outlet` legacy (P2).
- **Duplicate services/business logic:** none found in audited surfaces — readiness + blueprint score are single-owner.
- **Dead code / unused pages:** `/analytics` (AnalyticsPage) has no registry/nav entry (orphan, P2). `/company`, `/outlet` legacy candidates for redirect. `/dev/*` intentional test suites (retain).
- **Entity/data:** entities well-schemed with tenant_id/outlet_id + RLS. Demo/test contamination not confirmed/removed this pass (P1 to verify before pilot).
- **Documentation:** Knowledge Hub extensive + current through #26A.2; this note adds #26A.4. Completion-% inconsistencies across prior notes (98.5% vs 99%) reconciled to **96%** here.

## 33–37. Files

**Modified:** `src/lib/preferences.js` (default Light + FOUC prevention — done prior in turn), `src/components/blueprint/BlueprintStudio.jsx` (audit actor = real user), `src/components/advisor/BlueprintAdvisor.jsx` (dropdown outside-click + Escape + aria).
**Created:** `public/manifest.json` (PWA manifest), this report.
**Deleted:** none.
**Data cleanup:** none this pass.

## 38. GitHub Commit Summary

```
Build #26A.4: MVP consolidation — PWA manifest (P0), audit-integrity fix (P1), advisor dropdown (P2)

- public/manifest.json: created (was 404 → PWA installability broken)
- BlueprintStudio: AuditLog actor now uses real authenticated user (was hardcoded impersonation)
- BlueprintAdvisor TenantSelector: closes on outside-click + Escape, exposes aria-expanded
- Theme default confirmed Light; FOUC prevention via early applyPreferences
- Health Report: RC1 verdict NOT READY; P1 blockers catalogued
```

---

## ORBITANOS MVP HEALTH REPORT — Build #26A.4 (scores 0–100, evidence-based)

| Dimension | Score | Evidence |
|---|---|---|
| Architecture | 82 | Registry-driven nav, RLS isolation, canonical readiness engines; knocked for Blueprint static-manifest eval + 5-group vs 6-group nav + phantom `platform_admin` role |
| UI | 78 | Strong design system; knocked for hard-coded light colours across 6 platform pages (Dark-mode contrast defects) |
| UX | 80 | Good states + forms; knocked for missing retry on readiness error |
| Accessibility | 74 | Headings/landmarks/aria present; knocked for colour-only status pills, no arrow-key nav in custom dropdowns, skip-link unconfirmed |
| Responsiveness | 82 | Responsive grids + max-w containers across audited pages |
| Performance | 76 | React Query caching; not formally profiled (conservative) |
| Security | 84 | RLS comprehensive on audited entities, ProtectedRoute, audit logging; fixed impersonation; full RLS sweep pending |
| Data Integrity | 80 | Well-schemed entities; demo/test contamination not verified |
| RBAC/RLS | 83 | Access Engine authoritative; AccessControlPage is policy-only (no users/inheritance view) |
| Navigation | 77 | Registry authoritative; `/platform/audit-logs` registry entry points to a redirect; orphan `/analytics` |
| PWA | 70 | Manifest P0 fixed; icons not real-sized; sw.js unverified |
| Documentation | 86 | Extensive + current; completion % reconciled to 96% |
| Maintainability | 82 | Focused components, shared utils, single-owner calcs |
| Pilot Readiness | 85 | Canonical deterministic engine, activation gated on blockers |
| Release Readiness | 72 | P0 fixed; P1 contrast + Access Control + Blueprint-live-tenant + PWA icons remain |
| **Overall MVP completion** | **~96%** | Code-complete; not yet configuration-/operationally-validated |

## P0–P3 Issue Register

**P0 (blocks RC1 + pilot):**
- P0-1 ✅ FIXED — `public/manifest.json` missing (404); created valid manifest.

**P1 (must fix before pilot):**
- P1-1 — Dark-mode contrast: hard-coded light-theme classes (`bg-red-50`, `border-red-200`, `bg-amber-50`, `bg-green-50`, `bg-orbitan-red-light/60`, StatusPill maps) in PilotReadinessDashboard, GoLiveReadinessCentre, PilotActivationPage, PilotDeploymentCentre, BlueprintStudio, BlueprintAdvisor. **Top remediation.**
- P1-2 — Access Control UI incomplete: no assigned-users roster, inherited-permission, or effective-permission view (policy CRUD only).
- P1-3 — Blueprint Advisor/Studio evaluate static `LAUNCH_MANIFESTS`, not live tenant records → recommendations can mismatch the real tenant.
- P1-4 — Audit-trail integrity: verify no other hardcoded-actor audit writes exist across backend functions (only Blueprint Studio found + fixed).
- P1-5 — Demo/test data contamination: verify + remove from production/pilot tenants before pilot.

**P2 (accepted pilot limitations):**
- P2-1 — PWA icons declare a single remote image at 192/512 (not real sizes) — Chrome installability may still fail.
- P2-2 — `sw.js` existence unverified; offline not validated for live backend actions.
- P2-3 — Navigation registry lists `/platform/audit-logs` (a redirect) — should point to `/audit-centre`.
- P2-4 — Duplicate destinations: `/artifacts` vs `/workspace/:tenantId/artifacts`; `/company` vs workspace dashboard; `/outlet` legacy.
- P2-5 — Pilot lifecycle 10-step flow not rendered as a single connected stepper.
- P2-6 — PilotReadinessDashboard error panel has no retry button.
- P2-7 — Custom dropdowns lack arrow-key/roving focus; status pills are colour-only in places.
- P2-8 — Orphan `/analytics` route (no nav entry).

**P3 (post-MVP):**
- P3-1 — i18n engine + central date/time formatter (Account Settings flags these as Planned).
- P3-2 — MFA / sessions / devices / API keys (provider-limited).
- P3-3 — Tenant Stripe Connect (Build #26B, deferred).

## RC1 Entry Checklist

| Item | Status |
|---|---|
| Feature freeze confirmed | ✅ |
| Main branch clean | ⏳ (pending commit) |
| Build succeeds | ⏳ (not run this pass) |
| Routes validated | ⚠ partial (registry/redirect inconsistencies) |
| RBAC validated | ⚠ partial (Access Control UI incomplete) |
| RLS validated | ⚠ partial (audited entities ok; full sweep pending) |
| Tenant isolation validated | ⏳ |
| Device matrix completed | ❌ |
| Accessibility review completed | ❌ (contrast + colour-only status) |
| Security blockers resolved | ⚠ (P1-4 audit sweep partial) |
| PWA validated | ❌ (icons + sw.js) |
| Backups validated | ⏳ (platform-managed) |
| Monitoring validated | ⏳ |
| Support process defined | ⏳ |
| Rollback plan defined | ⏳ |
| Pilot tenants prepared | ⏳ (external: Xero secrets) |
| Test/demo contamination removed | ❌ (P1-5) |
| External credentials documented | ✅ (Xero + Stripe Connect documented) |
| Release notes prepared | ❌ |
| Known limitations approved | ⏳ |

## FINAL DECISION

**ORBITANOS MVP IS NOT READY TO ENTER RC1.**

Blocking issues (precise):
1. **P1-1** — Dark-mode WCAG-AA contrast defects across 6 platform pages (hard-coded light colours).
2. **P1-2** — Access Control UI incomplete (no assigned-users / inherited / effective-permission view).
3. **P1-3** — Blueprint evaluates static launch manifests, not live tenant records.
4. **P1-4** — Confirm no remaining hardcoded-actor audit writes across backend functions.
5. **P1-5** — Verify + remove demo/test contamination from pilot tenants.
6. **P2-1/2** — PWA icon sizing + `sw.js` validation.

**Recommended remediation order:** P1-1 (contrast sweep) → P1-2 (Access Control UI) → P1-3 (Blueprint live-tenant) → P1-5 (data hygiene) → P1-4 (audit sweep) → P2-1/2 (PWA) → re-run Go-Live Readiness → RC1.

## Exact Next Step

Execute **P1-1 (Dark-mode contrast sweep)**: replace hard-coded light-theme classes with Orbitan semantic tokens across PilotReadinessDashboard, GoLiveReadinessCentre, PilotActivationPage, PilotDeploymentCentre, BlueprintStudio, and BlueprintAdvisor; then re-validate Light/Dark/System. This is the single highest-value, no-feature-expansion fix that unblocks the most RC1 checklist items.

Do **not** begin RC1, Build #26B, or pilot activation automatically.