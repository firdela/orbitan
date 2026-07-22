import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  ORBITAN_DEFAULT_ATTENDANCE_POLICY,
  evaluateClockRecord,
  ATTENDANCE_EXCEPTION_TYPES,
} from '../../shared/attendancePolicy.ts';

/**
 * Attendance Reconciliation — Scheduled detection of conditions that cannot
 * be caught at clock-out:
 *   - Missed clock-out (shift ended, employee still clocked_in or no clock record)
 *   - Absence (scheduled shift with no clock record at all)
 *   - Duplicate clock events (multiple active records same day)
 *
 * Invoked by a scheduled automation (every 15 minutes). Admin-only — the
 * automation runs with a service-role token.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Allow service-role invocation from scheduled automation (no user)
    // OR admin invocation from dashboard
    const isAdmin = user && user.role === 'admin';
    if (user && !isAdmin) {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const policy = ORBITAN_DEFAULT_ATTENDANCE_POLICY;

    let missedClockOuts = 0;
    let absences = 0;
    let duplicates = 0;
    let exceptionsCreated = 0;

    // ── Fetch all shifts that are scheduled or in_progress for today ──
    const allShifts = await base44.asServiceRole.entities.Shift.filter({
      date: today,
      status: { $in: ['scheduled', 'confirmed', 'in_progress'] },
    });

    for (const shift of allShifts) {
      if (!shift.tenant_id || !shift.outlet_id) continue;
      const scheduledEnd = new Date(`${shift.date}T${shift.end_time}:00`);
      const minsPastEnd = (now.getTime() - scheduledEnd.getTime()) / 60000;

      // Only process shifts past their scheduled end + grace period
      if (minsPastEnd < policy.missed_clock_out_grace_mins) continue;

      // Check for clock records for this shift
      const clockRecords = await base44.asServiceRole.entities.ClockRecord.filter({
        tenant_id: shift.tenant_id, shift_id: shift.id,
      });

      if (clockRecords.length === 0) {
        // ── ABSENCE: scheduled shift, no clock record at all ──
        const emp = await base44.asServiceRole.entities.Employee.filter({ id: shift.employee_id });
        const empName = emp.length > 0 ? emp[0].full_name : shift.employee_name || 'Unknown';

        // Check if an absence exception already exists
        const existing = await base44.asServiceRole.entities.AttendanceException.filter({
          tenant_id: shift.tenant_id, shift_id: shift.id, exception_type: 'missed_clock_out',
        });
        if (existing.length === 0) {
          // Create an absent ClockRecord
          const cr = await base44.asServiceRole.entities.ClockRecord.create({
            tenant_id: shift.tenant_id, outlet_id: shift.outlet_id,
            employee_id: shift.employee_id, employee_name: empName,
            shift_id: shift.id, date: shift.date,
            scheduled_start: new Date(`${shift.date}T${shift.start_time}:00`).toISOString(),
            scheduled_end: scheduledEnd.toISOString(),
            status: 'absent',
            validation_status: 'pending',
          });
          await base44.asServiceRole.entities.AttendanceException.create({
            tenant_id: shift.tenant_id, outlet_id: shift.outlet_id,
            employee_id: shift.employee_id, employee_name: empName,
            shift_id: shift.id, clock_record_id: cr.id,
            exception_type: 'missed_clock_out', severity: 'high',
            detected_at: now.toISOString(),
            details: `No clock record for scheduled shift (${shift.start_time}–${shift.end_time}). Marked absent.`,
            policy_version: policy.version, status: 'pending_review',
          });
          await base44.asServiceRole.entities.Shift.update(shift.id, { status: 'absent' });
          absences++;
          exceptionsCreated++;
        }
      } else {
        // ── MISSED CLOCK-OUT: still clocked in past scheduled end ──
        for (const cr of clockRecords) {
          if (cr.status === 'clocked_in' || cr.status === 'on_break') {
            const existing = await base44.asServiceRole.entities.AttendanceException.filter({
              tenant_id: shift.tenant_id, clock_record_id: cr.id, exception_type: 'missed_clock_out',
            });
            if (existing.length === 0) {
              const evaluatedRecord = {
                ...cr,
                scheduled_start: cr.scheduled_start || new Date(`${shift.date}T${shift.start_time}:00`).toISOString(),
                scheduled_end: cr.scheduled_end || scheduledEnd.toISOString(),
              };
              const detected = evaluateClockRecord(evaluatedRecord, policy, { shift });
              const missedExc = detected.find((e: any) => e.exception_type === ATTENDANCE_EXCEPTION_TYPES.MISSED_CLOCK_OUT);
              if (missedExc) {
                await base44.asServiceRole.entities.AttendanceException.create({
                  tenant_id: shift.tenant_id, outlet_id: shift.outlet_id,
                  employee_id: cr.employee_id, employee_name: cr.employee_name,
                  shift_id: shift.id, clock_record_id: cr.id,
                  exception_type: 'missed_clock_out', severity: 'high',
                  detected_at: missedExc.detected_at, details: missedExc.details,
                  policy_version: missedExc.policy_version, status: 'pending_review',
                });
                missedClockOuts++;
                exceptionsCreated++;
              }
            }
          }

          // ── DUPLICATE: multiple active records same day ──
          if (clockRecords.length > 1) {
            const activeRecords = clockRecords.filter((r: any) => ['clocked_in', 'on_break'].includes(r.status));
            if (activeRecords.length > 1) {
              const existing = await base44.asServiceRole.entities.AttendanceException.filter({
                tenant_id: shift.tenant_id, clock_record_id: activeRecords[0].id, exception_type: 'duplicate_clock',
              });
              if (existing.length === 0) {
                await base44.asServiceRole.entities.AttendanceException.create({
                  tenant_id: shift.tenant_id, outlet_id: shift.outlet_id,
                  employee_id: activeRecords[0].employee_id, employee_name: activeRecords[0].employee_name,
                  shift_id: shift.id, clock_record_id: activeRecords[0].id,
                  exception_type: 'duplicate_clock', severity: 'medium',
                  detected_at: now.toISOString(),
                  details: `${activeRecords.length} active clock records found for the same shift.`,
                  policy_version: policy.version, status: 'pending_review',
                });
                duplicates++;
                exceptionsCreated++;
              }
            }
          }
        }
      }
    }

    return Response.json({
      success: true,
      date: today,
      summary: {
        shifts_checked: allShifts.length,
        missed_clock_outs: missedClockOuts,
        absences, duplicates,
        exceptions_created: exceptionsCreated,
      },
    });
  } catch (error) {
    console.error('attendanceReconciliation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});