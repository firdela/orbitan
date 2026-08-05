// ============================================================
// ORBITAN AI OPERATING LAYER — Shared Gateway Utilities
//
// Common functions used by the Nexus gateway (base44/functions/nexus)
// and the AI Approval Actions function (base44/functions/aiApprovalActions).
//
// Extracted to prevent logic duplication (Build #28.2P).
// ============================================================

export const WORKER_SAFE_LINK = '/worker';
export const ADMIN_GOVERNANCE_LINK = '/platform/ai-governance';

export function isWorkerRole(role: string | null | undefined): boolean {
  return role === 'worker';
}

export function resolveSafeLink(userRole: string | null, adminLink: string, workerSafeLink: string): string {
  return isWorkerRole(userRole) ? workerSafeLink : adminLink;
}

// ── CRYPTO HELPER (Web Crypto API, Deno-native) ──────────────
export async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── TENANT MEMBERSHIP VALIDATION ──────────────────────────────
// Validates that the requester is authorised for the requested tenant.
// Platform admins can specify any tenant_id.
// All other users must use their own tenant_id.
export function validateTenantMembership(userRole: string | null, userTenantId: string | null, requestedTenantId: string | null): {
  valid: boolean; resolvedTenantId: string | null; reason?: string;
} {
  if (userRole === 'admin') {
    return { valid: true, resolvedTenantId: requestedTenantId || userTenantId };
  }
  const effectiveTenantId = requestedTenantId || userTenantId;
  if (!effectiveTenantId) {
    return { valid: false, resolvedTenantId: null, reason: 'No tenant context available' };
  }
  if (requestedTenantId && userTenantId && requestedTenantId !== userTenantId) {
    return {
      valid: false,
      resolvedTenantId: null,
      reason: `Tenant mismatch: requester tenant='${userTenantId}', requested tenant='${requestedTenantId}'`,
    };
  }
  return { valid: true, resolvedTenantId: effectiveTenantId };
}

// ── TENANT ADMIN RESOLVER ─────────────────────────────────────
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