// ============================================================
// ORBITANOS — Access Engine :: InvalidMembership (Milestone 3.1)
// Architecture Version 1.0
//
// Structurally distinct from "no membership found" (null). Used by
// MembershipValidator when a membership object exists but its data
// is malformed and cannot be safely authorized.
//
// Contract:
//   type:               'invalid_membership'   (discriminator)
//   code:               'AUTH-MEMBERSHIP-INVALID'
//   reason:             human-readable summary
//   validation_errors:  [{ field, code }] structural detail
//   source_employee_id: provenance for audit/admin triage
//
// Full diagnostic detail is intended for audit logs and
// administrative tooling — never surfaced directly to end users.
//
// Pure, dependency-free. Exit-Ready.
// ============================================================

export const INVALID_MEMBERSHIP_TYPE = 'invalid_membership';
export const INVALID_MEMBERSHIP_CODE = 'AUTH-MEMBERSHIP-INVALID';

/**
 * Construct an InvalidMembership result.
 * @param {Object} args
 * @param {string} [args.reason]
 * @param {Array}  [args.validation_errors] array of { field, code }
 * @param {string} [args.source_employee_id]
 */
export function createInvalidMembership({
  reason,
  validation_errors,
  source_employee_id,
} = {}) {
  return Object.freeze({
    type: INVALID_MEMBERSHIP_TYPE,
    code: INVALID_MEMBERSHIP_CODE,
    reason: reason || 'Membership data is malformed and cannot be authorized.',
    validation_errors: Array.isArray(validation_errors) ? validation_errors : [],
    source_employee_id: source_employee_id ?? null,
  });
}

/**
 * Structural predicate — distinguishes InvalidMembership from null
 * (no membership) and from a valid membership object.
 */
export function isInvalidMembership(value) {
  return (
    value != null &&
    typeof value === 'object' &&
    value.type === INVALID_MEMBERSHIP_TYPE &&
    value.code === INVALID_MEMBERSHIP_CODE
  );
}