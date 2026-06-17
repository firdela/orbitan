// ============================================================
// ORBITANOS — INVENTORY ADAPTER (Domain Translation Layer)
// Translates industry-specific entity shapes into a universal
// InventoryItem contract that every Inventory UI component consumes.
//
// EXIT-READY: Pure JS. Zero framework dependency.
// ============================================================

/**
 * Universal Inventory Shape — what the UI receives
 * {
 *   id, name, sku, category, unit,
 *   currentStock, parLevel, reorderPoint,
 *   costPerUnit, totalValue,
 *   status, alert, expiryDate,
 *   supplierName, storageLocation,
 *   lastUpdated
 * }
 */

/**
 * F&B Adapter: InventoryItem entity → Universal Inventory Shape
 */
function fromFnb(raw) {
  return {
    id: raw.id,
    name: raw.name,
    sku: raw.sku || '',
    category: raw.category || 'Ingredient',
    unit: raw.unit || 'unit',
    currentStock: raw.current_stock ?? 0,
    parLevel: raw.par_level ?? 0,
    reorderPoint: raw.reorder_point ?? 0,
    costPerUnit: raw.cost_per_unit ?? 0,
    totalValue: (raw.current_stock ?? 0) * (raw.cost_per_unit ?? 0),
    status: raw.status || 'active',
    alert: raw.current_stock <= (raw.par_level || 0) ? 'low_stock' : 'ok',
    alertLabel: raw.current_stock <= (raw.par_level || 0) ? 'Reorder needed' : null,
    expiryDate: raw.expiry_date || null,
    supplierName: raw.supplier_name || null,
    storageLocation: raw.storage_location || null,
    lastUpdated: raw.updated_date || raw.created_date,
    raw,
  };
}

/**
 * Recycling Adapter: MaterialCollection entity → Universal Inventory Shape
 * Recycling measures in weight (kg) rather than discrete units.
 */
function fromRecycling(raw) {
  const currentWeight = raw.total_weight_kg ?? raw.total_weight ?? 0;
  const maxCapacity = raw.max_capacity_kg ?? raw.max_capacity ?? 0;
  const alert = maxCapacity > 0 && currentWeight >= maxCapacity * 0.85 ? 'capacity_warning' : 'ok';
  return {
    id: raw.id,
    name: raw.material_name || raw.name || 'Unnamed Material',
    sku: raw.material_code || raw.sku || '',
    category: raw.material_type || raw.category || 'Recovered Material',
    unit: 'kg',
    currentStock: currentWeight,
    parLevel: 0,
    reorderPoint: 0,
    costPerUnit: raw.market_rate_per_kg ?? 0,
    totalValue: currentWeight * (raw.market_rate_per_kg ?? 0),
    status: raw.storage_status || raw.status || 'active',
    alert,
    alertLabel: alert === 'capacity_warning' ? 'Near max capacity' : null,
    expiryDate: null,
    supplierName: raw.source_partner || raw.supplier_name || null,
    storageLocation: raw.storage_bay || raw.storage_location || null,
    lastUpdated: raw.updated_date || raw.created_date,
    raw,
  };
}

/**
 * Retail Adapter: InventoryItem + ProductCatalog → Universal Inventory Shape
 */
function fromRetail(raw) {
  return {
    id: raw.id,
    name: raw.product_name || raw.name || 'Unnamed Product',
    sku: raw.sku || raw.product_code || '',
    category: raw.category || raw.department || 'General',
    unit: raw.unit || 'piece',
    currentStock: raw.current_stock ?? raw.stock_on_hand ?? 0,
    parLevel: raw.par_level ?? raw.min_stock_level ?? 0,
    reorderPoint: raw.reorder_point ?? raw.min_stock_level ?? 0,
    costPerUnit: raw.cost_per_unit ?? raw.purchase_price ?? 0,
    totalValue: (raw.current_stock ?? 0) * (raw.cost_per_unit ?? 0),
    status: raw.status || 'active',
    alert: raw.current_stock <= (raw.par_level || raw.min_stock_level || 0) ? 'low_stock' : 'ok',
    alertLabel: raw.current_stock <= (raw.par_level || raw.min_stock_level || 0) ? 'Reorder needed' : null,
    expiryDate: null,
    supplierName: raw.supplier_name || null,
    storageLocation: raw.storage_location || raw.warehouse_section || null,
    lastUpdated: raw.updated_date || raw.created_date,
    raw,
  };
}

// ── Adapter Registry ────────────────────────────────────────
const INVENTORY_ADAPTERS = {
  fnb:        { entity: 'InventoryItem',      adapt: fromFnb,      label: 'Ingredient Inventory' },
  recycling:  { entity: 'MaterialCollection',  adapt: fromRecycling, label: 'Material Stock' },
  retail:     { entity: 'InventoryItem',       adapt: fromRetail,    label: 'Product Inventory' },
};

/**
 * Resolve the adapter config for a given industry pack key.
 * Returns { entity, adapt, label } or null if unsupported.
 */
export function getInventoryAdapter(packKey) {
  return INVENTORY_ADAPTERS[packKey] || null;
}

/**
 * Transform a raw entity record into the universal inventory shape.
 * Caches adapter lookup internally. Returns null for unsupported packs.
 */
export function adaptInventoryRecord(rawRecord, packKey) {
  const adapter = INVENTORY_ADAPTERS[packKey];
  if (!adapter) return null;
  return adapter.adapt(rawRecord);
}

/**
 * Batch-transform an array of raw records.
 */
export function adaptInventoryBatch(rawRecords, packKey) {
  const adapter = INVENTORY_ADAPTERS[packKey];
  if (!adapter) return [];
  return rawRecords.map(r => adapter.adapt(r)).filter(Boolean);
}

/**
 * Get the entity name to query for a given pack.
 */
export function getInventoryEntityName(packKey) {
  const adapter = INVENTORY_ADAPTERS[packKey];
  return adapter?.entity || 'InventoryItem';
}

export { INVENTORY_ADAPTERS };
export default { getInventoryAdapter, adaptInventoryRecord, adaptInventoryBatch, getInventoryEntityName };