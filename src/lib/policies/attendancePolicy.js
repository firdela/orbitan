/**
 * OrbitanOS Policy Engine — Attendance Domain
 *
 * ADR-0052: Business logic is externalised into versioned policy objects.
 * Components and backend functions call the evaluation engine; they never
 * read raw thresholds directly.
 *
 * This module ships the **Orbitan Default Attendance Policy** (v1.0.0) and a
 * pure evaluation function that detects attendance exceptions from a
 * completed ClockRecord.
 *
 * Phase 1 (MVP): System default. Every tenant uses this policy.
 * Phase 2 (Growth): Per-tenant overrides resolved at runtime with fallback
 *   to this default.
 * Phase 3 (Enterprise): Shield-governed, audit-logged policy changes.
 */

// ─── Orbitan Default Attendance Policy v1.0.0 ────────────────────────────────

export const ORBITAN_DEFAULT_ATTENDANCE_POLICY = {
  version: '1.0.0',
  domain: 'attendance',

  // Lateness
  grace_period_mins: 5,          // Clock-in within this window is not flagged
  late_threshold_mins: 10,       // At/above this → late_clock_in exception

  // Early departure
  early_leave_threshold_mins: 10, // At/above this → early_clock_out exception

  // Breaks
  standard_break_mins: 30,        // Expected unpaid break per shift
  max_break_mins: 60,             // Above this → extended_break exception
  require_break: true,            // If true and no break recorded → missed_break

  // Overtime
  overtime_threshold_hours: 8,    // Hours above this → overtime exception
  overtime_multiplier: 1.5,       // Pay multiplier for overtime hours

  // Geofence
  require_geofence: false,        // MVP: geofence is optional
  geofence_radius_m: 200,

  // Approval rules — which exception types require manager approval
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

  // Auto-approve exceptions below this severity (minutes of deviation)
  auto_approve_below_mins: 5,
};

// ─── Exception Types ────────────────────────────────────────────────────────

export const ATTENDANCE_EXCEPTION_TYPES = {
  LATE_CLOCK_IN:       'late_clock_in',
  EARLY_CLOCK_OUT:     'early_clock_out',
  MISSED_CLOCK_OUT:    'missed_clock_out',
  MISSED_BREAK:        'missed_break',
  EXTENDED_BREAK:      'extended_break',
  OVERTIME:            'overtime',
  OFF_DAY_ATTENDANCE:  'off_day_attendance',
  OUTSIDE_GEOFENCE:    'outside_geofence',
  DUPLICATE_CLOCK:     'duplicate_clock',
  MANUAL_ENTRY:        'manual_entry',
};

// ─── Pure Evaluation Engine ──────────────────────────────────────────────────

/**
 * Evaluates a completed ClockRecord against an attendance policy and returns
 * an array of detected exception descriptors. Pure function — no side effects.
 *
 * @param {Object} clockRecord  - The completed ClockRecord (must have clock_in_time,
 *                                clock_out_time, total_hours_worked, etc.)
 * @param {Object} policy       - Attendance policy object (defaults to Orbitan Default)
 * @param {Object} context      - { shift, has_scheduled_shift } optional context
 * @returns {Array<{ exception_type: string, severity: string, details: string, detected_at: string }>}
 */
