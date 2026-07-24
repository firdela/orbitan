# Build Package #7 — MVP Product Completion (Worker Portal data-wiring fix)

> **Status:** Implemented — 2026-07-24
> **Phase:** Product Delivery (Build Manifest Phase 3 Feature Layer)
> **Directive:** Product Authority Build Package #7 — shift from harnesses to
> product completion.

## Shift in focus

Per the Product Authority correction, this package prioritises real product
functionality over internal tooling. The assessment confirmed the Worker
Portal is already substantially wired to the real backend (real
`clockController` invocations, audit logging, live entity queries) — so the
highest-value work was fixing **verified data-wiring bugs** that silently
broke the frontline user's primary screen, not building more screens.

## Confirmed bugs found + fixed (`src/pages/WorkerPortal.jsx`)

All four were verified by code analysis against the entity schemas, the RLS
`{{user.id}}` templates, and `clockController` (which uses the global
`user.id` as the operational key).

### 1. Workers saw NO tasks (critical)
- **Root cause:** Task query used a non-existent field `assigned_to` and keyed
  on `employee.id` (Employee record id). The Task entity has no `assigned_to`
  field (canonical field is `responsible_agent_id`), and per Task RLS
  (`data.responsible_agent_id: "{{user.id}}"`) the operational key is the
  global `user.id`, not the Employee record id.
- **Impact:** `liveTasks` was always empty → Tasks tab, home "Pending Tasks",
  progress %, and urgent-task badge all showed nothing for every worker.
- **Fix:** query `base44.entities.Task.filter({ tenant_id, responsible_agent_id: userId })`
  where `userId = user.id`.

### 2. Workers saw NO shifts (critical)
- **Root cause:** Shift query keyed on `employee.id`; Shift RLS
  (`data.employee_id: "{{user.id}}"`) and the scheduling system key on
  `user.id`.
- **Impact:** `liveShifts` always empty → Shifts tab + home "today's shift"
  showed nothing.
- **Fix:** query `base44.entities.Shift.filter({ tenant_id, employee_id: userId })`.

### 3. Workers saw NO clock records / attendance % always 0 (critical)
- **Root cause:** `clockRecords` query keyed on `employee.id`, but
  `clockController` writes `ClockRecord.employee_id = user.id` and ClockRecord
  RLS reads `data.employee_id: "{{user.id}}"`. (The live clock *status* worked
  because it calls the backend, which uses `user.id` internally.)
- **Impact:** attendance % showed 0, the "pending verification" compliance
  gate never appeared, and the timesheet link had no backing history.
- **Fix:** query `base44.entities.ClockRecord.filter({ tenant_id, employee_id: userId })`.

### 4. Task "Undo" wrote an invalid status (medium)
- **Root cause:** Undo set `status: 'pending'`, but `'pending'` is not in the
  Task status enum (draft/assigned/acknowledged/in_progress/blocked/
  submitted_for_review/changes_required/completed/verified/cancelled/archived).
- **Impact:** undoing a completed task would persist an invalid status,
  breaking later transitions/display.
- **Fix:** Undo now sets `status: 'in_progress'` (a valid pre-completion state).

## Why this is the highest-value work this turn

These four bugs are on the **single most-used screen** (the frontline worker's
portal) and they made three core MVP workflows invisible to the user — tasks,
scheduling, and personal attendance history — despite the backend being
correct and wired. No amount of additional screens or polish would have
surfaced this; the worker would have logged in to an empty app. Fixing them
makes the verified foundation actually *operable* by a real user.

## Files modified

- `src/pages/WorkerPortal.jsx` — four find_replace fixes (Task/Shift/ClockRecord
  query key `employee.id`→`user.id` + Task field `assigned_to`→`responsible_agent_id`
  + Undo status `pending`→`in_progress` + cache invalidation key realigned).

## Verification note (honest)

The fix is verified by code analysis against schemas + RLS + clockController.
Live end-to-end confirmation (a real worker logging in and seeing their
tasks/shifts/records) is the recommended next step — Build Package #8
(Orbitan Test Lab Live E2E), which will exercise exactly this screen with a
real non-admin user.

## Remaining product-completion work (scoped, not done this turn)

The directive's full scope (finish every UI page, every CRUD, every workflow,
all UX polish across all modules) is larger than one verifiable increment.
Genuinely unfinished areas requiring dedicated work, in priority order:

1. **Manager Workforce / Timesheet review** — verify the manager-side
   approval flow wires to `attendanceReview` and renders the now-visible
   worker clock records + exceptions.
2. **Payroll snapshot generation** — wire the TimesheetManager "lock period"
   action to produce `PayrollSnapshot` records from approved `ClockRecord`s.
3. **Inventory / Procurement / Goods Receipt / Stock Count** CRUD
   completion + search/filter/pagination where missing.
4. **Sales / Expenses / Recipes / Suppliers** CRUD completion.
5. **Compliance / Training / AI Documents** workflow completion.
6. **Dashboard / Reports** real aggregation (vs. current widgets).
7. **UX polish + responsiveness + a11y** sweep across all module pages.

These are real product gaps; they need page-by-page reading + implementation,
not a single pass. Each is a candidate for its own focused build package.

## MVP completion estimate (conservative, revised)

**~62%.** The foundation (identity, access, RLS, attendance policy, shield
decision contract) was already verified; this package makes the worker's
primary screen *actually work* (tasks, shifts, attendance history now
visible). The gap to 85–90% is the manager-side flows, payroll wiring, the
inventory/finance/sales CRUD sweeps, dashboard/report aggregation, and
UI/UX polish — i.e. real operational breadth, not foundations.

## Next recommended build package (ONE)

**Build Package #8 — Manager-side Workforce + Payroll wiring.** With worker
clock records now visible, complete the manager loop: Timesheet review /
approval (wired to `attendanceReview`), AttendanceException queue decisions,
and PayrollSnapshot generation from approved clock records. This closes the
Attendance critical path end-to-end (the MVP's headline workflow) and is the
single highest-value step toward an operable MVP.