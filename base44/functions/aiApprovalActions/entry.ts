import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { DECISIONS, PROVENANCE_STATES } from '../../shared/ai-governance.ts';
import {
  isWorkerRole, sha256, validateTenantMembership,
  validateApprovalScope, isValidTransition, isTerminalStatus,
  WORKER_SAFE_LINK, ADMIN_GOVERNANCE_LINK,
} from '../../shared/nexus-gateway-utils.ts';
import {
  validateApproverAuthority, isSelfApproval,
  canCancelApproval, canExecuteApproval,
} from '../../shared/ai-approval-policy.ts';

// ============================================================
// ORBITAN AI OPERATING LAYER — Secure Approval Actions (Build #28.2P)
//
// The browser MUST NOT be the authority that approves or rejects
// an AI action. This function is the canonical server-side
// authority for all AI approval decisions.
//
// Actions:
//   approve — transition pending → approved
//   reject  — transition pending → rejected
//   cancel  — transition pending → cancelled (requester or admin only)
//
// Each action:
//   1.  Authenticates the caller server-side
//   2.  Resolves authoritative tenant membership
//   3.  Loads the AIApproval by ID
//   4.  Verifies tenant scope
//   5.  Verifies status is pending
//   6.  Verifies not expired
//   7.  Verifies caller has required approving role
//   8.  Prevents requester self-approval
//   9.  Prevents Workers from approving
//   10. Sets approver identity server-side
//   11. Transitions atomically (read-validate-write-verify)
//   12. Writes an AIAuditEvent for the decision
//   13. Updates the related Orbit Inbox item
//   14. Notifies the requester through a role-safe destination
//   15. Returns a structured safe response
//
// Created by Muhammad Firdaus Bin Ismail
// © 2024–2026 Orbitan & OrbitanOS. All Rights Reserved.
// ============================================================

function safeJson(errorCode: string, status: number, message: string, extra: Record<string, any> = {}): Response {
  return Response.json({ success: false, safe_error_code: errorCode, error: message, ...extra }, { status });
}

// ── APPROVER AUTHORITY + SELF-APPROVAL ────────────────────────
// Build #28.2P-R.0R.3: These functions are now imported from
// base44/shared/ai-approval-policy.ts — the canonical source
// shared with the Test Lab verification matrix. No behaviour change.

// ── ORBIT INBOX UPDATE HELPER ──────────────────────────────────
async function updateInboxForApprovalDecision(
  base44: any,
  approvalId: string,
  tenantId: string,
  decision: 'approved' | 'rejected' | 'cancelled',
  decisionReason: string,
): Promise<void> {
  try {
    // Find the original approval-required inbox item
    const inboxItems = await base44.asServiceRole.entities.OrbitInbox.filter({
      source_entity: 'AIApproval',
      source_id: approvalId,
      event_type: 'ai_approval_required',
      action_state: 'pending',
    });
    for (const item of inboxItems || []) {
      await base44.asServiceRole.entities.OrbitInbox.update(item.id, {
        action_state: 'completed',
        archived_at: new Date().toISOString(),
        title: `AI Approval ${decision === 'approved' ? 'Granted' : decision === 'rejected' ? 'Rejected' : 'Cancelled'}`,
        body: decision === 'approved'
          ? 'The AI request has been approved and can now be executed.'
          : decision === 'rejected'
            ? `The AI request was rejected. Reason: ${decisionReason}`
            : 'The AI request was cancelled.',
      });
    }
  } catch (err) {
    console.log(`[aiApprovalActions] Orbit Inbox update failed: ${err.message}`);
  }
}

