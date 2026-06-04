import { useState, createContext, useContext } from 'react';

const TenantContext = createContext(null);

export const DEMO_TENANTS = [
  {
    id: "tenant_taqueria",
    name: "Taqueria Pte Ltd",
    legal_name: "Taqueria Pte Ltd",
    industry: "food_beverage",
    subscription_plan: "orbitan_enterprise",
    status: "active",
    enabled_modules: ["inventory", "procurement", "sales_invoice", "workforce", "task", "compliance", "finance_integration", "scheduling", "reporting"],
    enabled_packs: ["core", "fnb", "finance", "compliance"],
    contact_email: "admin@taqueria.sg",
    max_employees: null,
  },
  {
    id: "tenant_renewed",
    name: "Renewed Resources Pte Ltd",
    legal_name: "Renewed Resources Pte Ltd",
    industry: "recycling_sustainability",
    subscription_plan: "orbitan_business",
    status: "active",
    enabled_modules: ["inventory", "procurement", "compliance", "reporting", "workforce", "task"],
    enabled_packs: ["core", "recycling", "compliance"],
    contact_email: "hamka@renewedresources.sg",
    max_employees: 250,
  },
  {
    id: "tenant_retail",
    name: "Renewed Fashion",
    legal_name: "Renewed Fashion Pte Ltd",
    industry: "retail",
    subscription_plan: "orbitan_business",
    status: "active",
    enabled_modules: ["inventory", "sales_invoice", "reporting", "procurement", "workforce", "task", "customer_management"],
    enabled_packs: ["core", "retail"],
    contact_email: "admin@renewedfashion.sg",
    max_employees: 250,
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