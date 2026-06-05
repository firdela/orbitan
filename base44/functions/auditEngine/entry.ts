/**
 * OrbitanOS — auditEngine (Enterprise Edition)
 * ─────────────────────────────────────────────
 * Centralised, entity-driven audit event processor.
 * Triggered via entity automations on high-value entities.
 *
 * Enterprise Features (Track A + Track B):
 * 1. AuditLog registry — immutable event trail (Regulate)
 * 2. Compliance Gate — clock-out food safety enforcement
 * 3. Compliance-to-Finance Gateway — threshold-based write-off routing
 * 4. ComplianceSnapshot writer — persistent hybrid compliance health
 * 5. Responsibility Matrix — tiered escalation by impact severity
 * 6. SOP Auto-generation trigger — corrective action on failures
 *
 * Exit-Ready: No platform lock-in. Portable to any Deno/Node runtime.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── High-value entities always audited ──────────────────────────
const AUDITABLE_ENTITIES = new Set([
  'SalesInvoice', 'PurchaseOrder', 'GoodsReceipt', 'ClockRecord',
  'FoodSafetyLog', 'ComplianceRecord', 'MaterialCollection',
  'ProductCatalog', 'DailyReconciliation', 'InventoryItem',
]);

// ── Responsibility Matrix ─────────────────────────────────────────
// EXIT-READY: Move this to a TenantPolicy entity for per-tenant config.
// financial_impact < THRESHOLD_MINOR   → Audit log only (no Xero queue)
// financial_impact >= THRESHOLD_MINOR  → FinanceSyncQueue write-off
// financial_impact >= THRESHOLD_ESCALATE → tenant_admin Task escalation
const THRESHOLD_MINOR_SGD = 50;      // Below this: operational audit only
const THRESHOLD_ESCALATE_SGD = 500;  // Above this: tenant_admin escalation

// Category → estimated financial impact (SGD) when no explicit value is set
// EXIT-READY: Replace with PolicyConfiguration entity lookup.
const CATEGORY_IMPACT_MAP = {
  food_safety: 150,       // Potential stock write-off + regulatory risk
  fire_safety: 300,       // Equipment/safety compliance cost
  licensing: 500,         // Regulatory penalty risk
  hr: 80,                 // HR admin / reprocessing cost
  environmental: 200,     // Sustainability compliance cost
  financial: 400,         // Direct financial exposure
  other: 50,              // Default operational impact
};

// ── Compliance Gate (Clock-out food safety enforcement) ──────────
const runComplianceGate = async (base44Client, record, eventType, old_data) => {
  if (!(record?.status === 'clocked_out' && old_data?.status !== 'clocked_out')) return;

  const logs = await base44Client.asServiceRole.entities.FoodSafetyLog.filter({
    outlet_id: record.outlet_id,
    log_date: record.date,
  });
  if (logs && logs.length > 0) return; // Compliant

  await base44Client.asServiceRole.entities.ClockRecord.update(record.id, {
    status: 'pending_verification',
    notes: (record.notes ? record.notes + ' | ' : '') +
      '[COMPLIANCE GATE] Food Safety Log missing for this shift date. Manager verification required.',
  });

  await base44Client.asServiceRole.entities.Task.create({
    tenant_id: record.tenant_id,
    outlet_id: record.outlet_id,
    title: `⚠️ Compliance Gate: Food Safety Log missing — ${record.employee_name || 'Staff'} (${record.date})`,
    description: `Clock-out recorded for ${record.employee_name} on ${record.date} but no Food Safety Log was submitted for this outlet. The ClockRecord has been flagged as "pending_verification". Please ensure the Food Safety Log is submitted and verify the attendance record.`,
    priority: 'urgent',
    status: 'pending',
    module_context: 'compliance',
    category: 'food_safety',
    due_date: record.date,
  });
};

// ── Compliance-to-Finance Gateway ────────────────────────────────
// Called when a ComplianceRecord is rejected or overdue.
// Applies the financial impact threshold gate before routing to FinanceSyncQueue.
const runComplianceFinanceGateway = async (base44Client, record, actionType) => {
  const isTriggeringEvent =
    actionType === 'COMPLIANCE_REJECTED' || actionType === 'COMPLIANCE_OVERDUE';
  if (!isTriggeringEvent) return { writeOffCreated: false, escalated: false, sopTriggered: false };

  const category = record.category || 'other';
  const financialImpact = CATEGORY_IMPACT_MAP[category] ?? THRESHOLD_MINOR_SGD;
  const outcomeSummary = { writeOffCreated: false, escalated: false, sopTriggered: false };

  // ── Gate 1: Below threshold → audit log only, skip Xero queue ──
  if (financialImpact < THRESHOLD_MINOR_SGD) {
    console.log(`[ComplianceFinanceGateway] Impact S$${financialImpact} below threshold S$${THRESHOLD_MINOR_SGD} — skipping FinanceSyncQueue`);
    return outcomeSummary;
  }

  // ── Gate 2: Above threshold → create FinanceSyncQueue write-off ──
  const syncPriority = financialImpact >= THRESHOLD_ESCALATE_SGD ? 'immediate' : 'end_of_shift';

  await base44Client.asServiceRole.entities.FinanceSyncQueue.create({
    tenant_id: record.tenant_id,
    outlet_id: record.outlet_id,
    queue_type: 'write_off',
    source_entity: 'ComplianceRecord',
    source_record_id: record.id,
    erp_target: 'xero',
    financial_impact_sgd: financialImpact,
    impact_category: 'write_off',
    threshold_applied: true,
    threshold_value_sgd: THRESHOLD_MINOR_SGD,
    compliance_record_id: record.id,
    compliance_category: category,
    status: 'pending',
    priority: syncPriority,
    payload: {
      description: `Compliance Write-off: ${record.title} [${category}]`,
      amount_sgd: financialImpact,
      compliance_record_id: record.id,
      outlet_id: record.outlet_id,
      event_date: record.due_date || new Date().toISOString().split('T')[0],
      reason: actionType === 'COMPLIANCE_REJECTED' ? record.notes : 'Overdue compliance item',
    },
    notes: `Auto-created by auditEngine. Action: ${actionType}`,
  });
  outcomeSummary.writeOffCreated = true;

  // ── Gate 3: High-water escalation → Task for tenant_admin ──
  if (financialImpact >= THRESHOLD_ESCALATE_SGD) {
    await base44Client.asServiceRole.entities.Task.create({
      tenant_id: record.tenant_id,
      outlet_id: record.outlet_id,
      title: `🚨 HIGH-VALUE Compliance Failure: ${record.title} — S$${financialImpact} exposure`,
      description: `A compliance failure with financial exposure of S$${financialImpact} has been detected.\n\nCategory: ${category}\nStatus: ${actionType === 'COMPLIANCE_REJECTED' ? 'Rejected' : 'Overdue'}\nRecord: ${record.title}\n\nA write-off entry has been queued for Xero sync. Immediate review required by Tenant Admin.`,
      priority: 'urgent',
      status: 'pending',
      module_context: 'compliance',
      category: 'financial',
      due_date: new Date().toISOString().split('T')[0],
    });
    outcomeSummary.escalated = true;
  }

  // ── Gate 4: Trigger SOP auto-generation for corrective action ──
  // We create a Task that signals the sopGenerator to run.
  // EXIT-READY: Replace with direct sopGenerator.invoke() in your stack.
  await base44Client.asServiceRole.entities.Task.create({
    tenant_id: record.tenant_id,
    outlet_id: record.outlet_id,
    title: `[AI] Generate Corrective Action SOP — ${record.title}`,
    description: `Auto-trigger: A compliance failure has been recorded for "${record.title}" (${category}). The AI Suite should generate a corrective action SOP to address this failure and prevent recurrence. Compliance Record ID: ${record.id}`,
    priority: 'high',
    status: 'pending',
    module_context: 'compliance',
    category: 'training',
    due_date: new Date().toISOString().split('T')[0],
  });
  outcomeSummary.sopTriggered = true;

  return outcomeSummary;
};

// ── ComplianceSnapshot Writer ────────────────────────────────────
// Writes a persistent snapshot record when a ComplianceRecord changes status.
const writeComplianceSnapshot = async (base44Client, record, actionType, gatewayOutcome) => {
  const triggeringActions = ['COMPLIANCE_APPROVED', 'COMPLIANCE_REJECTED', 'COMPLIANCE_OVERDUE'];
  if (!triggeringActions.includes(actionType)) return;

  // Aggregate current compliance health for this outlet
  const allRecords = await base44Client.asServiceRole.entities.ComplianceRecord.filter({
    tenant_id: record.tenant_id,
    outlet_id: record.outlet_id,
  });

  const counts = { approved: 0, pending: 0, in_review: 0, rejected: 0, overdue: 0 };
  const categoryBreakdown = {};

  for (const r of allRecords) {
    const s = r.status || 'pending';
    if (counts[s] !== undefined) counts[s]++;
    if (r.category) {
      if (!categoryBreakdown[r.category]) {
        categoryBreakdown[r.category] = { approved: 0, rejected: 0, overdue: 0, pending: 0 };
      }
      if (categoryBreakdown[r.category][s] !== undefined) {
        categoryBreakdown[r.category][s]++;
      }
    }
  }

  const total = allRecords.length || 1;
  const complianceScore = Math.round((counts.approved / total) * 100);
  const riskLevel =
    complianceScore >= 90 ? 'green' :
    complianceScore >= 70 ? 'amber' :
    complianceScore >= 50 ? 'red' : 'critical';

  await base44Client.asServiceRole.entities.ComplianceSnapshot.create({
    tenant_id: record.tenant_id,
    outlet_id: record.outlet_id,
    snapshot_date: new Date().toISOString().split('T')[0],
    snapshot_type: 'event_triggered',
    total_records: total,
    approved_count: counts.approved,
    pending_count: counts.pending,
    in_review_count: counts.in_review,
    rejected_count: counts.rejected,
    overdue_count: counts.overdue,
    compliance_score: complianceScore,
    risk_level: riskLevel,
    category_breakdown: categoryBreakdown,
    financial_exposure_sgd: gatewayOutcome.writeOffCreated
      ? (CATEGORY_IMPACT_MAP[record.category] || 50) : 0,
    write_offs_triggered: gatewayOutcome.writeOffCreated ? 1 : 0,
    escalations_triggered: gatewayOutcome.escalated ? 1 : 0,
    sops_generated: gatewayOutcome.sopTriggered ? 1 : 0,
    triggered_by_record_id: record.id,
    triggered_by_action: actionType,
  });
};

// ── Action type resolver ─────────────────────────────────────────
const resolveActionType = (entityName, eventType, data, old_data) => {
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
  if (entityName === 'ComplianceRecord') {
    if (eventType === 'create') return 'COMPLIANCE_CREATED';
    if (data?.status === 'approved' && old_data?.status !== 'approved') return 'COMPLIANCE_APPROVED';
    if (data?.status === 'rejected' && old_data?.status !== 'rejected') return 'COMPLIANCE_REJECTED';
    if (data?.status === 'overdue' && old_data?.status !== 'overdue') return 'COMPLIANCE_OVERDUE';
    return 'COMPLIANCE_UPDATED';
  }
  if (entityName === 'MaterialCollection') {
    if (eventType === 'create') return 'COLLECTION_CREATED';
    if (data?.processing_status === 'completed' && old_data?.processing_status !== 'completed') return 'COLLECTION_COMPLETED';
    return 'COLLECTION_UPDATED';
  }
  if (entityName === 'ProductCatalog') {
    if (eventType === 'create') return 'PRODUCT_LISTED';
    if (data?.status === 'sold' && old_data?.status !== 'sold') return 'ITEM_SOLD';
    if (data?.selling_price_sgd !== old_data?.selling_price_sgd) return 'PRICE_ADJUSTED';
    return 'PRODUCT_UPDATED';
  }
  if (entityName === 'InventoryItem') {
    if (eventType === 'create') return 'INVENTORY_ITEM_CREATED';
    if (data?.current_stock !== old_data?.current_stock) return 'STOCK_ADJUSTED';
    return 'INVENTORY_UPDATED';
  }
  return `${entityName.toUpperCase()}_${eventType.toUpperCase()}`;
};

const resolveModule = (entityName) => {
  const map = {
    SalesInvoice: 'finance', PurchaseOrder: 'procurement',
    GoodsReceipt: 'procurement', DailyReconciliation: 'finance',
    ClockRecord: 'workforce', FoodSafetyLog: 'compliance',
    ComplianceRecord: 'compliance', MaterialCollection: 'sustainability',
    ProductCatalog: 'retail', InventoryItem: 'inventory',
  };
  return map[entityName] || 'system';
};

// ── Main Handler ─────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data, old_data, payload_too_large } = body;

    if (!event || !event.entity_name) {
      return Response.json({ skipped: true, reason: 'No entity event data' });
    }

    const entityName = event.entity_name;
    if (!AUDITABLE_ENTITIES.has(entityName)) {
      return Response.json({ skipped: true, reason: `${entityName} not in audit scope` });
    }

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

    const safeState = (obj) => {
      if (!obj) return null;
      const { raw_ai_output, audit_trail, ...rest } = obj;
      return rest;
    };

    // ── Run specialist gates in parallel where independent ──────
    const gatePromises = [];

    // 1. ClockRecord compliance gate
    if (entityName === 'ClockRecord') {
      gatePromises.push(runComplianceGate(base44, record, event.type, previousRecord));
    }

    // 2. Compliance → Finance gateway + snapshot (for ComplianceRecord events)
    let gatewayOutcome = { writeOffCreated: false, escalated: false, sopTriggered: false };
    if (entityName === 'ComplianceRecord') {
      gatewayOutcome = await runComplianceFinanceGateway(base44, record, action_type);
      gatePromises.push(writeComplianceSnapshot(base44, record, action_type, gatewayOutcome));
    }

    // 3. Write AuditLog
    gatePromises.push(
      base44.asServiceRole.entities.AuditLog.create({
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
      })
    );

    await Promise.all(gatePromises);

    return Response.json({
      success: true,
      action_type,
      entity: entityName,
      gateway: entityName === 'ComplianceRecord' ? gatewayOutcome : undefined,
    });

  } catch (error) {
    console.error('[auditEngine] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});