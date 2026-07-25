import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * Sales Engine — OrbitanOS F&B Sales Execution (Build Package #12, Parts F/G/H)
 * Principle: Respond
 *
 * Transactional sales on the existing SalesInvoice entity. On completion:
 *   - validates finished-goods availability (completed ProductionBatch − sold lines)
 *   - computes COGS (Recipe.total_cogs × qty), gross profit, margin
 *   - applies tax %, service charge %, order + line discounts
 *   - creates SalesInvoice (payment_status paid)
 *   - audit-logs + enqueues FinanceSyncQueue (invoice_sync, Xero-ready)
 *
 * Finished-goods availability is deterministic: available(recipe) =
 *   Σ completed ProductionBatch.quantity_produced
 *   − Σ SalesInvoice line.quantity where payment_status='paid' & line.recipe_id=recipe
 * Never allows negative finished-goods.
 *
 * Cancel: marks invoice cancelled (availability auto-recovers) + enqueues credit_note.
 * Refund: records refund; restock_finished_goods=false keeps goods consumed (explicit decision),
 *         =true recovers availability (goods physically returned).
 *
 * Reuses: SalesInvoice, ProductionBatch, Recipe, FinanceSyncQueue, AuditLog.
 */

const ALLOWED_ROLES = ['admin', 'tenant_admin', 'outlet_manager'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!ALLOWED_ROLES.includes(user.role)) {
      return Response.json({ error: 'Forbidden — sales requires a manager role' }, { status: 403 });
    }

    let payload = {};
    try { payload = await req.json(); } catch (e) {}
    const action = payload.action;
    const tenantId = payload.tenant_id || user?.data?.tenant_id;
    const outletId = payload.outlet_id || user?.data?.outlet_id;
    if (!tenantId || !outletId) {
      return Response.json({ error: 'tenant_id and outlet_id required' }, { status: 400 });
    }

    // ── helper: finished-goods availability per recipe ──
    async function availabilityMap(recipeIds) {
      const produced = {};
      const sold = {};
      if (recipeIds.length === 0) return { produced, sold };
      const batches = await base44.asServiceRole.entities.ProductionBatch.filter({
        tenant_id: tenantId, outlet_id: outletId, status: 'completed'
      });
      batches.forEach(b => {
        if (b.recipe_id) produced[b.recipe_id] = (produced[b.recipe_id] || 0) + (b.quantity_produced || 0);
      });
      const invoices = await base44.asServiceRole.entities.SalesInvoice.filter({
        tenant_id: tenantId, outlet_id: outletId
      });
      invoices.forEach(inv => {
        if (inv.payment_status !== 'paid') return;
        (inv.line_items || []).forEach(li => {
          if (li.recipe_id) sold[li.recipe_id] = (sold[li.recipe_id] || 0) + (li.quantity || 0);
        });
      });
      return { produced, sold };
    }

    // ── CREATE ──
    if (action === 'create') {
      const lines = Array.isArray(payload.line_items) ? payload.line_items : [];
      if (lines.length === 0) return Response.json({ error: 'At least one line item required' }, { status: 400 });

      // resolve recipes
      const recipes = await base44.asServiceRole.entities.Recipe.filter({ tenant_id: tenantId, is_active: true });
      const recipeMap = new Map(recipes.map(r => [r.id, r]));

      const recipeIds = lines.map(l => l.recipe_id).filter(Boolean);
      const { produced, sold } = await availabilityMap(recipeIds);

      const lineItems = [];
      let cogsTotal = 0;
      let subtotal = 0;
      const shortages = [];
      for (const l of lines) {
        const recipe = recipeMap.get(l.recipe_id);
        if (!recipe) { shortages.push({ recipe_id: l.recipe_id, issue: 'Recipe not found' }); continue; }
        const qty = Math.max(0, Number(l.quantity) || 0);
        if (qty <= 0) { shortages.push({ recipe_id: recipe.id, issue: 'Quantity must be > 0' }); continue; }
        const available = (produced[recipe.id] || 0) - (sold[recipe.id] || 0);
        if (available < qty) {
          shortages.push({ recipe_name: recipe.menu_item_name, required: qty, available, shortage: qty - available });
          continue;
        }
        const unitPrice = Number(l.unit_price ?? recipe.selling_price ?? 0);
        const lineDiscount = Math.max(0, Number(l.discount) || 0);
        const lineTotal = Math.max(0, unitPrice * qty - lineDiscount);
        const lineCogs = (recipe.total_cogs || 0) * qty;
        cogsTotal += lineCogs;
        subtotal += lineTotal;
        sold[recipe.id] = (sold[recipe.id] || 0) + qty; // account for this sale in subsequent lines
        lineItems.push({
          recipe_id: recipe.id,
          recipe_name: recipe.menu_item_name,
          description: recipe.menu_item_name,
          quantity: qty,
          unit_price: unitPrice,
          cogs: lineCogs,
          total: lineTotal,
        });
      }
      if (shortages.length) {
        return Response.json({ error: 'Sale blocked — insufficient finished goods or invalid lines', shortages }, { status: 400 });
      }

      const orderDiscount = Math.max(0, Number(payload.order_discount) || 0);
      const taxable = Math.max(0, subtotal - orderDiscount);
      const taxPct = Math.max(0, Number(payload.tax_pct) || 0);
      const servicePct = Math.max(0, Number(payload.service_charge_pct) || 0);
      const taxAmount = +(taxable * taxPct / 100).toFixed(2);
      const serviceCharge = +(taxable * servicePct / 100).toFixed(2);
      const total = +(taxable + taxAmount + serviceCharge).toFixed(2);
      const grossProfit = +(subtotal - cogsTotal).toFixed(2);
      const grossMarginPct = subtotal > 0 ? +((grossProfit / subtotal) * 100).toFixed(1) : 0;

      const invNow = new Date();
      const invRand = Math.random().toString(36).slice(2, 4).toUpperCase();
      const invoiceNumber = `INV-${invNow.getFullYear()}-${invRand}${Date.now().toString().slice(-6)}`;
      const invoice = await base44.asServiceRole.entities.SalesInvoice.create({
        tenant_id: tenantId,
        outlet_id: outletId,
        invoice_number: invoiceNumber,
        date: new Date().toISOString().split('T')[0],
        customer_name: payload.customer_name || 'Walk-in Customer',
        customer_email: payload.customer_email || '',
        line_items: lineItems,
        subtotal: +subtotal.toFixed(2),
        tax_amount: taxAmount,
        total,
        cogs_total: +cogsTotal.toFixed(2),
        gross_profit: grossProfit,
        payment_method: payload.payment_method || 'cash',
        payment_status: 'paid',
        processing_status: 'verified',
        notes: payload.notes || '',
        audit_trail: [{
          action: 'created', user_id: user.id, user_name: user.full_name || user.email,
          timestamp: new Date().toISOString(),
          details: `Sale created: ${lineItems.length} line(s), total ${total}.`,
        }],
      });

      // Audit
      await base44.asServiceRole.entities.AuditLog.create({
        tenant_id: tenantId, outlet_id: outletId,
        actor_id: user.id, actor_name: user.full_name || user.email, actor_role: user.role,
        action_type: 'sales_invoice_created', module: 'sales',
        target_entity: 'SalesInvoice', target_record_id: invoice.id,
        new_state: { invoice_number: invoiceNumber, total, cogs_total: cogsTotal, gross_profit: grossProfit },
        details: `Sale ${invoiceNumber} created for ${payload.customer_name || 'Walk-in'}. Revenue ${total}, COGS ${cogsTotal.toFixed(2)}, margin ${grossMarginPct}%.`,
      });

      // Enqueue finance sync (Xero ACCREC invoice)
      let financeQueued = false;
      try {
        await base44.asServiceRole.entities.FinanceSyncQueue.create({
          tenant_id: tenantId, outlet_id: outletId,
          queue_type: 'invoice_sync',
          source_entity: 'SalesInvoice', source_record_id: invoice.id,
          erp_target: 'xero',
          payload: {
            Type: 'ACCREC',
            InvoiceNumber: invoiceNumber,
            Contact: { Name: payload.customer_name || 'Walk-in Customer' },
            Date: invoice.date,
            LineItems: lineItems.map(li => ({
              Description: li.description, Quantity: li.quantity, UnitAmount: li.unit_price,
              DiscountRate: (li.unit_price > 0 && li.quantity > 0) ? +(((1 - (li.total / (li.unit_price * li.quantity))) * 100).toFixed(2)) : 0,
            })),
            Status: 'AUTHORISED',
          },
          financial_impact_sgd: total,
          impact_category: 'revenue',
          status: 'pending',
          priority: 'end_of_shift',
          created_by_id: user.id,
          notes: 'Auto-enqueued by salesEngine',
        });
        financeQueued = true;
      } catch (fqErr) { /* non-fatal */ }

      return Response.json({
        success: true,
        invoice: { id: invoice.id, invoice_number: invoiceNumber, total, gross_profit: grossProfit, gross_margin_pct: grossMarginPct },
        finance_queued: financeQueued,
      });
    }

    // ── CANCEL ──
    if (action === 'cancel') {
      if (!payload.invoice_id) return Response.json({ error: 'invoice_id required' }, { status: 400 });
      const inv = await base44.asServiceRole.entities.SalesInvoice.get(payload.invoice_id);
      if (!inv || inv.tenant_id !== tenantId) return Response.json({ error: 'Invoice not found' }, { status: 404 });
      if (inv.payment_status === 'cancelled') return Response.json({ error: 'Invoice already cancelled' }, { status: 400 });

      const updated = await base44.asServiceRole.entities.SalesInvoice.update(inv.id, {
        payment_status: 'cancelled',
        audit_trail: [...(inv.audit_trail || []), {
          action: 'cancelled', user_id: user.id, user_name: user.full_name || user.email,
          timestamp: new Date().toISOString(), details: payload.reason || 'Cancelled by manager',
        }],
      });

      await base44.asServiceRole.entities.AuditLog.create({
        tenant_id: tenantId, outlet_id: inv.outlet_id || outletId,
        actor_id: user.id, actor_name: user.full_name || user.email, actor_role: user.role,
        action_type: 'sales_invoice_cancelled', module: 'sales',
        target_entity: 'SalesInvoice', target_record_id: inv.id,
        previous_state: { payment_status: inv.payment_status }, new_state: { payment_status: 'cancelled' },
        details: `Sale ${inv.invoice_number} cancelled. Finished-goods availability recovered (deterministic).`,
      });

      // Enqueue credit note for finance reversal
      try {
        await base44.asServiceRole.entities.FinanceSyncQueue.create({
          tenant_id: tenantId, outlet_id: inv.outlet_id || outletId,
          queue_type: 'credit_note', source_entity: 'SalesInvoice', source_record_id: inv.id,
          erp_target: 'xero',
          payload: { Type: 'ACCRECCREDIT', Reference: `Cancel ${inv.invoice_number}`, Date: new Date().toISOString().split('T')[0], Contact: { Name: inv.customer_name || 'Walk-in' }, LineItems: [{ Description: `Cancellation of ${inv.invoice_number}`, Quantity: 1, UnitAmount: inv.total || 0 }], Status: 'AUTHORISED' },
          financial_impact_sgd: -(inv.total || 0), impact_category: 'revenue',
          status: 'pending', priority: 'end_of_shift', created_by_id: user.id,
          notes: 'Cancellation credit note — salesEngine',
        });
      } catch (e) { /* non-fatal */ }

      return Response.json({ success: true, invoice_id: inv.id, payment_status: 'cancelled' });
    }

    // ── REFUND ──
    if (action === 'refund') {
      if (!payload.invoice_id) return Response.json({ error: 'invoice_id required' }, { status: 400 });
      const inv = await base44.asServiceRole.entities.SalesInvoice.get(payload.invoice_id);
      if (!inv || inv.tenant_id !== tenantId) return Response.json({ error: 'Invoice not found' }, { status: 404 });
      if (inv.payment_status === 'cancelled') return Response.json({ error: 'Invoice already cancelled — refund not applicable' }, { status: 400 });
      const amount = Math.min(inv.total || 0, Math.max(0, Number(payload.amount) || 0));
      if (amount <= 0) return Response.json({ error: 'Refund amount must be greater than 0' }, { status: 400 });
      const restock = !!payload.restock_finished_goods;
      const fullRefund = amount >= (inv.total || 0);

      const newStatus = (fullRefund && restock) ? 'cancelled' : inv.payment_status;
      const updated = await base44.asServiceRole.entities.SalesInvoice.update(inv.id, {
        payment_status: newStatus,
        notes: (inv.notes || '') + (inv.notes ? ' | ' : '') + `Refund: ${amount} (restock=${restock}). ${payload.reason || ''}`,
        audit_trail: [...(inv.audit_trail || []), {
          action: 'refunded', user_id: user.id, user_name: user.full_name || user.email,
          timestamp: new Date().toISOString(),
          details: `Refund ${amount}${restock ? ' (finished goods restocked)' : ' (goods not restocked — explicit decision)'}. Reason: ${payload.reason || 'N/A'}`,
        }],
      });

      await base44.asServiceRole.entities.AuditLog.create({
        tenant_id: tenantId, outlet_id: inv.outlet_id || outletId,
        actor_id: user.id, actor_name: user.full_name || user.email, actor_role: user.role,
        action_type: 'sales_invoice_refunded', module: 'sales',
        target_entity: 'SalesInvoice', target_record_id: inv.id,
        previous_state: { payment_status: inv.payment_status }, new_state: { payment_status: newStatus, refund_amount: amount, restock },
        details: `Sale ${inv.invoice_number} refunded ${amount}. Restock finished goods: ${restock}. Reason: ${payload.reason || 'N/A'}`,
      });

      try {
        await base44.asServiceRole.entities.FinanceSyncQueue.create({
          tenant_id: tenantId, outlet_id: inv.outlet_id || outletId,
          queue_type: 'credit_note', source_entity: 'SalesInvoice', source_record_id: inv.id,
          erp_target: 'xero',
          payload: { Type: 'ACCRECCREDIT', Reference: `Refund ${inv.invoice_number}`, Date: new Date().toISOString().split('T')[0], Contact: { Name: inv.customer_name || 'Walk-in' }, LineItems: [{ Description: `Refund of ${inv.invoice_number}`, Quantity: 1, UnitAmount: amount }], Status: 'AUTHORISED' },
          financial_impact_sgd: -amount, impact_category: 'revenue',
          status: 'pending', priority: 'end_of_shift', created_by_id: user.id,
          notes: `Refund credit note — salesEngine (restock=${restock})`,
        });
      } catch (e) { /* non-fatal */ }

      return Response.json({ success: true, invoice_id: inv.id, refund_amount: amount, payment_status: newStatus, restock });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});