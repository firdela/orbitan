// ============================================================
// ORBITAN TEST LAB — Canonical Configuration (Build #28.2Q-ZE.1)
//
// Zero-Email Persona Migration:
//   TEST_IDENTITIES → TEST_PERSONAS
//
// Single source of truth for the internal Orbitan Test Lab Setup
// capability. Pure JavaScript ESM module — importable by both
// Base44 Deno functions AND Node.js test runners.
//
// This is NOT a temporary developer tool. It is permanent, reusable
// internal test infrastructure for governance verification.
//
// BUILD #28.2Q-ZE.1 — ZERO-EMAIL TESTING ARCHITECTURE:
//   - Personas are logical testing models, NOT human identities
//   - No email, no mailbox, no OTP, no Base44 User required
//   - Authority derives from persona_key + fixture_key (server-side)
//   - Tenant Digital Twins replace email-based fixture linkage
//   - TEST_IDENTITIES is a @deprecated alias to TEST_PERSONAS
//
// Pure functions only — no SDK calls, no side effects.
// ============================================================

// ── TEST-INFRASTRUCTURE PERMISSION ─────────────────────────────
export const TEST_LAB_PERMISSION = 'platform.test_lab.manage';

// ── CROSS-TENANT AI PERMISSION ─────────────────────────────────
export const CROSS_TENANT_AI_PERMISSION = 'platform.ai.cross_tenant_operate';

// ── TEST LAB CANONICAL KEY (idempotency for Tenant B) ─────────
export const TENANT_B_TEST_LAB_KEY = 'TEST_LAB_B';

