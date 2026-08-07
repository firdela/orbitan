// ============================================================
// ORBITAN TEST LAB — Canonical Configuration (Build #28.2P-R.0R)
//
// Single source of truth for the internal Orbitan Test Lab Setup
// capability. Pure JavaScript ESM module — importable by both
// Base44 Deno functions AND Node.js test runners.
//
// This is NOT a temporary developer tool. It is permanent, reusable
// internal test infrastructure for governance verification.
//
// Pure functions only — no SDK calls, no side effects.
// ============================================================

// ── TEST-INFRASTRUCTURE PERMISSION ─────────────────────────────
export const TEST_LAB_PERMISSION = 'platform.test_lab.manage';

// ── CROSS-TENANT AI PERMISSION ─────────────────────────────────
export const CROSS_TENANT_AI_PERMISSION = 'platform.ai.cross_tenant_operate';

// ── TEST LAB CANONICAL KEY (idempotency for Tenant B) ─────────
export const TENANT_B_TEST_LAB_KEY = 'TEST_LAB_B';

// ── FIXED TEST-IDENTITY ALLOWLIST ──────────────────────────────
// Only these exact email aliases may be managed by the Test Lab
// capability. No arbitrary user IDs or aliases are accepted.
//
// SECURITY FIX (Build #28.2P-R.0R):
//   Tenant identities use User.role='user' — their operational
//   authority comes ONLY from tenant-scoped Employee membership.
//   Only dedicated platform identities use User.role='admin'.
//   This prevents RoleGateway from routing tenant test users to
//   the Platform Owner workspace (/leader-org).
export const TEST_IDENTITIES = [
  {
    email: 'test.requester.a@orbitan.net',
    label: 'Tenant A Requester',
    tenant: 'A',
    userRole: 'user',
    employeeRole: 'worker',
    outletRequired: true,
    requiresCrossTenantPermission: false,
    prohibitedPermissions: ['platform.ai.cross_tenant_operate', 'platform.test_lab.manage'],
    purpose: 'Submits owned AI approval requests. Cannot self-approve.',
  },
  {
    email: 'test.approver.a@orbitan.net',
    label: 'Tenant A Approver',
    tenant: 'A',
    userRole: 'user',
    employeeRole: 'tenant_admin',
    outletRequired: true,
    requiresCrossTenantPermission: false,
    prohibitedPermissions: ['platform.ai.cross_tenant_operate', 'platform.test_lab.manage'],
    purpose: 'Independent authorised approver for Tenant A test requests.',
  },
  {
    email: 'test.leader.a@orbitan.net',
    label: 'Tenant A Leader/Manager',
    tenant: 'A',
    userRole: 'user',
    employeeRole: 'outlet_manager',
    outletRequired: true,
    requiresCrossTenantPermission: false,
    prohibitedPermissions: ['platform.ai.cross_tenant_operate', 'platform.test_lab.manage'],
    purpose: 'Canonical operational leadership role. No platform authority.',
  },
  {
    email: 'test.worker.a@orbitan.net',
    label: 'Tenant A Second Worker',
    tenant: 'A',
    userRole: 'user',
    employeeRole: 'worker',
    outletRequired: true,
    requiresCrossTenantPermission: false,
    prohibitedPermissions: ['platform.ai.cross_tenant_operate', 'platform.test_lab.manage'],
    purpose: 'Separate from requester. Used for ownership-isolation testing.',
  },
  {
    email: 'test.admin.b@orbitan.net',
    label: 'Tenant B Administrator',
    tenant: 'B',
    userRole: 'user',
    employeeRole: 'tenant_admin',
    outletRequired: true,
    requiresCrossTenantPermission: false,
    prohibitedPermissions: ['platform.ai.cross_tenant_operate', 'platform.test_lab.manage'],
    purpose: 'Tenant administration within Tenant B only.',
  },
  {
    email: 'test.worker.b@orbitan.net',
    label: 'Tenant B Worker',
    tenant: 'B',
    userRole: 'user',
    employeeRole: 'worker',
    outletRequired: true,
    requiresCrossTenantPermission: false,
    prohibitedPermissions: ['platform.ai.cross_tenant_operate', 'platform.test_lab.manage'],
    purpose: 'Worker scope within Tenant B only.',
  },
  {
    email: 'test.platform.allowed@orbitan.net',
    label: 'Platform Admin (Cross-Tenant Allowed)',
    tenant: 'platform',
    userRole: 'admin',
    employeeRole: 'tenant_admin',
    outletRequired: false,
    requiresCrossTenantPermission: true,
    prohibitedPermissions: ['platform.test_lab.manage'],
    purpose: 'Platform administrator with explicit cross-tenant AI permission.',
  },
  {
    email: 'test.platform.denied@orbitan.net',
    label: 'Platform Admin (Cross-Tenant Denied)',
    tenant: 'platform',
    userRole: 'admin',
    employeeRole: 'tenant_admin',
    outletRequired: false,
    requiresCrossTenantPermission: false,
    prohibitedPermissions: ['platform.ai.cross_tenant_operate', 'platform.test_lab.manage'],
    purpose: 'Platform administrator without cross-tenant AI permission.',
  },
];

