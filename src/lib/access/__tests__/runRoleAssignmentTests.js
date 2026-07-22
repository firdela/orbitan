// ============================================================
// ORBITANOS — Access Engine :: Milestone 3.1 Temporal Tests
// Architecture Version 1.0
//
// Pure test runner — no external framework.
// Exports runRoleAssignmentTests() -> Promise<{ passed, failed, total, tests }>.
//
// Coverage (M3.1 scope):
//   - Clock abstraction: system + fixed
//   - RoleAssignment temporal semantics:
//       active (within window / no dates), pending (future from),
//       expired (passed until), suspended, revoked, malformed dates
//   - Legacy Employee-derived assignments resolve ACTIVE (no migration)
//   - resolveActiveAssignments filters to active only; all_assignments
//     carries effective_status for audit
//   - MembershipValidator: valid pass, structural failures, null !=
//     invalid, scope tenant mismatch, unknown membership_type
//   - InvalidMembership: structural shape + isInvalidMembership predicate
// ============================================================

import {
  createSystemClock,
  createFixedClock,
  resolveClock,
} from '../membership/Clock.js';
import {
  createInvalidMembership,
  isInvalidMembership,
} from '../membership/InvalidMembership.js';
import {
  validateMembership,
  createMembershipValidator,
} from '../membership/MembershipValidator.js';
import {
  computeAssignmentStatus,
  resolveActiveAssignments,
  createRoleAssignmentResolver,
  ASSIGNMENT_STATUS,
} from '../membership/RoleAssignmentResolver.js';
import { translateEmployee } from '../membership/MembershipResolver.js';

