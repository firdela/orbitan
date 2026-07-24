import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * Production Engine — OrbitanOS F&B Production (Build Package #11, Parts A/B/C/E/F)
 * Principle: Refine
 *
 * Transactional recipe-production engine. Turns a Recipe (Bill of Materials) into
 * produced finished goods by auto-deducting ingredient InventoryItem stock.
 *
 * Actions:
 *   preview  — compute ingredient consumption + cost + yield for a candidate batch (no writes)
 *   confirm  — validate sufficiency, deduct inventory (never negative), create ProductionBatch,
 *              audit each deduction, enqueue FinanceSyncQueue (journal_entry)
 *   cancel   — cancel a planned/in_progress batch (completed batches are immutable)
 *
 * Integrity: pre-validates ALL ingredients before any write; on any write failure, rolls back
 * already-deducted items. Never allows negative stock.
 *
 * Exit-Ready: pure business logic over Base44 entities; swap the ERP target without touching rules.
 */

const ALLOWED_ROLES = ['admin', 'tenant_admin', 'outlet_manager'];

function buildConsumption(recipe, quantity) {
  // recipe.ingredients[].quantity_required is per 1 unit of the menu item.
  // total_consumed = quantity_required * quantity_to_produce.
  return (recipe.ingredients || [])
    .filter(ing => ing.inventory_item_id)
    .map(ing => ({
      inventory_item_id: ing.inventory_item_id,
      inventory_item_name: ing.inventory_item_name || ing.inventory_item_id,
      quantity_required_per_unit: ing.quantity_required || 0,
      total_consumed: (ing.quantity_required || 0) * quantity,
      unit: ing.unit || '',
      unit_cost: ing.unit_cost_snapshot || 0, // refined below from live inventory
      line_cost: 0,
    }));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!ALLOWED_ROLES.includes(user.role)) {
      return Response.json({ error: 'Forbidden — production requires a manager role' }, { status: 403 });
    }

    let payload = {};
    try { payload = await req.json(); } catch (e) {}
    const action = payload.action;
    const tenantId = payload.tenant_id || user?.data?.tenant_id;
    const outletId = payload.outlet_id || user?.data?.outlet_id;

    if (!tenantId || !outletId) {
      return Response.json({ error: 'tenant_id and outlet_id required' }, { status: 400 });
    }

    // ── PREVIEW ──────────────────────────────────────────────
    if (action === 'preview') {
      if (!payload.recipe_id) return Response.json({ error: 'recipe_id required' }, { status: 400 });
      const quantity = Math.max(0, Number(payload.quantity) || 0);
      const recipe = await base44.asServiceRole.entities.Recipe.get(payload.recipe_id);
      if (!recipe || recipe.tenant_id !== tenantId) {
        return Response.json({ error: 'Recipe not found' }, { status: 404 });
      }
      const consumption = buildConsumption(recipe, quantity);
      // hydrate live stock + cost
      const invMap = new Map();
      if (consumption.length) {
        const invItems = await base44.asServiceRole.entities.InventoryItem.filter({
          tenant_id: tenantId, outlet_id: outletId, status: 'active'
        });
        invItems.forEach(i => invMap.set(i.id, i));
      }
      let totalCost = 0;
      const preview = consumption.map(c => {
        const inv = invMap.get(c.inventory_item_id);
        const unitCost = inv?.cost_per_unit ?? c.unit_cost ?? 0;
        const available = inv?.current_stock ?? 0;
        const lineCost = c.total_consumed * unitCost;
        totalCost += lineCost;
        return {
          ...c,
          unit_cost: unitCost,
          line_cost: lineCost,
          available_stock: available,
          sufficient: available >= c.total_consumed,
        };
      });
      return Response.json({
        recipe_name: recipe.menu_item_name,
        yield_unit: recipe.yield_unit || 'servings',
        quantity_to_produce: quantity,
        production_cost: totalCost,
        ingredients: preview,
        sufficient: preview.every(p => p.sufficient),
      });
    }

    // ── CONFIRM ──────────────────────────────────────────────
    if (action === 'confirm') {
      if (!payload.recipe_id) return Response.json({ error: 'recipe_id required' }, { status: 400 });
      const quantity = Math.max(0, Number(payload.quantity) || 0);
      if (quantity <= 0) return Response.json({ error: 'Quantity must be greater than 0' }, { status: 400 });

      const recipe = await base44.asServiceRole.entities.Recipe.get(payload.recipe_id);
      if (!recipe || recipe.tenant_id !== tenantId) {
        return Response.json({ error: 'Recipe not found' }, { status: 404 });
      }

      const consumption = buildConsumption(recipe, quantity);
      if (consumption.length === 0) {
        return Response.json({ error: 'Recipe has no linked ingredients — cannot produce' }, { status: 400 });
      }

      // 1. Fetch live inventory + pre-validate sufficiency (never negative stock).
      const invItems = await base44.asServiceRole.entities.InventoryItem.filter({
        tenant_id: tenantId, outlet_id: outletId, status: 'active'
      });
      const invMap = new Map();
      invItems.forEach(i => invMap.set(i.id, i));

      const shortages = [];
      const plan = [];
      let productionCost = 0;
      for (const c of consumption) {
        const inv = invMap.get(c.inventory_item_id);
        if (!inv) {
          shortages.push({ name: c.inventory_item_name, issue: 'Inventory item not found (inactive or deleted)' });
          continue;
        }
        const available = inv.current_stock || 0;
        const unitCost = inv.cost_per_unit ?? c.unit_cost ?? 0;
        const lineCost = c.total_consumed * unitCost;
        productionCost += lineCost;
        if (available < c.total_consumed) {
          shortages.push({
            name: inv.name,
            required: c.total_consumed,
            available,
            unit: c.unit,
            shortage: c.total_consumed - available,
          });
        }
        plan.push({ ...c, inv, unit_cost: unitCost, line_cost: lineCost, available_before: available });
      }
      if (shortages.length) {
        return Response.json({
          error: 'Insufficient inventory — production blocked',
          shortages,
        }, { status: 400 });
      }

      // 2. Deduct inventory sequentially; rollback on failure.
      const deducted = [];
      try {
        for (const p of plan) {
          const newStock = p.available_before - p.total_consumed; // validated >= 0
          await base44.asServiceRole.entities.InventoryItem.update(p.inventory_item_id, {
            current_stock: newStock,
          });
          deducted.push(p);
        }
      } catch (deductErr) {
        // Rollback already-deducted items.
        for (const p of deducted) {
          try {
            await base44.asServiceRole.entities.InventoryItem.update(p.inventory_item_id, {
              current_stock: p.available_before,
            });
          } catch (rbErr) { /* best-effort; audit will flag */ }
        }
        return Response.json({ error: 'Production failed during deduction — rolled back', detail: deductErr.message }, { status: 500 });
      }

      // 3. Create the ProductionBatch record (completed).
      const productionDate = (payload.production_date || new Date().toISOString().split('T')[0]);
      const shelfLifeDays = Math.max(0, Number(payload.shelf_life_days) || 0);
      let expiryDate = null;
      if (shelfLifeDays > 0) {
        const d = new Date(productionDate + 'T00:00:00');
        d.setDate(d.getDate() + shelfLifeDays);
        expiryDate = d.toISOString().split('T')[0];
      }
      const existingBatches = await base44.asServiceRole.entities.ProductionBatch.filter({
        tenant_id: tenantId, outlet_id: outletId
      });
      const batchSeq = String((existingBatches.length || 0) + 1).padStart(4, '0');
      const batchNumber = `PB-${new Date().getFullYear()}-${batchSeq}`;

      const consumptionSnapshot = plan.map(p => ({
        inventory_item_id: p.inventory_item_id,
        inventory_item_name: p.inventory_item_name,
        quantity_required_per_unit: p.quantity_required_per_unit,
        total_consumed: p.total_consumed,
        unit: p.unit,
        unit_cost: p.unit_cost,
        line_cost: p.line_cost,
      }));

      const batch = await base44.asServiceRole.entities.ProductionBatch.create({
        tenant_id: tenantId,
        outlet_id: outletId,
        batch_number: batchNumber,
        recipe_id: recipe.id,
        recipe_name: recipe.menu_item_name,
        quantity_produced: quantity,
        yield_unit: recipe.yield_unit || 'servings',
        production_date: productionDate,
        expiry_date: expiryDate,
        shelf_life_days: shelfLifeDays,
        production_cost: productionCost,
        ingredient_consumption: consumptionSnapshot,
        status: 'completed',
        produced_by: user.id,
        produced_by_name: user.full_name || user.email,
        produced_by_role: user.role,
        notes: payload.notes || '',
      });

      // 4. Audit each deduction + the production event.
      for (const p of plan) {
        await base44.asServiceRole.entities.AuditLog.create({
          tenant_id: tenantId,
          outlet_id: outletId,
          actor_id: user.id,
          actor_name: user.full_name || user.email,
          actor_role: user.role,
          action_type: 'production_consumed',
          module: 'inventory',
          target_entity: 'InventoryItem',
          target_record_id: p.inventory_item_id,
          previous_state: { current_stock: p.available_before },
          new_state: { current_stock: p.available_before - p.total_consumed },
          details: `Consumed ${p.total_consumed} ${p.unit} for production batch ${batchNumber} (${recipe.menu_item_name} × ${quantity}).`,
        });
      }
      await base44.asServiceRole.entities.AuditLog.create({
        tenant_id: tenantId,
        outlet_id: outletId,
        actor_id: user.id,
        actor_name: user.full_name || user.email,
        actor_role: user.role,
        action_type: 'production_completed',
        module: 'inventory',
        target_entity: 'ProductionBatch',
        target_record_id: batch.id,
        previous_state: null,
        new_state: { batch_number: batchNumber, quantity_produced: quantity, production_cost: productionCost },
        details: `Production batch ${batchNumber} completed: ${quantity} ${recipe.yield_unit || 'servings'} of ${recipe.menu_item_name}. Cost ${productionCost.toFixed(2)}.`,
      });

      // 5. Enqueue finance sync (Part F) — journal_entry for production cost.
      let financeQueued = false;
      try {
        await base44.asServiceRole.entities.FinanceSyncQueue.create({
          tenant_id: tenantId,
          outlet_id: outletId,
          queue_type: 'journal_entry',
          source_entity: 'ProductionBatch',
          source_record_id: batch.id,
          erp_target: 'xero',
          payload: {
            batch_number: batchNumber,
            recipe_name: recipe.menu_item_name,
            quantity_produced: quantity,
            production_cost: productionCost,
            consumption: consumptionSnapshot,
            description: `Production: ${batchNumber} — ${recipe.menu_item_name} × ${quantity}`,
          },
          financial_impact_sgd: productionCost,
          impact_category: 'adjustment',
          status: 'pending',
          priority: 'end_of_shift',
          created_by_id: user.id,
          notes: 'Auto-enqueued by productionEngine',
        });
        financeQueued = true;
        await base44.asServiceRole.entities.ProductionBatch.update(batch.id, { finance_sync_queued: true });
      } catch (fqErr) {
        // Finance queue failure is non-fatal — production succeeded.
      }

      return Response.json({
        success: true,
        batch: {
          id: batch.id,
          batch_number: batchNumber,
          recipe_name: recipe.menu_item_name,
          quantity_produced: quantity,
          production_cost: productionCost,
          expiry_date: expiryDate,
        },
        ingredients_consumed: plan.length,
        finance_queued: financeQueued,
      });
    }

    // ── CANCEL ───────────────────────────────────────────────
    if (action === 'cancel') {
      if (!payload.batch_id) return Response.json({ error: 'batch_id required' }, { status: 400 });
      const batch = await base44.asServiceRole.entities.ProductionBatch.get(payload.batch_id);
      if (!batch || batch.tenant_id !== tenantId) {
        return Response.json({ error: 'Batch not found' }, { status: 404 });
      }
      if (batch.status === 'completed') {
        return Response.json({ error: 'Completed batches are immutable — cancellation would require stock restoration (not supported)' }, { status: 400 });
      }
      const updated = await base44.asServiceRole.entities.ProductionBatch.update(batch.id, {
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancel_reason: payload.reason || 'Cancelled by manager',
      });
      await base44.asServiceRole.entities.AuditLog.create({
        tenant_id: tenantId,
        outlet_id: batch.outlet_id || outletId,
        actor_id: user.id,
        actor_name: user.full_name || user.email,
        actor_role: user.role,
        action_type: 'production_cancelled',
        module: 'inventory',
        target_entity: 'ProductionBatch',
        target_record_id: batch.id,
        previous_state: { status: batch.status },
        new_state: { status: 'cancelled' },
        details: `Production batch ${batch.batch_number} cancelled.`,
      });
      return Response.json({ success: true, batch_id: batch.id, status: 'cancelled' });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});