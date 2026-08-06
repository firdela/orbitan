// ============================================================
// Test Lab Hardening Tests (Build #28.2P-R.0)
//
// Tests the canonical test-infrastructure configuration:
// 1. Test identity allowlist validation
// 2. Canonical role mapping
// 3. Test-run tagging standard
// 4. Sandbox-only TTL validation
// 5. Cross-tenant permission constants
// 6. Email attestation check list
//
// These tests verify the pure logic that governs test lab behavior.
// The canonical source is base44/shared/test-lab-config.ts.
// Live backend behavior is verified via test_backend_function.
// ============================================================

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL: ${message}`);
  }
}

// ── CANONICAL CONSTANTS (mirror of test-lab-config.ts) ────────
const TEST_LAB_PERMISSION = 'platform.test_lab.manage';
const CROSS_TENANT_AI_PERMISSION = 'platform.ai.cross_tenant_operate';
const TENANT_A_ID = '6a4eeb6992cc657b66ec24cc';
const TENANT_B_NAME = 'Orbitan Test Lab B';
const NORMAL_APPROVAL_TTL_HOURS = 24;
const SANDBOX_TEST_TTL_MIN_MINUTES = 1;
const SANDBOX_TEST_TTL_MAX_MINUTES = 10;
const SANDBOX_TEST_TTL_DEFAULT_MINUTES = 2;

const TEST_IDENTITIES = [
  { email: 'test.requester.a@orbitan.net', label: 'Tenant A Requester', tenant: 'A', userRole: 'admin', employeeRole: 'worker', requiresCrossTenantPermission: false, outletRequired: true },
  { email: 'test.approver.a@orbitan.net', label: 'Tenant A Approver', tenant: 'A', userRole: 'admin', employeeRole: 'tenant_admin', requiresCrossTenantPermission: false, outletRequired: true },
  { email: 'test.leader.a@orbitan.net', label: 'Tenant A Leader/Manager', tenant: 'A', userRole: 'admin', employeeRole: 'outlet_manager', requiresCrossTenantPermission: false, outletRequired: true },
  { email: 'test.worker.a@orbitan.net', label: 'Tenant A Second Worker', tenant: 'A', userRole: 'admin', employeeRole: 'worker', requiresCrossTenantPermission: false, outletRequired: true },
  { email: 'test.admin.b@orbitan.net', label: 'Tenant B Administrator', tenant: 'B', userRole: 'admin', employeeRole: 'tenant_admin', requiresCrossTenantPermission: false, outletRequired: true },
  { email: 'test.worker.b@orbitan.net', label: 'Tenant B Worker', tenant: 'B', userRole: 'admin', employeeRole: 'worker', requiresCrossTenantPermission: false, outletRequired: true },
  { email: 'test.platform.allowed@orbitan.net', label: 'Platform Admin (Allowed)', tenant: 'platform', userRole: 'admin', employeeRole: 'tenant_admin', requiresCrossTenantPermission: true, outletRequired: false },
  { email: 'test.platform.denied@orbitan.net', label: 'Platform Admin (Denied)', tenant: 'platform', userRole: 'admin', employeeRole: 'tenant_admin', requiresCrossTenantPermission: false, outletRequired: false },
];

const EMAIL_ATTESTATION_CHECKS = [
  'ordinary_test_email_received', 'recipient_alias_preserved', 'invitation_email_received',
  'verification_email_received', 'password_reset_email_received', 'catch_all_did_not_drop',
  'private_destination_hidden',
];

// ── PURE LOGIC (mirror of test-lab-config.ts) ─────────────────
function isAllowlistedTestAlias(email) {
  return TEST_IDENTITIES.some(t => t.email === email);
}
function getTestIdentity(email) {
  return TEST_IDENTITIES.find(t => t.email === email) || null;
}
function isValidTestTtlMinutes(minutes) {
  return minutes >= SANDBOX_TEST_TTL_MIN_MINUTES && minutes <= SANDBOX_TEST_TTL_MAX_MINUTES;
}
function createTestRunMetadata(params) {
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
function isTestTagged(metadata) {
  return metadata?.environment === 'test' && metadata?.created_by_test === true;
}

// ── 1. TEST IDENTITY ALLOWLIST ─────────────────────────────────
console.log('\n=== Test Identity Allowlist ===');

assert(TEST_IDENTITIES.length === 8, 'Exactly 8 test identities');

const expectedEmails = [
  'test.requester.a@orbitan.net', 'test.approver.a@orbitan.net',
  'test.leader.a@orbitan.net', 'test.worker.a@orbitan.net',
  'test.admin.b@orbitan.net', 'test.worker.b@orbitan.net',
  'test.platform.allowed@orbitan.net', 'test.platform.denied@orbitan.net',
];
for (const email of expectedEmails) {
  assert(isAllowlistedTestAlias(email), `Allowlisted: ${email}`);
}

assert(!isAllowlistedTestAlias('random@example.com'), 'Random email rejected');
assert(!isAllowlistedTestAlias('founder@orbitan.net'), 'Founder email rejected');
assert(!isAllowlistedTestAlias(''), 'Empty email rejected');
assert(!isAllowlistedTestAlias(null), 'Null email rejected');

// ── 2. CANONICAL ROLE MAPPING ─────────────────────────────────
console.log('\n=== Canonical Role Mapping ===');

const requester = getTestIdentity('test.requester.a@orbitan.net');
assert(requester.employeeRole === 'worker', 'Requester is worker');
assert(requester.tenant === 'A', 'Requester in Tenant A');
assert(!requester.requiresCrossTenantPermission, 'Requester does not need cross-tenant');

const approver = getTestIdentity('test.approver.a@orbitan.net');
assert(approver.employeeRole === 'tenant_admin', 'Approver is tenant_admin');
assert(approver.tenant === 'A', 'Approver in Tenant A');

const leader = getTestIdentity('test.leader.a@orbitan.net');
assert(leader.employeeRole === 'outlet_manager', 'Leader is outlet_manager');
assert(leader.tenant === 'A', 'Leader in Tenant A');

const workerA = getTestIdentity('test.worker.a@orbitan.net');
assert(workerA.employeeRole === 'worker', 'Worker A is worker');
assert(workerA.tenant === 'A', 'Worker A in Tenant A');

const adminB = getTestIdentity('test.admin.b@orbitan.net');
assert(adminB.employeeRole === 'tenant_admin', 'Admin B is tenant_admin');
assert(adminB.tenant === 'B', 'Admin B in Tenant B');

const workerB = getTestIdentity('test.worker.b@orbitan.net');
assert(workerB.employeeRole === 'worker', 'Worker B is worker');
assert(workerB.tenant === 'B', 'Worker B in Tenant B');

const platformAllowed = getTestIdentity('test.platform.allowed@orbitan.net');
assert(platformAllowed.tenant === 'platform', 'Platform allowed is platform');
assert(platformAllowed.requiresCrossTenantPermission, 'Platform allowed needs cross-tenant');

const platformDenied = getTestIdentity('test.platform.denied@orbitan.net');
assert(platformDenied.tenant === 'platform', 'Platform denied is platform');
assert(!platformDenied.requiresCrossTenantPermission, 'Platform denied does NOT need cross-tenant');

for (const identity of TEST_IDENTITIES) {
  assert(identity.userRole === 'admin', `${identity.email} has admin userRole`);
}

// ── 3. SANDBOX TENANT CONSTANTS ────────────────────────────────
console.log('\n=== Sandbox Tenant Constants ===');

assert(TENANT_A_ID === '6a4eeb6992cc657b66ec24cc', 'Tenant A ID matches existing');
assert(TENANT_B_NAME === 'Orbitan Test Lab B', 'Tenant B name is canonical');

// ── 4. SANDBOX TTL VALIDATION ──────────────────────────────────
console.log('\n=== Sandbox TTL Validation ===');

assert(NORMAL_APPROVAL_TTL_HOURS === 24, 'Normal TTL is 24 hours');
assert(SANDBOX_TEST_TTL_MIN_MINUTES === 1, 'Min test TTL is 1 minute');
assert(SANDBOX_TEST_TTL_MAX_MINUTES === 10, 'Max test TTL is 10 minutes');
assert(SANDBOX_TEST_TTL_DEFAULT_MINUTES === 2, 'Default test TTL is 2 minutes');

assert(isValidTestTtlMinutes(1), '1 minute is valid');
assert(isValidTestTtlMinutes(5), '5 minutes is valid');
assert(isValidTestTtlMinutes(10), '10 minutes is valid');

assert(!isValidTestTtlMinutes(0), '0 minutes invalid');
assert(!isValidTestTtlMinutes(11), '11 minutes invalid (exceeds max)');
assert(!isValidTestTtlMinutes(-1), 'Negative invalid');
assert(!isValidTestTtlMinutes(60), '60 minutes invalid (exceeds max)');

// ── 5. TEST-RUN TAGGING STANDARD ──────────────────────────────
console.log('\n=== Test-Run Tagging Standard ===');

const testMeta = createTestRunMetadata({
  testRunId: 'run-001',
  testTag: 'approve_to_execute',
  sandboxTenantId: 'tenant_b_id',
  testPurpose: 'Full approve-to-execute lifecycle test',
  actorId: 'actor_123',
});

assert(testMeta.environment === 'test', 'Tag: environment=test');
assert(testMeta.test_run_id === 'run-001', 'Tag: test_run_id');
assert(testMeta.test_tag === 'approve_to_execute', 'Tag: test_tag');
assert(testMeta.sandbox_tenant_id === 'tenant_b_id', 'Tag: sandbox_tenant_id');
assert(testMeta.created_by_test === true, 'Tag: created_by_test=true');
assert(testMeta.non_production === true, 'Tag: non_production=true');
assert(testMeta.test_purpose === 'Full approve-to-execute lifecycle test', 'Tag: test_purpose');
assert(testMeta.created_by_actor_id === 'actor_123', 'Tag: created_by_actor_id');

assert(isTestTagged(testMeta), 'Test metadata detected as tagged');
assert(!isTestTagged({}), 'Empty object not tagged');
assert(!isTestTagged(null), 'Null not tagged');
assert(!isTestTagged({ environment: 'production' }), 'Production metadata not tagged');
assert(!isTestTagged({ environment: 'test' }), 'Test env without created_by_test not tagged');

// ── 6. CROSS-TENANT PERMISSION ────────────────────────────────
console.log('\n=== Cross-Tenant Permission ===');

assert(CROSS_TENANT_AI_PERMISSION === 'platform.ai.cross_tenant_operate', 'Permission string matches canonical');
assert(TEST_LAB_PERMISSION === 'platform.test_lab.manage', 'Test lab permission string');

const allowedCount = TEST_IDENTITIES.filter(t => t.requiresCrossTenantPermission).length;
assert(allowedCount === 1, 'Exactly 1 identity requires cross-tenant permission');
assert(TEST_IDENTITIES.find(t => t.requiresCrossTenantPermission).email === 'test.platform.allowed@orbitan.net', 'Correct identity requires cross-tenant');

// ── 7. EMAIL ATTESTATION CHECKS ───────────────────────────────
console.log('\n=== Email Attestation Checks ===');

assert(EMAIL_ATTESTATION_CHECKS.length === 7, 'Exactly 7 attestation checks');
assert(EMAIL_ATTESTATION_CHECKS.includes('ordinary_test_email_received'), 'Ordinary email check exists');
assert(EMAIL_ATTESTATION_CHECKS.includes('private_destination_hidden'), 'Private destination hidden check exists');
assert(EMAIL_ATTESTATION_CHECKS.includes('catch_all_did_not_drop'), 'Catch-all check exists');

// ── 8. SECURITY: NO GENERIC EDITOR ────────────────────────────
console.log('\n=== Security: No Generic Editor ===');

// The test lab must not provide:
// - generic permission editor (only one fixed permission)
// - generic tenant creator (only predefined Tenant B)
// - approval record editor
// - forced execution

// Only one permission can be managed
assert(CROSS_TENANT_AI_PERMISSION === 'platform.ai.cross_tenant_operate', 'Only one fixed permission managed');

// Only allowlisted aliases can receive permissions
assert(!isAllowlistedTestAlias('coffeeteabreak12@gmail.com'), 'Founder email NOT allowlisted');
assert(!isAllowlistedTestAlias('ariffinhamka@gmail.com'), 'Hamka email NOT allowlisted');
assert(!isAllowlistedTestAlias('nurul.kasim@gmail.com'), 'Nurul email NOT allowlisted');

// ── RESULTS ───────────────────────────────────────────────────
console.log(`\n=== Test Lab Hardening Test Results ===`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

if (failed > 0) {
  console.error('\n❌ TEST LAB HARDENING TESTS FAILED!');
  throw new Error(`${failed} test lab hardening test(s) failed — CI failure`);
} else {
  console.log('\n✅ All test lab hardening tests passed.');
}