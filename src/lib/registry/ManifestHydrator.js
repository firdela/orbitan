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
  { type: 'section', label: 'Operations' },
  { id: 'dashboard', label: 'Dashboard', icon: 'Home', route: '/dashboard', module_key: 'dashboard', isLocked: false },
  { id: 'inventory', label: 'Inventory', icon: 'Package', route: '/inventory', module_key: 'inventory', isLocked: false },
  { id: 'procurement', label: 'Purchase Orders', icon: 'ShoppingCart', route: '/procurement', module_key: 'procurement', isLocked: false },
  { id: 'clients', label: 'Clients', icon: 'Store', route: '/clients', module_key: 'clients', isLocked: false },
  { type: 'section', label: 'Finance' },
  { id: 'sales', label: 'Sales & Invoicing', icon: 'FileText', route: '/sales', module_key: 'sales_invoice', isLocked: false },
  { id: 'expenses', label: 'Expenses', icon: 'Receipt', route: '/expenses', module_key: 'expenses', isLocked: false },
  { type: 'section', label: 'Staffing' },
  { id: 'workforce', label: 'Workforce', icon: 'Users', route: '/workforce', module_key: 'workforce', isLocked: false },
  { id: 'scheduling', label: 'Shift Schedule', icon: 'Calendar', route: '/scheduling', module_key: 'scheduling', isLocked: false },
  { id: 'shift-trades', label: 'Shift Trades', icon: 'ArrowLeftRight', route: '/shift-trades', module_key: 'shift_trades', isLocked: false },
  { id: 'tasks', label: 'Tasks', icon: 'CheckSquare', route: '/tasks', module_key: 'task', isLocked: false },
  { id: 'access-requests', label: 'Access Requests', icon: 'UserCheck', route: '/access-requests', module_key: 'access_requests', isLocked: false },
  { type: 'section', label: 'Insights & Compliance' },
  { id: 'reports', label: 'Reports', icon: 'BarChart2', route: '/reports', module_key: 'reporting', isLocked: false },
  { id: 'compliance', label: 'Compliance', icon: 'Shield', route: '/compliance', module_key: 'compliance', isLocked: false },
  { id: 'sustainability', label: 'Sustainability', icon: 'Leaf', route: '/sustainability', module_key: 'sustainability', isLocked: false },
  { type: 'section', label: 'Settings' },
  { id: 'facility-settings', label: 'Facility Settings', icon: 'Settings', route: '/facility-settings', module_key: 'facility_settings', isLocked: false },
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
      buildManifestNav(manifest, tenantId, tenant, allowedModules, isEnterprise),
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

// ── Standard workspace modules guaranteed in every nav ─────
// Ensures operational tools are always one click away, even if
// a PlatformManifest DB record doesn't explicitly list them.
const STANDARD_WORKSPACE_MODULES = [
  { section: 'Finance', id: 'expenses', label: 'Expenses', icon: 'Receipt', routeSuffix: '/expenses', moduleKey: 'expenses' },
  { section: 'Operations', id: 'clients', label: 'Clients', icon: 'Store', routeSuffix: '/clients', moduleKey: 'clients' },
  { section: 'Insights & Compliance', id: 'sustainability', label: 'Sustainability', icon: 'Leaf', routeSuffix: '/sustainability', moduleKey: 'sustainability' },
  { section: 'Staffing', id: 'shift-trades', label: 'Shift Trades', icon: 'ArrowLeftRight', routeSuffix: '/shift-trades', moduleKey: 'shift_trades' },
  { section: 'Settings', id: 'facility-settings', label: 'Facility Settings', icon: 'Settings', routeSuffix: '/facility-settings', moduleKey: 'facility_settings' },
];

function appendMissingStandardModules(result, tenantId, allowedModules, allUnlocked) {
  const existingKeys = new Set(result.filter(i => i.module_key).map(i => i.module_key));
  const missing = STANDARD_WORKSPACE_MODULES.filter(m => !existingKeys.has(m.moduleKey));
  if (missing.length === 0) return;

  // Insert missing modules into their matching existing section,
  // or append a new section at the end if no match exists.
  for (const m of missing) {
    const isLocked = !allUnlocked && !allowedModules.includes(m.moduleKey);
    const navItem = {
      id: m.id,
      label: m.label,
      icon: m.icon,
      route: `/workspace/${tenantId}${m.routeSuffix}`,
      module_key: m.moduleKey,
      isLocked,
    };

    // Find the section header index
    let sectionIdx = -1;
    for (let i = 0; i < result.length; i++) {
      if (result[i].type === 'section' && result[i].label === m.section) {
        sectionIdx = i;
        break;
      }
    }

    if (sectionIdx >= 0) {
      // Find the last item in this section (before next section or end)
      let insertAt = sectionIdx + 1;
      while (insertAt < result.length && result[insertAt].type !== 'section') {
        insertAt++;
      }
      result.splice(insertAt, 0, navItem);
    } else {
      // Section doesn't exist yet — create it
      result.push({ type: 'section', label: m.section });
      result.push(navItem);
    }
  }
}

// ── Build navigation from a PlatformManifest record ─────────
function buildManifestNav(manifest, tenantId, tenant, allowedModules, isEnterprise) {
  const navTree = manifest.ui_config?.navigation_blueprint || [];
  const result = [];

  // Pilot tenants bypass subscription gating during pilot phase
  const isPilot = tenant?.is_pilot_tenant === true;
  const allUnlocked = isEnterprise || isPilot;

  for (const section of navTree) {
    // Section header
    result.push({ type: 'section', label: section.label });

    // Module items
    for (const item of (section.children || [])) {
      const route = (item.route || '').replace(':tenantId', tenantId);
      // Skip items with no route — they would render as dead links
      if (!route) continue;
      const isLocked = !allUnlocked && !allowedModules.includes(item.id);

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

  // Ensure all standard workspace modules are accessible (one-click guarantee)
  appendMissingStandardModules(result, tenantId, allowedModules, allUnlocked);

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