// ── SANDBOX TENANT CONFIGURATION ───────────────────────────────
export const TENANT_A_ID = '6a4eeb6992cc657b66ec24cc';
export const TENANT_A_NAME = 'Orbitan Test Lab';
export const TENANT_B_NAME = 'Orbitan Test Lab B';

export const SANDBOX_TENANT_DEFAULTS = {
  is_sandbox: true,
  status: 'active',
  subscription_plan: 'orbitan_free',
  industry: 'food_beverage',
  currency: 'SGD',
  country: 'Singapore',
  max_employees: 10,
  is_pilot_tenant: false,
  onboarding_completed: true,
  enabled_modules: ['task', 'inventory', 'compliance', 'workforce'],
  enabled_packs: ['fnb'],
  governance_domain: 'fnb_standard_ops',
  manifest_key: 'fnb_ops_v1',
};

// ── SANDBOX-ONLY SHORT TTL ────────────────────────────────────
// Used only when a valid Test Run authorises short TTL for a
// sandbox tenant. Production tenants always use the normal
// 24-hour TTL.
//
// BUILD #28.2P-R.0R.1 — Client TTL authority REMOVED entirely.
// The client/operator CANNOT choose the approval TTL. The server
// selects the TTL from the test_tag using the policy below, or
// falls back to the canonical default. The request may identify
// the test scenario (test_tag) but MUST NOT provide the TTL value.
export const NORMAL_APPROVAL_TTL_HOURS = 24;
export const SANDBOX_TEST_TTL_MIN_MINUTES = 1;
export const SANDBOX_TEST_TTL_MAX_MINUTES = 10;
export const SANDBOX_TEST_TTL_DEFAULT_MINUTES = 2;

// ── SERVER TTL POLICY (Build #28.2P-R.0R.1) ───────────────────
// Maps test_tag → server-selected TTL in minutes. The client
// identifies the scenario via test_tag; the server resolves the TTL.
// If the test_tag is not in this policy, the canonical default is used.
export const SERVER_TTL_POLICY = {
  'approve_to_execute': SANDBOX_TEST_TTL_DEFAULT_MINUTES,
  'cross_tenant_execution': 3,
  'worker_approval_denial': 2,
  'concurrent_decision': 2,
  'replay_single_use': 1,
  'expiry_test': 1,
};

// Resolves the server-selected TTL for a given test scenario.
// The client CANNOT override this value. If the test_tag is not
// in the policy, the canonical default is used.
export function resolveServerTtl(testTag) {
  if (testTag && SERVER_TTL_POLICY[testTag] != null) {
    return SERVER_TTL_POLICY[testTag];
  }
  return SANDBOX_TEST_TTL_DEFAULT_MINUTES;
}

// ── TEST RUN LIFECYCLE STATES ──────────────────────────────────
export const TEST_RUN_STATES = {
  ACTIVE: 'active',
  CONSUMED: 'consumed',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
};

// ── TEST-RUN TAGGING STANDARD ──────────────────────────────────
export function createTestRunMetadata(params) {
  return {
    environment: 'test',
    test_run_id: params.testRunId,
    test_tag: params.testTag,
    sandbox_tenant_id: params.sandboxTenantId,
    created_by_test: true,
    non_production: true,
    test_purpose: params.testPurpose,
    created_by_actor_id: params.actorId,
  };
}

