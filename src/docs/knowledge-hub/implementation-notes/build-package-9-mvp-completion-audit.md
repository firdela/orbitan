# Build Package #9 — MVP Completion Audit + Workflow Integration

> **Status:** Audit delivered — 2026-07-24
> **Phase:** Build Manifest Phase 3 (pre-pilot completion pass)
> **Directive:** Product Authority Build Package #9 — application audit + workflow completion
> **Method:** Evidence-first. Read each surface; report only confirmed findings; change only confirmed defects.

This package shifts the build role from **feature builder** to **product finisher**.
No new features were built. Existing modules were inspected end-to-end and
only confirmed defects were remediated. Findings below are organised by the
directive's Parts A–H.

---

## Part A — Application Audit (confirmed findings)

### Verified clean (no action)
- **Routing surface (`src/App.jsx`)** — every workspace route (`/workspace/:tenantId/*`) resolves to a real imported page; no orphan routes, no unused imports in the route map. Legacy `/outlet/*` module routes are correctly redirected to `/workspace` (Navigate replace).
- **`WorkspaceLayout`** — dynamic tenant resolver; membership check + platform-admin bypass + worker→`/worker` gate + fail-closed redirect. Hook order is stable (no conditional hooks). No hardcoded tenant slugs.
- **`RoleGateway` (`/workspace`)** — correct canonical routing: admin→`/leader-org`, worker→`/worker`, manager→`/workspace/:tenantId`, no-membership→`/join`. No legacy `/company` or `/outlet` targets.
- **`ManifestNav` + `ManifestHydrator`** — manifest-driven nav with Graceful Lockout; `FALLBACK_NAV` prefixes every route with `/workspace/:tenantId` (matches App.jsx). Items with no route are skipped (no dead links). Hidden-modules filter removes empty sections.
- **`WorkspaceDashboard`** — real, live data via `useDashboardSnapshot` (tenant-scoped, fail-closed, realtime). Loading (`—`), error (destructive banner), and empty states present. Module cards link to real routes. NOT mock/placeholder.
- **`WorkforcePage`** — real directory (search/filter), access requests, invitations, attendance exceptions (→ `attendanceReview`), punctuality tab. Real `useWorkforceCounts`.
- **`TimesheetManager`** — (Package #8) now reachable at `/workspace/:tenantId/timesheets`; validate→approve/reject→payroll-from-approved→lock→reopen, all audited.

### Confirmed defects found & fixed
| # | Finding | Part | Severity | Fix |
|---|---|---|---|---|
| 1 | "OrbitanOS Console" (`/leader-org`) nav link appended to **every** tenant by `ManifestHydrator.buildManifestNav`, but `LeaderOrg` has no role guard and exposes platform-wide tenant + governance data. Dead/forbidden link for non-admins. | E | High | `WorkspaceLayout` now filters `leader_org` out of the nav for non-platform-admins; admins still see it. |

### Confirmed findings — remaining (documented, not fixed this turn)
| # | Finding | Part | Severity | Why deferred |
|---|---|---|---|---|
| R1 | `/company` (`CompanyDashboard`) and `/outlet` (`OutletDashboard`) are legacy standalone routes. `RoleGateway` never routes to them; reachable only by direct URL. Candidates for removal but inbound-link verification across all pages is required before deletion. | A/E/F | Med | Removal of reachable-by-bookmark routes is not "confirmed dead" until inbound links verified. |
| R2 | Manager dashboard lacks attendance-specific KPIs (Present / Absent / Late / On Leave / Clocked In / Clocked Out / Pending Approvals / Attendance Exceptions). `useDashboardSnapshot` fetches inventory/POs/tasks/sales/shifts/compliance but not ClockRecord/AttendanceException. | D | Med | Adding these is net-new widget work (recommended Package #10), not a defect in existing code. |
| R3 | `LeaderOrg` itself has no client-side role guard; it relies on entity RLS to scope data. Defence-in-depth: a role gate (redirect non-admins) would prevent the page rendering broken/empty sections for non-admins who reach it by direct URL. | B/E | Med | RLS already prevents data leakage; a UI gate is hardening, not a fix. |
| R4 | `AppShell` receives a `manifestSource` prop it does not destructure (harmless dead prop from `WorkspaceLayout`). | F | Low | Cosmetic; no behavioural impact. |
| R5 | Several module pages (Inventory, Procurement, Sales, Expenses, Recipes, Suppliers, Compliance, Training) were not exhaustively read this pass; their CRUD completeness / loading / empty / validation states are unverified. | A/D/F | Med | Exhaustive per-page audit of 60+ pages exceeds a single pass; recommended as a dedicated QA sweep (Package #11). |

---

## Part B — Workflow Completion (end-to-end verification)

Verified chains (by code reading against real backends + RLS):

1. **Identity → Membership → Workspace** — `identityLinkage` stamps `user_id` on Employee; `WorkspaceProvider` resolves memberships keyed on `user_id`; `RoleGateway` routes by active role. ✅ (verified green in `accessValidationHarness` 16/16)
2. **Worker clock → attendance** — `clockController` writes ClockRecord keyed on `user.id`; Worker Portal reads by `user.id` (Package #7 fix). Policy engine evaluates exceptions (`attendanceReconciliation`). ✅
3. **Manager attendance review → payroll** — `AttendanceExceptionQueue` → `attendanceReview` (approve/reject/request_clarification, transactional ClockRecord update + audit). `TimesheetManager` validate → generate from approved-only → lock → reopen-with-audit. ✅ (Package #8)
4. **Audit** — `auditEngine` / direct `AuditLog.create` on every state transition (clock, review, payroll lock/reopen, identity link, signature). ✅

**Not yet end-to-end (deferred):**
- **Notifications round-trip** (worker submit → manager notify → worker decision): `notificationDispatcher` backend exists; the review-decision → worker notification wiring is not confirmed end-to-end. (Recommended Package #10.)
- **Payroll → Finance (Xero)**: `financeController` / `financeSyncProcessor` / `xeroOAuth` exist; live Xero connection not authorised (`<authorized_app_connectors>` empty). Wiring unverified without credentials.

---

## Part C — Module Integration (verified)

- **Attendance ↔ Tasks ↔ Payroll** — ClockRecord → exception → review → payroll snapshot → lock; all share `tenant_id`/`outlet_id`/`employee_id` keys consistently. ✅
- **Workforce ↔ Scheduling ↔ Timesheets** — WorkforcePage links to Timesheets (Package #8); Shift ↔ ClockRecord linkage via `shift_id`. ✅
- **Dashboard ↔ all modules** — `useDashboardSnapshot` aggregates Inventory/PO/Tasks/Sales/Shifts/Compliance into the manager landing. ✅ (attendance metrics absent — R2)

**Unverified integrations (deferred):** Recipes↔Inventory cost rollup (`calculateRecipeCost` exists), Procurement↔GoodsReceipt↔StockCount↔Inventory reconciliation, Sales↔FinanceSyncQueue, Marketplace/Training/Compliance document flows — each needs a live-data integration test (Package #10/11).

---

## Part D — UX Completion (sampled)

- **Loading states** — present on Dashboard (`—` placeholders), Workforce (`isLoading`), TimesheetManager (spinners), AttendanceExceptionQueue (`Loader2`). ✅
- **Empty states** — `EmptyState` used in Workforce, TimesheetManager, AttendanceExceptionQueue. ✅
- **Error handling** — Dashboard error banner; auth flows inline errors (per platform standard). `attendanceReview` returns structured errors. ✅
- **Confirmation dialogs** — AttendanceExceptionQueue confirm step; payroll lock/reopen implicit. ✅
- **Responsive** — AppShell sidebar collapses to mobile drawer; grids use `sm:`/`lg:` breakpoints. ✅ (full a11y/contrast audit deferred to Package #11)

---

## Part E — Navigation Audit

- No `/t1/*` legacy nav remains (removed from TimesheetManager in Package #8).
- Workspace nav is manifest-driven; fallback nav routes all match App.jsx.
- **Fixed:** `/leader-org` link hidden for non-admins (Finding #1).
- **Remaining:** legacy `/company` + `/outlet` standalone routes (R1) — verify inbound links before removal.

---

## Part F — Architecture Cleanup

- **No dead code removed this turn.** All removals must be "confirmed dead"; the only candidate blocks (legacy standalone routes) require inbound-link verification first (R1).
- `manifestSource` dead prop (R4) — left in place (harmless).
- No duplicate business logic found in the surfaces read this pass (`OrbitanQuery` remains the single data abstraction; `attendancePolicy.ts` the single policy engine).

---

## Part G — Performance (sampled)

- **Duplicate queries** — none found in surfaces read. `useWorkforceCounts` is shared between WorkforcePage and Dashboard (canonical, deduped via React Query keys).
- **`useDashboardSnapshot`** batches six entity reads; acceptable for MVP scale.
- **`TimesheetManager`** client-side date filtering on up to 200 records — acceptable for MVP; may need server-side date filtering at scale.
- Full bundle-size / render-perf audit deferred (Package #11).

---

## Part H — Documentation

- This file (`build-package-9-mvp-completion-audit.md`) — full audit.
- `CHANGELOG.md` — Package #9 entry.

---

## Files modified
- `src/components/workspace/WorkspaceLayout.jsx` — filter `leader_org` nav item for non-platform-admins (Finding #1).
- `src/docs/knowledge-hub/implementation-notes/build-package-9-mvp-completion-audit.md` — new (this file).
- `src/docs/knowledge-hub/CHANGELOG.md` — entry.

## Files removed
None — no confirmed dead code safe to remove in this pass.

## Pages completed
None newly built (audit-only package). `TimesheetManager` reachability + `LeaderOrg` nav gating are the two concrete fixes.

## Routes fixed
- `/leader-org` nav link no longer shown to non-admins (prevents dead/forbidden navigation).

## Workflow completed
Attendance review → payroll → lock → reopen audit loop confirmed complete and reachable (Package #7 + #8 + this nav fix).

## Technical debt
- R1–R5 above (legacy standalone routes, missing attendance KPI widgets, LeaderOrg UI gate, dead prop, unverified module pages).
- Exhaustive per-page CRUD/UX/a11y audit of 60+ pages not feasible in one pass — recommended as dedicated QA sweep.
- Live Xero/finance integration unverified (no authorised connector).
- Notification round-trip unconfirmed end-to-end.

## Remaining MVP work
1. Manager dashboard attendance KPI widgets (Present/Absent/Late/Clocked In/Out/Pending Approvals/Exceptions).
2. Notification round-trip (review decision → worker notification).
3. F&B operational modules CRUD completeness sweep (Inventory, Procurement, Sales, Expenses, Recipes, Suppliers, Goods Receipt, Stock Count).
4. Legacy route removal (`/company`, `/outlet`) after inbound-link verification.
5. Xero/Finance live integration authorisation + end-to-end test.
6. UI/UX, accessibility (WCAG 2.1), responsiveness, and performance pass.

## Estimated MVP completion (conservative)
**~70%.** The audit confirms the foundation (identity, access, attendance, payroll, audit, worker portal, manager review) is real, wired, and reachable. The remaining 30% is: attendance dashboard widgets, notification round-trip, F&B CRUD sweeps, finance live integration, and the UX/a11y/perf polish pass.

## Next recommended build package (ONE)
**Build Package #10 — Manager Dashboard attendance widgets + Notification round-trip.**
Wire the attendance KPI tiles (Present/Absent/Late/On Leave/Clocked In/Clocked Out/Pending Approvals/Attendance Exceptions) to live ClockRecord + Shift + AttendanceException aggregation, and complete the notification flow (exception/decision → manager ↔ worker). This makes the manager's daily operating screen genuinely live and closes the last human-in-the-loop communication gap — the highest-value step toward an operable, pilot-ready MVP, and a natural follow-on to the R2/R-deferred items in this audit.