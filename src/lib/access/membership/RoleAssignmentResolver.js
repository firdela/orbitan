// ============================================================
// ORBITANOS — Access Engine :: RoleAssignmentResolver (M3.1)
// Architecture Version 1.0 (Frozen)
//
// Temporal resolver: given a normalized Membership and an injectable
// Clock, compute which role_assignments are operationally ACTIVE at
// the current instant vs PENDING / SUSPENDED / EXPIRED / REVOKED.
//
// MVP note: assignments produced by translateEmployee (legacy single
// role) carry no effective_from / effective_until, so they are treated
// as ACTIVE whenever the membership itself is active. The temporal
// machinery is in place now so future multi-assignment memberships
// and time-boxed delegations are handled without resolver changes.
//
// TEMPORARY RUNTIME IDS: `assignment_id` values generated here
// (e.g. `ra_<source>_<index>`) are ephemeral correlation keys for the
// current evaluation only. They MUST NOT be persisted or used as
// foreign keys. Immutable assignment UUIDs arrive in a future ADR.
//
// Pure (Clock injected). Exit-Ready.
// ============================================================

import { CLOCK_VERSION } from '../clock.js';

export const ROLE_ASSIGNMENT_RESOLVER_VERSION = '1.0.0';

export const ASSIGNMENT_STATUS = Object.freeze({
  ACTIVE: 'active',
  PENDING: 'pending',
  SUSPENDED: 'suspended',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
});

/** Ephemeral correlation id — never persist. See file header. */
function deriveAssignmentId(membership, index) {
  const empId = membership?.source_employee_id ?? membership?.organisation_id ?? 'unknown';
  return `ra_${empId}_${index}`;
}

function toMs(value) {
  if (!value) return null;
  const t = typeof value === 'string' ? new Date(value).getTime() : (value instanceof Date ? value.getTime() : null);
  return Number.isFinite(t) ? t : null;
}

function computeAssignmentStatus(assignment, nowMs) {
  const status = assignment.status || ASSIGNMENT_STATUS.ACTIVE;
  if (status === 'revoked') return ASSIGNMENT_STATUS.REVOKED;
  if (status === 'suspended') return ASSIGNMENT_STATUS.SUSPENDED;
  const effectiveUntil = toMs(assignment.effective_until);
  if (effectiveUntil !== null && nowMs > effectiveUntil) return ASSIGNMENT_STATUS.EXPIRED;
  const effectiveFrom = toMs(assignment.effective_from);
  if (effectiveFrom !== null && nowMs < effectiveFrom) return ASSIGNMENT_STATUS.PENDING;
  return ASSIGNMENT_STATUS.ACTIVE;
}

/**
 * Resolve active vs all assignments for a membership at the clock's now.
 * @param {Object} membership normalized membership
 * @param {Object} clock injectable clock (now())
 * @returns {{ active_assignments: Array, all_assignments: Array }}
 */
export function resolveActiveAssignments(membership, clock) {
  if (!membership) return { active_assignments: [], all_assignments: [] };

  const nowMs = clock && typeof clock.now === 'function' ? clock.now().getTime() : Date.now();

  // A suspended/revoked membership contributes no active assignments,
  // regardless of per-assignment temporal windows.
  if (membership.status === 'suspended' || membership.status === 'revoked') {
    return { active_assignments: [], all_assignments: [] };
  }

  const assignments = Array.isArray(membership.role_assignments) ? membership.role_assignments : [];
  const all = [];
  const active = [];

  assignments.forEach((a, i) => {
    const assignmentStatus = computeAssignmentStatus(a, nowMs);
    const enriched = { ...a, assignment_id: deriveAssignmentId(membership, i), assignment_status: assignmentStatus };
    all.push(enriched);
    if (assignmentStatus === ASSIGNMENT_STATUS.ACTIVE) active.push(enriched);
  });

  return { active_assignments: active, all_assignments: all };
}

export function createRoleAssignmentResolver({ clock } = {}) {
  return Object.freeze({
    name: 'RoleAssignmentResolver',
    version: ROLE_ASSIGNMENT_RESOLVER_VERSION,
    clockVersion: CLOCK_VERSION,
    async resolve(value, ctx = {}) {
      const membership = value || ctx?.membership;
      const clk = ctx?.clock || clock;
      return resolveActiveAssignments(membership, clk);
    },
  });
}