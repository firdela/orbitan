import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Scheduled automation — no user context, use service role
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayStr = now.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Query shifts for today and tomorrow that haven't had reminders sent
    const shifts = await base44.asServiceRole.entities.Shift.filter({
      date: { $in: [todayStr, tomorrowStr] },
      status: { $in: ['scheduled', 'confirmed'] },
      reminder_sent: { $ne: true }
    }, '-created_date', 500);

    let sentCount = 0;
    const errors = [];

    for (const shift of shifts) {
      try {
        let email = null;
        let employeeName = shift.employee_name || 'Team Member';

        // Look up user email
        if (shift.employee_id) {
          try {
            const user = await base44.asServiceRole.entities.User.get(shift.employee_id);
            if (user?.email) {
              email = user.email;
              employeeName = user.full_name || employeeName;
            }
          } catch (e) {
            // Fallback: try Employee entity
            try {
              const employees = await base44.asServiceRole.entities.Employee.filter({
                tenant_id: shift.tenant_id
              }, '-created_date', 200);

              const emp = employees.find(
                (e) => e.id === shift.employee_id || e.full_name === shift.employee_name
              );
              if (emp?.email) {
                email = emp.email;
                employeeName = emp.full_name || employeeName;
              }
            } catch (e2) {
              // Skip if no employee match
            }
          }
        }

        if (!email) {
          errors.push(`No email found for shift ${shift.id} (${employeeName})`);
          continue;
        }

        // Format shift details
        const formattedDate = new Date(shift.date + 'T00:00:00').toLocaleDateString('en-SG', {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        });
        const formattedTime = shift.start_time || 'TBD';
        const formattedEnd = shift.end_time || 'TBD';

        // Delegate to the Unified Notification Pipeline (ADR-0031, Pillar 2).
        // Template resolution + delivery are centralised in notificationDispatcher.
        await base44.asServiceRole.functions.invoke('notificationDispatcher', {
          template_key: 'shift_reminder',
          tenant_id: shift.tenant_id,
          recipient_email: email,
          recipient_name: employeeName,
          context: { shift_date: formattedDate, start_time: formattedTime, end_time: formattedEnd }
        });

        // Mark reminder as sent to prevent duplicates
        await base44.asServiceRole.entities.Shift.update(shift.id, { reminder_sent: true });
        sentCount++;
      } catch (shiftError) {
        errors.push(`Shift ${shift.id}: ${shiftError.message}`);
      }
    }

    // Log to AuditLog for SOC 2 traceability
    if (sentCount > 0) {
      try {
        await base44.asServiceRole.entities.AuditLog.create({
          tenant_id: 'system',
          actor_id: 'system',
          actor_name: 'Shift Reminder Engine',
          actor_role: 'system',
          action_type: 'shift_reminder_batch',
          module: 'scheduling',
          target_entity: 'Shift',
          target_record_id: todayStr,
          details: `${sentCount} shift reminder(s) sent for ${todayStr} – ${tomorrowStr}.`,
          shield_outcome: 'not_evaluated'
        });
      } catch (auditErr) {
        // Non-critical — don't fail the function
      }
    }

    return Response.json({
      success: true,
      reminders_sent: sentCount,
      total_checked: shifts.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined
    });
  } catch (error) {
    console.error('[shiftReminderEngine] Fatal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});