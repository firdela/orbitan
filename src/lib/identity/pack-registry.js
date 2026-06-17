// ============================================================
// ORBITANOS — PACK REGISTRY (Module → Adapter Resolution)
// Maps every industry pack to its entity schemas, adapters,
// and UI configurations. This is the self-assembly blueprint.
//
// When you add a new industry pack, add ONE entry here.
// All generic UI modules (InventoryModule, WorkforceModule, etc.)
// read this registry to self-configure. No tenant-specific
// pages required.
//
// EXIT-READY: Pure JS config. Drop into any stack.
// ============================================================

import { INDUSTRY_PACKS } from '@/lib/orbitan-config';

/**
 * Module-to-adapter mapping per pack.
 *
 * Shape:
 *   {
 *     [moduleKey]: {
 *       entity:       'EntityName',       // Base44 entity to query
 *       adapter:      transformFunction,   // Raw → Universal shape
 *       component:    ReactComponent,      // UI renderer (lazy-loaded)
 *       label:        'Display Label',
 *       searchFields: ['field1', 'field2'], // Fields for in-module search
 *       sortField:    '-updated_date',
 *       statFields:   { total: 'current_stock', alert: 'par_level' },
 *     }
 *   }
 */

export const PACK_MODULE_REGISTRY = {

  fnb: {
    inventory: {
      entity: 'InventoryItem',
      label: 'Ingredient Inventory',
      searchFields: ['name', 'sku', 'category', 'supplier_name'],
      sortField: '-updated_date',
      statFields: { stockField: 'current_stock', alertField: 'par_level', valueField: 'cost_per_unit' },
    },
    procurement: {
      entity: 'PurchaseOrder',
      label: 'Purchase Orders',
      searchFields: ['po_number', 'supplier_name', 'status'],
      sortField: '-created_date',
      statFields: { totalField: 'total_amount', statusField: 'status' },
    },
    sales_invoice: {
      entity: 'SalesInvoice',
      label: 'Sales & Invoices',
      searchFields: ['invoice_number', 'customer_name', 'status'],
      sortField: '-invoice_date',
      statFields: { totalField: 'total_amount', statusField: 'status' },
    },
    reporting: {
      entity: null,
      label: 'Reports & Analytics',
      searchFields: [],
      sortField: null,
      statFields: {},
    },
    workforce: {
      entity: 'Employee',
      label: 'Workforce',
      searchFields: ['full_name', 'position', 'department'],
      sortField: '-created_date',
      statFields: { statusField: 'status' },
    },
    task: {
      entity: 'Task',
      label: 'Tasks',
      searchFields: ['title', 'status', 'assigned_to'],
      sortField: '-created_date',
      statFields: { statusField: 'status' },
    },
    compliance: {
      entity: 'ComplianceRecord',
      label: 'Compliance',
      searchFields: ['title', 'type', 'status'],
      sortField: '-due_date',
      statFields: { statusField: 'status', dateField: 'due_date' },
    },
    finance_integration: {
      entity: 'FinanceSyncQueue',
      label: 'Finance Sync',
      searchFields: ['queue_type', 'status', 'erp_reference_id'],
      sortField: '-created_date',
      statFields: { statusField: 'status' },
    },
    scheduling: {
      entity: 'Shift',
      label: 'Scheduling',
      searchFields: ['employee_name', 'date', 'status'],
      sortField: '-date',
      statFields: { statusField: 'status' },
    },
  },

  recycling: {
    inventory: {
      entity: 'MaterialCollection',
      label: 'Material Stock',
      searchFields: ['material_name', 'material_type', 'source_partner'],
      sortField: '-updated_date',
      statFields: { stockField: 'total_weight_kg', alertField: 'max_capacity_kg', valueField: 'market_rate_per_kg' },
    },
    procurement: {
      entity: 'PurchaseOrder',
      label: 'Procurement',
      searchFields: ['po_number', 'supplier_name', 'status'],
      sortField: '-created_date',
      statFields: { totalField: 'total_amount', statusField: 'status' },
    },
    compliance: {
      entity: 'ComplianceRecord',
      label: 'Compliance Centre',
      searchFields: ['title', 'type', 'status', 'category'],
      sortField: '-due_date',
      statFields: { statusField: 'status', dateField: 'due_date' },
    },
    reporting: {
      entity: null,
      label: 'Sustainability Reports',
      searchFields: [],
      sortField: null,
      statFields: {},
    },
    workforce: {
      entity: 'Employee',
      label: 'Workforce',
      searchFields: ['full_name', 'position', 'department'],
      sortField: '-created_date',
      statFields: { statusField: 'status' },
    },
    task: {
      entity: 'Task',
      label: 'Tasks',
      searchFields: ['title', 'status', 'assigned_to'],
      sortField: '-created_date',
      statFields: { statusField: 'status' },
    },
  },

  retail: {
    inventory: {
      entity: 'InventoryItem',
      label: 'Product Inventory',
      searchFields: ['name', 'sku', 'category', 'department'],
      sortField: '-updated_date',
      statFields: { stockField: 'current_stock', alertField: 'par_level', valueField: 'cost_per_unit' },
    },
    sales_invoice: {
      entity: 'SalesInvoice',
      label: 'Sales',
      searchFields: ['invoice_number', 'customer_name', 'status'],
      sortField: '-invoice_date',
      statFields: { totalField: 'total_amount', statusField: 'status' },
    },
    reporting: {
      entity: null,
      label: 'Reports & Impact',
      searchFields: [],
      sortField: null,
      statFields: {},
    },
    procurement: {
      entity: 'PurchaseOrder',
      label: 'Procurement',
      searchFields: ['po_number', 'supplier_name', 'status'],
      sortField: '-created_date',
      statFields: { totalField: 'total_amount', statusField: 'status' },
    },
    workforce: {
      entity: 'Employee',
      label: 'Workforce',
      searchFields: ['full_name', 'position', 'department'],
      sortField: '-created_date',
      statFields: { statusField: 'status' },
    },
    task: {
      entity: 'Task',
      label: 'Tasks',
      searchFields: ['title', 'status', 'assigned_to'],
      sortField: '-created_date',
      statFields: { statusField: 'status' },
    },
    customer_management: {
      entity: 'CustomerProfile',
      label: 'Customers',
      searchFields: ['full_name', 'email', 'phone', 'loyalty_tier'],
      sortField: '-last_purchase_date',
      statFields: { statusField: 'status' },
    },
  },
};

/**
 * Get the module configuration for a specific pack + module combination.
 */
export function resolveModuleConfig(packKey, moduleKey) {
  const pack = PACK_MODULE_REGISTRY[packKey];
  if (!pack) return null;
  return pack[moduleKey] || null;
}

/**
 * Get all available modules for a pack.
 */
export function getPackModules(packKey) {
  const pack = PACK_MODULE_REGISTRY[packKey];
  if (!pack) return [];
  return Object.keys(pack);
}

/**
 * Build the entity query filter for a module, injecting tenant/outlet context.
 */
export function buildModuleQuery(packKey, moduleKey, filters = {}) {
  const config = resolveModuleConfig(packKey, moduleKey);
  if (!config) return null;
  return {
    entity: config.entity,
    sortField: config.sortField,
    searchFields: config.searchFields,
    statFields: config.statFields,
    ...filters,
  };
}