// ============================================================
// ORBITANOS — Access Engine :: Milestone 1 Unit Tests
// Architecture Version 1.0 (Frozen)
//
// Pure test runner — no external test framework required.
// Exports runAccessEngineTests() -> { passed, failed, total, tests }.
//
// Coverage (M1 scope):
//   - DecisionObject contract & denial reasons
//   - PolicyEngine registry, precedence, fail-closed on throw
//   - Precedence resolver (explicit deny > allow > inherited >
//     role default > default deny; cross-tenant protection)
//   - AccessEngine fail-closed on missing identity/context/membership
//   - Platform Owner requires explicit tenant context (no blind bypass)
//   - Suspended membership denies immediately
//
// Wired into the dev test suite in a later milestone.
// ============================================================

import { createAccessEngine } from '../AccessEngine.js';
import { createDecision, allowDecision, denyDecision, DENIAL_REASONS, DECISION } from '../DecisionObject.js';
import { createPolicyEngine } from '../PolicyEngine.js';
import { resolvePrecedence, scopeCovers } from '../precedence.js';

export function runAccessEngineTests() {
  const tests = [];
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      passed += 1;
      tests.push({ name, passed: true });
    } catch (err) {
      failed += 1;
      tests.push({ name, passed: false, error: err?.message || String(err) });
    }
  }
  function assertEqual(actual, expected, msg) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) throw new Error(`${msg || 'assertEqual'} — got ${a}, expected ${e}`);
  }
  function assertTrue(v, msg) { if (!v) throw new Error(msg || 'expected true'); }
  function assertFalse(v, msg) { if (v) throw new Error(msg || 'expected false'); }

  // ── DecisionObject ─────────────────────────────────────────
  test('DecisionObject: allow has no denial_reason', () => {
    const d = allowDecision({ requestId: 'r1' });
    assertEqual(d.decision, DECISION.ALLOWED);
    assertEqual(d.denial_reason, null);
    assertEqual(d.request_id, 'r1');
    assertEqual(d.schema, 'orbitan/access-decision/v1');
  });

  test('DecisionObject: deny carries canonical reason', () => {
    const d = denyDecision(DENIAL_REASONS.NO_PERMISSION, { requestId: 'r2' });
    assertEqual(d.decision, DECISION.DENIED);
    assertEqual(d.denial_reason, 'no_permission');
  });

  test('DecisionObject: deny with unknown reason falls back to evaluation_error', () => {
    const d = denyDecision(null);
    assertEqual(d.denial_reason, DENIAL_REASONS.EVALUATION_ERROR);
  });

  test('DecisionObject: normalises identity', () => {
    const d = createDecision({ allowed: true, identity: { id: 'u1', role: 'admin' } });
    assertEqual(d.metadata.identity, { id: 'u1', type: 'user', email: null, platform_role: 'admin' });
  });

  // ── Precedence ─────────────────────────────────────────────
  const T = 'tenant_A';
  const OUT = 'outlet_1';
  const res = (overrides) => ({ type: 'Item', id: 'i1', tenant_id: T, ...overrides });

  test('Precedence: explicit deny beats explicit allow', () => {
    const perms = [
      { key: 'inventory.read', effect: 'allow', source: 'explicit', scope: { tenant_id: T } },
      { key: 'inventory.read', effect: 'deny', source: 'explicit', scope: { tenant_id: T } },
    ];
    const r = resolvePrecedence({ permissions: perms, resource: res({ outlet_id: OUT }), action: 'inventory.read' });
    assertFalse(r.allowed);
    assertTrue(r.denied);
    assertEqual(r.reason, 'explicit_deny');
  });

  test('Precedence: explicit allow in scope grants', () => {
    const perms = [{ key: 'inventory.read', effect: 'allow', source: 'explicit', scope: { tenant_id: T } }];
    const r = resolvePrecedence({ permissions: perms, resource: res({ outlet_id: OUT }), action: 'inventory.read' });
    assertTrue(r.allowed);
    assertFalse(r.denied);
  });

  test('Precedence: inherited allow (tenant-wide grant covers outlet resource)', () => {
    const perms = [{ key: 'inventory.read', effect: 'allow', source: 'inherited', scope: { tenant_id: T } }];
    const r = resolvePrecedence({ permissions: perms, resource: res({ outlet_id: OUT }), action: 'inventory.read' });
    assertTrue(r.allowed);
    assertEqual(r.reason, 'inherited_allow');
  });

  test('Precedence: role default allow grants when nothing stronger', () => {
    const perms = [{ key: 'inventory.read', effect: 'allow', source: 'role_default', scope: { tenant_id: T } }];
    const r = resolvePrecedence({ permissions: perms, resource: res({ outlet_id: OUT }), action: 'inventory.read' });
    assertTrue(r.allowed);
    assertEqual(r.reason, 'role_default_allow');
  });

  test('Precedence: cross-tenant permission does not cover resource', () => {
    const perms = [{ key: 'inventory.read', effect: 'allow', source: 'explicit', scope: { tenant_id: 'tenant_B' } }];
    const r = resolvePrecedence({ permissions: perms, resource: res({ outlet_id: OUT }), action: 'inventory.read' });
    assertFalse(r.allowed);
    assertEqual(r.reason, 'permission_out_of_scope');
  });

  test('Precedence: outlet-scoped permission does not cover different outlet', () => {
    const perms = [{ key: 'inventory.read', effect: 'allow', source: 'explicit', scope: { tenant_id: T, outlet_id: 'outlet_2' } }];
    const r = resolvePrecedence({ permissions: perms, resource: res({ outlet_id: OUT }), action: 'inventory.read' });
    assertFalse(r.allowed);
    assertEqual(r.reason, 'permission_out_of_scope');
  });

  test('Precedence: default deny when no matching permission', () => {
    const r = resolvePrecedence({ permissions: [], resource: res({}), action: 'inventory.read' });
    assertFalse(r.allowed);
    assertEqual(r.reason, 'no_matching_permission');
  });

  test('scopeCovers: null tenant_id scope never covers (cross-tenant guard)', () => {
    assertFalse(scopeCovers({ tenant_id: null }, res({})));
  });

  // ── PolicyEngine ───────────────────────────────────────────
  test('PolicyEngine: pass-through when no policies', () => {
    const pe = createPolicyEngine();
    const r = pe.evaluate({});
    assertFalse(r.decisive);
    assertEqual(r.result, null);
  });

  test('PolicyEngine: hard block stops chain', () => {
    const pe = createPolicyEngine();
    pe.registerPolicy({ key: 'block', priority: 1, evaluate: () => ({ allowed: false, reason: 'blocked_by_policy' }) });
    pe.registerPolicy({ key: 'noop', priority: 2, evaluate: () => null });
    const r = pe.evaluate({});
    assertTrue(r.decisive);
    assertFalse(r.result.allowed);
  });

  test('PolicyEngine: throwing policy is fail-closed deny', () => {
    const pe = createPolicyEngine();
    pe.registerPolicy({ key: 'boom', priority: 1, evaluate: () => { throw new Error('crash'); } });
    const r = pe.evaluate({});
    assertTrue(r.decisive);
    assertFalse(r.result.allowed);
    assertEqual(r.result.reason, 'policy_evaluation_error');
  });

  test('PolicyEngine: duplicate key rejected', () => {
    const pe = createPolicyEngine();
    pe.registerPolicy({ key: 'p', evaluate: () => null });
    let threw = false;
    try { pe.registerPolicy({ key: 'p', evaluate: () => null }); } catch { threw = true; }
    assertTrue(threw);
  });

  // ── AccessEngine fail-closed ────────────────────────────────
  test('AccessEngine: missing identity denies (unauthenticated)', async () => {
    const engine = createAccessEngine();
    const d = await engine.evaluate({ resource: res({}), action: 'inventory.read' });
    assertEqual(d.decision, DECISION.DENIED);
    assertEqual(d.denial_reason, DENIAL_REASONS.UNAUTHENTICATED);
  });

  test('AccessEngine: missing context denies non-platform identity', async () => {
    const engine = createAccessEngine();
    const d = await engine.evaluate({ identity: { id: 'u1', role: 'worker' }, action: 'inventory.read' });
    assertEqual(d.denial_reason, DENIAL_REASONS.NO_CONTEXT);
  });

  test('AccessEngine: worker denied another outlet', async () => {
    const engine = createAccessEngine();
    const perms = [{ key: 'inventory.read', effect: 'allow', source: 'explicit', scope: { tenant_id: T, outlet_id: 'own_outlet' } }];
    const d = await engine.evaluate({
      identity: { id: 'w1', role: 'worker' },
      workspace: { tenant_id: T },
      membership: { status: 'active' },
      permissions: perms,
      resource: res({ outlet_id: 'other_outlet' }),
      action: 'inventory.read',
    });
    assertEqual(d.decision, DECISION.DENIED);
    assertEqual(d.denial_reason, DENIAL_REASONS.NO_PERMISSION);
  });

  test('AccessEngine: suspended membership denies immediately', async () => {
    const engine = createAccessEngine();
    const d = await engine.evaluate({
      identity: { id: 'u1', role: 'worker' },
      workspace: { tenant_id: T },
      membership: { status: 'suspended' },
      permissions: [{ key: 'inventory.read', effect: 'allow', source: 'explicit', scope: { tenant_id: T } }],
      resource: res({}),
      action: 'inventory.read',
    });
    assertEqual(d.decision, DECISION.DENIED);
    assertEqual(d.denial_reason, DENIAL_REASONS.MEMBERSHIP_INACTIVE);
  });

  test('AccessEngine: explicit allow in scope grants', async () => {
    const engine = createAccessEngine();
    const d = await engine.evaluate({
      identity: { id: 'u1', role: 'outlet_manager' },
      workspace: { tenant_id: T, outlet_id: OUT },
      membership: { status: 'active' },
      permissions: [{ key: 'inventory.read', effect: 'allow', source: 'explicit', scope: { tenant_id: T } }],
      resource: res({ outlet_id: OUT }),
      action: 'inventory.read',
    });
    assertEqual(d.decision, DECISION.ALLOWED);
  });

  test('AccessEngine: Platform Owner without workspace is denied (no blind bypass)', async () => {
    const engine = createAccessEngine();
    const d = await engine.evaluate({
      identity: { id: 'po', email: 'coffeeteabreak12@gmail.com', role: 'admin' },
      resource: res({}),
      action: 'inventory.read',
    });
    // No workspace + not a platform op -> no context -> denied.
    assertEqual(d.decision, DECISION.DENIED);
  });

  test('AccessEngine: Platform Owner WITH selected tenant context is allowed', async () => {
    const engine = createAccessEngine();
    const d = await engine.evaluate({
      identity: { id: 'po', email: 'coffeeteabreak12@gmail.com', role: 'admin' },
      workspace: { tenant_id: T },
      membership: null,
      permissions: [],
      resource: res({}),
      action: 'inventory.read',
    });
    assertEqual(d.decision, DECISION.ALLOWED);
  });

  test('AccessEngine: subscription restriction denies a permitted role', async () => {
    const engine = createAccessEngine({
      resolvers: { subscriptionResolver: () => ({ entitled: false, plan: 'starter' }) },
    });
    const d = await engine.evaluate({
      identity: { id: 'u1', role: 'tenant_admin' },
      workspace: { tenant_id: T },
      membership: { status: 'active' },
      permissions: [{ key: 'advanced.read', effect: 'allow', source: 'explicit', scope: { tenant_id: T } }],
      resource: res({}),
      action: 'advanced.read',
    });
    assertEqual(d.decision, DECISION.DENIED);
    assertEqual(d.denial_reason, DENIAL_REASONS.SUBSCRIPTION_RESTRICTED);
  });

  test('AccessEngine: feature flag disabled denies', async () => {
    const engine = createAccessEngine({
      resolvers: { featureFlagResolver: () => ({ enabled: false }) },
    });
    const d = await engine.evaluate({
      identity: { id: 'u1', role: 'tenant_admin' },
      workspace: { tenant_id: T },
      membership: { status: 'active' },
      permissions: [{ key: 'beta.feature', effect: 'allow', source: 'explicit', scope: { tenant_id: T } }],
      resource: res({}),
      action: 'beta.feature',
    });
    assertEqual(d.denial_reason, DENIAL_REASONS.FEATURE_DISABLED);
  });

  test('AccessEngine: policy block overrides permission allow', async () => {
    const pe = createPolicyEngine();
    pe.registerPolicy({ key: 'no_self_approve', priority: 1, evaluate: () => ({ allowed: false, reason: 'cannot_approve_own_claim' }) });
    const engine = createAccessEngine({ policyEngine: pe });
    const d = await engine.evaluate({
      identity: { id: 'u1', role: 'outlet_manager' },
      workspace: { tenant_id: T },
      membership: { status: 'active' },
      permissions: [{ key: 'claim.approve', effect: 'allow', source: 'explicit', scope: { tenant_id: T } }],
      resource: res({}),
      action: 'claim.approve',
    });
    assertEqual(d.denial_reason, DENIAL_REASONS.POLICY_BLOCKED);
  });

  test('AccessEngine: audit sink receives every decision', async () => {
    let received = null;
    const engine = createAccessEngine({ resolvers: { auditSink: async (d) => { received = d; } } });
    await engine.evaluate({ identity: { id: 'u1', role: 'worker' }, action: 'x' });
    assertTrue(received !== null, 'audit sink should have been called');
    assertEqual(received.decision, DECISION.DENIED);
  });

  return { passed, failed, total: tests.length, tests };
}