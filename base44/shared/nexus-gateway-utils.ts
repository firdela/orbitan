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

// ── CROSS-TENANT PERMISSION CHECK ──────────────────────────────
// Platform admins must have an explicit cross-tenant permission rather than
// broad role-only authority. This prevents a normal admin label from silently
// providing unlimited cross-tenant AI execution (Build #28.2P, Section 12).
export function hasCrossTenantPermission(
  userRole: string | null,
  userPermissions: string[] | null | undefined,
): boolean {
  if (userRole !== 'admin') return false;
  const perms = userPermissions || [];
  return perms.includes('platform.ai.cross_tenant_operate');
}

// ── TENANT MEMBERSHIP VALIDATION ──────────────────────────────
// Validates that the requester is authorised for the requested tenant.
// Platform admins with explicit cross-tenant permission can specify any tenant_id.
// All other users must use their own tenant_id.
export function validateTenantMembership(
  userRole: string | null,
  userTenantId: string | null,
  requestedTenantId: string | null,
  userPermissions: string[] | null | undefined = null,
): {
  valid: boolean; resolvedTenantId: string | null; reason?: string; is_cross_tenant: boolean;
} {
  // Platform admin with explicit cross-tenant permission
  if (userRole === 'admin' && hasCrossTenantPermission(userRole, userPermissions)) {
    return { valid: true, resolvedTenantId: requestedTenantId || userTenantId, is_cross_tenant: true };
  }
  // Platform admin WITHOUT cross-tenant permission: can only operate within own tenant
  if (userRole === 'admin' && !hasCrossTenantPermission(userRole, userPermissions)) {
    const effectiveTenantId = requestedTenantId || userTenantId;
    if (!effectiveTenantId) {
      return { valid: false, resolvedTenantId: null, reason: 'No tenant context available', is_cross_tenant: false };
    }
    // If admin requests a different tenant without permission, deny
    if (requestedTenantId && userTenantId && requestedTenantId !== userTenantId) {
      return {
        valid: false, resolvedTenantId: null,
        reason: 'Cross-tenant operation requires explicit platform.ai.cross_tenant_operate permission',
        is_cross_tenant: false,
      };
    }
    return { valid: true, resolvedTenantId: effectiveTenantId, is_cross_tenant: false };
  }
  const effectiveTenantId = requestedTenantId || userTenantId;
  if (!effectiveTenantId) {
    return { valid: false, resolvedTenantId: null, reason: 'No tenant context available', is_cross_tenant: false };
  }
  if (requestedTenantId && userTenantId && requestedTenantId !== userTenantId) {
    return {
      valid: false, resolvedTenantId: null,
      reason: `Tenant mismatch: requester tenant='${userTenantId}', requested tenant='${requestedTenantId}'`,
      is_cross_tenant: false,
    };
  }
  return { valid: true, resolvedTenantId: effectiveTenantId, is_cross_tenant: false };
}

// ── APPROVAL SCOPE VALIDATION ──────────────────────────────────
// Verifies that a post-approval execution request exactly matches the approved
// scope. Prevents scope drift between approval and execution (Build #28.2P, Section 3).
export function validateApprovalScope(approval: any, requestContext: {
  serviceKey: string; modelKey: string; autonomyLevel: string;
  dataClassification: string; tools?: string[];
}): { valid: boolean; reason?: string } {
  if (!approval) return { valid: false, reason: 'No approval record provided' };

  if (approval.service_key !== requestContext.serviceKey) {
    return { valid: false, reason: `Service key mismatch: approved='${approval.service_key}', requested='${requestContext.serviceKey}'` };
  }
  if (approval.model_key && approval.model_key !== requestContext.modelKey) {
    return { valid: false, reason: `Model key mismatch: approved='${approval.model_key}', requested='${requestContext.modelKey}'` };
  }
  if (approval.autonomy_level && approval.autonomy_level !== requestContext.autonomyLevel) {
    return { valid: false, reason: `Autonomy level mismatch: approved='${approval.autonomy_level}', requested='${requestContext.autonomyLevel}'` };
  }
  if (approval.data_classification && approval.data_classification !== requestContext.dataClassification) {
    return { valid: false, reason: `Data classification mismatch: approved='${approval.data_classification}', requested='${requestContext.dataClassification}'` };
  }
  if (approval.tools && approval.tools.length > 0 && requestContext.tools) {
    const approvedTools = new Set(approval.tools);
    for (const tool of requestContext.tools) {
      if (!approvedTools.has(tool)) {
        return { valid: false, reason: `Tool '${tool}' was not in the approved scope` };
      }
    }
  }
  return { valid: true };
}

// ── VALID APPROVAL TRANSITIONS ──────────────────────────────────
// Enforces the canonical AIApproval lifecycle. No invalid reverse transition
// may occur (Build #28.2P, Section 2).
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['approved', 'rejected', 'cancelled', 'expired'],
  approved: ['executing', 'expired'],
  executing: ['executed', 'execution_failed'],
  executed: [],          // terminal — no further transitions
  execution_failed: [],  // terminal — requires a new request
  rejected: [],          // terminal
  cancelled: [],         // terminal
  expired: [],           // terminal
};

export function isValidTransition(fromStatus: string, toStatus: string): boolean {
  const allowed = VALID_TRANSITIONS[fromStatus];
  if (!allowed) return false;
  return allowed.includes(toStatus);
}

export function isTerminalStatus(status: string): boolean {
  return ['executed', 'execution_failed', 'rejected', 'cancelled', 'expired'].includes(status);
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