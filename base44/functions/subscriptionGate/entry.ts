/**
 * OrbitanOS — Subscription Gate Controller
 * Exit-Ready: Pure business logic — no UI dependencies.
 * 
 * Validates tenant module/pack access server-side.
 * Called by frontend before rendering sensitive modules.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { tenant_id, check_module, check_pack } = body;

    if (!tenant_id) {
      return Response.json({ error: 'tenant_id is required' }, { status: 400 });
    }

    // Fetch tenant record
    const tenants = await base44.asServiceRole.entities.Tenant.filter({ id: tenant_id });
    const tenant = tenants?.[0];

    if (!tenant) {
      return Response.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const plan = tenant.subscription_plan || 'orbitan_starter';

    // SHADOW MODE: Try SubscriptionPolicy entity first, fallback to hardcoded constants
    // This enables zero-downtime migration to entity-driven subscription management
    const policies = await base44.asServiceRole.entities.SubscriptionPolicy.filter({
      plan_key: plan,
      is_active: true
    });

    const policy = policies[0] || null;

    // Hardcoded fallback for backward compatibility during migration
    const PLAN_HIERARCHY = {
      orbitan_starter: 1,
      orbitan_growth: 2,
      orbitan_business: 3,
      orbitan_enterprise: 4,
    };

    const PLAN_MODULE_ACCESS = {
      orbitan_starter:    ['workforce', 'scheduling', 'tasks', 'clock'],
      orbitan_growth:     ['workforce', 'scheduling', 'tasks', 'clock', 'inventory', 'procurement', 'compliance', 'reporting'],
      orbitan_business:   ['workforce', 'scheduling', 'tasks', 'clock', 'inventory', 'procurement', 'compliance', 'reporting', 'sales_invoice', 'finance_xero', 'ai_suite', 'customer_management'],
      orbitan_enterprise: ['*'],
    };

    const PLAN_PACK_ACCESS = {
      orbitan_starter:    ['core'],
      orbitan_growth:     ['core', 'fnb', 'retail', 'recycling'],
      orbitan_business:   ['core', 'fnb', 'retail', 'recycling', 'healthcare', 'education', 'logistics'],
      orbitan_enterprise: ['*'],
    };

    // Use policy if exists, otherwise use hardcoded constants
    const planTier = policy?.tier || PLAN_HIERARCHY[plan] || 1;
    const planModules = policy?.allowed_modules || PLAN_MODULE_ACCESS[plan] || [];
    const planPacks = policy?.allowed_packs || PLAN_PACK_ACCESS[plan] || [];
    const limits = policy?.limits || null;
    const features = policy?.features || null;

    // Check module access
    let module_access = null;
    if (check_module) {
      const planAllows = planModules.includes('*') || planModules.includes(check_module);
      const tenantAllows = !tenant.enabled_modules?.length || tenant.enabled_modules.includes(check_module);
      module_access = planAllows && tenantAllows;
    }

    // Check pack access
    let pack_access = null;
    if (check_pack) {
      const planAllows = planPacks.includes('*') || planPacks.includes(check_pack);
      const tenantAllows = !tenant.enabled_packs?.length || tenant.enabled_packs.includes(check_pack);
      pack_access = planAllows && tenantAllows;
    }

    // Determine employee limit: policy > tenant override > hardcoded fallback
    const hardcodedLimits = { orbitan_starter: 10, orbitan_growth: 50, orbitan_business: 250, orbitan_enterprise: null };
    const employee_limit = limits?.max_employees ?? tenant.max_employees ?? hardcodedLimits[plan] ?? null;

    return Response.json({
      tenant_id,
      plan,
      plan_name: policy?.plan_name || null,
      plan_tier: planTier,
      is_enterprise: plan === 'orbitan_enterprise',
      enabled_modules: tenant.enabled_modules || [],
      enabled_packs: tenant.enabled_packs || [],
      module_access,
      pack_access,
      employee_limit,
      outlet_limit: limits?.max_outlets ?? null,
      brand_limit: limits?.max_brands ?? null,
      monthly_credit_quota: limits?.monthly_credit_quota ?? null,
      features: features || null,
      policy_source: policy ? 'SubscriptionPolicy_entity' : 'hardcoded_fallback',
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});