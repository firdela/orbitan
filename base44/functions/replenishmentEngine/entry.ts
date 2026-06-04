import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Replenishment Engine
 * Runs daily to:
 * 1. Analyse last 7 days of sales against Recipe BOM to calculate avg daily ingredient usage
 * 2. Compare against current stock levels and reorder points
 * 3. Generate ReplenishmentAlert records for items predicted to stock out
 * 4. Auto-draft a PurchaseOrder for critical items
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'tenant_admin', 'outlet_manager'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tenantId = user.data?.tenant_id;
    const outletId = user.data?.outlet_id;

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

    // 6. Auto-draft a PO for critical items grouped by supplier
    const posBySupplier = {};
    for (const poItem of poItemsForCritical) {
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
        draft_pos: posCreated
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});