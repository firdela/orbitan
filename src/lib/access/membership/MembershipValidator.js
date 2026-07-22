// ============================================================
// ORBITANOS — Access Engine :: MembershipValidator (Milestone 3.1)
// Architecture Version 1.0
//
// Validates the STRUCTURAL INTEGRITY of a normalized Membership
// produced by MembershipResolver — before RoleAssignmentResolver
// and PermissionResolver touch it. This keeps MembershipResolver
// focused solely on translation.
//
// Contract:
//   validateMembership(null)            → { valid: true, membership: null }
//                                          (null = "no membership"; the
//                                           AccessEngine handles that as
//                                           NO_MEMBERSHIP, not invalid)
//   validateMembership(validMembership)  → { valid: true, membership }
//   validateMembership(malformed)        → { valid: false, invalidMembership }
//
// What it checks (fail-closed on each):
//   - organisation_id present and a non-empty string
//   - status present and a known normalized value
//   - role_assignments is an array
//   - each assignment has a non-empty `role`
//   - each assignment scope (if present) is an object
//   - scope.tenant_id (if present) matches organisation_id
//   - membership_type (if present) is a known source
//   - user_id (if present) is a string
//
// What it does NOT check:
//   - role name validity against ROLE_PACKS — PermissionResolver
//     already returns [] for unknown roles (fail-safe).
//   - active-ness — a suspended/revoked membership is structurally
//     valid; the AccessEngine denies it as MEMBERSHIP_INACTIVE.
//
// Pure, dependency-free. Exit-Ready.
// ============================================================

import { createInvalidMembership } from './InvalidMembership.js';

export const MEMBERSHIP_VALIDATOR_VERSION = '1.0.0';

const VALID_STATUSES = Object.freeze(new Set(['active', 'suspended', 'revoked', 'pending']));
const VALID_MEMBERSHIP_SOURCES = Object.freeze(new Set([
  'employee', 'contractor', 'vendor', 'partner', 'system', 'migration', 'external',
]));

/**
 * Validate a normalized membership object.
 * @param {Object|null} membership
 * @returns {{ valid: boolean, membership?: Object, invalidMembership?: Object }}
 */
export function validateMembership(membership) {
  // null/undefined = "no membership found" — distinct from invalid.
  if (membership == null) {
    return { valid: true, membership: null };
  }

  if (typeof membership !== 'object' || Array.isArray(membership)) {
    return {
      valid: false,
      invalidMembership: createInvalidMembership({
        reason: 'Membership is not an object.',
        validation_errors: [{ field: 'root', code: 'not_an_object' }],
        source_employee_id: null,
      }),
    };
  }

  const errors = [];

  // organisation_id — required, non-empty string.
  if (membership.organisation_id == null || membership.organisation_id === '' || typeof membership.organisation_id !== 'string') {
    errors.push({ field: 'organisation_id', code: 'missing_or_invalid' });
  }

  // status — required, known normalized value.
  if (membership.status == null || !VALID_STATUSES.has(membership.status)) {
    errors.push({ field: 'status', code: 'invalid_status' });
  }

  // membership_type (source) — optional but if present must be known.
  if (membership.membership_type != null && !VALID_MEMBERSHIP_SOURCES.has(membership.membership_type)) {
    errors.push({ field: 'membership_type', code: 'unknown_source' });
  }

  // user_id — optional but if present must be a string.
  if (membership.user_id != null && typeof membership.user_id !== 'string') {
    errors.push({ field: 'user_id', code: 'invalid_type' });
  }

  // role_assignments — required, must be an array.
  if (!Array.isArray(membership.role_assignments)) {
    errors.push({ field: 'role_assignments', code: 'not_an_array' });
  } else {
    membership.role_assignments.forEach((a, i) => {
      if (!a || typeof a !== 'object' || Array.isArray(a)) {
        errors.push({ field: `role_assignments[${i}]`, code: 'not_an_object' });
        return;
      }
      if (a.role == null || a.role === '' || typeof a.role !== 'string') {
        errors.push({ field: `role_assignments[${i}].role`, code: 'missing_role' });
      }
      if (a.scope != null && (typeof a.scope !== 'object' || Array.isArray(a.scope))) {
        errors.push({ field: `role_assignments[${i}].scope`, code: 'not_an_object' });
      }
      // Scope integrity: a role assignment scoped to a different tenant
      // than the membership's organisation is a structural violation.
      if (
        a.scope &&
        typeof a.scope === 'object' &&
        membership.organisation_id &&
        a.scope.tenant_id != null &&
        a.scope.tenant_id !== membership.organisation_id
      ) {
        errors.push({ field: `role_assignments[${i}].scope.tenant_id`, code: 'tenant_mismatch' });
      }
    });
  }

  if (errors.length > 0) {
    return {
      valid: false,
      invalidMembership: createInvalidMembership({
        reason: 'Membership failed structural validation.',
        validation_errors: errors,
        source_employee_id: membership.source_employee_id ?? null,
      }),
    };
  }

  return { valid: true, membership };
}

/**
 * Create a MembershipValidator (factory for pipeline composition).
 * @param {Object} [_opts]
 */
export function createMembershipValidator(_opts = {}) {
  return Object.freeze({
    version: MEMBERSHIP_VALIDATOR_VERSION,
    /**
     * @param {Object} value normalized membership
     * @param {Object} [_ctx] (unused; reserved for future context)
     */
    validate(value, _ctx = {}) {
      return validateMembership(value);
    },
  });
}