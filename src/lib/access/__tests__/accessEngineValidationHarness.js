// ============================================================
// ORBITANOS — Access Engine Validation Harness (Phase 1 Inc. #2)
// Frontend pure suite — MembershipResolver + Access Engine.
//
// Covers (directive points):
//   1. Canonical user_id resolution (translateEmployee preserves user_id)
//   2. One user → multiple tenant-scoped memberships
//   3. Active tenant + outlet context selection (allowed in-scope)
//   4. Least-privilege default-deny (no identity / no membership / no perm)
//   5. Inactive / suspended / revoked / missing memberships denied
//   6. Cross-tenant + cross-outlet access denied (scopeCovers boundary)
//   7. Platform-owner authority separate from Employee membership
//   9. Multi-tenant membership + access-denial regressions
//  +  Clock.Manage pack regression (bug found + fixed)
//
// Point 8 (email fallback never overrides a conflicting user_id) is
// the linkage-classifier contract — its authoritative test runs
// server-side in the `accessValidationHarness` backend function
// (which imports the shared canonical classifier).
//
// Pure, dependency-free. Exports runAccessEngineValidation() → report.
// ============================================================

import {
  createAccessEngine,
  DENIAL_REASONS,
  createMembershipResolver,
  translateEmployee,
  normalizeMembershipStatus,
  derivePermissions,
  permissionsForRole,
} from '@/lib/access';

