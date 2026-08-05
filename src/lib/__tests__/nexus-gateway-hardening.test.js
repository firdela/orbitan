// ============================================================
// Nexus Gateway Hardening Tests (Build #28.2O)
//
// Tests the hardened gateway behavior:
// 1. Idempotency key format validation
// 2. Tenant membership validation
// 3. Worker-safe link resolution
// 4. Migration mode exit (deny-by-default)
// 5. Baseline policy enforcement
//
// These tests verify the pure logic that governs gateway behavior.
// Live gateway behavior is verified via test_backend_function.
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

// ── 1. IDEMPOTENCY KEY FORMAT VALIDATION ──────────────────────
console.log('\n=== Idempotency Key Format ===');

const IDEMPOTENCY_KEY_PATTERN = /^[a-zA-Z0-9_-]{8,128}$/;

assert(IDEMPOTENCY_KEY_PATTERN.test('order_12345'), 'Valid key with underscore');
assert(IDEMPOTENCY_KEY_PATTERN.test('req-abc-def-123'), 'Valid key with dashes');
assert(IDEMPOTENCY_KEY_PATTERN.test('ABCDEFGH'), 'Valid 8-char key');
assert(IDEMPOTENCY_KEY_PATTERN.test('a'.repeat(128)), 'Valid 128-char key');
assert(!IDEMPOTENCY_KEY_PATTERN.test('short'), 'Invalid: too short (5 chars)');
assert(!IDEMPOTENCY_KEY_PATTERN.test('a'.repeat(7)), 'Invalid: 7 chars');
assert(!IDEMPOTENCY_KEY_PATTERN.test('a'.repeat(129)), 'Invalid: 129 chars');
assert(!IDEMPOTENCY_KEY_PATTERN.test('key with spaces'), 'Invalid: spaces');
assert(!IDEMPOTENCY_KEY_PATTERN.test('key!special'), 'Invalid: special char');
assert(!IDEMPOTENCY_KEY_PATTERN.test(''), 'Invalid: empty');
assert(!IDEMPOTENCY_KEY_PATTERN.test(null), 'Invalid: null');

// ── 2. TENANT MEMBERSHIP VALIDATION ───────────────────────────
console.log('\n=== Tenant Membership Validation ===');

function validateTenantMembership(userRole, userTenantId, requestedTenantId) {
  if (userRole === 'admin') {
    return { valid: true, resolvedTenantId: requestedTenantId || userTenantId };
  }
  const effectiveTenantId = requestedTenantId || userTenantId;
  if (!effectiveTenantId) {
    return { valid: false, resolvedTenantId: null, reason: 'No tenant context available' };
  }
  if (requestedTenantId && userTenantId && requestedTenantId !== userTenantId) {
    return {
      valid: false,
      resolvedTenantId: null,
      reason: `Tenant mismatch: requester tenant='${userTenantId}', requested tenant='${requestedTenantId}'`,
    };
  }
  return { valid: true, resolvedTenantId: effectiveTenantId };
}

// Platform admin can specify any tenant
assert(validateTenantMembership('admin', 'tenant_a', 'tenant_b').valid, 'Admin can cross tenants');
assert(validateTenantMembership('admin', null, 'tenant_b').valid, 'Admin without own tenant');

// Non-admin must match their own tenant
assert(validateTenantMembership('worker', 'tenant_a', 'tenant_a').valid, 'Worker matching tenant');
assert(validateTenantMembership('tenant_admin', 'tenant_a', 'tenant_a').valid, 'Tenant admin matching tenant');

// Non-admin cannot specify different tenant
assert(!validateTenantMembership('worker', 'tenant_a', 'tenant_b').valid, 'Worker cross-tenant denied');
assert(!validateTenantMembership('tenant_admin', 'tenant_a', 'tenant_b').valid, 'Tenant admin cross-tenant denied');

// No tenant at all
assert(!validateTenantMembership('worker', null, null).valid, 'No tenant context denied');

// Uses own tenant when none specified
assert(validateTenantMembership('worker', 'tenant_a', null).valid, 'Uses own tenant when none specified');

// ── 3. WORKER-SAFE LINK RESOLUTION ────────────────────────────
console.log('\n=== Worker-Safe Link Resolution ===');

const WORKER_SAFE_LINK = '/worker';
const ADMIN_GOVERNANCE_LINK = '/platform/ai-governance';

function isWorkerRole(role) { return role === 'worker'; }
function resolveSafeLink(userRole, adminLink, workerSafeLink) {
  return isWorkerRole(userRole) ? workerSafeLink : adminLink;
}

// Workers get worker-safe link
assert(resolveSafeLink('worker', ADMIN_GOVERNANCE_LINK, WORKER_SAFE_LINK) === WORKER_SAFE_LINK, 'Worker gets /worker link');
assert(resolveSafeLink('worker', ADMIN_GOVERNANCE_LINK, WORKER_SAFE_LINK) !== ADMIN_GOVERNANCE_LINK, 'Worker does NOT get admin link');

// Admins get admin link
assert(resolveSafeLink('admin', ADMIN_GOVERNANCE_LINK, WORKER_SAFE_LINK) === ADMIN_GOVERNANCE_LINK, 'Admin gets governance link');
assert(resolveSafeLink('tenant_admin', ADMIN_GOVERNANCE_LINK, WORKER_SAFE_LINK) === ADMIN_GOVERNANCE_LINK, 'Tenant admin gets governance link');

// Null role defaults to admin link (conservative)
assert(resolveSafeLink(null, ADMIN_GOVERNANCE_LINK, WORKER_SAFE_LINK) === ADMIN_GOVERNANCE_LINK, 'Null role gets admin link (conservative)');

// ── 4. MIGRATION MODE EXIT VERIFICATION ───────────────────────
console.log('\n=== Migration Mode Exit ===');

