// ============================================================
// ORBITANOS — EmployeeBase44Provider (ADR-0050 §Boundary)
// Architecture Version 1.0
//
// THE SOLE boundary component between the Access Engine and the
// Base44 SDK Employee entity. No other module in the access/
// workspace layer may import base44.entities.Employee directly.
//
// When the Employee model is retired in favour of a native
// Membership entity, only this file changes — the Access Engine
// and WorkspaceProvider remain untouched.
//
// Contract: async (identity, ctx) => Employee record | null
// ============================================================

import { base44 } from '@/api/base44Client';

/**
 * Resolve an Employee record for a given identity.
 * Uses email as the primary lookup key (the User→Employee link
 * is established during invitation redemption / onboarding).
 *
 * @param {Object} identity — { id, email, platform_role }
 * @param {Object} ctx — optional { workspace } for tenant-scoped lookups
 * @returns {Promise<Object|null>} Employee record or null
 */
export async function resolveEmployee(identity, ctx = {}) {
  if (!identity?.id && !identity?.email) return null;

  try {
    let results = [];

    // ── Canonical link: user_id (RA-0005 Orbit Identity Model) ──
    // After identity linkage, Employee records carry the User id.
    if (identity.id) {
      results = await base44.entities.Employee.filter({ user_id: identity.id });
    }

    // ── Discovery fallback: email (pre-linkage / unlinked records) ──
    // Platform admins may have no Employee record — that's valid; the
    // Access Engine handles platform_owner_authority separately.
    if ((!results || results.length === 0) && identity.email) {
      results = await base44.entities.Employee.filter({ email: identity.email });
    }

    if (!results || results.length === 0) return null;

    // If a workspace context is provided, prefer the matching tenant.
    if (ctx?.workspace?.tenant_id) {
      const scoped = results.find(
        (e) => e.tenant_id === ctx.workspace.tenant_id
      );
      if (scoped) return scoped;
    }

    // Default: first active membership.
    const active = results.find((e) => e.status === 'active');
    return active || results[0];
  } catch (err) {
    console.error('[EmployeeBase44Provider] resolveEmployee failed:', err);
    return null;
  }
}

/**
 * Resolve ALL Employee records for a given identity — powers the
 * multi-tenant membership list (TenantSwitcher).
 *
 * @param {Object} identity — { id, email }
 * @returns {Promise<Array>} Employee records (empty array on failure)
 */
export async function resolveAllEmployees(identity) {
  if (!identity?.id && !identity?.email) return [];
  try {
    // Canonical user_id lookup + email fallback, merged & deduped.
    // Catches both linked (user_id stamped) and not-yet-linked records.
    const byId = identity.id
      ? await base44.entities.Employee.filter({ user_id: identity.id })
      : [];
    const byEmail = identity.email
      ? await base44.entities.Employee.filter({ email: identity.email })
      : [];

    const merged = [...(byId || []), ...(byEmail || [])];
    const seen = new Set();
    return merged.filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
  } catch (err) {
    console.error('[EmployeeBase44Provider] resolveAllEmployees failed:', err);
    return [];
  }
}

export const EMPLOYEE_BASE44_PROVIDER_VERSION = '1.0.0';