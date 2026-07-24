import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * Orbit Nexus Business Copilot (Build Package #13, Part I/J)
 * Grounded Q&A over tenant-scoped operational data. NEVER executes actions.
 *
 * Flow: classify question → retrieve relevant grounded data → InvokeLLM
 * synthesis with strict "use only provided data" instructions → return
 * Answer / Evidence / Recommended Actions / Available Authorised Actions.
 *
 * Action Safety (Part J): never creates/approves/refunds/cancels/pays/syncs.
 * Proposed actions are returned for the user to confirm via existing flows.
 */

const ALLOWED = ['admin', 'tenant_admin', 'outlet_manager', 'supervisor'];
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const todayStr = () => new Date().toISOString().split('T')[0];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!ALLOWED.includes(user.role)) {
      return Response.json({ error: 'Forbidden — Business Copilot requires a supervisor/manager role' }, { status: 403 });
    }

    let payload = {};
    try { payload = await req.json(); } catch (e) {}
    const question = (payload.question || '').trim();
    const tenantId = payload.tenant_id || user?.data?.tenant_id;
    const outletId = payload.outlet_id || user?.data?.outlet_id;
    if (!tenantId) return Response.json({ error: 'tenant_id required' }, { status: 400 });
    if (!question) return Response.json({ error: 'question required' }, { status: 400 });

    const f = { tenant_id: tenantId };
    if (outletId && user.role !== 'tenant_admin' && user.role !== 'admin') f.outlet_id = outletId;
    const today = todayStr();

    // ── Retrieve grounded operational context (broad, then LLM reasons) ──
    const [sales, inventory, batches, exceptions, tasks, poPending, queue, recipes] = await Promise.all([
      base44.asServiceRole.entities.SalesInvoice.filter({ ...f, date: today }, '-created_date', 100).catch(() => []),
      base44.asServiceRole.entities.InventoryItem.filter({ ...f, status: { $ne: 'inactive' } }, '-created_date', 200).catch(() => []),
      base44.asServiceRole.entities.ProductionBatch.filter({ ...f, status: 'completed', production_date: today }, '-created_date', 50).catch(() => []),
      base44.asServiceRole.entities.AttendanceException.filter({ ...f, status: { $in: ['detected', 'pending_review', 'manager_review'] } }, '-created_date', 50).catch(() => []),
      base44.asServiceRole.entities.Task.filter({ ...f, status: { $in: ['pending', 'in_progress', 'open'] } }, '-created_date', 50).catch(() => []),
      base44.asServiceRole.entities.PurchaseOrder.filter({ ...f, status: { $in: ['draft', 'pending_approval', 'sent', 'partially_received'] } }, '-created_date', 50).catch(() => []),
      base44.asServiceRole.entities.FinanceSyncQueue.filter({ tenant_id: tenantId, status: { $in: ['failed', 'pending'] } }, '-created_date', 50).catch(() => []),
      base44.asServiceRole.entities.Recipe.filter({ tenant_id: tenantId, is_active: true }, '-created_date', 100).catch(() => []),
    ]);

    const paidSales = sales.filter(s => s.payment_status === 'paid');
    const revenue = round2(paidSales.reduce((s, x) => s + (x.total || 0), 0));
    const cogs = round2(paidSales.reduce((s, x) => s + (x.cogs_total || 0), 0));
    const gp = round2(revenue - cogs);
    const margin = revenue > 0 ? round2((gp / revenue) * 100) : 0;
    const lowStock = inventory.filter(i => (i.current_stock ?? 0) <= (i.reorder_point ?? 0)).slice(0, 10);
    const stockout = inventory.filter(i => (i.current_stock ?? 0) <= 0).slice(0, 10);
    const failedSync = queue.filter(q => q.status === 'failed').length;
    const pendingSync = queue.filter(q => q.status === 'pending').length;
    const prodQty = batches.reduce((s, b) => s + (b.quantity_produced || 0), 0);

    const itemMap = {};
    paidSales.forEach(s => (s.line_items || []).forEach(li => {
      const key = li.recipe_name || li.description || 'Item';
      itemMap[key] = (itemMap[key] || 0) + (li.quantity || 0);
    }));
    const topItems = Object.entries(itemMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k} (${v})`);

    const lowMarginRecipes = recipes.map(r => {
      const sp = r.selling_price || 0;
      return { name: r.menu_item_name, margin: sp > 0 ? round2(((sp - (r.total_cogs || 0)) / sp) * 100) : 0 };
    }).filter(m => m.margin < 50).slice(0, 5);

    const dataContext = `VERIFIED OPERATIONAL DATA (today, ${today}):
