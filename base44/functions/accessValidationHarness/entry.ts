// ============================================================
// ORBITANOS — Access Engine Validation Harness (Phase 1 Inc. #2/#3)
// Backend runner.
//
// Tier 1 — Identity Linkage classifier (shared canonical):
//   success, idempotency, conflict (point 8), multi-tenant, fail-closed.
//
// Tier 2 — RLS Structure Validator (AFR rule #4):
//   before/after evidence for the ClockRecord RLS hardening
//   ($in-in-user_condition + user_condition-not-alone → documented form).
//
// The Access Engine membership / precedence tests run in the frontend
// suite (src/lib/access/__tests__/...) because that pure logic
// currently resides in src/lib/access (ADR-0050).
// ============================================================

import { classifyLinkage } from '../../shared/identityLinkage.ts';
import { validateRls } from '../../shared/rlsStructureValidator.ts';

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
  function ok(v, m) { if (!v) throw new Error(m || 'expected truthy'); }

  const user = { id: 'u_1', email: 'ali@orbitan.dev' };

  // ═══ Tier 1 — Identity Linkage classifier ═══════════════════
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

  test('linkage: conflicting user_id → conflict, never overwritten', () => {
    const r = classifyLinkage(
      [{ id: 'e1', user_id: 'u_other', email: 'ali@orbitan.dev', tenant_id: 't1' }],
      user
    );
    eq(r.linked.length, 0, 'must NOT link a conflicting record');
    eq(r.conflicts.length, 1);
    eq(r.conflicts[0].existing_user_id, 'u_other');
  });

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

  test('linkage: null/empty employees → empty result', () => {
    eq(classifyLinkage(null, user).linked.length, 0);
    eq(classifyLinkage([], user).linked.length, 0);
  });
  test('linkage: null user → empty result (fail-closed)', () => {
    eq(classifyLinkage([{ id: 'e1', user_id: null }], null).linked.length, 0);
  });

  // ═══ Tier 2 — RLS Structure Validator (before/after) ════════
  // Pre-fix ClockRecord read: $in inside user_condition + user_condition
  // sharing an object with a record field (both undocumented / AFR #4).
  const PRE_FIX_CLOCK_READ = {
    'data.tenant_id': '{{user.data.tenant_id}}',
    '$or': [
      { 'user_condition': { 'role': 'admin' } },
      { 'data.employee_id': '{{user.id}}' },
      {
        'data.outlet_id': '{{user.data.outlet_id}}',
        'user_condition': { 'role': { '$in': ['tenant_admin', 'outlet_manager', 'supervisor'] } },
      },
    ],
  };

  // Post-fix ClockRecord read: documented form — top-level $and wrapping
  // tenant boundary + $or; the outlet-scoped manager/supervisor grant is
  // an $and of outlet-match + $or of plain user_condition branches.
  const POST_FIX_CLOCK_READ = {
    '$and': [
      { 'data.tenant_id': '{{user.data.tenant_id}}' },
      { '$or': [
        { 'user_condition': { 'role': 'admin' } },
        { 'data.employee_id': '{{user.id}}' },
        { '$and': [
          { 'data.outlet_id': '{{user.data.outlet_id}}' },
          { '$or': [
            { 'user_condition': { 'role': 'tenant_admin' } },
            { 'user_condition': { 'role': 'outlet_manager' } },
            { 'user_condition': { 'role': 'supervisor' } },
          ] },
        ] },
      ] },
    ],
  };

  test('rls: PRE-fix ClockRecord read flagged operator_in_user_condition', () => {
    const v = validateRls(PRE_FIX_CLOCK_READ);
    ok(v.some((x) => x.code === 'operator_in_user_condition'), 'expected operator_in_user_condition');
  });
  test('rls: PRE-fix ClockRecord read flagged user_condition_not_alone', () => {
    const v = validateRls(PRE_FIX_CLOCK_READ);
    ok(v.some((x) => x.code === 'user_condition_not_alone'), 'expected user_condition_not_alone');
  });
  test('rls: POST-fix ClockRecord read is structurally valid', () => {
    eq(validateRls(POST_FIX_CLOCK_READ), []);
  });
  test('rls: POST-fix ClockRecord read preserves tenant boundary', () => {
    // The corrected rule still gates on data.tenant_id at the top $and.
    ok(JSON.stringify(POST_FIX_CLOCK_READ).includes('"data.tenant_id"'), 'tenant boundary retained');
  });
  test('rls: validator rejects a lone $in inside user_condition (ComplianceRecord-style)', () => {
    const r = validateRls({
      '$and': [
        { 'data.tenant_id': '{{user.data.tenant_id}}' },
        { '$or': [
          { 'user_condition': { 'role': 'admin' } },
          { 'user_condition': { 'role': { '$in': ['outlet_manager', 'supervisor'] } } },
        ] },
      ],
    });
    ok(r.some((x) => x.code === 'operator_in_user_condition'), 'should flag $in in user_condition');
  });
  test('rls: validator accepts plain multi-role $or (documented form)', () => {
    const r = validateRls({
      '$and': [
        { 'data.tenant_id': '{{user.data.tenant_id}}' },
        { '$or': [
          { 'user_condition': { 'role': 'admin' } },
          { 'user_condition': { 'role': 'outlet_manager' } },
          { 'user_condition': { 'role': 'supervisor' } },
        ] },
      ],
    });
    eq(r, []);
  });

  // FoodSafetyLog — Cluster 2 finding (same defect class, lone $in)
  const PRE_FIX_FOODSAFETY_READ = {
    'data.tenant_id': '{{user.data.tenant_id}}',
    'data.outlet_id': '{{user.data.outlet_id}}',
    '$or': [
      { 'user_condition': { 'role': 'admin' } },
      { 'user_condition': { 'role': { '$in': ['tenant_admin', 'outlet_manager', 'supervisor', 'worker'] } } },
    ],
  };
  const POST_FIX_FOODSAFETY_READ = {
    '$and': [
      { 'data.tenant_id': '{{user.data.tenant_id}}' },
      { 'data.outlet_id': '{{user.data.outlet_id}}' },
      { '$or': [
        { 'user_condition': { 'role': 'admin' } },
        { 'user_condition': { 'role': 'tenant_admin' } },
        { 'user_condition': { 'role': 'outlet_manager' } },
        { 'user_condition': { 'role': 'supervisor' } },
        { 'user_condition': { 'role': 'worker' } },
      ] },
    ],
  };
  test('rls: PRE-fix FoodSafetyLog read flagged operator_in_user_condition', () => {
    ok(validateRls(PRE_FIX_FOODSAFETY_READ).some((x) => x.code === 'operator_in_user_condition'));
  });
  test('rls: POST-fix FoodSafetyLog read is structurally valid', () => {
    eq(validateRls(POST_FIX_FOODSAFETY_READ), []);
  });

  // Cluster 3 — full sweep: 11 confirmed $in-in-user_condition defects, now remediated.
  // Each post-fix rule must validate clean (AFR #4 + guide-compliant documented form).
  const POST_FIX_CLUSTER3 = {
    Supplier: { '$and': [ { 'data.tenant_id': '{{user.data.tenant_id}}' }, { '$or': [ { 'user_condition': { 'role': 'admin' } }, { 'user_condition': { 'role': 'tenant_admin' } }, { 'user_condition': { 'role': 'outlet_manager' } }, { 'user_condition': { 'role': 'supervisor' } }, { 'user_condition': { 'role': 'worker' } } ] } ] },
    AIDocument: { '$and': [ { 'data.tenant_id': '{{user.data.tenant_id}}' }, { '$or': [ { 'user_condition': { 'role': 'admin' } }, { 'user_condition': { 'role': 'tenant_admin' } }, { 'user_condition': { 'role': 'outlet_manager' } }, { 'user_condition': { 'role': 'supervisor' } } ] } ] },
    ReplenishmentAlert: { '$and': [ { 'data.tenant_id': '{{user.data.tenant_id}}' }, { 'data.outlet_id': '{{user.data.outlet_id}}' }, { '$or': [ { 'user_condition': { 'role': 'admin' } }, { 'user_condition': { 'role': 'tenant_admin' } }, { 'user_condition': { 'role': 'outlet_manager' } }, { 'user_condition': { 'role': 'supervisor' } } ] } ] },
    MaterialCollection: { '$and': [ { 'data.tenant_id': '{{user.data.tenant_id}}' }, { '$or': [ { 'user_condition': { 'role': 'admin' } }, { 'user_condition': { 'role': 'tenant_admin' } }, { 'user_condition': { 'role': 'outlet_manager' } }, { 'user_condition': { 'role': 'supervisor' } }, { 'user_condition': { 'role': 'worker' } } ] } ] },
    GoodsReceipt: { '$and': [ { 'data.tenant_id': '{{user.data.tenant_id}}' }, { 'data.outlet_id': '{{user.data.outlet_id}}' }, { '$or': [ { 'user_condition': { 'role': 'admin' } }, { 'user_condition': { 'role': 'outlet_manager' } }, { 'user_condition': { 'role': 'supervisor' } } ] } ] },
    FinanceMapping: { '$and': [ { 'data.tenant_id': '{{user.data.tenant_id}}' }, { '$or': [ { 'user_condition': { 'role': 'admin' } }, { 'user_condition': { 'role': 'tenant_admin' } }, { 'user_condition': { 'role': 'outlet_manager' } } ] } ] },
    AccountMapping_read: { '$and': [ { 'data.tenant_id': '{{user.data.tenant_id}}' }, { '$or': [ { 'user_condition': { 'role': 'admin' } }, { 'user_condition': { 'role': 'tenant_admin' } }, { 'user_condition': { 'role': 'outlet_manager' } } ] } ] },
    Announcement: { '$and': [ { 'data.tenant_id': '{{user.data.tenant_id}}' }, { '$or': [ { 'user_condition': { 'role': 'admin' } }, { 'user_condition': { 'role': 'tenant_admin' } }, { 'user_condition': { 'role': 'outlet_manager' } } ] } ] },
    CustomerProfile: { '$and': [ { 'data.tenant_id': '{{user.data.tenant_id}}' }, { '$or': [ { 'user_condition': { 'role': 'admin' } }, { 'user_condition': { 'role': 'tenant_admin' } }, { 'user_condition': { 'role': 'outlet_manager' } }, { 'user_condition': { 'role': 'supervisor' } }, { 'user_condition': { 'role': 'worker' } } ] } ] },
    ComplianceSnapshot_read: { '$or': [ { 'user_condition': { 'role': 'admin' } }, { '$and': [ { 'data.tenant_id': '{{user.data.tenant_id}}' }, { '$or': [ { 'user_condition': { 'role': 'tenant_admin' } }, { 'user_condition': { 'role': 'outlet_manager' } } ] } ] } ] },
    ProductCatalog: { '$and': [ { 'data.tenant_id': '{{user.data.tenant_id}}' }, { '$or': [ { 'user_condition': { 'role': 'admin' } }, { 'user_condition': { 'role': 'tenant_admin' } }, { 'user_condition': { 'role': 'outlet_manager' } }, { 'user_condition': { 'role': 'supervisor' } }, { 'user_condition': { 'role': 'worker' } } ] } ] },
  };
  test('rls: all 11 Cluster-3 fixed RLS rules validate clean', () => {
    for (const [name, rule] of Object.entries(POST_FIX_CLUSTER3)) {
      eq(validateRls(rule), [], name + ' should be structurally valid');
    }
  });

  const total = tests.length;
  const pass_rate = total ? Math.round((passed / total) * 100) + '%' : '0%';
  return Response.json({ summary: { total, passed, failed, pass_rate }, tests });
});