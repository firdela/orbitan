import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Public endpoint — no auth required. Query as service role to bypass RLS.
    // Only return real physical outlets (exclude virtual/HBB and onboarding tenants)
    const outlets = await base44.asServiceRole.entities.Outlet.filter({ status: 'active', is_virtual: false });
    const tenants = await base44.asServiceRole.entities.Tenant.filter({ status: 'active' });

    // Build a tenant lookup map
    const tenantMap = {};
    tenants.forEach(t => { tenantMap[t.id] = t.name; });

    // Attach tenant name to each outlet
    const results = outlets.map(o => ({
      ...o,
      tenant_name: tenantMap[o.tenant_id] || '',
    }));

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});