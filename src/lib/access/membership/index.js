// ============================================================
// ORBITANOS — Access Engine :: Membership barrel (Milestone 2)
// ============================================================

export {
  MEMBERSHIP_RESOLVER_VERSION,
  createMembershipResolver,
  translateEmployee,
  normalizeMembershipStatus,
} from './MembershipResolver.js';

export {
  PERMISSION_RESOLVER_VERSION,
  createPermissionResolver,
  derivePermissions,
} from './PermissionResolver.js';

// Milestone 3.1 — Temporal foundation
export {
  MEMBERSHIP_VALIDATOR_VERSION,
  validateMembership,
  createMembershipValidator,
} from './MembershipValidator.js';
export {
  ROLE_ASSIGNMENT_RESOLVER_VERSION,
  ASSIGNMENT_STATUS,
  resolveActiveAssignments,
  createRoleAssignmentResolver,
} from './RoleAssignmentResolver.js';