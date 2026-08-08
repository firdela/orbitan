// ============================================================
// ORBITAN AI OPERATING LAYER — Shared Gateway Utilities
// TypeScript re-export + SDK-dependent functions.
//
// Pure functions are in nexus-gateway-utils.js (importable by
// both Deno and Node.js). This .ts file re-exports them and adds
// the SDK-dependent resolveTenantAdminRecipients function.
// ============================================================

export * from './nexus-gateway-utils.js';

// ── TENANT ADMIN RESOLVER (SDK-dependent — Deno only) ────────
export async function resolveTenantAdminRecipients(base44: any, tenantId: string): Promise<Array<{ user_id: string; full_name: string }>> {
  try {
    const admins = await base44.asServiceRole.entities.Employee.filter({
      tenant_id: tenantId, role: 'tenant_admin', status: 'active',
    });
    return (admins || [])
      .filter((a: any) => a.user_id)
      .map((a: any) => ({ user_id: a.user_id, full_name: a.full_name || 'Administrator' }));
  } catch {
    return [];
  }
}