// ── REQUESTER NOTIFICATION ────────────────────────────────────
async function notifyRequesterOfDecision(
  base44: any,
  params: {
    tenant_id: string; outlet_id: string | null;
    requester_user_id: string; requester_name: string | null; requester_role: string | null;
    approval_id: string; service_key: string;
    decision: 'approved' | 'rejected' | 'cancelled';
    decision_reason: string; approver_name: string;
  },
): Promise<void> {
  try {
    const isWorker = isWorkerRole(params.requester_role);
    const title = `AI Request ${params.decision === 'approved' ? 'Approved' : params.decision === 'rejected' ? 'Rejected' : 'Cancelled'}`;
    const body = isWorker
      ? params.decision === 'approved'
        ? 'Your AI request has been approved. You can now proceed.'
        : params.decision === 'rejected'
          ? `Your AI request was not approved. Please contact your manager if you have questions.`
          : 'Your AI request has been cancelled.'
      : params.decision === 'approved'
        ? `Your AI request '${params.service_key}' has been approved by ${params.approver_name}. You can now execute it.`
        : params.decision === 'rejected'
          ? `Your AI request '${params.service_key}' was rejected by ${params.approver_name}. Reason: ${params.decision_reason}`
          : `Your AI request '${params.service_key}' has been cancelled.`;

    await base44.asServiceRole.entities.OrbitInbox.create({
      tenant_id: params.tenant_id,
      outlet_id: params.outlet_id,
      recipient_user_id: params.requester_user_id,
      recipient_name: params.requester_name,
      category: 'approval',
      event_type: `ai_approval_${params.decision}`,
      title,
      body,
      priority: params.decision === 'approved' ? 'normal' : 'important',
      is_actionable: false,
      action_type: 'none',
      action_state: 'completed',
      source_entity: 'AIApproval',
      source_id: params.approval_id,
      link: isWorker ? WORKER_SAFE_LINK : ADMIN_GOVERNANCE_LINK,
      metadata: { service_key: params.service_key, decision: params.decision },
      channels_delivered: ['in_app'],
    });
  } catch (err) {
    console.log(`[aiApprovalActions] Requester notification failed: ${err.message}`);
  }
}

// ── AUDIT EVENT FOR APPROVAL DECISION ─────────────────────────
// Section 8: Approval and rejection are governance decisions and require
// durable evidence. This function does NOT swallow errors — it throws on
// failure so the caller can fail-closed (prevent the transition without evidence).
async function createApprovalDecisionAudit(
  base44: any,
  params: {
    tenant_id: string; outlet_id: string | null;
    approval_id: string; approval_key: string; request_id: string;
    service_key: string; capability_tier: number;
    requester_user_id: string; requester_name: string | null; requester_role: string;
    approver_user_id: string; approver_name: string; approver_role: string;
    decision: 'approved' | 'rejected' | 'cancelled';
    decision_reason: string;
    model_key: string; provider: string; autonomy_level: string;
    data_classification: string;
    policy_key: string | null;
  },
): Promise<string> {
  // Section 9: Decision actor fields — accurately distinguish original requester
  // from approving actor. The approver is the actor for this audit event, but
  // the original requester is preserved in canonical metadata fields.
  const auditRecord = await base44.asServiceRole.entities.AIAuditEvent.create({
    tenant_id: params.tenant_id,
    outlet_id: params.outlet_id,
    request_id: `approval_decision_${params.request_id}`,
    idempotency_key: null,
    idempotency_fingerprint: await sha256(`approval_decision:${params.approval_id}:${params.decision}`),
    execution_state: params.decision === 'approved' ? 'succeeded' : 'denied',
    service_key: params.service_key,
    capability_tier: params.capability_tier,
    requesting_user_id: params.approver_user_id,
    requesting_user_name: params.approver_name,
    requesting_user_role: params.approver_role,
    executing_agent_id: null,
    provider: params.provider,
    model_key: params.model_key,
    model_version: null,
    routing_decision: 'approval_decision',
    policy_decision: params.decision === 'approved' ? DECISIONS.ALLOW : DECISIONS.DENY,
    policy_reason: `Approval ${params.decision}: ${params.decision_reason}`,
    policy_keys_evaluated: params.policy_key ? [params.policy_key] : [],
    autonomy_level: params.autonomy_level,
    data_classification: params.data_classification,
    tools_invoked: [],
    integrations_invoked: [],
    approval_reference_id: params.approval_id,
    runtime_ms: 0,
    credits_consumed: 0,
    estimated_cost_sgd: null,
    validation_result: 'passed',
    provenance_state: params.decision === 'approved' ? PROVENANCE_STATES.executed_after_approval : PROVENANCE_STATES.ai_generated,
    outcome: params.decision === 'approved' ? 'success' : 'denied',
    error_message: params.decision === 'approved' ? null : `Request rejected: ${params.decision_reason}`,
    error_classification: params.decision === 'approved' ? null : 'policy_denied',
    fallback_used: false,
    metadata: {
      approval_key: params.approval_key,
      approval_decision: params.decision,
      // Section 9: Canonical decision actor fields
      decision_actor_user_id: params.approver_user_id,
      decision_actor_name: params.approver_name,
      decision_actor_role: params.approver_role,
      original_requester_user_id: params.requester_user_id,
      original_requester_name: params.requester_name,
      original_requester_role: params.requester_role,
      decision_reason: params.decision_reason,
      is_approval_decision_audit: true,
    },
  });
  return auditRecord?.id || '';
}

