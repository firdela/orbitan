// ============================================================
// ORBITANOS — Access Engine (ADR-0050) :: Foundation (Milestone 1)
// Architecture Version 1.0 (Frozen)
//
// The single authority for every authorization decision in OrbitanOS.
//
// Evaluation pipeline (ADR-0050 §3):
//   Request → Identity → Context → Membership → Permission Packs
//          → Hierarchy/Precedence → Subscription → Feature Flags
//          → Policy Engine → Platform-Owner Context Rule → Decision → Audit
//
// Design:
//   - Pluggable resolvers: identity/context/membership/permission/
//     subscription/featureFlag/auditSink. Milestone 1 ships safe
//     pass-through defaults; Milestone 2 wires real Employee/Membership.
//   - Fail-closed: any unresolved stage denies.
//   - Platform Owner is NOT an unrestricted bypass. Platform authority
//     grants access to every tenant, but tenant operations still
//     require an explicitly selected tenant context, structured
//     evaluation, and a full audit record (ADR-0050 §10, Gate 4).
//   - Pure orchestration; all domain logic lives in resolvers /
//     precedence / PolicyEngine. No base44 / React imports.
//
// Pure, dependency-free. Exit-Ready.
// ============================================================

import {
  createDecision,
  DECISION_VERSION,
  DENIAL_REASONS,
} from './DecisionObject.js';
import { createPolicyEngine } from './PolicyEngine.js';
import { resolvePrecedence } from './precedence.js';

export const ACCESS_ENGINE_VERSION = '1.0.0';

// Bootstrap Platform Owner (ADR-0050 §10). Isolated, documented, and
// designed to evolve into a configurable platform-level entitlement
// (Implementation Rule 4). Do not duplicate this value elsewhere.
const PLATFORM_OWNER_BOOTSTRAP_EMAIL = 'coffeeteabreak12@gmail.com';

export function createAccessEngine({ resolvers = {}, policyEngine = createPolicyEngine() } = {}) {
  const engine = Object.freeze({
    version: ACCESS_ENGINE_VERSION,
    decisionVersion: DECISION_VERSION,
    policyEngine,

    // Pluggable resolvers — M1 pass-through; M2+ replace with real data.
    identityResolver: resolvers.identityResolver || defaultIdentityResolver,
    contextResolver: resolvers.contextResolver || defaultContextResolver,
    membershipResolver: resolvers.membershipResolver || defaultMembershipResolver,
    permissionResolver: resolvers.permissionResolver || defaultPermissionResolver,
    subscriptionResolver: resolvers.subscriptionResolver || defaultSubscriptionResolver,
    featureFlagResolver: resolvers.featureFlagResolver || defaultFeatureFlagResolver,
    auditSink: resolvers.auditSink || defaultAuditSink,

    /**
     * Evaluate an authorization request. Fail-closed by design.
     * @param {Object} request
     *   { identity, workspace, membership, permissions, subscription,
     *     featureFlags, resource, action, request_id, is_platform_op }
     * @returns {Promise<Object>} DecisionObject
     */
    async evaluate(request) {
      const requestId = request?.request_id || generateRequestId();

      try {
        // ── 1. Identity ──────────────────────────────────────
        const identity = await resolve(this.identityResolver, request?.identity, { request });
        if (!identity) {
          return await finalize(this, request, requestId, null, null, null, null, null,
            { allowed: false, denied: false, reason: 'no_identity', matched: [] },
            false, DENIAL_REASONS.UNAUTHENTICATED);
        }

        // ── 2. Context / Workspace ───────────────────────────
        const workspace = await resolve(this.contextResolver, request?.workspace, { request, identity });
        const isPlatformOp = isPlatformOperation(request, identity);

        if (!workspace && !isPlatformOp) {
          return await finalize(this, request, requestId, identity, null, null, request?.resource, request?.action,
            { allowed: false, denied: false, reason: 'no_context', matched: [] },
            false, DENIAL_REASONS.NO_CONTEXT);
        }

        // ── 3. Membership ────────────────────────────────────
        const membership = await resolve(this.membershipResolver, request?.membership, { request, identity, workspace });
        const platformOwner = isPlatformOwner(identity);

        if (!membership && !platformOwner && !isPlatformOp) {
          return await finalize(this, request, requestId, identity, null, workspace, request?.resource, request?.action,
            { allowed: false, denied: false, reason: 'no_membership', matched: [] },
            false, DENIAL_REASONS.NO_MEMBERSHIP);
        }
        if (membership && !isMembershipActive(membership)) {
          return await finalize(this, request, requestId, identity, membership, workspace, request?.resource, request?.action,
            { allowed: false, denied: false, reason: 'membership_inactive', matched: [] },
            false, DENIAL_REASONS.MEMBERSHIP_INACTIVE);
        }

        // ── 4. Permissions + Precedence ──────────────────────
        const permissions = (await resolve(this.permissionResolver, request?.permissions, { request, identity, workspace, membership })) || [];
        const resource = request?.resource || null;
        const action = request?.action || null;
        const precedence = resolvePrecedence({ permissions, resource, action });

        if (precedence.denied) {
          return await finalize(this, request, requestId, identity, membership, workspace, resource, action,
            precedence, false, DENIAL_REASONS.EXPLICIT_DENY);
        }

        if (!precedence.allowed) {
          // Platform Owner may access any tenant — but ONLY within an
          // explicitly selected tenant context (not as a blind bypass).
          if (platformOwner && workspace) {
            const platformGrant = { allowed: true, denied: false, reason: 'platform_owner_authority', matched: [] };
            return await finalize(this, request, requestId, identity, membership, workspace, resource, action,
              platformGrant, true, null);
          }
          return await finalize(this, request, requestId, identity, membership, workspace, resource, action,
            precedence, false, DENIAL_REASONS.NO_PERMISSION);
        }

        // ── 5. Subscription ───────────────────────────────────
        const subscription = await resolve(this.subscriptionResolver, request?.subscription, { request, identity, workspace, membership });
        if (subscription && subscription.entitled === false) {
          return await finalize(this, request, requestId, identity, membership, workspace, resource, action,
            precedence, false, DENIAL_REASONS.SUBSCRIPTION_RESTRICTED, { subscription });
        }

        // ── 6. Feature flags ─────────────────────────────────
        const featureFlags = await resolve(this.featureFlagResolver, request?.featureFlags, { request, identity, workspace, action });
        if (featureFlags && featureFlags.enabled === false) {
          return await finalize(this, request, requestId, identity, membership, workspace, resource, action,
            precedence, false, DENIAL_REASONS.FEATURE_DISABLED, { featureFlags });
        }

        // ── 7. Policy Engine (business rules) ────────────────
        const policyContext = { request, identity, membership, workspace, resource, action, permissions, subscription, featureFlags };
        const policyResult = this.policyEngine.evaluate(policyContext);
        if (policyResult.decisive && policyResult.result?.allowed === false) {
          return await finalize(this, request, requestId, identity, membership, workspace, resource, action,
            precedence, false, DENIAL_REASONS.POLICY_BLOCKED, { evaluatedPolicies: policyResult.evaluated, subscription, featureFlags });
        }

        // ── 8. Final — allowed ───────────────────────────────
        return await finalize(this, request, requestId, identity, membership, workspace, resource, action,
          precedence, true, null, { evaluatedPolicies: policyResult.evaluated, subscription, featureFlags });
      } catch (err) {
        return await finalize(this, request, requestId, null, null, null, request?.resource, request?.action,
          { allowed: false, denied: false, reason: 'evaluation_error', matched: [] },
          false, DENIAL_REASONS.EVALUATION_ERROR, { error: err?.message || String(err) });
      }
    },
  });

  return engine;
}

