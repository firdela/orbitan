// ============================================================
// ORBITANOS — Access Engine :: RoleAssignmentResolver (Milestone 3.1)
// Architecture Version 1.0
//
// Sits between MembershipValidator and PermissionResolver.
// Evaluates the TEMPORAL state of each role assignment against a
// controllable clock and returns only the currently-active
// assignments for permission derivation.
//
// Temporal model (approved M3 directive):
//   An assignment is active only when:
//     status = active
//     AND effective_from <= now
//     AND (effective_until IS NULL OR effective_until > now)
//
//   Semantics:
//     future effective_from   → pending   (not yet active)
//     passed effective_until   → expired   (automatically inactive)
//     status = suspended       → suspended (inactive regardless of dates)
//     status = revoked         → revoked   (inactive permanently)
//     malformed dates          → revoked   (fail-closed)
//     absent dates (legacy)    → treated as open-ended (does not gate)
//
// Legacy Employee-derived assignments carry no temporal fields; they
// resolve to ACTIVE, preserving Milestone-2 behaviour with no
// destructive migration.
//
// Pure, dependency-free. Exit-Ready.
// ============================================================

import { resolveClock, createSystemClock } from './Clock.js';

export const ROLE_ASSIGNMENT_RESOLVER_VERSION = '1.0.0';

/**
 * Assignment status enum.
 */
export const ASSIGNMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
});

/**
 * Check whether a value is a parseable ISO 8601 date string.
 */
function isParseableDate(v) {
  return typeof v === 'string' && !Number.isNaN(Date.parse(v));
}

/**
 * Compute the effective temporal status of a single assignment at
 * the given instant. Fail-closed on malformed input.
 *
 * @param {Object} assignment role assignment (normalized or raw)
 * @param {Date}   now        evaluation instant
 * @returns {string} one of ASSIGNMENT_STATUS
 */
export function computeAssignmentStatus(assignment, now) {
  if (!assignment || typeof assignment !== 'object') {
    return ASSIGNMENT_STATUS.REVOKED;
  }

  // Explicit status takes precedence for suspended/revoked/expired.
  const explicit = assignment.status;
  if (explicit === ASSIGNMENT_STATUS.REVOKED) return ASSIGNMENT_STATUS.REVOKED;
  if (explicit === ASSIGNMENT_STATUS.SUSPENDED) return ASSIGNMENT_STATUS.SUSPENDED;
  if (explicit === ASSIGNMENT_STATUS.EXPIRED) return ASSIGNMENT_STATUS.EXPIRED;

  // Temporal gating. Malformed dates → fail-closed (revoked).
  const from = assignment.effective_from;
  const until = assignment.effective_until;

  if (from != null && !isParseableDate(from)) return ASSIGNMENT_STATUS.REVOKED;
  if (until != null && !isParseableDate(until)) return ASSIGNMENT_STATUS.REVOKED;

  const nowMs = now.getTime();
  if (from != null && Date.parse(from) > nowMs) return ASSIGNMENT_STATUS.PENDING;
  if (until != null && Date.parse(until) <= nowMs) return ASSIGNMENT_STATUS.EXPIRED;

  return ASSIGNMENT_STATUS.ACTIVE;
}

/**
 * Normalize a raw role assignment (from translateEmployee or a
 * future Membership entity) into the full temporal contract,
 * filling defaults for absent fields.
 */
function normalizeAssignment(assignment, membership, index) {
  const a = assignment || {};
  const membershipId =
    membership?.membership_id ||
    membership?.source_employee_id ||
    null;
  return {
    role_assignment_id: a.role_assignment_id || deriveAssignmentId(membership, membershipId, index),
    membership_id: a.membership_id || membershipId,
    role: a.role ?? null,
    scope: a.scope || {},
    effective_from: a.effective_from ?? null,
    effective_until: a.effective_until ?? null,
    status: a.status ?? ASSIGNMENT_STATUS.ACTIVE,
    created_by: a.created_by ?? null,
    created_at: a.created_at ?? null,
    updated_by: a.updated_by ?? null,
    updated_at: a.updated_at ?? null,
  };
}

function deriveAssignmentId(_membership, membershipId, index) {
  const base = membershipId || 'm';
  return `ra_${base}_${index}`;
}

/**
 * Resolve the active role assignments for a membership at the
 * clock's current instant.
 *
 * @param {Object}  membership normalized membership (role_assignments[])
 * @param {Object}  [clock]     Clock instance (system by default)
 * @returns {{ active_assignments: Array, all_assignments: Array }}
 *   active_assignments — only those currently effective (status active
 *     and within the temporal window). These feed PermissionResolver.
 *   all_assignments    — every assignment with a computed
 *     `effective_status` field for audit/observability.
 */
export function resolveActiveAssignments(membership, clock) {
  const resolvedClock = resolveClock(clock);
  if (!membership || !Array.isArray(membership.role_assignments)) {
    return { active_assignments: [], all_assignments: [] };
  }

  const now = resolvedClock.now();
  const all = [];
  const active = [];

  membership.role_assignments.forEach((raw, i) => {
    const normalized = normalizeAssignment(raw, membership, i);
    const effectiveStatus = computeAssignmentStatus(normalized, now);
    const withStatus = Object.freeze({ ...normalized, effective_status: effectiveStatus });
    all.push(withStatus);
    if (effectiveStatus === ASSIGNMENT_STATUS.ACTIVE) {
      active.push(withStatus);
    }
  });

  return { active_assignments: active, all_assignments: all };
}

/**
 * Create a RoleAssignmentResolver (factory for pipeline composition).
 * @param {Object} [opts]
 * @param {Object} [opts.clock] Clock instance; overridden by ctx.clock
 */
export function createRoleAssignmentResolver({ clock } = {}) {
  return Object.freeze({
    version: ROLE_ASSIGNMENT_RESOLVER_VERSION,

    /**
     * @param {Object} [value] normalized membership
     * @param {Object} [ctx]   may carry membership or clock override
     * @returns {Promise<{ active_assignments, all_assignments }>}
     */
    async resolve(value, ctx = {}) {
      const membership = value || ctx?.membership;
      const effectiveClock = ctx?.clock || clock;
      return resolveActiveAssignments(membership, effectiveClock);
    },
  });
}