// ── CANONICAL PERSONA REGISTRY (Build #28.2Q-ZE.1) ────────────
// TEST_PERSONAS is the ONE canonical persona registry.
//
// A persona is a DETERMINISTIC TESTING MODEL — NOT:
//   - a Base44 User
//   - a JWT / session / access token
//   - an email inbox
//   - a Google account
//   - a real human
//
// Authority derives from persona_key + server-controlled fixture
// registry. No email, no OTP, no password, no mailbox required.
//
// The 8 canonical governance personas preserve the policy semantics
// of the legacy 8-email model without the email dependency.
export const TEST_PERSONAS = [
  {
    persona_key: 'tenant_a_requester',
    label: 'Tenant A Requester',
    userRole: 'user',
    employeeRole: 'worker',
    tenant: 'A',
    tenant_fixture_key: 'tenant_a_standard',
    outlet_fixture_key: 'outlet_a_standard',
    employee_fixture_key: 'emp_tenant_a_requester',
    requiresCrossTenantPermission: false,
    prohibitedPermissions: ['platform.ai.cross_tenant_operate', 'platform.test_lab.manage'],
    workflow_profile: 'requester',
    purpose: 'Submits owned AI approval requests. Cannot self-approve.',
    non_production: true,
  },
  {
    persona_key: 'tenant_a_approver',
    label: 'Tenant A Approver',
    userRole: 'user',
    employeeRole: 'tenant_admin',
    tenant: 'A',
    tenant_fixture_key: 'tenant_a_standard',
    outlet_fixture_key: 'outlet_a_standard',
    employee_fixture_key: 'emp_tenant_a_approver',
    requiresCrossTenantPermission: false,
    prohibitedPermissions: ['platform.ai.cross_tenant_operate', 'platform.test_lab.manage'],
    workflow_profile: 'approver',
    purpose: 'Independent authorised approver for Tenant A test requests.',
    non_production: true,
  },
  {
    persona_key: 'tenant_a_leader',
    label: 'Tenant A Leader/Manager',
    userRole: 'user',
    employeeRole: 'outlet_manager',
    tenant: 'A',
    tenant_fixture_key: 'tenant_a_standard',
    outlet_fixture_key: 'outlet_a_standard',
    employee_fixture_key: 'emp_tenant_a_leader',
    requiresCrossTenantPermission: false,
    prohibitedPermissions: ['platform.ai.cross_tenant_operate', 'platform.test_lab.manage'],
    workflow_profile: 'leader',
    purpose: 'Canonical operational leadership role. No platform authority.',
    non_production: true,
  },
  {
    persona_key: 'tenant_a_worker',
    label: 'Tenant A Second Worker',
    userRole: 'user',
    employeeRole: 'worker',
    tenant: 'A',
    tenant_fixture_key: 'tenant_a_standard',
    outlet_fixture_key: 'outlet_a_standard',
    employee_fixture_key: 'emp_tenant_a_worker',
    requiresCrossTenantPermission: false,
    prohibitedPermissions: ['platform.ai.cross_tenant_operate', 'platform.test_lab.manage'],
    workflow_profile: 'worker',
    purpose: 'Separate from requester. Used for ownership-isolation testing.',
    non_production: true,
  },
  {
    persona_key: 'tenant_b_admin',
    label: 'Tenant B Administrator',
    userRole: 'user',
    employeeRole: 'tenant_admin',
    tenant: 'B',
    tenant_fixture_key: 'tenant_b_standard',
    outlet_fixture_key: 'outlet_b_standard',
    employee_fixture_key: 'emp_tenant_b_admin',
    requiresCrossTenantPermission: false,
    prohibitedPermissions: ['platform.ai.cross_tenant_operate', 'platform.test_lab.manage'],
    workflow_profile: 'tenant_admin',
    purpose: 'Tenant administration within Tenant B only.',
    non_production: true,
  },
  {
    persona_key: 'tenant_b_worker',
    label: 'Tenant B Worker',
    userRole: 'user',
    employeeRole: 'worker',
    tenant: 'B',
    tenant_fixture_key: 'tenant_b_standard',
    outlet_fixture_key: 'outlet_b_standard',
    employee_fixture_key: 'emp_tenant_b_worker',
    requiresCrossTenantPermission: false,
    prohibitedPermissions: ['platform.ai.cross_tenant_operate', 'platform.test_lab.manage'],
    workflow_profile: 'worker',
    purpose: 'Worker scope within Tenant B only.',
    non_production: true,
  },
  {
    persona_key: 'platform_allowed',
    label: 'Platform Admin (Cross-Tenant Allowed)',
    userRole: 'admin',
    employeeRole: 'tenant_admin',
    tenant: 'platform',
    tenant_fixture_key: null,
    outlet_fixture_key: null,
    employee_fixture_key: null,
    requiresCrossTenantPermission: true,
    prohibitedPermissions: ['platform.test_lab.manage'],
    workflow_profile: 'platform_admin',
    purpose: 'Platform administrator with explicit cross-tenant AI permission.',
    non_production: true,
  },
  {
    persona_key: 'platform_denied',
    label: 'Platform Admin (Cross-Tenant Denied)',
    userRole: 'admin',
    employeeRole: 'tenant_admin',
    tenant: 'platform',
    tenant_fixture_key: null,
    outlet_fixture_key: null,
    employee_fixture_key: null,
    requiresCrossTenantPermission: false,
    prohibitedPermissions: ['platform.ai.cross_tenant_operate', 'platform.test_lab.manage'],
    workflow_profile: 'platform_admin',
    purpose: 'Platform administrator without cross-tenant AI permission.',
    non_production: true,
  },
];

// ── @deprecated TEST_IDENTITIES — migration-only alias ───────
// TEST_IDENTITIES is retained ONLY for backward-compatible imports
// during migration. It points to the SAME array as TEST_PERSONAS.
// All new code MUST use TEST_PERSONAS.
// Remove this export after all consumers have migrated.
// @deprecated Use TEST_PERSONAS — migration-only
export const TEST_IDENTITIES = TEST_PERSONAS;

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
export const NORMAL_APPROVAL_TTL_HOURS = 24;
export const SANDBOX_TEST_TTL_MIN_MINUTES = 1;
export const SANDBOX_TEST_TTL_MAX_MINUTES = 10;
export const SANDBOX_TEST_TTL_DEFAULT_MINUTES = 2;

// ── SERVER TTL POLICY (Build #28.2P-R.0R.1) ───────────────────
export const SERVER_TTL_POLICY = {
  'approve_to_execute': SANDBOX_TEST_TTL_DEFAULT_MINUTES,
  'cross_tenant_execution': 3,
  'worker_approval_denial': 2,
  'concurrent_decision': 2,
  'replay_single_use': 1,
  'expiry_test': 1,
};

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
  if (record.is_test === true) return true;
  if (record.metadata?.environment === 'test' && record.metadata?.created_by_test === true) return true;
  return false;
}

