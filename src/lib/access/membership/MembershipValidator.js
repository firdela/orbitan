// ============================================================
// ORBITANOS — Access Engine :: MembershipValidator (Milestone 3.1)
// Architecture Version 1.0 (Frozen)
//
// Validates the STRUCTURE of a normalized Membership — after the
// provider/translator has produced it. This is a pure, dependency-free
// structural check. It does NOT inspect Employee fields (the provider
// is the sole boundary for that) and does NOT consult the clock or
// permission packs.
//
// Returns { valid, errors, invalid } — never throws. A non-valid
// result is distinct from a null membership: null means "no
// membership exists" (deny NO_MEMBERSHIP); invalid means "a membership
// exists but its shape is wrong" (deny INVALID_MEMBERSHIP). Both are
// fail-closed. Pure. Exit-Ready.
// ============================================================

export const MEMBERSHIP_VALIDATOR_VERSION = '1.0.0';

const REQUIRED_FIELDS = ['user_id', 'organisation_id', 'membership_type', 'status', 'role_assignments'];
const VALID_STATUSES = ['active', 'suspended', 'revoked', 'pending'];
const VALID_MEMBERSHIP_TYPES = ['employee'];

/**
 * Validate a normalized membership object.
 * @param {*} membership
 * @returns {{ valid: boolean, errors: string[], invalid: boolean }}
 */
export function validateMembership(membership) {
  const errors = [];

  if (!membership || typeof membership !== 'object' || Array.isArray(membership)) {
    return { valid: false, errors: ['membership must be a non-null object'], invalid: true };
  }

  for (const field of REQUIRED_FIELDS) {
    if (!(field in membership) || membership[field] === undefined) {
      errors.push(`missing required field: ${field}`);
    }
  }

  if ('role_assignments' in membership) {
    if (!Array.isArray(membership.role_assignments)) {
      errors.push('role_assignments must be an array');
    } else {
      membership.role_assignments.forEach((ra, i) => {
        if (!ra || typeof ra !== 'object') {
          errors.push(`role_assignments[${i}] must be an object`);
          return;
        }
        if (!ra.role) errors.push(`role_assignments[${i}].role is required`);
        if (!ra.scope || typeof ra.scope !== 'object') {
          errors.push(`role_assignments[${i}].scope must be an object`);
        }
      });
    }
  }

  if (membership.status && !VALID_STATUSES.includes(membership.status)) {
    errors.push(`invalid status: ${membership.status}`);
  }
  if (membership.membership_type && !VALID_MEMBERSHIP_TYPES.includes(membership.membership_type)) {
    errors.push(`invalid membership_type: ${membership.membership_type}`);
  }

  return { valid: errors.length === 0, errors, invalid: errors.length > 0 };
}

export function createMembershipValidator() {
  return Object.freeze({
    name: 'MembershipValidator',
    version: MEMBERSHIP_VALIDATOR_VERSION,
    validate(value, _ctx = {}) { return validateMembership(value); },
  });
}