# Build Package #8 — Manager Operations + Payroll MVP

> **Status:** Implemented — 2026-07-24
> **Phase:** Build Manifest Phase 3 Feature Layer (Manager operational loop)
> **Directive:** Product Authority Build Package #8

## What was already in place (reused, not rebuilt)

Assessment found the manager operational loop substantially built and wired:
- **`attendanceReview` backend** — transactional exception approve/reject with
  ClockRecord update + AuditLog + server-side manager-role enforcement.
- **WorkforcePage** (`/workspace/:tenantId/workforce`) — mounted, real:
  directory (search/filter), access requests, invitations, Attendance
  Exceptions tab (→ `AttendanceExceptionQueue` → `attendanceReview`),
  punctuality/performance.
- **`AttendanceExceptionQueue`** — real: lists reviewable exceptions, calls
  `attendanceReview`, confirm dialog with manager notes.
- **`TimesheetManager`** — real: validate approve/reject, generate payroll
  from approved-only records, lock snapshots, audit logs.
- **`PayrollSummaryCard`** — real presentational payroll preview.
- **`OrbitanQuery`** — the single data-abstraction layer enforcing
  tenant + outlet scoping.

So the foundation was correct and wired — this package closed the
**reachability + completeness** gaps rather than rebuilding.

## Completed this package

### Part B — Attendance Review completion
1. **`TimesheetManager` is now reachable.** It was an orphaned page using a
   legacy `AppShell` with hardcoded `/t1/*` nav (no route, 404 on every nav
   link). Refactored: dropped the `AppShell` wrapper + legacy `NAV` constant
   and mounted it in the workspace layout at
   `/workspace/:tenantId/timesheets` (App.jsx route added). It now renders
   inside the canonical `WorkspaceLayout` chrome — no double nav, no dead
   links. Managers can now validate clock records (approve/reject) through
   the real backend + audit.
2. **"Request clarification" review action.** `attendanceReview` previously
   only supported `approved`/`rejected`. Added `request_clarification`: a
   non-decisive review that moves the exception to `employee_justified` so
   the worker can submit/revise a reason — with mandatory manager notes and
   an AuditLog entry (`attendance_clarification_requested`). The
   `AttendanceExceptionQueue` dialog now exposes a "Request Clarification"
   button alongside Approve/Reject (Part B: "request clarification").
3. **Workforce → Timesheets link.** WorkforcePage's Attendance Exceptions
   tab now links to the Timesheets & Payroll page, so the manager flow is
   discoverable from the Control Room.

### Part C — Payroll preparation completion
4. **Payroll reopening with audit.** `TimesheetManager` had lock + dispute
   but no reopen. Added `handleReopenSnapshot`: a locked snapshot returns
   to `draft`, its included ClockRecords are unlocked
   (`payroll_locked=false`, `payroll_snapshot_id=''`), and an AuditLog
   (`payroll_reopened`) is written. `PayrollSummaryCard` shows a
   "Reopen for Editing" button on locked snapshots. This completes the
   lock/reopen audit loop the directive required.
5. **Payroll-from-approved-only reaffirmed.** `computePayrollForEmployee`
   already filtered to `validation_status === 'approved'` records only —
   verified, no change needed (Part C: "Do NOT generate payroll from
   unapproved records").

## Files modified
- `src/pages/workforce/TimesheetManager.jsx` — dropped legacy `AppShell` +
  `NAV`; added `handleReopenSnapshot` (unlock + audit); pass `onReopen`.
- `src/components/workforce/PayrollSummaryCard.jsx` — `onReopen` prop +
  "Reopen for Editing" button on locked snapshots; `Unlock` icon import.
- `src/components/workforce/AttendanceExceptionQueue.jsx` — "Request
  Clarification" decision option + confirm-copy.
- `base44/functions/attendanceReview/entry.ts` — `request_clarification`
  action (→ `employee_justified` + audit).
- `src/pages/outlet/WorkforcePage.jsx` — `Link` to `timesheets` +
  `ClipboardList` import.
- `src/App.jsx` — `TimesheetManager` import + `/workspace/:tenantId/timesheets` route.
- `src/docs/knowledge-hub/CHANGELOG.md` — entry.

## Bugs fixed
- **Orphaned TimesheetManager page** (unreachable; legacy `/t1/*` nav 404s) —
  now mounted in the workspace and rendered inside `WorkspaceLayout`.
- **Missing payroll reopen** — locked payroll could not be re-edited; now
  reopenable with full audit trail.
- **No "request clarification" path** — exceptions could only be
  approved/rejected; now a clarification loop exists.

## Verification note (honest)
Logic verified by code reading against `attendanceReview`, `OrbitanQuery`,
ClockRecord/PayrollSnapshot/AttendanceException schemas. Live confirmation
(a real manager validating a record → generating → locking → reopening,
and an exception clarification round-trip) is the recommended Test Lab step.

## Remaining manager-side work (scoped, not done this turn)
- Part D: Manager dashboard real-time widgets (present/absent/late/clocked-in
  counts) — the workspace dashboard widgets need wiring to live ClockRecord
  aggregation; currently some are static/placeholder.
- Part E: Notification flow (worker submit → manager notify → worker decision)
  — `notificationDispatcher` backend exists; the review-decision → worker
  notification wiring is not yet end-to-end.
- Part F: Per-module CRUD polish (search/filter/pagination/confirmation)
  across remaining manager-facing modules (Inventory, Procurement, Sales,
  Expenses, Compliance, Training).
- Manager view of per-employee clock history / training completion /
  compliance status tabs within WorkforcePage.

## MVP completion estimate (conservative)
**~68%.** The manager attendance-review + payroll critical path
(validate → approve/reject → request clarification → generate from
approved-only → lock → reopen-with-audit) is now complete and reachable,
closing the operational loop with the worker clock flow fixed in Package #7.
Gap to 85–90%: manager dashboard real-time widgets, notification
round-trip, and the inventory/procurement/sales/finance CRUD sweeps.

## Next recommended build package (ONE)
**Build Package #9 — Manager Dashboard real-time widgets + Notification
round-trip.** Wire the manager dashboard KPI tiles (present/absent/late/
on-leave/clocked-in/pending-approvals/attendance-exceptions) to live
ClockRecord + Shift + AttendanceException aggregation, and complete the
notification flow (exception raised → manager notified → decision → worker
notified). This makes the manager's daily operating screen genuinely live
and closes the human-in-the-loop communication gap — the next highest-value
step toward an operable pilot-ready MVP.