// ============================================================
// ORBITANOS — Tenant Context (Dynamic Workspace Resolver)
// EXIT-READY: Pure React context. No hardcoded tenant binding.
//
// TenantProvider resolves the active tenant DYNAMICALLY from the
// authenticated user's profile (user.tenant_id stamped by the
// OnboardingService). It fetches the Tenant record from the
// database at runtime — works for any future customer without
// code changes.
//
// DEMO_TENANTS is retained only as a fallback for pilot tenants
// not yet persisted to the database, and to power the tenant
// switcher in the platform console.
// ============================================================

import { useState, useEffect, createContext, useContext } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { LAUNCH_TENANTS } from '@/lib/orbitan-config';

// ── Canonical pilot roster (fallback + console switcher) ───
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
  const demo = DEMO_TENANTS.find(t => t.id === tenantId);
  if (demo) return demo.slug;
  return null;
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
  const { user, isAuthenticated, isLoadingAuth } = useAuth();

  // Resolve tenant_id from the authenticated user profile.
  // onboardingService stamps tenant_id onto the User record at provisioning.
  const userTenantId = user?.tenant_id || user?.data?.tenant_id || null;
  const userRole = user?.role || null;

  const [currentTenant, setCurrentTenant] = useState(null);
  const [currentRole, setCurrentRole] = useState(userRole || 'tenant_admin');
  const [isLoadingTenant, setIsLoadingTenant] = useState(false);

  // ── Dynamic resolution: fetch Tenant record from DB ──────
  useEffect(() => {
    if (isLoadingAuth) return;
    if (!isAuthenticated || !userTenantId) {
      // Anonymous or no tenant bound yet — leave null; RoleGateway
      // will route to onboarding / join flow.
      setCurrentTenant(null);
      return;
    }

    let cancelled = false;
    setIsLoadingTenant(true);

    base44.entities.Tenant.get(userTenantId)
      .then(record => {
        if (cancelled) return;
        if (record) {
          setCurrentTenant(record);
        } else {
          // Not in DB — fall back to pilot roster if matched
          const demo = DEMO_TENANTS.find(t => t.id === userTenantId);
          setCurrentTenant(demo || null);
        }
      })
      .catch(() => {
        if (cancelled) return;
        const demo = DEMO_TENANTS.find(t => t.id === userTenantId);
        setCurrentTenant(demo || null);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingTenant(false);
      });

    return () => { cancelled = true; };
  }, [isAuthenticated, isLoadingAuth, userTenantId]);

  // Keep role in sync with auth profile
  useEffect(() => {
    if (userRole) setCurrentRole(userRole);
  }, [userRole]);

  // ── Manual switcher (console / pilot navigation) ───────
  const switchTenant = (slugOrId) => {
    const found = DEMO_TENANTS.find(
      t => t.slug === slugOrId || t.id === slugOrId
    );
    if (found) setCurrentTenant(found);
  };

  // Resolve the dashboard path for the currently active tenant.
  // Dynamic resolver: /workspace/:tenantId/dashboard
  const dashboardPath = currentTenant
    ? `/workspace/${currentTenant.id || currentTenant.slug}/dashboard`
    : '/workspace';

  return (
    <TenantContext.Provider value={{
      currentTenant,
      setCurrentTenant,
      switchTenant,
      currentRole,
      setCurrentRole,
      dashboardPath,
      isLoadingTenant,
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