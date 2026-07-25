// Pilot Diagnostics — operational health + exception centre (Build Package #16, Part 1).
// Admin: platform-wide or per-tenant. tenant_admin: scoped to own tenant only.
// All reads use asServiceRole (cross-tenant for admin). Bounded queries (≤500).
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action;
    const isAdmin = user.role === 'admin';
    const E = base44.asServiceRole.entities;
    const LIMIT = 500;

    // ── RETRY: reset a failed finance-sync entry to pending ───────────────
    if (action === 'retry') {
      if (!isAdmin && user.role !== 'tenant_admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      const entryId = body.entry_id;
      if (!entryId) return Response.json({ error: 'entry_id is required' }, { status: 400 });
      const entry = await E.FinanceSyncQueue.get(entryId).catch(() => null);
      if (!entry) return Response.json({ error: 'Queue entry not found' }, { status: 404 });
      if (!isAdmin && entry.tenant_id !== (user.data?.tenant_id || user.tenant_id)) {
        return Response.json({ error: 'Forbidden — cross-tenant access denied' }, { status: 403 });
      }
      if (entry.status !== 'failed') return Response.json({ error: `Entry is not failed (status=${entry.status})` }, { status: 400 });
      await E.FinanceSyncQueue.update(entryId, {
        status: 'pending', last_error: null,
        notes: `Retry queued by ${user.full_name || user.email} at ${new Date().toISOString()}`,
      });
      await E.AuditLog.create({
        tenant_id: entry.tenant_id, actor_id: user.id, actor_name: user.full_name || user.email,
        actor_role: user.role, action_type: 'finance_sync_retry_queued', module: 'finance',
        target_entity: 'FinanceSyncQueue', target_record_id: entryId,
        details: `Retry queued for ${entry.queue_type} (${entry.source_entity}) — previous attempts: ${entry.sync_attempts || 0}`,
      }).catch(() => null);
      return Response.json({ success: true, entry_id: entryId, status: 'pending' });
    }

    // ── DIAGNOSTICS (default) ─────────────────────────────────────────────
    let tenantId = body.tenant_id;
    if (!isAdmin) {
      if (user.role !== 'tenant_admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      tenantId = user.data?.tenant_id || user.tenant_id;
      if (!tenantId) return Response.json({ error: 'No tenant context' }, { status: 403 });
    }
    const q = tenantId ? { tenant_id: tenantId } : {};

    const [tenants, invoices, batches, invItems, fq, auditLog] = await Promise.all([
      tenantId ? E.Tenant.filter({ id: tenantId }) : E.Tenant.list('-created_date', 500),
      E.SalesInvoice.filter(q, '-created_date', LIMIT),
      E.ProductionBatch.filter(q, '-created_date', LIMIT),
      E.InventoryItem.filter(q, '-created_date', LIMIT),
      E.FinanceSyncQueue.filter(q, '-created_date', LIMIT),
      E.AuditLog.filter(q, '-created_date', LIMIT),
    ]);

    // ── System health ─────────────────────────────────────────────────────
    let system_health;
    if (tenantId) {
      const t = tenants[0] || null;
      system_health = { scoped: true, tenant_name: t?.name, tenant_status: t?.status, is_pilot: !!t?.is_pilot_tenant, is_sandbox: !!t?.is_sandbox };
    } else {
      const by = (arr, f) => arr.filter(f).length;
      system_health = {
        scoped: false, tenants_total: tenants.length,
        active: by(tenants, t => t.status === 'active'),
        suspended: by(tenants, t => t.status === 'suspended'),
        trial: by(tenants, t => t.status === 'trial'),
        cancelled: by(tenants, t => t.status === 'cancelled'),
        onboarding: by(tenants, t => t.status === 'onboarding'),
        pilots: by(tenants, t => t.is_pilot_tenant),
        sandboxes: by(tenants, t => t.is_sandbox),
      };
    }

    // ── Transaction health ────────────────────────────────────────────────
    const sales_paid = invoices.filter(i => i.payment_status === 'paid').length;
    const sales_cancelled = invoices.filter(i => i.payment_status === 'cancelled').length;
    const production_completed = batches.filter(b => b.status === 'completed').length;
    const production_cancelled = batches.filter(b => b.status === 'cancelled').length;
    const revenue = invoices.filter(i => i.payment_status === 'paid').reduce((s, i) => s + (i.total || 0), 0);
    const transaction_health = {
      sales_total: invoices.length, sales_paid, sales_cancelled,
      production_batches: batches.length, production_completed, production_cancelled,
      revenue_sgd: +revenue.toFixed(2),
    };

    // ── Inventory health ──────────────────────────────────────────────────
    let total_value = 0, low = 0, out = 0, neg = 0;
    for (const it of invItems) {
      const cs = Number(it.current_stock) || 0;
      const rp = Number(it.reorder_point) || 0;
      const cpu = Number(it.cost_per_unit) || 0;
      total_value += cs * cpu;
      if (cs < 0) neg++;
      else if (cs <= 0) out++;
      else if (rp > 0 && cs <= rp) low++;
    }
    const inventory_health = { total_items: invItems.length, low_stock: low, out_of_stock: out, negative_stock: neg, total_value_sgd: +total_value.toFixed(2) };

    // ── Finance sync status ───────────────────────────────────────────────
    const fby = {};
    for (const f of fq) fby[f.status] = (fby[f.status] || 0) + 1;
    const failedEntries = fq.filter(f => f.status === 'failed');
    const finance_sync_status = { by_status: fby, total: fq.length, failed_retryable: failedEntries.length };

    // ── Audit integrity ──────────────────────────────────────────────────
    const permission_denied = auditLog.filter(a => a.shield_outcome === 'blocked' || /denied|forbidden/i.test(a.action_type || ''));
    const audit_integrity = { audit_entries: auditLog.length, permission_denied_count: permission_denied.length };

    // ── Exceptions (derived, bounded) ────────────────────────────────────
    const exceptions = [];
    for (const f of failedEntries.slice(0, 100)) {
      exceptions.push({ type: 'finance_sync_failed', severity: 'high', source: 'FinanceSyncQueue', record_id: f.id, tenant_id: f.tenant_id, message: f.last_error || 'Sync failed', created_at: f.created_date, retryable: true });
    }
    for (const it of invItems) {
      const cs = Number(it.current_stock) || 0;
      if (cs < 0) exceptions.push({ type: 'negative_stock', severity: 'critical', source: 'InventoryItem', record_id: it.id, tenant_id: it.tenant_id, message: `${it.name}: ${cs} (negative stock)`, created_at: it.created_date, retryable: false });
    }
    for (const b of batches.filter(b => b.status === 'cancelled').slice(0, 50)) {
      exceptions.push({ type: 'production_cancelled', severity: 'medium', source: 'ProductionBatch', record_id: b.id, tenant_id: b.tenant_id, message: b.cancel_reason || `Batch ${b.batch_number} cancelled`, created_at: b.cancelled_at || b.created_date, retryable: false });
    }
    for (const a of permission_denied.slice(0, 50)) {
      exceptions.push({ type: 'permission_denied', severity: 'medium', source: 'AuditLog', record_id: a.id, tenant_id: a.tenant_id, message: a.details || a.action_type, created_at: a.created_date, retryable: false });
    }
    // Orphaned invoices — paid but no finance sync queued (audit gap / broken reference)
    const invoiceSyncSources = new Set(fq.filter(f => f.queue_type === 'invoice_sync').map(f => f.source_record_id));
    let orphanCount = 0;
    for (const inv of invoices.filter(i => i.payment_status === 'paid')) {
      if (orphanCount >= 50) break;
      if (!invoiceSyncSources.has(inv.id)) {
        exceptions.push({ type: 'orphaned_invoice', severity: 'high', source: 'SalesInvoice', record_id: inv.id, tenant_id: inv.tenant_id, message: `Invoice ${inv.invoice_number} paid but no finance sync queued`, created_at: inv.created_date, retryable: true });
        orphanCount++;
      }
    }

    // ── Retry queue ───────────────────────────────────────────────────────
    const retry_queue = failedEntries.slice(0, 100).map(f => ({
      id: f.id, tenant_id: f.tenant_id, queue_type: f.queue_type, source_entity: f.source_entity,
      source_record_id: f.source_record_id, financial_impact_sgd: f.financial_impact_sgd,
      sync_attempts: f.sync_attempts, last_error: f.last_error, created_date: f.created_date,
    }));

    return Response.json({
      scope: { platform_wide: !tenantId, tenant_id: tenantId || null, generated_at: new Date().toISOString() },
      system_health, transaction_health, inventory_health, finance_sync_status, audit_integrity,
      exceptions: exceptions.slice(0, 200), exception_count: exceptions.length,
      retry_queue, retry_queue_count: retry_queue.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});