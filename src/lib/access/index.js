// ============================================================
// ORBITANOS — Access Engine :: Public Barrel (ADR-0050)
// Architecture Version 1.0 (Frozen)
//
// Single import surface for the Access Engine foundation.
//   import { createAccessEngine, createDecision, DENIAL_REASONS }
//     from '@/lib/access';
// ============================================================

export { ACCESS_ENGINE_VERSION } from './AccessEngine.js';
export { createAccessEngine } from './AccessEngine.js';

export {
  DECISION_VERSION,
  DECISION,
  DENIAL_REASONS,
  createDecision,
  allowDecision,
  denyDecision,
} from './DecisionObject.js';

export { POLICY_ENGINE_VERSION, createPolicyEngine } from './PolicyEngine.js';
export { resolvePrecedence, scopeCovers, isAncestorScope, PRECEDENCE_VERSION } from './precedence.js';

// Milestone 2 — Permission Packs & Membership compatibility layer
export {
  PERMISSION_PACKS_VERSION,
  PERMISSION_PACKS,
  PERMISSION_KEYS,
  ROLE_PACKS,
  permissionsForRole,
} from './PermissionPacks.js';
export {
  createMembershipResolver,
  translateEmployee,
  normalizeMembershipStatus,
  createPermissionResolver,
  derivePermissions,
} from './membership/index.js';

// Milestone 3.1 — Temporal foundation
export {
  CLOCK_VERSION,
  createSystemClock,
  createFixedClock,
} from './clock.js';
export {
  MEMBERSHIP_VALIDATOR_VERSION,
  validateMembership,
  createMembershipValidator,
} from './membership/MembershipValidator.js';
export {
  ROLE_ASSIGNMENT_RESOLVER_VERSION,
  ASSIGNMENT_STATUS,
  resolveActiveAssignments,
  createRoleAssignmentResolver,
} from './membership/RoleAssignmentResolver.js';

// Milestone 3.2 — Membership Provider abstraction + pipeline
export {
  MEMBERSHIP_PROVIDER_CONTRACT_VERSION,
  PROVIDER_CONTRACT,
  assertProvider,
  EMPLOYEE_BASE44_PROVIDER_VERSION,
  createEmployeeBase44Provider,
  MOCK_PROVIDER_VERSION,
  createMockMembershipProvider,
} from './providers/index.js';
export {
  ACCESS_PIPELINE_VERSION,
  createAccessPipeline,
} from './pipeline.js';

// Test runners (pure, no framework)
export { runTemporalTests } from './__tests__/runTemporalTests.js';
export { runProviderIntegrationTests } from './__tests__/runProviderIntegrationTests.js';
export { runPipelineTests } from './__tests__/runPipelineTests.js';