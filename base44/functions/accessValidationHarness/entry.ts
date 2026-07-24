// ============================================================
// ORBITANOS — Access Engine Validation Harness (Phase 1 Inc. #2)
// Backend runner for the Orbit Identity Model linkage classifier.
//
// Follows the taskControllerTestSuite precedent: a backend function
// executes a pure suite server-side so results are capturable via
// the dev page and the platform test runner.
//
// Scope (server-side, shared canonical module):
//   - Successful linkage (unlinked → linked)
//   - Idempotency (already-linked → skipped)
//   - Identity conflict (existing different user_id → never overwritten)
//   - Multi-tenant membership classification
//   - Fail-closed null safety
//
// The Access Engine membership / precedence / platform-owner tests
// run in the frontend suite (src/lib/access/__tests__/...) because
// that pure logic currently resides in src/lib/access (ADR-0050).
// ============================================================

import { classifyLinkage } from '../../shared/identityLinkage.ts';

Deno.serve(async (_req) => {
  const tests = [];
  let passed = 0, failed = 0;

  function test(name, fn) {
    try { fn(); passed += 1; tests.push({ name, passed: true }); }
    catch (err) { failed += 1; tests.push({ name, passed: false, error: err?.message || String(err) }); }
  }
  function eq(a, e, m) {
    if (JSON.stringify(a) !== JSON.stringify(e))
      throw new Error(`${m || ''} got ${JSON.stringify(a)} expected ${JSON.stringify(e)}`);
  }

  const user = { id: 'u_1', email: 'ali@orbitan.dev' };

  // ── 1. Successful linkage ────────────────────────────────────
  test('linkage: unlinked employee → linked', () => {
    const r = classifyLinkage(
      [{ id: 'e1', user_id: null, email: 'ali@orbitan.dev', tenant_id: 't1', role: 'worker' }],
      user
    );
    eq(r.linked.length, 1);
    eq(r.linked[0].id, 'e1');
    eq(r.skipped.length, 0);
    eq(r.conflicts.length, 0);
  });

  // ── Idempotency ──────────────────────────────────────────────
  test('linkage: already-linked → skipped (idempotent)', () => {
    const r = classifyLinkage(
      [{ id: 'e1', user_id: 'u_1', email: 'ali@orbitan.dev', tenant_id: 't1' }],
      user
    );
    eq(r.linked.length, 0);
    eq(r.skipped.length, 1);
    eq(r.skipped[0].reason, 'already_linked');
    eq(r.conflicts.length, 0);
  });

  // ── Identity conflict (point 8: never overrides existing user_id) ─
  test('linkage: conflicting user_id → conflict, never overwritten', () => {
    const r = classifyLinkage(
      [{ id: 'e1', user_id: 'u_other', email: 'ali@orbitan.dev', tenant_id: 't1' }],
      user
    );
    eq(r.linked.length, 0, 'must NOT link a conflicting record');
    eq(r.conflicts.length, 1);
    eq(r.conflicts[0].existing_user_id, 'u_other');
  });

  // ── Multi-tenant membership (one user, many tenants) ─────────
  test('linkage: one user resolves multiple tenant memberships', () => {
    const r = classifyLinkage(
      [
        { id: 'e1', user_id: null, tenant_id: 't1', role: 'worker' },
        { id: 'e2', user_id: null, tenant_id: 't2', role: 'worker' },
      ],
      user
    );
    eq(r.linked.length, 2);
    eq(r.linked.map((l) => l.tenant_id).sort(), ['t1', 't2']);
  });

  // ── Mixed set classification ──────────────────────────────────
  test('linkage: mixed set classified correctly', () => {
    const r = classifyLinkage(
      [
        { id: 'e1', user_id: null, tenant_id: 't1', role: 'worker' },
        { id: 'e2', user_id: 'u_1', tenant_id: 't2' },
        { id: 'e3', user_id: 'u_other', tenant_id: 't3' },
        { id: 'e4', user_id: null, tenant_id: 't4', role: 'supervisor' },
      ],
      user
    );
    eq(r.linked.length, 2);
    eq(r.skipped.length, 1);
    eq(r.conflicts.length, 1);
  });

  // ── Fail-closed null safety ──────────────────────────────────
  test('linkage: null/empty employees → empty result', () => {
    eq(classifyLinkage(null, user).linked.length, 0);
    eq(classifyLinkage([], user).linked.length, 0);
  });
  test('linkage: null user → empty result (fail-closed)', () => {
    eq(classifyLinkage([{ id: 'e1', user_id: null }], null).linked.length, 0);
  });

  const total = tests.length;
  const pass_rate = total ? Math.round((passed / total) * 100) + '%' : '0%';
  return Response.json({ summary: { total, passed, failed, pass_rate }, tests });
});