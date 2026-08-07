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

// ── OPERATION INTENT STATES (Build #28.2P-R.0R.1) ────────────
// Durable operation intent lifecycle for fail-closed privileged
// operations. Every privileged mutation MUST:
//   1. persist durable authorised operation intent BEFORE mutation;
//   2. verify the intent was persisted;
//   3. perform the idempotent mutation;
//   4. persist completion or failure;
//   5. return success only when required evidence is durable.
export const OPERATION_INTENT_STATES = {
  INTENT_PERSISTED: 'intent_persisted',
  MUTATION_COMPLETED: 'mutation_completed',
  COMPLETED: 'completed',
  FAILED: 'failed',
  INCOMPLETE: 'incomplete',
};

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