export function evaluateClockRecord(clockRecord, policy = ORBITAN_DEFAULT_ATTENDANCE_POLICY, context = {}) {
  if (!clockRecord) return [];

  const exceptions = [];
  const now = new Date().toISOString();
  const policyVersion = policy.version || '1.0.0';

  const { shift } = context;

  // ── Late Clock In ──────────────────────────────────────────────────────────
  if (clockRecord.clock_in_time && clockRecord.scheduled_start) {
    const scheduled = new Date(clockRecord.scheduled_start);
    const actual = new Date(clockRecord.clock_in_time);
    const lateMins = Math.round((actual - scheduled) / 60000);

    if (lateMins > policy.grace_period_mins && lateMins >= policy.late_threshold_mins) {
      exceptions.push({
        exception_type: ATTENDANCE_EXCEPTION_TYPES.LATE_CLOCK_IN,
        severity: lateMins >= 30 ? 'high' : lateMins >= 15 ? 'medium' : 'low',
        details: `Clocked in ${lateMins} minutes late (scheduled ${new Date(clockRecord.scheduled_start).toLocaleTimeString()}, actual ${new Date(clockRecord.clock_in_time).toLocaleTimeString()}). Grace period: ${policy.grace_period_mins} min.`,
        detected_at: now,
        policy_version: policyVersion,
      });
    }
  }

  // ── Early Clock Out ────────────────────────────────────────────────────────
  if (clockRecord.clock_out_time && clockRecord.scheduled_end) {
    const scheduled = new Date(clockRecord.scheduled_end);
    const actual = new Date(clockRecord.clock_out_time);
    const earlyMins = Math.round((scheduled - actual) / 60000);

    if (earlyMins >= policy.early_leave_threshold_mins) {
      exceptions.push({
        exception_type: ATTENDANCE_EXCEPTION_TYPES.EARLY_CLOCK_OUT,
        severity: earlyMins >= 60 ? 'high' : earlyMins >= 30 ? 'medium' : 'low',
        details: `Clocked out ${earlyMins} minutes early (scheduled end ${new Date(clockRecord.scheduled_end).toLocaleTimeString()}).`,
        detected_at: now,
        policy_version: policyVersion,
      });
    }
  }

  // ── Missed Clock Out ───────────────────────────────────────────────────────
  // If the record status is clocked_out but clock_out_time is null, or if the
  // shift ended but no clock_out was recorded (detected by a scheduled automation
  // in production; here we flag records that are still clocked_in past scheduled end).
  if (clockRecord.status === 'clocked_in' && clockRecord.scheduled_end) {
    const scheduledEnd = new Date(clockRecord.scheduled_end);
    if (new Date() > scheduledEnd && (new Date() - scheduledEnd) / 60000 > policy.grace_period_mins) {
      exceptions.push({
        exception_type: ATTENDANCE_EXCEPTION_TYPES.MISSED_CLOCK_OUT,
        severity: 'high',
        details: `Still clocked in ${Math.round((new Date() - scheduledEnd) / 60000)} minutes past scheduled end.`,
        detected_at: now,
        policy_version: policyVersion,
      });
    }
  }

  // ── Missed Break ──────────────────────────────────────────────────────────
  if (policy.require_break && clockRecord.status === 'clocked_out') {
    const workedMins = (clockRecord.total_hours_worked || 0) * 60 + (clockRecord.break_duration_mins || 0);
    if (workedMins > 6 * 60 && (!clockRecord.break_duration_mins || clockRecord.break_duration_mins === 0)) {
      exceptions.push({
        exception_type: ATTENDANCE_EXCEPTION_TYPES.MISSED_BREAK,
        severity: 'medium',
        details: `Worked ${Math.round(workedMins / 60 * 10) / 10} hours with no recorded break. Policy requires a ${policy.standard_break_mins}-min break.`,
        detected_at: now,
        policy_version: policyVersion,
      });
    }
  }

  // ── Extended Break ────────────────────────────────────────────────────────
  if (clockRecord.break_duration_mins && clockRecord.break_duration_mins > policy.max_break_mins) {
    exceptions.push({
      exception_type: ATTENDANCE_EXCEPTION_TYPES.EXTENDED_BREAK,
      severity: 'medium',
      details: `Break duration ${clockRecord.break_duration_mins} min exceeds the maximum of ${policy.max_break_mins} min.`,
      detected_at: now,
      policy_version: policyVersion,
    });
  }

  // ── Overtime ──────────────────────────────────────────────────────────────
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

  // ── Off-Day Attendance ────────────────────────────────────────────────────
  // No scheduled shift for today but a clock record exists
  if (clockRecord.clock_in_time && !shift && !clockRecord.shift_id) {
    exceptions.push({
      exception_type: ATTENDANCE_EXCEPTION_TYPES.OFF_DAY_ATTENDANCE,
      severity: 'low',
      details: 'Clocked in on a day with no scheduled shift.',
      detected_at: now,
      policy_version: policyVersion,
    });
  }

  // ── Outside Geofence ─────────────────────────────────────────────────────
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
 * Determines whether an exception should be auto-approved (below threshold)
 * or requires manager review.
 */
export function shouldAutoApprove(exception, policy = ORBITAN_DEFAULT_ATTENDANCE_POLICY) {
  const lowSeverity = exception.severity === 'low';
  return lowSeverity && !policy.require_manager_approval_for.includes(exception.exception_type);
}