// ── @deprecated EMAIL-BASED HELPERS (Build #28.2Q-ZE.1) ───────
// These functions are DEPRECATED. The zero-email architecture
// does NOT use email for persona authority or fixture lookup.
// They always return false/null — no email is allowlisted.
// Use getPersonaByKey() or getPersonaByFixtureKey() instead.
// @deprecated Use getPersonaByKey — zero-email migration
export function isAllowlistedTestAlias(_email) {
  return false;
}

// @deprecated Use getPersonaByKey — zero-email migration
export function getTestIdentity(_email) {
  return null;
}

// ── CANONICAL PERSONA LOOKUP (Build #28.2Q-ZE.1) ──────────────
// Server-side persona lookup by persona_key — the canonical method.
export function getPersonaByKey(personaKey) {
  return TEST_PERSONAS.find(t => t.persona_key === personaKey) || null;
}

// Server-side persona lookup by employee_fixture_key.
export function getPersonaByFixtureKey(fixtureKey) {
  return TEST_PERSONAS.find(t => t.employee_fixture_key === fixtureKey) || null;
}

// ── VALIDATION HELPERS ────────────────────────────────────────
export function isValidTestTtlMinutes(minutes) {
  return typeof minutes === 'number' && minutes >= SANDBOX_TEST_TTL_MIN_MINUTES && minutes <= SANDBOX_TEST_TTL_MAX_MINUTES;
}

// ── OPERATION LIFECYCLE STATES (Build #28.2P-R.0R.1B) ─────────
export const OPERATION_LIFECYCLE_STATES = {
  PENDING: 'pending',
  INTENT_PERSISTED: 'intent_persisted',
  MUTATION_COMPLETED: 'mutation_completed',
  COMPLETED: 'completed',
  FAILED: 'failed',
  INCOMPLETE: 'incomplete',
  RECONCILED: 'reconciled',
};

export const OPERATION_INTENT_STATES = OPERATION_LIFECYCLE_STATES;

export const OPERATION_LOOKUP_STATES = {
  CLEAR: 'clear',
  BLOCKED: 'blocked',
  UNAVAILABLE: 'unavailable',
};

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

// ── VERIFICATION RUN CAMPAIGN TYPES (Build #28.2P-R.0R.3) ──────
export const VERIFICATION_RUN_CAMPAIGN_TYPES = {
  MANUAL_LIVE_IDENTITY: 'manual_live_identity',
  AUTOMATED_POLICY_MATRIX: 'automated_policy_matrix',
  AUTH_CANARY: 'auth_canary',
};

// ── PROOF CLASSES (Build #28.2P-R.0R.3) ───────────────────────
export const PROOF_CLASSES = {
  POLICY_UNIT: 'POLICY_UNIT',
  BACKEND_INTEGRATION: 'BACKEND_INTEGRATION',
  RLS: 'RLS',
  REAL_AUTH: 'REAL_AUTH',
};

// ── VERIFICATION RESULT STATUSES (Build #28.2P-R.0R.3) ────────
export const VERIFICATION_RESULT_STATUSES = {
  PASS: 'pass',
  FAIL: 'fail',
  BLOCKED: 'blocked',
  UNVERIFIED: 'unverified',
  NOT_APPLICABLE: 'not_applicable',
};

// ── MATRIX VERSION (Build #28.2Q-ZE.1) ───────────────────────
export const MATRIX_VERSION = '0R.3.1';

// ── CANONICAL PERSONA KEYS (Build #28.2P-R.0R.3) ──────────────
export const PERSONA_KEYS = [
  'tenant_a_requester', 'tenant_a_approver', 'tenant_a_leader', 'tenant_a_worker',
  'tenant_b_admin', 'tenant_b_worker',
  'platform_allowed', 'platform_denied',
];

// ── VERIFICATION MATRIX TARGET KEY (Build #28.2P-R.0R.3) ──────
export function targetKeyForVerificationMatrix(verificationRunId) {
  return `vmatrix:${verificationRunId}`;
}

