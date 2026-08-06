// ============================================================
// ORBITAN TEST LAB — Canonical Configuration (Build #28.2P-R.0)
//
// Single source of truth for the internal Orbitan Test Lab Setup
// capability. Defines the fixed test-identity allowlist, canonical
// role mapping, test-run tagging standard, and sandbox-only TTL
// configuration.
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

// ── FIXED TEST-IDENTITY ALLOWLIST ──────────────────────────────
// Only these exact email aliases may be managed by the Test Lab
// capability. No arbitrary user IDs or aliases are accepted.
export interface TestIdentityConfig {
  email: string;
  label: string;
  tenant: 'A' | 'B' | 'platform';
  userRole: 'admin';
  employeeRole: 'worker' | 'tenant_admin' | 'outlet_manager';
  outletRequired: boolean;
  requiresCrossTenantPermission: boolean;
  prohibitedPermissions: string[];
  purpose: string;
}

export const TEST_IDENTITIES: TestIdentityConfig[] = [
  {
    email: 'test.requester.a@orbitan.net',
    label: 'Tenant A Requester',
    tenant: 'A',
    userRole: 'admin',
    employeeRole: 'worker',
    outletRequired: true,
    requiresCrossTenantPermission: false,
    prohibitedPermissions: [CROSS_TENANT_AI_PERMISSION, TEST_LAB_PERMISSION],
    purpose: 'Submits owned AI approval requests. Cannot self-approve.',
  },
  {
    email: 'test.approver.a@orbitan.net',
    label: 'Tenant A Approver',
    tenant: 'A',
    userRole: 'admin',
    employeeRole: 'tenant_admin',
    outletRequired: true,
    requiresCrossTenantPermission: false,
    prohibitedPermissions: [CROSS_TENANT_AI_PERMISSION, TEST_LAB_PERMISSION],
    purpose: 'Independent authorised approver for Tenant A test requests.',
  },
  {
    email: 'test.leader.a@orbitan.net',
    label: 'Tenant A Leader/Manager',
    tenant: 'A',
    userRole: 'admin',
    employeeRole: 'outlet_manager',
    outletRequired: true,
    requiresCrossTenantPermission: false,
    prohibitedPermissions: [CROSS_TENANT_AI_PERMISSION, TEST_LAB_PERMISSION],
    purpose: 'Canonical operational leadership role. No platform authority.',
  },
  {
    email: 'test.worker.a@orbitan.net',
    label: 'Tenant A Second Worker',
    tenant: 'A',
    userRole: 'admin',
    employeeRole: 'worker',
    outletRequired: true,
    requiresCrossTenantPermission: false,
    prohibitedPermissions: [CROSS_TENANT_AI_PERMISSION, TEST_LAB_PERMISSION],
    purpose: 'Separate from requester. Used for ownership-isolation testing.',
  },
  {
    email: 'test.admin.b@orbitan.net',
    label: 'Tenant B Administrator',
    tenant: 'B',
    userRole: 'admin',
    employeeRole: 'tenant_admin',
    outletRequired: true,
    requiresCrossTenantPermission: false,
    prohibitedPermissions: [CROSS_TENANT_AI_PERMISSION, TEST_LAB_PERMISSION],
    purpose: 'Tenant administration within Tenant B only.',
  },
  {
    email: 'test.worker.b@orbitan.net',
    label: 'Tenant B Worker',
    tenant: 'B',
    userRole: 'admin',
    employeeRole: 'worker',
    outletRequired: true,
    requiresCrossTenantPermission: false,
    prohibitedPermissions: [CROSS_TENANT_AI_PERMISSION, TEST_LAB_PERMISSION],
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
    prohibitedPermissions: [TEST_LAB_PERMISSION],
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
    prohibitedPermissions: [CROSS_TENANT_AI_PERMISSION, TEST_LAB_PERMISSION],
    purpose: 'Platform administrator without cross-tenant AI permission.',
  },
];

