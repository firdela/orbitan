// ============================================================
// ORBITAN TEST LAB — Tenant Digital Twins (Build #28.2Q-ZE.1)
//
// Canonical synthetic tenant-fixture registry for the Zero-Email
// Test Lab architecture. Provides deterministic tenant profiles
// for automated governance verification without requiring real
// tenant data or production customer records.
//
// A Tenant Digital Twin is a SYNTHETIC fixture — NOT a production
// tenant. All data is non-production, synthetic, and deterministic.
//
// Phase 1 provides enough profiles to replace the current Tenant A/B
// fixture logic cleanly. Future profiles (multi_outlet, high_volume,
// integration_enabled, ai_enabled, ai_restricted) will be added in
// the next simulation/evaluation build.
//
// Pure functions only — no SDK calls, no side effects.
// ============================================================

import { TENANT_A_ID, TENANT_B_TEST_LAB_KEY } from './test-lab-config.js';

// ── CANONICAL TENANT DIGITAL TWIN PROFILES ────────────────────
// Each twin defines a deterministic synthetic tenant configuration
// that the Test Lab uses for fixture resolution.
//
// tenant_fixture_key: the stable identifier linking personas to tenants
// tenant_id: the actual database ID (Tenant A is real, Tenant B is
//   resolved at runtime from test_lab_key)
// test_lab_key: for sandbox tenants, the canonical Test Lab key
// is_sandbox: always true — these are test fixtures
// profile: the deterministic profile type
export const TENANT_DIGITAL_TWINS = [
  {
    tenant_fixture_key: 'tenant_a_standard',
    label: 'Tenant A — Standard F&B Operations',
    tenant_id: TENANT_A_ID,
    test_lab_key: null,
    is_sandbox: true,
    profile: 'standard_fnb',
    description: 'Canonical sandbox Tenant A with standard F&B modules.',
    modules: ['task', 'inventory', 'compliance', 'workforce'],
    packs: ['fnb'],
  },
  {
    tenant_fixture_key: 'tenant_b_standard',
    label: 'Tenant B — Standard F&B Operations',
    tenant_id: null, // Resolved at runtime from test_lab_key
    test_lab_key: TENANT_B_TEST_LAB_KEY,
    is_sandbox: true,
    profile: 'standard_fnb',
    description: 'Canonical sandbox Tenant B with standard F&B modules. Isolated from Tenant A.',
    modules: ['task', 'inventory', 'compliance', 'workforce'],
    packs: ['fnb'],
  },
];

// ── LOOKUP HELPERS ─────────────────────────────────────────────
export function getTenantDigitalTwin(fixtureKey) {
  return TENANT_DIGITAL_TWINS.find(t => t.tenant_fixture_key === fixtureKey) || null;
}

export function getTenantDigitalTwinByTenantId(tenantId) {
  return TENANT_DIGITAL_TWINS.find(t => t.tenant_id === tenantId) || null;
}

export function getTenantDigitalTwinByTestLabKey(testLabKey) {
  return TENANT_DIGITAL_TWINS.find(t => t.test_lab_key === testLabKey) || null;
}

// ── ALL TENANT DIGITAL TWIN KEYS ──────────────────────────────
export const TENANT_DIGITAL_TWIN_KEYS = TENANT_DIGITAL_TWINS.map(t => t.tenant_fixture_key);