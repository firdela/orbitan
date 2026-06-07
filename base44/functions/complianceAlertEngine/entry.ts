import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Scheduled daily function — checks for overdue/due-soon compliance records and tasks,
// then sends email alerts to outlet managers.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Fetch all active compliance records and employees (managers)
    const [allRecords, allTasks, allEmployees] = await Promise.all([
      base44.asServiceRole.entities.ComplianceRecord.list('-due_date', 200),
      base44.asServiceRole.entities.Task.list('-created_date', 200),
      base44.asServiceRole.entities.Employee.filter({ role: 'outlet_manager', status: 'active' }),
    ]);

    const alertsSent = [];

    // Group managers by tenant+outlet
    const managerMap = {};
    for (const mgr of allEmployees) {
      const key = `${mgr.tenant_id}::${mgr.outlet_id}`;
      if (!managerMap[key]) managerMap[key] = [];
      if (mgr.email) managerMap[key].push(mgr);
    }

    // Find overdue or due-within-3-days compliance records
    const urgentRecords = allRecords.filter(r => {
      if (r.status === 'approved') return false;
      if (!r.due_date) return false;
      const dueDate = new Date(r.due_date);
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      return daysUntilDue <= 3;
    });

    // Find overdue tasks (tasks with due_date passed and not completed)
    const overdueTasks = allTasks.filter(t => {
      if (t.status === 'completed' || t.status === 'done') return false;
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      return dueDate < today;
    });

    // Group urgent records by tenant+outlet
    const recordsByOutlet = {};
    for (const r of urgentRecords) {
      const key = `${r.tenant_id}::${r.outlet_id}`;
      if (!recordsByOutlet[key]) recordsByOutlet[key] = [];
      recordsByOutlet[key].push(r);
    }

    // Group overdue tasks by tenant+outlet
    const tasksByOutlet = {};
    for (const t of overdueTasks) {
      const key = `${t.tenant_id}::${t.outlet_id}`;
      if (!tasksByOutlet[key]) tasksByOutlet[key] = [];
      tasksByOutlet[key].push(t);
    }

    // Collect all outlet keys
    const allOutletKeys = new Set([...Object.keys(recordsByOutlet), ...Object.keys(tasksByOutlet)]);

    for (const key of allOutletKeys) {
      const managers = managerMap[key] || [];
      if (managers.length === 0) continue;

      const records = recordsByOutlet[key] || [];
      const tasks = tasksByOutlet[key] || [];

      let bodyLines = [`<h2 style="font-family:sans-serif;color:#111827">⚠️ OrbitanOS Alert — Action Required</h2>`];
      bodyLines.push(`<p style="font-family:sans-serif;color:#374151">This is an automated alert from <strong>OrbitanOS Orbitan Shield™</strong>.</p>`);

      if (records.length > 0) {
        bodyLines.push(`<h3 style="font-family:sans-serif;color:#7C3AED">📋 Compliance Records Requiring Attention (${records.length})</h3><ul>`);
        for (const r of records) {
          const dueDate = new Date(r.due_date);
          const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
          const urgency = daysLeft < 0 ? '🔴 OVERDUE' : daysLeft === 0 ? '🟠 Due Today' : `🟡 Due in ${daysLeft}d`;
          bodyLines.push(`<li style="font-family:sans-serif;margin-bottom:6px"><strong>${r.title}</strong> — ${r.type} · ${urgency} · Status: <em>${r.status}</em></li>`);
        }
        bodyLines.push('</ul>');
      }

      if (tasks.length > 0) {
        bodyLines.push(`<h3 style="font-family:sans-serif;color:#D97706">📌 Overdue Tasks (${tasks.length})</h3><ul>`);
        for (const t of tasks) {
          bodyLines.push(`<li style="font-family:sans-serif;margin-bottom:6px"><strong>${t.title || t.name || 'Unnamed Task'}</strong> — Due: ${t.due_date} · Priority: ${t.priority || 'normal'}</li>`);
        }
        bodyLines.push('</ul>');
      }

      bodyLines.push(`<p style="font-family:sans-serif;color:#6B7280;font-size:12px;margin-top:24px">Sent by OrbitanOS · ${todayStr} · Regulate Principle · Orbitan Shield™</p>`);

      const emailBody = bodyLines.join('');

      for (const mgr of managers) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: mgr.email,
          from_name: 'OrbitanOS Alerts',
          subject: `⚠️ Action Required: ${records.length + tasks.length} item(s) need your attention`,
          body: emailBody,
        });
        alertsSent.push({ manager: mgr.full_name, email: mgr.email, records: records.length, tasks: tasks.length });
      }
    }

    return Response.json({
      success: true,
      alerts_sent: alertsSent.length,
      details: alertsSent,
      checked_at: todayStr,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});