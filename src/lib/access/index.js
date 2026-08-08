// ============================================================
// ORBITANOS — Access Engine Re-export Shims
// Build #28.2P-R.0R.3
//
// The canonical access modules now live in base44/shared/access/
// (backend-accessible). These frontend shims re-export from
// the canonical source so there is ONE implementation consumed
// by both production and the Test Lab.
//
// The membership subdirectory remains frontend-only (it uses
// React/SDK hooks) and is re-exported from ./membership/.
// ============================================================

export { createAccessEngine, ACCESS_ENGINE_VERSION } from '../../../base44/shared/access/AccessEngine.js';
export { createDecision, DECISION_VERSION, DECISION, DENIAL_REASONS, allowDecision, denyDecision } from '../../../base44/shared/access/DecisionObject.js';
export { createPolicyEngine, POLICY_ENGINE_VERSION } from '../../../base44/shared/access/PolicyEngine.js';
export { resolvePrecedence, PRECEDENCE_VERSION, scopeCovers, isAncestorScope } from '../../../base44/shared/access/precedence.js';
export { permissionsForRole, ROLE_PACKS, PERMISSION_PACKS, PERMISSION_KEYS, PERMISSION_PACKS_VERSION, withPack } from '../../../base44/shared/access/PermissionPacks.js';

// Membership modules (frontend-only — use React/SDK hooks)
export {
  MEMBERSHIP_RESOLVER_VERSION,
  createMembershipResolver,
  translateEmployee,
  normalizeMembershipStatus,
} from './membership/MembershipResolver.js';

export {
  PERMISSION_RESOLVER_VERSION,
  createPermissionResolver,
  derivePermissions,
} from './membership/PermissionResolver.js';