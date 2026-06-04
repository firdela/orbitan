import { useState, createContext, useContext } from 'react';

const TenantContext = createContext(null);

export const DEMO_TENANTS = [
  {
    id: "tenant_taqueria",
    name: "Taqueria Pte Ltd",
    industry: "food_beverage",
    subscription_plan: "orbitan_business",
    status: "active",
    enabled_modules: ["inventory", "procurement", "sales_invoice", "workforce", "task", "compliance", "finance_integration", "scheduling", "reporting"],
    enabled_packs: ["fnb"],
    contact_email: "admin@taqueria.sg",
    max_employees: 250,
  },
  {
    id: "tenant_renewed",
    name: "Renewed Resources Pte Ltd",
    industry: "recycling_sustainability",
    subscription_plan: "orbitan_growth",
    status: "active",
    enabled_modules: ["inventory", "procurement", "compliance", "reporting", "workforce", "task"],
    enabled_packs: ["recycling"],
    contact_email: "hamka@renewedresources.sg",
    max_employees: 50,
  },
  {
    id: "tenant_retail",
    name: "Retail Operations Pte Ltd",
    industry: "retail",
    subscription_plan: "orbitan_growth",
    status: "active",
    enabled_modules: ["inventory", "sales_invoice", "reporting", "procurement", "workforce", "task", "customer_management"],
    enabled_packs: ["retail"],
    contact_email: "admin@retailops.sg",
    max_employees: 50,
  },
];

export function TenantProvider({ children }) {
  const [currentTenant, setCurrentTenant] = useState(DEMO_TENANTS[0]);
  const [currentRole, setCurrentRole] = useState('tenant_admin');

  return (
    <TenantContext.Provider value={{ currentTenant, setCurrentTenant, currentRole, setCurrentRole }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used within TenantProvider');
  return ctx;
}

export function hasModule(tenant, moduleKey) {
  if (!tenant) return false;
  if (tenant.enabled_modules?.includes('all')) return true;
  return tenant.enabled_modules?.includes(moduleKey) ?? false;
}