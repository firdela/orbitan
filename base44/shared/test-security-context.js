// ============================================================
// ORBITAN TEST LAB — Ephemeral Test Security Context
// Build #28.2P-R.0R.3
//
// Server-only immutable TestSecurityContext derivation from
// canonical TEST_IDENTITIES + PermissionPacks.
//
// A TestSecurityContext is NOT:
//   - a Base44 User
//   - a JWT / session / access token
//   - an accepted Nexus caller
//   - a browser user
//   - a localStorage identity
//   - a client-selected authority
//
// All authoritative fields are derived SERVER-SIDE from canonical
// fixtures. The client may only submit a predefined scenario ID.
//
// Pure functions only — no SDK calls, no side effects.
// ============================================================

import {
  TEST_IDENTITIES, TENANT_A_ID, TENANT_B_TEST_LAB_KEY,
  CROSS_TENANT_AI_PERMISSION, TEST_LAB_PERMISSION,
  getPersonaByKey, PERSONA_KEYS,
} from './test-lab-config.js';
import {
  permissionsForRole, ROLE_PACKS, PERMISSION_KEYS,
} from '../../src/lib/access/PermissionPacks.js';

export const TEST_SECURITY_CONTEXT_VERSION = '1.0.0';

// ── RESOLVE EFFECTIVE PERMISSIONS ─────────────────────────────
// Derives effective permissions from the canonical PermissionPacks
// ROLE_PACKS registry. Platform personas also receive (or not)
// the cross-tenant AI permission based on their definition.
//
// This uses the SAME production permission registry — no duplicate
// permission definitions exist in the Test Lab.
export function resolveEffectivePermissions(persona) {
  if (!persona) return [];

  // Platform personas use their global admin role + explicit permissions
  if (persona.tenant === 'platform') {
    const basePerms = [];
    // Platform allowed: has cross-tenant AI permission
    if (persona.requiresCrossTenantPermission) {
      basePerms.push(CROSS_TENANT_AI_PERMISSION);
    }
    // Neither platform persona receives test_lab.manage
    // (the real operator owns that permission)
    return basePerms;
  }

  // Tenant personas derive permissions from their Employee role
  // via the canonical PermissionPacks ROLE_PACKS registry
  const rolePerms = permissionsForRole(persona.employeeRole);

  // Add any explicitly prohibited permissions as deny entries
  // (for testing explicit-deny precedence)
  return rolePerms;
}

// ── RESOLVE PROHIBITED PERMISSIONS ────────────────────────────
// Returns the list of permissions this persona must NEVER have.
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

  // Resolve outlet_id from fixture data
  const outletId = fixtureData?.outletsByTenant?.[tenantId]?.[0]?.id || null;

  // Resolve employee_fixture_id from fixture data
  const employeeFixtureId = fixtureData?.employeesByEmail?.[persona.email]?.id || null;

  return Object.freeze({
    persona_key: persona.persona_key,
    canonical_email: persona.email,
    label: persona.label,
    global_role: persona.userRole,
    tenant_id: tenantId,
    outlet_id: outletId,
    employee_fixture_id: employeeFixtureId,
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
// This is how the Test Lab exercises the SAME production AccessEngine
// without creating a second authorization engine.
export function buildAccessEngineRequest(ctx, resource, action, overrides = {}) {
  if (!ctx || ctx.error) return null;

  // Construct the identity object expected by AccessEngine
  const identity = {
    id: ctx.employee_fixture_id || `test_persona:${ctx.persona_key}`,
    type: 'user',
    email: ctx.canonical_email,
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
export function validateClientScenarioInput(input) {
  const forbiddenKeys = [
    'role', 'permissions', 'tenant_id', 'outlet_id', 'user_id',
    'employee_role', 'expected_result', 'persona', 'simulated_user',
    'simulated_role', 'simulated_tenant', 'identity_override',
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