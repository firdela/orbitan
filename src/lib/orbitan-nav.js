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
  scheduling:  { label: 'Scheduling',         iconKey: 'Calendar' },

  // Recycling & Sustainability Pack
  collections: { label: 'Collections',        iconKey: 'Recycle' },

  // Retail Pack
  catalog:     { label: 'Product Catalog',    iconKey: 'Shirt' },
  customers:   { label: 'Customers',          iconKey: 'Heart' },

  // People & Tasks
  workforce:   { label: 'Workforce',          iconKey: 'Users' },
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

/**
 * NAV_SECTIONS
 * Reusable section header definitions.
 */
export const NAV_SECTIONS = {
  fnb:            { type: 'section', label: 'F&B Operations' },
  sustainability: { type: 'section', label: 'Sustainability Ops' },
  retail:         { type: 'section', label: 'Retail Ops' },
  people:         { type: 'section', label: 'People & Tasks' },
  governance:     { type: 'section', label: 'Governance' },
  platform:       { type: 'section', label: 'Platform' },
};

/**
 * TENANT_NAV_MANIFESTS
 * Per-tenant navigation blueprints.
 * Each entry defines the ordered list of nav items for that tenant.
 *
 * Schema per item:
 *   { module: string }           → resolves from MODULE_REGISTRY
 *   { type: 'section', label }   → section header (no access gate)
 *   { type: 'link', href, label, iconKey } → raw link (no gate)
 *
 * The OrbitanEngine.buildNav() method:
 *   1. Resolves label + iconKey from MODULE_REGISTRY for module items
 *   2. Prefixes href with the tenant's base path (e.g. /t1, /t2, /t3)
 *   3. Filters items the tenant's plan/modules do not permit
 */
export const TENANT_NAV_MANIFESTS = {

  // ── Tenant 1: Taqueria Pte Ltd (F&B Pack) ──────────────────
  t1: [
    NAV_SECTIONS.fnb,
    { module: 'dashboard',     path: '/dashboard' },
    { module: 'inventory',     path: '/inventory' },
    { module: 'procurement',   path: '/procurement' },
    { module: 'sales',         path: '/sales' },
    { module: 'scheduling',    path: '/scheduling' },
    { module: 'replenishment', path: '/replenishment' },
    NAV_SECTIONS.people,
    { module: 'workforce',     path: '/workforce' },
    { module: 'clockin',       path: '/clockin' },
    { module: 'tasks',         path: '/tasks' },
    NAV_SECTIONS.governance,
    { module: 'compliance',    path: '/compliance' },
    { module: 'reporting',     path: '/reporting' },
    { module: 'xero',          path: '/xero' },
    NAV_SECTIONS.platform,
    { type: 'link', href: '/t1/ai-studio', label: 'AI Studio', iconKey: 'Bot' },
    { type: 'link', href: '/leader-org', label: '← Platform Console', iconKey: 'BarChart2' },
  ],

  // ── Tenant 2: Renewed Resources Pte Ltd (Recycling Pack) ───
  t2: [
    NAV_SECTIONS.sustainability,
    { module: 'dashboard',     path: '/dashboard' },
    { module: 'collections',   path: '/collections' },
    { module: 'inventory',     path: '/inventory' },
    { module: 'procurement',   path: '/procurement' },
    NAV_SECTIONS.people,
    { module: 'workforce',     path: '/workforce' },
    { module: 'tasks',         path: '/tasks' },
    NAV_SECTIONS.governance,
    { module: 'compliance',    path: '/compliance' },
    { module: 'reporting',     path: '/reporting' },
    NAV_SECTIONS.platform,
    { type: 'link', href: '/t2/ai-studio', label: 'AI Studio', iconKey: 'Bot' },
    { type: 'link', href: '/leader-org', label: '← Platform Console', iconKey: 'BarChart2' },
  ],

  // ── Tenant 3: Retail Operations (Retail Pack) ──────────────
  t3: [
    NAV_SECTIONS.retail,
    { module: 'dashboard',     path: '/dashboard' },
    { module: 'catalog',       path: '/catalog' },
    { module: 'inventory',     path: '/inventory' },
    { module: 'sales',         path: '/sales' },
    { module: 'customers',     path: '/customers' },
    NAV_SECTIONS.people,
    { module: 'workforce',     path: '/workforce' },
    { module: 'tasks',         path: '/tasks' },
    NAV_SECTIONS.governance,
    { module: 'reporting',     path: '/reporting' },
    NAV_SECTIONS.platform,
    { type: 'link', href: '/t3/ai-studio', label: 'AI Studio', iconKey: 'Bot' },
    { type: 'link', href: '/leader-org', label: '← Platform Console', iconKey: 'BarChart2' },
  ],
};