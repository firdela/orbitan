// ============================================================
// ORBITAN TEST LAB — Ephemeral Test Security Context
// Build #28.2Q-ZE.1 — Zero-Email Persona Migration
//
// Server-only immutable TestSecurityContext derivation from
// canonical TEST_PERSONAS + PermissionPacks + Tenant Digital Twins.
//
// A TestSecurityContext is NOT:
//   - a Base44 User
//   - a JWT / session / access token
//   - an accepted Nexus caller
//   - a browser user
//   - a localStorage identity
//   - a client-selected authority
//   - an email identity
//
// All authoritative fields are derived SERVER-SIDE from canonical
// fixtures. The client may only submit a predefined scenario ID.
//
// BUILD #28.2Q-ZE.1 — ZERO-EMAIL:
//   - No canonical_email in the context
//   - No employeesByEmail lookup
//   - Employee fixture resolved by employee_fixture_key
//   - AccessEngine identity uses test_persona:persona_key (no email)
//   - identity.type = 'synthetic_test_persona'
//
// Pure functions only — no SDK calls, no side effects.
// ============================================================

import {
  TEST_PERSONAS, TENANT_A_ID, TENANT_B_TEST_LAB_KEY,
  CROSS_TENANT_AI_PERMISSION, TEST_LAB_PERMISSION,
  getPersonaByKey, PERSONA_KEYS,
} from './test-lab-config.js';
import {
  permissionsForRole, ROLE_PACKS, PERMISSION_KEYS,
} from './access/PermissionPacks.js';

export const TEST_SECURITY_CONTEXT_VERSION = '2.0.0';

// ── RESOLVE EFFECTIVE PERMISSIONS ─────────────────────────────
// Derives effective permissions from the canonical PermissionPacks
// ROLE_PACKS registry. Platform personas also receive (or not)
// the cross-tenant AI permission based on their definition.
export function resolveEffectivePermissions(persona) {
  if (!persona) return [];

  // Platform personas use their global admin role + explicit permissions
  if (persona.tenant === 'platform') {
    const basePerms = [];
    if (persona.requiresCrossTenantPermission) {
      basePerms.push(CROSS_TENANT_AI_PERMISSION);
    }
    return basePerms;
  }

  // Tenant personas derive permissions from their Employee role
  const rolePerms = permissionsForRole(persona.employeeRole);
  return rolePerms;
}

// ── RESOLVE PROHIBITED PERMISSIONS ────────────────────────────
export function resolveProhibitedPermissions(persona) {
  if (!persona) return [];
  return persona.prohibitedPermissions || [];
}

// ── RESOLVE TENANT ID ─────────────────────────────────────────
// Resolves the canonical tenant ID for a persona.
// Tenant A → TENANT_A_ID
// Tenant B → resolved from fixture data (Tenant B may not be provisioned)
// Platform → null (platform-level, no tenant scope)
export function resolveTenantId(persona, fixtureData) {
  if (!persona) return null;
  if (persona.tenant === 'A') return TENANT_A_ID;
  if (persona.tenant === 'B') return fixtureData?.tenantBId || null;
  return null; // platform
}

// ── DERIVE TEST SECURITY CONTEXT ─────────────────────────────
// Creates an immutable TestSecurityContext from a canonical persona
// key + fixture data. This is the ONLY way to create a TestSecurityContext.
//
// BUILD #28.2Q-ZE.1: Fixture data uses fixture-key-based employee
// resolution. Employee fixture is resolved by the persona's
// employee_fixture_key — no email lookup.
//
// The client NEVER provides role, permissions, tenant_id, outlet_id,
// user_id, or employee_role. All are derived server-side.
export function deriveTestSecurityContext(personaKey, fixtureData = {}) {
  const persona = getPersonaByKey(personaKey);
  if (!persona) {
    return {
      error: 'unknown_persona',
      message: `Unknown persona key: ${personaKey}. Must be one of: ${PERSONA_KEYS.join(', ')}`,
    };
  }

  const tenantId = resolveTenantId(persona, fixtureData);
  const effectivePermissions = resolveEffectivePermissions(persona);
  const prohibitedPermissions = resolveProhibitedPermissions(persona);

  // Resolve outlet_id from fixture data by tenant
  const outletId = fixtureData?.outletsByTenant?.[tenantId]?.[0]?.id || null;

  // Build #28.2Q-ZE.1: Resolve employee_fixture_id by fixture key (NOT email)
  const employeeFixtureKey = persona.employee_fixture_key;
  const employeeFixtureId = fixtureData?.employeesByFixtureKey?.[employeeFixtureKey]?.id || null;

  return Object.freeze({
    persona_key: persona.persona_key,
    label: persona.label,
    global_role: persona.userRole,
    tenant_id: tenantId,
    outlet_id: outletId,
    employee_fixture_id: employeeFixtureId,
    employee_fixture_key: employeeFixtureKey,
    employee_role: persona.employeeRole,
    effective_permissions: effectivePermissions,
    prohibited_permissions: prohibitedPermissions,
    requires_cross_tenant_permission: persona.requiresCrossTenantPermission || false,
    verification_run_id: fixtureData?.verificationRunId || null,
    non_production: true,
    version: TEST_SECURITY_CONTEXT_VERSION,
  });
}

