import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Public endpoint — no auth required. Query as service role to bypass RLS.
    // Only return real physical outlets (exclude virtual/HBB and onboarding tenants)
    const outlets = await base44.asServiceRole.entities.Outlet.filter({ status: 'active', is_virtual: false });
    const tenants = await base44.asServiceRole.entities.Tenant.filter({ status: 'active' });

    // Build a tenant lookup map — exclude test/internal tenants from public discovery
    const tenantMap = {};
    const testTenantIds = new Set();
    tenants.forEach(t => {
      const isTest = t.name && /test\s*lab|shadow|internal|demo/i.test(t.name);
      if (isTest) {
        testTenantIds.add(t.id);
      } else {
        tenantMap[t.id] = t.name;
      }
    });

    // Attach tenant name to each outlet, filtering out test-tenant outlets
    const results = outlets
      .filter(o => !testTenantIds.has(o.tenant_id))
      .map(o => ({
        ...o,
        tenant_name: tenantMap[o.tenant_id] || '',
      }))
      .filter(o => o.tenant_name); // only outlets with a valid (non-test) tenant

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});