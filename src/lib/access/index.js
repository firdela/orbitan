// ============================================================
// ORBITANOS — Access Engine :: Public Barrel (ADR-0050)
// Architecture Version 1.0 (Frozen)
//
// Single import surface for the Access Engine foundation.
//   import { createAccessEngine, createDecision, DENIAL_REASONS }
//     from '@/lib/access';
// ============================================================

export { ACCESS_ENGINE_VERSION } from './AccessEngine.js';
export { createAccessEngine } from './AccessEngine.js';

export {
  DECISION_VERSION,
  DECISION,
  DENIAL_REASONS,
  createDecision,
  allowDecision,
  denyDecision,
} from './DecisionObject.js';

export { POLICY_ENGINE_VERSION, createPolicyEngine } from './PolicyEngine.js';
export { resolvePrecedence, scopeCovers, isAncestorScope, PRECEDENCE_VERSION } from './precedence.js';