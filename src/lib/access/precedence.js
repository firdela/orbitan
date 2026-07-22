// ============================================================
// ORBITANOS — Access Engine :: Precedence Resolver (ADR-0051 §4)
// Architecture Version 1.0 (Frozen)
//
// Pure function implementing the approved permission precedence:
//
//   1. Explicit Deny     (highest)
//   2. Explicit Allow
//   3. Inherited Allow   (ancestor scope grants to descendant resource)
//   4. Role Default Allow
//   5. (subscription / feature flag handled by AccessEngine, not here)
//   6. Default Deny
//
// Permissions never cross tenant boundaries. A permission whose scope
// belongs to Tenant A cannot grant access to a resource in Tenant B.
//
// Permission shape:
//   { key: 'inventory.read', effect: 'allow'|'deny',
//     source: 'explicit'|'inherited'|'role_default',
//     scope: { tenant_id, outlet_id?, brand_id?, ... } }
//
// Resource shape:
//   { type: 'InventoryItem', id, tenant_id, outlet_id?, brand_id?,
//     owner_id? }
//
// `action` is the requested capability key, e.g. 'inventory.read'.
//
// Pure, dependency-free. Exit-Ready.
// ============================================================

export const PRECEDENCE_VERSION = '1.0.0';

/**
 * Resolve whether a set of permissions grants/denies `action` on `resource`.
 * Returns { allowed, denied, reason, matched }.
 */
export function resolvePrecedence({ permissions = [], resource = null, action = null } = {}) {
  if (!action || !resource) {
    return { allowed: false, denied: false, reason: 'missing_action_or_resource', matched: [] };
  }

  const matching = permissions.filter((p) => p && p.key === action);
  if (matching.length === 0) {
    return { allowed: false, denied: false, reason: 'no_matching_permission', matched: [] };
  }

  const inScope = matching.filter((p) => scopeCovers(p.scope, resource));
  if (inScope.length === 0) {
    return {
      allowed: false,
      denied: false,
      reason: 'permission_out_of_scope',
      matched: [],
    };
  }

  // 1. Explicit deny wins everything (within scope).
  const explicitDeny = inScope.find((p) => p.effect === 'deny' && p.source === 'explicit');
  if (explicitDeny) {
    return { allowed: false, denied: true, reason: 'explicit_deny', matched: [explicitDeny] };
  }

  // 2. Explicit allow (in scope).
  const explicitAllow = inScope.find((p) => p.effect === 'allow' && p.source === 'explicit');
  if (explicitAllow) {
    return { allowed: true, denied: false, reason: 'explicit_allow', matched: [explicitAllow] };
  }

  // 3. Inherited allow (ancestor scope, e.g. tenant-wide grant for an outlet resource).
  const inheritedAllow = inScope.find(
    (p) => p.effect === 'allow' && p.source === 'inherited',
  );
  if (inheritedAllow) {
    return { allowed: true, denied: false, reason: 'inherited_allow', matched: [inheritedAllow] };
  }

  // 4. Role default allow.
  const roleDefault = inScope.find(
    (p) => p.effect === 'allow' && p.source === 'role_default',
  );
  if (roleDefault) {
    return { allowed: true, denied: false, reason: 'role_default_allow', matched: [roleDefault] };
  }

  // Any other deny effect in scope (e.g. inherited/role_default deny) blocks.
  const anyDeny = inScope.find((p) => p.effect === 'deny');
  if (anyDeny) {
    return { allowed: false, denied: true, reason: 'deny_in_scope', matched: [anyDeny] };
  }

  // 5. Default deny.
  return { allowed: false, denied: false, reason: 'default_deny', matched: [] };
}

/**
 * Does `scope` cover `resource`? Scope covers resource when every
 * non-null scope dimension equals the matching resource dimension.
 * A null scope dimension means "all" (tenant-wide / outlet-agnostic).
 *
 * tenant_id is mandatory: a permission without a tenant_id scope cannot
 * cover any tenant-scoped resource (cross-tenant protection).
 */
export function scopeCovers(scope, resource) {
  if (!scope || !resource) return false;
  // Tenant boundary — never cross.
  const scopeTenant = scope.tenant_id ?? null;
  const resourceTenant = resource.tenant_id ?? null;
  if (scopeTenant === null) return false; // platform-level perms handled elsewhere
  if (scopeTenant !== resourceTenant) return false;

  // Optional dimensions: null scope dim = covers all.
  if (scope.outlet_id != null && scope.outlet_id !== (resource.outlet_id ?? null)) return false;
  if (scope.brand_id != null && scope.brand_id !== (resource.brand_id ?? null)) return false;
  return true;
}

/**
 * Does `ancestorScope` represent an ancestor of `resource` scope?
 * Used to classify inherited allows (e.g. tenant-wide grant covering
 * an outlet-scoped resource). Returns true when ancestor is strictly
 * broader: same tenant, fewer specified dimensions.
 */
export function isAncestorScope(ancestorScope, resource) {
  if (!scopeCovers(ancestorScope, resource)) return false;
  // Broader = ancestor omits at least one dimension the resource has.
  if (ancestorScope.outlet_id == null && resource.outlet_id != null) return true;
  if (ancestorScope.brand_id == null && resource.brand_id != null) return true;
  return false;
}