// ============================================================
// ORBITANOS — Access Engine :: MembershipResolver (Milestone 2)
// Architecture Version 1.0 (Frozen)
//
// THE SOLE compatibility layer between the current Employee model
// and the future Membership architecture (Compatibility Matrix).
// No other module may translate Employee fields into authorization
// concepts. When Employee is retired, only this file changes.
//
// Contract: given an Employee record (or a pre-normalized membership),
// produce the normalized Membership shape the Access Engine consumes:
//
//   {
//     user_id, organisation_id, membership_type, status,
//     display_name,
//     role_assignments: [{ role, scope: { tenant_id, outlet_id,
//                                         company_id, department } }]
//   }
//
// `resolveEmployee` is an OPTIONAL injected async data provider:
//   async (identity, ctx) => Employee record | null
// This keeps the resolver pure/testable while allowing real DB fetches
// at the wiring point (M3: RoleGateway). The resolver itself has no
// base44 import.
//
// Pure, dependency-free. Exit-Ready.
// ============================================================

export const MEMBERSHIP_RESOLVER_VERSION = '1.0.0';

/**
 * Status normalisation (Compatibility Matrix §Status).
 *   active / on_leave     → active   (still employed)
 *   inactive              → suspended (denied immediately)
 *   terminated            → revoked   (denied immediately)
 */
export function normalizeMembershipStatus(employeeStatus) {
  switch (employeeStatus) {
    case 'active':
    case 'on_leave':
      return 'active';
    case 'inactive':
      return 'suspended';
    case 'terminated':
      return 'revoked';
    default:
      // Unknown status → fail-closed: treat as suspended.
      return employeeStatus ? 'suspended' : 'active';
  }
}

/**
 * Translate a single Employee record into the normalized Membership
 * shape. This is the canonical mapping — the Compatibility Matrix
 * implemented in code.
 */
export function translateEmployee(employee) {
  if (!employee) return null;

  const role = employee.role || null;
  const scope = {
    tenant_id: employee.tenant_id ?? null,
    outlet_id: employee.outlet_id ?? null,
    company_id: employee.company_id ?? null,
    department: employee.department ?? null,
  };

  return Object.freeze({
    // Identity link
    user_id: employee.user_id ?? null,
    // Organisation link (renamed from tenant_id for clarity)
    organisation_id: employee.tenant_id ?? null,
    // Relationship type — MVP only supports employee.
    membership_type: 'employee',
    // Normalised access status
    status: normalizeMembershipStatus(employee.status),
    display_name: employee.full_name || null,
    // MVP: a single role assignment derived from Employee.role.
    // Future memberships may carry multiple role assignments.
    role_assignments: role
      ? [{ role, scope }]
      : [],
    // Provenance — the source record id for audit traceability.
    source_employee_id: employee.id ?? null,
  });
}

/**
 * Create a MembershipResolver.
 * @param {Object} opts
 * @param {Function} [opts.resolveEmployee] async (identity, ctx) => Employee|null
 */
export function createMembershipResolver({ resolveEmployee } = {}) {
  return Object.freeze({
    // Resolver metadata — recorded in audit logs (ADR future).
    name: 'MembershipResolver',
    version: MEMBERSHIP_RESOLVER_VERSION,

    /**
     * Resolve a membership from the request value or by fetching.
     * Resolution order:
     *   1. value is already a normalized membership (has role_assignments
     *      and organisation_id) → validate & pass through.
     *   2. value is an Employee record (has tenant_id + role, no
     *      role_assignments) → translate.
     *   3. no value + injected resolveEmployee + identity → fetch.
     *   4. otherwise → null (Access Engine will deny: no_membership).
     */
    async resolve(value, ctx = {}) {
      // 1. Already-normalized membership.
      if (value && Array.isArray(value.role_assignments) && 'organisation_id' in value) {
        return value;
      }
      // 2. Employee record to translate.
      if (value && !Array.isArray(value.role_assignments) && 'tenant_id' in value && 'role' in value) {
        return translateEmployee(value);
      }
      // 3. Fetch via injected provider.
      if (!value && typeof resolveEmployee === 'function' && ctx.identity) {
        const employee = await resolveEmployee(ctx.identity, ctx);
        if (!employee) return null;
        return translateEmployee(employee);
      }
      return value ?? null;
    },
  });
}