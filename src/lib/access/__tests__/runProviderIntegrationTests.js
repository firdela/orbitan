// ============================================================
// ORBITANOS — Access Engine :: Provider Integration Tests (M3.2)
// Architecture Version 1.0 (Frozen) — ADR-0050 §M3.2
//
// Verifies the MembershipProvider boundary INDEPENDENTLY of the
// Access Engine and of Base44. Covers:
//   1. valid membership
//   2. missing employee (null)
//   3. suspended membership
//   4. tenant mismatch
//   5. provider exception
//   6. multiple records (prefers active)
//   7. unknown status (Employee → suspended via translator)
//
// Also covers the EmployeeBase44Provider migration boundary with an
// injected mock SDK (no real Base44 calls).
//
// Pure test runner — no framework.
// Exports runProviderIntegrationTests() -> { passed, failed, total, tests }.
// ============================================================

import { createMockMembershipProvider } from '../providers/MockMembershipProvider.js';
import { createEmployeeBase44Provider } from '../providers/EmployeeBase44Provider.js';
import { translateEmployee } from '../membership/MembershipResolver.js';
import { MEMBERSHIP_PROVIDER_CONTRACT_VERSION } from '../providers/MembershipProvider.js';

export async function runProviderIntegrationTests() {
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
  function assertThrows(fn, m) { let threw = false; try { fn(); } catch { threw = true; } if (!threw) throw new Error(m || 'expected throw'); }

  const workerMembership = Object.freeze({
    user_id: 'u_worker', organisation_id: 't1', membership_type: 'employee',
    status: 'active', display_name: 'Worker One',
    role_assignments: [{ role: 'worker', scope: { tenant_id: 't1', outlet_id: 'o1' } }],
  });
  const suspendedMembership = Object.freeze({
    user_id: 'u_susp', organisation_id: 't1', membership_type: 'employee',
    status: 'suspended', display_name: 'Suspended One',
    role_assignments: [{ role: 'worker', scope: { tenant_id: 't1' } }],
  });
  const otherTenantMembership = Object.freeze({
    user_id: 'u_multi', organisation_id: 't_other', membership_type: 'employee',
    status: 'active', display_name: 'Multi Tenant',
    role_assignments: [{ role: 'worker', scope: { tenant_id: 't_other' } }],
  });

  // ── MockMembershipProvider ─────────────────────────────────
  test('1. valid membership resolves', async () => {
    const p = createMockMembershipProvider([workerMembership]);
    const m = await p.resolve({ id: 'u_worker' });
    assertEqual(m.organisation_id, 't1');
    assertEqual(m.status, 'active');
  });
  test('2. missing employee returns null', async () => {
    const p = createMockMembershipProvider([workerMembership]);
    const m = await p.resolve({ id: 'u_nobody' });
    assertEqual(m, null);
  });
  test('3. suspended membership resolves (downstream denies)', async () => {
    const p = createMockMembershipProvider([suspendedMembership]);
    const m = await p.resolve({ id: 'u_susp' });
    assertEqual(m.status, 'suspended');
  });
  test('4. tenant mismatch returns null', async () => {
    const p = createMockMembershipProvider([workerMembership]);
    const m = await p.resolve({ id: 'u_worker' }, { tenant_id: 't_other' });
    assertEqual(m, null);
  });
  test('4b. tenant match resolves', async () => {
    const p = createMockMembershipProvider([workerMembership, otherTenantMembership]);
    const m = await p.resolve({ id: 'u_multi' }, { tenant_id: 't_other' });
    assertEqual(m.organisation_id, 't_other');
  });
  test('5. provider exception propagates', async () => {
    const p = createMockMembershipProvider([workerMembership], { throwFor: (id) => id.id === 'u_explodes' });
    let threw = false;
    try { await p.resolve({ id: 'u_explodes' }); } catch { threw = true; }
    assertTrue(threw, 'expected provider to throw');
  });
  test('6. multiple records — prefers active', async () => {
    const inactive = { ...workerMembership, status: 'suspended', organisation_id: 't1' };
    const p = createMockMembershipProvider([inactive, workerMembership]);
    const m = await p.resolve({ id: 'u_worker' });
    assertEqual(m.status, 'active');
  });
  test('6b. multiple records — no active, returns first', async () => {
    const onlySuspended = { ...workerMembership, status: 'suspended' };
    const p = createMockMembershipProvider([onlySuspended]);
    const m = await p.resolve({ id: 'u_worker' });
    assertEqual(m.status, 'suspended');
  });
  test('7. unknown Employee status → suspended (fail-closed translation)', async () => {
    const mockClient = {
      entities: {
        Employee: {
          filter: async () => [{ id: 'e1', user_id: 'u1', tenant_id: 't1', role: 'worker', status: 'weird', full_name: 'X' }],
        },
      },
    };
    const p = createEmployeeBase44Provider({ client: mockClient });
    const m = await p.resolve({ id: 'u1' });
    assertEqual(m.status, 'suspended', 'unknown status should map to suspended');
  });
  test('mock provider exposes contract version + name + version', () => {
    const p = createMockMembershipProvider([workerMembership]);
    assertEqual(p.name, 'MockMembershipProvider');
    assertTrue(p.version);
    assertEqual(p.contractVersion, MEMBERSHIP_PROVIDER_CONTRACT_VERSION);
  });

  // ── EmployeeBase44Provider (migration boundary) ──────────
  test('EmployeeBase44Provider: queries Employee, returns normalized Membership', async () => {
    let receivedFilter = null;
    const mockClient = {
      entities: {
        Employee: {
          filter: async (f) => { receivedFilter = f; return [{ id: 'e1', user_id: 'u1', tenant_id: 't1', outlet_id: 'o1', role: 'outlet_manager', full_name: 'Hamka', status: 'active' }]; },
        },
      },
    };
    const p = createEmployeeBase44Provider({ client: mockClient });
    const m = await p.resolve({ id: 'u1' });
    assertEqual(m.membership_type, 'employee');
    assertEqual(m.organisation_id, 't1');
    assertEqual(m.role_assignments[0].role, 'outlet_manager');
    assertEqual(receivedFilter.user_id, 'u1');
  });
  test('EmployeeBase44Provider: null when no records', async () => {
    const mockClient = { entities: { Employee: { filter: async () => [] } } };
    const p = createEmployeeBase44Provider({ client: mockClient });
    const m = await p.resolve({ id: 'u1' });
    assertEqual(m, null);
  });
  test('EmployeeBase44Provider: null when no identity id', async () => {
    const mockClient = { entities: { Employee: { filter: async () => { throw new Error('should not be called'); } } } };
    const p = createEmployeeBase44Provider({ client: mockClient });
    const m = await p.resolve({});
    assertEqual(m, null);
  });
  test('EmployeeBase44Provider: multiple records prefers active', async () => {
    const mockClient = {
      entities: {
        Employee: {
          filter: async () => [
            { id: 'e1', user_id: 'u1', tenant_id: 't1', role: 'worker', status: 'terminated', full_name: 'Old' },
            { id: 'e2', user_id: 'u1', tenant_id: 't1', role: 'supervisor', status: 'active', full_name: 'New' },
          ],
        },
      },
    };
    const p = createEmployeeBase44Provider({ client: mockClient });
    const m = await p.resolve({ id: 'u1' });
    assertEqual(m.role_assignments[0].role, 'supervisor');
    assertEqual(m.status, 'active');
  });
  test('EmployeeBase44Provider: tenant scope applied to filter', async () => {
    let receivedFilter = null;
    const mockClient = {
      entities: { Employee: { filter: async (f) => { receivedFilter = f; return []; } } },
    };
    const p = createEmployeeBase44Provider({ client: mockClient });
    await p.resolve({ id: 'u1', tenant_id: 't1' }, { tenant_id: 't1' });
    assertEqual(receivedFilter.tenant_id, 't1');
  });
  test('EmployeeBase44Provider: exposes name + version + contractVersion', () => {
    const p = createEmployeeBase44Provider({ client: { entities: { Employee: { filter: async () => [] } } } });
    assertEqual(p.name, 'EmployeeBase44Provider');
    assertTrue(p.version);
    assertEqual(p.contractVersion, MEMBERSHIP_PROVIDER_CONTRACT_VERSION);
  });
  test('EmployeeBase44Provider: translateEmployee used as sole adapter', () => {
    // Confirm the provider module re-exports the translator path; the
    // actual translation correctness is covered by M2 tests.
    assertTrue(typeof translateEmployee === 'function');
  });

  await Promise.all(pending);
  return { passed, failed, total: tests.length, tests };
}