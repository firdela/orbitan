// Pilot Administration — governed pilot tenant lifecycle (Build Package #16, Part 1).
// Platform-admin only. All operations use asServiceRole (cross-tenant) + AuditLog.
// Lifecycle: create → activate → suspend → extend → convert → archive → delete (sandbox only).
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — platform admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const action = body.action;
    const E = base44.asServiceRole.entities;

    const audit = (tenantId, actionType, target, targetId, details, prev, next) =>
      E.AuditLog.create({
        tenant_id: tenantId || 'platform', actor_id: user.id,
        actor_name: user.full_name || user.email, actor_role: user.role,
        action_type: actionType, module: 'system',
        target_entity: target, target_record_id: targetId || '',
        details, previous_state: prev || null, new_state: next || null,
      }).catch(() => null);

    // ── LIST pilot + sandbox tenants ──────────────────────────────────────
    if (action === 'list') {
      const [pilots, sandboxes] = await Promise.all([
        E.Tenant.filter({ is_pilot_tenant: true }, '-created_date', 200),
        E.Tenant.filter({ is_sandbox: true }, '-created_date', 200),
      ]);
      const seen = new Set();
      const merged = [...pilots, ...sandboxes].filter(t => { if (seen.has(t.id)) return false; seen.add(t.id); return true; });
      return Response.json({ tenants: merged.map(t => ({
        id: t.id, name: t.name, status: t.status, plan: t.subscription_plan, industry: t.industry,
        is_pilot_tenant: !!t.is_pilot_tenant, is_sandbox: !!t.is_sandbox,
        onboarding_completed: !!t.onboarding_completed, trial_ends_date: t.trial_ends_date || null,
        created_date: t.created_date, contact_email: t.contact_email, contact_name: t.contact_name,
        currency: t.currency, governance_domain: t.governance_domain,
      })) });
    }

    // ── CREATE pilot tenant ──────────────────────────────────────────────
    if (action === 'create') {
      const { name, industry, subscription_plan, pilot_days, is_sandbox, contact_email, contact_name, manifest_key, enabled_packs, governance_domain } = body;
      if (!name || !industry) return Response.json({ error: 'name and industry are required' }, { status: 400 });
      const days = Math.max(1, Math.min(365, Number(pilot_days) || 30));
      const end = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
      const tenant = await E.Tenant.create({
        name, industry, subscription_plan: subscription_plan || 'orbitan_growth',
        status: 'trial', is_pilot_tenant: true, is_sandbox: !!is_sandbox,
        trial_ends_date: end, onboarding_completed: false,
        contact_email: contact_email || '', contact_name: contact_name || '',
        manifest_key: manifest_key || 'core_ops_v1', enabled_packs: enabled_packs || ['fnb'],
        governance_domain: governance_domain || 'fnb_standard_ops', currency: 'SGD', country: 'Singapore',
      });
      await audit(tenant.id, 'pilot_tenant_created', 'Tenant', tenant.id,
        `Pilot tenant "${name}" created — ${days}-day pilot, ends ${end}, sandbox=${!!is_sandbox}`,
        null, { id: tenant.id, name, status: 'trial', trial_ends_date: end });
      return Response.json({ success: true, tenant: { id: tenant.id, name: tenant.name, trial_ends_date: tenant.trial_ends_date } });
    }

    // ── State-change actions (require tenant_id) ─────────────────────────
    const tenantId = body.tenant_id;
    if (!tenantId) return Response.json({ error: 'tenant_id is required' }, { status: 400 });
    const tenant = await E.Tenant.get(tenantId).catch(() => null);
    if (!tenant) return Response.json({ error: 'Tenant not found' }, { status: 404 });
    const prev = { id: tenant.id, name: tenant.name, status: tenant.status, is_pilot_tenant: tenant.is_pilot_tenant, subscription_plan: tenant.subscription_plan, trial_ends_date: tenant.trial_ends_date };

    if (action === 'activate') {
      await E.Tenant.update(tenantId, { status: 'active' });
      const next = { ...prev, status: 'active' };
      await audit(tenantId, 'pilot_activated', 'Tenant', tenantId, `Pilot "${tenant.name}" activated`, prev, next);
      return Response.json({ success: true, tenant: next });
    }

    if (action === 'suspend') {
      await E.Tenant.update(tenantId, { status: 'suspended' });
      const next = { ...prev, status: 'suspended' };
      await audit(tenantId, 'pilot_suspended', 'Tenant', tenantId, `Pilot "${tenant.name}" suspended`, prev, next);
      return Response.json({ success: true, tenant: next });
    }

    if (action === 'extend') {
      const extra = Math.max(1, Math.min(365, Number(body.days) || 30));
      const baseDate = tenant.trial_ends_date ? new Date(tenant.trial_ends_date) : new Date();
      const newEnd = new Date(baseDate.getTime() + extra * 86400000).toISOString().slice(0, 10);
      await E.Tenant.update(tenantId, { trial_ends_date: newEnd });
      const next = { ...prev, trial_ends_date: newEnd };
      await audit(tenantId, 'pilot_extended', 'Tenant', tenantId, `Pilot "${tenant.name}" extended by ${extra} days → ${newEnd}`, prev, next);
      return Response.json({ success: true, tenant: next });
    }

    if (action === 'convert') {
      const plan = body.subscription_plan || tenant.subscription_plan || 'orbitan_growth';
      await E.Tenant.update(tenantId, { is_pilot_tenant: false, status: 'active', subscription_plan: plan });
      const next = { ...prev, is_pilot_tenant: false, status: 'active', subscription_plan: plan };
      await audit(tenantId, 'pilot_converted_to_paid', 'Tenant', tenantId, `Pilot "${tenant.name}" converted to paid subscription (${plan})`, prev, next);
      return Response.json({ success: true, tenant: next });
    }

    if (action === 'archive') {
      await E.Tenant.update(tenantId, { status: 'cancelled', is_pilot_tenant: false });
      const next = { ...prev, status: 'cancelled', is_pilot_tenant: false };
      await audit(tenantId, 'pilot_archived', 'Tenant', tenantId, `Pilot "${tenant.name}" archived`, prev, next);
      return Response.json({ success: true, tenant: next });
    }

    if (action === 'delete_sandbox') {
      if (!tenant.is_sandbox) return Response.json({ error: 'Only sandbox tenants can be hard-deleted. Use archive for production tenants.' }, { status: 400 });
      await E.Tenant.delete(tenantId);
      await audit(tenantId, 'sandbox_tenant_deleted', 'Tenant', tenantId, `Sandbox tenant "${tenant.name}" permanently deleted`, prev, null);
      return Response.json({ success: true, deleted: tenantId });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});