// ============================================================
// Test Lab Hardening Tests (Build #28.2P-R.0R — Repair)
//
// Imports from the CANONICAL production module — no mirrored
// constants or duplicated logic. These tests exercise the same
// code that runs in production.
//
// Canonical source: base44/shared/test-lab-config.js
// ============================================================

import {
  TEST_IDENTITIES, TEST_LAB_PERMISSION, CROSS_TENANT_AI_PERMISSION,
  TENANT_A_ID, TENANT_B_NAME, TENANT_B_TEST_LAB_KEY,
  NORMAL_APPROVAL_TTL_HOURS,
  SANDBOX_TEST_TTL_MIN_MINUTES, SANDBOX_TEST_TTL_MAX_MINUTES,
  SANDBOX_TEST_TTL_DEFAULT_MINUTES,
  EMAIL_ATTESTATION_CHECKS, IDENTITY_READINESS_STATES,
  isAllowlistedTestAlias, getTestIdentity, isValidTestTtlMinutes,
  createTestRunMetadata, isTestTagged,
  isPlatformAdmin, resolveWorkspaceRoute,
  productionExclusionFilter, isProductionRecord,
} from '../../../base44/shared/test-lab-config.js';

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

// ── 2. CANONICAL ROLE MAPPING (SECURITY FIX) ──────────────────
console.log('\n=== Canonical Role Mapping (Security Fix) ===');

// Tenant identities MUST use User.role='user'
const tenantIdentities = TEST_IDENTITIES.filter(t => t.tenant !== 'platform');
const platformIdentities = TEST_IDENTITIES.filter(t => t.tenant === 'platform');

for (const identity of tenantIdentities) {
  assert(identity.userRole === 'user', `${identity.email} has userRole='user' (not admin)`);
}

for (const identity of platformIdentities) {
  assert(identity.userRole === 'admin', `${identity.email} has userRole='admin' (platform identity)`);
}

// A test Worker is never a platform admin
const testWorker = getTestIdentity('test.worker.a@orbitan.net');
assert(testWorker.userRole === 'user', 'Test Worker A is NOT a platform admin (User.role=user)');
assert(!isPlatformAdmin(testWorker.userRole), 'isPlatformAdmin returns false for Worker');

// A tenant administrator is not a platform admin
const tenantAdmin = getTestIdentity('test.admin.b@orbitan.net');
assert(tenantAdmin.userRole === 'user', 'Tenant Admin B is NOT a platform admin (User.role=user)');
assert(!isPlatformAdmin(tenantAdmin.userRole), 'isPlatformAdmin returns false for tenant admin');

// Only platform identities are platform admins
const platformAllowed = getTestIdentity('test.platform.allowed@orbitan.net');
assert(platformAllowed.userRole === 'admin', 'Platform Allowed IS a platform admin');
assert(isPlatformAdmin(platformAllowed.userRole), 'isPlatformAdmin returns true for platform identity');

const platformDenied = getTestIdentity('test.platform.denied@orbitan.net');
assert(platformDenied.userRole === 'admin', 'Platform Denied IS a platform admin');
assert(isPlatformAdmin(platformDenied.userRole), 'isPlatformAdmin returns true for platform identity');

// ── 3. WORKSPACE ROUTE RESOLUTION ─────────────────────────────
console.log('\n=== Workspace Route Resolution ===');

// Worker resolves to /worker (via RoleGateway → /workspace)
assert(resolveWorkspaceRoute('user') === '/workspace', 'Worker (user) resolves to /workspace');

// Platform admin resolves to /leader-org
assert(resolveWorkspaceRoute('admin') === '/leader-org', 'Platform admin resolves to /leader-org');

// Worker and tenant identities cannot open platform routes
const workerRoute = resolveWorkspaceRoute(testWorker.userRole);
assert(workerRoute !== '/leader-org', 'Worker does NOT resolve to /leader-org');

const adminBRoute = resolveWorkspaceRoute(tenantAdmin.userRole);
assert(adminBRoute !== '/leader-org', 'Tenant admin does NOT resolve to /leader-org');

// Only platform identities resolve to /leader-org
const allowedRoute = resolveWorkspaceRoute(platformAllowed.userRole);
assert(allowedRoute === '/leader-org', 'Platform allowed resolves to /leader-org');

// ── 4. EMPLOYEE ROLE MAPPING ───────────────────────────────────
console.log('\n=== Employee Role Mapping ===');

assert(getTestIdentity('test.requester.a@orbitan.net').employeeRole === 'worker', 'Requester is worker');
assert(getTestIdentity('test.approver.a@orbitan.net').employeeRole === 'tenant_admin', 'Approver is tenant_admin');
assert(getTestIdentity('test.leader.a@orbitan.net').employeeRole === 'outlet_manager', 'Leader is outlet_manager');
assert(getTestIdentity('test.worker.a@orbitan.net').employeeRole === 'worker', 'Worker A is worker');
assert(getTestIdentity('test.admin.b@orbitan.net').employeeRole === 'tenant_admin', 'Admin B is tenant_admin');
assert(getTestIdentity('test.worker.b@orbitan.net').employeeRole === 'worker', 'Worker B is worker');

