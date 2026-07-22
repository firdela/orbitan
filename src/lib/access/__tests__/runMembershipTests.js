// ============================================================
// ORBITANOS — Access Engine :: Milestone 2 Unit Tests
// Architecture Version 1.0 (Frozen)
//
// Pure test runner — no external framework.
// Exports runMembershipTests() -> { passed, failed, total, tests }.
//
// Coverage (M2 scope):
//   - Compatibility Matrix: Employee → Membership field mapping
//   - Status normalisation (active/on_leave/inactive/terminated)
//   - MembershipResolver: pass-through, Employee translation, fetch
//   - PermissionResolver: derive from role_assignments via packs
//   - Role scope (outlet) attached; cross-tenant scope preserved
//   - Unknown role yields no permissions (fail-safe)
// ============================================================

import { createMembershipResolver, translateEmployee, normalizeMembershipStatus } from '../membership/MembershipResolver.js';
import { createPermissionResolver, derivePermissions } from '../membership/PermissionResolver.js';
import { permissionsForRole, ROLE_PACKS, PERMISSION_PACKS } from '../PermissionPacks.js';

export function runMembershipTests() {
  const tests = [];
  let passed = 0, failed = 0;

  function test(name, fn) {
    try { fn(); passed += 1; tests.push({ name, passed: true }); }
    catch (err) { failed += 1; tests.push({ name, passed: false, error: err?.message || String(err) }); }
  }
  function assertEqual(a, e, m) { if (JSON.stringify(a) !== JSON.stringify(e)) throw new Error(`${m || ''} got ${JSON.stringify(a)} expected ${JSON.stringify(e)}`); }
  function assertTrue(v, m) { if (!v) throw new Error(m || 'expected true'); }
  function assertFalse(v, m) { if (v) throw new Error(m || 'expected false'); }

  // ── Status normalisation ───────────────────────────────────
  test('normalize: active → active', () => assertEqual(normalizeMembershipStatus('active'), 'active'));
  test('normalize: on_leave → active', () => assertEqual(normalizeMembershipStatus('on_leave'), 'active'));
  test('normalize: inactive → suspended', () => assertEqual(normalizeMembershipStatus('inactive'), 'suspended'));
  test('normalize: terminated → revoked', () => assertEqual(normalizeMembershipStatus('terminated'), 'revoked'));
  test('normalize: unknown → suspended (fail-closed)', () => assertEqual(normalizeMembershipStatus('weird'), 'suspended'));

  // ── translateEmployee (Compatibility Matrix) ───────────────
  const emp = {
    id: 'emp_1', user_id: 'u_1', tenant_id: 't_1', outlet_id: 'o_1',
    company_id: 'c_1', department: 'Kitchen', role: 'outlet_manager',
    full_name: 'Hamka', status: 'active',
  };
  const membership = translateEmployee(emp);

  test('translate: organisation_id = tenant_id', () => assertEqual(membership.organisation_id, 't_1'));
  test('translate: user_id preserved', () => assertEqual(membership.user_id, 'u_1'));
  test('translate: membership_type = employee', () => assertEqual(membership.membership_type, 'employee'));
  test('translate: display_name = full_name', () => assertEqual(membership.display_name, 'Hamka'));
  test('translate: single role_assignment with role', () => {
    assertEqual(membership.role_assignments.length, 1);
    assertEqual(membership.role_assignments[0].role, 'outlet_manager');
  });
  test('translate: scope carries tenant + outlet + company + department', () => {
    assertEqual(membership.role_assignments[0].scope, { tenant_id: 't_1', outlet_id: 'o_1', company_id: 'c_1', department: 'Kitchen' });
  });
  test('translate: source_employee_id preserved for audit', () => assertEqual(membership.source_employee_id, 'emp_1'));
  test('translate: null employee → null', () => assertEqual(translateEmployee(null), null));

  // ── MembershipResolver ─────────────────────────────────────
  test('MembershipResolver: passes through normalized membership', async () => {
    const r = createMembershipResolver();
    const pre = { organisation_id: 't1', role_assignments: [{ role: 'worker', scope: { tenant_id: 't1' } }], status: 'active' };
    const out = await r.resolve(pre, { identity: { id: 'u1' } });
    assertEqual(out, pre);
  });

  test('MembershipResolver: translates Employee record', async () => {
    const r = createMembershipResolver();
    const out = await r.resolve(emp, { identity: { id: 'u1' } });
    assertEqual(out.organisation_id, 't_1');
    assertEqual(out.role_assignments[0].role, 'outlet_manager');
  });

  test('MembershipResolver: fetches via injected resolveEmployee', async () => {
    let calledWith = null;
    const r = createMembershipResolver({
      resolveEmployee: async (identity) => { calledWith = identity; return emp; },
    });
    const out = await r.resolve(null, { identity: { id: 'u1', email: 'h@x.com' } });
    assertEqual(calledWith.id, 'u1');
    assertEqual(out.organisation_id, 't_1');
  });

  test('MembershipResolver: fetch returns null → null', async () => {
    const r = createMembershipResolver({ resolveEmployee: async () => null });
    const out = await r.resolve(null, { identity: { id: 'u1' } });
    assertEqual(out, null);
  });

  test('MembershipResolver: no value, no provider, no identity → null', async () => {
    const r = createMembershipResolver();
    const out = await r.resolve(null, {});
    assertEqual(out, null);
  });

  // ── PermissionResolver / derivePermissions ─────────────────
  test('permissionsForRole: worker gets task + clock + compliance perms', () => {
    const keys = permissionsForRole('worker');
    assertTrue(keys.includes('task.read'));
    assertTrue(keys.includes('clockrecord.manage'));
    assertTrue(keys.includes('compliancerecord.read.self'));
  });

  test('permissionsForRole: outlet_manager can adjust inventory', () => {
    const keys = permissionsForRole('outlet_manager');
    assertTrue(keys.includes('inventoryitem.adjust'));
    assertTrue(keys.includes('purchaseorder.approve'));
  });

  test('permissionsForRole: unknown role → empty', () => {
    assertEqual(permissionsForRole('ghost'), []);
  });

  test('derivePermissions: outlet_manager membership yields scoped permissions', () => {
    const m = { role_assignments: [{ role: 'outlet_manager', scope: { tenant_id: 't1', outlet_id: 'o1' } }] };
    const perms = derivePermissions(m);
    assertTrue(perms.length > 0);
    const invAdj = perms.find(p => p.key === 'inventoryitem.adjust');
    assertTrue(invAdj, 'expected inventoryitem.adjust');
    assertEqual(invAdj.source, 'role_default');
    assertEqual(invAdj.effect, 'allow');
    assertEqual(invAdj.scope, { tenant_id: 't1', outlet_id: 'o1', company_id: null, department: null });
  });

  test('derivePermissions: de-duplicates across overlapping packs', () => {
    const m = { role_assignments: [{ role: 'tenant_admin', scope: { tenant_id: 't1' } }] };
    const perms = derivePermissions(m);
    const counts = perms.reduce((acc, p) => { acc[p.key] = (acc[p.key] || 0) + 1; return acc; }, {});
    Object.values(counts).forEach(c => assertEqual(c, 1, 'duplicate permission key'));
  });

  test('derivePermissions: multiple role assignments combine', () => {
    const m = { role_assignments: [
      { role: 'worker', scope: { tenant_id: 't1' } },
      { role: 'supervisor', scope: { tenant_id: 't1', outlet_id: 'o1' } },
    ] };
    const perms = derivePermissions(m);
    assertTrue(perms.some(p => p.key === 'task.read'));
    assertTrue(perms.some(p => p.key === 'inventoryitem.adjust'));
  });

  test('derivePermissions: null membership → []', () => {
    assertEqual(derivePermissions(null), []);
  });

  test('PermissionResolver: passes through caller-provided array', async () => {
    const r = createPermissionResolver();
    const supplied = [{ key: 'x.read', effect: 'allow', source: 'explicit', scope: { tenant_id: 't1' } }];
    const out = await r.resolve(supplied, { membership: null });
    assertEqual(out, supplied);
  });

  test('PermissionResolver: derives from ctx.membership when no array given', async () => {
    const r = createPermissionResolver();
    const m = { role_assignments: [{ role: 'worker', scope: { tenant_id: 't1' } }] };
    const out = await r.resolve(undefined, { membership: m });
    assertTrue(out.some(p => p.key === 'task.read'));
  });

  // ── Integration: resolver → engine-style permission scope ───
  test('Resolver chain: outlet_manager scoped to own outlet only', () => {
    const m = translateEmployee({ ...emp, role: 'outlet_manager' });
    const perms = derivePermissions(m);
    const invAdj = perms.find(p => p.key === 'inventoryitem.adjust');
    // Scope outlet_id is 'o1' — a resource with a different outlet
    // would be rejected by precedence (verified in M1 tests).
    assertEqual(invAdj.scope.outlet_id, 'o1');
  });

  return { passed, failed, total: tests.length, tests };
}