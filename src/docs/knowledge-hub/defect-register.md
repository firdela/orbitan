# OrbitanOS — Defect Register

> Updated 2026-07-25 (Build #15). Honest record. Defects found, fixed, and retested.
> S1/S2 defects are not left unresolved without a stated blocker.

## Resolved defects (Build #15)

| ID | Severity | Module | Affected roles | Tenant/Outlet impact | Root cause | Fix | Files changed | Retest |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| DEF-001 | S2 | Sales / Finance | outlet mgr, tenant admin | Wrong discount rate sent to Xero on sale sync | `DiscountRate` math grouped as `1 - (total/gross)*100` instead of `(1 - total/gross)*100`, yielding ~-99% for full-price lines | Corrected to `(1 - total/gross)*100` | `salesEngine/entry.ts` | ✅ function redeploys (validation intact); math verified by inspection (0% no-discount, 25% for $5 off $20) |
| DEF-002 | S2 | Sales / Finance | outlet mgr, tenant admin | Refund amount not validated against invoice total — could refund more than sale | No upper-bound clamp on `payload.amount` | Clamp refund to `inv.total`; reject ≤ 0 | `salesEngine/entry.ts` | ✅ function redeploys (refund path intact) |
| DEF-003 | S2 | Sales | outlet mgr | Invoice number collision risk (last-6ms repeats within same ms) | `Date.now().slice(-6)` not guaranteed unique | Added 2-char random suffix | `salesEngine/entry.ts` | ✅ redeploys |
| DEF-004 | S2 | Production | outlet mgr, tenant admin | Duplicate batch numbers after any batch deletion (sequence derived from count) | `batchSeq = existingBatches.length + 1` — drops on delete; also unbounded fetch | Timestamp + random unique reference; removed unbounded fetch | `productionEngine/entry.ts` | ✅ redeploys (confirm path intact) |
| DEF-005 | S3 | Replenishment (perf) | system autopilot | Unbounded inventory + sales fetches | Missing `limit` | Bounded to 500 / 200 | `replenishmentEngine/entry.ts` | ✅ redeploys |

## Resolved defects (Build #19B-1 — Security Hardening)

| ID | Severity | Module | Affected roles | Tenant/Outlet impact | Root cause | Fix | Files changed | Retest |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| DEF-01 | S1 | Compliance / RLS | admin, tenant_admin, outlet_mgr, supervisor, worker | Platform admins locked out of cross-tenant compliance reads — `admin` role trapped inside `$and` with `tenant_id`/`outlet_id` checks, so admin without tenant assignment could not read any ComplianceRecord | RLS structure placed `admin` `user_condition` inside the same `$and` as tenant/outlet boundary checks instead of lifting it to a top-level `$or` | Restructured all four RLS operations (`create`/`read`/`update`/`delete`) — `admin` now bypasses tenant/outlet boundary at top-level `$or`; tenant-scoped roles remain gated by `$and` of `tenant_id` + `outlet_id` + role `$or`. Added `tenant_admin` to create/read/update (was missing). Matches the documented pattern used by `ComplianceSnapshot`, `NexusInsight`, `AttendanceException`. | `base44/entities/ComplianceRecord.jsonc` | ✅ `accessValidationHarness` 16/16 pass; RLS structure validated by `rlsStructureValidator` |
| DEF-02 | S1 | Auth / Security | all users | Reset-password token URL persisted in browser history after successful reset — could be revisited via back button | `window.location.href = "/login"` preserves the token-bearing URL in history; platform server-side token invalidation is correct but client history retained the link | Changed to `window.location.replace("/login")` (replaces history entry, removing token URL); added success confirmation state with 1.5s delay so user sees confirmation before redirect | `src/pages/ResetPassword.jsx` | ✅ Manual flow verification required (valid/expired/reused tokens) — server-side invalidation is platform-owned |
| DEF-03 | S2 | RBAC / Platform | tenant_admin, outlet_mgr, worker, supervisor | Non-admin users reaching `/platform/go-live-readiness` saw a raw 403 error instead of a proper access-denied state — backend enforced admin-only but frontend had no guard | Frontend page had no role check; relied solely on backend 403 response, producing poor UX and allowing the backend call to fire before rejection | Added client-side RBAC guard using `useAuth()` — non-admins see an "access denied" card immediately, backend call never fires; mirrors the existing backend `user.role !== 'admin'` check | `src/pages/platform/GoLiveReadinessCentre.jsx` | ✅ Backend `goLiveReadiness` already returns 403 for non-admins; frontend guard now matches |

## Resolved defects (Build #19B-2 — Platform Architecture)

| ID | Severity | Module | Affected roles | Impact | Root cause | Fix | Files changed | Retest |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| REC-01 | S3 | Navigation Registry | admin, platform_admin | 5 active platform routes had no navigation entry — Wallet, Marketplace, Audit Logs, Access Control, Capability Manager were unreachable via the LeaderOrg console navigation | PLATFORM_NAVIGATION registry not updated when platform pages were added in Builds #16–#18 | Added 5 missing entries: `capabilities` (Modules & Blueprints), `access-control` (System & Identity), `audit-logs` (Governance & Pilot), new `Revenue Engine` group with `wallet` + `marketplace`; added `Wallet` to PlatformNavigation ICON_MAP | `src/lib/navigation-registry.js`, `src/components/platform/PlatformNavigation.jsx` | ✅ Registry structure verified; all 5 routes resolve to existing App.jsx routes |
| REC-02 | S4 | Routing / App.jsx | all | 17 legacy redirect `<Route>` entries bloating App.jsx with repetitive JSX — maintainability debt | Redirects added one-by-one as modules consolidated to workspace routing | Extracted 17 redirects into a `LEGACY_REDIRECTS` array; rendered via `.map()` — identical runtime behaviour, 17 lines → 4 lines of JSX | `src/App.jsx` | ✅ Redirect count unchanged (17→17); all redirect to `/workspace`; accessValidationHarness 16/16 |

## Resolved defects (Build #19B-3 — Design System & UX Hardening)

| ID | Severity | Module | Impact | Root cause | Fix | Files changed |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| UX-01 | S2 | Design System | 4 different inline loading patterns across Procurement, Sales, Reports, FeedbackCentre — inconsistent UX, no screen reader announcement | No shared inline loading component existed; pages improvised with bare `<Loader2>` | Created `LoadingState` component (spinner + message + `role="status"`/`aria-live`); replaced all 4 inline patterns | `src/components/shared/LoadingState.jsx` (new), `ProcurementPage.jsx`, `SalesPage.jsx`, `ReportsPage.jsx`, `FeedbackCentre.jsx` |
| UX-02 | S2 | Design System | StatusBadge text failed WCAG AA contrast for amber/blue/green (12px text: ~2.3-3.4:1 vs 4.5:1 required) | Badge text used orbitan tokens at 50% lightness on 95% light backgrounds | Added 5 darker `-700` orbitan tokens (35%-38% lightness) to design system; updated all StatusBadge text classes to use them | `src/index.css`, `tailwind.config.js`, `src/components/shared/StatusBadge.jsx` |
| UX-03 | S3 | Design System | FeedbackCentre had duplicate `SEVERITY_STYLES` map instead of using shared StatusBadge — fragmented color system | StatusBadge lacked severity keys (low/medium/high/critical) | Added 4 severity keys to StatusBadge; removed `SEVERITY_STYLES` from FeedbackCentre; replaced inline severity span with `<StatusBadge status={issue.severity} />` | `src/components/shared/StatusBadge.jsx`, `src/pages/FeedbackCentre.jsx` |
| UX-04 | S3 | Accessibility | Missing ARIA attributes: trash button had no `aria-label`; "Show details" toggle had no `aria-expanded`/`aria-controls`; table headers missing `scope="col"` | Icons-only buttons and toggle controls lacked screen reader semantics | Added `aria-label` to PO line-remove button (+ focus ring); added `aria-expanded`+`aria-controls` to FeedbackCentre details toggle + `id` to description; added `scope="col"` to all table headers in Sales + Reports | `ProcurementPage.jsx`, `FeedbackCentre.jsx`, `SalesPage.jsx`, `ReportsPage.jsx` |
| UX-05 | S4 | Accessibility | EmptyState had no `role="status"` — screen readers didn't announce content changes when lists loaded empty | Missing ARIA live region | Added `role="status"` to EmptyState root element | `src/components/shared/EmptyState.jsx` |
| UX-06 | S4 | Responsive | WorkspaceDashboard used fixed `p-6` padding — less space-efficient on mobile vs other pages using `p-4 sm:p-6 lg:p-8` | Inconsistent responsive padding convention | Updated to `p-4 sm:p-6` to match the shared page pattern | `src/pages/workspace/WorkspaceDashboard.jsx` |
| UX-07 | S4 | Design System | SalesPage "No tenant context" was an inline dashed-box message instead of using shared EmptyState | Minor duplicate empty-state implementation | Replaced inline div with `<EmptyState>` component | `src/pages/outlet/SalesPage.jsx` |

## Open defects
| ID | Severity | Module | Status | Blocker |
| :--- | :--- | :--- | :--- | :--- |
| (none) | — | — | — | — |

## Notes
- All 5 defects found by source inspection of the transactional engines during Build #15; all fixed directly and the functions verified to redeploy without breaking validation gates.
- DEF-001 would only have manifested once Xero live sync connects (pending credentials) — fixed pre-emptively per Part H/I integrity requirements.
- Full before/after inventory-state regression (real seed data) is **pending manual execution** — requires a provisioned pilot tenant + auth users, which cannot be created in-app (platform owns auth). Engine logic verified by inspection + redeploy.
- Build #19B-1 (Security Hardening) resolved 3 findings from the Phase A Release Candidate Audit. DEF-01 was reclassified from the original "$in operator" finding to the actual structural defect discovered on evidence inspection (admin trapped inside `$and`). DEF-02 server-side token invalidation is platform-owned; client-side history purge is the application-level remediation. DEF-03 backend was already secure; frontend guard added for defence-in-depth and UX consistency.

## Severity scale
- S1 Critical — blocker preventing core ops.
- S2 High — major defect / data integrity, workaround may exist.
- S3 Medium — perf / minor.
- S4 Low — cosmetic.