export function isTestTagged(record) {
  if (!record) return false;
  // Check schema-supported fields first (canonical)
  if (record.is_test === true) return true;
  // Fallback: check metadata object (for records created before schema fields)
  if (record.metadata?.environment === 'test' && record.metadata?.created_by_test === true) return true;
  return false;
}

// ── VALIDATION HELPERS ────────────────────────────────────────
export function isAllowlistedTestAlias(email) {
  return TEST_IDENTITIES.some(t => t.email === email);
}

export function getTestIdentity(email) {
  return TEST_IDENTITIES.find(t => t.email === email) || null;
}

// BUILD #28.2P-R.0R.1 — isValidTestTtlMinutes is DEPRECATED.
// Client TTL values are no longer accepted. The server selects
// TTL from SERVER_TTL_POLICY. This function is retained only for
// internal server-side validation, not for accepting client input.
export function isValidTestTtlMinutes(minutes) {
  return typeof minutes === 'number' && minutes >= SANDBOX_TEST_TTL_MIN_MINUTES && minutes <= SANDBOX_TEST_TTL_MAX_MINUTES;
}

// ── OPERATION LIFECYCLE STATES (Build #28.2P-R.0R.1B) ─────────
// Durable operation lifecycle for fail-closed privileged Test Lab
// operations. Every privileged mutation MUST:
//   1. create a TestLabOperation record (PENDING);
//   2. persist durable authorised operation intent (INTENT_PERSISTED);
//   3. verify the intent was persisted;
//   4. perform the idempotent mutation (MUTATION_COMPLETED);
//   5. persist completion evidence (COMPLETED) or failure (FAILED/INCOMPLETE);
//   6. return success ONLY when status = COMPLETED.
//
// Build #28.2P-R.0R.1B adds PENDING as the initial state — the
// TestLabOperation record exists before authority/intent is durably
// established.
export const OPERATION_LIFECYCLE_STATES = {
  PENDING: 'pending',
  INTENT_PERSISTED: 'intent_persisted',
  MUTATION_COMPLETED: 'mutation_completed',
  COMPLETED: 'completed',
  FAILED: 'failed',
  INCOMPLETE: 'incomplete',
  RECONCILED: 'reconciled',
};

// Legacy alias for backward compatibility
export const OPERATION_INTENT_STATES = OPERATION_LIFECYCLE_STATES;

// ── OPERATION LOOKUP STATES (Build #28.2P-R.0R.1B) ────────────
// Fail-closed operation-state lookup. UNAVAILABLE MUST fail closed.
// A lookup error MUST NOT mean "no incomplete operation exists".
export const OPERATION_LOOKUP_STATES = {
  CLEAR: 'clear',
  BLOCKED: 'blocked',
  UNAVAILABLE: 'unavailable',
};

// ── BLOCKING vs NON-BLOCKING OPERATION STATES (Build #28.2P-R.0R.1C) ──
// Build #28.2P-R.0R.1C expands blocking to include PENDING and
// INTENT_PERSISTED — a second operation against the same target
// MUST NOT start while another operation is already in any active
// state. Only terminal safe states (COMPLETED, FAILED, RECONCILED)
// are non-blocking.
export const BLOCKING_OPERATION_STATUSES = [
  OPERATION_LIFECYCLE_STATES.PENDING,
  OPERATION_LIFECYCLE_STATES.INTENT_PERSISTED,
  OPERATION_LIFECYCLE_STATES.MUTATION_COMPLETED,
  OPERATION_LIFECYCLE_STATES.INCOMPLETE,
];

export const NON_BLOCKING_OPERATION_STATUSES = [
  OPERATION_LIFECYCLE_STATES.COMPLETED,
  OPERATION_LIFECYCLE_STATES.FAILED,
  OPERATION_LIFECYCLE_STATES.RECONCILED,
];

export function isBlockingOperationStatus(status) {
  return BLOCKING_OPERATION_STATUSES.includes(status);
}

export function isNonBlockingOperationStatus(status) {
  return NON_BLOCKING_OPERATION_STATUSES.includes(status);
}