// ============================================================
// MAIN HANDLER
// ============================================================
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return safeJson('unauthorized', 401, 'You must be signed in to perform this action.');
    }

    const body = await req.json();
    const { action, approval_id, decision_reason, tenant_id } = body;

    // Validate action
    if (!['approve', 'reject', 'cancel', 'execute'].includes(action)) {
      return safeJson('invalid_request', 400, 'Invalid action. Must be: approve, reject, cancel, or execute.');
    }
    if (!approval_id) {
      return safeJson('invalid_request', 400, 'approval_id is required.');
    }

    // Validate tenant membership (with explicit cross-tenant permission check)
    const userPermissions = (user.data?.permissions || []) as string[];
    const tenantCheck = validateTenantMembership(user.role, user.data?.tenant_id, tenant_id || null, userPermissions);
    if (!tenantCheck.valid) {
      return safeJson('forbidden', 403, 'Tenant context validation failed.');
    }
    const resolvedTenantId = tenantCheck.resolvedTenantId;

    // Load the AIApproval record
    let approval: any = null;
    try {
      approval = await base44.asServiceRole.entities.AIApproval.get(approval_id);
    } catch {
      return safeJson('not_found', 404, 'Approval record not found.');
    }
    if (!approval) {
      return safeJson('not_found', 404, 'Approval record not found.');
    }

    // Verify tenant scope — cross-tenant access is forbidden
    if (approval.tenant_id !== resolvedTenantId) {
      return safeJson('forbidden', 403, 'Approval tenant scope mismatch.');
    }

    // Verify status — approve/reject/cancel require 'pending'; execute requires 'approved'
    if (action !== 'execute' && approval.status !== 'pending') {
      return safeJson('invalid_request', 409, `Approval status is '${approval.status}', expected 'pending'.`, {
        current_status: approval.status,
      });
    }

    // Verify not expired (atomic conditional transition)
    if (approval.expires_at && new Date(approval.expires_at) < new Date()) {
      try {
        await base44.asServiceRole.entities.AIApproval.updateMany(
          { id: approval_id, tenant_id: resolvedTenantId, status: 'pending' },
          { $set: { status: 'expired' } }
        );
      } catch { /* best-effort */ }
      return safeJson('forbidden', 403, 'This approval has expired and can no longer be decided.', {
        expired_at: approval.expires_at,
      });
    }

    // ── CANCEL: requester or admin only ──────────────────────
    if (action === 'cancel') {
      const cancelCheck = canCancelApproval(user.id, approval.requester_user_id, user.role);
      if (!cancelCheck.valid) {
        return safeJson('forbidden', 403, cancelCheck.reason || 'Cannot cancel approval.');
      }

      if (!isValidTransition(approval.status, 'cancelled')) {
        return safeJson('invalid_request', 409, `Cannot cancel approval with status '${approval.status}'.`, {
          current_status: approval.status,
        });
      }

      // Mandatory audit (fail-closed) — Section 8: cannot swallow audit failure
      let cancelAuditId: string = '';
      try {
        cancelAuditId = await createApprovalDecisionAudit(base44, {
          tenant_id: resolvedTenantId, outlet_id: approval.outlet_id,
          approval_id: approval.id, approval_key: approval.approval_key, request_id: approval.request_id,
          service_key: approval.service_key, capability_tier: approval.capability_tier,
          requester_user_id: approval.requester_user_id, requester_name: approval.requester_name, requester_role: approval.requester_role,
          approver_user_id: user.id, approver_name: user.full_name, approver_role: user.role,
          decision: 'cancelled', decision_reason: decision_reason || 'Cancelled by user.',
          model_key: approval.model_key, provider: approval.provider, autonomy_level: approval.autonomy_level,
          data_classification: approval.data_classification, policy_key: approval.policy_key,
        });
      } catch (auditErr) {
        console.log(`[aiApprovalActions] FAIL-CLOSED: Cancel audit creation failed: ${auditErr.message}`);
      }

      if (!cancelAuditId) {
        return safeJson('audit_failure', 500, 'Cannot cancel approval — audit evidence creation failed. The approval has not been changed.', {
          approval_id: approval.id,
        });
      }

      // Atomic transition using updateMany with status condition
      try {
        await base44.asServiceRole.entities.AIApproval.updateMany(
          { id: approval_id, tenant_id: resolvedTenantId, status: 'pending' },
          { $set: {
            status: 'cancelled',
            approver_user_id: user.id,
            approver_name: user.full_name,
            decision_reason: decision_reason || 'Cancelled by user.',
            decided_at: new Date().toISOString(),
          }}
        );
      } catch (err) {
        return safeJson('internal_error', 500, 'Failed to cancel approval.');
      }

      await updateInboxForApprovalDecision(base44, approval.id, resolvedTenantId, 'cancelled', decision_reason || 'Cancelled by user.').catch(() => {});

      await notifyRequesterOfDecision(base44, {
        tenant_id: resolvedTenantId, outlet_id: approval.outlet_id,
        requester_user_id: approval.requester_user_id, requester_name: approval.requester_name, requester_role: approval.requester_role,
        approval_id: approval.id, service_key: approval.service_key,
        decision: 'cancelled', decision_reason: decision_reason || 'Cancelled by user.', approver_name: user.full_name,
      }).catch(() => {});

      return Response.json({
        success: true,
        approval_id: approval.id,
        status: 'cancelled',
        audit_event_id: cancelAuditId,
        message: 'Approval has been cancelled.',
      });
    }

    // ── EXECUTE: dispatch approved request through canonical gateway ─
    if (action === 'execute') {
      // Only the requester or an admin can execute an approved request
      const execCheck = canExecuteApproval(user.id, approval.requester_user_id, user.role);
      if (!execCheck.valid) {
        return safeJson('forbidden', 403, execCheck.reason || 'Cannot execute approval.');
      }

      // Verify status is approved (not pending, not already executed, etc.)
      if (!isValidTransition(approval.status, 'executing')) {
        return safeJson('invalid_request', 409, `Cannot execute approval with status '${approval.status}'. Only 'approved' approvals can be executed.`, {
          current_status: approval.status,
        });
      }

      // Verify not expired
      if (approval.expires_at && new Date(approval.expires_at) < new Date()) {
        try {
          await base44.asServiceRole.entities.AIApproval.updateMany(
            { id: approval_id, tenant_id: resolvedTenantId, status: 'approved' },
            { $set: { status: 'expired' } }
          );
        } catch { /* best-effort */ }
        return safeJson('forbidden', 403, 'This approval has expired and can no longer be executed.', {
          expired_at: approval.expires_at,
        });
      }

      // ── ATOMIC TRANSITION: approved → executing ──────────
      // Uses updateMany with status condition — only one concurrent execution can succeed.
      const transitionResult = await base44.asServiceRole.entities.AIApproval.updateMany(
        { id: approval_id, tenant_id: resolvedTenantId, status: 'approved' },
        { $set: {
          status: 'executing',
          approver_user_id: user.id,
          approver_name: user.full_name,
          decided_at: new Date().toISOString(),
        }}
      ).catch(() => null);

      // Re-read to verify the transition succeeded
      let executingApproval: any = null;
      try {
        executingApproval = await base44.asServiceRole.entities.AIApproval.get(approval_id);
      } catch { /* */ }

      if (!executingApproval || executingApproval.status !== 'executing' || executingApproval.approver_user_id !== user.id) {
        return safeJson('invalid_request', 409, `Approval transition to 'executing' failed — it may have been executed by another caller or expired.`, {
          current_status: executingApproval?.status || 'unknown',
        });
      }

      // Dispatch through the canonical Nexus gateway with approval_key
      try {
        const nexusResponse = await base44.functions.invoke('nexus', {
          service_key: approval.service_key,
          payload: body.payload || {},
          tenant_id: resolvedTenantId,
          outlet_id: approval.outlet_id,
          agent_id: approval.executing_agent_id || null,
          data_classification: approval.data_classification,
          requested_autonomy: approval.autonomy_level,
          approval_key: approval.approval_key,
        });

        const nexusData = nexusResponse.data || nexusResponse;

        // The nexus gateway already transitions executing → executed/execution_failed
        // But as a fallback, ensure the transition happened
        let finalApproval: any = null;
        try {
          finalApproval = await base44.asServiceRole.entities.AIApproval.get(approval_id);
        } catch { /* */ }

        if (finalApproval && finalApproval.status === 'executing') {
          // Gateway didn't transition — do it ourselves as fallback
          const execStatus = nexusData?.success ? 'executed' : 'execution_failed';
          await base44.asServiceRole.entities.AIApproval.updateMany(
            { id: approval_id, status: 'executing' },
            { $set: {
              status: execStatus,
              execution_audit_event_id: nexusData?.audit_event_id || null,
              executed_at: new Date().toISOString(),
            }}
          ).catch(() => {});
        }

        return Response.json({
          success: nexusData?.success !== false,
          approval_id: approval.id,
          status: nexusData?.success !== false ? 'executed' : 'execution_failed',
          audit_event_id: nexusData?.audit_event_id || null,
          execution_result: nexusData,
          message: nexusData?.success !== false
            ? 'Approved AI request executed successfully.'
            : 'Approved AI request execution failed.',
        });
      } catch (execErr) {
        // Transition to execution_failed
        await base44.asServiceRole.entities.AIApproval.updateMany(
          { id: approval_id, status: 'executing' },
          { $set: { status: 'execution_failed' } }
        ).catch(() => {});

        return safeJson('internal_error', 500, 'Execution of approved AI request failed.', {
          approval_id: approval.id,
          error: execErr.message,
        });
      }
    }

    // ── APPROVE / REJECT: approver authority checks ──────────
    // Prevent self-approval
    if (isSelfApproval(user.id, approval.requester_user_id)) {
      return safeJson('forbidden', 403, 'You cannot approve or reject your own request.');
    }

    // Verify approver authority
    const authorityCheck = validateApproverAuthority(user.role, approval.approving_role);
    if (!authorityCheck.valid) {
      return safeJson('forbidden', 403, authorityCheck.reason || 'You do not have permission to decide this approval.');
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    if (!isValidTransition(approval.status, newStatus)) {
      return safeJson('invalid_request', 409, `Invalid transition from '${approval.status}' to '${newStatus}'.`, {
        current_status: approval.status,
      });
    }

    // ── MANDATORY AUDIT (fail-closed for approval decisions) ──
    // Section 8: Approval and rejection are governance decisions and require
    // durable evidence. If audit creation fails, the decision MUST NOT proceed.
    const auditId = await createApprovalDecisionAudit(base44, {
      tenant_id: resolvedTenantId, outlet_id: approval.outlet_id,
      approval_id: approval.id, approval_key: approval.approval_key, request_id: approval.request_id,
      service_key: approval.service_key, capability_tier: approval.capability_tier,
      requester_user_id: approval.requester_user_id, requester_name: approval.requester_name, requester_role: approval.requester_role,
      approver_user_id: user.id, approver_name: user.full_name, approver_role: user.role,
      decision: newStatus, decision_reason: decision_reason || (action === 'approve' ? 'Approved.' : 'Rejected.'),
      model_key: approval.model_key, provider: approval.provider, autonomy_level: approval.autonomy_level,
      data_classification: approval.data_classification, policy_key: approval.policy_key,
    });

    if (!auditId) {
      // FAIL-CLOSED: cannot make a governance decision without audit evidence
      return safeJson('audit_failure', 500, 'Cannot complete approval decision — audit evidence creation failed. The approval has not been changed.', {
        approval_id: approval.id,
      });
    }

    // ── ATOMIC TRANSITION (conditional update) ──────────────
    // Uses updateMany with status condition — only one concurrent decision
    // can succeed. The query includes id + tenant + status='pending' so
    // if another approver already decided, this update matches 0 records.
    try {
      await base44.asServiceRole.entities.AIApproval.updateMany(
        { id: approval_id, tenant_id: resolvedTenantId, status: 'pending' },
        { $set: {
          status: newStatus,
          approver_user_id: user.id,
          approver_name: user.full_name,
          decision_reason: decision_reason || (action === 'approve' ? 'Approved.' : 'Rejected.'),
          decided_at: new Date().toISOString(),
        }}
      );
    } catch (err) {
      return safeJson('internal_error', 500, 'Failed to update approval status.');
    }

    // Post-write verification: re-read to confirm the transition
    let updatedApproval: any = null;
    try {
      updatedApproval = await base44.asServiceRole.entities.AIApproval.get(approval_id);
    } catch { /* verification is best-effort */ }

    if (updatedApproval && updatedApproval.status !== newStatus) {
      // Another approver changed the status between our read and write
      return safeJson('invalid_request', 409, `Approval was already decided as '${updatedApproval.status}'.`, {
        current_status: updatedApproval.status,
      });
    }

    // ── UPDATE ORBIT INBOX ───────────────────────────────────
    await updateInboxForApprovalDecision(base44, approval.id, resolvedTenantId, newStatus, decision_reason || (action === 'approve' ? 'Approved.' : 'Rejected.')).catch(() => {});

    // ── NOTIFY REQUESTER ────────────────────────────────────
    await notifyRequesterOfDecision(base44, {
      tenant_id: resolvedTenantId, outlet_id: approval.outlet_id,
      requester_user_id: approval.requester_user_id, requester_name: approval.requester_name, requester_role: approval.requester_role,
      approval_id: approval.id, service_key: approval.service_key,
      decision: newStatus, decision_reason: decision_reason || (action === 'approve' ? 'Approved.' : 'Rejected.'), approver_name: user.full_name,
    }).catch(() => {});

    return Response.json({
      success: true,
      approval_id: approval.id,
      status: newStatus,
      audit_event_id: auditId,
      message: action === 'approve'
        ? 'Approval granted. The requester can now execute this AI action.'
        : 'Approval rejected. The AI request has been denied.',
    });
  } catch (error) {
    console.log(`[aiApprovalActions] Error: ${error.message}`);
    return safeJson('internal_error', 500, 'An unexpected error occurred.');
  }
}