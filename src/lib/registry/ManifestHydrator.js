// ============================================================
// ORBITANOS — ManifestHydrator
//
// The central resolution middleware that stitches together:
//   PlatformManifest (UI/Nav Registry)
//   SubscriptionPolicy (Governance/Entitlement Registry)
//
// At runtime, it fetches both in parallel, intersects them, and
// returns a hydrated navigation tree where each module is marked
// as either "permitted" or "upsell" (Graceful Lockout pattern).
//
// The frontend becomes a dynamic "thin client" that reacts to
// database-level changes without redeploying code.
//
// SAFETY: If no manifest is found, falls back to the legacy
// hardcoded navigation so the platform never "goes dark."
// ============================================================

import { base44 } from '@/api/base44Client';

// ── Legacy Fallback ──────────────────────────────────────────
// Used ONLY when no PlatformManifest record exists for a tenant.
// This ensures zero downtime during migration.
const FALLBACK_NAV = [
  { type: 'section', label: 'Workspace' },
  { id: 'dashboard', label: 'Dashboard', icon: 'Home', route: '', module_key: 'dashboard', isLocked: false },
  { id: 'inventory', label: 'Inventory', icon: 'Package', route: '/inventory', module_key: 'inventory', isLocked: false },
  { id: 'procurement', label: 'Purchase Orders', icon: 'ShoppingCart', route: '/procurement', module_key: 'procurement', isLocked: false },
  { id: 'sales', label: 'Sales & Reconciliation', icon: 'FileText', route: '/sales', module_key: 'sales_invoice', isLocked: false },
  { type: 'section', label: 'Team' },
  { id: 'workforce', label: 'My Team', icon: 'Users', route: '/workforce', module_key: 'workforce', isLocked: false },
  { id: 'scheduling', label: 'Shift Schedule', icon: 'Calendar', route: '/scheduling', module_key: 'scheduling', isLocked: false },
  { id: 'tasks', label: 'Tasks', icon: 'CheckSquare', route: '/tasks', module_key: 'task', isLocked: false },
  { type: 'section', label: 'Reports' },
  { id: 'reports', label: 'Reports', icon: 'BarChart2', route: '/reports', module_key: 'reporting', isLocked: false },
  { id: 'compliance', label: 'Compliance', icon: 'Shield', route: '/compliance', module_key: 'compliance', isLocked: false },
  { type: 'section', label: 'Product' },
  { id: 'feedback', label: 'Feedback Centre', icon: 'MessageSquare', route: '/feedback', module_key: 'feedback', isLocked: false },
];

/**
 * Hydrate the navigation + entitlements for a given tenant.
 *
 * @param {string} tenantId — The tenant's database ID
 * @param {object} tenant — The full Tenant record (must have manifest_key + subscription_plan)
 * @returns {Promise<{ navigation: array, policy: object|null, manifest: object|null, source: 'manifest'|'fallback' }>}
 */
export async function hydrateManifest(tenantId, tenant) {
  if (!tenantId || !tenant) {
    return { navigation: buildFallbackNav(tenantId, tenant?.hidden_modules), policy: null, manifest: null, source: 'fallback' };
  }

  // ── Resolve the manifest key ──
  // Priority: tenant.manifest_key → tenant.feature_flags?.manifest_key → null (fallback)
  const manifestKey = tenant.manifest_key || tenant.feature_flags?.manifest_key || null;

  if (!manifestKey) {
    return { navigation: buildFallbackNav(tenantId, tenant?.hidden_modules), policy: null, manifest: null, source: 'fallback' };
  }

  try {
    // ── PARALLEL FETCH: Manifest + SubscriptionPolicy ──
    const [manifestRecords, policyRecords] = await Promise.all([
      base44.entities.PlatformManifest.filter({ manifest_key: manifestKey, is_active: true }),
      base44.entities.SubscriptionPolicy.filter({ plan_key: tenant.subscription_plan, is_active: true }),
    ]);

    const manifest = manifestRecords?.[0] || null;
    const policy = policyRecords?.[0] || null;

    if (!manifest) {
      return { navigation: buildFallbackNav(tenantId, tenant?.hidden_modules), policy: null, manifest: null, source: 'fallback' };
    }

    // ── INTERSECTION LOGIC (Graceful Lockout) ──
    // Permitted modules come from SubscriptionPolicy.allowed_modules.
    // If no policy exists, treat all modules as permitted (fail-open).
    const allowedModules = policy?.allowed_modules || [];
    const isEnterprise = allowedModules.includes('all') || allowedModules.includes('*');

    const hiddenModules = tenant.hidden_modules || [];
    const navigation = filterHiddenModules(
      buildManifestNav(manifest, tenantId, allowedModules, isEnterprise),
      hiddenModules
    );

    return {
      navigation,
      policy,
      manifest,
      source: 'manifest',
    };
  } catch (err) {
    // Fail-open: use fallback nav on any error
    console.error('[ManifestHydrator] Hydration failed, using fallback:', err.message);
    return { navigation: buildFallbackNav(tenantId, tenant?.hidden_modules), policy: null, manifest: null, source: 'fallback' };
  }
}

// ── Filter out hidden modules + clean up empty sections ────
function filterHiddenModules(navItems, hiddenModules) {
  if (!hiddenModules || hiddenModules.length === 0) return navItems;
  const filtered = navItems.filter(item => {
    if (item.type === 'section') return true;
    return !hiddenModules.includes(item.module_key);
  });
  // Remove section headers that have no items following them
  return filtered.filter((item, idx) => {
    if (item.type !== 'section') return true;
    const next = filtered[idx + 1];
    return next && next.type !== 'section';
  });
}

// ── Build navigation from a PlatformManifest record ─────────
function buildManifestNav(manifest, tenantId, allowedModules, isEnterprise) {
  const navTree = manifest.ui_config?.navigation_blueprint || [];
  const result = [];

  for (const section of navTree) {
    // Section header
    result.push({ type: 'section', label: section.label });

    // Module items
    for (const item of (section.children || [])) {
      const route = (item.route || '').replace(':tenantId', tenantId);
      const isLocked = !isEnterprise && !allowedModules.includes(item.id);

      result.push({
        id: item.id,
        label: item.label,
        icon: item.icon,
        route,
        module_key: item.id,
        isLocked,
      });
    }
  }

  // Append the Feedback Centre link (always visible — pilot-critical)
  result.push({ type: 'section', label: 'Product' });
  result.push({
    id: 'feedback',
    label: 'Feedback Centre',
    icon: 'MessageSquare',
    route: `/workspace/${tenantId}/feedback`,
    module_key: 'feedback',
    isLocked: false,
  });

  // Append the platform navigation link (always visible)
  result.push({ type: 'section', label: 'Navigation' });
  result.push({
    id: 'leader_org',
    label: 'OrbitanOS Console',
    icon: 'Layers',
    route: '/leader-org',
    module_key: 'leader_org',
    isLocked: false,
  });

  return result;
}

// ── Build legacy fallback navigation ───────────────────────
function buildFallbackNav(tenantId, hiddenModules) {
  const base = `/workspace/${tenantId}`;
  const nav = FALLBACK_NAV.map(item => {
    if (item.type === 'section') return item;
    return { ...item, route: `${base}${item.route}` };
  });
  return filterHiddenModules(nav, hiddenModules || []);
}

// ── Helper: Check if a module is entitled ───────────────────
export function isModuleEntitled(hydratedNav, moduleKey) {
  const item = hydratedNav.find(n => n.module_key === moduleKey);
  return item ? !item.isLocked : false;
}