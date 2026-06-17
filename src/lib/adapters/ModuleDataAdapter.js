// ============================================================
// ORBITANOS — MODULE DATA ADAPTER (Universal Query Layer)
// Provides a single entry point for any module UI to query
// its entity data, regardless of industry pack.
//
// Usage:
//   await ModuleDataAdapter.fetch('fnb', 'inventory', base44, tenant, outlet)
//   → returns { items: [...], stats: {...}, config: {...} }
//
// EXIT-READY: Pure async functions. Swap base44 for any SDK.
// ============================================================

import { resolveModuleConfig } from '@/lib/identity/pack-registry';
import { adaptInventoryBatch } from '@/lib/adapters/InventoryAdapter';

/**
 * Universal module data fetcher.
 *
 * @param {string} packKey    — 'fnb' | 'recycling' | 'retail'
 * @param {string} moduleKey  — 'inventory' | 'procurement' | etc.
 * @param {object} base44     — Pre-initialized Base44 SDK client
 * @param {object} tenant     — Tenant context { tenant_id, outlet_id }
 * @param {object} opts       — { limit, search, status, sort }
 * @returns {object} { items, stats, config, adapter }
 */
export async function fetchModuleData(packKey, moduleKey, base44, tenant = {}, opts = {}) {
  const config = resolveModuleConfig(packKey, moduleKey);
  if (!config || !config.entity) {
    return { items: [], stats: null, config, adapter: null };
  }

  const { entity: entityName, sortField, statFields } = config;
  const { limit = 50, search, status, sort } = opts;

  // Build query filter
  const query = {};
  if (tenant.tenant_id) query.tenant_id = tenant.tenant_id;
  if (tenant.outlet_id) query.outlet_id = tenant.outlet_id;
  if (status) query.status = status;

  try {
    const sortOrder = sort || sortField || '-created_date';

    // Fetch records
    let records = [];
    if (search && config.searchFields?.length) {
      // Simple client-side search — entities SDK filter supports exact match,
      // so we fetch a larger batch and filter for prefix/search matches
      records = await base44.entities[entityName].filter(query, sortOrder, limit || 100);
      const q = search.toLowerCase();
      records = records.filter(r =>
        config.searchFields.some(f => {
          const val = r[f];
          return val && String(val).toLowerCase().includes(q);
        })
      ).slice(0, limit);
    } else {
      records = await base44.entities[entityName].filter(query, sortOrder, limit);
    }

    // Adapt records for the UI
    const items = adaptForUI(records, packKey, moduleKey);

    // Compute stats
    const stats = computeStats(records, statFields, packKey, moduleKey);

    return { items, stats, config, totalCount: records.length };
  } catch (err) {
    console.error(`[ModuleDataAdapter] Failed to fetch ${packKey}/${moduleKey}:`, err);
    return { items: [], stats: null, config, totalCount: 0, error: err.message };
  }
}

/**
 * Adapt raw entity records into the universal UI shape for a module.
 * Currently supports inventory. Extend with switch cases as new
 * module adapters are created.
 */
function adaptForUI(records, packKey, moduleKey) {
  if (moduleKey === 'inventory') {
    return adaptInventoryBatch(records, packKey);
  }
  // Fallback: return raw records for other modules
  return records;
}

/**
 * Compute summary statistics from raw records.
 */
function computeStats(records, statFields, packKey, moduleKey) {
  if (!records.length || !statFields) return null;

  const stats = { total: records.length };

  if (statFields.stockField) {
    stats.totalStock = records.reduce((sum, r) => sum + (r[statFields.stockField] ?? 0), 0);
  }

  if (statFields.valueField && statFields.stockField) {
    stats.totalValue = records.reduce((sum, r) => {
      return sum + ((r[statFields.stockField] ?? 0) * (r[statFields.valueField] ?? 0));
    }, 0);
  }

  if (statFields.alertField) {
    const alertField = statFields.alertField;
    stats.alerts = records.filter(r => {
      const stock = r[statFields.stockField] ?? 0;
      const threshold = r[alertField] ?? 0;
      return threshold > 0 && stock <= threshold;
    }).length;
  }

  if (statFields.statusField) {
    const sf = statFields.statusField;
    stats.active = records.filter(r => r[sf] === 'active').length;
    stats.pending = records.filter(r => r[sf] === 'pending' || r[sf] === 'draft').length;
    stats.overdue = records.filter(r => r[sf] === 'overdue').length;
  }

  return stats;
}

/**
 * Get the UI label for a module in a given pack.
 */
export function getModuleLabel(packKey, moduleKey) {
  const config = resolveModuleConfig(packKey, moduleKey);
  return config?.label || moduleKey;
}

export default { fetchModuleData, getModuleLabel };