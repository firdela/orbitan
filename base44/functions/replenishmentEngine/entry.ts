import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

/**
 * Replenishment Engine — OrbitanOS Operational Autopilot
 * Principle: Respond
 *
 * Runs daily to:
 * 1. Analyse last 7 days of sales against Recipe BOM to calculate avg daily ingredient usage
 * 2. Compare against current stock levels and reorder points
 * 3. Generate ReplenishmentAlert records for items predicted to stock out
 * 4. Auto-draft PurchaseOrders for critical items — Industry-Specific Autopilot Rules apply:
 *    - F&B: Only auto-draft PO if supplier is marked as "preferred"
 *    - Recycling: If processing backlog detected, auto-create urgent collection Task
 *    - Retail: If SKU idle >30 days, auto-create Promotion draft Task
 * Exit-Ready: Pure business logic — swap the entity adapter without touching the rules.
 */

// ── Industry Autopilot Rules ──────────────────────────────────
async function runFnBAutopilot(base44, tenantId, outletId, poItemsForCritical, suppliers) {
  // F&B Regulate Rule:
  // 1. Only auto-draft PO if supplier is marked "preferred" (governance gate)
  // 2. Critical F&B ingredient suppliers (is_critical_fnb) are treated with highest priority
  // 3. Respect min_order_value — consolidate items per supplier before committing
  const supplierMap = {};
  suppliers.forEach(s => { supplierMap[s.id] = s; });

  const eligible = poItemsForCritical.filter(item => {
    if (!item.supplier_id) return false;
    const supplier = supplierMap[item.supplier_id];
    if (!supplier) return false;
    if (!supplier.is_preferred) return false; // Governance gate: only preferred suppliers
    return true;
  });

  // Enforce min_order_value per supplier — skip if consolidated order is below minimum
  const bySupplier = {};
  eligible.forEach(item => {
    if (!bySupplier[item.supplier_id]) bySupplier[item.supplier_id] = [];
    bySupplier[item.supplier_id].push(item);
  });

  const finalEligible = [];
  for (const [supplierId, items] of Object.entries(bySupplier)) {
    const supplier = supplierMap[supplierId];
    const orderTotal = items.reduce((sum, i) => sum + i.total, 0);
    const minOrder = supplier?.min_order_value || 0;
    if (orderTotal < minOrder) {
      // Mark items but don't auto-draft PO — flag for manual review instead
      items.forEach(i => { i._below_min_order = true; i._min_order_value = minOrder; });
    } else {
      finalEligible.push(...items);
    }
  }

  return finalEligible;
}

async function runRecyclingAutopilot(base44, tenantId, outletId, inventoryItems) {
  // Recycling Rule: If any recovered material item has current_stock > par_level * 1.5 (processing backlog),
  // auto-create an urgent collection Task
  const backlogItems = inventoryItems.filter(item =>
    item.current_stock > (item.par_level || 0) * 1.5 && item.par_level > 0
  );
  if (backlogItems.length === 0) return;

  await base44.asServiceRole.entities.Task.create({
    tenant_id: tenantId,
    outlet_id: outletId,
    title: `URGENT: Processing backlog detected — ${backlogItems.length} material(s) above capacity`,
    description: `Autopilot Alert: The following materials are at ${'>'}150% of par level and require urgent processing or collection scheduling:\n\n${backlogItems.map(i => `• ${i.name}: ${i.current_stock} ${i.unit} (par: ${i.par_level})`).join('\n')}`,
    priority: 'high',
    status: 'pending',
    source: 'replenishment_autopilot',
  });
}

