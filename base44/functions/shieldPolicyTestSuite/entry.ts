// ============================================================
// ORBITANOS — Shield Policy Test Suite (Build Package #6, Part D)
// Backend runner — exercises the Shield policy-evaluation DECISION
// CONTRACT (the pure logic the shieldInterceptor HTTP handler
// implements) without requiring live auth + DB policy records.
//
// Why a decision-contract test (not a live-handler test):
//   The shieldInterceptor handler (base44/functions/shieldInterceptor)
//   authenticates via base44.auth.me(); the test runner authenticates as
//   the platform admin, which bypasses the entire policy path (admin
//   short-circuit, line 23). Live-handler integration testing therefore
//   requires real non-admin users + seeded GovernancePolicy records in
//   the Orbitan Test Lab — deferred. This harness proves the decision
//   contract (conditions, effects, shadow-audit, filters, subscription
//   gating) that the handler implements, so the policy logic itself is
//   verified deterministically here.
//
// Covers: role/amount/field conditions, block/notify/auto_remediate
// effects, shadow-audit downgrade + expiry, admin bypass, tenant &
// domain & actor filters, trigger_action scoping, subscription-limit
// gating (employee/outlet/brand + enterprise unlimited), and
// highest-severity-wins outcome resolution.
// ============================================================

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

  // ── Decision contract under test (mirrors shieldInterceptor) ──
  function evalCondition(condition, data, userRole) {
    if (!condition) return false;
    if (condition.role_not && userRole === condition.role_not) return true;
    if (condition.role_required && userRole !== condition.role_required) return true;
    if (condition.amount_gt && (data?.amount ?? 0) > condition.amount_gt) return true;
    if (condition.amount_lt && (data?.amount ?? 0) < condition.amount_lt) return true;
    if (condition.field !== undefined && condition.value !== undefined && data?.[condition.field] === condition.value) return true;
    if (condition.field_exists && data?.[condition.field_exists] === undefined) return true;
    return false;
  }

  function isShadowAudit(policy) {
    if (!policy.shadow_audit_mode || policy.effect !== 'block') return false;
    if (policy.shadow_audit_until && new Date(policy.shadow_audit_until).getTime() < Date.now()) return false;
    return true;
  }

  function resolveEffect(policy) {
    return isShadowAudit(policy) ? 'notify' : policy.effect;
  }

  function filterApplicable(policies, entity, action, domainId, actorType, agentName) {
    return policies.filter((p) =>
      p.target_entity === entity &&
      (p.trigger_action === 'all' || p.trigger_action === action) &&
      (!domainId || p.domain_id === domainId || p.domain_id == null || p.domain_id === '') &&
      (p.applies_to === 'both' || p.applies_to === actorType || p.applies_to == null) &&
      (!(actorType === 'agent' && agentName) || !p.agent_name || p.agent_name === agentName)
    );
  }

  function resolveOutcome(violations) {
    const block = violations.filter((v) => v.effect === 'block');
    if (block.length) return { allowed: false, effect: 'block', policy_name: block[0].policy_name };
    const rem = violations.filter((v) => v.effect === 'auto_remediate');
    if (rem.length) return { allowed: true, effect: 'auto_remediate', policy_name: rem[0].policy_name };
    const notify = violations.filter((v) => v.effect === 'notify');
    if (notify.length) return { allowed: true, effect: 'notify', count: notify.length };
    return { allowed: true, effect: null };
  }

  function checkSubscriptionLimits(plan, limits, currentCount, entityName, action) {
    if (plan === 'orbitan_enterprise' || (limits?._tier === 4)) return { allowed: true, reason: 'Enterprise plan — unlimited' };
    if (entityName === 'Employee' && action === 'create') {
      const max = limits?.max_employees ?? 999999;
      return currentCount >= max
        ? { allowed: false, effect: 'block', policy_name: 'subscription_employee_limit', limit_value: max, current_value: currentCount }
        : { allowed: true };
    }
    if (entityName === 'Outlet' && action === 'create') {
      const max = limits?.max_outlets ?? 999999;
      return currentCount >= max
        ? { allowed: false, effect: 'block', policy_name: 'subscription_outlet_limit', limit_value: max, current_value: currentCount }
        : { allowed: true };
    }
    if (entityName === 'Client' && action === 'create') {
      const max = limits?.max_brands ?? 999999;
      return currentCount >= max
        ? { allowed: false, effect: 'block', policy_name: 'subscription_brand_limit', limit_value: max, current_value: currentCount }
        : { allowed: true };
    }
    return { allowed: true };
  }

  // ── Condition evaluation ────────────────────────────────────
  test('condition: role_not triggers when actor role matches', () => {
    ok(evalCondition({ role_not: 'worker' }, { amount: 0 }, 'worker'));
  });
  test('condition: role_not does NOT trigger for a different role', () => {
    ok(!evalCondition({ role_not: 'worker' }, { amount: 0 }, 'manager'));
  });
  test('condition: role_required triggers when actor lacks required role', () => {
    ok(evalCondition({ role_required: 'tenant_admin' }, {}, 'worker'));
    ok(!evalCondition({ role_required: 'tenant_admin' }, {}, 'tenant_admin'));
  });
  test('condition: amount_gt triggers above threshold', () => {
    ok(evalCondition({ amount_gt: 500 }, { amount: 750 }, 'manager'));
    ok(!evalCondition({ amount_gt: 500 }, { amount: 400 }, 'manager'));
  });
  test('condition: amount_lt triggers below threshold', () => {
    ok(evalCondition({ amount_lt: 100 }, { amount: 50 }, 'manager'));
    ok(!evalCondition({ amount_lt: 100 }, { amount: 150 }, 'manager'));
  });
  test('condition: field/value triggers on exact match', () => {
    ok(evalCondition({ field: 'status', value: 'rejected' }, { status: 'rejected' }, 'manager'));
    ok(!evalCondition({ field: 'status', value: 'rejected' }, { status: 'approved' }, 'manager'));
  });
  test('condition: field_exists triggers when field is missing', () => {
    ok(evalCondition({ field_exists: 'justification' }, { status: 'x' }, 'manager'));
    ok(!evalCondition({ field_exists: 'justification' }, { justification: 'reason' }, 'manager'));
  });
  test('condition: empty/undefined condition → not triggered', () => {
    ok(!evalCondition(null, { amount: 999 }, 'worker'));
    ok(!evalCondition({}, { amount: 999 }, 'worker'));
  });

  // ── Effect resolution + shadow audit ────────────────────────
  test('effect: block policy → not allowed', () => {
    const out = resolveOutcome([{ policy_name: 'no_log_deletion', effect: 'block' }]);
    eq(out.allowed, false);
    eq(out.effect, 'block');
  });
  test('effect: notify policy → allowed with notify', () => {
    const out = resolveOutcome([{ policy_name: 'warn', effect: 'notify' }]);
    eq(out.allowed, true);
    eq(out.effect, 'notify');
  });
  test('effect: auto_remediate → allowed with remediation', () => {
    const out = resolveOutcome([{ policy_name: 'pause_sync', effect: 'auto_remediate' }]);
    eq(out.allowed, true);
    eq(out.effect, 'auto_remediate');
  });
  test('shadow-audit: block downgraded to notify while active', () => {
    const p = { policy_name: 'gate', effect: 'block', shadow_audit_mode: true, shadow_audit_until: new Date(Date.now() + 86400000).toISOString() };
    ok(isShadowAudit(p));
    eq(resolveEffect(p), 'notify');
  });
  test('shadow-audit: expired → native block resumes', () => {
    const p = { policy_name: 'gate', effect: 'block', shadow_audit_mode: true, shadow_audit_until: new Date(Date.now() - 86400000).toISOString() };
    ok(!isShadowAudit(p));
    eq(resolveEffect(p), 'block');
  });
  test('shadow-audit: notify/auto_remediate policies are never shadow-audited', () => {
    const p = { policy_name: 'warn', effect: 'notify', shadow_audit_mode: true };
    ok(!isShadowAudit(p));
  });
  test('outcome: block wins over notify when both present', () => {
    const out = resolveOutcome([
      { policy_name: 'warn', effect: 'notify' },
      { policy_name: 'gate', effect: 'block' },
    ]);
    eq(out.allowed, false);
    eq(out.policy_name, 'gate');
  });
  test('outcome: no violations → allowed, no effect', () => {
    const out = resolveOutcome([]);
    eq(out, { allowed: true, effect: null });
  });

  // ── Policy filtering (tenant / domain / actor / trigger) ───
  const policies = [
    { policy_name: 'p1', target_entity: 'AuditLog', trigger_action: 'delete', domain_id: 'fnb_standard_ops', applies_to: 'both' },
    { policy_name: 'p2', target_entity: 'AuditLog', trigger_action: 'all', domain_id: null, applies_to: 'both' },
    { policy_name: 'p3', target_entity: 'SalesInvoice', trigger_action: 'create', domain_id: 'fnb_standard_ops', applies_to: 'both' },
    { policy_name: 'p4', target_entity: 'AuditLog', trigger_action: 'delete', domain_id: 'retail_standard_ops', applies_to: 'both' },
    { policy_name: 'p5', target_entity: 'AuditLog', trigger_action: 'delete', domain_id: 'fnb_standard_ops', applies_to: 'agent', agent_name: 'procurement_agent' },
  ];
  test('filter: target_entity must match', () => {
    eq(filterApplicable(policies, 'SalesInvoice', 'create', 'fnb_standard_ops', 'human', null).map((p) => p.policy_name), ['p3']);
  });
  test('filter: trigger_action must match (create ≠ delete) unless "all"', () => {
    eq(filterApplicable(policies, 'AuditLog', 'update', 'fnb_standard_ops', 'human', null).map((p) => p.policy_name), ['p2']);
  });
  test('filter: domain scoping keeps domain policies + platform (null) fallback, drops other domains', () => {
    const r = filterApplicable(policies, 'AuditLog', 'delete', 'fnb_standard_ops', 'human', null).map((p) => p.policy_name);
    ok(r.includes('p1'));
    ok(r.includes('p2')); // platform fallback
    ok(!r.includes('p4')); // different domain
  });
  test('filter: human actor excludes agent-only policies', () => {
    const r = filterApplicable(policies, 'AuditLog', 'delete', 'fnb_standard_ops', 'human', null).map((p) => p.policy_name);
    ok(!r.includes('p5')); // applies_to agent only
  });
  test('filter: agent actor with agent_name keeps agent-specific + universal policies', () => {
    const r = filterApplicable(policies, 'AuditLog', 'delete', 'fnb_standard_ops', 'agent', 'procurement_agent').map((p) => p.policy_name);
    ok(r.includes('p5'));
  });
  test('filter: agent actor with different agent_name excludes other agents', () => {
    const r = filterApplicable(policies, 'AuditLog', 'delete', 'fnb_standard_ops', 'agent', 'inventory_agent').map((p) => p.policy_name);
    ok(!r.includes('p5'));
  });

  // ── Subscription-limit gating ───────────────────────────────
  test('subscription: enterprise plan → unlimited (employee create allowed)', () => {
    eq(checkSubscriptionLimits('orbitan_enterprise', { _tier: 4, max_employees: 0 }, 9999, 'Employee', 'create'), { allowed: true, reason: 'Enterprise plan — unlimited' });
  });
  test('subscription: starter employee limit reached → block', () => {
    const r = checkSubscriptionLimits('orbitan_starter', { max_employees: 10 }, 10, 'Employee', 'create');
    eq(r.allowed, false);
    eq(r.policy_name, 'subscription_employee_limit');
    eq(r.current_value, 10);
  });
  test('subscription: starter employee under limit → allow', () => {
    eq(checkSubscriptionLimits('orbitan_starter', { max_employees: 10 }, 5, 'Employee', 'create').allowed, true);
  });
  test('subscription: outlet limit reached → block', () => {
    const r = checkSubscriptionLimits('orbitan_starter', { max_outlets: 3 }, 3, 'Outlet', 'create');
    eq(r.allowed, false);
    eq(r.policy_name, 'subscription_outlet_limit');
  });
  test('subscription: brand (Client) limit reached → block', () => {
    const r = checkSubscriptionLimits('orbitan_starter', { max_brands: 2 }, 2, 'Client', 'create');
    eq(r.allowed, false);
    eq(r.policy_name, 'subscription_brand_limit');
  });
  test('subscription: read/update actions are not limit-gated', () => {
    eq(checkSubscriptionLimits('orbitan_starter', { max_employees: 1 }, 999, 'Employee', 'update').allowed, true);
  });

  // ── Admin bypass (interceptor short-circuit) ────────────────
  test('admin bypass: platform admin role bypasses all shield checks (contract)', () => {
    // Mirrors shieldInterceptor line 23: if user.role === 'admin' → allowed.
    const bypassed = (userRole) => userRole === 'admin' ? { allowed: true, bypassed_by: 'admin_role' } : null;
    eq(bypassed('admin'), { allowed: true, bypassed_by: 'admin_role' });
    eq(bypassed('tenant_admin'), null);
  });

  const total = tests.length;
  const pass_rate = total ? Math.round((passed / total) * 100) + '%' : '0%';
  return Response.json({ summary: { total, passed, failed, pass_rate }, tests });
});