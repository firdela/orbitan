import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { type = 'workforce', tenant_id } = body;

    if (!tenant_id) return Response.json({ error: 'tenant_id is required' }, { status: 400 });

    // ── Tenant Authorization Boundary (IDOR Fix) ──
    // Prevent cross-tenant data access. Only platform admins may
    // export arbitrary tenants; everyone else is scoped to their own.
    const isPlatformAdmin = user.role === 'admin';
    const isTenantMember = user.data?.tenant_id === tenant_id;
    if (!isPlatformAdmin && !isTenantMember) {
      return Response.json({ error: 'Forbidden: You do not have access to this tenant.' }, { status: 403 });
    }

    let csvContent = '';
    let filename = '';

    if (type === 'workforce') {
      const [employees, clockRecords] = await Promise.all([
        base44.asServiceRole.entities.Employee.filter({ tenant_id }),
        base44.asServiceRole.entities.ClockRecord.filter({ tenant_id }),
      ]);

      // Build payroll summary per employee
      const payrollMap = {};
      for (const cr of clockRecords) {
        if (!payrollMap[cr.employee_id]) {
          payrollMap[cr.employee_id] = { total_hours: 0, overtime_hours: 0, total_cost: 0, shifts: 0 };
        }
        payrollMap[cr.employee_id].total_hours += cr.total_hours_worked || 0;
        payrollMap[cr.employee_id].overtime_hours += cr.overtime_hours || 0;
        payrollMap[cr.employee_id].total_cost += cr.total_shift_cost || 0;
        payrollMap[cr.employee_id].shifts += 1;
      }

      const headers = ['Full Name', 'Position', 'Role', 'Employment Type', 'Pay Type', 'Pay Rate (S$)', 'Status', 'Hire Date', 'Email', 'Phone', 'Total Shifts', 'Total Hours', 'Overtime Hours', 'Total Labour Cost (S$)'];
      const rows = employees.map(e => {
        const stats = payrollMap[e.id] || { total_hours: 0, overtime_hours: 0, total_cost: 0, shifts: 0 };
        return [
          e.full_name || '',
          e.position || '',
          (e.role || '').replace(/_/g, ' '),
          (e.employment_type || '').replace(/_/g, ' '),
          e.pay_type || '',
          e.pay_rate || 0,
          e.status || '',
          e.hire_date || '',
          e.email || '',
          e.phone || '',
          stats.shifts,
          stats.total_hours.toFixed(2),
          stats.overtime_hours.toFixed(2),
          stats.total_cost.toFixed(2),
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
      });

      csvContent = [headers.join(','), ...rows].join('\n');
      filename = `workforce_report_${new Date().toISOString().split('T')[0]}.csv`;

    } else if (type === 'compliance') {
      const records = await base44.asServiceRole.entities.ComplianceRecord.filter({ tenant_id });

      const headers = ['Title', 'Type', 'Category', 'Status', 'Due Date', 'Submitted Date', 'Submitted By', 'Notes'];
      const rows = records.map(r => [
        r.title || '',
        r.type || '',
        (r.category || '').replace(/_/g, ' '),
        r.status || '',
        r.due_date || '',
        r.submitted_date || '',
        r.submitted_by || '',
        (r.notes || '').replace(/\n/g, ' '),
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

      csvContent = [headers.join(','), ...rows].join('\n');
      filename = `compliance_report_${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      return Response.json({ error: 'Invalid type. Use "workforce" or "compliance".' }, { status: 400 });
    }

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});