async function runRetailAutopilot(base44, tenantId, outletId, inventoryItems) {
  // Retail Rule: If a SKU has had no stock movement for >30 days, create a Promotion draft Task
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const slowMovers = inventoryItems.filter(item => {
    if (!item.updated_date) return false;
    return new Date(item.updated_date) < thirtyDaysAgo && item.current_stock > 0;
  });

  for (const item of slowMovers.slice(0, 5)) { // Cap at 5 to avoid spam
    const existingPromoTasks = await base44.asServiceRole.entities.Task.filter({
      tenant_id: tenantId,
      outlet_id: outletId,
      status: 'pending',
      source: 'retail_autopilot',
    });
    const alreadyExists = existingPromoTasks.some(t => t.title?.includes(item.name));
    if (alreadyExists) continue;

    await base44.asServiceRole.entities.Task.create({
      tenant_id: tenantId,
      outlet_id: outletId,
      title: `Promotion Opportunity: "${item.name}" — idle ${'>'}30 days`,
      description: `Retail Autopilot: SKU "${item.name}" (${item.current_stock} ${item.unit} in stock) has not moved in over 30 days. Consider a markdown, bundle deal, or featured display to clear stock.`,
      priority: 'medium',
      status: 'pending',
      source: 'retail_autopilot',
    });
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Support both scheduled automation payloads (no user session)
    // and manual triggers from authenticated users
    let payload = {};
    try { payload = await req.json(); } catch (e) {}

    let user = null;
    try { user = await base44.auth.me(); } catch (e) {}

    // Scheduled automations pass tenantId/outletId in the payload (function_args)
    const tenantId = payload.tenantId || user?.data?.tenant_id;
    const outletId = payload.outletId || user?.data?.outlet_id;
    const industryPack = payload.industryPack || user?.data?.industry_pack || 'fnb';

    // If triggered by a logged-in user, enforce role check
    if (user && !['admin', 'tenant_admin', 'outlet_manager'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!tenantId || !outletId) {
      return Response.json({ error: 'tenant_id and outlet_id required' }, { status: 400 });
    }

    // 1. Fetch all active inventory items for this outlet
    const inventoryItems = await base44.entities.InventoryItem.filter({
      tenant_id: tenantId,
      outlet_id: outletId,
      status: 'active'
    });

    // 2. Fetch last 7 days of sales invoices
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const salesInvoices = await base44.entities.SalesInvoice.filter({
      tenant_id: tenantId,
      outlet_id: outletId
    });

    const recentSales = salesInvoices.filter(inv => {
      const invDate = new Date(inv.date);
      return invDate >= sevenDaysAgo;
    });

    // 3. Fetch all recipes (BOM)
    const recipes = await base44.entities.Recipe.filter({
      tenant_id: tenantId,
      is_active: true
    });

    // 4. Build ingredient usage map from sales
    const ingredientUsage = {}; // { inventory_item_id: total_qty_used }

    for (const invoice of recentSales) {
      for (const lineItem of (invoice.line_items || [])) {
        const recipe = recipes.find(r =>
          r.menu_item_name === lineItem.description ||
          r.menu_item_sku === lineItem.description
        );
        if (!recipe) continue;

        for (const ingredient of (recipe.ingredients || [])) {
          const key = ingredient.inventory_item_id;
          if (!key) continue;
          const qtyUsed = (ingredient.quantity_required || 0) * (lineItem.quantity || 0);
          ingredientUsage[key] = (ingredientUsage[key] || 0) + qtyUsed;
        }
      }
    }

    // 5. Calculate daily usage rate and predict stockouts
    const alertsCreated = [];
    const poItemsForCritical = [];

    for (const item of inventoryItems) {
      const totalUsed7Days = ingredientUsage[item.id] || 0;
      const avgDailyUsage = totalUsed7Days / 7;

      if (avgDailyUsage === 0) continue; // No movement, skip

      const currentStock = item.current_stock || 0;
      const reorderPoint = item.reorder_point || item.par_level || 0;
      const daysUntilStockout = avgDailyUsage > 0 ? currentStock / avgDailyUsage : 999;
      const predictedStock3Days = currentStock - (avgDailyUsage * 3);

      // Only alert if below reorder point or stockout within 5 days
      if (currentStock > reorderPoint && daysUntilStockout > 5) continue;

      const urgency = daysUntilStockout <= 1 ? 'critical'
        : daysUntilStockout <= 2 ? 'high'
        : daysUntilStockout <= 5 ? 'medium'
        : 'low';

      const parLevel = item.par_level || reorderPoint * 2;
      const suggestedOrderQty = Math.max(0, parLevel - currentStock);
      const estimatedCost = suggestedOrderQty * (item.cost_per_unit || 0);

      // Check if an open alert already exists for this item
      const existingAlerts = await base44.entities.ReplenishmentAlert.filter({
        tenant_id: tenantId,
        outlet_id: outletId,
        inventory_item_id: item.id,
        status: 'open'
      });

      if (existingAlerts.length > 0) {
        // Update existing alert
        await base44.entities.ReplenishmentAlert.update(existingAlerts[0].id, {
          current_stock: currentStock,
          predicted_stock_3days: predictedStock3Days,
          avg_daily_usage: avgDailyUsage,
          days_until_stockout: daysUntilStockout,
          suggested_order_qty: suggestedOrderQty,
          estimated_cost: estimatedCost,
          urgency,
          alert_date: new Date().toISOString().split('T')[0]
        });
        alertsCreated.push({ item: item.name, action: 'updated', urgency });
      } else {
        // Create new alert
        await base44.entities.ReplenishmentAlert.create({
          tenant_id: tenantId,
          outlet_id: outletId,
          inventory_item_id: item.id,
          inventory_item_name: item.name,
          current_stock: currentStock,
          reorder_point: reorderPoint,
          par_level: parLevel,
          predicted_stock_3days: predictedStock3Days,
          avg_daily_usage: avgDailyUsage,
          days_until_stockout: daysUntilStockout,
          suggested_order_qty: suggestedOrderQty,
          supplier_id: item.supplier_id || '',
          estimated_cost: estimatedCost,
          urgency,
          status: 'open',
          alert_date: new Date().toISOString().split('T')[0]
        });
        alertsCreated.push({ item: item.name, action: 'created', urgency });
      }

      // Collect critical items for auto-draft PO
      if (urgency === 'critical' && suggestedOrderQty > 0) {
        poItemsForCritical.push({
          item_id: item.id,
          item_name: item.name,
          quantity: suggestedOrderQty,
          unit: item.unit,
          unit_price: item.cost_per_unit || 0,
          total: estimatedCost,
          supplier_id: item.supplier_id
        });
      }
    }

    // 6. Industry-Specific Autopilot Rules
    let eligiblePoItems = poItemsForCritical;
    const autopilotActions = [];

    if (industryPack === 'fnb' || industryPack === 'food_beverage') {
      const suppliers = await base44.asServiceRole.entities.Supplier.filter({ tenant_id: tenantId });
      eligiblePoItems = await runFnBAutopilot(base44, tenantId, outletId, poItemsForCritical, suppliers);
      const skipped = poItemsForCritical.length - eligiblePoItems.length;
      if (skipped > 0) autopilotActions.push(`F&B: Skipped ${skipped} item(s) — no preferred supplier`);
    } else if (industryPack === 'recycling' || industryPack === 'recycling_sustainability') {
      await runRecyclingAutopilot(base44, tenantId, outletId, inventoryItems);
      autopilotActions.push('Recycling: Backlog check completed');
    } else if (industryPack === 'retail') {
      await runRetailAutopilot(base44, tenantId, outletId, inventoryItems);
      autopilotActions.push('Retail: Slow-mover promotion tasks evaluated');
    }

    // 7. Auto-draft a PO for critical items grouped by supplier
    const posBySupplier = {};
    for (const poItem of eligiblePoItems) {
      const supplierId = poItem.supplier_id || 'unknown';
      if (!posBySupplier[supplierId]) posBySupplier[supplierId] = [];
      posBySupplier[supplierId].push(poItem);
    }

    const posCreated = [];
    for (const [supplierId, items] of Object.entries(posBySupplier)) {
      const subtotal = items.reduce((sum, i) => sum + i.total, 0);
      const po = await base44.entities.PurchaseOrder.create({
        tenant_id: tenantId,
        outlet_id: outletId,
        supplier_id: supplierId !== 'unknown' ? supplierId : '',
        status: 'draft',
        items: items.map(i => ({
          item_id: i.item_id,
          item_name: i.item_name,
          quantity: i.quantity,
          unit: i.unit,
          unit_price: i.unit_price,
          total: i.total
        })),
        subtotal,
        total_amount: subtotal,
        requested_date: new Date().toISOString().split('T')[0],
        notes: 'Auto-generated by Replenishment Engine — critical stock detected'
      });
      posCreated.push(po.id);

      // Link PO to alerts
      for (const item of items) {
        const alerts = await base44.entities.ReplenishmentAlert.filter({
          tenant_id: tenantId,
          outlet_id: outletId,
          inventory_item_id: item.item_id,
          status: 'open'
        });
        for (const alert of alerts) {
          await base44.entities.ReplenishmentAlert.update(alert.id, {
            linked_po_id: po.id,
            status: 'po_created'
          });
        }
      }
    }

    return Response.json({
      success: true,
      summary: {
        alerts_processed: alertsCreated.length,
        pos_auto_drafted: posCreated.length,
        alerts: alertsCreated,
        draft_pos: posCreated,
        autopilot_actions: autopilotActions,
        industry_pack_applied: industryPack,
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});