// ── BUILD ACCESS ENGINE REQUEST ───────────────────────────────
// Constructs a request object compatible with the production
// AccessEngine.evaluate() from a TestSecurityContext.
//
// BUILD #28.2Q-ZE.1: Identity uses a deterministic synthetic ID
// (test_persona:persona_key) with type 'synthetic_test_persona'.
// No email is included — AccessEngine does not require it.
export function buildAccessEngineRequest(ctx, resource, action, overrides = {}) {
  if (!ctx || ctx.error) return null;

  // Construct the identity object expected by AccessEngine
  // Build #28.2Q-ZE.1: No email — synthetic test persona identity
  const identity = {
    id: ctx.employee_fixture_id || `test_persona:${ctx.persona_key}`,
    type: 'synthetic_test_persona',
    platform_role: ctx.global_role,
    role: ctx.global_role,
  };

  // Construct workspace from tenant context
  const workspace = ctx.tenant_id ? { tenant_id: ctx.tenant_id, outlet_id: ctx.outlet_id } : null;

  // Construct membership from employee fixture
  const membership = ctx.employee_fixture_id ? {
    id: ctx.employee_fixture_id,
    tenant_id: ctx.tenant_id,
    outlet_id: ctx.outlet_id,
    role: ctx.employee_role,
    status: 'active',
  } : null;

  // Construct permissions from effective_permissions with scope
  const permissions = ctx.effective_permissions.map(key => ({
    key,
    effect: 'allow',
    source: 'role_default',
    scope: { tenant_id: ctx.tenant_id, outlet_id: ctx.outlet_id || null },
  }));

  // Add prohibited permissions as explicit denies
  for (const deniedKey of ctx.prohibited_permissions) {
    permissions.push({
      key: deniedKey,
      effect: 'deny',
      source: 'explicit',
      scope: { tenant_id: ctx.tenant_id, outlet_id: ctx.outlet_id || null },
    });
  }

  return {
    identity,
    workspace,
    membership,
    permissions,
    resource,
    action,
    is_platform_op: ctx.tenant_id === null && ctx.global_role === 'admin',
    ...overrides,
  };
}

// ── VALIDATE CLIENT SCENARIO INPUT ────────────────────────────
// Ensures the client has NOT supplied any authority-adjacent fields.
// The client may only submit a scenario_id — nothing else.
//
// BUILD #28.2Q-ZE.1: Also rejects email-based authority injection
// (canonical_email, email, alias) to enforce zero-email policy.
export function validateClientScenarioInput(input) {
  const forbiddenKeys = [
    'role', 'permissions', 'tenant_id', 'outlet_id', 'user_id',
    'employee_role', 'expected_result', 'persona', 'simulated_user',
    'simulated_role', 'simulated_tenant', 'identity_override',
    // Build #28.2Q-ZE.1 — zero-email: reject email-based authority
    'email', 'canonical_email', 'alias', 'persona_key',
  ];
  const violations = [];
  for (const key of forbiddenKeys) {
    if (input && input[key] !== undefined) {
      violations.push(key);
    }
  }
  return {
    valid: violations.length === 0,
    violations,
  };
}