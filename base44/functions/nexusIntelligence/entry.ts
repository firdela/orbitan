import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * Orbit Nexus Intelligence — Grounded Decision Engine (Build Package #13)
 * Principle: Reach
 *
 * The ONE governed intelligence layer. Actions:
 *   health_score      — deterministic 0-100 Operational Health Score across categories
 *   daily_briefing    — deterministic metrics + LLM-synthesised narrative (grounded)
 *   anomalies         — rule-based anomaly detection (NOT ML)
 *   recommendations   — rule-based recommendations (labelled "Rule-Based")
 *   margin_analysis   — recipe margin vs actual sale margin
 *
 * Every response honours the Data Grounding Contract (Part B) + Data Sufficiency (Part C).
 * Never fabricates numbers. Insufficient data → insufficient_data:true + reason.
 * Role scope enforced (Part P): supervisor/outlet_manager/tenant_admin/admin only.
 * Insights persisted to NexusInsight (Part N).
 */

const RULE_VERSION = 'nexus-rules-v1';
const ALLOWED = ['admin', 'tenant_admin', 'outlet_manager', 'supervisor'];

const todayStr = () => new Date().toISOString().split('T')[0];
const yesterdayStr = () => new Date(Date.now() - 86400000).toISOString().split('T')[0];
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!ALLOWED.includes(user.role)) {
      return Response.json({ error: 'Forbidden — Orbit Nexus intelligence requires a supervisor/manager role' }, { status: 403 });
    }

    let payload = {};
    try { payload = await req.json(); } catch (e) {}
    const action = payload.action;
    const tenantId = payload.tenant_id || user?.data?.tenant_id;
    const outletId = payload.outlet_id || user?.data?.outlet_id;
    if (!tenantId) return Response.json({ error: 'tenant_id required' }, { status: 400 });

    const f = { tenant_id: tenantId };
    if (outletId && user.role !== 'tenant_admin' && user.role !== 'admin') f.outlet_id = outletId;
    const today = todayStr();
    const yest = yesterdayStr();

    const [sales, salesYest, inventory, batches, exceptions, clockRecords, tasks, poPending, queue, recipes, compliance, snapshots] = await Promise.all([
      base44.asServiceRole.entities.SalesInvoice.filter({ ...f, date: today }, '-created_date', 200).catch(() => []),
      base44.asServiceRole.entities.SalesInvoice.filter({ ...f, date: yest }, '-created_date', 200).catch(() => []),
      base44.asServiceRole.entities.InventoryItem.filter({ ...f, status: { $ne: 'inactive' } }, '-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.ProductionBatch.filter({ ...f, status: 'completed', production_date: today }, '-created_date', 100).catch(() => []),
      base44.asServiceRole.entities.AttendanceException.filter({ ...f, status: { $in: ['detected', 'pending_review', 'manager_review'] } }, '-created_date', 100).catch(() => []),
      base44.asServiceRole.entities.ClockRecord.filter({ ...f, date: today }, '-created_date', 200).catch(() => []),
      base44.asServiceRole.entities.Task.filter({ ...f, status: { $in: ['pending', 'in_progress', 'open'] } }, '-created_date', 200).catch(() => []),
      base44.asServiceRole.entities.PurchaseOrder.filter({ ...f, status: { $in: ['draft', 'pending_approval', 'sent', 'partially_received'] } }, '-created_date', 100).catch(() => []),
      base44.asServiceRole.entities.FinanceSyncQueue.filter({ tenant_id: tenantId, status: { $in: ['failed', 'pending'] } }, '-created_date', 100).catch(() => []),
      base44.asServiceRole.entities.Recipe.filter({ tenant_id: tenantId, is_active: true }, '-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.ComplianceRecord.filter({ ...f, status: { $in: ['pending', 'overdue', 'rejected'] } }, '-created_date', 100).catch(() => []),
      base44.asServiceRole.entities.ComplianceSnapshot.filter({ tenant_id: tenantId }, '-created_date', 1).catch(() => []),
    ]);

    const paidSales = sales.filter(s => s.payment_status === 'paid');
    const revenueToday = round2(paidSales.reduce((s, x) => s + (x.total || 0), 0));
    const cogsToday = round2(paidSales.reduce((s, x) => s + (x.cogs_total || 0), 0));
    const gpToday = round2(revenueToday - cogsToday);
    const marginToday = revenueToday > 0 ? round2((gpToday / revenueToday) * 100) : 0;
    const salesCount = paidSales.length;
    const revenueYest = round2(salesYest.filter(s => s.payment_status === 'paid').reduce((s, x) => s + (x.total || 0), 0));
    const revenueDeltaPct = revenueYest > 0 ? round2(((revenueToday - revenueYest) / revenueYest) * 100) : 0;

    const lowStock = inventory.filter(i => (i.current_stock ?? 0) <= (i.reorder_point ?? 0));
    const stockoutRisk = inventory.filter(i => (i.current_stock ?? 0) <= 0);
    const inventoryValue = round2(inventory.reduce((s, i) => s + ((i.current_stock || 0) * (i.cost_per_unit || 0)), 0));

    const prodQtyToday = batches.reduce((s, b) => s + (b.quantity_produced || 0), 0);
    const prodCostToday = round2(batches.reduce((s, b) => s + (b.production_cost || 0), 0));

    const labourCostToday = round2(clockRecords.reduce((s, c) => s + (c.total_shift_cost || 0), 0));
    const overtimeHours = round2(clockRecords.reduce((s, c) => s + (c.overtime_hours || 0), 0));

    const openTasks = tasks.length;
    const openExceptions = exceptions.length;
    const poAttention = poPending.length;
    const failedSync = queue.filter(q => q.status === 'failed').length;
    const pendingSync = queue.filter(q => q.status === 'pending').length;
    const complianceOpen = compliance.length;
    const complianceScore = snapshots[0]?.compliance_score ?? null;
    const complianceRisk = snapshots[0]?.risk_level ?? 'green';

    const itemMap = {};
    paidSales.forEach(s => {
      (s.line_items || []).forEach(li => {
        const key = li.recipe_name || li.description || 'Item';
        if (!itemMap[key]) itemMap[key] = { qty: 0, revenue: 0 };
        itemMap[key].qty += li.quantity || 0;
        itemMap[key].revenue += li.total || 0;
      });
    });
    const topItems = Object.entries(itemMap).map(([k, v]) => ({ name: k, ...v })).sort((a, b) => b.qty - a.qty).slice(0, 5);

    const metrics = {
      revenueToday, revenueYest, revenueDeltaPct, cogsToday, gpToday, marginToday, salesCount,
      inventoryValue, lowStockCount: lowStock.length, stockoutRiskCount: stockoutRisk.length,
      prodQtyToday, prodCostToday, labourCostToday, overtimeHours,
      openTasks, openExceptions, poAttention, failedSync, pendingSync, complianceOpen, complianceScore, complianceRisk,
      topItems, lowStockItems: lowStock.slice(0, 8).map(i => ({ name: i.name, stock: i.current_stock, reorder: i.reorder_point })),
      batchesToday: batches.length,
    };

    const dataFreshness = new Date().toISOString();
    const generatedAt = dataFreshness;

    if (action === 'health_score') {
      const salesScore = revenueToday > 0 ? Math.min(100, 60 + Math.min(40, marginToday)) : 40;
      const marginScore = marginToday >= 60 ? 100 : Math.max(0, marginToday + 20);
      const invScore = inventory.length === 0 ? 50 : Math.max(0, 100 - (lowStock.length * 10) - (stockoutRisk.length * 20));
      const prodScore = batches.length > 0 ? 80 : 50;
      const workforceScore = openExceptions === 0 ? 100 : Math.max(20, 100 - (openExceptions * 15));
      const complianceScoreVal = complianceScore != null ? complianceScore : (complianceOpen === 0 ? 95 : Math.max(30, 90 - complianceOpen * 10));
      const financeScore = failedSync === 0 ? 100 : Math.max(20, 100 - failedSync * 15);
      const taskScore = openTasks === 0 ? 100 : Math.max(30, 100 - Math.min(70, openTasks * 5));
      const procurementScore = poAttention <= 2 ? 90 : Math.max(40, 90 - (poAttention - 2) * 10);
      const attendanceScore = workforceScore;

      const categories = {
        sales: { score: round2(salesScore), value: revenueToday, delta: revenueDeltaPct },
        margin: { score: round2(marginScore), value: marginToday },
        inventory: { score: round2(invScore), lowStock: lowStock.length, stockout: stockoutRisk.length },
        production: { score: round2(prodScore), batches: batches.length, cost: prodCostToday },
        workforce: { score: round2(workforceScore), exceptions: openExceptions },
        attendance: { score: round2(attendanceScore), overtimeHours, labourCost: labourCostToday },
        compliance: { score: round2(complianceScoreVal), risk: complianceRisk },
        finance: { score: round2(financeScore), failed: failedSync, pending: pendingSync },
        tasks: { score: round2(taskScore), open: openTasks },
        procurement: { score: round2(procurementScore), pending: poAttention },
      };
      const weights = { sales: 0.18, margin: 0.14, inventory: 0.14, production: 0.10, workforce: 0.10, compliance: 0.10, finance: 0.10, tasks: 0.06, procurement: 0.05, attendance: 0.03 };
      const overall = round2(Object.entries(categories).reduce((s, [k, v]) => s + v.score * (weights[k] || 0), 0));

      const risks = [];
      if (stockoutRisk.length) risks.push(`${stockoutRisk.length} item(s) at stockout`);
      if (failedSync) risks.push(`${failedSync} finance sync failure(s)`);
      if (openExceptions) risks.push(`${openExceptions} attendance exception(s) open`);
      if (marginToday < 50 && revenueToday > 0) risks.push(`Margin below target (${marginToday}%)`);
      if (complianceOpen) risks.push(`${complianceOpen} compliance item(s) open`);
      const positives = [];
      if (revenueDeltaPct > 0) positives.push(`Revenue up ${revenueDeltaPct}% vs yesterday`);
      if (batches.length > 0) positives.push(`${batches.length} production batch(es) completed`);
      if (failedSync === 0 && pendingSync === 0) positives.push('Finance sync queue clear');
      if (openExceptions === 0) positives.push('No open attendance exceptions');

      const priorities = [
        ...(stockoutRisk.length ? [`Replenish ${stockoutRisk.length} stockout item(s)`] : []),
        ...(failedSync ? [`Retry ${failedSync} failed finance sync(s)`] : []),
        ...(openExceptions ? [`Review ${openExceptions} attendance exception(s)`] : []),
        ...(poAttention ? [`Action ${poAttention} pending purchase order(s)`] : []),
        ...(openTasks ? [`Complete ${openTasks} open task(s)`] : []),
      ].slice(0, 5);

      const result = {
        tenant_id: tenantId, outlet_id: outletId || null,
        insight_type: 'operational_health', title: 'Operational Health Score',
        summary: `Overall score ${overall}/100. ${risks.length ? risks.join('; ') + '.' : 'No critical risks.'} ${positives.length ? positives.join('; ') + '.' : ''}`,
        severity: overall >= 80 ? 'info' : overall >= 60 ? 'medium' : overall >= 40 ? 'high' : 'critical',
        confidence: 1, generation_method: 'deterministic',
        metric_snapshot: { overall, categories, weights, risks, positives, priorities },
        evidence: [{ source: 'aggregated', metrics }],
        source_entities: ['SalesInvoice', 'InventoryItem', 'ProductionBatch', 'AttendanceException', 'ClockRecord', 'Task', 'PurchaseOrder', 'FinanceSyncQueue', 'ComplianceRecord'],
        generated_at: generatedAt, data_freshness: dataFreshness, data_period: 'today',
        data_sufficiency: sales.length === 0 && inventory.length === 0 ? false : true,
        insufficient_data_reason: (sales.length === 0 && inventory.length === 0) ? 'No sales or inventory data yet — start recording sales and inventory to compute a health score.' : '',
        recommended_actions: priorities.map(p => ({ label: p, type: 'navigate', confirmation_required: false })),
        model_or_rule_version: RULE_VERSION,
      };
      try { await persistInsight(base44, result, user); } catch (e) {}
      return Response.json(result);
    }

    if (action === 'daily_briefing') {
      const sufficient = sales.length > 0 || inventory.length > 0 || batches.length > 0;
      const deterministicPriorities = [
        ...(stockoutRisk.length ? [{ what: `${stockoutRisk.length} item(s) at stockout`, why: 'Cannot fulfil sales until replenished', action: 'Raise purchase orders now', evidence: lowStock.slice(0, 5).map(i => i.name) }] : []),
        ...(failedSync ? [{ what: `${failedSync} finance sync failure(s)`, why: 'Accounting records not reaching Xero', action: 'Review & retry in Finance Integration', evidence: ['FinanceSyncQueue'] }] : []),
        ...(openExceptions ? [{ what: `${openExceptions} attendance exception(s) open`, why: 'May affect payroll accuracy', action: 'Review in Workforce / Timesheets', evidence: ['AttendanceException'] }] : []),
        ...(marginToday < 50 && revenueToday > 0 ? [{ what: `Margin at ${marginToday}% (below 50%)`, why: 'Cost or discount pressure on profitability', action: 'Review recipe costs & discounts', evidence: ['Recipe', 'SalesInvoice'] }] : []),
      ];

      let narrative = '';
      if (sufficient) {
        const llmPrompt = `You are Orbit Nexus, the operational intelligence layer for an F&B/sustainability business. Summarise TODAY'S operational briefing for an outlet manager using ONLY the verified metrics below. Be concise (max 180 words), structured as: What happened / Why it matters / What needs attention. Do NOT invent numbers or add metrics not provided. If a metric is 0 or missing, omit it rather than fabricate.

VERIFIED METRICS (today):
- Revenue: ${revenueToday} (yesterday ${revenueYest}, delta ${revenueDeltaPct}%)
- COGS: ${cogsToday}, Gross Profit: ${gpToday}, Margin: ${marginToday}%
- Sales count: ${salesCount}
- Top items: ${topItems.map(t => `${t.name} (${t.qty})`).join(', ') || 'none'}
- Low stock: ${lowStock.length} items, Stockout risk: ${stockoutRisk.length}
- Production: ${batches.length} batches, ${prodQtyToday} units, cost ${prodCostToday}
- Labour cost: ${labourCostToday}, Overtime hours: ${overtimeHours}
- Open tasks: ${openTasks}, Attendance exceptions: ${openExceptions}
- Pending POs: ${poAttention}, Finance sync failed: ${failedSync}, pending: ${pendingSync}
- Compliance open: ${complianceOpen}, risk: ${complianceRisk}
- Inventory value: ${inventoryValue}`;
        try {
          const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt: llmPrompt });
          narrative = llm?.response || (typeof llm === 'string' ? llm : '') || '';
        } catch (e) {
          narrative = `Today: revenue ${revenueToday} (${revenueDeltaPct >= 0 ? '+' : ''}${revenueDeltaPct}% vs yesterday), margin ${marginToday}%, ${salesCount} sales. ${lowStock.length ? lowStock.length + ' low-stock items. ' : ''}${failedSync ? failedSync + ' finance sync failures. ' : ''}${openExceptions ? openExceptions + ' attendance exceptions. ' : ''}Review priorities below.`;
        }
      }

      const result = {
        tenant_id: tenantId, outlet_id: outletId || null,
        insight_type: 'daily_briefing', title: 'Daily Operational Briefing',
        summary: narrative || 'No operational data recorded today. Start by completing a sale or logging production.',
        severity: (stockoutRisk.length || failedSync || openExceptions) ? 'high' : 'info',
        confidence: sufficient ? 0.9 : 0, generation_method: sufficient ? 'hybrid' : 'deterministic',
        metric_snapshot: metrics,
        evidence: [{ source: 'aggregated', period: 'today' }],
        source_entities: ['SalesInvoice', 'InventoryItem', 'ProductionBatch', 'AttendanceException', 'ClockRecord', 'Task', 'PurchaseOrder', 'FinanceSyncQueue'],
        generated_at: generatedAt, data_freshness: dataFreshness, data_period: 'today',
        data_sufficiency: sufficient,
        insufficient_data_reason: sufficient ? '' : 'No operational data recorded today. Complete a sale, log production, or record inventory to generate a briefing.',
        recommended_actions: deterministicPriorities,
        top_priorities: deterministicPriorities,
        model_or_rule_version: RULE_VERSION,
      };
      try { await persistInsight(base44, result, user); } catch (e) {}
      return Response.json(result);
    }

    if (action === 'anomalies') {
      const anomalies = [];
      if (revenueYest > 0 && revenueToday < revenueYest * 0.6 && salesCount > 0) {
        anomalies.push({ type: 'sales_decline', actual: revenueToday, baseline: revenueYest, difference: round2(revenueToday - revenueYest), threshold: '40% drop', severity: 'high', evidence: ['SalesInvoice'], investigation: "Compare today's sales mix & traffic vs yesterday." });
      }
      if (revenueYest > 0 && revenueToday > revenueYest * 1.4) {
        anomalies.push({ type: 'sales_increase', actual: revenueToday, baseline: revenueYest, difference: round2(revenueToday - revenueYest), threshold: '40% rise', severity: 'low', evidence: ['SalesInvoice'], investigation: 'Confirm driver (promotion/event) and ensure inventory can sustain.' });
      }
      if (revenueToday > 0 && marginToday < 40) {
        anomalies.push({ type: 'margin_deterioration', actual: marginToday, baseline: 50, difference: round2(marginToday - 50), threshold: 'below 40%', severity: 'high', evidence: ['SalesInvoice', 'Recipe'], investigation: 'Check ingredient cost drift or excessive discounting.' });
      }
      if (cogsToday > 0 && revenueToday > 0 && (cogsToday / revenueToday) > 0.7) {
        anomalies.push({ type: 'cogs_spike', actual: round2((cogsToday / revenueToday) * 100), baseline: 50, difference: 0, threshold: 'COGS > 70% of revenue', severity: 'high', evidence: ['SalesInvoice'], investigation: 'Review recipe costs & waste.' });
      }
      if (lowStock.length > inventory.length * 0.3 && inventory.length > 0) {
        anomalies.push({ type: 'rapid_inventory_depletion', actual: lowStock.length, baseline: Math.round(inventory.length * 0.2), difference: 0, threshold: '>30% items low', severity: 'medium', evidence: ['InventoryItem'], investigation: 'Replenishment may be overdue.' });
      }
      if (stockoutRisk.length > 0) {
        anomalies.push({ type: 'stockout_risk', actual: stockoutRisk.length, baseline: 0, difference: stockoutRisk.length, threshold: 'items at zero stock', severity: 'critical', evidence: ['InventoryItem'], investigation: 'Raise emergency POs for stockout items.' });
      }
      if (overtimeHours > 2) {
        anomalies.push({ type: 'overtime_increase', actual: overtimeHours, baseline: 1, difference: round2(overtimeHours - 1), threshold: '>2h today', severity: 'medium', evidence: ['ClockRecord'], investigation: 'Review scheduling vs demand.' });
      }
      if (failedSync > 2) {
        anomalies.push({ type: 'finance_sync_failure_spike', actual: failedSync, baseline: 2, difference: failedSync - 2, threshold: '>2 failures', severity: 'high', evidence: ['FinanceSyncQueue'], investigation: 'Check Xero connection & mappings in Finance Integration.' });
      }
      if (openTasks > 15) {
        anomalies.push({ type: 'task_backlog_growth', actual: openTasks, baseline: 15, difference: openTasks - 15, threshold: '>15 open', severity: 'medium', evidence: ['Task'], investigation: 'Re-prioritise or reassign backlog.' });
      }
      if (complianceOpen > 3) {
        anomalies.push({ type: 'compliance_deterioration', actual: complianceOpen, baseline: 3, difference: complianceOpen - 3, threshold: '>3 open', severity: 'high', evidence: ['ComplianceRecord'], investigation: 'Escalate overdue compliance items.' });
      }
      const result = {
        tenant_id: tenantId, outlet_id: outletId || null,
        insight_type: 'anomaly', title: 'Operational Anomalies',
        summary: `${anomalies.length} anomaly(ies) detected. ${anomalies.filter(a => a.severity === 'critical' || a.severity === 'high').length} high/critical.`,
        severity: anomalies.some(a => a.severity === 'critical') ? 'critical' : anomalies.some(a => a.severity === 'high') ? 'high' : 'info',
        confidence: 1, generation_method: 'deterministic',
        metric_snapshot: { anomalies, generated_method_note: 'Rule-based detection — not machine learning' },
        evidence: anomalies,
        source_entities: ['SalesInvoice', 'InventoryItem', 'ClockRecord', 'FinanceSyncQueue', 'Task', 'ComplianceRecord'],
        generated_at: generatedAt, data_freshness: dataFreshness, data_period: 'today',
        data_sufficiency: (sales.length === 0 && inventory.length === 0) ? false : true,
        insufficient_data_reason: (sales.length === 0 && inventory.length === 0) ? 'No operational data to evaluate anomalies.' : '',
        recommended_actions: anomalies.map(a => ({ label: a.investigation, type: 'navigate', confirmation_required: false })),
        model_or_rule_version: RULE_VERSION,
      };
      try { await persistInsight(base44, result, user); } catch (e) {}
      return Response.json(result);
    }

    if (action === 'recommendations') {
      const recs = [];
      lowStock.slice(0, 10).forEach(i => recs.push({ label: `Replenish ${i.name} (stock ${i.current_stock}, reorder ${i.reorder_point})`, type: 'Rule-Based Recommendation', source: 'InventoryItem', action: 'raise_po', confirmation_required: true }));
      if (stockoutRisk.length) recs.push({ label: `${stockoutRisk.length} item(s) at stockout — urgent replenishment`, type: 'Rule-Based Recommendation', source: 'InventoryItem', action: 'raise_po', confirmation_required: true });
      if (failedSync) recs.push({ label: `Retry ${failedSync} failed finance sync record(s)`, type: 'Rule-Based Recommendation', source: 'FinanceSyncQueue', action: 'retry_sync', confirmation_required: true });
      if (openExceptions) recs.push({ label: `Follow up ${openExceptions} attendance exception(s)`, type: 'Rule-Based Recommendation', source: 'AttendanceException', action: 'review_attendance', confirmation_required: false });
      if (overtimeHours > 2) recs.push({ label: `Overtime at ${overtimeHours}h — review schedule`, type: 'Rule-Based Recommendation', source: 'ClockRecord', action: 'review_schedule', confirmation_required: false });
      if (complianceOpen) recs.push({ label: `Escalate ${complianceOpen} open compliance item(s)`, type: 'Rule-Based Recommendation', source: 'ComplianceRecord', action: 'escalate_compliance', confirmation_required: false });
      if (marginToday < 50 && revenueToday > 0) recs.push({ label: `Review recipe margins — actual margin ${marginToday}%`, type: 'Rule-Based Recommendation', source: 'Recipe', action: 'review_margin', confirmation_required: false });
      const result = {
        tenant_id: tenantId, outlet_id: outletId || null,
        insight_type: 'recommendation', title: 'Operational Recommendations',
        summary: `${recs.length} rule-based recommendation(s).`,
        severity: 'medium', confidence: 1, generation_method: 'deterministic',
        metric_snapshot: { recommendations: recs, label_note: 'All recommendations are Rule-Based — not AI forecasts or ML predictions.' },
        evidence: recs, source_entities: ['InventoryItem', 'FinanceSyncQueue', 'AttendanceException', 'ClockRecord', 'ComplianceRecord', 'Recipe'],
        generated_at: generatedAt, data_freshness: dataFreshness, data_period: 'today',
        data_sufficiency: recs.length === 0 ? false : true,
        insufficient_data_reason: recs.length === 0 ? 'No actionable conditions detected — all operational thresholds within normal range.' : '',
        recommended_actions: recs,
        model_or_rule_version: RULE_VERSION,
      };
      try { await persistInsight(base44, result, user); } catch (e) {}
      return Response.json(result);
    }

    if (action === 'margin_analysis') {
      const recipeMargins = recipes.map(r => {
        const sp = r.selling_price || 0;
        const cogsR = r.total_cogs || 0;
        const expected = sp > 0 ? round2(((sp - cogsR) / sp) * 100) : 0;
        const sold = paidSales.flatMap(s => (s.line_items || []).filter(li => li.recipe_id === r.id));
        const actualRev = sold.reduce((s, li) => s + (li.total || 0), 0);
        const actualCogs = sold.reduce((s, li) => s + (li.cogs || 0), 0);
        const actual = actualRev > 0 ? round2(((actualRev - actualCogs) / actualRev) * 100) : null;
        return { name: r.menu_item_name, expected_margin: expected, actual_margin: actual, variance: actual != null ? round2(actual - expected) : null, revenue: round2(actualRev), cogs: round2(actualCogs) };
      });
      const mostProfitable = recipeMargins.filter(m => m.actual_margin != null).sort((a, b) => b.actual_margin - a.actual_margin).slice(0, 5);
      const lowestMargin = recipeMargins.filter(m => m.actual_margin != null).sort((a, b) => a.actual_margin - b.actual_margin).slice(0, 5);
      const belowTarget = recipeMargins.filter(m => m.actual_margin != null && m.actual_margin < 50);
      const result = {
        tenant_id: tenantId, outlet_id: outletId || null,
        insight_type: 'margin_analysis', title: 'Margin Intelligence',
        summary: `${recipeMargins.length} recipes. ${belowTarget.length} below 50% target margin. Top: ${mostProfitable[0]?.name || 'n/a'}.`,
        severity: belowTarget.length > 2 ? 'high' : 'medium', confidence: 1, generation_method: 'deterministic',
        metric_snapshot: { recipeMargins, mostProfitable, lowestMargin, belowTarget },
        evidence: recipeMargins, source_entities: ['Recipe', 'SalesInvoice'],
        generated_at: generatedAt, data_freshness: dataFreshness, data_period: 'today',
        data_sufficiency: recipes.length === 0 ? false : (paidSales.length === 0),
        insufficient_data_reason: recipes.length === 0 ? 'No recipes configured.' : (paidSales.length === 0 ? 'No completed sales today to compute actual margins — showing expected margins only.' : ''),
        recommended_actions: belowTarget.map(m => ({ label: `Review pricing/cost for ${m.name} (margin ${m.actual_margin}%)`, type: 'Rule-Based Recommendation', action: 'review_recipe', confirmation_required: true })),
        model_or_rule_version: RULE_VERSION,
      };
      try { await persistInsight(base44, result, user); } catch (e) {}
      return Response.json(result);
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[nexusIntelligence] fatal:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function persistInsight(base44, insight, user) {
  await base44.asServiceRole.entities.NexusInsight.create({
    tenant_id: insight.tenant_id,
    outlet_id: insight.outlet_id || null,
    insight_type: insight.insight_type,
    title: insight.title,
    summary: (insight.summary || '').substring(0, 2000),
    severity: insight.severity,
    confidence: insight.confidence,
    status: 'open',
    evidence: insight.evidence || [],
    source_entities: insight.source_entities || [],
    metric_snapshot: insight.metric_snapshot || {},
    recommendations: (insight.recommended_actions || []).map(a => a.label || a),
    generated_at: insight.generated_at,
    data_freshness: insight.data_freshness,
    data_period: insight.data_period,
    data_sufficiency: insight.data_sufficiency !== false,
    insufficient_data_reason: insight.insufficient_data_reason || '',
    generation_method: insight.generation_method || 'deterministic',
    model_or_rule_version: insight.model_or_rule_version,
    generation_metadata: { actor_id: user.id, role: user.role, generation_method: insight.generation_method },
  });
}