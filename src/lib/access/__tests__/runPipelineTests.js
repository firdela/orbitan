// ============================================================
// ORBITANOS — Access Engine :: Pipeline Integration Tests (M3.2)
// Architecture Version 1.0 (Frozen) — ADR-0050 §M3.2
//
// End-to-end composition: Provider → Validator → AssignmentResolver
// → PermissionResolver → Decision. Verifies fail-closed behavior and
// audit metadata across the full pipeline using MockMembershipProvider.
//
// Pure test runner — no framework. No Base44 SDK import (provider boundary
// keeps the pipeline pure).
// Exports runPipelineTests() -> { passed, failed, total, tests }.
// ============================================================

import { createAccessPipeline } from '../pipeline.js';
import { createMockMembershipProvider } from '../providers/MockMembershipProvider.js';
import { createFixedClock } from '../clock.js';
import { DECISION } from '../DecisionObject.js';

export async function runPipelineTests() {
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

  const workerMembership = Object.freeze({
    user_id: 'u_worker', organisation_id: 't1', membership_type: 'employee',
    status: 'active', display_name: 'Worker One',
    role_assignments: [{ role: 'worker', scope: { tenant_id: 't1', outlet_id: 'o1' } }],
  });
  const managerMembership = Object.freeze({
    user_id: 'u_mgr', organisation_id: 't1', membership_type: 'employee',
    status: 'active', display_name: 'Manager One',
    role_assignments: [{ role: 'outlet_manager', scope: { tenant_id: 't1', outlet_id: 'o1' } }],
  });

  function pipelineWith(memberships, opts = {}) {
    const provider = createMockMembershipProvider(memberships, opts);
    const clock = createFixedClock('2026-07-01T12:00:00Z');
    return createAccessPipeline({ provider, clock });
  }

  // ── Happy path ────────────────────────────────────────────
  test('pipeline: active worker is ALLOWED with permissions', async () => {
    const p = pipelineWith([workerMembership]);
    const r = await p.resolveAccess({ identity: { id: 'u_worker' } });
    assertEqual(r.decision.decision, DECISION.ALLOWED);
    assertTrue(r.permissions.length > 0);
    assertTrue(r.permissions.some(x => x.key === 'task.read'));
  });
  test('pipeline: outlet_manager gets inventoryitem.adjust', async () => {
    const p = pipelineWith([managerMembership]);
    const r = await p.resolveAccess({ identity: { id: 'u_mgr' } });
    assertEqual(r.decision.decision, DECISION.ALLOWED);
    assertTrue(r.permissions.some(x => x.key === 'inventoryitem.adjust'));
  });
  test('pipeline: permissions derived from ACTIVE assignments only', async () => {
    const future = {
      ...workerMembership, user_id: 'u_future',
      role_assignments: [{ role: 'worker', scope: { tenant_id: 't1' }, effective_from: '2026-08-01T00:00:00Z' }],
    };
    const p = pipelineWith([future]);
    const r = await p.resolveAccess({ identity: { id: 'u_future' } });
    assertEqual(r.decision.decision, DECISION.DENIED);
    assertEqual(r.active_assignments.length, 0);
  });

  // ── Fail-closed paths ─────────────────────────────────────
  test('pipeline: missing employee → DENIED no_membership', async () => {
    const p = pipelineWith([workerMembership]);
    const r = await p.resolveAccess({ identity: { id: 'u_ghost' } });
    assertEqual(r.decision.decision, DECISION.DENIED);
    assertEqual(r.decision.denial_reason, 'no_membership');
  });
  test('pipeline: suspended membership → DENIED membership_inactive', async () => {
    const suspended = { ...workerMembership, user_id: 'u_susp', status: 'suspended' };
    const p = pipelineWith([suspended]);
    const r = await p.resolveAccess({ identity: { id: 'u_susp' } });
    assertEqual(r.decision.decision, DECISION.DENIED);
    assertEqual(r.decision.denial_reason, 'membership_inactive');
  });
  test('pipeline: revoked membership → DENIED membership_inactive', async () => {
    const revoked = { ...workerMembership, user_id: 'u_rev', status: 'revoked' };
    const p = pipelineWith([revoked]);
    const r = await p.resolveAccess({ identity: { id: 'u_rev' } });
    assertEqual(r.decision.decision, DECISION.DENIED);
    assertEqual(r.decision.denial_reason, 'membership_inactive');
  });
  test('pipeline: provider throws → DENIED provider_error', async () => {
    const p = pipelineWith([workerMembership], { throwFor: (id) => id.id === 'u_boom' });
    const r = await p.resolveAccess({ identity: { id: 'u_boom' } });
    assertEqual(r.decision.decision, DECISION.DENIED);
    assertEqual(r.decision.denial_reason, 'provider_error');
    assertTrue(r.error);
  });
  test('pipeline: invalid membership shape → DENIED invalid_membership', async () => {
    const bad = { user_id: 'u_bad', organisation_id: 't1', membership_type: 'employee', status: 'active' }; // no role_assignments
    const p = pipelineWith([bad]);
    const r = await p.resolveAccess({ identity: { id: 'u_bad' } });
    assertEqual(r.decision.decision, DECISION.DENIED);
    assertEqual(r.decision.denial_reason, 'invalid_membership');
    assertTrue(r.invalid);
  });
  test('pipeline: no identity → DENIED unauthenticated', async () => {
    const p = pipelineWith([workerMembership]);
    const r = await p.resolveAccess({});
    assertEqual(r.decision.decision, DECISION.DENIED);
    assertEqual(r.decision.denial_reason, 'unauthenticated');
  });
  test('pipeline: tenant mismatch → DENIED no_membership', async () => {
    const p = pipelineWith([workerMembership]);
    const r = await p.resolveAccess({ identity: { id: 'u_worker' }, context: { tenant_id: 't_other' } });
    assertEqual(r.decision.decision, DECISION.DENIED);
    assertEqual(r.decision.denial_reason, 'no_membership');
  });

  // ── Audit metadata ────────────────────────────────────────
  test('pipeline: metadata carries all resolver names + versions', async () => {
    const p = pipelineWith([workerMembership]);
    const r = await p.resolveAccess({ identity: { id: 'u_worker' } });
    const md = r.metadata;
    assertEqual(md.pipeline.name, 'AccessPipeline');
    assertEqual(md.provider.name, 'MockMembershipProvider');
    assertEqual(md.resolvers.membership.name, 'MembershipResolver');
    assertEqual(md.resolvers.validator.name, 'MembershipValidator');
    assertEqual(md.resolvers.assignment.name, 'RoleAssignmentResolver');
    assertEqual(md.resolvers.permission.name, 'PermissionResolver');
    assertTrue(md.resolvers.membership.version);
    assertTrue(md.resolvers.validator.version);
    assertTrue(md.resolvers.assignment.version);
    assertTrue(md.resolvers.permission.version);
  });
  test('pipeline: pipeline exposes provider + clock identity', () => {
    const p = pipelineWith([workerMembership]);
    assertEqual(p.providerName, 'MockMembershipProvider');
    assertEqual(p.clockName, 'FixedClock');
  });
  test('pipeline: missing provider throws at construction', () => {
    let threw = false;
    try { createAccessPipeline({}); } catch { threw = true; }
    assertTrue(threw, 'expected construction to fail without a provider');
  });
  test('pipeline: non-provider throws at construction', () => {
    let threw = false;
    try { createAccessPipeline({ provider: { name: 'x', version: '1.0' } }); } catch { threw = true; }
    assertTrue(threw, 'provider without resolve() must be rejected');
  });

  await Promise.all(pending);
  return { passed, failed, total: tests.length, tests };
}