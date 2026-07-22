// ============================================================
// ORBITANOS — Access Engine :: PermissionResolver (Milestone 2)
// Architecture Version 1.0 (Frozen)
//
// Derives the flat permission list the Access Engine's precedence
// resolver consumes, from a normalized Membership's role assignments
// and the Permission Packs registry (ADR-0051).
//
// Each produced permission carries:
//   { key, effect: 'allow', source: 'role_default',
//     scope: { tenant_id, outlet_id, company_id, department } }
//
// `source` is 'role_default' because MVP grants come from the role's
// packs. Explicit/inherited grants (per-resource) arrive in a future
// milestone and will set source 'explicit'/'inherited'.
//
// Pure, dependency-free. Exit-Ready.
// ============================================================

import { permissionsForRole, PERMISSION_PACKS_VERSION } from '../PermissionPacks.js';

export const PERMISSION_RESOLVER_VERSION = '1.0.0';

/**
 * Derive permissions from a membership's role assignments.
 * @param {Object} membership normalized membership (role_assignments[])
 * @returns {Array} flat permission list with scope + source
 */
export function derivePermissions(membership) {
  if (!membership || !Array.isArray(membership.role_assignments)) return [];

  const seen = new Set();
  const out = [];
  for (const assignment of membership.role_assignments) {
    const role = assignment.role;
    const scope = assignment.scope || {};
    const keys = permissionsForRole(role);
    for (const key of keys) {
      const dedupeKey = `${key}|${scope.tenant_id ?? ''}|${scope.outlet_id ?? ''}|${scope.company_id ?? ''}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      out.push({
        key,
        effect: 'allow',
        source: 'role_default',
        scope: {
          tenant_id: scope.tenant_id ?? null,
          outlet_id: scope.outlet_id ?? null,
          company_id: scope.company_id ?? null,
          department: scope.department ?? null,
        },
      });
    }
  }
  return out;
}

/**
 * Create a PermissionResolver.
 * @param {Object} opts (none required for MVP; kept for future config)
 */
export function createPermissionResolver(_opts = {}) {
  return Object.freeze({
    name: 'PermissionResolver',
    version: PERMISSION_RESOLVER_VERSION,
    packsVersion: PERMISSION_PACKS_VERSION,

    /**
     * Resolve permissions. If the request already supplies a flat
     * permission array, pass through (caller-provided). Otherwise
     * derive from the membership in ctx.
     */
    async resolve(value, ctx = {}) {
      if (Array.isArray(value)) return value;
      const membership = ctx?.membership ?? null;
      return derivePermissions(membership);
    },
  });
}