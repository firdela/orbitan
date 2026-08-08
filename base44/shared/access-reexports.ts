// ============================================================
// ORBITAN — Access Engine Re-exports for Backend/Deno
// Build #28.2P-R.0R.3
//
// Re-exports the canonical access modules from ./access/
// (backend-accessible). The Test Lab verification matrix calls
// the SAME production AccessEngine — no mirrored implementation.
// ============================================================

export { createAccessEngine, ACCESS_ENGINE_VERSION } from './access/AccessEngine.js';
export { permissionsForRole, ROLE_PACKS, PERMISSION_PACKS, PERMISSION_KEYS, PERMISSION_PACKS_VERSION, withPack } from './access/PermissionPacks.js';
export { resolvePrecedence, PRECEDENCE_VERSION, scopeCovers, isAncestorScope } from './access/precedence.js';
export { createDecision, DECISION_VERSION, DECISION, DENIAL_REASONS, allowDecision, denyDecision } from './access/DecisionObject.js';
export { createPolicyEngine, POLICY_ENGINE_VERSION } from './access/PolicyEngine.js';