// ── CANONICAL TARGET KEY GENERATORS (Build #28.2P-R.0R.1B) ────
export const TARGET_TYPES = {
  SANDBOX_TENANT: 'sandbox_tenant',
  TEST_MEMBERSHIP: 'test_membership',
  TEST_PERMISSION: 'test_permission',
  TEST_ATTESTATION: 'test_attestation',
  TEST_RUN: 'test_run',
  TEST_RESET: 'test_reset',
  VERIFICATION_RUN: 'verification_run',
  VERIFICATION_ACTIVATION: 'verification_activation',
  VERIFICATION_MATRIX: 'verification_matrix',
};

export function targetKeyForSandboxTenant() {
  return TENANT_B_TEST_LAB_KEY;
}

// Build #28.2Q-ZE.1 — Uses fixtureKey instead of email alias
export function targetKeyForMembership(tenantId, fixtureKey) {
  return `${tenantId}:${fixtureKey}`;
}

export function targetKeyForPermission(userId) {
  return `${userId}:${CROSS_TENANT_AI_PERMISSION}`;
}

// @deprecated TestLabAttestation is legacy email-specific evidence.
// Kept for historical readability only — not used for new campaigns.
export function targetKeyForAttestation(alias, checkKey) {
  return `${alias}:${checkKey}`;
}

// Build #28.2Q-ZE.1 — Uses personaKey instead of requesterEmail
export function targetKeyForTestRun(verificationRunId, sandboxTenantId, requesterPersonaKey, serviceKey, testTag) {
  return `${verificationRunId}:${sandboxTenantId}:${requesterPersonaKey}:${serviceKey}:${testTag}`;
}

export function targetKeyForReset(tenantId, testRunId) {
  return `${tenantId}:${testRunId}`;
}

export function targetKeyForVerificationRun(verificationRunId) {
  return `vrun:${verificationRunId}`;
}

export function targetKeyForVerificationActivation() {
  return 'global';
}

export function lockKeyForTarget(targetType, targetKey) {
  return `${targetType}:${targetKey}`;
}

// ── OPERATION ID GENERATOR (Build #28.2P-R.0R.1B) ────────────
export function generateOperationId() {
  return `tlop_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

// ── VERIFICATION RUN ID GENERATOR (Build #28.2P-R.0R.1B) ──────
export function generateVerificationRunId() {
  return `vrun_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

// ── BOOTSTRAP STATE (Build #28.2P-R.0R.1) ────────────────────
export const BOOTSTRAP_STATE = {
  PERMANENTLY_DISABLED: 'permanently_disabled',
  DISABLED_CODE: 'bootstrap_disabled',
};

// ── ROLE RESOLUTION ────────────────────────────────────────────
export function resolveWorkspaceRoute(userRole) {
  if (userRole === 'admin') return '/leader-org';
  if (userRole === 'user') return '/workspace';
  return '/workspace';
}

export function isPlatformAdmin(userRole) {
  return userRole === 'admin';
}

// ── @deprecated IDENTITY READINESS STATES ─────────────────────
// Legacy email-verification readiness states. Retained for
// historical reference only — not used by zero-email campaigns.
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

// ── @deprecated EMAIL DELIVERY ATTESTATION CHECKS ─────────────
// Legacy email-delivery attestation checks. Retained for
// historical reference only — TestLabAttestation is legacy.
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
export function productionExclusionFilter() {
  return { is_test: { $ne: true } };
}

export function isProductionRecord(record) {
  if (!record) return false;
  if (record.is_test === true) return false;
  if (record.non_production === true) return false;
  if (record.metadata?.environment === 'test') return false;
  if (record.metadata?.created_by_test === true) return false;
  if (record.metadata?.non_production === true) return false;
  if (record.metadata?.test_run_id) return false;
  if (record.service_key && record.metadata?.test_tag) return false;
  return true;
}

// ── COMPREHENSIVE PRODUCTION EXCLUSION ────────────────────────
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

export function containsTestRecords(records) {
  if (!records || !Array.isArray(records)) return false;
  return records.some(r => !isProductionRecord(r));
}