export function runAccessEngineValidation() {
  const tests = [];
  let passed = 0, failed = 0;

  function test(name, fn) {
    return Promise.resolve()
      .then(() => fn())
      .then(() => { passed += 1; tests.push({ name, passed: true }); })
      .catch((err) => { failed += 1; tests.push({ name, passed: false, error: err?.message || String(err) }); });
  }
  function eq(a, e, m) {
    if (JSON.stringify(a) !== JSON.stringify(e))
      throw new Error(`${m || ''} got ${JSON.stringify(a)} expected ${JSON.stringify(e)}`);
  }
  function ok(v, m) { if (!v) throw new Error(m || 'expected truthy'); }

  // ── Fixtures ─────────────────────────────────────────────────
  const workerIdentity = { id: 'u_worker', email: 'ali@orbitan.dev', platform_role: null };
  const platformOwner = { id: 'u_admin', email: 'platform-owner@orbitan.net', platform_role: 'admin' };

  const empT1 = {
    id: 'e1', user_id: 'u_worker', tenant_id: 't1', outlet_id: 'o1',
    company_id: 'c1', department: 'Kitchen', role: 'worker',
    full_name: 'Ali', status: 'active',
  };
  const empT2 = {
    id: 'e2', user_id: 'u_worker', tenant_id: 't2', outlet_id: 'o2',
    company_id: 'c2', department: 'Bar', role: 'worker',
    full_name: 'Ali', status: 'active',
  };
  const empManager = { ...empT1, id: 'e3', role: 'outlet_manager' };
  const empSupervisor = {
    id: 'e4', user_id: 'u_worker', tenant_id: 't1', outlet_id: 'o1',
    role: 'supervisor', full_name: 'Ali', status: 'active',
  };

  const engine = createAccessEngine();

  const chain = [];

  // ── Point 1: canonical user_id resolution ─────────────────────
  chain.push(test('1.1 translateEmployee preserves canonical user_id', () => {
    eq(translateEmployee(empT1).user_id, 'u_worker');
  }));
  chain.push(test('1.2 MembershipResolver resolves Employee by user_id-linked record', async () => {
    const r = createMembershipResolver();
    const m = await r.resolve(empT1, { identity: workerIdentity });
    eq(m.organisation_id, 't1');
    eq(m.user_id, 'u_worker');
  }));

  // ── Point 2: one user → multiple tenant memberships ──────────
  chain.push(test('2.1 one user resolves two tenant-scoped memberships', () => {
    const ms = [translateEmployee(empT1), translateEmployee(empT2)];
    eq(ms.length, 2);
    eq(ms.map((m) => m.organisation_id).sort(), ['t1', 't2']);
    eq(ms.every((m) => m.user_id === 'u_worker'), true);
  }));

  // ── Point 3: active tenant + outlet context selection (allowed) ─
  chain.push(test('3.1 outlet_manager allowed on in-scope task (tenant + outlet match)', async () => {
    const m = translateEmployee(empManager);
    const perms = derivePermissions(m);
    const dec = await engine.evaluate({
      identity: workerIdentity,
      workspace: { tenant_id: 't1', outlet_id: 'o1' },
      membership: m,
      permissions: perms,
      resource: { type: 'Task', id: 'task_1', tenant_id: 't1', outlet_id: 'o1' },
      action: 'task.read',
    });
    eq(dec.decision, 'ALLOWED');
  }));
  chain.push(test('3.2 supervisor outlet-scoped adjust allowed on matching outlet', async () => {
    const m = translateEmployee(empSupervisor);
    const perms = derivePermissions(m);
    const dec = await engine.evaluate({
      identity: workerIdentity,
      workspace: { tenant_id: 't1', outlet_id: 'o1' },
      membership: m,
      permissions: perms,
      resource: { type: 'InventoryItem', id: 'inv_1', tenant_id: 't1', outlet_id: 'o1' },
      action: 'inventoryitem.adjust',
    });
    eq(dec.decision, 'ALLOWED');
  }));

  // ── Point 4: least-privilege default-deny ─────────────────────
  chain.push(test('4.1 no identity → unauthenticated', async () => {
    const dec = await engine.evaluate({ resource: { tenant_id: 't1' }, action: 'task.read' });
    eq(dec.decision, 'DENIED');
    eq(dec.denial_reason, DENIAL_REASONS.UNAUTHENTICATED);
  }));
  chain.push(test('4.2 non-platform-owner with no membership → no_membership', async () => {
    const dec = await engine.evaluate({
      identity: workerIdentity,
      workspace: { tenant_id: 't1' },
      resource: { type: 'Task', id: 't', tenant_id: 't1' },
      action: 'task.read',
    });
    eq(dec.decision, 'DENIED');
    eq(dec.denial_reason, DENIAL_REASONS.NO_MEMBERSHIP);
  }));
  chain.push(test('4.3 worker without inventory permission → no_permission', async () => {
    const m = translateEmployee(empT1);
    const perms = derivePermissions(m); // worker lacks inventoryitem.read
    const dec = await engine.evaluate({
      identity: workerIdentity,
      workspace: { tenant_id: 't1', outlet_id: 'o1' },
      membership: m,
      permissions: perms,
      resource: { type: 'InventoryItem', id: 'inv', tenant_id: 't1', outlet_id: 'o1' },
      action: 'inventoryitem.read',
    });
    eq(dec.decision, 'DENIED');
    eq(dec.denial_reason, DENIAL_REASONS.NO_PERMISSION);
  }));

  // ── Point 5: inactive / suspended / revoked / missing denied ──
  chain.push(test('5.1 normalize inactive → suspended', () => eq(normalizeMembershipStatus('inactive'), 'suspended')));
  chain.push(test('5.2 normalize terminated → revoked', () => eq(normalizeMembershipStatus('terminated'), 'revoked')));
  chain.push(test('5.3 suspended membership → membership_inactive', async () => {
    const m = { ...translateEmployee(empT1), status: 'suspended' };
    const dec = await engine.evaluate({
      identity: workerIdentity,
      workspace: { tenant_id: 't1' },
      membership: m,
      permissions: [],
      resource: { type: 'Task', id: 't', tenant_id: 't1' },
      action: 'task.read',
    });
    eq(dec.decision, 'DENIED');
    eq(dec.denial_reason, DENIAL_REASONS.MEMBERSHIP_INACTIVE);
  }));
  chain.push(test('5.4 revoked membership → membership_inactive', async () => {
    const m = { ...translateEmployee(empT1), status: 'revoked' };
    const dec = await engine.evaluate({
      identity: workerIdentity,
      workspace: { tenant_id: 't1' },
      membership: m,
      permissions: [],
      resource: { type: 'Task', id: 't', tenant_id: 't1' },
      action: 'task.read',
    });
    eq(dec.decision, 'DENIED');
    eq(dec.denial_reason, DENIAL_REASONS.MEMBERSHIP_INACTIVE);
  }));

  // ── Point 6: cross-tenant + cross-outlet denied ──────────────
  chain.push(test('6.1 cross-tenant access denied (scope boundary)', async () => {
    const m = translateEmployee(empManager); // perms scoped to t1
    const perms = derivePermissions(m);
    const dec = await engine.evaluate({
      identity: workerIdentity,
      workspace: { tenant_id: 't1' },
      membership: m,
      permissions: perms,
      resource: { type: 'Task', id: 't', tenant_id: 't2' }, // different tenant
      action: 'task.read',
    });
    eq(dec.decision, 'DENIED');
    eq(dec.denial_reason, DENIAL_REASONS.NO_PERMISSION);
  }));
  chain.push(test('6.2 cross-outlet access denied (same tenant, different outlet)', async () => {
    const m = translateEmployee(empSupervisor); // supervisor adjust scoped to o1
    const perms = derivePermissions(m);
    const dec = await engine.evaluate({
      identity: workerIdentity,
      workspace: { tenant_id: 't1', outlet_id: 'o1' },
      membership: m,
      permissions: perms,
      resource: { type: 'InventoryItem', id: 'inv', tenant_id: 't1', outlet_id: 'o2' },
      action: 'inventoryitem.adjust',
    });
    eq(dec.decision, 'DENIED');
    eq(dec.denial_reason, DENIAL_REASONS.NO_PERMISSION);
  }));

  // ── Point 7: platform-owner authority separate from membership ─
  chain.push(test('7.1 platform owner + workspace, no membership → platform_owner_authority', async () => {
    const dec = await engine.evaluate({
      identity: platformOwner,
      workspace: { tenant_id: 't1' },
      membership: null,
      permissions: [],
      resource: { type: 'Task', id: 't', tenant_id: 't1' },
      action: 'task.read',
    });
    eq(dec.decision, 'ALLOWED');
  }));
  chain.push(test('7.2 platform owner platform-op with no workspace/permissions → denied (no blind bypass)', async () => {
    const dec = await engine.evaluate({
      identity: platformOwner,
      is_platform_op: true,
      workspace: null,
      membership: null,
      permissions: [],
      resource: { type: 'Tenant', id: 't1', tenant_id: 't1' },
      action: 'tenant.update',
    });
    eq(dec.decision, 'DENIED');
    eq(dec.denial_reason, DENIAL_REASONS.NO_PERMISSION);
  }));
  chain.push(test('7.3 platform owner authority overrides worker membership limits', async () => {
    const m = translateEmployee(empT1); // worker — lacks inventoryitem.adjust
    const perms = derivePermissions(m);
    const dec = await engine.evaluate({
      identity: platformOwner,
      workspace: { tenant_id: 't1', outlet_id: 'o1' },
      membership: m,
      permissions: perms,
      resource: { type: 'InventoryItem', id: 'inv', tenant_id: 't1', outlet_id: 'o1' },
      action: 'inventoryitem.adjust',
    });
    eq(dec.decision, 'ALLOWED'); // platform_owner_authority, NOT the worker pack
  }));

  // ── Point 9 / regression: multi-tenant + denial ─────────────
  chain.push(test('9.1 worker across two tenants cannot reach a third tenant', async () => {
    const ms = [translateEmployee(empT1), translateEmployee(empT2)];
    const perms = ms.flatMap(derivePermissions); // t1 + t2 perms
    const dec = await engine.evaluate({
      identity: workerIdentity,
      workspace: { tenant_id: 't1' },
      membership: ms[0],
      permissions: perms,
      resource: { type: 'Task', id: 't', tenant_id: 't3' }, // third tenant
      action: 'task.read',
    });
    eq(dec.decision, 'DENIED');
    eq(dec.denial_reason, DENIAL_REASONS.NO_PERMISSION);
  }));

  // ── Bug found + fixed: Clock.Manage pack ─────────────────────
  chain.push(test('REGRESSION: worker role grants clockrecord.manage (Clock.Manage pack)', () => {
    const keys = permissionsForRole('worker');
    ok(keys.includes('clockrecord.manage'), 'worker must be able to clock in/out');
  }));

  return Promise.all(chain).then(() => ({
    summary: { total: tests.length, passed, failed, pass_rate: Math.round((passed / tests.length) * 100) + '%' },
    tests,
  }));
}