// ============================================================
// ORBITANOS — Identity Linkage Classifier (RA-0005)
// Shared canonical module — RA-0004 Platform service.
//
// Pure decision logic for the Orbit Identity Model linkage. Given a
// set of Employee records and an authenticated user, classify each
// record into linked / skipped / conflicts WITHOUT performing any
// write. The `identityLinkage` backend function applies the stamps;
// this module is the single source of the decision contract and is
// importable by both backend functions and the test harness.
//
// Contract (RA-0005):
//   - user_id === user.id        → skipped   (idempotent)
//   - user_id set && !== user.id → conflict  (NEVER overwrite —
//                                            identity-theft guard)
//   - user_id null/empty         → linked    (stamp user.id)
//
// Email is the discovery key; user_id is the canonical link.
// Pure, dependency-free. Exit-Ready.
// ============================================================

export const IDENTITY_LINKAGE_VERSION = '1.0.0';

/**
 * Classify Employee records against an authenticated user for linkage.
 * @param employees Employee-like records (must have id + user_id)
 * @param user { id, email }
 * @returns { linked, skipped, conflicts }
 */
export function classifyLinkage(employees, user) {
  const result = { linked: [], skipped: [], conflicts: [] };
  if (!user || !user.id) return result;

  for (const emp of employees || []) {
    if (!emp || !emp.id) continue;

    // 1. Already linked to THIS user — idempotent.
    if (emp.user_id === user.id) {
      result.skipped.push({ id: emp.id, reason: 'already_linked' });
      continue;
    }
    // 2. Linked to a DIFFERENT user — conflict. Never overwrite.
    if (emp.user_id && emp.user_id !== user.id) {
      result.conflicts.push({
        id: emp.id,
        tenant_id: emp.tenant_id,
        existing_user_id: emp.user_id,
      });
      continue;
    }
    // 3. Unlinked — eligible to stamp the canonical link.
    result.linked.push({
      id: emp.id,
      tenant_id: emp.tenant_id,
      role: emp.role,
    });
  }
  return result;
}