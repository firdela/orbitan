// ============================================================
// ORBITAN ENGINE — Centralised Tenant Configuration Resolver
// Created by Muhammad Firdaus Bin Ismail
// © 2024–2026 Orbitan & OrbitanOS. All Rights Reserved.
//
// EXIT-READY: This is a pure JS service layer. It reads from
// orbitan-config.js and exposes resolved configuration to the
// UI. Zero Base44 dependency. Drop it into any stack.
// ============================================================

import {
  SUBSCRIPTION_PLANS,
  MODULES,
  INDUSTRY_PACKS,
  OPERATING_CYCLE,
  LAUNCH_TENANTS,
  resolveTenantConfig,
  planAllowsModule,
} from './orbitan-config.js';

import {
  MODULE_REGISTRY,
  TENANT_NAV_MANIFESTS,
} from './orbitan-nav.js';

/**
 * OrbitanEngine — The single service the UI calls to get
 * everything it needs to self-configure for a given tenant.
 *
 * Usage:
 *   const engine = OrbitanEngine.for(tenantRecord);
 *   engine.canAccess('inventory')   → true/false
 *   engine.navigation()             → sidebar nav items
 *   engine.packBadges()             → badge array for UI
 */
export class OrbitanEngine {

  constructor(tenant) {
    this._tenant = tenant;
    this._config = resolveTenantConfig(tenant);
  }

  static for(tenant) {
    return new OrbitanEngine(tenant);
  }

  // ── Access Control ──────────────────────────────────────

  canAccess(moduleKey) {
    return this._config?.canAccessModule(moduleKey) ?? false;
  }

  canAccessPack(packKey) {
    return this._config?.canAccessPack(packKey) ?? false;
  }

  get plan() {
    return this._config?.plan ?? SUBSCRIPTION_PLANS.orbitan_starter;
  }

  get isEnterprise() {
    return this._config?.isEnterprise ?? false;
  }

  // ── Resolved Data ────────────────────────────────────────

  get modules() {
    return this._config?.resolvedModules ?? [];
  }

  get packs() {
    return this._config?.resolvedPacks ?? [];
  }

  get primaryColor() {
    return this._config?.primaryPackColor() ?? "#2563EB";
  }

  // ── Navigation Builder ───────────────────────────────────
  // Builds a fully-resolved nav array for AppShell.
  // Consumes TENANT_NAV_MANIFESTS from orbitan-nav.js.
  //
  // tenantSlug: 't1' | 't2' | 't3' (or future tenants)
  // iconMap: { iconKey: ReactComponent } — passed from the page
  //          so the engine stays framework-agnostic.

  buildNav(tenantSlug, iconMap = {}) {
    const manifest = TENANT_NAV_MANIFESTS[tenantSlug];
    if (!manifest) return [];

    return manifest
      .filter(item => {
        // Always include section headers and raw links
        if (item.type === 'section' || item.type === 'link') return true;
        // Module items: filter by tenant access
        return this.canAccess(item.module);
      })
      .map(item => {
        // Section headers pass through unchanged
        if (item.type === 'section') return item;

        // Raw links (e.g. ← Platform Console)
        if (item.type === 'link') {
          return {
            href: item.href,
            label: item.label,
            icon: iconMap[item.iconKey] || null,
          };
        }

        // Module items — resolve label, icon, and prefixed href
        const reg = MODULE_REGISTRY[item.module] || {};
        return {
          href: `/${tenantSlug}${item.path}`,
          label: reg.label || item.module,
          icon: iconMap[reg.iconKey] || null,
        };
      });
  }

  // Legacy: accepts an already-built nav config array (backwards compat)
  navigation(navConfig) {
    if (!navConfig) return [];
    return navConfig
      .filter(item => {
        if (!item.module) return true;
        return this.canAccess(item.module);
      })
      .map(item => ({
        ...item,
        locked: item.module ? !this.canAccess(item.module) : false,
      }));
  }

  // ── Pack Badges ──────────────────────────────────────────
  // Returns badge data for the multi-pack Enterprise UI.

  packBadges() {
    return (this._tenant?.enabled_packs || []).map(packKey => {
      const pack = INDUSTRY_PACKS[packKey];
      if (!pack) {
        // Handle non-industry packs (core, finance, ai, compliance)
        const META = {
          core:       { label: "Core",       color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
          finance:    { label: "Finance",     color: "#0F172A", bg: "#F8FAFC", border: "#CBD5E1" },
          ai:         { label: "AI Suite",    color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
          compliance: { label: "Compliance",  color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
        };
        return META[packKey] ? { key: packKey, ...META[packKey] } : null;
      }
      return {
        key: packKey,
        label: pack.badge_label,
        color: pack.color_hex,
        bg: pack.color_hex + "15",
        border: pack.color_hex + "40",
      };
    }).filter(Boolean);
  }

  // ── Subscription Gate ────────────────────────────────────
  // Used by SubscriptionGate component to check access.

  gate(moduleKey, packKey) {
    if (moduleKey) return this.canAccess(moduleKey);
    if (packKey) return this.canAccessPack(packKey);
    return true;
  }

  // ── Operating Cycle Map ──────────────────────────────────
  // Returns module list grouped by the 6R principles.

  cycleMap() {
    const map = {};
    Object.values(OPERATING_CYCLE).forEach(cycle => {
      map[cycle.key] = {
        ...cycle,
        modules: Object.values(MODULES).filter(m => m.principle === cycle.key),
      };
    });
    return map;
  }

  // ── Tenant Summary ───────────────────────────────────────

  summary() {
    return {
      name: this._tenant?.name,
      plan: this.plan.name,
      planColor: this.plan.color_hex,
      planGradient: this.plan.gradient,
      isEnterprise: this.isEnterprise,
      moduleCount: this.modules.length,
      packCount: this.packs.length,
      employeeLimit: this.plan.max_employees ?? "Unlimited",
      badges: this.packBadges(),
    };
  }
}

// ── Static Helpers (no tenant context needed) ──────────────

export function getAllPacks() {
  return Object.values(INDUSTRY_PACKS);
}

export function getActivePacks() {
  return Object.values(INDUSTRY_PACKS).filter(p => p.launch_tenants.length > 0);
}

export function getFuturePacks() {
  return Object.values(INDUSTRY_PACKS).filter(p => p.launch_tenants.length === 0);
}

export function getPackByIndustry(industry) {
  return Object.values(INDUSTRY_PACKS).find(p => p.industry === industry) || null;
}

export { SUBSCRIPTION_PLANS, MODULES, INDUSTRY_PACKS, OPERATING_CYCLE, LAUNCH_TENANTS, planAllowsModule };