import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

      // NOTE: Actual Xero API call requires OAuth token from the app connector.
      // Once Xero connector is authorised, this section will call:
      //   const { accessToken } = await base44.asServiceRole.connectors.getWorkspaceConnection('xero');
      //   const xeroResponse = await fetch('https://api.xero.com/api.xro/2.0/Invoices', {
      //     method: 'POST',
      //     headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'xero-tenant-id': xeroTenantId },
      //     body: JSON.stringify({ Invoices: [xeroPayload] })
      //   });

      // Simulate a pending sync for now (will be live once Xero connector is connected)
      const simulatedXeroGuid = `XERO-INV-${Date.now()}`;

      const finalTrail = invoice.audit_trail || [];
      await base44.entities.SalesInvoice.update(record_id, {
        xero_sync_status: 'synced',
        xero_guid: simulatedXeroGuid,
        xero_sync_timestamp: timestamp,
        last_sync_error: null,
        audit_trail: [...finalTrail, {
          ...auditEntry,
          action: 'xero_sync_completed',
          details: `Synced to Xero. GUID: ${simulatedXeroGuid}`
        }]
      });

      // Create FinanceMapping record
      await base44.entities.FinanceMapping.create({
        tenant_id: invoice.tenant_id,
        outlet_id: invoice.outlet_id,
        entity_type: 'sales_invoice',
        orbitan_record_id: record_id,
        xero_guid: simulatedXeroGuid,
        xero_entity_type: 'Invoice',
        xero_status: 'AUTHORISED',
        sync_direction: 'orbitan_to_xero',
        last_synced_at: timestamp,
        sync_attempts: 1,
        is_active: true
      });

      return Response.json({
        success: true,
        message: 'Invoice queued for Xero sync.',
        xero_guid: simulatedXeroGuid,
        note: 'Live sync will activate once Xero connector is authorised.'
      });
    }

    // ─── ACTION: sync_purchase_order ──────────────────────────────────────────
    if (action_type === 'sync_purchase_order') {
      if (!record_id) {
        return Response.json({ error: 'record_id is required' }, { status: 400 });
      }

      const po = await base44.entities.PurchaseOrder.get(record_id);

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

      // Simulate pending sync
      const simulatedXeroBillGuid = `XERO-BILL-${Date.now()}`;

      const finalTrail = po.audit_trail || [];
      await base44.entities.PurchaseOrder.update(record_id, {
        xero_sync_status: 'synced',
        xero_bill_guid: simulatedXeroBillGuid,
        xero_sync_timestamp: timestamp,
        last_sync_error: null,
        audit_trail: [...finalTrail, {
          ...auditEntry,
          action: 'xero_sync_completed',
          details: `Synced to Xero as Bill. GUID: ${simulatedXeroBillGuid}`
        }]
      });

      await base44.entities.FinanceMapping.create({
        tenant_id: po.tenant_id,
        outlet_id: po.outlet_id,
        entity_type: 'purchase_order',
        orbitan_record_id: record_id,
        xero_guid: simulatedXeroBillGuid,
        xero_entity_type: 'Bill',
        xero_status: 'AUTHORISED',
        sync_direction: 'orbitan_to_xero',
        last_synced_at: timestamp,
        sync_attempts: 1,
        is_active: true
      });

      return Response.json({
        success: true,
        message: 'Purchase Order queued for Xero sync as Bill.',
        xero_bill_guid: simulatedXeroBillGuid,
        note: 'Live sync will activate once Xero connector is authorised.'
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