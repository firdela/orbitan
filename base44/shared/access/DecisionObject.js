// ============================================================
// ORBITANOS — Access Engine :: DecisionObject (ADR-0050 §4)
// Architecture Version 1.0 (Frozen)
//
// Canonical backend-accessible version. Frontend re-exports from
// src/lib/access/DecisionObject.js.
//
// Pure, dependency-free, serialisable. Exit-Ready.
// ============================================================

export const DECISION_VERSION = '1.0.0';

export const DECISION = Object.freeze({
  ALLOWED: 'ALLOWED',
  DENIED: 'DENIED',
});

export const DENIAL_REASONS = Object.freeze({
  UNAUTHENTICATED: 'unauthenticated',
  NO_MEMBERSHIP: 'no_membership',
  MEMBERSHIP_INACTIVE: 'membership_inactive',
  NO_CONTEXT: 'no_context',
  TENANT_OUT_OF_SCOPE: 'tenant_out_of_scope',
  OUTLET_OUT_OF_SCOPE: 'outlet_out_of_scope',
  NO_PERMISSION: 'no_permission',
  EXPLICIT_DENY: 'explicit_deny',
  SUBSCRIPTION_RESTRICTED: 'subscription_restricted',
  FEATURE_DISABLED: 'feature_disabled',
  POLICY_BLOCKED: 'policy_blocked',
  EVALUATION_ERROR: 'evaluation_error',
});

export function createDecision({
  allowed, denialReason = null, requestId = null, identity = null,
  membership = null, workspace = null, resource = null, action = null,
  matchedPermissions = [], evaluatedPolicies = [], subscription = null,
  featureFlags = null, auditLogId = null, evaluatedAt = new Date().toISOString(),
} = {}) {
  const isAllowed = allowed === true;
  const reason = isAllowed ? null : (denialReason || DENIAL_REASONS.EVALUATION_ERROR);
  return Object.freeze({
    schema: 'orbitan/access-decision/v1',
    version: DECISION_VERSION,
    decision: isAllowed ? DECISION.ALLOWED : DECISION.DENIED,
    denial_reason: reason,
    request_id: requestId || generateRequestId(),
    evaluated_at: evaluatedAt,
    audit_log_id: auditLogId,
    metadata: {
      identity: identity ? normalizeIdentity(identity) : null,
      membership: membership || null,
      workspace: workspace || null,
      resource: resource || null,
      action: action || null,
      matched_permissions: matchedPermissions,
      evaluated_policies: evaluatedPolicies,
      subscription: subscription,
      feature_flags: featureFlags,
    },
  });
}

export function allowDecision(partial = {}) {
  return createDecision({ allowed: true, ...partial });
}

export function denyDecision(denialReason, partial = {}) {
  return createDecision({ allowed: false, denialReason, ...partial });
}

function normalizeIdentity(identity) {
  return {
    id: identity.id ?? null,
    type: identity.type || 'user',
    email: identity.email || null,
    platform_role: identity.platform_role ?? identity.role ?? null,
  };
}

function generateRequestId() {
  return 'req_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}