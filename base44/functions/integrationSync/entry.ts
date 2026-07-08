import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Integration Hub Sync Processor — OrbitanOS
 *
 * Processes the FinanceSyncQueue: picks up pending entries and syncs them
 * to the tenant's connected ERP (Xero). This is the "consumer" side of
 * the async FinanceSyncQueue broker.
 *
 * Can be triggered by:
 *   - Scheduled automation (end-of-day batch processing)
 *   - Manual invocation from the Integration Hub UI ("Sync Now")
 *
 * For each pending FinanceSyncQueue entry:
 *   1. Resolve the tenant's IntegrationCredential (Xero access token)
 *   2. Refresh token if expired (via xeroOAuth function)
 *   3. POST the payload to Xero API
 *   4. Update FinanceSyncQueue status → synced/failed
 *   5. Update source entity (SalesInvoice/PurchaseOrder) xero_guid
 *   6. Write AuditLog entry
 */

const XERO_API_BASE = 'https://api.xero.com/api.xro/2.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowedRoles = ['admin', 'tenant_admin'];
    if (!allowedRoles.includes(user.role)) {
      return Response.json({ error: 'Forbidden: Integration sync requires admin or tenant admin' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { tenant_id, batch_id } = body;

    if (!tenant_id) {
      return Response.json({ error: 'tenant_id is required' }, { status: 400 });
    }

    // ── Resolve Xero credentials for this tenant ──
    const creds = await base44.asServiceRole.entities.IntegrationCredential.filter({
      tenant_id,
      service_type: 'xero',
    });

    if (!creds || creds.length === 0 || creds[0].status !== 'connected') {
      return Response.json({
        success: false,
        message: 'Xero is not connected for this tenant. Connect Xero in the Integration Hub first.',
        synced: 0,
        failed: 0,
      });
    }

    let credential = creds[0];

    // ── Check token expiry, refresh if needed ──
    const isExpired = credential.token_expires_at && new Date(credential.token_expires_at) < new Date(Date.now() + 60_000);
    if (isExpired) {
      const refreshRes = await base44.asServiceRole.functions.invoke('xeroOAuth', {
        action: 'refresh_token',
        tenant_id,
      });

      if (!refreshRes.data?.success) {
        return Response.json({
          success: false,
          message: 'Xero token expired and refresh failed. Please reconnect Xero.',
          error: refreshRes.data?.error || 'Refresh failed',
        }, { status: 401 });
      }

      // Re-fetch the updated credential
      const refreshedCreds = await base44.asServiceRole.entities.IntegrationCredential.filter({
        tenant_id,
        service_type: 'xero',
      });
      credential = refreshedCreds[0];
    }

    const accessToken = credential.access_token;
    const xeroTenantId = credential.external_tenant_id;

    // ── Fetch pending FinanceSyncQueue entries ──
    const filter = { tenant_id, status: 'pending' };
    if (batch_id) {
      filter.batch_id = batch_id;
    }

    const queueEntries = await base44.asServiceRole.entities.FinanceSyncQueue.filter(filter);

    if (!queueEntries || queueEntries.length === 0) {
      return Response.json({
        success: true,
        message: 'No pending sync entries found.',
        synced: 0,
        failed: 0,
      });
    }

    let synced = 0;
    let failed = 0;
    const results = [];

    for (const entry of queueEntries) {
      try {
        // Mark as processing
        await base44.asServiceRole.entities.FinanceSyncQueue.update(entry.id, {
          status: 'processing',
          last_attempt_at: new Date().toISOString(),
          sync_attempts: (entry.sync_attempts || 0) + 1,
        });

        const payload = entry.payload || {};
        let xeroEndpoint = '';
        let xeroEntityLabel = '';

        // Determine Xero API endpoint based on queue_type
        if (entry.queue_type === 'invoice_sync') {
          xeroEndpoint = '/Invoices';
          xeroEntityLabel = 'Invoice';
        } else if (entry.queue_type === 'po_sync') {
          xeroEndpoint = '/Invoices'; // POs go as Bills (Type: ACCPAY)
          xeroEntityLabel = 'Bill';
        } else if (entry.queue_type === 'journal_entry' || entry.queue_type === 'labour_cost') {
          xeroEndpoint = '/ManualJournals';
          xeroEntityLabel = 'ManualJournal';
        } else {
          // Skip unsupported queue types
          await base44.asServiceRole.entities.FinanceSyncQueue.update(entry.id, {
            status: 'skipped',
            skip_reason: `Unsupported queue_type: ${entry.queue_type}`,
          });
          continue;
        }

        // ── Live Xero API call ──
        const xeroRes = await fetch(`${XERO_API_BASE}${xeroEndpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Xero-tenant-id': xeroTenantId,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!xeroRes.ok) {
          const errText = await xeroRes.text();
          console.error(`[integrationSync] Xero API error for entry ${entry.id}:`, errText);

          await base44.asServiceRole.entities.FinanceSyncQueue.update(entry.id, {
            status: 'failed',
            last_error: `Xero API ${xeroRes.status}: ${errText.substring(0, 500)}`,
          });

          failed++;
          results.push({ entry_id: entry.id, status: 'failed', error: errText.substring(0, 200) });
          continue;
        }

        const xeroData = await xeroRes.json();

        // Extract the GUID from Xero response
        let xeroGuid = '';
        if (xeroEntityLabel === 'Invoice' && xeroData.Invoices?.[0]) {
          xeroGuid = xeroData.Invoices[0].InvoiceID;
        } else if (xeroEntityLabel === 'ManualJournal' && xeroData.ManualJournals?.[0]) {
          xeroGuid = xeroData.ManualJournals[0].ManualJournalID;
        }

        // ── Update FinanceSyncQueue entry ──
        await base44.asServiceRole.entities.FinanceSyncQueue.update(entry.id, {
          status: 'synced',
          synced_at: new Date().toISOString(),
          erp_reference_id: xeroGuid,
          last_error: '',
        });

        // ── Update source entity with Xero GUID ──
        if (entry.source_entity === 'SalesInvoice') {
          await base44.asServiceRole.entities.SalesInvoice.update(entry.source_record_id, {
            xero_guid: xeroGuid,
            xero_sync_status: 'synced',
            xero_sync_timestamp: new Date().toISOString(),
            last_sync_error: null,
          });
        } else if (entry.source_entity === 'PurchaseOrder') {
          await base44.asServiceRole.entities.PurchaseOrder.update(entry.source_record_id, {
            xero_bill_guid: xeroGuid,
            xero_sync_status: 'synced',
            xero_sync_timestamp: new Date().toISOString(),
            last_sync_error: null,
          });
        }

        // ── Update FinanceMapping ──
        const xeroEntityType = xeroEntityLabel === 'Bill' ? 'Bill' : xeroEntityLabel;
        await base44.asServiceRole.entities.FinanceMapping.create({
          tenant_id: entry.tenant_id,
          outlet_id: entry.outlet_id,
          entity_type: entry.queue_type === 'invoice_sync' ? 'sales_invoice' : (entry.queue_type === 'po_sync' ? 'purchase_order' : 'journal'),
          orbitan_record_id: entry.source_record_id,
          xero_guid: xeroGuid,
          xero_entity_type: xeroEntityType,
          xero_status: 'AUTHORISED',
          sync_direction: 'orbitan_to_xero',
          last_synced_at: new Date().toISOString(),
          sync_attempts: entry.sync_attempts,
          is_active: true,
        });

        // ── Audit log ──
        await base44.asServiceRole.entities.AuditLog.create({
          tenant_id: entry.tenant_id,
          actor_id: user.id,
          actor_name: user.full_name,
          actor_role: user.role,
          action_type: 'XERO_SYNC_COMPLETED',
          module: 'finance',
          target_entity: entry.source_entity,
          target_record_id: entry.source_record_id,
          outlet_id: entry.outlet_id,
          details: `${xeroEntityLabel} synced to Xero. GUID: ${xeroGuid}. Queue entry: ${entry.id}.`,
          shield_outcome: 'not_evaluated',
        });

        synced++;
        results.push({ entry_id: entry.id, status: 'synced', xero_guid: xeroGuid });

      } catch (entryErr) {
        console.error(`[integrationSync] Error processing entry ${entry.id}:`, entryErr.message);
        await base44.asServiceRole.entities.FinanceSyncQueue.update(entry.id, {
          status: 'failed',
          last_error: entryErr.message.substring(0, 500),
        });
        failed++;
        results.push({ entry_id: entry.id, status: 'failed', error: entryErr.message.substring(0, 200) });
      }
    }

    return Response.json({
      success: true,
      message: `Sync complete: ${synced} synced, ${failed} failed.`,
      synced,
      failed,
      results,
    });

  } catch (error) {
    console.error('[integrationSync] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});