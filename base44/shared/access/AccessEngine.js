// ============================================================
// ORBITANOS — Access Engine (ADR-0050) :: Foundation (Milestone 1)
// Architecture Version 1.0 (Frozen)
// Canonical backend-accessible version. Frontend re-exports.
// Pure, dependency-free. Exit-Ready.
// ============================================================

import { createDecision, DECISION_VERSION, DENIAL_REASONS } from './DecisionObject.js';
import { createPolicyEngine } from './PolicyEngine.js';
import { resolvePrecedence } from './precedence.js';

export const ACCESS_ENGINE_VERSION = '1.0.0';

export function createAccessEngine({ resolvers = {}, policyEngine = createPolicyEngine() } = {}) {
  const engine = Object.freeze({
    version: ACCESS_ENGINE_VERSION,
    decisionVersion: DECISION_VERSION,
    policyEngine,
    identityResolver: resolvers.identityResolver || defaultIdentityResolver,
    contextResolver: resolvers.contextResolver || defaultContextResolver,
    membershipResolver: resolvers.membershipResolver || defaultMembershipResolver,
    permissionResolver: resolvers.permissionResolver || defaultPermissionResolver,
    subscriptionResolver: resolvers.subscriptionResolver || defaultSubscriptionResolver,
    featureFlagResolver: resolvers.featureFlagResolver || defaultFeatureFlagResolver,
    auditSink: resolvers.auditSink || defaultAuditSink,

    async evaluate(request) {
      const requestId = request?.request_id || generateRequestId();
      try {
        const identity = await resolve(this.identityResolver, request?.identity, { request });
        if (!identity) {
          return await finalize(this, request, requestId, null, null, null, null, null,
            { allowed: false, denied: false, reason: 'no_identity', matched: [] }, false, DENIAL_REASONS.UNAUTHENTICATED);
        }
        const workspace = await resolve(this.contextResolver, request?.workspace, { request, identity });
        const isPlatformOp = isPlatformOperation(request, identity);
        if (!workspace && !isPlatformOp) {
          return await finalize(this, request, requestId, identity, null, null, request?.resource, request?.action,
            { allowed: false, denied: false, reason: 'no_context', matched: [] }, false, DENIAL_REASONS.NO_CONTEXT);
        }
        const membership = await resolve(this.membershipResolver, request?.membership, { request, identity, workspace });
        const platformOwner = isPlatformOwner(identity);
        if (!membership && !platformOwner && !isPlatformOp) {
          return await finalize(this, request, requestId, identity, null, workspace, request?.resource, request?.action,
            { allowed: false, denied: false, reason: 'no_membership', matched: [] }, false, DENIAL_REASONS.NO_MEMBERSHIP);
        }
        if (membership && !isMembershipActive(membership)) {
          return await finalize(this, request, requestId, identity, membership, workspace, request?.resource, request?.action,
            { allowed: false, denied: false, reason: 'membership_inactive', matched: [] }, false, DENIAL_REASONS.MEMBERSHIP_INACTIVE);
        }
        const permissions = (await resolve(this.permissionResolver, request?.permissions, { request, identity, workspace, membership })) || [];
        const resource = request?.resource || null;
        const action = request?.action || null;
        const precedence = resolvePrecedence({ permissions, resource, action });
        if (precedence.denied) {
          return await finalize(this, request, requestId, identity, membership, workspace, resource, action, precedence, false, DENIAL_REASONS.EXPLICIT_DENY);
        }
        if (!precedence.allowed) {
          if (platformOwner && workspace) {
            return await finalize(this, request, requestId, identity, membership, workspace, resource, action,
              { allowed: true, denied: false, reason: 'platform_owner_authority', matched: [] }, true, null);
          }
          return await finalize(this, request, requestId, identity, membership, workspace, resource, action, precedence, false, DENIAL_REASONS.NO_PERMISSION);
        }
        const subscription = await resolve(this.subscriptionResolver, request?.subscription, { request, identity, workspace, membership });
        if (subscription && subscription.entitled === false) {
          return await finalize(this, request, requestId, identity, membership, workspace, resource, action, precedence, false, DENIAL_REASONS.SUBSCRIPTION_RESTRICTED, { subscription });
        }
        const featureFlags = await resolve(this.featureFlagResolver, request?.featureFlags, { request, identity, workspace, action });
        if (featureFlags && featureFlags.enabled === false) {
          return await finalize(this, request, requestId, identity, membership, workspace, resource, action, precedence, false, DENIAL_REASONS.FEATURE_DISABLED, { featureFlags });
        }
        const policyContext = { request, identity, membership, workspace, resource, action, permissions, subscription, featureFlags };
        const policyResult = this.policyEngine.evaluate(policyContext);
        if (policyResult.decisive && policyResult.result?.allowed === false) {
          return await finalize(this, request, requestId, identity, membership, workspace, resource, action, precedence, false, DENIAL_REASONS.POLICY_BLOCKED, { evaluatedPolicies: policyResult.evaluated, subscription, featureFlags });
        }
        return await finalize(this, request, requestId, identity, membership, workspace, resource, action, precedence, true, null, { evaluatedPolicies: policyResult.evaluated, subscription, featureFlags });
      } catch (err) {
        return await finalize(this, request, requestId, null, null, null, request?.resource, request?.action,
          { allowed: false, denied: false, reason: 'evaluation_error', matched: [] }, false, DENIAL_REASONS.EVALUATION_ERROR, { error: err?.message || String(err) });
      }
    },
  });
  return engine;
}

async function finalize(engine, request, requestId, identity, membership, workspace, resource, action, precedence, allowed, denialReason, extra = {}) {
  const decision = createDecision({
    allowed, denialReason, requestId, identity, membership, workspace, resource, action,
    matchedPermissions: precedence?.matched || [], evaluatedPolicies: extra.evaluatedPolicies || [],
    subscription: extra.subscription ?? null, featureFlags: extra.featureFlags ?? null,
  });
  try { await engine.auditSink(decision); } catch { }
  return decision;
}

async function resolve(resolver, value, ctx) {
  if (typeof resolver !== 'function') return value ?? null;
  return await resolver(value, ctx);
}

function isPlatformOwner(identity) {
  if (!identity) return false;
  if (identity.platform_role === 'admin') return true;
  if (identity.role === 'admin') return true;
  return false;
}

function isPlatformOperation(request, identity) {
  return !!(request?.is_platform_op === true || identity?.platform_role === 'admin' && request?.is_platform_op !== false && !request?.workspace);
}

function isMembershipActive(membership) {
  if (!membership) return false;
  const status = membership.status || membership.membership_status;
  if (status && !['active', 'invited', 'pending'].includes(status)) return false;
  return true;
}

function defaultIdentityResolver(value) { return value ?? null; }
function defaultContextResolver(value) { return value ?? null; }
function defaultMembershipResolver(value) { return value ?? null; }
function defaultPermissionResolver(value) { return value ?? null; }
function defaultSubscriptionResolver(value) { return value ?? null; }
function defaultFeatureFlagResolver(value) { return value ?? null; }
async function defaultAuditSink(_decision) { }

function generateRequestId() {
  return 'req_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}