- Revenue today: ${revenue} | COGS: ${cogs} | Gross profit: ${gp} | Gross margin: ${margin}% | Sales count: ${paidSales.length}
- Top selling items: ${topItems.join(', ') || 'none'}
- Low stock items (${lowStock.length}): ${lowStock.map(i => `${i.name} (stock ${i.current_stock})`).join(', ') || 'none'}
- Stockout risk (${stockout.length}): ${stockout.map(i => i.name).join(', ') || 'none'}
- Production today: ${batches.length} batches, ${prodQty} units
- Open tasks: ${tasks.length} | Attendance exceptions: ${exceptions.length}
- Pending POs: ${poPending.length}
- Finance sync: ${failedSync} failed, ${pendingSync} pending
- Low-margin recipes: ${lowMarginRecipes.map(m => `${m.name} (${m.margin}%)`).join(', ') || 'none'}`;

    const prompt = `You are Orbit Nexus, the Business Copilot for an F&B/sustainability operations platform. Answer the manager's question using ONLY the verified operational data below. 

RULES:
- Use ONLY the data provided. Never invent numbers, dates, or records.
- If the data doesn't answer the question, say exactly what data is missing.
- Be concise and practical (max 150 words).
- Separate your answer into: ANSWER, EVIDENCE (cite the specific metric), RECOMMENDED ACTIONS.
- NEVER claim you will perform an action. You cannot create, approve, refund, cancel, pay, or sync anything. Only recommend actions the manager can confirm.
- Format the response as a JSON object with keys: answer, evidence, recommended_actions (array of strings), available_actions (array of {label, action_type, confirmation_required:true}).

${dataContext}

