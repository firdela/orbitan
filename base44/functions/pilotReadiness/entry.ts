import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * Pilot Readiness Engine (Build Package #14, Parts R/W/O/V)
 * Principle: Reach + Regulate
 *
 * Actions:
 *   readiness   — deterministic onboarding checklist + readiness % + go-live
 *                 recommendation from REAL tenant data + manual attestations.
 *   diagnostics — authorised support diagnostics (failures, queue, insights,
 *                 connection, version). Admin/tenant_admin only.
 *
 * Readiness is deterministic and explainable: every item is either
 * auto-detected from real records or a manual attestation flag. No fabricated
 * percentages. Go-live recommendation never says "Ready" while a critical
 * blocker remains.
 */

const APP_VERSION = '14.0.0';
const RULE_VERSION = 'pilot-readiness-v1';
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// Critical blockers — incomplete => cannot be "Ready for Controlled Pilot"
const CRITICAL_KEYS = ['outlet_configured', 'leader_assigned', 'workers_invited', 'inventory_items_added', 'sale_tested'];

// (key, label, category, weight, source, critical)
const ITEM_DEFS = [
  ['tenant_configured', 'Tenant configured', 'Organisation', 5, 'auto', false],
  ['company_configured', 'Company / Brand configured', 'Organisation', 5, 'auto', false],
  ['outlet_configured', 'Outlet configured', 'Organisation', 10, 'auto', true],
  ['leader_assigned', 'Leader assigned', 'People', 8, 'auto', true],
  ['workers_invited', 'Workers invited / added', 'People', 7, 'auto', true],
  ['permissions_reviewed', 'Permissions reviewed', 'People', 4, 'manual', false],
  ['attendance_configured', 'Attendance settings configured', 'Operations', 5, 'auto', false],
  ['scheduling_configured', 'Scheduling configured', 'Operations', 4, 'auto', false],
  ['inventory_items_added', 'Inventory items added', 'Inventory & Recipes', 8, 'auto', true],
  ['suppliers_added', 'Suppliers added', 'Inventory & Recipes', 4, 'auto', false],
  ['recipes_added', 'Recipes added', 'Inventory & Recipes', 4, 'auto', false],
  ['opening_stock_entered', 'Opening stock entered', 'Inventory & Recipes', 4, 'auto', false],
  ['production_tested', 'Production tested', 'Operations', 5, 'auto', false],
  ['sale_tested', 'Sale tested', 'Sales & Finance', 10, 'auto', true],
  ['daily_reconciliation_tested', 'Daily reconciliation tested', 'Sales & Finance', 5, 'auto', false],
  ['finance_mappings_complete', 'Finance account mappings complete', 'Sales & Finance', 5, 'auto', false],
  ['xero_status_reviewed', 'Xero status reviewed', 'Sales & Finance', 4, 'manual', false],
  ['compliance_configured', 'Compliance configured', 'Governance', 4, 'auto', false],
  ['nexus_data_available', 'Orbit Nexus data available', 'Intelligence', 5, 'auto', false],
  ['security_review_complete', 'Security review complete', 'Governance', 6, 'manual', false],
  ['pilot_owner_confirmed', 'Pilot owner confirmed', 'Pilot Controls', 4, 'manual', false],
  ['support_contact_confirmed', 'Support contact confirmed', 'Pilot Controls', 4, 'manual', false],
  ['tenant_admin_signoff', 'Customer tenant admin sign-off', 'Pilot Controls', 3, 'manual', false],
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'tenant_admin'].includes(user.role)) {
      return Response.json({ error: 'Forbidden — pilot readiness requires admin/tenant_admin role' }, { status: 403 });
    }

    let payload = {};
    try { payload = await req.json(); } catch (e) {}
    const action = payload.action;
    const requestedTenant = payload.tenant_id;
    const userTenant = user?.data?.tenant_id;
    // tenant_admin may only assess their own tenant; admin may assess any
    const tenantId = requestedTenant || userTenant;
    if (!tenantId) return Response.json({ error: 'tenant_id required' }, { status: 400 });
    if (user.role === 'tenant_admin' && requestedTenant && requestedTenant !== userTenant) {
      return Response.json({ error: 'Forbidden — tenant_admin may only assess their own tenant' }, { status: 403 });
    }

    if (action === 'readiness') {
      const [tenants, companies, outlets, employees, invitations, inventory, suppliers, recipes, batches, sales, reconciliations, mappings, credentials, insights, compliance, shifts, tasks, checklistRecs] = await Promise.all([
        base44.asServiceRole.entities.Tenant.filter({ id: tenantId }).catch(() => []),
        base44.asServiceRole.entities.Company.filter({ tenant_id: tenantId }).catch(() => []),
        base44.asServiceRole.entities.Outlet.filter({ tenant_id: tenantId }).catch(() => []),
        base44.asServiceRole.entities.Employee.filter({ tenant_id: tenantId }).catch(() => []),
        base44.asServiceRole.entities.Invitation.filter({ tenant_id: tenantId, status: { $in: ['active', 'redeemed'] } }).catch(() => []),
        base44.asServiceRole.entities.InventoryItem.filter({ tenant_id: tenantId, status: { $ne: 'inactive' } }, '-created_date', 500).catch(() => []),
        base44.asServiceRole.entities.Supplier.filter({ tenant_id: tenantId }).catch(() => []),
        base44.asServiceRole.entities.Recipe.filter({ tenant_id: tenantId, is_active: true }).catch(() => []),
        base44.asServiceRole.entities.ProductionBatch.filter({ tenant_id: tenantId }).catch(() => []),
        base44.asServiceRole.entities.SalesInvoice.filter({ tenant_id: tenantId }).catch(() => []),
        base44.asServiceRole.entities.DailyReconciliation.filter({ tenant_id: tenantId }).catch(() => []),
        base44.asServiceRole.entities.AccountMapping.filter({ tenant_id: tenantId, is_active: true }).catch(() => []),
        base44.asServiceRole.entities.IntegrationCredential.filter({ tenant_id: tenantId, provider: 'xero' }).catch(() => []),
        base44.asServiceRole.entities.NexusInsight.filter({ tenant_id: tenantId }, '-created_date', 5).catch(() => []),
        base44.asServiceRole.entities.ComplianceRecord.filter({ tenant_id: tenantId }).catch(() => []),
        base44.asServiceRole.entities.Shift.filter({ tenant_id: tenantId }, '-created_date', 10).catch(() => []),
        base44.asServiceRole.entities.Task.filter({ tenant_id: tenantId }, '-created_date', 10).catch(() => []),
        base44.asServiceRole.entities.OnboardingChecklist.filter({ tenant_id: tenantId }).catch(() => []),
      ]);

      const tenant = tenants[0];
      const manual = checklistRecs[0]?.manual_flags || {};
      const hasOpeningStock = inventory.some(i => (i.current_stock || 0) > 0);
      const leaders = employees.filter(e => ['tenant_admin', 'outlet_manager', 'client_manager'].includes(e.role));
      const workers = employees.filter(e => e.role === 'worker' || e.role === 'supervisor');
      const xeroConnected = credentials.some(c => c.status === 'connected' || c.is_connected === true);

      const autoValues = {
        tenant_configured: !!tenant,
        company_configured: companies.length > 0,
        outlet_configured: outlets.length > 0,
        leader_assigned: leaders.length > 0,
        workers_invited: workers.length > 0 || invitations.length > 0,
        attendance_configured: shifts.length > 0 || !!tenant, // shifts created => attendance in use; tenant exists baseline
        scheduling_configured: shifts.length > 0,
        inventory_items_added: inventory.length > 0,
        suppliers_added: suppliers.length > 0,
        recipes_added: recipes.length > 0,
        opening_stock_entered: hasOpeningStock,
        production_tested: batches.length > 0,
        sale_tested: sales.length > 0,
        daily_reconciliation_tested: reconciliations.length > 0,
        finance_mappings_complete: mappings.length > 0,
        xero_status_reviewed: manual.xero_status_reviewed === true || xeroConnected,
        compliance_configured: compliance.length > 0,
        nexus_data_available: insights.length > 0,
        permissions_reviewed: manual.permissions_reviewed === true,
        security_review_complete: manual.security_review_complete === true,
        pilot_owner_confirmed: manual.pilot_owner_confirmed === true,
        support_contact_confirmed: manual.support_contact_confirmed === true,
        tenant_admin_signoff: manual.tenant_admin_signoff === true,
      };

      const items = ITEM_DEFS.map(([key, label, category, weight, source, critical]) => {
        const complete = !!autoValues[key];
        return { key, label, category, weight, source, critical, complete, evidence: source === 'auto' ? evidenceFor(key, { tenant, companies, outlets, leaders, workers, invitations, inventory, suppliers, recipes, batches, sales, reconciliations, mappings, credentials, insights, compliance, shifts, xeroConnected, hasOpeningStock }) : (complete ? 'Manual attestation' : 'Not yet attested') };
      });

      const totalWeight = items.reduce((s, i) => s + i.weight, 0);
      const completedWeight = items.filter(i => i.complete).reduce((s, i) => s + i.weight, 0);
      const readinessPct = totalWeight > 0 ? round2((completedWeight / totalWeight) * 100) : 0;
      const criticalBlockers = items.filter(i => i.critical && !i.complete);
      const incomplete = items.filter(i => !i.complete);

      let recommendation;
      if (criticalBlockers.length > 0 || readinessPct < 60) {
        recommendation = 'Not Ready';
      } else if (readinessPct < 90 || incomplete.some(i => ['pilot_owner_confirmed', 'support_contact_confirmed', 'security_review_complete', 'tenant_admin_signoff'].includes(i.key) && !i.complete)) {
        recommendation = 'Conditionally Ready';
      } else {
        recommendation = 'Ready for Controlled Pilot';
      }

      const externalDeps = [
        { key: 'xero_live', label: 'Xero live connection', status: xeroConnected ? 'connected' : 'pending', blocking: false, note: xeroConnected ? 'Xero credential present' : 'XERO_CLIENT_ID/SECRET unavailable — internal architecture tested, live authorisation pending' },
        { key: 'pilot_history', label: 'Pilot operational history', status: insights.length > 0 ? 'available' : 'pending', blocking: false, note: insights.length > 0 ? 'Operational data recorded' : 'Required before predictive models activate' },
        { key: 'llm_integration', label: 'LLM integration (Nexus synthesis)', status: 'platform-managed', blocking: false, note: 'Deterministic fallback always available' },
      ];

      const result = {
        tenant_id: tenantId,
        tenant_name: tenant?.name || null,
        tenant_status: tenant?.status || 'unknown',
        subscription_plan: tenant?.subscription_plan || null,
        is_pilot_tenant: tenant?.is_pilot_tenant === true,
        readiness_pct: readinessPct,
        total_weight: totalWeight,
        completed_weight: completedWeight,
        recommendation,
        critical_blockers: criticalBlockers.map(b => b.label),
        incomplete_count: incomplete.length,
        items,
        external_dependencies: externalDeps,
        computed_at: new Date().toISOString(),
        rule_version: RULE_VERSION,
        app_version: APP_VERSION,
        deterministic_note: 'Readiness is a deterministic weighted sum of auto-detected and manually-attested items. No estimated or fabricated values.',
      };

      // Cache readiness on the checklist record
      try {
        if (checklistRecs[0]) {
          await base44.asServiceRole.entities.OnboardingChecklist.update(checklistRecs[0].id, { last_computed_readiness_pct: readinessPct, last_computed_at: result.computed_at });
        }
      } catch (e) {}

      return Response.json(result);
    }

    if (action === 'diagnostics') {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Forbidden — diagnostics requires platform admin role' }, { status: 403 });
      }
      const [tenants, usage, queue, insights, credentials, settings] = await Promise.all([
        tenantId ? base44.asServiceRole.entities.Tenant.filter({ id: tenantId }).catch(() => []) : Promise.resolve([]),
        base44.asServiceRole.entities.OrbitUsageTracker.filter({ status: { $in: ['failed', 'ai_disabled', 'insufficient_credits', 'shield_blocked'] } }, '-created_date', 20).catch(() => []),
        base44.asServiceRole.entities.FinanceSyncQueue.filter({ tenant_id: tenantId }, '-created_date', 50).catch(() => []),
        base44.asServiceRole.entities.NexusInsight.filter({ tenant_id: tenantId }, '-created_date', 5).catch(() => []),
        base44.asServiceRole.entities.IntegrationCredential.filter({ tenant_id: tenantId }).catch(() => []),
        base44.asServiceRole.entities.SystemSettings.list().catch(() => []),
      ]);
      const tenant = tenants[0];
      const queueByStatus = {};
      queue.forEach(q => { queueByStatus[q.status] = (queueByStatus[q.status] || 0) + 1; });
      const recentFailures = usage.map(u => ({
        id: u.id, service_key: u.service_key, status: u.status, error_message: u.error_message,
        actor_id: u.actor_id, created_date: u.created_date, latency_ms: u.latency_ms,
        correlation_id: u.id,
      }));
      const connections = credentials.map(c => ({ provider: c.provider, status: c.status || (c.is_connected ? 'connected' : 'disconnected'), last_synced: c.last_synced_at || c.updated_date }));
      const sys = settings[0] || {};
      const result = {
        app_version: APP_VERSION,
        build_version: sys.build_version || APP_VERSION,
        tenant_id: tenantId,
        tenant_name: tenant?.name || null,
        tenant_status: tenant?.status || 'unknown',
        subscription_plan: tenant?.subscription_plan || null,
        is_pilot_tenant: tenant?.is_pilot_tenant === true,
        nexus_ai_enabled: sys.nexus_ai_enabled !== false,
        maintenance_mode: sys.maintenance_mode === true,
        recent_backend_failures: recentFailures,
        recent_failure_count: recentFailures.length,
        finance_queue_health: { total: queue.length, by_status: queueByStatus },
        nexus_insight_status: { recent_count: insights.length, latest_type: insights[0]?.insight_type || null, latest_generated: insights[0]?.generated_at || null, latest_sufficiency: insights[0]?.data_sufficiency },
        connections,
        correlation_note: 'Each failure record id serves as a correlation ID for support triage.',
        generated_at: new Date().toISOString(),
      };
      return Response.json(result);
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[pilotReadiness] fatal:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function evidenceFor(key, ctx) {
  const c = (n) => `${n} record(s)`;
  switch (key) {
    case 'tenant_configured': return ctx.tenant ? 'Tenant exists' : 'No tenant';
    case 'company_configured': return c(ctx.companies.length);
    case 'outlet_configured': return c(ctx.outlets.length);
    case 'leader_assigned': return c(ctx.leaders.length);
    case 'workers_invited': return `${ctx.workers.length} worker(s), ${ctx.invitations.length} invitation(s)`;
    case 'attendance_configured': return c(ctx.shifts.length);
    case 'scheduling_configured': return `${ctx.shifts.length} shift(s)`;
    case 'inventory_items_added': return c(ctx.inventory.length);
    case 'suppliers_added': return c(ctx.suppliers.length);
    case 'recipes_added': return c(ctx.recipes.length);
    case 'opening_stock_entered': return ctx.hasOpeningStock ? 'Items with stock > 0' : 'No opening stock';
    case 'production_tested': return c(ctx.batches.length);
    case 'sale_tested': return c(ctx.sales.length);
    case 'daily_reconciliation_tested': return c(ctx.reconciliations.length);
    case 'finance_mappings_complete': return c(ctx.mappings.length);
    case 'xero_status_reviewed': return ctx.xeroConnected ? 'Xero connected' : 'Manual review flag';
    case 'compliance_configured': return c(ctx.compliance.length);
    case 'nexus_data_available': return c(ctx.insights.length);
    default: return '—';
  }
}