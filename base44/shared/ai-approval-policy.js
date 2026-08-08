// ============================================================
// ORBITAN AI OPERATING LAYER — Pure Approval Decision Policy (JS)
//
// Pure JavaScript ESM version — importable by both Deno functions
// AND Node.js test runners. The .ts version re-exports from this file.
//
// Canonical pure functions for AI approval authority decisions.
// Used by BOTH production aiApprovalActions AND Test Lab matrix.
// ============================================================

import { isWorkerRole } from './nexus-gateway-utils.js';

export const AI_APPROVAL_POLICY_VERSION = '1.0.0';

export function validateApproverAuthority(userRole, approvalApprovingRole) {
  if (isWorkerRole(userRole)) {
    return { valid: false, reason: 'Workers cannot approve or reject AI actions' };
  }
  if (approvalApprovingRole === 'admin') {
    if (userRole !== 'admin') {
      return { valid: false, reason: 'This action requires a platform administrator to approve' };
    }
  } else if (approvalApprovingRole === 'tenant_admin') {
    if (userRole !== 'admin' && userRole !== 'tenant_admin') {
      return { valid: false, reason: 'This action requires a tenant administrator to approve' };
    }
  }
  if (userRole !== 'admin' && userRole !== 'tenant_admin') {
    return { valid: false, reason: 'Only administrators can approve or reject AI actions' };
  }
  return { valid: true };
}

export function isSelfApproval(userId, requesterUserId) {
  if (!userId || !requesterUserId) return false;
  return userId === requesterUserId;
}

export function canCancelApproval(userId, requesterUserId, userRole) {
  const isRequester = userId && requesterUserId && userId === requesterUserId;
  const isAdmin = userRole === 'admin';
  if (!isRequester && !isAdmin) {
    return { valid: false, reason: 'Only the requester or a platform administrator can cancel an approval.' };
  }
  return { valid: true };
}

export function canExecuteApproval(userId, requesterUserId, userRole) {
  const isRequester = userId && requesterUserId && userId === requesterUserId;
  const isAdmin = userRole === 'admin';
  if (!isRequester && !isAdmin) {
    return { valid: false, reason: 'Only the requester or a platform administrator can execute an approved request.' };
  }
  return { valid: true };
}

export function isApproverIndependent(approverPersonaKey, requesterPersonaKey) {
  return approverPersonaKey !== requesterPersonaKey;
}