// ── VERIFICATION RUN LOOKUP STATES (Build #28.2P-R.0R.1C) ──────
// Fail-closed verification run lookup. Distinguishes:
// NONE — query succeeded, zero active runs.
// ACTIVE — query succeeded, exactly one active run.
// UNAVAILABLE — query failed (MUST fail closed).
// CONFLICT — more than one active run (MUST fail closed).
export const VERIFICATION_RUN_LOOKUP_STATES = {
  NONE: 'none',
  ACTIVE: 'active',
  UNAVAILABLE: 'unavailable',
  CONFLICT: 'conflict',
};

// ── VERIFICATION RUN STATUSES (Build #28.2P-R.0R.1B) ──────────
export const VERIFICATION_RUN_STATUSES = {
  PREPARING: 'preparing',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  FAILED: 'failed',
  ARCHIVED: 'archived',
};

// ── VERIFICATION RUN LEGAL TRANSITIONS (Build #28.2P-R.0R.1C) ─
// Enforced server-side. Illegal transitions are denied.
export const VERIFICATION_RUN_TRANSITIONS = {
  [VERIFICATION_RUN_STATUSES.PREPARING]: [VERIFICATION_RUN_STATUSES.ACTIVE],
  [VERIFICATION_RUN_STATUSES.ACTIVE]: [VERIFICATION_RUN_STATUSES.COMPLETED, VERIFICATION_RUN_STATUSES.FAILED],
  [VERIFICATION_RUN_STATUSES.COMPLETED]: [VERIFICATION_RUN_STATUSES.ARCHIVED],
  [VERIFICATION_RUN_STATUSES.FAILED]: [VERIFICATION_RUN_STATUSES.ARCHIVED],
  [VERIFICATION_RUN_STATUSES.ARCHIVED]: [],
};

export function isLegalVerificationRunTransition(fromStatus, toStatus) {
  const allowed = VERIFICATION_RUN_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
}

// ── CANONICAL TARGET KEY GENERATORS (Build #28.2P-R.0R.1B) ────
// Deterministic server-side target correlation. Prevents incomplete
// operations from becoming invisible due to logical-key vs database-ID
// mismatch. Never client-defined.
export const TARGET_TYPES = {
  SANDBOX_TENANT: 'sandbox_tenant',
  TEST_MEMBERSHIP: 'test_membership',
  TEST_PERMISSION: 'test_permission',
  TEST_ATTESTATION: 'test_attestation',
  TEST_RUN: 'test_run',
  TEST_RESET: 'test_reset',
  VERIFICATION_RUN: 'verification_run',
  VERIFICATION_ACTIVATION: 'verification_activation',
};

export function targetKeyForSandboxTenant() {
  return TENANT_B_TEST_LAB_KEY;
}

export function targetKeyForMembership(tenantId, alias) {
  return `${tenantId}:${alias}`;
}

export function targetKeyForPermission(userId) {
  return `${userId}:${CROSS_TENANT_AI_PERMISSION}`;
}

export function targetKeyForAttestation(alias, checkKey) {
  return `${alias}:${checkKey}`;
}

export function targetKeyForTestRun(verificationRunId, sandboxTenantId, requesterEmail, serviceKey, testTag) {
  return `${verificationRunId}:${sandboxTenantId}:${requesterEmail}:${serviceKey}:${testTag}`;
}

export function targetKeyForReset(tenantId, testRunId) {
  return `${tenantId}:${testRunId}`;
}

// Build #28.2P-R.0R.1C — Verification run target keys
export function targetKeyForVerificationRun(verificationRunId) {
  return `vrun:${verificationRunId}`;
}

// Global activation lock — ensures at most one ACTIVE verification run.
// All activation requests must acquire this lock before transitioning
// any run to ACTIVE.
export function targetKeyForVerificationActivation() {
  return 'global';
}

// Build #28.2P-R.0R.1C — Lock key generator (for the atomic lock registry).
// The lock key is derived from the target_type + target_key, ensuring
// one lock per canonical target. For verification activation, a global
// lock key is used to serialize all activations.
export function lockKeyForTarget(targetType, targetKey) {
  return `${targetType}:${targetKey}`;
}

