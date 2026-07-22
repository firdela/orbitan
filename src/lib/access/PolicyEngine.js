// ============================================================
// ORBITANOS — Access Engine :: PolicyEngine (ADR-0050 §1)
// Architecture Version 1.0 (Frozen)
//
// Registry-driven business-policy evaluation. Sits between
// permission resolution and the final decision.
//
// A Policy expresses a BUSINESS RULE, not a permission.
//   Permission = "may this identity do X?"  (Access Engine)
//   Policy    = "under what conditions is X permitted?" (PolicyEngine)
//
// Examples (registered by later milestones / industry packs):
//   - "POs over $5,000 require two approvers"
//   - "HR may view salaries only during office hours"
//   - "Finance reports locked after month-end close"
//   - "A manager cannot approve their own claim"
//
// Contract for a registered policy:
//   { key: string, priority: number (lower=earlier), evaluate(ctx) -> PolicyOpinion }
//
// PolicyOpinion:
//   null                              → no opinion (pass-through)
//   { allowed: true, reason }         → explicit policy allow
//   { allowed: false, reason }        → hard block (fail-closed, stops chain)
//
// A policy that throws is treated as a DENY (fail-closed).
// Pure, dependency-free. Exit-Ready.
// ============================================================

export const POLICY_ENGINE_VERSION = '1.0.0';

export function createPolicyEngine() {
  const registry = [];

  function registerPolicy({ key, priority = 100, evaluate }) {
    if (!key || typeof key !== 'string') {
      throw new Error('PolicyEngine.registerPolicy: `key` is required (string)');
    }
    if (typeof evaluate !== 'function') {
      throw new Error(`PolicyEngine.registerPolicy: policy "${key}" requires an evaluate function`);
    }
    if (registry.some((p) => p.key === key)) {
      throw new Error(`PolicyEngine.registerPolicy: duplicate policy key "${key}"`);
    }
    registry.push({ key, priority, evaluate });
    registry.sort((a, b) => a.priority - b.priority); // stable priority order
  }

  function unregisterPolicy(key) {
    const i = registry.findIndex((p) => p.key === key);
    if (i >= 0) registry.splice(i, 1);
  }

  function listPolicies() {
    return registry.map((p) => ({ key: p.key, priority: p.priority }));
  }

  /**
   * Evaluate all registered policies in priority order.
   * Returns { decisive, result, evaluated }.
   *   decisive = true  → a policy returned allowed:false (hard block)
   *                        OR allowed:true (explicit allow).
   *   decisive = false → no policy had an opinion; pass through.
   */
  function evaluate(context) {
    const evaluated = [];
    for (const policy of registry) {
      let opinion = null;
      try {
        opinion = policy.evaluate(context);
      } catch (err) {
        // Fail-closed: a throwing policy blocks the action.
        opinion = {
          allowed: false,
          reason: 'policy_evaluation_error',
          error: err?.message || String(err),
        };
      }

      if (opinion && typeof opinion.allowed === 'boolean') {
        const entry = { key: policy.key, allowed: opinion.allowed, reason: opinion.reason || null };
        evaluated.push(entry);
        if (opinion.allowed === false) {
          // Hard block — stop immediately.
          return { decisive: true, result: { ...opinion, policyKey: policy.key }, evaluated };
        }
        // Explicit allow — also decisive (policy grants override precedence).
        return { decisive: true, result: { ...opinion, policyKey: policy.key }, evaluated };
      }
      evaluated.push({ key: policy.key, opinion: 'pass' });
    }
    return { decisive: false, result: null, evaluated };
  }

  return Object.freeze({
    version: POLICY_ENGINE_VERSION,
    registerPolicy,
    unregisterPolicy,
    listPolicies,
    evaluate,
  });
}