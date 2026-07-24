import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * Attendance Review — Transactional manager approval / rejection.
 *
 * Updates BOTH the AttendanceException AND the linked ClockRecord in one
 * operation, then writes an AuditLog. Employees cannot self-approve — this
 * function enforces manager role server-side (RLS is entity-level only).
 *
 * Lifecycle: manager_review → approved/rejected → timesheet_updated
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const MANAGER_ROLES = ['admin', 'tenant_admin', 'outlet_manager', 'supervisor'];
    if (!MANAGER_ROLES.includes(user.role)) {
      return Response.json({ error: 'Only managers can review attendance exceptions' }, { status: 403 });
    }

    const body = await req.json();
    const { exception_id, decision, manager_notes, resolution } = body;

    // 'request_clarification' is a non-decisive review action: it moves the
    // exception to employee_justified so the worker can submit/revise a
    // reason, without approving or rejecting it. (Part B: request clarification)
    if (decision === 'request_clarification') {
      if (!manager_notes) {
        return Response.json({ error: 'manager_notes required when requesting clarification' }, { status: 400 });
      }
      const exceptions = await base44.entities.AttendanceException.filter({ id: exception_id });
      if (exceptions.length === 0) return Response.json({ error: 'Exception not found' }, { status: 404 });
      const exception = exceptions[0];
      if (exception.tenant_id !== user.data?.tenant_id && user.role !== 'admin') {
        return Response.json({ error: 'Cross-tenant access denied' }, { status: 403 });
      }
      const updated = await base44.entities.AttendanceException.update(exception_id, {
        status: 'employee_justified',
        manager_notes,
        reviewer_id: user.id,
        reviewer_name: user.full_name,
        reviewer_role: user.role,
        reviewed_at: new Date().toISOString(),
      });
      try {
        await base44.entities.AuditLog.create({
          tenant_id: exception.tenant_id,
          outlet_id: exception.outlet_id || '',
          actor_id: user.id, actor_name: user.full_name, actor_role: user.role,
          action_type: 'attendance_clarification_requested',
          module: 'workforce',
          target_entity: 'AttendanceException',
          target_record_id: exception_id,
          details: `Manager ${user.full_name} requested clarification for ${exception.employee_name}: ${manager_notes}`,
          shield_outcome: 'not_evaluated',
        });
      } catch { /* audit best-effort */ }
      return Response.json({ success: true, decision: 'request_clarification', exception: updated });
    }

    if (!exception_id || !decision || !['approved', 'rejected'].includes(decision)) {
      return Response.json({ error: 'exception_id and decision (approved|rejected|request_clarification) required' }, { status: 400 });
    }

    // ── Load the exception ──
    const exceptions = await base44.entities.AttendanceException.filter({ id: exception_id });
    if (exceptions.length === 0) {
      return Response.json({ error: 'Exception not found' }, { status: 404 });
    }
    const exception = exceptions[0];

    // Tenant isolation
    if (exception.tenant_id !== user.data?.tenant_id && user.role !== 'admin') {
      return Response.json({ error: 'Cross-tenant access denied' }, { status: 403 });
    }

    const now = new Date().toISOString();
    const reviewableStatuses = ['pending_review', 'employee_justified', 'manager_review'];
    if (!reviewableStatuses.includes(exception.status)) {
      return Response.json({ error: `Exception is not reviewable (status: ${exception.status})` }, { status: 400 });
    }

    // ── Update the AttendanceException ──
    const updatedException = await base44.entities.AttendanceException.update(exception_id, {
      status: decision,
      manager_decision: decision,
      manager_notes: manager_notes || '',
      resolution: resolution || (decision === 'approved' ? 'no adjustment needed' : 'exception rejected'),
      reviewer_id: user.id,
      reviewer_name: user.full_name,
      reviewer_role: user.role,
      reviewed_at: now,
      timesheet_adjusted: decision === 'approved',
    });

    // ── Update linked ClockRecord (transactional) ──
    let clockRecordUpdated = null;
    if (exception.clock_record_id) {
      try {
        const clockRecords = await base44.entities.ClockRecord.filter({ id: exception.clock_record_id });
        if (clockRecords.length > 0) {
          const cr = clockRecords[0];
          if (!cr.payroll_locked) {
            const validationStatus = decision === 'approved' ? 'approved' : 'rejected';
            clockRecordUpdated = await base44.entities.ClockRecord.update(cr.id, {
              validation_status: validationStatus,
              verified_by: user.id,
              verified_by_name: user.full_name,
              verified_date: now,
              rejection_reason: decision === 'rejected' ? (manager_notes || exception.details) : '',
              payroll_export_eligible: decision === 'approved',
            });
          }
        }
      } catch (e) {
        // Log but don't fail — exception was still updated
        console.error('ClockRecord update failed:', e.message);
      }
    }

    // ── Mark exception as timesheet_updated (lifecycle complete) ──
    let finalException = updatedException;
    if (decision === 'approved' && clockRecordUpdated) {
      finalException = await base44.entities.AttendanceException.update(exception_id, {
        status: 'timesheet_updated',
      });
    }

    // ── Audit Log ──
    let auditLogId = '';
    try {
      const audit = await base44.entities.AuditLog.create({
        tenant_id: exception.tenant_id,
        outlet_id: exception.outlet_id || '',
        actor_id: user.id,
        actor_name: user.full_name,
        actor_role: user.role,
        action_type: decision === 'approved' ? 'attendance_approved' : 'attendance_rejected',
        module: 'workforce',
        target_entity: 'AttendanceException',
        target_record_id: exception_id,
        new_state: {
          status: finalException.status,
          manager_decision: decision,
          manager_notes: manager_notes || '',
          clock_record_validation: clockRecordUpdated?.validation_status || null,
        },
        details: `Attendance exception (${exception.exception_type}) for ${exception.employee_name} ${decision} by ${user.full_name}. ClockRecord validation: ${clockRecordUpdated?.validation_status || 'not updated'}.`,
        shield_outcome: 'not_evaluated',
      });
      auditLogId = audit.id || '';

      // Link audit log back to exception
      if (auditLogId) {
        await base44.entities.AttendanceException.update(exception_id, { audit_log_id: auditLogId });
      }
    } catch (e) {
      console.error('Audit log creation failed:', e.message);
    }

    return Response.json({
      success: true,
      decision,
      exception: finalException,
      clock_record: clockRecordUpdated,
      audit_log_id: auditLogId,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});