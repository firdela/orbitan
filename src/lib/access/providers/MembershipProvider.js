// ============================================================
// ORBITANOS — Access Engine :: MembershipProvider Contract v1.0
// Architecture Version 1.0 (Frozen) — ADR-0050 §M3.2
//
// THE SOLE BOUNDARY responsible for converting an external identity
// source (Base44 Employee, backend function, Microsoft Entra, Google
// Workspace, LDAP, or any future identity service) into the internal
// normalized Membership contract.
//
// All downstream authorization components (MembershipValidator,
// RoleAssignmentResolver, PermissionResolver, AccessPipeline) consume
// Membership ONLY and remain completely independent of the underlying
// identity implementation. This is the architectural rule documented
// in ADR-0050.
//
// Contract:
//   provider.resolve(identity, context) -> Membership | null
//
// - MUST return a normalized Membership object on success.
// - MUST return null when no membership exists for the identity.
// - MUST throw on infrastructure error (the pipeline fails closed).
// - MUST NOT return an invalid/partial shape — fail closed instead.
//
// Pure, dependency-free contract layer. Exit-Ready.
// ============================================================

export const MEMBERSHIP_PROVIDER_CONTRACT_VERSION = '1.0.0';

export const PROVIDER_CONTRACT = Object.freeze({
  name: 'MembershipProvider',
  version: MEMBERSHIP_PROVIDER_CONTRACT_VERSION,
  resolve: 'async (identity, context) -> Membership | null',
});

/**
 * Runtime guard: assert a value conforms to the provider contract.
 * Throws on violation so mis-wiring fails fast at composition time.
 * @param {*} provider
 * @returns {Object} the validated provider
 */
export function assertProvider(provider) {
  if (!provider || typeof provider !== 'object') {
    throw new Error('MembershipProvider: provider must be an object');
  }
  if (typeof provider.resolve !== 'function') {
    throw new Error('MembershipProvider: provider.resolve must be a function');
  }
  if (!provider.name || typeof provider.name !== 'string') {
    throw new Error('MembershipProvider: provider.name is required');
  }
  if (!provider.version || typeof provider.version !== 'string') {
    throw new Error('MembershipProvider: provider.version is required');
  }
  return provider;
}