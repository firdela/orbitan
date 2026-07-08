import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── Audit Helper (inline — no local imports in Deno deploy) ──────────────────
const logAudit = async (base44Client, payload) => {
  try {
    await base44Client.asServiceRole.entities.AuditLog.create({
      ...payload,
      ip_address: payload.ip_address || 'server_context',
    });
  } catch (err) {
    console.error('[financeController] AuditLog write failed:', err?.message);
  }
};

/**
 * Finance Controller — OrbitanOS
 * Central middleware for Xero integration and finance document orchestration.
 *
 * Supported action_types:
 *   - sync_invoice       : Push a verified SalesInvoice to Xero
 *   - sync_purchase_order: Push a verified PurchaseOrder to Xero as a Bill
 *   - verify_document    : Mark a document as human-verified (ready for sync)
 *   - get_sync_status    : Get Xero sync state for a record
 *   - get_xero_auth_url  : Returns the Xero OAuth URL for the finance user
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowedRoles = ['admin', 'tenant_admin', 'outlet_manager'];
    if (!allowedRoles.includes(user.role)) {
      return Response.json({ error: 'Forbidden: Finance access required' }, { status: 403 });
    }

    const body = await req.json();
    const { action_type, record_id, entity_type, data } = body;

    if (!action_type) {
      return Response.json({ error: 'action_type is required' }, { status: 400 });
    }

    const timestamp = new Date().toISOString();
    const auditEntry = {
      user_id: user.id,
      user_name: user.full_name,
      timestamp
    };

    // ─── ACTION: verify_document ───────────────────────────────────────────────
    if (action_type === 'verify_document') {
      if (!record_id || !entity_type) {
        return Response.json({ error: 'record_id and entity_type are required' }, { status: 400 });
      }

      const entityMap = {
        sales_invoice: 'SalesInvoice',
        purchase_order: 'PurchaseOrder'
      };

      const entityName = entityMap[entity_type];
      if (!entityName) {
        return Response.json({ error: `Unsupported entity_type: ${entity_type}` }, { status: 400 });
      }

      const record = await base44.entities[entityName].get(record_id);

      // ── SHIELD-CERTIFIED GATE: Evaluate Shield policies before verification ──
      const shieldCheck = await base44.functions.invoke('shieldInterceptor', {
        action: 'update',
        entity_name: entityName,
        data: { ...record, processing_status: 'verified' },
        tenant_id: record.tenant_id
      });

      if (shieldCheck.data?.allowed === false && shieldCheck.data?.effect === 'block') {
        return Response.json({
          error: 'Shield Blocked: This verification action is blocked by a governance policy.',
          shield_response: shieldCheck.data,
          governance_rule: shieldCheck.data.policy_name,
          override_available: true
        }, { status: 403 });
      }

      // ── GOVERNANCE GATE: Document must be attached before verification ──
      if (!record.document_url) {
        return Response.json({
          error: 'Governance Violation: Cannot verify a record with no attached document. Upload the invoice/receipt first.',
          record_id,
          governance_rule: 'document_first'
        }, { status: 422 });
      }

      const existingTrail = record.audit_trail || [];
      const updatedTrail = [...existingTrail, {
        ...auditEntry,
        action: 'verified',
        details: `Document verified by ${user.full_name} (${user.role}). Attached document confirmed. Ready for Xero sync.`
      }];

      await base44.entities[entityName].update(record_id, {
        processing_status: 'verified',
        verified_by: user.id,
        verified_by_name: user.full_name,
        verified_date: timestamp,
        audit_trail: updatedTrail
      });

      await logAudit(base44, {
        tenant_id: record.tenant_id,
        actor_id: user.id,
        actor_name: user.full_name,
        actor_role: user.role,
        action_type: entity_type === 'sales_invoice' ? 'INVOICE_VERIFIED' : 'PO_VERIFIED',
        module: entity_type === 'sales_invoice' ? 'finance' : 'procurement',
        target_entity: entityName,
        target_record_id: record_id,
        outlet_id: record.outlet_id,
        previous_state: { processing_status: record.processing_status },
        new_state: { processing_status: 'verified', verified_by_name: user.full_name },
        details: `Document verified by ${user.full_name} (${user.role})`,
      });

      return Response.json({
        success: true,
        message: 'Document verified successfully. Ready for Xero sync.',
        record_id,
        entity_type,
        verified_by: user.full_name,
        verified_at: timestamp
      });
    }

    // ─── ACTION: reject_document ───────────────────────────────────────────────
    if (action_type === 'reject_document') {
      if (!record_id || !entity_type) {
        return Response.json({ error: 'record_id and entity_type are required' }, { status: 400 });
      }

      const entityMap = {
        sales_invoice: 'SalesInvoice',
        purchase_order: 'PurchaseOrder'
      };

      const entityName = entityMap[entity_type];
      if (!entityName) {
        return Response.json({ error: `Unsupported entity_type: ${entity_type}` }, { status: 400 });
      }

      const record = await base44.entities[entityName].get(record_id);
      const rejectionReason = data?.rejection_reason || 'No reason provided';

      const existingTrail = record.audit_trail || [];
      await base44.entities[entityName].update(record_id, {
        processing_status: 'rejected',
        rejection_reason: rejectionReason,
        audit_trail: [...existingTrail, {
          ...auditEntry,
          action: 'rejected',
          details: `Document rejected by ${user.full_name}. Reason: ${rejectionReason}`
        }]
      });

      await logAudit(base44, {
        tenant_id: record.tenant_id,
        actor_id: user.id,
        actor_name: user.full_name,
        actor_role: user.role,
        action_type: entity_type === 'sales_invoice' ? 'INVOICE_REJECTED' : 'PO_REJECTED',
        module: entity_type === 'sales_invoice' ? 'finance' : 'procurement',
        target_entity: entityName,
        target_record_id: record_id,
        outlet_id: record.outlet_id,
        previous_state: { processing_status: record.processing_status },
        new_state: { processing_status: 'rejected', rejection_reason: rejectionReason },
        details: `Document rejected by ${user.full_name}. Reason: ${rejectionReason}`,
      });

      return Response.json({
        success: true,
        message: 'Document rejected. Record returned to staff for correction.',
        record_id,
        entity_type,
        rejected_by: user.full_name,
        reason: rejectionReason
      });
    }

    // ─── ACTION: sync_invoice ─────────────────────────────────────────────────
    if (action_type === 'sync_invoice') {
      if (!record_id) {
        return Response.json({ error: 'record_id is required' }, { status: 400 });
      }

      const invoice = await base44.entities.SalesInvoice.get(record_id);

      // ── SHIELD-CERTIFIED GATE: Evaluate Shield before Xero sync ──
      const shieldCheck = await base44.functions.invoke('shieldInterceptor', {
        action: 'update',
        entity_name: 'SalesInvoice',
        data: { ...invoice, xero_sync_status: 'syncing' },
        tenant_id: invoice.tenant_id
      });

      if (shieldCheck.data?.allowed === false && shieldCheck.data?.effect === 'block') {
        return Response.json({
          error: 'Shield Blocked: Xero sync is blocked by a governance policy.',
          shield_response: shieldCheck.data,
          governance_rule: shieldCheck.data.policy_name,
          override_available: true
        }, { status: 403 });
      }

      if (invoice.processing_status !== 'verified') {
        return Response.json({
          error: 'Invoice must be verified before syncing to Xero.',
          current_status: invoice.processing_status
        }, { status: 422 });
      }

      if (invoice.xero_sync_status === 'synced') {
        return Response.json({
          success: false,
          message: 'Invoice already synced to Xero.',
          xero_guid: invoice.xero_guid
        });
      }

      // Mark as syncing
      const existingTrail = invoice.audit_trail || [];
      await base44.entities.SalesInvoice.update(record_id, {
        xero_sync_status: 'syncing',
        audit_trail: [...existingTrail, {
          ...auditEntry,
          action: 'xero_sync_initiated',
          details: `Xero sync initiated by ${user.full_name}`
        }]
      });

      // Build Xero-compatible payload
      const xeroPayload = buildXeroInvoicePayload(invoice);

      // ── Queue the sync via FinanceSyncQueue (async broker) ──
      // If Xero is connected, the integrationSync function will process this entry.
      // If not connected, it stays pending until the finance team connects Xero.
      const queueEntry = await base44.entities.FinanceSyncQueue.create({
        tenant_id: invoice.tenant_id,
        outlet_id: invoice.outlet_id,
        queue_type: 'invoice_sync',
        source_entity: 'SalesInvoice',
        source_record_id: record_id,
        erp_target: 'xero',
        payload: { Invoices: [xeroPayload] },
        financial_impact_sgd: invoice.total_amount || 0,
        impact_category: 'revenue',
        status: 'pending',
        priority: (invoice.total_amount || 0) >= 200 ? 'immediate' : 'end_of_shift',
        created_by_id: user.id,
        notes: `Invoice ${invoice.invoice_number} queued by ${user.full_name}`,
      });

      const finalTrail = invoice.audit_trail || [];
      await base44.entities.SalesInvoice.update(record_id, {
        audit_trail: [...finalTrail, {
          ...auditEntry,
          action: 'xero_sync_queued',
          details: `Invoice queued for Xero sync via FinanceSyncQueue (entry: ${queueEntry.id})`
        }]
      });

      return Response.json({
        success: true,
        message: 'Invoice queued for Xero sync.',
        queue_entry_id: queueEntry.id,
        note: 'Sync will complete automatically once Xero is connected. Use the Integration Hub to check status.'
      });
    }

    // ─── ACTION: sync_purchase_order ──────────────────────────────────────────
    if (action_type === 'sync_purchase_order') {
      if (!record_id) {
        return Response.json({ error: 'record_id is required' }, { status: 400 });
      }

      const po = await base44.entities.PurchaseOrder.get(record_id);

      // ── SHIELD-CERTIFIED GATE: Evaluate Shield before Xero sync ──
      const shieldCheck = await base44.functions.invoke('shieldInterceptor', {
        action: 'update',
        entity_name: 'PurchaseOrder',
        data: { ...po, xero_sync_status: 'syncing' },
        tenant_id: po.tenant_id
      });

      if (shieldCheck.data?.allowed === false && shieldCheck.data?.effect === 'block') {
        return Response.json({
          error: 'Shield Blocked: PO sync is blocked by a governance policy.',
          shield_response: shieldCheck.data,
          governance_rule: shieldCheck.data.policy_name,
          override_available: true
        }, { status: 403 });
      }

      if (po.processing_status !== 'verified') {
        return Response.json({
          error: 'Purchase Order must be verified before syncing to Xero.',
          current_status: po.processing_status
        }, { status: 422 });
      }

      if (po.xero_sync_status === 'synced') {
        return Response.json({
          success: false,
          message: 'Purchase Order already synced to Xero.',
          xero_bill_guid: po.xero_bill_guid
        });
      }

      const existingTrail = po.audit_trail || [];
      await base44.entities.PurchaseOrder.update(record_id, {
        xero_sync_status: 'syncing',
        audit_trail: [...existingTrail, {
          ...auditEntry,
          action: 'xero_sync_initiated',
          details: `Xero bill sync initiated by ${user.full_name}`
        }]
      });

      // ── Queue the PO sync via FinanceSyncQueue (async broker) ──
      const xeroBillPayload = buildXeroBillPayload(po);

      const queueEntry = await base44.entities.FinanceSyncQueue.create({
        tenant_id: po.tenant_id,
        outlet_id: po.outlet_id,
        queue_type: 'po_sync',
        source_entity: 'PurchaseOrder',
        source_record_id: record_id,
        erp_target: 'xero',
        payload: { Invoices: [xeroBillPayload] },
        financial_impact_sgd: po.total_amount || 0,
        impact_category: 'expense',
        status: 'pending',
        priority: (po.total_amount || 0) >= 200 ? 'immediate' : 'end_of_shift',
        created_by_id: user.id,
        notes: `PO ${po.po_number} queued by ${user.full_name}`,
      });

      const finalTrail = po.audit_trail || [];
      await base44.entities.PurchaseOrder.update(record_id, {
        audit_trail: [...finalTrail, {
          ...auditEntry,
          action: 'xero_sync_queued',
          details: `PO queued for Xero sync as Bill (entry: ${queueEntry.id})`
        }]
      });

      return Response.json({
        success: true,
        message: 'Purchase Order queued for Xero sync as Bill.',
        queue_entry_id: queueEntry.id,
        note: 'Sync will complete automatically once Xero is connected.'
      });
    }

    // ─── ACTION: get_sync_status ──────────────────────────────────────────────
    if (action_type === 'get_sync_status') {
      if (!record_id || !entity_type) {
        return Response.json({ error: 'record_id and entity_type are required' }, { status: 400 });
      }

      const mappings = await base44.entities.FinanceMapping.filter({
        orbitan_record_id: record_id,
        entity_type
      });

      return Response.json({
        success: true,
        record_id,
        entity_type,
        mappings
      });
    }

    // ─── ACTION: sync_labour_costs ────────────────────────────────────────────
    // Reads verified ClockRecords for a given date range and outlet, maps
    // labour costs to the AccountMapping entity, and creates Xero-compatible
    // manual journal entries. EXIT-READY: swap Xero endpoint for any ERP.
    if (action_type === 'sync_labour_costs') {
      const { outlet_id, tenant_id, date_from, date_to } = data || {};
      if (!outlet_id || !tenant_id || !date_from || !date_to) {
        return Response.json({ error: 'outlet_id, tenant_id, date_from, date_to are required in data' }, { status: 400 });
      }

      // Fetch all verified ClockRecords in date range
      const clockRecords = await base44.entities.ClockRecord.filter({
        tenant_id,
        outlet_id,
        status: 'clocked_out',
      });

      const rangeRecords = clockRecords.filter(r => r.date >= date_from && r.date <= date_to && r.labour_cost > 0);

      if (!rangeRecords.length) {
        return Response.json({ success: true, message: 'No verified labour records found for this period.', synced: 0 });
      }

      // Fetch the Labour account mapping for this tenant
      const accountMappings = await base44.entities.AccountMapping.filter({ tenant_id, is_active: true });
      const labourMapping = accountMappings.find(m => m.category_type === 'labour') || {
        xero_account_code: '477',
        xero_account_name: 'Wages & Salaries',
        tax_type: 'NONE',
      };

      // Aggregate labour cost per employee per day
      const totalLabourCost = rangeRecords.reduce((sum, r) => sum + (r.labour_cost || 0), 0);
      const totalHours = rangeRecords.reduce((sum, r) => sum + (r.total_hours_worked || 0), 0);

      // Build journal entry lines per employee
      const journalLines = rangeRecords.map(r => ({
        employee_name: r.employee_name,
        date: r.date,
        hours_worked: r.total_hours_worked,
        overtime_hours: r.overtime_hours || 0,
        labour_cost_sgd: r.labour_cost,
        xero_account_code: labourMapping.xero_account_code,
        xero_account_name: labourMapping.xero_account_name,
      }));

      // ── Queue labour cost journal via FinanceSyncQueue ──
      const journalPayload = buildXeroLabourJournalPayload(journalLines, totalLabourCost, labourMapping);
      const queueEntry = await base44.entities.FinanceSyncQueue.create({
        tenant_id,
        outlet_id,
        queue_type: 'labour_cost',
        source_entity: 'ClockRecord',
        source_record_id: `batch_${date_from}_${date_to}`,
        erp_target: 'xero',
        payload: { ManualJournals: [journalPayload] },
        financial_impact_sgd: totalLabourCost,
        impact_category: 'labour',
        status: 'pending',
        priority: 'end_of_day',
        created_by_id: user.id,
        notes: `Labour costs ${date_from} → ${date_to} queued by ${user.full_name}`,
      });

      const simulatedJournalGuid = `QUEUED-${queueEntry.id}`;

      await logAudit(base44, {
        tenant_id,
        actor_id: user.id,
        actor_name: user.full_name,
        actor_role: user.role,
        action_type: 'LABOUR_COSTS_SYNCED',
        module: 'workforce',
        target_entity: 'ClockRecord',
        target_record_id: `batch_${date_from}_${date_to}`,
        outlet_id,
        previous_state: null,
        new_state: { total_labour_cost: totalLabourCost, total_hours: totalHours, records: rangeRecords.length },
        details: `Labour costs synced to Xero for ${date_from} → ${date_to}. Total: SGD ${totalLabourCost.toFixed(2)} across ${rangeRecords.length} records.`,
      });

      return Response.json({
        success: true,
        message: `Labour costs synced for ${rangeRecords.length} clock records.`,
        summary: {
          date_range: `${date_from} → ${date_to}`,
          records_processed: rangeRecords.length,
          total_hours_worked: totalHours.toFixed(2),
          total_labour_cost_sgd: totalLabourCost.toFixed(2),
          xero_account: `${labourMapping.xero_account_code} — ${labourMapping.xero_account_name}`,
          journal_guid: simulatedJournalGuid,
          queue_entry_id: queueEntry.id,
        },
        journal_lines: journalLines,
        note: 'Journal queued via FinanceSyncQueue. Syncs to Xero automatically when connected.',
      });
    }

    // ─── ACTION: verify_clock_record ─────────────────────────────────────────
    // Manager manually verifies a flagged ClockRecord (e.g. after compliance gate)
    if (action_type === 'verify_clock_record') {
      if (!record_id) {
        return Response.json({ error: 'record_id is required' }, { status: 400 });
      }

      const clockRecord = await base44.entities.ClockRecord.get(record_id);

      await base44.entities.ClockRecord.update(record_id, {
        status: 'clocked_out',
        verified_by: user.id,
        verified_date: timestamp,
        notes: (clockRecord.notes || '') + ` | Manually verified by ${user.full_name} on ${timestamp}`,
      });

      // Mark the associated urgent task as completed
      const tasks = await base44.asServiceRole.entities.Task.filter({
        tenant_id: clockRecord.tenant_id,
        outlet_id: clockRecord.outlet_id,
        module_context: 'compliance',
        status: 'pending',
      });
      const relatedTask = tasks.find(t => t.title?.includes(clockRecord.employee_name) && t.title?.includes(clockRecord.date));
      if (relatedTask) {
        await base44.asServiceRole.entities.Task.update(relatedTask.id, {
          status: 'completed',
          completed_date: timestamp,
        });
      }

      await logAudit(base44, {
        tenant_id: clockRecord.tenant_id,
        actor_id: user.id,
        actor_name: user.full_name,
        actor_role: user.role,
        action_type: 'CLOCK_RECORD_VERIFIED',
        module: 'workforce',
        target_entity: 'ClockRecord',
        target_record_id: record_id,
        outlet_id: clockRecord.outlet_id,
        previous_state: { status: clockRecord.status },
        new_state: { status: 'clocked_out', verified_by: user.full_name },
        details: `ClockRecord manually verified by ${user.full_name} after compliance gate review.`,
      });

      return Response.json({
        success: true,
        message: 'Clock record verified successfully.',
        record_id,
        verified_by: user.full_name,
        verified_at: timestamp,
      });
    }

    return Response.json({ error: `Unknown action_type: ${action_type}` }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildXeroInvoicePayload(invoice) {
  return {
    Type: 'ACCREC',
    Reference: invoice.invoice_number,
    Date: invoice.date,
    DueDate: invoice.date,
    Contact: {
      Name: invoice.customer_name || 'Walk-in Customer'
    },
    LineItems: (invoice.line_items || []).map(item => ({
      Description: item.description,
      Quantity: item.quantity,
      UnitAmount: item.unit_price,
      TaxType: 'OUTPUT',
      AccountCode: '200'
    })),
    Status: 'AUTHORISED',
    CurrencyCode: 'SGD'
  };
}

// ── Build a Xero-compatible Bill payload from a PurchaseOrder ──
function buildXeroBillPayload(po) {
  return {
    Type: 'ACCPAY',
    Reference: po.po_number,
    Date: po.requested_date || new Date().toISOString().split('T')[0],
    DueDate: po.expected_delivery_date || po.requested_date || new Date().toISOString().split('T')[0],
    Contact: {
      Name: po.supplier_name || 'Unknown Supplier'
    },
    LineItems: (po.items || []).map(item => ({
      Description: item.item_name,
      Quantity: item.quantity,
      UnitAmount: item.unit_price,
      AccountCode: '300'
    })),
    Status: 'AUTHORISED',
    CurrencyCode: 'SGD'
  };
}

// ── Build a Xero Manual Journal payload for labour costs ──
function buildXeroLabourJournalPayload(journalLines, totalCost, accountMapping) {
  return {
    Narration: `Labour costs — OrbitanOS payroll sync`,
    Date: new Date().toISOString().split('T')[0],
    Status: 'POSTED',
    JournalLines: [
      {
        Description: `Wages & Salaries — ${journalLines.length} records`,
        LineAmount: totalCost,
        AccountCode: accountMapping.xero_account_code || '477',
        TaxType: accountMapping.tax_type || 'NONE',
      },
      {
        Description: 'Labour cost offset',
        LineAmount: -totalCost,
        AccountCode: '630',
        TaxType: 'NONE',
      },
    ],
  };
}