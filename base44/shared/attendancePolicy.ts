/**
 * OrbitanOS Policy Engine — Attendance Domain (Backend Canonical)
 *
 * ADR-0052: Business logic is externalised into versioned policy objects.
 * Backend functions (clockController, attendanceReconciliation, attendanceReview)
 * import from this shared module. The frontend has its own copy for immediate
 * UI feedback, but THIS module is the system of record — exceptions created
 * here are authoritative.
 *
 * Phase 1 (MVP): System default. Every tenant uses this policy.
 * Phase 2 (Growth): Per-tenant overrides resolved at runtime.
 * Phase 3 (Enterprise): Shield-governed, audit-logged policy changes.
 */

// ─── Orbitan Default Attendance Policy v1.0.0 ────────────────────────────────

export const ORBITAN_DEFAULT_ATTENDANCE_POLICY = {
  version: '1.0.0',
  domain: 'attendance',

  // Lateness
  grace_period_mins: 5,
  late_threshold_mins: 10,

  // Early departure
  early_leave_threshold_mins: 10,

  // Breaks
  standard_break_mins: 30,
  max_break_mins: 60,
  require_break: true,
  min_hours_for_break: 6, // Only flag missed_break if worked > this many hours

  // Overtime
  overtime_threshold_hours: 8,
  overtime_multiplier: 1.5,

  // Geofence
  require_geofence: false,
  geofence_radius_m: 200,

  // Reconciliation
  missed_clock_out_grace_mins: 30, // How long past scheduled end before flagging

  // Approval rules
  require_manager_approval_for: [
    'late_clock_in',
    'early_clock_out',
    'missed_clock_out',
    'missed_break',
    'extended_break',
    'overtime',
    'off_day_attendance',
    'outside_geofence',
    'duplicate_clock',
    'manual_entry',
  ],

  auto_approve_below_mins: 5,
};

// ─── Exception Types ────────────────────────────────────────────────────────

export const ATTENDANCE_EXCEPTION_TYPES = {
  LATE_CLOCK_IN: 'late_clock_in',
  EARLY_CLOCK_OUT: 'early_clock_out',
  MISSED_CLOCK_OUT: 'missed_clock_out',
  MISSED_BREAK: 'missed_break',
  EXTENDED_BREAK: 'extended_break',
  OVERTIME: 'overtime',
  OFF_DAY_ATTENDANCE: 'off_day_attendance',
  OUTSIDE_GEOFENCE: 'outside_geofence',
  DUPLICATE_CLOCK: 'duplicate_clock',
  MANUAL_ENTRY: 'manual_entry',
};

// ─── Pure Evaluation Engine ──────────────────────────────────────────────────

/**
 * Evaluates a completed (or in-progress) ClockRecord against an attendance
 * policy and returns an array of detected exception descriptors.
 * Pure function — no side effects.
 */