// ── 5. CROSS-TENANT PERMISSION ────────────────────────────────
console.log('\n=== Cross-Tenant Permission ===');

assert(CROSS_TENANT_AI_PERMISSION === 'platform.ai.cross_tenant_operate', 'Permission string matches canonical');
assert(TEST_LAB_PERMISSION === 'platform.test_lab.manage', 'Test lab permission string');

const allowedCount = TEST_IDENTITIES.filter(t => t.requiresCrossTenantPermission).length;
assert(allowedCount === 1, 'Exactly 1 identity requires cross-tenant permission');
assert(TEST_IDENTITIES.find(t => t.requiresCrossTenantPermission).email === 'test.platform.allowed@orbitan.net', 'Correct identity requires cross-tenant');

// ── 6. SANDBOX TENANT CONSTANTS ────────────────────────────────
console.log('\n=== Sandbox Tenant Constants ===');

assert(TENANT_A_ID === '6a4eeb6992cc657b66ec24cc', 'Tenant A ID matches existing');
assert(TENANT_B_NAME === 'Orbitan Test Lab B', 'Tenant B name is canonical');
assert(TENANT_B_TEST_LAB_KEY === 'TEST_LAB_B', 'Tenant B test lab key is canonical');

// ── 7. SANDBOX TTL VALIDATION ──────────────────────────────────
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
assert(!isValidTestTtlMinutes('5'), 'String input rejected');
assert(!isValidTestTtlMinutes(null), 'Null rejected');
assert(!isValidTestTtlMinutes(undefined), 'Undefined rejected');

// ── 8. TEST-RUN TAGGING STANDARD ──────────────────────────────
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

// Test tagging detection (schema-supported fields)
assert(isTestTagged({ is_test: true }), 'Schema field is_test=true detected as tagged');
assert(isTestTagged({ is_test: true, test_run_id: 'x' }), 'Schema fields detected');
assert(!isTestTagged({ is_test: false }), 'is_test=false not tagged');
assert(!isTestTagged({}), 'Empty object not tagged');
assert(!isTestTagged(null), 'Null not tagged');
assert(!isTestTagged({ environment: 'production' }), 'Production metadata not tagged');

// Fallback: metadata-based detection (for legacy records)
assert(isTestTagged({ metadata: { environment: 'test', created_by_test: true } }), 'Legacy metadata detected as tagged');
assert(!isTestTagged({ metadata: { environment: 'test' } }), 'Legacy metadata without created_by_test not tagged');

// ── 9. EMAIL ATTESTATION CHECKS ───────────────────────────────
console.log('\n=== Email Attestation Checks ===');

assert(EMAIL_ATTESTATION_CHECKS.length === 7, 'Exactly 7 attestation checks');
assert(EMAIL_ATTESTATION_CHECKS.includes('ordinary_test_email_received'), 'Ordinary email check exists');
assert(EMAIL_ATTESTATION_CHECKS.includes('private_destination_hidden'), 'Private destination hidden check exists');
assert(EMAIL_ATTESTATION_CHECKS.includes('catch_all_did_not_drop'), 'Catch-all check exists');

// ── 10. ANALYTICS EXCLUSION ────────────────────────────────────
console.log('\n=== Analytics Exclusion ===');

// Production exclusion filter helper
const filter = productionExclusionFilter();
assert(filter.is_test?.$ne === true, 'Exclusion filter excludes is_test=true');

// Production record is included
assert(isProductionRecord({ name: 'test', is_test: false }), 'Production record included');
assert(isProductionRecord({ name: 'test' }), 'Record without test fields included as production');

// Tagged test record is excluded
assert(!isProductionRecord({ is_test: true }), 'Tagged test record excluded');
assert(!isProductionRecord({ non_production: true }), 'Non-production record excluded');
assert(!isProductionRecord({ metadata: { environment: 'test' } }), 'Legacy metadata test record excluded');
assert(!isProductionRecord(null), 'Null record excluded');

// ── 11. IDENTITY READINESS STATES ─────────────────────────────
console.log('\n=== Identity Readiness States ===');

assert(IDENTITY_READINESS_STATES.includes('ALIAS_CONFIGURED'), 'ALIAS_CONFIGURED state exists');
assert(IDENTITY_READINESS_STATES.includes('READY'), 'READY state exists');
assert(IDENTITY_READINESS_STATES.includes('BLOCKED'), 'BLOCKED state exists');
assert(IDENTITY_READINESS_STATES.length >= 10, 'At least 10 readiness states defined');

// ── 12. SECURITY: NO GENERIC EDITOR ────────────────────────────
console.log('\n=== Security: No Generic Editor ===');

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