// ── OPERATION ID GENERATOR (Build #28.2P-R.0R.1B) ────────────
// Server-generated, immutable, correlates every lifecycle stage.
export function generateOperationId() {
  return `tlop_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

// ── VERIFICATION RUN ID GENERATOR (Build #28.2P-R.0R.1B) ──────
export function generateVerificationRunId() {
  return `vrun_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

// ── BOOTSTRAP STATE (Build #28.2P-R.0R.1) ────────────────────
// The one-time bootstrap has already completed. The action is now
// permanently disabled. Permission management is handled exclusively
// through the canonical Access Control architecture.
export const BOOTSTRAP_STATE = {
  PERMANENTLY_DISABLED: 'permanently_disabled',
  DISABLED_CODE: 'bootstrap_disabled',
};

// ── ROLE RESOLUTION ────────────────────────────────────────────
// Resolves the canonical workspace route for a given User.role.
// This mirrors RoleGateway's routing logic.
export function resolveWorkspaceRoute(userRole) {
  if (userRole === 'admin') return '/leader-org';
  if (userRole === 'user') return '/workspace';
  return '/workspace';
}

// Checks whether a User.role grants platform admin access.
export function isPlatformAdmin(userRole) {
  return userRole === 'admin';
}

// ── IDENTITY READINESS STATES ──────────────────────────────────
export const IDENTITY_READINESS_STATES = [
  'ALIAS_CONFIGURED',
  'DELIVERY_VERIFICATION_PENDING',
  'DELIVERY_VERIFIED',
  'MEMBERSHIP_PREPARED',
  'INVITATION_PENDING',
  'INVITED',
  'REGISTERED',
  'EMAIL_VERIFICATION_REQUIRED',
  'EMAIL_VERIFIED',
  'IDENTITY_LINKED',
  'SESSION_VERIFICATION_REQUIRED',
  'READY',
  'BLOCKED',
  'DISABLED',
];

// ── EMAIL DELIVERY ATTESTATION CHECKS ──────────────────────────
export const EMAIL_ATTESTATION_CHECKS = [
  'ordinary_test_email_received',
  'recipient_alias_preserved',
  'invitation_email_received',
  'verification_email_received',
  'password_reset_email_received',
  'catch_all_did_not_drop',
  'private_destination_hidden',
];

// ── ANALYTICS EXCLUSION HELPER ──────────────────────────────────
// Shared query filter helper for excluding test records from
// production aggregations. Use with .filter() calls on entities
// that support the is_test / non_production schema fields.
export function productionExclusionFilter() {
  return { is_test: { $ne: true } };
}

// For entities that store test tagging in metadata only
export function isProductionRecord(record) {
  if (!record) return false;
  // Schema-supported test fields (AIApproval, TestRun, TestLabAttestation)
  if (record.is_test === true) return false;
  if (record.non_production === true) return false;
  // Metadata-based test tagging (OrbitUsageTracker, OrbitInbox, AIAuditEvent)
  if (record.metadata?.environment === 'test') return false;
  if (record.metadata?.created_by_test === true) return false;
  if (record.metadata?.non_production === true) return false;
  if (record.metadata?.test_run_id) return false;
  // OrbitUsageTracker: shield_outcome='ai_disabled' is not test data,
  // but metadata.test_run_id indicates test usage
  if (record.service_key && record.metadata?.test_tag) return false;
  return true;
}

// ── COMPREHENSIVE PRODUCTION EXCLUSION ────────────────────────
// Returns a MongoDB-style filter object that excludes all test
// records. Use with .filter() calls on ANY entity that might
// contain test data. This is the ONE canonical exclusion mechanism.
//
// Supports both schema-level fields (is_test, non_production) and
// metadata-level fields (environment, created_by_test, test_run_id).
export function productionExclusionQuery() {
  return {
    $and: [
      { is_test: { $ne: true } },
      { non_production: { $ne: true } },
      { 'metadata.environment': { $ne: 'test' } },
      { 'metadata.created_by_test': { $ne: true } },
      { 'metadata.non_production': { $ne: true } },
      { 'metadata.test_run_id': { $exists: false } },
    ],
  };
}

// Returns true if a list of records contains ANY test records
// (useful for post-filter verification in tests)
export function containsTestRecords(records) {
  if (!records || !Array.isArray(records)) return false;
  return records.some(r => !isProductionRecord(r));
}