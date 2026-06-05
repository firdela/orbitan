/**
 * OrbitanOS — workforceInsights
 * ─────────────────────────────
 * "Refine" principle — AI-powered workforce analytics endpoint.
 * Aggregates ClockRecord + SalesInvoice data to generate:
 *   - productivity summaries
 *   - shift optimisation recommendations (via AI)
 *   - labour cost vs revenue analysis
 *
 * EXIT-READY: Pure Deno handler. No platform lock-in.
 * Migrate by swapping createClientFromRequest with your own DB client.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowedRoles = ['admin', 'tenant_admin', 'outlet_manager'];
    if (!allowedRoles.includes(user.role)) {
      return Response.json({ error: 'Forbidden: Manager access required' }, { status: 403 });
    }

    const body = await req.json();
    const { action_type, tenant_id, outlet_id, date_from, date_to, generate_ai_report } = body;

    if (!tenant_id) {
      return Response.json({ error: 'tenant_id is required' }, { status: 400 });
    }

    // ── 1. Fetch ClockRecords for the date range ──────────────────────────────
    const allClock = await base44.entities.ClockRecord.filter({ tenant_id, outlet_id });
    const clockRecords = allClock.filter(r => {
      if (date_from && r.date < date_from) return false;
      if (date_to && r.date > date_to) return false;
      return true;
    });

    // ── 2. Per-employee aggregation ──────────────────────────────────────────
    const employeeMap = {};
    for (const r of clockRecords) {
      if (!r.employee_id) continue;
      if (!employeeMap[r.employee_id]) {
        employeeMap[r.employee_id] = {
          employee_id: r.employee_id,
          employee_name: r.employee_name || 'Unknown',
          total_shifts: 0,
          total_hours: 0,
          total_overtime: 0,
          total_labour_cost: 0,
          total_tasks_assigned: 0,
          total_tasks_completed: 0,
          productivity_scores: [],
          pending_verification_count: 0,
          clocked_in_count: 0,
        };
      }
      const emp = employeeMap[r.employee_id];
      emp.total_shifts++;
      emp.total_hours += r.total_hours_worked || 0;
      emp.total_overtime += r.overtime_hours || 0;
      emp.total_labour_cost += r.labour_cost || 0;
      emp.total_tasks_assigned += r.tasks_assigned || 0;
      emp.total_tasks_completed += r.tasks_completed || 0;
      if (r.productivity_score != null) emp.productivity_scores.push(r.productivity_score);
      if (r.status === 'pending_verification') emp.pending_verification_count++;
      if (r.status === 'clocked_in') emp.clocked_in_count++;
    }

    const employeeSummaries = Object.values(employeeMap).map(emp => ({
      ...emp,
      avg_hours: emp.total_shifts > 0 ? emp.total_hours / emp.total_shifts : 0,
      avg_productivity: emp.productivity_scores.length > 0
        ? emp.productivity_scores.reduce((a, b) => a + b, 0) / emp.productivity_scores.length
        : null,
      task_completion_rate: emp.total_tasks_assigned > 0
        ? (emp.total_tasks_completed / emp.total_tasks_assigned) * 100
        : null,
    }));

    // ── 3. Daily labour cost summary ─────────────────────────────────────────
    const dailyLabour = {};
    for (const r of clockRecords) {
      if (!dailyLabour[r.date]) dailyLabour[r.date] = { date: r.date, total_labour_cost: 0, total_hours: 0, headcount: 0 };
      dailyLabour[r.date].total_labour_cost += r.labour_cost || 0;
      dailyLabour[r.date].total_hours += r.total_hours_worked || 0;
      dailyLabour[r.date].headcount++;
    }

    // ── 4. Fetch SalesInvoices for labour vs revenue ─────────────────────────
    const allSales = await base44.entities.SalesInvoice.filter({ tenant_id, outlet_id });
    const salesInRange = allSales.filter(r => {
      if (date_from && r.date < date_from) return false;
      if (date_to && r.date > date_to) return false;
      return r.processing_status === 'verified';
    });

    const dailySales = {};
    for (const s of salesInRange) {
      if (!dailySales[s.date]) dailySales[s.date] = { date: s.date, total_revenue: 0, transaction_count: 0 };
      dailySales[s.date].total_revenue += s.total || 0;
      dailySales[s.date].transaction_count++;
    }

    // ── 5. Merge into daily P&L snapshot ─────────────────────────────────────
    const allDates = new Set([...Object.keys(dailyLabour), ...Object.keys(dailySales)]);
    const dailyPnL = Array.from(allDates).sort().map(date => {
      const labour = dailyLabour[date] || { total_labour_cost: 0, total_hours: 0, headcount: 0 };
      const sales = dailySales[date] || { total_revenue: 0, transaction_count: 0 };
      const labour_pct = sales.total_revenue > 0 ? (labour.total_labour_cost / sales.total_revenue) * 100 : null;
      return {
        date,
        total_revenue: sales.total_revenue,
        transaction_count: sales.transaction_count,
        total_labour_cost: labour.total_labour_cost,
        total_hours: labour.total_hours,
        headcount: labour.headcount,
        labour_as_pct_revenue: labour_pct,
      };
    });

    // ── 6. Compliance health ─────────────────────────────────────────────────
    const pendingVerification = clockRecords.filter(r => r.status === 'pending_verification').length;
    const totalRecords = clockRecords.length;
    const complianceRate = totalRecords > 0 ? ((totalRecords - pendingVerification) / totalRecords) * 100 : 100;

    // ── 7. Summary KPIs ──────────────────────────────────────────────────────
    const totalLabourCost = clockRecords.reduce((s, r) => s + (r.labour_cost || 0), 0);
    const totalRevenue = salesInRange.reduce((s, r) => s + (r.total || 0), 0);
    const overallLabourPct = totalRevenue > 0 ? (totalLabourCost / totalRevenue) * 100 : null;
    const avgProductivityAll = employeeSummaries.filter(e => e.avg_productivity != null);
    const platformAvgProductivity = avgProductivityAll.length > 0
      ? avgProductivityAll.reduce((s, e) => s + e.avg_productivity, 0) / avgProductivityAll.length
      : null;

    const summary = {
      period: { date_from, date_to },
      total_clock_records: totalRecords,
      total_employees: Object.keys(employeeMap).length,
      total_hours_worked: clockRecords.reduce((s, r) => s + (r.total_hours_worked || 0), 0),
      total_overtime_hours: clockRecords.reduce((s, r) => s + (r.overtime_hours || 0), 0),
      total_labour_cost_sgd: totalLabourCost,
      total_revenue_sgd: totalRevenue,
      labour_as_pct_revenue: overallLabourPct,
      avg_productivity_score: platformAvgProductivity,
      compliance_rate_pct: complianceRate,
      pending_verification_count: pendingVerification,
    };

    // ── 8. Optional AI Shift Optimiser Report ────────────────────────────────
    let ai_report = null;
    if (generate_ai_report) {
      const aiPrompt = buildShiftOptimiserPrompt(employeeSummaries, Object.values(dailySales));
      const aiResult = await base44.integrations.Core.InvokeLLM({
        prompt: aiPrompt,
        model: 'claude_sonnet_4_6',
        response_json_schema: {
          type: 'object',
          properties: {
            peak_hours_analysis: { type: 'string' },
            underperforming_shifts: { type: 'string' },
            overstaffing_risks: { type: 'string' },
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  reasoning: { type: 'string' },
                  estimated_saving_sgd: { type: 'number' },
                },
              },
            },
            training_focus: { type: 'string' },
            estimated_total_savings_sgd: { type: 'number' },
            review_checklist: { type: 'array', items: { type: 'string' } },
          },
        },
      });

      ai_report = aiResult;

      // Persist as an AIDocument record
      await base44.asServiceRole.entities.AIDocument.create({
        tenant_id,
        outlet_id: outlet_id || null,
        document_type: 'shift_brief',
        title: `Shift Optimiser Report — ${date_from} to ${date_to}`,
        industry_context: 'food_beverage',
        principle: 'refine',
        content_markdown: JSON.stringify(aiResult, null, 2),
        model_used: 'claude_sonnet_4_6',
        status: 'in_review',
        auto_publish_eligible: true,
        tags: ['shift_optimiser', 'workforce', 'ai_refine'],
      });
    }

    return Response.json({
      success: true,
      summary,
      employee_summaries: employeeSummaries,
      daily_pnl: dailyPnL,
      ai_report,
    });

  } catch (error) {
    console.error('[workforceInsights] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildShiftOptimiserPrompt(employeeSummaries, salesSummary) {
  const perfLines = employeeSummaries.map(r =>
    `- ${r.employee_name}: ${r.avg_hours?.toFixed(1) || 0}h avg/shift, productivity ${r.avg_productivity?.toFixed(0) || 'N/A'}%, ${r.total_shifts} shifts, labour cost SGD ${r.total_labour_cost?.toFixed(2)}`
  ).join('\n') || 'No clock data.';

  const salesLines = salesSummary.map(r =>
    `- ${r.date}: SGD ${r.total_revenue?.toFixed(2)} revenue, ${r.transaction_count} transactions`
  ).join('\n') || 'No sales data.';

  return `You are an OrbitanOS Workforce Intelligence engine analysing shift performance for a Singapore F&B/Retail operation.

Workforce Performance (last period):
${perfLines}

Sales Performance (last period):
${salesLines}

Generate a structured JSON Shift Optimisation Report with:
- peak_hours_analysis: narrative about when revenue is highest vs staffing
- underperforming_shifts: narrative about low-productivity + low-revenue periods  
- overstaffing_risks: periods where labour cost exceeds healthy % of revenue
- recommendations: array of top 3 specific scheduling changes with reasoning and estimated_saving_sgd
- training_focus: which employees need upskilling and why
- estimated_total_savings_sgd: total estimated savings if all recommendations are applied
- review_checklist: array of 3 manager action items

Be specific, data-driven, and reference actual names/numbers from the data above.`;
}