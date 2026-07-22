import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * Employee Justify — Field-safe justification submission.
 *
 * Employees cannot directly UPDATE AttendanceException records (RLS denies it).
 * They invoke this function, which validates that the requesting user IS the
 * employee on the exception and only writes employee-controlled fields:
 *   employee_justification, employee_justified_at, supporting_notes,
 *   supporting_attachment_url, status → employee_justified
 *
 * This enforces the separation of concerns the RLS cannot express at
 * field-level granularity.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { exception_id, justification, supporting_notes, supporting_attachment_url } = body;

    if (!exception_id || !justification || !justification.trim()) {
      return Response.json({ error: 'exception_id and justification are required' }, { status: 400 });
    }

    const exceptions = await base44.entities.AttendanceException.filter({ id: exception_id });
    if (exceptions.length === 0) {
      return Response.json({ error: 'Exception not found' }, { status: 404 });
    }
    const exception = exceptions[0];

    // ── Authorization: only the employee on the exception can justify it ──
    // (admins can also use the attendanceReview function, not this one)
    if (exception.employee_id !== user.id) {
      return Response.json({ error: 'You can only justify your own attendance exceptions' }, { status: 403 });
    }

    // ── State guard: only pending_review exceptions can be justified ──
    if (exception.status !== 'pending_review') {
      return Response.json({ error: `Exception is no longer justifiable (status: ${exception.status})` }, { status: 400 });
    }

    const now = new Date().toISOString();

    // ── Write ONLY employee-controlled fields ──
    const updated = await base44.entities.AttendanceException.update(exception_id, {
      employee_justification: justification.trim(),
      employee_justified_at: now,
      supporting_notes: supporting_notes || '',
      supporting_attachment_url: supporting_attachment_url || '',
      status: 'employee_justified',
    });

    // ── Audit Log ──
    try {
      await base44.entities.AuditLog.create({
        tenant_id: exception.tenant_id,
        outlet_id: exception.outlet_id || '',
        actor_id: user.id,
        actor_name: user.full_name,
        actor_role: user.role,
        action_type: 'attendance_justified',
        module: 'workforce',
        target_entity: 'AttendanceException',
        target_record_id: exception_id,
        new_state: { status: 'employee_justified', employee_justification: justification.trim() },
        details: `${user.full_name} submitted justification for ${exception.exception_type} exception.`,
        shield_outcome: 'not_evaluated',
      });
    } catch (e) {
      console.error('Audit log creation failed:', e.message);
    }

    return Response.json({ success: true, exception: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});