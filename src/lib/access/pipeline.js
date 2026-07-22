// ============================================================
// ORBITANOS — Access Engine :: AccessPipeline (Milestone 3.2)
// Architecture Version 1.0 (Frozen) — ADR-0050 §M3.2
//
// End-to-end composition of the authorization pipeline:
//
//   MembershipProvider  →  MembershipValidator  →
//   RoleAssignmentResolver (temporal)  →  PermissionResolver  →  Decision
//
// The pipeline depends ONLY on the MembershipProvider contract
// (resolve(identity, context) -> Membership | null). It never imports
// the Base44 SDK and never inspects Employee fields. Swapping the
// identity source is a one-line provider change; nothing here moves.
//
// FAIR-CLOSED: every provider throw / null / invalid-membership /
// inactive-membership / no-active-assignment path returns a DENIED
// DecisionObject. Never silently continues.
//
// AUDIT METADATA: each stage emits its `name` + `version` so future
// audit logs can record the exact pipeline state that produced a
// decision. Pure composition layer. Exit-Ready.
// ============================================================

import { createMembershipResolver, MEMBERSHIP_RESOLVER_VERSION } from './membership/MembershipResolver.js';
import { createMembershipValidator, MEMBERSHIP_VALIDATOR_VERSION } from './membership/MembershipValidator.js';
import { createRoleAssignmentResolver, ROLE_ASSIGNMENT_RESOLVER_VERSION } from './membership/RoleAssignmentResolver.js';
import { createPermissionResolver, PERMISSION_RESOLVER_VERSION } from './membership/PermissionResolver.js';
import { createSystemClock, CLOCK_VERSION } from './clock.js';
import { allowDecision, denyDecision, DENIAL_REASONS } from './DecisionObject.js';
import { assertProvider } from './providers/MembershipProvider.js';

export const ACCESS_PIPELINE_VERSION = '1.0.0';

/**
 * Compose the Access Engine pipeline.
 * @param {Object} opts
 * @param {Object} opts.provider a MembershipProvider (required)
 * @param {Object} [opts.clock] injectable clock (default SystemClock)
 */
export function createAccessPipeline({ provider, clock, validator, assignmentResolver, permissionResolver } = {}) {
  if (!provider) throw new Error('createAccessPipeline: provider is required');
  assertProvider(provider);

  const clk = clock || createSystemClock();
  const membershipResolver = createMembershipResolver();
  const val = validator || createMembershipValidator();
  const ar = assignmentResolver || createRoleAssignmentResolver({ clock: clk });
  const pr = permissionResolver || createPermissionResolver();

  function baseMetadata() {
    return {
      pipeline: { name: 'AccessPipeline', version: ACCESS_PIPELINE_VERSION },
      provider: { name: provider.name, version: provider.version },
      clock: { name: clk.name, version: clk.version },
      resolvers: {
        membership: { name: membershipResolver.name, version: MEMBERSHIP_RESOLVER_VERSION },
        validator: { name: val.name, version: MEMBERSHIP_VALIDATOR_VERSION },
        assignment: { name: ar.name, version: ROLE_ASSIGNMENT_RESOLVER_VERSION },
        permission: { name: pr.name, version: PERMISSION_RESOLVER_VERSION },
      },
    };
  }

  return Object.freeze({
    name: 'AccessPipeline',
    version: ACCESS_PIPELINE_VERSION,
    providerName: provider.name,
    providerVersion: provider.version,
    clockName: clk.name,
    clockVersion: clk.version,

    /**
     * Resolve access for an identity.
     * @param {Object} args
     * @param {Object} args.identity { id, email?, tenant_id? }
     * @param {Object} [args.context] { tenant_id? }
     * @returns {Promise<Object>} { membership, active_assignments, all_assignments, permissions, metadata, decision }
     */
    async resolveAccess({ identity, context = {} } = {}) {
      const metadata = baseMetadata();

      if (!identity) {
        return { membership: null, active_assignments: [], all_assignments: [], permissions: [], metadata, decision: denyDecision(DENIAL_REASONS.UNAUTHENTICATED, { identity: null }) };
      }

      // 1. Provider resolves the normalized membership. Fail-closed on throw.
      let membership;
      try {
        membership = await provider.resolve(identity, context);
      } catch (err) {
        return { membership: null, active_assignments: [], all_assignments: [], permissions: [], metadata, error: err?.message || String(err), decision: denyDecision(DENIAL_REASONS.PROVIDER_ERROR, { identity }) };
      }
      if (!membership) {
        return { membership: null, active_assignments: [], all_assignments: [], permissions: [], metadata, decision: denyDecision(DENIAL_REASONS.NO_MEMBERSHIP, { identity }) };
      }

      // 2. Validate the normalized membership structure. Fail-closed.
      const validation = val.validate(membership);
      if (!validation.valid) {
        return { membership, active_assignments: [], all_assignments: [], permissions: [], metadata, invalid: validation, decision: denyDecision(DENIAL_REASONS.INVALID_MEMBERSHIP, { identity, membership }) };
      }

      // 3. Resolve active role assignments (temporal). Fail-closed if none active.
      const { active_assignments, all_assignments } = await ar.resolve(membership, { clock: clk });

      if (membership.status !== 'active') {
        return { membership, active_assignments: [], all_assignments, permissions: [], metadata, decision: denyDecision(DENIAL_REASONS.MEMBERSHIP_INACTIVE, { identity, membership }) };
      }
      if (active_assignments.length === 0) {
        return { membership, active_assignments: [], all_assignments, permissions: [], metadata, decision: denyDecision(DENIAL_REASONS.NO_PERMISSION, { identity, membership }) };
      }

      // 4. Derive the flat permission list from the ACTIVE assignments only.
      const membershipWithActive = { ...membership, role_assignments: active_assignments };
      const permissions = await pr.resolve(undefined, { membership: membershipWithActive });

      return {
        membership,
        active_assignments,
        all_assignments,
        permissions,
        metadata,
        decision: allowDecision({ identity, membership }),
      };
    },
  });
}