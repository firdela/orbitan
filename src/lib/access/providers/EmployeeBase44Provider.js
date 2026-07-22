// ============================================================
// ORBITANOS — Access Engine :: EmployeeBase44Provider v1.0
// Architecture Version 1.0 (Frozen) — ADR-0050 §M3.2
//
// THE SOLE ACCESS-LAYER COMPONENT that:
//   - imports the Base44 SDK
//   - queries the Employee entity
//   - understands the legacy Employee schema
//
// It converts an Employee record into the normalized Membership
// contract via translateEmployee (the Compatibility Matrix adapter)
// and returns a Membership. Everything after this provider operates
// on Membership only — no Employee field ever leaks downstream.
//
// If you later swap Base44 for a backend function, Entra, Google
// Workspace, or LDAP, you implement a new MembershipProvider; nothing
// in the Access Engine changes. RLS / tenant isolation is an
// implementation detail of THIS provider, not an architectural
// dependency of the pipeline.
//
// Fail-closed: null when no Employee found; throws propagate to the
// pipeline (denied as PROVIDER_ERROR).
// ============================================================

import { base44 } from '@/api/base44Client';
import { translateEmployee, MEMBERSHIP_RESOLVER_VERSION } from '../membership/MembershipResolver.js';
import { MEMBERSHIP_PROVIDER_CONTRACT_VERSION } from './MembershipProvider.js';

export const EMPLOYEE_BASE44_PROVIDER_VERSION = '1.0.0';

/**
 * Create the Base44-backed membership provider.
 * @param {Object} [opts] dependency injection (tests may pass a mock client)
 * @param {Object} [opts.client] a base44-shaped client with .entities.Employee
 */
export function createEmployeeBase44Provider({ client } = {}) {
  const sdk = client || base44;

  return Object.freeze({
    name: 'EmployeeBase44Provider',
    version: EMPLOYEE_BASE44_PROVIDER_VERSION,
    contractVersion: MEMBERSHIP_PROVIDER_CONTRACT_VERSION,
    resolverVersion: MEMBERSHIP_RESOLVER_VERSION,

    /**
     * Resolve a normalized Membership for the given identity.
     * @param {Object} identity { id, email?, tenant_id? }
     * @param {Object} [context] { tenant_id? }
     * @returns {Promise<Object|null>} normalized Membership or null
     */
    async resolve(identity, context = {}) {
      const userId = identity?.id;
      if (!userId) return null;

      const tenantId = context?.tenant_id || identity?.tenant_id || null;
      const filter = { user_id: userId };
      if (tenantId) filter.tenant_id = tenantId;

      const records = await sdk.entities.Employee.filter(filter, '-created_date', 50);
      if (!records || records.length === 0) return null;

      // Multiple records for one user (e.g. legacy duplicates, or a
      // user with memberships across tenants when no tenant scope was
      // supplied): prefer an active/on_leave record, else the first.
      const active = records.find(r => r.status === 'active' || r.status === 'on_leave');
      const employee = active || records[0];

      return translateEmployee(employee);
    },
  });
}