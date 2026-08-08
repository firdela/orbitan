// ============================================================
// ORBITANOS — Access Engine :: PolicyEngine (ADR-0050 §1)
// Architecture Version 1.0 (Frozen)
// Canonical backend-accessible version. Frontend re-exports.
// Pure, dependency-free. Exit-Ready.
// ============================================================

export const POLICY_ENGINE_VERSION = '1.0.0';

export function createPolicyEngine() {
  const registry = [];

  function registerPolicy({ key, priority = 100, evaluate }) {
    if (!key || typeof key !== 'string') throw new Error('PolicyEngine.registerPolicy: `key` is required (string)');
    if (typeof evaluate !== 'function') throw new Error(`PolicyEngine.registerPolicy: policy "${key}" requires an evaluate function`);
    if (registry.some((p) => p.key === key)) throw new Error(`PolicyEngine.registerPolicy: duplicate policy key "${key}"`);
    registry.push({ key, priority, evaluate });
    registry.sort((a, b) => a.priority - b.priority);
  }

  function unregisterPolicy(key) {
    const i = registry.findIndex((p) => p.key === key);
    if (i >= 0) registry.splice(i, 1);
  }

  function listPolicies() {
    return registry.map((p) => ({ key: p.key, priority: p.priority }));
  }

  function evaluate(context) {
    const evaluated = [];
    for (const policy of registry) {
      let opinion = null;
      try {
        opinion = policy.evaluate(context);
      } catch (err) {
        opinion = { allowed: false, reason: 'policy_evaluation_error', error: err?.message || String(err) };
      }
      if (opinion && typeof opinion.allowed === 'boolean') {
        const entry = { key: policy.key, allowed: opinion.allowed, reason: opinion.reason || null };
        evaluated.push(entry);
        if (opinion.allowed === false) return { decisive: true, result: { ...opinion, policyKey: policy.key }, evaluated };
        return { decisive: true, result: { ...opinion, policyKey: policy.key }, evaluated };
      }
      evaluated.push({ key: policy.key, opinion: 'pass' });
    }
    return { decisive: false, result: null, evaluated };
  }

  return Object.freeze({ version: POLICY_ENGINE_VERSION, registerPolicy, unregisterPolicy, listPolicies, evaluate });
}