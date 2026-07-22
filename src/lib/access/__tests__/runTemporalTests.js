// ============================================================
// ORBITANOS — Access Engine :: Milestone 3.1 Temporal Tests
// Architecture Version 1.0 (Frozen)
//
// Pure test runner — no framework. Covers the M3.1 foundation:
//   - Clock (system + fixed)
//   - MembershipValidator (structural validation)
//   - RoleAssignmentResolver (temporal filtering)
//
// Exports runTemporalTests() -> { passed, failed, total, tests }.
// ============================================================

import { createSystemClock, createFixedClock, CLOCK_VERSION } from '../clock.js';
import { validateMembership, createMembershipValidator } from '../membership/MembershipValidator.js';
import { resolveActiveAssignments, createRoleAssignmentResolver, ASSIGNMENT_STATUS } from '../membership/RoleAssignmentResolver.js';
import { translateEmployee } from '../membership/MembershipResolver.js';

export async function runTemporalTests() {
  const tests = [];
  let passed = 0, failed = 0;

  const pending = [];
  function test(name, fn) {
    pending.push((async () => {
      try { await fn(); passed += 1; tests.push({ name, passed: true }); }
      catch (err) { failed += 1; tests.push({ name, passed: false, error: err?.message || String(err) }); }
    })());
  }
  function assertEqual(a, e, m) { if (JSON.stringify(a) !== JSON.stringify(e)) throw new Error(`${m || ''} got ${JSON.stringify(a)} expected ${JSON.stringify(e)}`); }
  function assertTrue(v, m) { if (!v) throw new Error(m || 'expected true'); }
  function assertFalse(v, m) { if (v) throw new Error(m || 'expected false'); }

  // ── Clock ──────────────────────────────────────────────────
  test('clock: SystemClock.now returns a Date', () => {
    const c = createSystemClock();
    assertTrue(c.now() instanceof Date);
    assertEqual(c.version, CLOCK_VERSION);
    assertEqual(c.name, 'SystemClock');
  });
  test('clock: FixedClock is frozen and returns copies', () => {
    const c = createFixedClock('2026-07-01T00:00:00Z');
    const t1 = c.now().getTime();
    const t2 = c.now().getTime();
    assertEqual(t1, t2, 'fixed clock should not advance');
    assertTrue(c.now() instanceof Date);
    assertEqual(c.name, 'FixedClock');
  });
  test('clock: FixedClock nowIso is stable', () => {
    const c = createFixedClock('2026-07-01T12:00:00Z');
    assertEqual(c.nowIso(), new Date('2026-07-01T12:00:00Z').toISOString());
  });

  // ── MembershipValidator ───────────────────────────────────
  test('validator: valid membership passes', () => {
    const m = translateEmployee({ id: 'e1', user_id: 'u1', tenant_id: 't1', role: 'worker', full_name: 'A', status: 'active' });
    const r = validateMembership(m);
    assertTrue(r.valid, r.errors.join(';'));
    assertFalse(r.invalid);
  });
  test('validator: null membership is invalid', () => {
    const r = validateMembership(null);
    assertFalse(r.valid);
    assertTrue(r.invalid);
    assertTrue(r.errors.length > 0);
  });
  test('validator: missing required field flagged', () => {
    const r = validateMembership({ user_id: 'u1', organisation_id: 't1', membership_type: 'employee', status: 'active' });
    assertFalse(r.valid);
    assertTrue(r.errors.some(e => e.includes('role_assignments')));
  });
  test('validator: invalid status flagged', () => {
    const m = { user_id: 'u1', organisation_id: 't1', membership_type: 'employee', status: 'weird', role_assignments: [{ role: 'worker', scope: { tenant_id: 't1' } }] };
    const r = validateMembership(m);
    assertFalse(r.valid);
    assertTrue(r.errors.some(e => e.includes('invalid status')));
  });
  test('validator: invalid membership_type flagged', () => {
    const m = { user_id: 'u1', organisation_id: 't1', membership_type: 'contractor', status: 'active', role_assignments: [{ role: 'worker', scope: { tenant_id: 't1' } }] };
    const r = validateMembership(m);
    assertFalse(r.valid);
    assertTrue(r.errors.some(e => e.includes('membership_type')));
  });
  test('validator: non-object role_assignments flagged', () => {
    const m = { user_id: 'u1', organisation_id: 't1', membership_type: 'employee', status: 'active', role_assignments: 'nope' };
    const r = validateMembership(m);
    assertFalse(r.valid);
    assertTrue(r.errors.some(e => e.includes('role_assignments must be an array')));
  });
  test('validator: assignment without role flagged', () => {
    const m = { user_id: 'u1', organisation_id: 't1', membership_type: 'employee', status: 'active', role_assignments: [{ scope: { tenant_id: 't1' } }] };
    const r = validateMembership(m);
    assertFalse(r.valid);
    assertTrue(r.errors.some(e => e.includes('.role is required')));
  });
  test('validator: factory exposes name + version', () => {
    const v = createMembershipValidator();
    assertEqual(v.name, 'MembershipValidator');
    assertTrue(v.version);
  });

  // ── RoleAssignmentResolver ─────────────────────────────────
  const activeMembership = translateEmployee({ id: 'e1', user_id: 'u1', tenant_id: 't1', role: 'worker', full_name: 'A', status: 'active' });
  const now = createFixedClock('2026-07-01T12:00:00Z');

  test('resolver: active assignment stays active', () => {
    const { active_assignments, all_assignments } = resolveActiveAssignments(activeMembership, now);
    assertEqual(active_assignments.length, 1);
    assertEqual(all_assignments.length, 1);
    assertEqual(active_assignments[0].assignment_status, ASSIGNMENT_STATUS.ACTIVE);
    assertTrue(active_assignments[0].assignment_id.startsWith('ra_'), 'ephemeral id prefix');
  });
  test('resolver: future-dated assignment is pending', () => {
    const m = { ...activeMembership, role_assignments: [{ role: 'worker', scope: { tenant_id: 't1' }, effective_from: '2026-08-01T00:00:00Z' }] };
    const { active_assignments, all_assignments } = resolveActiveAssignments(m, now);
    assertEqual(active_assignments.length, 0);
    assertEqual(all_assignments[0].assignment_status, ASSIGNMENT_STATUS.PENDING);
  });
  test('resolver: expired assignment is expired', () => {
    const m = { ...activeMembership, role_assignments: [{ role: 'worker', scope: { tenant_id: 't1' }, effective_until: '2026-06-01T00:00:00Z' }] };
    const { active_assignments } = resolveActiveAssignments(m, now);
    assertEqual(active_assignments.length, 0);
  });
  test('resolver: revoked assignment excluded', () => {
    const m = { ...activeMembership, role_assignments: [{ role: 'worker', scope: { tenant_id: 't1' }, status: 'revoked' }] };
    const { active_assignments, all_assignments } = resolveActiveAssignments(m, now);
    assertEqual(active_assignments.length, 0);
    assertEqual(all_assignments[0].assignment_status, ASSIGNMENT_STATUS.REVOKED);
  });
  test('resolver: suspended assignment excluded', () => {
    const m = { ...activeMembership, role_assignments: [{ role: 'worker', scope: { tenant_id: 't1' }, status: 'suspended' }] };
    const { active_assignments } = resolveActiveAssignments(m, now);
    assertEqual(active_assignments.length, 0);
  });
  test('resolver: suspended membership yields no active assignments', () => {
    const m = { ...activeMembership, status: 'suspended' };
    const { active_assignments } = resolveActiveAssignments(m, now);
    assertEqual(active_assignments.length, 0);
  });
  test('resolver: revoked membership yields no active assignments', () => {
    const m = { ...activeMembership, status: 'revoked' };
    const { active_assignments } = resolveActiveAssignments(m, now);
    assertEqual(active_assignments.length, 0);
  });
  test('resolver: null membership → empty', () => {
    const r = resolveActiveAssignments(null, now);
    assertEqual(r.active_assignments.length, 0);
    assertEqual(r.all_assignments.length, 0);
  });
  test('resolver: mixed assignments — only active surface', () => {
    const m = { ...activeMembership, role_assignments: [
      { role: 'worker', scope: { tenant_id: 't1' } },
      { role: 'supervisor', scope: { tenant_id: 't1' }, effective_until: '2026-06-01T00:00:00Z' },
      { role: 'outlet_manager', scope: { tenant_id: 't1' }, effective_from: '2026-08-01T00:00:00Z' },
    ] };
    const { active_assignments, all_assignments } = resolveActiveAssignments(m, now);
    assertEqual(active_assignments.length, 1);
    assertEqual(all_assignments.length, 3);
    assertEqual(active_assignments[0].role, 'worker');
  });
  test('resolver: factory exposes name + version + clockVersion', () => {
    const r = createRoleAssignmentResolver({ clock: now });
    assertEqual(r.name, 'RoleAssignmentResolver');
    assertTrue(r.version);
    assertEqual(r.clockVersion, CLOCK_VERSION);
  });
  test('resolver: resolve() honors injected clock over factory clock', async () => {
    const r = createRoleAssignmentResolver({ clock: createFixedClock('2030-01-01T00:00:00Z') });
    const future = { ...activeMembership, role_assignments: [{ role: 'worker', scope: { tenant_id: 't1' }, effective_from: '2026-08-01T00:00:00Z' }] };
    const ctxClock = createFixedClock('2026-07-01T12:00:00Z');
    const { active_assignments } = await r.resolve(future, { clock: ctxClock });
    assertEqual(active_assignments.length, 0); // pending at ctx time
  });

  await Promise.all(pending);
  return { passed, failed, total: tests.length, tests };
}