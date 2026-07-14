import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Public endpoint — no auth required. Query as service role to bypass RLS.
    // Include all pilot tenants (active AND onboarding) so workers can discover
    // workplaces even before the tenant is fully set up.
    // Exclude only internal/test tenants from public discovery.
    const tenants = await base44.asServiceRole.entities.Tenant.filter({});
    const outlets = await base44.asServiceRole.entities.Outlet.filter({});

    // Build a tenant lookup map — exclude sandbox/test tenants from public discovery.
    // Uses the is_sandbox flag (authoritative) with a name-based regex as a safety net
    // for tenants provisioned before the flag was introduced.
    const tenantMap = {};
    const testTenantIds = new Set();
    tenants.forEach(t => {
      const isSandbox = t.is_sandbox === true;
      const isTestName = t.name && /test\s*lab|shadow|internal|demo/i.test(t.name);
      if (isSandbox || isTestName) {
        testTenantIds.add(t.id);
      } else {
        // Include both active and onboarding tenants for pilot discovery
        tenantMap[t.id] = { name: t.name, status: t.status };
      }
    });

    // Group outlets by tenant
    const outletsByTenant = {};
    outlets.forEach(o => {
      if (testTenantIds.has(o.tenant_id)) return;
      if (!outletsByTenant[o.tenant_id]) outletsByTenant[o.tenant_id] = [];
      outletsByTenant[o.tenant_id].push(o);
    });

    const results = [];

    // For each non-test tenant, add its outlets (including virtual for HBB)
    Object.keys(tenantMap).forEach(tenantId => {
      const tenantInfo = tenantMap[tenantId];
      const tenantOutlets = outletsByTenant[tenantId] || [];

      if (tenantOutlets.length > 0) {
        // Tenant has outlets — return each one (including virtual/HBB)
        tenantOutlets.forEach(o => {
          results.push({
            ...o,
            tenant_name: tenantInfo.name,
            tenant_status: tenantInfo.status,
          });
        });
      } else {
        // Tenant has no outlets yet — return a tenant-level entry with "Pending Setup"
        results.push({
          id: tenantId,
          tenant_id: tenantId,
          name: tenantInfo.name,
          tenant_name: tenantInfo.name,
          tenant_status: tenantInfo.status,
          type: 'virtual',
          is_virtual: true,
          status: tenantInfo.status,
          address: null,
          contact_person: null,
          contact_phone: null,
          operating_hours: null,
          is_pending_setup: true,
        });
      }
    });

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});