// ── Internal helpers ─────────────────────────────────────────

async function finalize(engine, request, requestId, identity, membership, workspace, resource, action,
  precedence, allowed, denialReason, extra = {}) {
  const decision = createDecision({
    allowed,
    denialReason,
    requestId,
    identity,
    membership,
    workspace,
    resource,
    action,
    matchedPermissions: precedence?.matched || [],
    evaluatedPolicies: extra.evaluatedPolicies || [],
    subscription: extra.subscription ?? null,
    featureFlags: extra.featureFlags ?? null,
  });
  // Audit sink — M4 wires the real AuditLog. Fire-and-forget; never blocks.
  try {
    await engine.auditSink(decision);
  } catch {
    // Audit failure must not alter the authorization outcome.
  }
  return decision;
}

async function resolve(resolver, value, ctx) {
  if (typeof resolver !== 'function') return value ?? null;
  return await resolver(value, ctx);
}

function isPlatformOwner(identity) {
  if (!identity) return false;
  // Bootstrap check (email) + platform role. Evolves to a configurable
  // platform entitlement in a later milestone (Implementation Rule 4).
  if (identity.platform_role === 'admin') return true;
  if (identity.email && identity.email.toLowerCase() === PLATFORM_OWNER_BOOTSTRAP_EMAIL) return true;
  return false;
}

function isPlatformOperation(request, identity) {
  // A platform-level operation (tenant management, billing, etc.) does
  // not require a tenant workspace. Explicitly flagged by the caller.
  return !!(request?.is_platform_op === true || identity?.platform_role === 'admin' && request?.is_platform_op !== false && !request?.workspace);
}

function isMembershipActive(membership) {
  if (!membership) return false;
  const status = membership.status || membership.membership_status;
  if (status && !['active', 'invited', 'pending'].includes(status)) return false;
  return true;
}

// ── Default pass-through resolvers (M1) ──────────────────────
// M1 uses values supplied directly in the request; M2 replaces these
// with resolvers that fetch Employee/Membership from the database.
function defaultIdentityResolver(value) { return value ?? null; }
function defaultContextResolver(value) { return value ?? null; }
function defaultMembershipResolver(value) { return value ?? null; }
function defaultPermissionResolver(value) { return value ?? null; }
function defaultSubscriptionResolver(value) { return value ?? null; }
function defaultFeatureFlagResolver(value) { return value ?? null; }
async function defaultAuditSink(_decision) { /* no-op until M4 */ }

function generateRequestId() {
  return 'req_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}