import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

/**
 * OrbitanOS Recipe Manager — Live COGS Engine (ADR-0026)
 *
 * Computes the real-time cost of a recipe by fetching the latest unit cost
 * for each ingredient from the most recent GoodsReceipt. Never trusts a
 * statically stored cost — the source of truth is always the procurement
 * history. This ensures accurate, dynamic COGS as supplier prices fluctuate.
 *
 * Sovereignty-by-Design:
 *   - Tenant-scoped (RLS enforced)
 *   - Audit-logged (every recalculation is recorded)
 *   - Falls back to InventoryItem.cost_per_unit when no GoodsReceipt exists
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { recipe_id } = body;
    if (!recipe_id) return Response.json({ error: 'recipe_id is required' }, { status: 400 });

    // 1. Fetch the recipe (user-scoped — RLS enforces tenant isolation)
    const recipe = await base44.entities.Recipe.get(recipe_id);
    if (!recipe) return Response.json({ error: 'Recipe not found' }, { status: 404 });

    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      const updated = await base44.entities.Recipe.update(recipe_id, {
        total_cogs: 0,
        gross_margin_pct: recipe.selling_price ? 100 : 0,
        last_cogs_calculated_date: new Date().toISOString(),
        last_cogs_source: 'no_ingredients'
      });
      return Response.json({
        total_cogs: 0,
        gross_margin_pct: updated.gross_margin_pct,
        ingredients: [],
        source: 'no_ingredients'
      });
    }

    // 2. Fetch the latest GoodsReceipt for this tenant (sorted by received_date desc)
    //    We scan receipts to find the most recent unit cost per inventory item.
    const goodsReceipts = await base44.asServiceRole.entities.GoodsReceipt.filter({
      tenant_id: recipe.tenant_id
    }, '-received_date', 50);

    // Build a map: inventory_item_id -> { unit_cost, receipt_ref }
    const latestCostMap = {};
    for (const gr of goodsReceipts) {
      if (!gr.items_received) continue;
      for (const item of gr.items_received) {
        if (item.item_id && !(item.item_id in latestCostMap)) {
          latestCostMap[item.item_id] = {
            unit_cost: item.unit_cost,
            source: `goods_receipt:${gr.receipt_number || gr.id}`
          };
        }
      }
    }

    // 3. Compute ingredient costs
    let totalCogs = 0;
    let primarySource = 'inventory_fallback';
    const computedIngredients = [];
    let usedGoodsReceiptCount = 0;

    for (const ing of recipe.ingredients) {
      let unitCost = ing.unit_cost_snapshot || 0;
      let costSource = 'inventory_fallback';

      const latest = latestCostMap[ing.inventory_item_id];
      if (latest && typeof latest.unit_cost === 'number') {
        unitCost = latest.unit_cost;
        costSource = latest.source;
        usedGoodsReceiptCount++;
      } else {
        // Fallback: fetch InventoryItem.cost_per_unit
        try {
          const invItem = await base44.asServiceRole.entities.InventoryItem.get(ing.inventory_item_id);
          if (invItem && typeof invItem.cost_per_unit === 'number') {
            unitCost = invItem.cost_per_unit;
            costSource = 'inventory_fallback';
          }
        } catch (_e) {
          // keep snapshot if inventory item unavailable
        }
      }

      const ingredientCost = (ing.quantity_required || 0) * unitCost;
      totalCogs += ingredientCost;

      computedIngredients.push({
        inventory_item_id: ing.inventory_item_id,
        inventory_item_name: ing.inventory_item_name,
        quantity_required: ing.quantity_required,
        unit: ing.unit,
        unit_cost_snapshot: unitCost,
        ingredient_cost: Math.round(ingredientCost * 10000) / 10000,
        last_cost_source: costSource
      });
    }

    totalCogs = Math.round(totalCogs * 10000) / 10000;
    const grossMargin = recipe.selling_price && recipe.selling_price > 0
      ? Math.round(((recipe.selling_price - totalCogs) / recipe.selling_price) * 10000) / 100
      : 0;

    if (usedGoodsReceiptCount > 0) {
      primarySource = `goods_receipt (${usedGoodsReceiptCount}/${computedIngredients.length} live)`;
    }

    // 4. Persist the computed COGS snapshot
    await base44.entities.Recipe.update(recipe_id, {
      ingredients: computedIngredients,
      total_cogs: totalCogs,
      gross_margin_pct: grossMargin,
      last_cogs_calculated_date: new Date().toISOString(),
      last_cogs_source: primarySource
    });

    // 5. Audit log (Sovereignty-by-Design — every recalculation is recorded)
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        tenant_id: recipe.tenant_id,
        actor_id: user.id,
        actor_name: user.full_name || user.email,
        actor_role: user.role,
        action_type: 'recipe_cogs_recalculated',
        module: 'inventory',
        target_entity: 'Recipe',
        target_record_id: recipe_id,
        details: `Live COGS recalculated for "${recipe.menu_item_name}": ${totalCogs} (margin ${grossMargin}%). Source: ${primarySource}.`,
        shield_outcome: 'not_evaluated'
      });
    } catch (_auditErr) {
      // audit failure must not block the COGS update
    }

    return Response.json({
      recipe_id,
      total_cogs: totalCogs,
      gross_margin_pct: grossMargin,
      ingredients: computedIngredients,
      last_cogs_source: primarySource,
      last_cogs_calculated_date: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});