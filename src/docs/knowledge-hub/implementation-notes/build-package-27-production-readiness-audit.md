# Build #27 — Platform Production Readiness Audit (Pass 1)

**Date:** 2026-07-27 · **Scope:** Route/navigation audit + first wave of verifiable remediation · **Status:** In progress (multi-pass)

> This is a **pass-1 report**. Per the build directive, it records only work that has actually been completed and validated — no estimates, no projected percentages. Full platform health scoring is deferred until every audit lane has been executed.

---

## Pass 1 — Completed & Validated Remediation

### Route & Navigation Audit
| # | Defect | Severity | Resolution | Files |
|---|---|---|---|---|
| R1 | `/analytics` rendered `AnalyticsPage` which queried `InventoryItem/ClockRecord/SalesInvoice` with **no tenant filter** — cross-tenant data exposure, violating ADR-0049 fail-closed. The page was also a top-level route with no entry in the Platform Navigation Registry and no role gateway (orphan). | **Critical (security/data-integrity)** | Route redirected to `/workspace` (canonical tenant workspace); page file deleted. Any inbound `<Link to="/analytics">` is safely caught by the redirect. | `src/App.jsx`, `src/pages/Analytics.jsx` (deleted) |
| R2 | `/company` (`CompanyDashboard`) was an orphan route — `RoleGateway` routes no role here. Its entire sidebar pointed to `/company/workforce`, `/company/inventory`, etc., **none of which exist as routes** (all 404). It also rendered hardcoded placeholder data ("La Birria Tacos", "1 outlet", "1 client"). | **High (broken nav + placeholder data)** | Route redirected to `/workspace`; page file deleted. `WorkspaceDashboard` is the canonical leader surface. | `src/App.jsx`, `src/pages/CompanyDashboard.jsx` (deleted) |
| R3 | `PilotCommandCenter` (admin Pilot Control tab) hardcoded a static `PILOT_TENANTS` array of 3 tenants — the same drift removed from BlueprintAdvisor/Studio in #26A.4. | **High (placeholder data / architectural drift)** | Rewritten to load real tenants via `base44.entities.Tenant.list()`, filtered to non-sandbox, non-cancelled. Industry/plan are derived from the live `Tenant.industry` and `subscription_plan` enums. Per-tenant enrichment (IssueLog / SalesInvoice / PurchaseOrder) preserved, keyed by real `tenant.id`. Autopilot + shadow-sync toggles and `TenantPilotCard` props unchanged. | `src/components/leader/PilotCommandCenter.jsx` |

### Accessibility (WCAG) — Dark-Mode Contrast Residue
| # | Component | Issue | Resolution |
|---|---|---|---|
| A1 | `WorkspaceDashboard` → `LowStockCard` | Light-only `bg-amber-50`, `border-amber-500/30`, `text-amber-900`, `hover:bg-amber-100/60` — fails dark-mode contrast (P1-1 class). | Converted to `bg-amber-500/10` + `text-amber-700 dark:text-amber-300` + `hover:bg-amber-500/10` + `text-amber-800 dark:text-amber-200`. |
| A2 | `TenantPilotCard` health badge | Light-only `border-green-300 text-green-600 bg-green-50`. | `border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10`. |
| A3 | `TenantPilotCard` issue icon/text | `text-red-500` (non-semantic). | `text-destructive`. |
| A4 | `TenantPilotCard` autopilot dot | `bg-green-500` / `bg-amber-400`. | `bg-emerald-500` / `bg-amber-500`. |
| A5 | `TenantPilotCard` synced count | `text-green-600` (low contrast on dark card). | `text-emerald-600 dark:text-emerald-400`. |

### Components Reused / Consolidated
- **`WorkspaceDashboard`** confirmed as the single canonical leader/tenant landing surface (replaces the deleted `CompanyDashboard`).
- **`Tenant.list()`** reused as the canonical tenant data source for `PilotCommandCenter` (consistent with BlueprintAdvisor/Studio from #26A.4).
- **`Navigate` redirect pattern** reused for orphan routes (matches the existing `LEGACY_REDIRECTS` convention in `App.jsx`).

---

## Suspected Dead Code / Tech Debt Identified (pending verification — not yet removed)

These were identified during pass-1 reading but **not** deleted, because removing them safely requires a project-wide import-grep that the editor cannot perform in this pass. They are flagged for the next pass:

| ID | Location | Concern | Recommended action |
|---|---|---|---|
| TD1 | `src/lib/orbitan-nav.js` → `TENANT_NAV_MANIFESTS` | Defines per-tenant nav with dead paths `/t1`, `/t2`, `/t3` and `href: '/t1/ai-studio'` — none of which exist in `App.jsx`. `MODULE_REGISTRY` and `NAV_SECTIONS` may still be consumed by `orbitan-engine.js` / `ManifestHydrator.js`. | Verify import graph; remove `TENANT_NAV_MANIFESTS` if unreferenced. |
| TD2 | `src/lib/orbitan-nav.js` + `src/lib/orbitan-engine.js` | Two parallel "engine" abstractions (`orbit-core.js` OrbitCore vs `orbitan-engine.js`) plus `OrbitanQuery` service — three data-access layers. Potential redundancy. | Consolidate to one canonical data-access layer (OrbitanQuery is the ADR-anchored one). |
| TD3 | `navigation-registry.js` → `audit-logs` item | Points to `/platform/audit-logs` which is a `<Navigate to="/audit-centre">` redirect. Functional, but indirect. | Point directly to `/audit-centre`. |
| TD4 | `/artifacts` (standalone) vs `/workspace/:tenantId/artifacts` | Duplicate destination for the Artifact Registry. | Confirm which is canonical; redirect the other. |
| TD5 | `useDashboardSnapshot` loads 6 entities client-side per tenant | Acceptable for pilots; at scale needs a server-side aggregate. | Tech-debt note, not a pilot blocker. |
| TD6 | Orphan files `Analytics.jsx` / `CompanyDashboard.jsx` | Already deleted in this pass. ✅ | — |

---

## Audit Lanes Completed
- [x] Route audit (top-level routes in `App.jsx`) — pass 1
- [x] Navigation registry cross-check — pass 1
- [x] Placeholder/demo data removal (3 surfaces)
- [x] Dark-mode contrast residue (2 components)

## Audit Lanes Remaining (deferred to subsequent passes)
- [ ] Full RBAC / RLS policy validation (all entities)
- [ ] Workflow validation (onboarding, lifecycle, finance, notifications, AI)
- [ ] UI/UX consistency pass (all screens)
- [ ] Component standardisation audit
- [ ] Platform Administration ("Control Panel") consolidation
- [ ] Blueprint Studio finalisation
- [ ] Performance optimisation
- [ ] Documentation audit
- [ ] Mobile/tablet/responsive + WCAG full pass

---

## Production Readiness Status
**Not yet determined.** Pass 1 removed one critical security/data-integrity defect (R1), two high-severity drift defects (R2, R3), and five accessibility residues (A1–A5). A full production-readiness verdict requires the remaining audit lanes to be executed. This report will be updated per pass.

## Recommended Next Pass
Pass 2: RBAC/RLS policy validation across all `base44/entities/*.jsonc` files + the `orbitan-nav.js` dead-code verification (TD1) + the duplicate `/artifacts` destination (TD4).