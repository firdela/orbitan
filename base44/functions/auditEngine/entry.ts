/**
 * OrbitanOS — auditEngine
 * ───────────────────────
 * Centralised, entity-driven audit event processor.
 * Triggered via entity automations on high-value entities.
 * Writes to the global AuditLog registry under the "Regulate" principle.
 *
 * Exit-Ready: No platform lock-in. Logic is portable to any Deno/Node runtime.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// High-value entities that must always be audited
const AUDITABLE_ENTITIES = new Set([
  'SalesInvoice',
  'PurchaseOrder',
  'GoodsReceipt',
  'ClockRecord',
  'FoodSafetyLog',
  'ComplianceRecord',
  'MaterialCollection',
  'ProductCatalog',
  'DailyReconciliation',
  'InventoryItem',
]);

// ── Compliance Gate ────────────────────────────────────────────
// When a ClockRecord transitions to clocked_out, verify that a
// FoodSafetyLog exists for that outlet + date. If missing, flag
// the record as pending_verification and write a notification task.
const runComplianceGate = async (base44Client, record, eventType, old_data) => {
  // Only trigger on clock-out transition
  if (!(record?.status === 'clocked_out' && old_data?.status !== 'clocked_out')) return;
  // Only relevant for F&B industry — check if outlet has food safety requirement
  // We gate on: does a FoodSafetyLog exist for this outlet + date?
  const logs = await base44Client.asServiceRole.entities.FoodSafetyLog.filter({
    outlet_id: record.outlet_id,
    log_date: record.date,
  });
  if (logs && logs.length > 0) return; // Compliant — log exists

  // No food safety log found — flag the clock record
  await base44Client.asServiceRole.entities.ClockRecord.update(record.id, {
    status: 'pending_verification',
    notes: (record.notes ? record.notes + ' | ' : '') + '[COMPLIANCE GATE] Food Safety Log missing for this shift date. Manager verification required.',
  });

  // Create a high-priority Task to alert the outlet manager
  await base44Client.asServiceRole.entities.Task.create({
    tenant_id: record.tenant_id,
    outlet_id: record.outlet_id,
    title: `⚠️ Compliance Gate: Food Safety Log missing — ${record.employee_name || 'Staff'} (${record.date})`,
    description: `Clock-out recorded for ${record.employee_name} on ${record.date} but no Food Safety Log was submitted for this outlet. The ClockRecord has been flagged as "pending_verification". Please ensure the Food Safety Log is submitted and then verify the attendance record.`,
    priority: 'urgent',
    status: 'pending',
    module_context: 'compliance',
    category: 'food_safety',
    due_date: record.date,
  });
};

// Map entity event types to canonical action keys
const resolveActionType = (entityName, eventType, data, old_data) => {
  // Finance
  if (entityName === 'SalesInvoice') {
    if (eventType === 'create') return 'INVOICE_CREATED';
    if (data?.processing_status === 'verified' && old_data?.processing_status !== 'verified') return 'INVOICE_VERIFIED';
    if (data?.processing_status === 'rejected' && old_data?.processing_status !== 'rejected') return 'INVOICE_REJECTED';
    if (data?.xero_sync_status === 'synced' && old_data?.xero_sync_status !== 'synced') return 'INVOICE_XERO_SYNCED';
    return 'INVOICE_UPDATED';
  }
  if (entityName === 'PurchaseOrder') {
    if (eventType === 'create') return 'PO_CREATED';
    if (data?.status === 'approved' && old_data?.status !== 'approved') return 'PO_APPROVED';
    if (data?.status === 'cancelled' && old_data?.status !== 'cancelled') return 'PO_CANCELLED';
    if (data?.processing_status === 'verified' && old_data?.processing_status !== 'verified') return 'PO_VERIFIED';
    return 'PO_UPDATED';
  }
  if (entityName === 'GoodsReceipt') {
    if (eventType === 'create') return 'GOODS_RECEIVED';
    return 'GOODS_RECEIPT_UPDATED';
  }
  if (entityName === 'DailyReconciliation') {
    if (data?.status === 'approved' && old_data?.status !== 'approved') return 'RECONCILIATION_APPROVED';
    if (data?.status === 'flagged' && old_data?.status !== 'flagged') return 'RECONCILIATION_FLAGGED';
    return 'RECONCILIATION_UPDATED';
  }
  // Workforce
  if (entityName === 'ClockRecord') {
    if (eventType === 'create') return 'CLOCK_IN';
    if (data?.status === 'clocked_out' && old_data?.status !== 'clocked_out') return 'CLOCK_OUT';
    if (data?.status === 'pending_verification' && old_data?.status !== 'pending_verification') return 'CLOCK_COMPLIANCE_GATE_TRIGGERED';
    if (data?.verified_by && !old_data?.verified_by) return 'CLOCK_RECORD_VERIFIED';
    return 'CLOCK_RECORD_AMENDED';
  }
  if (entityName === 'FoodSafetyLog') {
    if (eventType === 'create') return 'FOOD_SAFETY_LOG_SUBMITTED';
    if (data?.overall_status === 'fail' && old_data?.overall_status !== 'fail') return 'FOOD_SAFETY_FAIL';
    if (data?.reviewed_by && !old_data?.reviewed_by) return 'FOOD_SAFETY_LOG_REVIEWED';
    return 'FOOD_SAFETY_LOG_UPDATED';
  }
  // Compliance
  if (entityName === 'ComplianceRecord') {
    if (eventType === 'create') return 'COMPLIANCE_CREATED';
    if (data?.status === 'approved' && old_data?.status !== 'approved') return 'COMPLIANCE_APPROVED';
    if (data?.status === 'rejected' && old_data?.status !== 'rejected') return 'COMPLIANCE_REJECTED';
    return 'COMPLIANCE_UPDATED';
  }
  // Sustainability
  if (entityName === 'MaterialCollection') {
    if (eventType === 'create') return 'COLLECTION_CREATED';
    if (data?.processing_status === 'completed' && old_data?.processing_status !== 'completed') return 'COLLECTION_COMPLETED';
    return 'COLLECTION_UPDATED';
  }
  // Retail
  if (entityName === 'ProductCatalog') {
    if (eventType === 'create') return 'PRODUCT_LISTED';
    if (data?.status === 'sold' && old_data?.status !== 'sold') return 'ITEM_SOLD';
    if (data?.selling_price_sgd !== old_data?.selling_price_sgd) return 'PRICE_ADJUSTED';
    return 'PRODUCT_UPDATED';
  }
  // Inventory
  if (entityName === 'InventoryItem') {
    if (eventType === 'create') return 'INVENTORY_ITEM_CREATED';
    if (data?.current_stock !== old_data?.current_stock) return 'STOCK_ADJUSTED';
    return 'INVENTORY_UPDATED';
  }

  return `${entityName.toUpperCase()}_${eventType.toUpperCase()}`;
};

const resolveModule = (entityName) => {
  const map = {
    SalesInvoice: 'finance',
    PurchaseOrder: 'procurement',
    GoodsReceipt: 'procurement',
    DailyReconciliation: 'finance',
    ClockRecord: 'workforce',
    FoodSafetyLog: 'compliance',
    ComplianceRecord: 'compliance',
    MaterialCollection: 'sustainability',
    ProductCatalog: 'retail',
    InventoryItem: 'inventory',
  };
  return map[entityName] || 'system';
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data, old_data, payload_too_large } = body;

    if (!event || !event.entity_name) {
      return Response.json({ skipped: true, reason: 'No entity event data' });
    }

    const entityName = event.entity_name;

    // Only process auditable entities
    if (!AUDITABLE_ENTITIES.has(entityName)) {
      return Response.json({ skipped: true, reason: `${entityName} not in audit scope` });
    }

    // If payload was too large, fetch it
    let record = data;
    let previousRecord = old_data;
    if (payload_too_large) {
      record = await base44.asServiceRole.entities[entityName]?.get?.(event.entity_id) || {};
      previousRecord = null;
    }

    const tenant_id = record?.tenant_id;
    if (!tenant_id) {
      return Response.json({ skipped: true, reason: 'No tenant_id on record' });
    }

    const action_type = resolveActionType(entityName, event.type, record, previousRecord);
    const module = resolveModule(entityName);

    // Build a clean previous/new state diff (avoid storing massive blobs)
    const safeState = (obj) => {
      if (!obj) return null;
      const { raw_ai_output, audit_trail, ...rest } = obj;
      return rest;
    };

    // ── Run Compliance Gate for ClockRecord clock-outs ──
    if (entityName === 'ClockRecord') {
      await runComplianceGate(base44, record, event.type, previousRecord);
    }

    await base44.asServiceRole.entities.AuditLog.create({
      tenant_id,
      actor_id: event.user_id || 'system',
      actor_name: record?.verified_by_name || record?.received_by || record?.employee_name || 'system',
      actor_role: 'system_event',
      action_type,
      module,
      target_entity: entityName,
      target_record_id: event.entity_id,
      outlet_id: record?.outlet_id || null,
      previous_state: safeState(previousRecord),
      new_state: safeState(record),
      details: `${action_type} on ${entityName} [${event.entity_id}] via entity automation`,
      ip_address: 'automation_context',
    });

    return Response.json({ success: true, action_type, entity: entityName });
  } catch (error) {
    // Log but don't surface — audit failure must never break primary workflows
    console.error('[auditEngine] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});