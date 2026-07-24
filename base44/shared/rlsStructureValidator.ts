// ============================================================
// ORBITANOS — RLS Structure Validator (AFR rule #4)
// Shared canonical module — RA-0004 Platform service.
//
// Validates an RLS rule object against the documented Base44 RLS
// authoring constraints that are NOT enforceable at config-save time
// but are enforceable by code review:
//
//   1. `user_condition` must be the ONLY key in its object.
//      (Base44 RLS guide: "Keep user_condition as the only key in
//       its object, and combine it with record conditions through
//       $or / $and".)
//   2. `user_condition` values must be PLAIN (exact equality). No
//      operators ($in, $ne, ...) inside user_condition.
//      (AFR rule #4: "no $in operator in user_condition".)
//
// Why these two: they are the hard, defensible rules. The guide also
// says `$or`/`$and` must be the only key in their object, but the
// `{ "data.tenant_id": X, "$or": [...] }` implicit-AND pattern is
// pervasive across the codebase and works (Mongo semantics). Mass-
// remediating it is a separate hardening pass — deliberately NOT
// enforced here to avoid noisy false positives on working rules.
//
// Pure, dependency-free. Importable by backend functions + harnesses.
// ============================================================

/**
 * Validate a single RLS rule object (one of read/create/update/delete).
 * Returns an array of violations: { path, code, message }.
 */
export function validateRls(rule, path = '') {
  const violations = [];
  if (!rule || typeof rule !== 'object' || Array.isArray(rule)) return violations;

  const keys = Object.keys(rule);

  // user_condition must be the only key, and its values must be plain.
  if (keys.includes('user_condition')) {
    if (keys.length > 1) {
      violations.push({
        path: path || 'root',
        code: 'user_condition_not_alone',
        message: 'user_condition must be the only key in its object; combine record conditions via $and/$or.',
      });
    }
    const uc = rule.user_condition;
    if (uc && typeof uc === 'object' && !Array.isArray(uc)) {
      for (const [field, val] of Object.entries(uc)) {
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          const ops = Object.keys(val).filter((op) => op.startsWith('$'));
          if (ops.length) {
            violations.push({
              path: `${path}.user_condition.${field}`,
              code: 'operator_in_user_condition',
              message: `user_condition.${field} uses operator(s) ${ops.join(', ')}; only plain equality is supported (AFR #4).`,
            });
          }
        }
      }
    }
    return violations; // user_condition object holds no further nested rules.
  }

  // Recurse into logical groups (do not flag them for not being alone).
  for (const lg of ['$or', '$and', '$nor']) {
    if (keys.includes(lg) && Array.isArray(rule[lg])) {
      rule[lg].forEach((branch, i) => {
        violations.push(...validateRls(branch, `${path}.${lg}[${i}]`));
      });
    }
  }
  return violations;
}

/** True when an RLS rule object has zero structural violations. */
export function rlsIsValid(rule) {
  return validateRls(rule).length === 0;
}