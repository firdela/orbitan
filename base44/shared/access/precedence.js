// ============================================================
// ORBITANOS — Access Engine :: Precedence Resolver (ADR-0051 §4)
// Architecture Version 1.0 (Frozen)
// Canonical backend-accessible version. Frontend re-exports.
// Pure, dependency-free. Exit-Ready.
// ============================================================

export const PRECEDENCE_VERSION = '1.0.0';

export function resolvePrecedence({ permissions = [], resource = null, action = null } = {}) {
  if (!action || !resource) return { allowed: false, denied: false, reason: 'missing_action_or_resource', matched: [] };
  const matching = permissions.filter((p) => p && p.key === action);
  if (matching.length === 0) return { allowed: false, denied: false, reason: 'no_matching_permission', matched: [] };
  const inScope = matching.filter((p) => scopeCovers(p.scope, resource));
  if (inScope.length === 0) return { allowed: false, denied: false, reason: 'permission_out_of_scope', matched: [] };

  const explicitDeny = inScope.find((p) => p.effect === 'deny' && p.source === 'explicit');
  if (explicitDeny) return { allowed: false, denied: true, reason: 'explicit_deny', matched: [explicitDeny] };

  const explicitAllow = inScope.find((p) => p.effect === 'allow' && p.source === 'explicit');
  if (explicitAllow) return { allowed: true, denied: false, reason: 'explicit_allow', matched: [explicitAllow] };

  const inheritedAllow = inScope.find((p) => p.effect === 'allow' && p.source === 'inherited');
  if (inheritedAllow) return { allowed: true, denied: false, reason: 'inherited_allow', matched: [inheritedAllow] };

  const roleDefault = inScope.find((p) => p.effect === 'allow' && p.source === 'role_default');
  if (roleDefault) return { allowed: true, denied: false, reason: 'role_default_allow', matched: [roleDefault] };

  const anyDeny = inScope.find((p) => p.effect === 'deny');
  if (anyDeny) return { allowed: false, denied: true, reason: 'deny_in_scope', matched: [anyDeny] };

  return { allowed: false, denied: false, reason: 'default_deny', matched: [] };
}

export function scopeCovers(scope, resource) {
  if (!scope || !resource) return false;
  const scopeTenant = scope.tenant_id ?? null;
  const resourceTenant = resource.tenant_id ?? null;
  if (scopeTenant === null) return false;
  if (scopeTenant !== resourceTenant) return false;
  if (scope.outlet_id != null && scope.outlet_id !== (resource.outlet_id ?? null)) return false;
  if (scope.brand_id != null && scope.brand_id !== (resource.brand_id ?? null)) return false;
  return true;
}

export function isAncestorScope(ancestorScope, resource) {
  if (!scopeCovers(ancestorScope, resource)) return false;
  if (ancestorScope.outlet_id == null && resource.outlet_id != null) return true;
  if (ancestorScope.brand_id == null && resource.brand_id != null) return true;
  return false;
}