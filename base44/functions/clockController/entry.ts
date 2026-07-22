import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  ORBITAN_DEFAULT_ATTENDANCE_POLICY,
  evaluateClockRecord,
} from '../../shared/attendancePolicy.ts';

/**
 * Clock Controller — Authoritative attendance execution.
 *
 * Actions: clock_in | start_break | end_break | clock_out | get_status | get_timesheet
 *
 * Policy evaluation happens HERE (backend), not in the frontend. Exceptions
 * created by this function are the system of record (ADR-0052).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, shift_id, lat, lng, photo_url, notes, employee_id, date_from, date_to } = body;

    const tenantId = user.data?.tenant_id;
    const outletId = user.data?.outlet_id;
    if (!tenantId || !outletId) {
      return Response.json({ error: 'User not associated with a tenant/outlet' }, { status: 400 });
    }

    const isManager = ['admin', 'tenant_admin', 'outlet_manager', 'supervisor'].includes(user.role);
    const targetEmployeeId = isManager && employee_id ? employee_id : user.id;

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // ── CLOCK IN ─────────────────────────────────────────────────────────────
    if (action === 'clock_in') {
      const existing = await base44.entities.ClockRecord.filter({
        tenant_id: tenantId, outlet_id: outletId, employee_id: targetEmployeeId,
        date: today, status: { $in: ['clocked_in', 'on_break'] },
      });
      if (existing.length > 0) {
        return Response.json({ error: 'Already clocked in', record: existing[0] }, { status: 400 });
      }

      // Fetch linked shift to populate scheduled_start / scheduled_end
      let shift = null;
      let scheduledStart: string | null = null;
      let scheduledEnd: string | null = null;
      if (shift_id) {
        const shifts = await base44.entities.Shift.filter({ id: shift_id });
        if (shifts.length > 0) {
          shift = shifts[0];
          scheduledStart = new Date(`${shift.date}T${shift.start_time}:00`).toISOString();
          scheduledEnd = new Date(`${shift.date}T${shift.end_time}:00`).toISOString();
        }
      }

      const geoVerified = !!lat && !!lng;
      const record = await base44.entities.ClockRecord.create({
        tenant_id: tenantId, outlet_id: outletId,
        employee_id: targetEmployeeId, employee_name: user.full_name,
        shift_id: shift_id || '', date: today,
        clock_in_time: now,
        clock_in_method: lat ? 'geo' : photo_url ? 'photo' : 'pin',
        clock_in_lat: lat || null, clock_in_lng: lng || null,
        clock_in_geo_verified: geoVerified,
        clock_in_photo_url: photo_url || '', clock_in_photo_verified: !!photo_url,
        scheduled_start: scheduledStart || null,
        scheduled_end: scheduledEnd || null,
        late_mins: scheduledStart ? Math.max(0, Math.round((new Date(now).getTime() - new Date(scheduledStart).getTime()) / 60000)) : 0,
        break_duration_mins: 0,
        status: 'clocked_in',
        notes: notes || '',
      });

      if (shift_id) {
        await base44.entities.Shift.update(shift_id, { clock_in: now, clock_in_method: lat ? 'geo' : 'pin', status: 'in_progress' });
      }

      return Response.json({ success: true, action: 'clock_in', record });
    }

    // ── START BREAK ──────────────────────────────────────────────────────────
    if (action === 'start_break') {
      const records = await base44.entities.ClockRecord.filter({
        tenant_id: tenantId, outlet_id: outletId, employee_id: targetEmployeeId,
        date: today, status: 'clocked_in',
      });
      if (records.length === 0) {
        return Response.json({ error: 'No active clock-in to start break from' }, { status: 400 });
      }
      const record = records[0];
      if (record.break_start_time) {
        return Response.json({ error: 'Break already started' }, { status: 400 });
      }
      const updated = await base44.entities.ClockRecord.update(record.id, {
        break_start_time: now, status: 'on_break',
      });
      return Response.json({ success: true, action: 'start_break', record: updated });
    }

    // ── END BREAK ────────────────────────────────────────────────────────────
    if (action === 'end_break') {
      const records = await base44.entities.ClockRecord.filter({
        tenant_id: tenantId, outlet_id: outletId, employee_id: targetEmployeeId,
        date: today, status: 'on_break',
      });
      if (records.length === 0) {
        return Response.json({ error: 'No active break to end' }, { status: 400 });
      }
      const record = records[0];
      if (!record.break_start_time) {
        return Response.json({ error: 'Break start time missing' }, { status: 400 });
      }
      const breakMins = Math.round((new Date(now).getTime() - new Date(record.break_start_time).getTime()) / 60000);
      const updated = await base44.entities.ClockRecord.update(record.id, {
        break_end_time: now,
        break_duration_mins: breakMins,
        status: 'clocked_in',
      });
      return Response.json({ success: true, action: 'end_break', record: updated, break_duration_mins: breakMins });
    }

    // ── CLOCK OUT ────────────────────────────────────────────────────────────
    if (action === 'clock_out') {
      const openRecords = await base44.entities.ClockRecord.filter({
        tenant_id: tenantId, outlet_id: outletId, employee_id: targetEmployeeId,
        date: today, status: { $in: ['clocked_in', 'on_break'] },
      });
      if (openRecords.length === 0) {
        return Response.json({ error: 'No active clock-in found for today' }, { status: 400 });
      }
      const record = openRecords[0];
      const clockInTime = new Date(record.clock_in_time);
      const clockOutTime = new Date(now);

      // If still on break, auto-end it
      let breakMins = record.break_duration_mins || 0;
      if (record.status === 'on_break' && record.break_start_time) {
        breakMins = Math.round((clockOutTime.getTime() - new Date(record.break_start_time).getTime()) / 60000);
      }

      const totalMins = (clockOutTime.getTime() - clockInTime.getTime()) / 60000;
      const workedHours = Math.max(0, (totalMins - breakMins) / 60);
      const overtimeHours = Math.max(0, workedHours - ORBITAN_DEFAULT_ATTENDANCE_POLICY.overtime_threshold_hours);

      // Pay rate
      let payRate = 0;
      const employees = await base44.entities.Employee.filter({ id: targetEmployeeId });
      if (employees.length > 0) {
        const emp = employees[0];
        payRate = emp.pay_type === 'hourly' ? (emp.pay_rate || 0) : (emp.pay_rate || 0) / (26 * 8);
      }
      const regularCost = (workedHours - overtimeHours) * payRate;
      const overtimeCost = overtimeHours * payRate * ORBITAN_DEFAULT_ATTENDANCE_POLICY.overtime_multiplier;

      // Tasks
      const tasks = await base44.entities.Task.filter({ tenant_id: tenantId, outlet_id: outletId, assigned_to: targetEmployeeId });
      const todayTasks = tasks.filter((t: any) => t.due_date === today);
      const completedToday = todayTasks.filter((t: any) => t.status === 'completed').length;
      const productivityScore = todayTasks.length > 0 ? Math.round((completedToday / todayTasks.length) * 100) : 100;

      const earlyLeaveMins = record.scheduled_end
        ? Math.max(0, Math.round((new Date(record.scheduled_end).getTime() - clockOutTime.getTime()) / 60000))
        : 0;

      const updated = await base44.entities.ClockRecord.update(record.id, {
        clock_out_time: now,
        clock_out_lat: lat || null, clock_out_lng: lng || null,
        clock_out_geo_verified: !!lat,
        clock_out_photo_url: photo_url || '',
        break_end_time: record.status === 'on_break' ? now : record.break_end_time,
        break_duration_mins: breakMins,
        total_hours_worked: Math.round(workedHours * 100) / 100,
        overtime_hours: Math.round(overtimeHours * 100) / 100,
        early_leave_mins: earlyLeaveMins,
        labour_cost: Math.round(regularCost * 100) / 100,
        overtime_cost: Math.round(overtimeCost * 100) / 100,
        total_shift_cost: Math.round((regularCost + overtimeCost) * 100) / 100,
        tasks_assigned: todayTasks.length, tasks_completed: completedToday,
        productivity_score: productivityScore,
        status: 'clocked_out',
      });

      if (record.shift_id) {
        await base44.entities.Shift.update(record.shift_id, { clock_out: now, status: 'completed' });
      }

      // ── Authoritative policy evaluation (backend, system of record) ──────
      let shift = null;
      if (record.shift_id) {
        const shifts = await base44.entities.Shift.filter({ id: record.shift_id });
        if (shifts.length > 0) shift = shifts[0];
      }
      const evaluatedRecord = {
        ...updated, scheduled_start: record.scheduled_start, scheduled_end: record.scheduled_end,
      };
      const detected = evaluateClockRecord(evaluatedRecord, ORBITAN_DEFAULT_ATTENDANCE_POLICY, { shift });

      let exceptionsCreated = 0;
      for (const exc of detected) {
        try {
          await base44.entities.AttendanceException.create({
            tenant_id: tenantId, outlet_id: outletId,
            employee_id: targetEmployeeId, employee_name: user.full_name,
            employee_role: user.role,
            shift_id: record.shift_id || '', clock_record_id: record.id,
            exception_type: exc.exception_type, severity: exc.severity,
            detected_at: exc.detected_at, details: exc.details,
            policy_version: exc.policy_version, status: 'pending_review',
          });
          exceptionsCreated++;
        } catch (e) { /* individual failure shouldn't block clock-out */ }
      }

      return Response.json({
        success: true, action: 'clock_out',
        summary: {
          hours_worked: Math.round(workedHours * 100) / 100,
          overtime_hours: Math.round(overtimeHours * 100) / 100,
          break_duration_mins: breakMins,
          labour_cost: Math.round(regularCost * 100) / 100,
          total_shift_cost: Math.round((regularCost + overtimeCost) * 100) / 100,
          productivity_score: productivityScore,
          tasks_completed: completedToday, tasks_assigned: todayTasks.length,
          exceptions_detected: detected.length, exceptions_created: exceptionsCreated,
        },
        record: updated,
      });
    }

    // ── GET STATUS ───────────────────────────────────────────────────────────
    if (action === 'get_status') {
      const records = await base44.entities.ClockRecord.filter({
        tenant_id: tenantId, outlet_id: outletId, employee_id: targetEmployeeId, date: today,
      });
      return Response.json({
        success: true, date: today,
        status: records.length > 0 ? records[0].status : 'not_clocked_in',
        record: records[0] || null,
      });
    }

    // ── GET TIMESHEET ────────────────────────────────────────────────────────
    if (action === 'get_timesheet') {
      if (!isManager) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const filter: any = { tenant_id: tenantId, outlet_id: outletId };
      if (employee_id) filter.employee_id = employee_id;
      const allRecords = await base44.entities.ClockRecord.filter(filter);
      const filtered = allRecords.filter((r: any) => {
        if (date_from && r.date < date_from) return false;
        if (date_to && r.date > date_to) return false;
        return true;
      });
      const totalHours = filtered.reduce((s: number, r: any) => s + (r.total_hours_worked || 0), 0);
      const totalLabourCost = filtered.reduce((s: number, r: any) => s + (r.total_shift_cost || r.labour_cost || 0), 0);
      const payrollEligible = filtered.filter((r: any) => r.validation_status === 'approved').length;
      return Response.json({
        success: true, records: filtered,
        summary: {
          total_records: filtered.length,
          total_hours: Math.round(totalHours * 100) / 100,
          total_labour_cost: Math.round(totalLabourCost * 100) / 100,
          payroll_eligible: payrollEligible,
        },
      });
    }

    return Response.json({ error: 'Invalid action. Use: clock_in | start_break | end_break | clock_out | get_status | get_timesheet' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});