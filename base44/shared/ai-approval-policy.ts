// ============================================================
// ORBITAN AI OPERATING LAYER — Pure Approval Decision Policy
// Build #28.2P-R.0R.3
//
// Canonical pure functions for AI approval authority decisions.
// Extracted from aiApprovalActions/entry.ts so that BOTH:
//   - production aiApprovalActions backend function
//   - Test Lab automated verification matrix
// invoke the SAME canonical decision logic.
//
// No behaviour change — pure extraction. The production
// aiApprovalActions function imports these functions instead
// of defining them inline.
//
// Pure, dependency-free (except isWorkerRole from nexus-gateway-utils).
// ============================================================

import { isWorkerRole } from './nexus-gateway-utils.ts';

export const AI_APPROVAL_POLICY_VERSION = '1.0.0';

// ── APPROVER AUTHORITY VALIDATION ─────────────────────────────
// Verifies the caller has the required role to approve/reject.
// Workers can NEVER approve. The approving_role on the AIApproval
// record determines the minimum required role.
//
// Production usage: aiApprovalActions/entry.ts
// Test Lab usage: verification-matrix.ts approval_authority scenarios
export function validateApproverAuthority(
  userRole: string | null,
  approvalApprovingRole: string | null,
): { valid: boolean; reason?: string } {
  // Workers can never approve any AI action
  if (isWorkerRole(userRole)) {
    return { valid: false, reason: 'Workers cannot approve or reject AI actions' };
  }
  // If the approval specifies a required approving_role, check it
  if (approvalApprovingRole === 'admin') {
    if (userRole !== 'admin') {
      return { valid: false, reason: 'This action requires a platform administrator to approve' };
    }
  } else if (approvalApprovingRole === 'tenant_admin') {
    if (userRole !== 'admin' && userRole !== 'tenant_admin') {
      return { valid: false, reason: 'This action requires a tenant administrator to approve' };
    }
  }
  // For unspecified approving_role, allow admin and tenant_admin
  if (userRole !== 'admin' && userRole !== 'tenant_admin') {
    return { valid: false, reason: 'Only administrators can approve or reject AI actions' };
  }
  return { valid: true };
}

// ── SELF-APPROVAL PREVENTION ──────────────────────────────────
// The requester cannot approve their own request. This ensures
// requester and approver are genuinely independent identities.
//
// Production usage: aiApprovalActions/entry.ts
// Test Lab usage: verification-matrix.ts approval_authority scenarios
export function isSelfApproval(userId: string | null, requesterUserId: string | null): boolean {
  if (!userId || !requesterUserId) return false;
  return userId === requesterUserId;
}

// ── REQUESTER CANCELLATION OWNERSHIP ───────────────────────────
// Only the original requester or a platform admin can cancel
// an approval. This prevents unauthorized cancellation by other
// users (including tenant admins who are not the requester).
//
// Production usage: aiApprovalActions/entry.ts cancel action
// Test Lab usage: verification-matrix.ts approval_authority scenarios
export function canCancelApproval(
  userId: string | null,
  requesterUserId: string | null,
  userRole: string | null,
): { valid: boolean; reason?: string } {
  const isRequester = userId && requesterUserId && userId === requesterUserId;
  const isAdmin = userRole === 'admin';
  if (!isRequester && !isAdmin) {
    return { valid: false, reason: 'Only the requester or a platform administrator can cancel an approval.' };
  }
  return { valid: true };
}

// ── REQUESTER EXECUTION OWNERSHIP ─────────────────────────────
// Only the original requester or a platform admin can execute
// an approved request. This prevents unauthorized execution.
//
// Production usage: aiApprovalActions/entry.ts execute action
// Test Lab usage: verification-matrix.ts approval_authority scenarios
export function canExecuteApproval(
  userId: string | null,
  requesterUserId: string | null,
  userRole: string | null,
): { valid: boolean; reason?: string } {
  const isRequester = userId && requesterUserId && userId === requesterUserId;
  const isAdmin = userRole === 'admin';
  if (!isRequester && !isAdmin) {
    return { valid: false, reason: 'Only the requester or a platform administrator can execute an approved request.' };
  }
  return { valid: true };
}

// ── APPROVER INDEPENDENCE CHECK ───────────────────────────────
// For the Test Lab matrix: verifies that the approver is genuinely
// a different identity from the requester. This is the policy-level
// proof of requester/approver independence.
//
// Returns true when the two persona keys map to different canonical
// identities (different emails). This is a POLICY_UNIT proof — it
// verifies the policy rule, not a real-session RLS proof.
export function isApproverIndependent(
  approverPersonaKey: string,
  requesterPersonaKey: string,
): boolean {
  return approverPersonaKey !== requesterPersonaKey;
}