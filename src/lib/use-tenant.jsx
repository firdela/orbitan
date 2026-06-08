// ============================================================
// ORBITANOS — Tenant Context
// EXIT-READY: Pure React context. No Base44 dependency.
// TenantProvider wraps the app and exposes the active tenant,
// role, and a switcher. Swap DEMO_TENANTS for a real API call
// on any stack.
// ============================================================

import { useState, createContext, useContext } from 'react';
import { LAUNCH_TENANTS } from '@/lib/orbitan-config';

// ── Canonical tenant roster (sourced from LAUNCH_TENANTS DNA) ─
export const DEMO_TENANTS = [
  {
    id: "tenant_taqueria",
    name: LAUNCH_TENANTS.taqueria.name,
    legal_name: LAUNCH_TENANTS.taqueria.legal_name,
    industry: LAUNCH_TENANTS.taqueria.industry,
    subscription_plan: LAUNCH_TENANTS.taqueria.plan,
    status: LAUNCH_TENANTS.taqueria.status,
    enabled_modules: LAUNCH_TENANTS.taqueria.enabled_modules,
    enabled_packs: LAUNCH_TENANTS.taqueria.enabled_packs,
    contact_email: "admin@taqueria.sg",
    max_employees: null,
    // Dynamic Launchpad: slug drives tenant-specific routing
    slug: "t1",
    base_path: "/t1",
    brand: LAUNCH_TENANTS.taqueria.brands[0],
    outlet: LAUNCH_TENANTS.taqueria.outlets[0],
    country: LAUNCH_TENANTS.taqueria.country,
    currency: LAUNCH_TENANTS.taqueria.currency,
  },
  {
    id: "tenant_renewed",
    name: LAUNCH_TENANTS.renewed_resources.name,
    legal_name: LAUNCH_TENANTS.renewed_resources.legal_name,
    industry: LAUNCH_TENANTS.renewed_resources.industry,
    subscription_plan: LAUNCH_TENANTS.renewed_resources.plan,
    status: LAUNCH_TENANTS.renewed_resources.status,
    enabled_modules: LAUNCH_TENANTS.renewed_resources.enabled_modules,
    enabled_packs: LAUNCH_TENANTS.renewed_resources.enabled_packs,
    contact_email: "hamka@renewedresources.sg",
    max_employees: 250,
    slug: "t2",
    base_path: "/t2",
    brand: LAUNCH_TENANTS.renewed_resources.brands[0],
    outlet: null,
    country: LAUNCH_TENANTS.renewed_resources.country,
    currency: LAUNCH_TENANTS.renewed_resources.currency,
  },
  {
    id: "tenant_retail",
    name: LAUNCH_TENANTS.renewed_fashion.name,
    legal_name: LAUNCH_TENANTS.renewed_fashion.legal_name,
    industry: LAUNCH_TENANTS.renewed_fashion.industry,
    subscription_plan: LAUNCH_TENANTS.renewed_fashion.plan,
    status: LAUNCH_TENANTS.renewed_fashion.status,
    enabled_modules: LAUNCH_TENANTS.renewed_fashion.enabled_modules,
    enabled_packs: LAUNCH_TENANTS.renewed_fashion.enabled_packs,
    contact_email: "admin@renewedfashion.sg",
    max_employees: 250,
    slug: "t3",
    base_path: "/t3",
    brand: LAUNCH_TENANTS.renewed_fashion.brands[0],
    outlet: null,
    country: LAUNCH_TENANTS.renewed_fashion.country,
    currency: LAUNCH_TENANTS.renewed_fashion.currency,
  },
  {
    id: "tenant_izaliqa",
    name: LAUNCH_TENANTS.izaliqa_bakes.name,
    legal_name: LAUNCH_TENANTS.izaliqa_bakes.legal_name,
    industry: LAUNCH_TENANTS.izaliqa_bakes.industry,
    subscription_plan: LAUNCH_TENANTS.izaliqa_bakes.plan,
    status: LAUNCH_TENANTS.izaliqa_bakes.status,
    enabled_modules: LAUNCH_TENANTS.izaliqa_bakes.enabled_modules,
    enabled_packs: LAUNCH_TENANTS.izaliqa_bakes.enabled_packs,
    contact_email: "hello@izaliqabakes.sg",
    max_employees: 10,
    slug: "t4",
    base_path: "/t4",
    brand: LAUNCH_TENANTS.izaliqa_bakes.brands[0],
    outlet: LAUNCH_TENANTS.izaliqa_bakes.outlets[0],
    country: LAUNCH_TENANTS.izaliqa_bakes.country,
    currency: LAUNCH_TENANTS.izaliqa_bakes.currency,
  },
];

// ── Tenant ID → slug resolver (exit-ready utility) ────────────
export function getTenantSlug(tenantId) {
  return DEMO_TENANTS.find(t => t.id === tenantId)?.slug || null;
}

// ── Module guard (exit-ready utility) ─────────────────────────
export function hasModule(tenant, moduleKey) {
  if (!tenant) return false;
  if (tenant.enabled_modules?.includes('all')) return true;
  return tenant.enabled_modules?.includes(moduleKey) ?? false;
}

// ── Context ───────────────────────────────────────────────────
const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const [currentTenant, setCurrentTenant] = useState(DEMO_TENANTS[0]);
  const [currentRole, setCurrentRole] = useState('tenant_admin');

  // Dynamic launchpad: switch tenant by slug or ID
  const switchTenant = (slugOrId) => {
    const found = DEMO_TENANTS.find(
      t => t.slug === slugOrId || t.id === slugOrId
    );
    if (found) setCurrentTenant(found);
  };

  // Resolve the dashboard path for the currently active tenant
  const dashboardPath = `${currentTenant.base_path}/dashboard`;

  return (
    <TenantContext.Provider value={{
      currentTenant,
      setCurrentTenant,
      switchTenant,
      currentRole,
      setCurrentRole,
      dashboardPath,
      allTenants: DEMO_TENANTS,
    }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used within TenantProvider');
  return ctx;
}