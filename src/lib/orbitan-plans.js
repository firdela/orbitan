// ============================================================
// ORBITAN PLANS — Subscription Gate Utilities
// Backwards-compatible re-export from the Master DNA file.
// All logic now lives in orbitan-config.js & orbitan-engine.js
// ============================================================

import { SUBSCRIPTION_PLANS } from './orbitan-config.js';

export {
  SUBSCRIPTION_PLANS,
  MODULES,
  INDUSTRY_PACKS,
  INDUSTRY_LABELS,
  ROLE_ROUTES,
  resolveTenantConfig,
  planAllowsModule,
  planAllowsPack,
} from './orbitan-config.js';

/**
 * Legacy helper — checks if a tenant has module access.
 */
export function hasModuleAccess(tenant, moduleKey) {
  if (!tenant) return false;
  const planConfig = SUBSCRIPTION_PLANS[tenant.subscription_plan];
  if (!planConfig) return false;
  if (planConfig.allowed_modules.includes("all")) return true;
  if (tenant.feature_flags?.[moduleKey] === true) return true;
  if (tenant.feature_flags?.[moduleKey] === false) return false;
  return (tenant.enabled_modules || []).includes(moduleKey);
}

/**
 * Legacy helper — checks if a tenant has pack access.
 */
export function hasPackAccess(tenant, packKey) {
  if (!tenant) return false;
  const planConfig = SUBSCRIPTION_PLANS[tenant.subscription_plan];
  if (!planConfig) return false;
  if (planConfig.allowed_packs.includes("all")) return true;
  return (tenant.enabled_packs || []).includes(packKey);
}

/**
 * Returns employee limit for a tenant.
 */
export function getEmployeeLimit(tenant) {
  const plan = SUBSCRIPTION_PLANS[tenant?.subscription_plan];
  if (!plan) return 10;
  if (plan.max_employees === null) return Infinity;
  return plan.max_employees;
}

/**
 * Legacy — checks if tenant meets a minimum plan tier.
 */
export function meetsMinimumPlan(tenant, minPlanKey) {
  if (!tenant) return false;
  const current = SUBSCRIPTION_PLANS[tenant.subscription_plan];
  const required = SUBSCRIPTION_PLANS[minPlanKey];
  if (!current || !required) return false;
  return current.tier_level >= required.tier_level;
}