// ============================================================
// ORBITANOS — Access Engine :: MockMembershipProvider v1.0
// Architecture Version 1.0 (Frozen) — ADR-0050 §M3.2
//
// A pure, SDK-free MembershipProvider for tests. Returns pre-seeded
// normalized Memberships directly (no Employee translation) — this
// exercises the provider contract boundary independently of the
// Access Engine and independently of Base44.
//
// Simulates how a future Entra / Google Workspace / LDAP provider
// would behave: it already holds normalized memberships and simply
// resolves the identity to one (or null), and can be made to throw
// to verify fail-closed behavior.
// ============================================================

import { MEMBERSHIP_PROVIDER_CONTRACT_VERSION } from './MembershipProvider.js';

export const MOCK_PROVIDER_VERSION = '1.0.0';

/**
 * @param {Array<Object>} memberships pre-normalized membership objects
 * @param {Object} [opts]
 * @param {Function} [opts.throwFor] (identity, context) -> boolean — simulate infra error
 */
export function createMockMembershipProvider(memberships = [], { throwFor } = {}) {
  const byUserId = new Map();
  for (const m of memberships) {
    if (m && m.user_id) {
      const list = byUserId.get(m.user_id) || [];
      list.push(m);
      byUserId.set(m.user_id, list);
    }
  }

  return Object.freeze({
    name: 'MockMembershipProvider',
    version: MOCK_PROVIDER_VERSION,
    contractVersion: MEMBERSHIP_PROVIDER_CONTRACT_VERSION,

    async resolve(identity, context = {}) {
      const userId = identity?.id;
      if (!userId) return null;

      if (typeof throwFor === 'function' && throwFor(identity, context)) {
        throw new Error('MockMembershipProvider: simulated infrastructure error');
      }

      const list = byUserId.get(userId) || [];
      if (list.length === 0) return null;

      const tenantId = context?.tenant_id || null;
      if (tenantId) {
        // Tenant-scoped request: only an exact organisation_id match resolves.
        const matched = list.find(m => m.organisation_id === tenantId);
        return matched || null;
      }

      // No tenant scope: prefer an active membership, else the first.
      const active = list.find(m => m.status === 'active');
      return active || list[0];
    },
  });
}