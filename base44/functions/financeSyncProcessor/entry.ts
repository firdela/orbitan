import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

/**
 * OrbitanOS — Automated FinanceSyncQueue Processor
 *
 * Multi-tenant automated consumer for the FinanceSyncQueue.
 * Designed to be triggered by a scheduled automation (every 15 minutes).
 *
 * Processing pipeline per tenant:
 *   1. Fetch all pending FinanceSyncQueue entries (priority-ordered)
 *   2. For each entry:
 *      a. Evaluate Shield governance threshold gate
 *         - If financial_impact_sgd > tenant governance_threshold_sgd → route to manual_review
 *         - Create GovernanceOverride record for manager approval
 *      b. Check Xero connection for the tenant
 *         - Not connected → mark as skipped (skip_reason: 'xero_not_connected')
 *      c. Sync to Xero API (POST Invoices / ManualJournals)
 *      d. On success → update source entity with xero_guid, write AuditLog
 *      e. On failure → increment sync_attempts, apply exponential backoff
 *         - Max 3 attempts, then mark as failed
 *
 * Admin-only: this function runs as a scheduled task with service-role elevation.
 */

const XERO_API_BASE = 'https://api.xero.com/api.xro/2.0';
const MAX_SYNC_ATTEMPTS = 3;
const PRIORITY_ORDER = { immediate: 0, end_of_shift: 1, end_of_day: 2 };

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // ── Auth: must be admin (scheduled task runs as platform admin) ──
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Automated sync processor requires admin role' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { tenant_id: singleTenantId } = body;

    // ── Fetch ALL pending entries across all tenants (or single tenant if specified) ──
    const filter = { status: 'pending' };
    if (singleTenantId) {
      filter.tenant_id = singleTenantId;
    }

    const pendingEntries = await base44.asServiceRole.entities.FinanceSyncQueue.filter(filter, '-created_date', 100);

    if (!pendingEntries || pendingEntries.length === 0) {
      return Response.json({
        success: true,
        message: 'No pending FinanceSyncQueue entries to process.',
        processed: 0,
        synced: 0,
        routed_to_review: 0,
        failed: 0,
        skipped: 0,
      });
    }

    // ── Sort by priority (immediate first, then end_of_shift, then end_of_day) ──
    pendingEntries.sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 99;
      const pb = PRIORITY_ORDER[b.priority] ?? 99;
      if (pa !== pb) return pa - pb;
      return new Date(a.created_date) - new Date(b.created_date);
    });

    // ── Cache tenant governance thresholds and Xero credentials ──
    const tenantCache = new Map();

    let synced = 0;
    let routedToReview = 0;
    let failed = 0;
    let skipped = 0;
    const results = [];

    for (const entry of pendingEntries) {
      try {
        // ── Resolve tenant context (cached) ──
        let tenantContext = tenantCache.get(entry.tenant_id);
        if (!tenantContext) {
          tenantContext = await resolveTenantContext(base44, entry.tenant_id);
          tenantCache.set(entry.tenant_id, tenantContext);
        }

        // ── STEP 1: Shield Governance Threshold Gate ──
        const threshold = tenantContext.governanceThresholdSgd || 50;
        const exceedsThreshold = (entry.financial_impact_sgd || 0) > threshold;

        if (exceedsThreshold && !entry.threshold_applied) {
          // Route to manual_review and create GovernanceOverride
          await base44.asServiceRole.entities.FinanceSyncQueue.update(entry.id, {
            status: 'manual_review',
            threshold_applied: true,
            threshold_value_sgd: threshold,
            notes: (entry.notes || '') + ` | Routed to manual review: SGD ${entry.financial_impact_sgd} exceeds threshold SGD ${threshold}.`,
          });

          await base44.asServiceRole.entities.GovernanceOverride.create({
            tenant_id: entry.tenant_id,
            outlet_id: entry.outlet_id,
            request_type: 'finance_threshold',
            target_entity: entry.source_entity,
            target_record_id: entry.source_record_id,
            requested_by_id: entry.created_by_id || 'system',
            requested_by_name: 'FinanceSyncQueue Processor',
            requested_by_role: 'system',
            status: 'pending',
            severity: 'high',
            justification: `Automated gate: Financial impact SGD ${entry.financial_impact_sgd} exceeds governance threshold SGD ${threshold} for tenant ${tenantContext.tenantName}.`,
            policy_name: 'finance_threshold_gate',
            requested_data: {
              queue_entry_id: entry.id,
              queue_type: entry.queue_type,
              financial_impact_sgd: entry.financial_impact_sgd,
              threshold_sgd: threshold,
              impact_category: entry.impact_category,
            },
            risk_assessment: {
              amount: entry.financial_impact_sgd,
              threshold: threshold,
              ratio: threshold > 0 ? (entry.financial_impact_sgd / threshold).toFixed(2) : 'N/A',
            },
          });

          await base44.asServiceRole.entities.AuditLog.create({
            tenant_id: entry.tenant_id,
            actor_id: 'system',
            actor_name: 'FinanceSyncQueue Processor',
            actor_role: 'admin',
            action_type: 'finance_threshold_routed',
            module: 'finance',
            target_entity: 'FinanceSyncQueue',
            target_record_id: entry.id,
            outlet_id: entry.outlet_id,
            details: `Queue entry routed to manual review. SGD ${entry.financial_impact_sgd} > threshold SGD ${threshold}. GovernanceOverride created.`,
            shield_outcome: 'override_requested',
            justification: 'Automated governance threshold gate — high-value transaction requires human approval before ERP sync.',
          });

          routedToReview++;
          results.push({ entry_id: entry.id, status: 'manual_review', reason: 'Exceeds governance threshold' });
          continue;
        }

        // ── STEP 2: Check Xero connection ──
        if (!tenantContext.xeroConnected) {
          await base44.asServiceRole.entities.FinanceSyncQueue.update(entry.id, {
            status: 'skipped',
            skip_reason: 'Xero not connected for this tenant. Connect Xero in the Integration Hub.',
          });
          skipped++;
          results.push({ entry_id: entry.id, status: 'skipped', reason: 'Xero not connected' });
          continue;
        }

        // ── STEP 3: Mark as processing ──
        await base44.asServiceRole.entities.FinanceSyncQueue.update(entry.id, {
          status: 'processing',
          last_attempt_at: new Date().toISOString(),
          sync_attempts: (entry.sync_attempts || 0) + 1,
          threshold_applied: true,
          threshold_value_sgd: threshold,
        });

        // ── STEP 4: Refresh Xero token if expired ──
        let accessToken = tenantContext.xeroAccessToken;
        const xeroTenantId = tenantContext.xeroTenantId;

        if (tenantContext.tokenExpiresAt && new Date(tenantContext.tokenExpiresAt) < new Date(Date.now() + 60_000)) {
          const refreshRes = await base44.asServiceRole.functions.invoke('xeroOAuth', {
            action: 'refresh_token',
            tenant_id: entry.tenant_id,
          });

          if (!refreshRes.data?.success) {
            await base44.asServiceRole.entities.FinanceSyncQueue.update(entry.id, {
              status: 'failed',
              last_error: 'Xero token expired and refresh failed. Please reconnect Xero.',
            });
            failed++;
            results.push({ entry_id: entry.id, status: 'failed', error: 'Token refresh failed' });
            continue;
          }

          // Re-fetch credential
          const refreshedCreds = await base44.asServiceRole.entities.IntegrationCredential.filter({
            tenant_id: entry.tenant_id,
            service_type: 'xero',
          });
          accessToken = refreshedCreds[0]?.access_token;
        }

        // ── STEP 5: Determine Xero API endpoint ──
        let xeroEndpoint = '';
        let xeroEntityLabel = '';

        if (entry.queue_type === 'invoice_sync') {
          xeroEndpoint = '/Invoices';
          xeroEntityLabel = 'Invoice';
        } else if (entry.queue_type === 'po_sync') {
          xeroEndpoint = '/Invoices';
          xeroEntityLabel = 'Bill';
        } else if (entry.queue_type === 'journal_entry' || entry.queue_type === 'labour_cost') {
          xeroEndpoint = '/ManualJournals';
          xeroEntityLabel = 'ManualJournal';
        } else {
          await base44.asServiceRole.entities.FinanceSyncQueue.update(entry.id, {
            status: 'skipped',
            skip_reason: `Unsupported queue_type: ${entry.queue_type}`,
          });
          skipped++;
          results.push({ entry_id: entry.id, status: 'skipped', reason: `Unsupported queue_type: ${entry.queue_type}` });
          continue;
        }

        // ── STEP 6: Live Xero API call ──
        const xeroRes = await fetch(`${XERO_API_BASE}${xeroEndpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Xero-tenant-id': xeroTenantId,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(entry.payload || {}),
        });

        if (!xeroRes.ok) {
          const errText = await xeroRes.text();
          const attempts = (entry.sync_attempts || 0) + 1;

          if (attempts >= MAX_SYNC_ATTEMPTS) {
            // Max retries reached — mark as failed
            await base44.asServiceRole.entities.FinanceSyncQueue.update(entry.id, {
              status: 'failed',
              last_error: `Xero API ${xeroRes.status}: ${errText.substring(0, 500)} (after ${attempts} attempts)`,
            });

            await base44.asServiceRole.entities.AuditLog.create({
              tenant_id: entry.tenant_id,
              actor_id: 'system',
              actor_name: 'FinanceSyncQueue Processor',
              actor_role: 'admin',
              action_type: 'finance_sync_failed',
              module: 'finance',
              target_entity: entry.source_entity,
              target_record_id: entry.source_record_id,
              outlet_id: entry.outlet_id,
              details: `Xero sync failed after ${attempts} attempts. Error: ${errText.substring(0, 200)}`,
              shield_outcome: 'not_evaluated',
            });

            failed++;
            results.push({ entry_id: entry.id, status: 'failed', error: errText.substring(0, 200), attempts });
          } else {
            // Re-queue for next processing cycle (exponential backoff)
            await base44.asServiceRole.entities.FinanceSyncQueue.update(entry.id, {
              status: 'pending', // Back to pending for next cycle
              last_error: `Xero API ${xeroRes.status}: ${errText.substring(0, 500)} (attempt ${attempts}/${MAX_SYNC_ATTEMPTS})`,
            });
            results.push({ entry_id: entry.id, status: 'requeued', error: errText.substring(0, 200), attempts });
          }
          continue;
        }

        // ── STEP 7: Success — extract GUID and update records ──
        const xeroData = await xeroRes.json();
        let xeroGuid = '';

        if (xeroEntityLabel === 'Invoice' && xeroData.Invoices?.[0]) {
          xeroGuid = xeroData.Invoices[0].InvoiceID;
        } else if (xeroEntityLabel === 'ManualJournal' && xeroData.ManualJournals?.[0]) {
          xeroGuid = xeroData.ManualJournals[0].ManualJournalID;
        }

        // Update FinanceSyncQueue
        await base44.asServiceRole.entities.FinanceSyncQueue.update(entry.id, {
          status: 'synced',
          synced_at: new Date().toISOString(),
          erp_reference_id: xeroGuid,
          last_error: '',
        });

        // Update source entity
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

        // Update FinanceMapping
        await base44.asServiceRole.entities.FinanceMapping.create({
          tenant_id: entry.tenant_id,
          outlet_id: entry.outlet_id,
          entity_type: entry.queue_type === 'invoice_sync' ? 'sales_invoice' : (entry.queue_type === 'po_sync' ? 'purchase_order' : 'journal'),
          orbitan_record_id: entry.source_record_id,
          xero_guid: xeroGuid,
          xero_entity_type: xeroEntityLabel === 'Bill' ? 'Bill' : xeroEntityLabel,
          xero_status: 'AUTHORISED',
          sync_direction: 'orbitan_to_xero',
          last_synced_at: new Date().toISOString(),
          sync_attempts: (entry.sync_attempts || 0) + 1,
          is_active: true,
        });

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
          tenant_id: entry.tenant_id,
          actor_id: 'system',
          actor_name: 'FinanceSyncQueue Processor',
          actor_role: 'admin',
          action_type: 'finance_sync_completed',
          module: 'finance',
          target_entity: entry.source_entity,
          target_record_id: entry.source_record_id,
          outlet_id: entry.outlet_id,
          details: `${xeroEntityLabel} synced to Xero automatically. GUID: ${xeroGuid}. Queue entry: ${entry.id}.`,
          shield_outcome: 'not_evaluated',
        });

        synced++;
        results.push({ entry_id: entry.id, status: 'synced', xero_guid: xeroGuid });

      } catch (entryErr) {
        console.error(`[financeSyncProcessor] Error processing entry ${entry.id}:`, entryErr.message);
        const attempts = (entry.sync_attempts || 0) + 1;

        if (attempts >= MAX_SYNC_ATTEMPTS) {
          await base44.asServiceRole.entities.FinanceSyncQueue.update(entry.id, {
            status: 'failed',
            last_error: entryErr.message.substring(0, 500),
          });
          failed++;
        } else {
          await base44.asServiceRole.entities.FinanceSyncQueue.update(entry.id, {
            status: 'pending',
            last_error: entryErr.message.substring(0, 500),
          });
        }

        results.push({ entry_id: entry.id, status: 'error', error: entryErr.message.substring(0, 200), attempts });
      }
    }

    return Response.json({
      success: true,
      message: `FinanceSyncQueue processing complete. ${synced} synced, ${routedToReview} routed to manual review, ${failed} failed, ${skipped} skipped.`,
      processed: pendingEntries.length,
      synced,
      routed_to_review: routedToReview,
      failed,
      skipped,
      results,
    });

  } catch (error) {
    console.error('[financeSyncProcessor] Fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ── Helper: Resolve tenant context (governance threshold + Xero credentials) ──
async function resolveTenantContext(base44, tenantId) {
  // Fetch tenant record and Xero credentials in parallel
  const [tenants, xeroCreds] = await Promise.all([
    base44.asServiceRole.entities.Tenant.filter({ id: tenantId }),
    base44.asServiceRole.entities.IntegrationCredential.filter({
      tenant_id: tenantId,
      service_type: 'xero',
    }),
  ]);

  const tenant = tenants[0];
  let governanceThresholdSgd = 50; // Default fallback

  // Resolve governance threshold from ActivationRegistry if tenant has a governance_domain
  if (tenant?.governance_domain) {
    try {
      const registry = await base44.asServiceRole.entities.ActivationRegistry.filter({
        governance_domain: tenant.governance_domain,
        is_active: true,
      });
      if (registry[0]?.governance_threshold_sgd) {
        governanceThresholdSgd = registry[0].governance_threshold_sgd;
      }
    } catch {
      // Fail-open with default threshold
    }
  }

  const xeroCredential = xeroCreds[0];
  const xeroConnected = xeroCredential && xeroCredential.status === 'connected';

  return {
    tenantId,
    tenantName: tenant?.name || 'Unknown',
    governanceThresholdSgd,
    xeroConnected,
    xeroAccessToken: xeroCredential?.access_token || null,
    xeroTenantId: xeroCredential?.external_tenant_id || null,
    tokenExpiresAt: xeroCredential?.token_expires_at || null,
  };
}