export function evaluateClockRecord(
  clockRecord: any,
  policy: any = ORBITAN_DEFAULT_ATTENDANCE_POLICY,
  context: any = {},
): any[] {
  if (!clockRecord) return [];

  const exceptions: any[] = [];
  const now = new Date().toISOString();
  const policyVersion = policy.version || '1.0.0';
  const { shift } = context;

  // ── Late Clock In ──
  if (clockRecord.clock_in_time && clockRecord.scheduled_start) {
    const scheduled = new Date(clockRecord.scheduled_start);
    const actual = new Date(clockRecord.clock_in_time);
    const lateMins = Math.round((actual.getTime() - scheduled.getTime()) / 60000);

    if (lateMins > policy.grace_period_mins && lateMins >= policy.late_threshold_mins) {
      exceptions.push({
        exception_type: ATTENDANCE_EXCEPTION_TYPES.LATE_CLOCK_IN,
        severity: lateMins >= 30 ? 'high' : lateMins >= 15 ? 'medium' : 'low',
        details: `Clocked in ${lateMins} minutes late (scheduled ${formatTime(clockRecord.scheduled_start)}, actual ${formatTime(clockRecord.clock_in_time)}). Grace period: ${policy.grace_period_mins} min.`,
        detected_at: now,
        policy_version: policyVersion,
      });
    }
  }

  // ── Early Clock Out ──
  if (clockRecord.clock_out_time && clockRecord.scheduled_end) {
    const scheduled = new Date(clockRecord.scheduled_end);
    const actual = new Date(clockRecord.clock_out_time);
    const earlyMins = Math.round((scheduled.getTime() - actual.getTime()) / 60000);

    if (earlyMins >= policy.early_leave_threshold_mins) {
      exceptions.push({
        exception_type: ATTENDANCE_EXCEPTION_TYPES.EARLY_CLOCK_OUT,
        severity: earlyMins >= 60 ? 'high' : earlyMins >= 30 ? 'medium' : 'low',
        details: `Clocked out ${earlyMins} minutes early (scheduled end ${formatTime(clockRecord.scheduled_end)}).`,
        detected_at: now,
        policy_version: policyVersion,
      });
    }
  }

  // ── Missed Clock Out (still clocked in past scheduled end + grace) ──
  if (clockRecord.status === 'clocked_in' && clockRecord.scheduled_end) {
    const scheduledEnd = new Date(clockRecord.scheduled_end);
    const elapsedPastEnd = (new Date().getTime() - scheduledEnd.getTime()) / 60000;
    if (elapsedPastEnd > policy.missed_clock_out_grace_mins) {
      exceptions.push({
        exception_type: ATTENDANCE_EXCEPTION_TYPES.MISSED_CLOCK_OUT,
        severity: 'high',
        details: `Still clocked in ${Math.round(elapsedPastEnd)} minutes past scheduled end (${formatTime(clockRecord.scheduled_end)}).`,
        detected_at: now,
        policy_version: policyVersion,
      });
    }
  }

  // ── Missed Break (only for completed records that worked long enough) ──
  if (policy.require_break && clockRecord.status === 'clocked_out') {
    const workedMins = (clockRecord.total_hours_worked || 0) * 60 + (clockRecord.break_duration_mins || 0);
    if (workedMins > policy.min_hours_for_break * 60 && (!clockRecord.break_duration_mins || clockRecord.break_duration_mins === 0)) {
      exceptions.push({
        exception_type: ATTENDANCE_EXCEPTION_TYPES.MISSED_BREAK,
        severity: 'medium',
        details: `Worked ${Math.round(workedMins / 60 * 10) / 10} hours with no recorded break. Policy requires a ${policy.standard_break_mins}-min break.`,
        detected_at: now,
        policy_version: policyVersion,
      });
    }
  }

  // ── Extended Break ──
  if (clockRecord.break_duration_mins && clockRecord.break_duration_mins > policy.max_break_mins) {
    exceptions.push({
      exception_type: ATTENDANCE_EXCEPTION_TYPES.EXTENDED_BREAK,
      severity: 'medium',
      details: `Break duration ${clockRecord.break_duration_mins} min exceeds the maximum of ${policy.max_break_mins} min.`,
      detected_at: now,
      policy_version: policyVersion,
    });
  }

  // ── Overtime ──
  if (clockRecord.total_hours_worked && clockRecord.total_hours_worked > policy.overtime_threshold_hours) {
    const otHours = clockRecord.total_hours_worked - policy.overtime_threshold_hours;
    exceptions.push({
      exception_type: ATTENDANCE_EXCEPTION_TYPES.OVERTIME,
      severity: otHours > 2 ? 'high' : 'medium',
      details: `Worked ${clockRecord.total_hours_worked} hours — ${Math.round(otHours * 10) / 10} hours above the ${policy.overtime_threshold_hours}-hour threshold.`,
      detected_at: now,
      policy_version: policyVersion,
    });
  }

  // ── Off-Day Attendance ──
  if (clockRecord.clock_in_time && !shift && !clockRecord.shift_id) {
    exceptions.push({
      exception_type: ATTENDANCE_EXCEPTION_TYPES.OFF_DAY_ATTENDANCE,
      severity: 'low',
      details: 'Clocked in on a day with no scheduled shift.',
      detected_at: now,
      policy_version: policyVersion,
    });
  }

  // ── Outside Geofence ──
  if (policy.require_geofence && clockRecord.clock_in_geo_verified === false) {
    exceptions.push({
      exception_type: ATTENDANCE_EXCEPTION_TYPES.OUTSIDE_GEOFENCE,
      severity: 'medium',
      details: 'Clock-in location could not be verified against the approved geofence.',
      detected_at: now,
      policy_version: policyVersion,
    });
  }

  return exceptions;
}

/**
 * Determines whether an exception should be auto-approved or requires review.
 */
export function shouldAutoApprove(exception: any, policy: any = ORBITAN_DEFAULT_ATTENDANCE_POLICY): boolean {
  return exception.severity === 'low' && !policy.require_manager_approval_for.includes(exception.exception_type);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}