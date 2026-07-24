// ============================================================
// ORBITANOS — Attendance Policy Test Suite (Build Package #5, Phase 2)
// Backend runner — exercises the shared canonical attendance policy
// engine (base44/shared/attendancePolicy.ts) across the full MVP
// attendance workflow.
//
// Covers: clock in, clock out, breaks, missed clock out, late clock in,
// early clock out, missed break, extended break, overtime, off-day
// attendance, geofence, auto-approval rules, and payroll-readiness.
//
// Pure, deterministic, no DB. The authoritative source of truth for
// attendance exception detection is the shared policy engine — backend
// functions (clockController, attendanceReconciliation, attendanceReview)
// import from it. Evidence-first.
// ============================================================

import {
  evaluateClockRecord,
  shouldAutoApprove,
  ORBITAN_DEFAULT_ATTENDANCE_POLICY,
  ATTENDANCE_EXCEPTION_TYPES,
} from '../../shared/attendancePolicy.ts';

Deno.serve(async (_req) => {
  const tests = [];
  let passed = 0, failed = 0;

  function test(name, fn) {
    try { fn(); passed += 1; tests.push({ name, passed: true }); }
    catch (err) { failed += 1; tests.push({ name, passed: false, error: err?.message || String(err) }); }
  }
  function eq(a, e, m) {
    if (JSON.stringify(a) !== JSON.stringify(e))
      throw new Error(`${m || ''} got ${JSON.stringify(a)} expected ${JSON.stringify(e)}`);
  }
  function ok(v, m) { if (!v) throw new Error(m || 'expected truthy'); }
  function hasType(arr, type) { return Array.isArray(arr) && arr.some((x) => x.exception_type === type); }

  const policy = ORBITAN_DEFAULT_ATTENDANCE_POLICY;
  // A clean, on-time, fully-completed shift record (payroll-ready baseline).
  const base = (over = {}) => ({
    clock_in_time: '2026-07-24T09:00:00',
    scheduled_start: '2026-07-24T09:00:00',
    scheduled_end: '2026-07-24T17:00:00',
    clock_out_time: '2026-07-24T17:00:00',
    break_duration_mins: 30,
    total_hours_worked: 7.5,
    status: 'clocked_out',
    shift_id: 's1',
    ...over,
  });

  // ── Clock In / Lateness ──────────────────────────────────────
  test('clock-in: on-time, clean record → zero exceptions (payroll-ready)', () => {
    eq(evaluateClockRecord(base()), []);
  });
  test('clock-in: late within grace (6 min) → no late exception', () => {
    const r = base({ clock_in_time: '2026-07-24T09:06:00' });
    ok(!hasType(evaluateClockRecord(r), ATTENDANCE_EXCEPTION_TYPES.LATE_CLOCK_IN), '6 min within grace+threshold');
  });
  test('clock-in: 20 min late → late_clock_in (medium severity)', () => {
    const r = base({ clock_in_time: '2026-07-24T09:20:00' });
    const ex = evaluateClockRecord(r);
    ok(hasType(ex, ATTENDANCE_EXCEPTION_TYPES.LATE_CLOCK_IN));
    eq(ex.find((x) => x.exception_type === ATTENDANCE_EXCEPTION_TYPES.LATE_CLOCK_IN).severity, 'medium');
  });
  test('clock-in: 35 min late → late_clock_in (high severity)', () => {
    const r = base({ clock_in_time: '2026-07-24T09:35:00' });
    eq(evaluateClockRecord(r).find((x) => x.exception_type === ATTENDANCE_EXCEPTION_TYPES.LATE_CLOCK_IN).severity, 'high');
  });

  // ── Clock Out / Early Departure ──────────────────────────────
  test('clock-out: 20 min early → early_clock_out', () => {
    const r = base({ clock_out_time: '2026-07-24T16:40:00' });
    ok(hasType(evaluateClockRecord(r), ATTENDANCE_EXCEPTION_TYPES.EARLY_CLOCK_OUT));
  });
  test('clock-out: 5 min early (below threshold) → no early exception', () => {
    const r = base({ clock_out_time: '2026-07-24T16:55:00' });
    ok(!hasType(evaluateClockRecord(r), ATTENDANCE_EXCEPTION_TYPES.EARLY_CLOCK_OUT));
  });

  // ── Missed Clock Out ─────────────────────────────────────────
  test('missed clock-out: still clocked_in 60 min past end → missed_clock_out', () => {
    const past = new Date(Date.now() - 60 * 60000).toISOString();
    const r = base({ status: 'clocked_in', clock_out_time: undefined, scheduled_end: past });
    ok(hasType(evaluateClockRecord(r), ATTENDANCE_EXCEPTION_TYPES.MISSED_CLOCK_OUT));
  });
  test('missed clock-out: clocked_out normally → no missed_clock_out', () => {
    const r = base({ status: 'clocked_out' });
    ok(!hasType(evaluateClockRecord(r), ATTENDANCE_EXCEPTION_TYPES.MISSED_CLOCK_OUT));
  });

  // ── Breaks ───────────────────────────────────────────────────
  test('breaks: worked 7h with no break → missed_break', () => {
    const r = base({ break_duration_mins: 0, total_hours_worked: 7 });
    ok(hasType(evaluateClockRecord(r), ATTENDANCE_EXCEPTION_TYPES.MISSED_BREAK));
  });
  test('breaks: worked 5h (<6h threshold) with no break → no missed_break', () => {
    const r = base({ break_duration_mins: 0, total_hours_worked: 5 });
    ok(!hasType(evaluateClockRecord(r), ATTENDANCE_EXCEPTION_TYPES.MISSED_BREAK));
  });
  test('breaks: 75 min break (>60 max) → extended_break', () => {
    const r = base({ break_duration_mins: 75 });
    ok(hasType(evaluateClockRecord(r), ATTENDANCE_EXCEPTION_TYPES.EXTENDED_BREAK));
  });
  test('breaks: 30 min break (standard) → no break exception', () => {
    const r = base({ break_duration_mins: 30 });
    ok(!hasType(evaluateClockRecord(r), ATTENDANCE_EXCEPTION_TYPES.MISSED_BREAK));
    ok(!hasType(evaluateClockRecord(r), ATTENDANCE_EXCEPTION_TYPES.EXTENDED_BREAK));
  });

  // ── Overtime ────────────────────────────────────────────────
  test('overtime: 10h worked (>8h threshold) → overtime exception', () => {
    const r = base({ total_hours_worked: 10 });
    ok(hasType(evaluateClockRecord(r), ATTENDANCE_EXCEPTION_TYPES.OVERTIME));
  });
  test('overtime: 7.5h worked (under threshold) → no overtime', () => {
    const r = base({ total_hours_worked: 7.5 });
    ok(!hasType(evaluateClockRecord(r), ATTENDANCE_EXCEPTION_TYPES.OVERTIME));
  });

  // ── Off-Day Attendance ───────────────────────────────────────
  test('off-day: clock-in with no shift → off_day_attendance', () => {
    const r = base({ shift_id: undefined });
    ok(hasType(evaluateClockRecord(r, policy, {}), ATTENDANCE_EXCEPTION_TYPES.OFF_DAY_ATTENDANCE));
  });

  // ── Geofence ────────────────────────────────────────────────
  test('geofence: clock-in unverified when required → outside_geofence', () => {
    const p = { ...policy, require_geofence: true };
    const r = base({ clock_in_geo_verified: false });
    ok(hasType(evaluateClockRecord(r, p), ATTENDANCE_EXCEPTION_TYPES.OUTSIDE_GEOFENCE));
  });
  test('geofence: clock-in unverified when NOT required → no outside_geofence', () => {
    const r = base({ clock_in_geo_verified: false });
    ok(!hasType(evaluateClockRecord(r), ATTENDANCE_EXCEPTION_TYPES.OUTSIDE_GEOFENCE));
  });

  // ── Manager Approval / Auto-Approve Rules ───────────────────
  test('approval: low severity + not in require list → auto-approve true', () => {
    eq(shouldAutoApprove({ severity: 'low', exception_type: 'unknown_minor' }, policy), true);
  });
  test('approval: late_clock_in requires manager approval', () => {
    eq(shouldAutoApprove({ severity: 'low', exception_type: ATTENDANCE_EXCEPTION_TYPES.LATE_CLOCK_IN }, policy), false);
  });
  test('approval: medium severity never auto-approved', () => {
    eq(shouldAutoApprove({ severity: 'medium', exception_type: 'whatever' }, policy), false);
  });
  test('approval: high severity never auto-approved', () => {
    eq(shouldAutoApprove({ severity: 'high', exception_type: 'whatever' }, policy), false);
  });

  // ── Multi-exception + Payroll readiness ─────────────────────
  test('multi-exception: late + overtime detected together on one record', () => {
    const r = base({ clock_in_time: '2026-07-24T09:20:00', total_hours_worked: 10 });
    const ex = evaluateClockRecord(r);
    ok(hasType(ex, ATTENDANCE_EXCEPTION_TYPES.LATE_CLOCK_IN));
    ok(hasType(ex, ATTENDANCE_EXCEPTION_TYPES.OVERTIME));
  });
  test('payroll-ready: on-time, proper break, no overtime → zero exceptions', () => {
    const clean = base({ clock_in_time: '2026-07-24T09:00:00', clock_out_time: '2026-07-24T17:00:00', total_hours_worked: 7.5, break_duration_mins: 30 });
    eq(evaluateClockRecord(clean), []);
  });
  test('payroll-ready: null clock record → empty (fail-safe)', () => {
    eq(evaluateClockRecord(null), []);
  });

  const total = tests.length;
  const pass_rate = total ? Math.round((passed / total) * 100) + '%' : '0%';
  return Response.json({ summary: { total, passed, failed, pass_rate }, tests });
});