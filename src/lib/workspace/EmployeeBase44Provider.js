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
  if (!identity?.email) return null;

  try {
    // Platform admins may not have an Employee record — that's valid;
    // the Access Engine handles platform_owner_authority separately.
    const results = await base44.entities.Employee.filter({
      email: identity.email,
    });

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
  if (!identity?.email) return [];
  try {
    const results = await base44.entities.Employee.filter({
      email: identity.email,
    });
    return results || [];
  } catch (err) {
    console.error('[EmployeeBase44Provider] resolveAllEmployees failed:', err);
    return [];
  }
}

export const EMPLOYEE_BASE44_PROVIDER_VERSION = '1.0.0';