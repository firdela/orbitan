// ============================================================
// ORBITANOS — Unified Navigation Manifest
// Created by Muhammad Firdaus Bin Ismail
// © 2024–2026 Orbitan & OrbitanOS. All Rights Reserved.
//
// EXIT-READY: Pure JS data structure. Zero framework dependency.
// To migrate to a new stack, copy this file and write one small
// adapter that maps module keys to your new router's link format.
// ============================================================

/**
 * MODULE_REGISTRY
 * Single source of truth for all navigable modules.
 * Keys match the `enabled_modules` field on the Tenant entity.
 */
export const MODULE_REGISTRY = {
  // Core operations
  dashboard:   { label: 'Dashboard',         iconKey: 'Home' },
  inventory:   { label: 'Inventory',          iconKey: 'Package' },
  procurement: { label: 'Procurement',        iconKey: 'ShoppingCart' },
  sales:       { label: 'Sales & Invoicing',  iconKey: 'FileText' },
  recipes:     { label: 'Recipes',            iconKey: 'ChefHat' },
  scheduling:  { label: 'Scheduling',         iconKey: 'Calendar' },

  // Recycling & Sustainability Pack
  collections: { label: 'Collections',        iconKey: 'Recycle' },

  // Retail Pack
  catalog:     { label: 'Product Catalog',    iconKey: 'Shirt' },
  customers:   { label: 'Customers',          iconKey: 'Heart' },

  // People & Tasks
  workforce:   { label: 'Workforce',          iconKey: 'Users' },
  staff_directory: { label: 'Staff Directory', iconKey: 'Contact' },
  tasks:       { label: 'Tasks',              iconKey: 'CheckSquare' },
  clockin:     { label: 'Clock In/Out',       iconKey: 'Clock' },
  replenishment: { label: 'Replenishment',    iconKey: 'AlertTriangle' },

  // Governance
  compliance:  { label: 'Compliance',         iconKey: 'Shield' },
  reporting:   { label: 'Reporting',          iconKey: 'BarChart2' },
  xero:        { label: 'Xero Integration',   iconKey: 'Link2' },

  // AI Suite
  ai_studio:   { label: 'AI Studio',          iconKey: 'Bot' },
};

// NOTE: The legacy TENANT_NAV_MANIFESTS + NAV_SECTIONS exports were removed
// in Build #27. The live navigation is DB-driven via ManifestHydrator
// (PlatformManifest + SubscriptionPolicy → /workspace/:tenantId/* routes).
// MODULE_REGISTRY is retained as pure module-label/icon metadata.