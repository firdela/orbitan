// ============================================================
// ORBITAN — Access Engine Re-exports for Backend/Deno
// Build #28.2P-R.0R.3
//
// The canonical AccessEngine, PermissionPacks, DecisionObject,
// PolicyEngine, and precedence modules live in src/lib/access/
// (pure JavaScript ESM, the canonical source for both frontend
// and backend).
//
// This .ts file re-exports from the canonical source so that
// Base44 Deno backend functions can import them without duplicating
// the authorization logic. The Test Lab verification matrix calls
// the SAME production AccessEngine — no mirrored implementation.
//
// Do NOT add logic here — all canonical logic lives in src/lib/access/.
// ============================================================

export {
  createAccessEngine,
  ACCESS_ENGINE_VERSION,
} from '../../src/lib/access/AccessEngine.js';

export {
  permissionsForRole,
  ROLE_PACKS,
  PERMISSION_PACKS,
  PERMISSION_KEYS,
  PERMISSION_PACKS_VERSION,
} from '../../src/lib/access/PermissionPacks.js';

export {
  resolvePrecedence,
  PRECEDENCE_VERSION,
  scopeCovers,
  isAncestorScope,
} from '../../src/lib/access/precedence.js';

export {
  createDecision,
  DECISION_VERSION,
  DECISION,
  DENIAL_REASONS,
  allowDecision,
  denyDecision,
} from '../../src/lib/access/DecisionObject.js';

export {
  createPolicyEngine,
  POLICY_ENGINE_VERSION,
} from '../../src/lib/access/PolicyEngine.js';