export async function runRoleAssignmentTests() {
  const tests = [];
  let passed = 0, failed = 0;

  async function test(name, fn) {
    try { await fn(); passed += 1; tests.push({ name, passed: true }); }
    catch (err) { failed += 1; tests.push({ name, passed: false, error: err?.message || String(err) }); }
  }
  function assertEqual(a, e, m) {
    if (JSON.stringify(a) !== JSON.stringify(e)) throw new Error(`${m || ''} got ${JSON.stringify(a)} expected ${JSON.stringify(e)}`);
  }
  function assertTrue(v, m) { if (!v) throw new Error(m || 'expected true'); }
  function assertFalse(v, m) { if (v) throw new Error(m || 'expected false'); }

  // ── Clock abstraction ──────────────────────────────────────
  await test('Clock: system clock now() ~ real now', () => {
    const c = createSystemClock();
    const before = Date.now();
    const n = c.now().getTime();
    const after = Date.now();
    assertTrue(n >= before - 5 && n <= after + 5, 'system clock drifted');
  });

  await test('Clock: fixed clock now() returns pinned instant', () => {
    const c = createFixedClock('2026-07-22T12:00:00Z');
    assertEqual(c.now().toISOString(), '2026-07-22T12:00:00.000Z');
    // Immutability: mutating returned Date does not move the clock.
    const n = c.now();
    n.setFullYear(2099);
    assertEqual(c.now().toISOString(), '2026-07-22T12:00:00.000Z', 'clock mutated');
  });

  await test('Clock: fixed clock from Date instance', () => {
    const d = new Date('2026-01-15T08:30:00Z');
    const c = createFixedClock(d);
    assertEqual(c.nowIso(), '2026-01-15T08:30:00.000Z');
  });

  await test('Clock: invalid date throws', () => {
    let threw = false;
    try { createFixedClock('not-a-date'); } catch { threw = true; }
    assertTrue(threw, 'expected throw on invalid date');
  });

  await test('Clock: resolveClock falls back to system', () => {
    const c = resolveClock(null);
    assertEqual(c.type, 'system');
  });

  await test('Clock: resolveClock accepts ISO string as fixed', () => {
    const c = resolveClock('2026-03-01T00:00:00Z');
    assertEqual(c.type, 'fixed');
    assertEqual(c.nowIso(), '2026-03-01T00:00:00.000Z');
  });

  // ── computeAssignmentStatus — temporal semantics ───────────
  const NOW = new Date('2026-07-22T12:00:00Z');

  await test('status: no dates + active status → active', () => {
    assertEqual(computeAssignmentStatus({ status: 'active' }, NOW), ASSIGNMENT_STATUS.ACTIVE);
  });

  await test('status: no dates + no status → active (legacy default)', () => {
    assertEqual(computeAssignmentStatus({}, NOW), ASSIGNMENT_STATUS.ACTIVE);
  });

  await test('status: effective_from in future → pending', () => {
    assertEqual(computeAssignmentStatus({ effective_from: '2026-08-01T00:00:00Z' }, NOW), ASSIGNMENT_STATUS.PENDING);
  });

  await test('status: effective_until passed → expired', () => {
    assertEqual(computeAssignmentStatus({ effective_until: '2026-07-01T00:00:00Z' }, NOW), ASSIGNMENT_STATUS.EXPIRED);
  });

  await test('status: within window [from, until] → active', () => {
    const a = { effective_from: '2026-07-01T00:00:00Z', effective_until: '2026-08-01T00:00:00Z' };
    assertEqual(computeAssignmentStatus(a, NOW), ASSIGNMENT_STATUS.ACTIVE);
  });

  await test('status: effective_until exactly now → expired (boundary)', () => {
    assertEqual(computeAssignmentStatus({ effective_until: '2026-07-22T12:00:00Z' }, NOW), ASSIGNMENT_STATUS.EXPIRED);
  });

  await test('status: effective_from exactly now → active (boundary inclusive)', () => {
    assertEqual(computeAssignmentStatus({ effective_from: '2026-07-22T12:00:00Z' }, NOW), ASSIGNMENT_STATUS.ACTIVE);
  });

  await test('status: explicit suspended overrides dates', () => {
    const a = { status: 'suspended', effective_from: '2026-01-01T00:00:00Z', effective_until: '2026-12-31T00:00:00Z' };
    assertEqual(computeAssignmentStatus(a, NOW), ASSIGNMENT_STATUS.SUSPENDED);
  });

  await test('status: explicit revoked overrides dates', () => {
    const a = { status: 'revoked', effective_from: '2026-01-01T00:00:00Z' };
    assertEqual(computeAssignmentStatus(a, NOW), ASSIGNMENT_STATUS.REVOKED);
  });

  await test('status: explicit expired overrides dates', () => {
    const a = { status: 'expired', effective_from: '2026-01-01T00:00:00Z' };
    assertEqual(computeAssignmentStatus(a, NOW), ASSIGNMENT_STATUS.EXPIRED);
  });

  await test('status: malformed effective_from → revoked (fail-closed)', () => {
    assertEqual(computeAssignmentStatus({ effective_from: 'next monday' }, NOW), ASSIGNMENT_STATUS.REVOKED);
  });

  await test('status: malformed effective_until → revoked (fail-closed)', () => {
    assertEqual(computeAssignmentStatus({ effective_until: 'whenever' }, NOW), ASSIGNMENT_STATUS.REVOKED);
  });

  await test('status: null assignment → revoked (fail-closed)', () => {
    assertEqual(computeAssignmentStatus(null, NOW), ASSIGNMENT_STATUS.REVOKED);
  });

  // ── resolveActiveAssignments — filtering ───────────────────
  await test('resolve: legacy Employee-derived assignment → active (no migration)', () => {
    const m = translateEmployee({
      id: 'emp_9', user_id: 'u9', tenant_id: 't9', outlet_id: 'o9',
      role: 'worker', full_name: 'Legacy Worker', status: 'active',
    });
    const { active_assignments, all_assignments } = resolveActiveAssignments(m, createFixedClock(NOW));
    assertEqual(active_assignments.length, 1);
    assertEqual(active_assignments[0].effective_status, 'active');
    assertEqual(active_assignments[0].role, 'worker');
    assertEqual(all_assignments.length, 1);
  });

  await test('resolve: mixed statuses filter to active only', () => {
    const m = {
      membership_id: 'm1', organisation_id: 't1', status: 'active',
      role_assignments: [
        { role: 'worker', status: 'active' },
        { role: 'supervisor', status: 'suspended' },
        { role: 'outlet_manager', effective_from: '2026-08-01T00:00:00Z' },
        { role: 'tenant_admin', effective_until: '2026-06-01T00:00:00Z' },
        { role: 'worker', status: 'revoked' },
      ],
    };
    const { active_assignments, all_assignments } = resolveActiveAssignments(m, createFixedClock(NOW));
    assertEqual(active_assignments.length, 1);
    assertEqual(active_assignments[0].role, 'worker');
    assertEqual(all_assignments.length, 5);
    assertEqual(all_assignments[1].effective_status, 'suspended');
    assertEqual(all_assignments[2].effective_status, 'pending');
    assertEqual(all_assignments[3].effective_status, 'expired');
    assertEqual(all_assignments[4].effective_status, 'revoked');
  });

  await test('resolve: pending becomes active when clock advances', () => {
    const m = {
      membership_id: 'm2', organisation_id: 't1', status: 'active',
      role_assignments: [{ role: 'outlet_manager', effective_from: '2026-08-01T00:00:00Z' }],
    };
    const before = resolveActiveAssignments(m, createFixedClock('2026-07-22T12:00:00Z'));
    assertEqual(before.active_assignments.length, 0);
    const after = resolveActiveAssignments(m, createFixedClock('2026-08-02T00:00:00Z'));
    assertEqual(after.active_assignments.length, 1);
    assertEqual(after.all_assignments[0].effective_status, 'active');
  });

  await test('resolve: expired becomes active when clock rewinds (temporal consistency)', () => {
    const m = {
      membership_id: 'm3', organisation_id: 't1', status: 'active',
      role_assignments: [{ role: 'auditor', effective_until: '2026-07-15T00:00:00Z' }],
    };
    const after = resolveActiveAssignments(m, createFixedClock('2026-07-22T12:00:00Z'));
    assertEqual(after.active_assignments.length, 0);
    assertEqual(after.all_assignments[0].effective_status, 'expired');
    const before = resolveActiveAssignments(m, createFixedClock('2026-07-10T00:00:00Z'));
    assertEqual(before.active_assignments.length, 1);
    assertEqual(before.all_assignments[0].effective_status, 'active');
  });

  await test('resolve: null membership → empty sets', () => {
    const r = resolveActiveAssignments(null);
    assertEqual(r.active_assignments, []);
    assertEqual(r.all_assignments, []);
  });

  await test('resolve: normalized assignment carries temporal contract fields', () => {
    const m = {
      membership_id: 'm4', organisation_id: 't1', status: 'active',
      role_assignments: [{ role: 'worker' }],
    };
    const { active_assignments } = resolveActiveAssignments(m, createFixedClock(NOW));
    const a = active_assignments[0];
    assertTrue(typeof a.role_assignment_id === 'string');
    assertEqual(a.membership_id, 'm4');
    assertEqual(a.status, 'active');
    assertEqual(a.effective_from, null);
    assertEqual(a.effective_until, null);
    assertEqual(a.scope, {});
  });

  await test('createRoleAssignmentResolver: resolves via ctx.membership + ctx.clock', async () => {
    const r = createRoleAssignmentResolver();
    const m = {
      membership_id: 'm5', organisation_id: 't1', status: 'active',
      role_assignments: [
        { role: 'worker', status: 'active' },
        { role: 'outlet_manager', status: 'suspended' },
      ],
    };
    const out = await r.resolve(undefined, { membership: m, clock: createFixedClock(NOW) });
    assertEqual(out.active_assignments.length, 1);
    assertEqual(out.active_assignments[0].role, 'worker');
  });

  // ── MembershipValidator ─────────────────────────────────────
  await test('validator: valid membership passes', () => {
    const m = {
      user_id: 'u1', organisation_id: 't1', membership_type: 'employee',
      status: 'active', display_name: 'Hamka',
      role_assignments: [{ role: 'worker', scope: { tenant_id: 't1' } }],
    };
    const r = validateMembership(m);
    assertTrue(r.valid, 'should be valid');
    assertEqual(r.membership, m);
  });

  await test('validator: null → valid:null (not invalid)', () => {
    const r = validateMembership(null);
    assertTrue(r.valid);
    assertEqual(r.membership, null);
  });

  await test('validator: undefined → valid:null (not invalid)', () => {
    const r = validateMembership(undefined);
    assertTrue(r.valid);
    assertEqual(r.membership, null);
  });

  await test('validator: missing organisation_id → invalid', () => {
    const r = validateMembership({ status: 'active', role_assignments: [] });
    assertFalse(r.valid);
    assertTrue(isInvalidMembership(r.invalidMembership));
    assertTrue(r.invalidMembership.validation_errors.some(e => e.field === 'organisation_id'));
  });

  await test('validator: non-string organisation_id → invalid', () => {
    const r = validateMembership({ organisation_id: 123, status: 'active', role_assignments: [] });
    assertFalse(r.valid);
    assertTrue(r.invalidMembership.validation_errors.some(e => e.field === 'organisation_id' && e.code === 'missing_or_invalid'));
  });

  await test('validator: unknown status → invalid', () => {
    const r = validateMembership({ organisation_id: 't1', status: 'weird', role_assignments: [] });
    assertFalse(r.valid);
    assertTrue(r.invalidMembership.validation_errors.some(e => e.field === 'status'));
  });

  await test('validator: role_assignments not an array → invalid', () => {
    const r = validateMembership({ organisation_id: 't1', status: 'active', role_assignments: 'nope' });
    assertFalse(r.valid);
    assertTrue(r.invalidMembership.validation_errors.some(e => e.field === 'role_assignments' && e.code === 'not_an_array'));
  });

  await test('validator: assignment missing role → invalid', () => {
    const r = validateMembership({
      organisation_id: 't1', status: 'active',
      role_assignments: [{ scope: { tenant_id: 't1' } }],
    });
    assertFalse(r.valid);
    assertTrue(r.invalidMembership.validation_errors.some(e => e.field === 'role_assignments[0].role'));
  });

  await test('validator: scope tenant_id mismatch → invalid', () => {
    const r = validateMembership({
      organisation_id: 't1', status: 'active',
      role_assignments: [{ role: 'worker', scope: { tenant_id: 't_other' } }],
    });
    assertFalse(r.valid);
    assertTrue(r.invalidMembership.validation_errors.some(e => e.field === 'role_assignments[0].scope.tenant_id' && e.code === 'tenant_mismatch'));
  });

  await test('validator: scope tenant_id matching is valid', () => {
    const r = validateMembership({
      organisation_id: 't1', status: 'active',
      role_assignments: [{ role: 'worker', scope: { tenant_id: 't1', outlet_id: 'o1' } }],
    });
    assertTrue(r.valid);
  });

  await test('validator: unknown membership_type → invalid', () => {
    const r = validateMembership({ organisation_id: 't1', membership_type: 'alien', status: 'active', role_assignments: [] });
    assertFalse(r.valid);
    assertTrue(r.invalidMembership.validation_errors.some(e => e.field === 'membership_type'));
  });

  await test('validator: non-object membership → invalid', () => {
    const r = validateMembership([1, 2, 3]);
    assertFalse(r.valid);
    assertTrue(isInvalidMembership(r.invalidMembership));
  });

  await test('validator: suspended status is structurally valid (not invalid)', () => {
    const r = validateMembership({ organisation_id: 't1', status: 'suspended', role_assignments: [] });
    assertTrue(r.valid, 'suspended membership is well-formed; AccessEngine denies it');
  });

  await test('createMembershipValidator: validate() works', () => {
    const v = createMembershipValidator();
    const m = { organisation_id: 't1', status: 'active', role_assignments: [] };
    const r = v.validate(m);
    assertTrue(r.valid);
  });

  // ── InvalidMembership structure ─────────────────────────────
  await test('InvalidMembership: structural shape', () => {
    const inv = createInvalidMembership({
      reason: 'test reason',
      validation_errors: [{ field: 'x', code: 'y' }],
      source_employee_id: 'emp_1',
    });
    assertEqual(inv.type, 'invalid_membership');
    assertEqual(inv.code, 'AUTH-MEMBERSHIP-INVALID');
    assertEqual(inv.reason, 'test reason');
    assertEqual(inv.validation_errors, [{ field: 'x', code: 'y' }]);
    assertEqual(inv.source_employee_id, 'emp_1');
  });

  await test('InvalidMembership: isInvalidMembership predicate', () => {
    assertTrue(isInvalidMembership(createInvalidMembership({})));
    assertFalse(isInvalidMembership(null));
    assertFalse(isInvalidMembership({}));
    assertFalse(isInvalidMembership({ organisation_id: 't1', status: 'active' }));
  });

  await test('InvalidMembership: defaults applied', () => {
    const inv = createInvalidMembership();
    assertEqual(inv.type, 'invalid_membership');
    assertEqual(inv.code, 'AUTH-MEMBERSHIP-INVALID');
    assertTrue(inv.reason.length > 0);
    assertEqual(inv.validation_errors, []);
    assertEqual(inv.source_employee_id, null);
  });

  // ── Pipeline: validator → resolver composition ─────────────
  await test('Pipeline: validator rejects before resolver runs', () => {
    const m = { organisation_id: 't1', status: 'bad', role_assignments: [] };
    const v = validateMembership(m);
    assertFalse(v.valid);
    const r = resolveActiveAssignments(m, createFixedClock(NOW));
    // Resolver is defensive: even an invalid membership's assignments
    // are still evaluated structurally — but the AccessEngine will
    // never reach here because it denies on invalid.
    assertEqual(r.active_assignments, []);
  });

  await test('Pipeline: valid membership → resolver returns active only', () => {
    const m = {
      membership_id: 'm10', organisation_id: 't1', membership_type: 'employee', status: 'active',
      role_assignments: [
        { role: 'worker', status: 'active' },
        { role: 'outlet_manager', effective_until: '2026-06-01T00:00:00Z' },
      ],
    };
    const v = validateMembership(m);
    assertTrue(v.valid);
    const r = resolveActiveAssignments(m, createFixedClock(NOW));
    assertEqual(r.active_assignments.length, 1);
    assertEqual(r.active_assignments[0].role, 'worker');
  });

  return { passed, failed, total: tests.length, tests };
}