QUESTION: ${question}`;

    let answer = '', evidence = [], recommendedActions = [], availableActions = [];
    let generationMethod = 'hybrid';
    try {
      const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            answer: { type: 'string' },
            evidence: { type: 'array', items: { type: 'string' } },
            recommended_actions: { type: 'array', items: { type: 'string' } },
            available_actions: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, action_type: { type: 'string' }, confirmation_required: { type: 'boolean' } } } },
          },
          required: ['answer', 'evidence', 'recommended_actions'],
        },
      });
      const r = llm?.response || llm || {};
      answer = r.answer || (typeof r === 'string' ? r : '');
      evidence = r.evidence || [];
      recommendedActions = r.recommended_actions || [];
      availableActions = r.available_actions || [];
    } catch (e) {
      // Graceful degradation — deterministic fallback
      generationMethod = 'deterministic';
      const q = question.toLowerCase();
      if (q.includes('revenue') || q.includes('sales')) {
        answer = `Revenue today is ${revenue} across ${paidSales.length} sales. Gross margin is ${margin}%.`;
        evidence = [`SalesInvoice: revenue ${revenue}, margin ${margin}%`];
      } else if (q.includes('margin') || q.includes('profit')) {
        answer = `Gross margin today is ${margin}% (gross profit ${gp}). ${lowMarginRecipes.length ? lowMarginRecipes.length + ' recipes below 50% target.' : 'All recipes above target.'}`;
        evidence = [`SalesInvoice/Recipe: gp ${gp}, margin ${margin}%`];
      } else if (q.includes('stock') || q.includes('reorder') || q.includes('stockout')) {
        answer = `${lowStock.length} low-stock items, ${stockout.length} at stockout. ${lowStock.length ? 'Replenishment recommended: ' + lowStock.slice(0, 5).map(i => i.name).join(', ') + '.' : 'Inventory healthy.'}`;
        evidence = [`InventoryItem: ${lowStock.length} low, ${stockout.length} stockout`];
        availableActions = [{ label: 'Raise purchase orders', action_type: 'navigate_procurement', confirmation_required: true }];
      } else if (q.includes('sync') || q.includes('finance') || q.includes('xero')) {
        answer = `Finance sync: ${failedSync} failed, ${pendingSync} pending. ${failedSync ? 'Retry failed records in Finance Integration.' : 'Queue healthy.'}`;
        evidence = [`FinanceSyncQueue: ${failedSync} failed, ${pendingSync} pending`];
        availableActions = failedSync ? [{ label: 'Retry failed sync', action_type: 'retry_sync', confirmation_required: true }] : [];
      } else if (q.includes('attend') || q.includes('exception')) {
        answer = `${exceptions.length} attendance exception(s) open. ${exceptions.length ? 'Review in Workforce/Timesheets.' : 'No exceptions.'}`;
        evidence = [`AttendanceException: ${exceptions.length} open`];
      } else {
        answer = `I can answer using today's operational data: revenue ${revenue}, margin ${margin}%, ${lowStock.length} low-stock, ${failedSync} sync failures, ${tasks.length} open tasks, ${exceptions.length} attendance exceptions. Ask specifically about revenue, margin, stock, finance sync, attendance, or tasks.`;
        evidence = ['aggregated operational metrics'];
      }
      recommendedActions = availableActions.map(a => a.label);
    }

    const sufficient = paidSales.length > 0 || inventory.length > 0;
    const result = {
      tenant_id: tenantId, outlet_id: outletId || null,
      insight_type: 'copilot_answer', title: 'Business Copilot',
      summary: answer,
      severity: 'info', confidence: generationMethod === 'hybrid' ? 0.85 : 0.7,
      generation_method: generationMethod,
      evidence: evidence.map(e => ({ source: 'copilot', detail: e })),
      source_entities: ['SalesInvoice', 'InventoryItem', 'ProductionBatch', 'AttendanceException', 'Task', 'PurchaseOrder', 'FinanceSyncQueue', 'Recipe'],
      generated_at: new Date().toISOString(), data_freshness: new Date().toISOString(), data_period: 'today',
      data_sufficiency: sufficient, insufficient_data_reason: sufficient ? '' : 'No operational data recorded today — copilot answers require sales or inventory data.',
      recommended_actions: recommendedActions.map(r => ({ label: r, type: 'recommendation', confirmation_required: true })),
      available_actions: availableActions,
      question,
      model_or_rule_version: 'copilot-v1',
      action_safety_note: 'Orbit Nexus never executes actions automatically. All proposed actions require explicit manager confirmation via existing governed flows.',
    };

    try {
      await base44.asServiceRole.entities.NexusInsight.create({
        tenant_id: tenantId, outlet_id: outletId || null,
        insight_type: 'copilot_answer', title: `Q: ${question.substring(0, 80)}`,
        summary: answer.substring(0, 2000), severity: 'info',
        confidence: result.confidence, status: 'open',
        evidence: result.evidence, source_entities: result.source_entities,
        metric_snapshot: { question, generation_method },
        recommendations: recommendedActions,
        generated_at: result.generated_at, data_freshness: result.data_freshness, data_period: 'today',
        data_sufficiency: sufficient, insufficient_data_reason: result.insufficient_data_reason,
        generation_method, model_or_rule_version: 'copilot-v1',
        generation_metadata: { actor_id: user.id, role: user.role },
      });
    } catch (e) {}

    return Response.json(result);
  } catch (error) {
    console.error('[nexusCopilot] fatal:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});