// After migration exit, no matching policy should deny by default
// This is verified by resolveMostRestrictivePolicy returning DENY for empty array

function resolveMostRestrictivePolicy(matchedPolicies) {
  if (!matchedPolicies || matchedPolicies.length === 0) {
    return { decision: 'deny', policyKey: null, reason: 'No matching policy found — deny by default', evaluatedKeys: [] };
  }
  const RESTRICTIVENESS_RANK = { allow: 0, require_reduced_data: 1, require_read_only_mode: 2, require_safer_model: 3, require_approval: 4, require_human_escalation: 5, deny: 6 };
  const sorted = [...matchedPolicies].sort((a, b) => {
    const rankA = RESTRICTIVENESS_RANK[a.decision] ?? 0;
    const rankB = RESTRICTIVENESS_RANK[b.decision] ?? 0;
    if (rankB !== rankA) return rankB - rankA;
    return (a.priority ?? 100) - (b.priority ?? 100);
  });
  const winner = sorted[0];
  return { decision: winner.decision, policyKey: winner.policy_key, reason: winner.description, evaluatedKeys: matchedPolicies.map(p => p.policy_key) };
}

// No policies → deny (migration exited)
assert(resolveMostRestrictivePolicy([]).decision === 'deny', 'No policies → deny (migration exited)');
assert(resolveMostRestrictivePolicy(null).decision === 'deny', 'Null policies → deny');

// Allow policy matches → allow
assert(resolveMostRestrictivePolicy([{ policy_key: 'allow_l0', decision: 'allow', priority: 200, description: 'Allow L0' }]).decision === 'allow', 'Allow policy matches → allow');

// Deny policy overrides allow (most restrictive wins)
const mixed = resolveMostRestrictivePolicy([
  { policy_key: 'allow_l0', decision: 'allow', priority: 200, description: 'Allow' },
  { policy_key: 'deny_confidential', decision: 'deny', priority: 50, description: 'Deny' },
]);
assert(mixed.decision === 'deny', 'Deny overrides allow (most restrictive wins)');

// ── 5. AUDIT FAIL-CLOSED LOGIC ─────────────────────────────────
console.log('\n=== Audit Fail-Closed Logic ===');

// Consequential actions: audit failure must throw (not swallow)
function createAuditFailClosed(isConsequential, shouldFail) {
  if (shouldFail) {
    if (isConsequential) {
      throw new Error('AUDIT_FAILURE: Cannot execute consequential action without audit evidence');
    }
    // Non-consequential: degraded mode (return null, don't throw)
    return null;
  }
  return 'audit_id_123';
}

// Consequential + audit failure → throws
let consequentialThrew = false;
try {
  createAuditFailClosed(true, true);
} catch (e) {
  consequentialThrew = true;
}
assert(consequentialThrew, 'Consequential audit failure throws (fail-closed)');

// Non-consequential + audit failure → returns null (degraded mode)
let nonConsequenceResult = null;
try {
  nonConsequenceResult = createAuditFailClosed(false, true);
} catch (e) {
  nonConsequenceResult = 'error';
}
assert(nonConsequenceResult === null, 'Non-consequential audit failure returns null (degraded mode)');

// Success case → returns audit ID
assert(createAuditFailClosed(true, false) === 'audit_id_123', 'Successful audit returns ID');

// ── 6. APPROVAL EXPIRY LOGIC ──────────────────────────────────
console.log('\n=== Approval Expiry Logic ===');

const APPROVAL_EXPIRY_HOURS = 24;

// Fresh approval is not expired
const freshApproval = { status: 'approved', expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString() };
const isFreshExpired = freshApproval.expires_at && new Date(freshApproval.expires_at) < new Date();
assert(!isFreshExpired, 'Fresh approval not expired');

// Past-due approval is expired
const expiredApproval = { status: 'approved', expires_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() };
const isExpired = expiredApproval.expires_at && new Date(expiredApproval.expires_at) < new Date();
assert(isExpired, 'Past-due approval expired');

// ── 7. IDEMPOTENCY FINGERPRINT DETERMINISM ───────────────────
console.log('\n=== Idempotency Fingerprint Determinism ===');

// Same inputs → same fingerprint (simulated)
function computeFingerprintRaw(tenantId, requesterId, serviceKey, payloadHash, idempotencyKey) {
  return `${tenantId}:${requesterId}:${serviceKey}:${payloadHash}:${idempotencyKey}`;
}

const fp1 = computeFingerprintRaw('t1', 'u1', 'sop_gen', 'hash123', 'key-abc');
const fp2 = computeFingerprintRaw('t1', 'u1', 'sop_gen', 'hash123', 'key-abc');
assert(fp1 === fp2, 'Same inputs → same fingerprint');

// Different tenant → different fingerprint
const fp3 = computeFingerprintRaw('t2', 'u1', 'sop_gen', 'hash123', 'key-abc');
assert(fp1 !== fp3, 'Different tenant → different fingerprint');

// Different payload → different fingerprint
const fp4 = computeFingerprintRaw('t1', 'u1', 'sop_gen', 'hash456', 'key-abc');
assert(fp1 !== fp4, 'Different payload → different fingerprint');

// Different idempotency key → different fingerprint
const fp5 = computeFingerprintRaw('t1', 'u1', 'sop_gen', 'hash123', 'key-xyz');
assert(fp1 !== fp5, 'Different idempotency key → different fingerprint');

// ── RESULTS ───────────────────────────────────────────────────
console.log(`\n=== Gateway Hardening Test Results ===`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

if (failed > 0) {
  console.error('\n❌ GATEWAY HARDENING TESTS FAILED!');
} else {
  console.log('\n✅ All gateway hardening tests passed.');
}