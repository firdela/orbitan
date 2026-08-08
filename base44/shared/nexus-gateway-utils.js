// ============================================================
// ORBITAN AI OPERATING LAYER — Shared Gateway Utilities (Pure JS)
//
// Pure JavaScript ESM version — importable by both Deno functions
// AND Node.js test runners. The .ts version re-exports from this
// file and adds SDK-dependent functions.
//
// Common functions used by the Nexus gateway and AI Approval Actions.
// ============================================================

export const WORKER_SAFE_LINK = '/worker';
export const ADMIN_GOVERNANCE_LINK = '/platform/ai-governance';

export function isWorkerRole(role) {
  return role === 'worker';
}

export function resolveSafeLink(userRole, adminLink, workerSafeLink) {
  return isWorkerRole(userRole) ? workerSafeLink : adminLink;
}

// ── CRYPTO HELPER (Web Crypto API, Deno + Node.js compatible) ──
export async function sha256(data) {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── CROSS-TENANT PERMISSION CHECK ──────────────────────────────
export function hasCrossTenantPermission(userRole, userPermissions) {
  if (userRole !== 'admin') return false;
  const perms = userPermissions || [];
  return perms.includes('platform.ai.cross_tenant_operate');
}

// ── TENANT MEMBERSHIP VALIDATION ──────────────────────────────
export function validateTenantMembership(userRole, userTenantId, requestedTenantId, userPermissions) {
  if (userRole === 'admin' && hasCrossTenantPermission(userRole, userPermissions)) {
    return { valid: true, resolvedTenantId: requestedTenantId || userTenantId, is_cross_tenant: true };
  }
  if (userRole === 'admin' && !hasCrossTenantPermission(userRole, userPermissions)) {
    const effectiveTenantId = requestedTenantId || userTenantId;
    if (!effectiveTenantId) {
      return { valid: false, resolvedTenantId: null, reason: 'No tenant context available', is_cross_tenant: false };
    }
    if (requestedTenantId && userTenantId && requestedTenantId !== userTenantId) {
      return { valid: false, resolvedTenantId: null, reason: 'Cross-tenant operation requires explicit platform.ai.cross_tenant_operate permission', is_cross_tenant: false };
    }
    return { valid: true, resolvedTenantId: effectiveTenantId, is_cross_tenant: false };
  }
  const effectiveTenantId = requestedTenantId || userTenantId;
  if (!effectiveTenantId) {
    return { valid: false, resolvedTenantId: null, reason: 'No tenant context available', is_cross_tenant: false };
  }
  if (requestedTenantId && userTenantId && requestedTenantId !== userTenantId) {
    return { valid: false, resolvedTenantId: null, reason: `Tenant mismatch: requester tenant='${userTenantId}', requested tenant='${requestedTenantId}'`, is_cross_tenant: false };
  }
  return { valid: true, resolvedTenantId: effectiveTenantId, is_cross_tenant: false };
}

// ── APPROVAL SCOPE VALIDATION ──────────────────────────────────
export function validateApprovalScope(approval, requestContext) {
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
const VALID_TRANSITIONS = {
  pending: ['approved', 'rejected', 'cancelled', 'expired'],
  approved: ['executing', 'expired'],
  executing: ['executed', 'execution_failed'],
  executed: [],
  execution_failed: [],
  rejected: [],
  cancelled: [],
  expired: [],
};

export function isValidTransition(fromStatus, toStatus) {
  const allowed = VALID_TRANSITIONS[fromStatus];
  if (!allowed) return false;
  return allowed.includes(toStatus);
}

export function isTerminalStatus(status) {
  return ['executed', 'execution_failed', 'rejected', 'cancelled', 'expired'].includes(status);
}