// ── SANDBOX TENANT CONFIGURATION ───────────────────────────────
export const TENANT_A_ID = '6a4eeb6992cc657b66ec24cc';
export const TENANT_A_NAME = 'Orbitan Test Lab';
export const TENANT_B_NAME = 'Orbitan Test Lab B';

export const SANDBOX_TENANT_DEFAULTS = {
  is_sandbox: true,
  status: 'active' as const,
  subscription_plan: 'orbitan_free' as const,
  industry: 'food_beverage' as const,
  currency: 'SGD' as const,
  country: 'Singapore' as const,
  max_employees: 10,
  is_pilot_tenant: false,
  onboarding_completed: true,
  enabled_modules: ['task', 'inventory', 'compliance', 'workforce'],
  enabled_packs: ['fnb'],
  governance_domain: 'fnb_standard_ops',
  manifest_key: 'fnb_ops_v1',
};

// ── SANDBOX-ONLY SHORT TTL ────────────────────────────────────
// Used only when Tenant.is_sandbox=true and the request is a
// tagged test request. Production tenants always use the normal
// 24-hour TTL.
export const NORMAL_APPROVAL_TTL_HOURS = 24;
export const SANDBOX_TEST_TTL_MIN_MINUTES = 1;
export const SANDBOX_TEST_TTL_MAX_MINUTES = 10;
export const SANDBOX_TEST_TTL_DEFAULT_MINUTES = 2;

// ── TEST-RUN TAGGING STANDARD ──────────────────────────────────
export interface TestRunMetadata {
  environment: 'test';
  test_run_id: string;
  test_tag: string;
  sandbox_tenant_id: string;
  created_by_test: true;
  non_production: true;
  test_purpose: string;
  created_by_actor_id: string;
}

export function isTestTagged(metadata: any): boolean {
  return metadata?.environment === 'test' && metadata?.created_by_test === true;
}

export function createTestRunMetadata(params: {
  testRunId: string;
  testTag: string;
  sandboxTenantId: string;
  testPurpose: string;
  actorId: string;
}): TestRunMetadata {
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

// ── VALIDATION HELPERS ────────────────────────────────────────
export function isAllowlistedTestAlias(email: string): boolean {
  return TEST_IDENTITIES.some(t => t.email === email);
}

export function getTestIdentity(email: string): TestIdentityConfig | null {
  return TEST_IDENTITIES.find(t => t.email === email) || null;
}

export function isValidTestTtlMinutes(minutes: number): boolean {
  return minutes >= SANDBOX_TEST_TTL_MIN_MINUTES && minutes <= SANDBOX_TEST_TTL_MAX_MINUTES;
}

// ── IDENTITY READINESS STATES ──────────────────────────────────
export type IdentityReadinessState =
  | 'ALIAS_CONFIGURED'
  | 'DELIVERY_VERIFICATION_PENDING'
  | 'DELIVERY_VERIFIED'
  | 'MEMBERSHIP_PREPARED'
  | 'INVITATION_PENDING'
  | 'INVITED'
  | 'REGISTERED'
  | 'EMAIL_VERIFICATION_REQUIRED'
  | 'EMAIL_VERIFIED'
  | 'IDENTITY_LINKED'
  | 'SESSION_VERIFICATION_REQUIRED'
  | 'READY'
  | 'BLOCKED'
  | 'DISABLED';

// ── EMAIL DELIVERY ATTESTATION CHECKS ──────────────────────────
export const EMAIL_ATTESTATION_CHECKS = [
  'ordinary_test_email_received',
  'recipient_alias_preserved',
  'invitation_email_received',
  'verification_email_received',
  'password_reset_email_received',
  'catch_all_did_not_drop',
  'private_destination_hidden',
] as const;

export type EmailAttestationCheck = typeof EMAIL_ATTESTATION_CHECKS[number];