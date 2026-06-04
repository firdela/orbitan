/**
 * OrbitanOS — Subscription Plan & Feature Gating Library
 * Exit-Ready: Pure JS — no platform dependencies. Portable to any stack.
 * 
 * Defines which modules and packs are available per subscription tier.
 * All access checks are pure functions that receive a tenant object.
 */

export const PLAN_HIERARCHY = {
  orbitan_starter:    1,
  orbitan_growth:     2,
  orbitan_business:   3,
  orbitan_enterprise: 4,
};

// Modules available per plan tier (cumulative)
export const PLAN_MODULE_ACCESS = {
  orbitan_starter: [
    'workforce', 'scheduling', 'tasks', 'clock',
  ],
  orbitan_growth: [
    'workforce', 'scheduling', 'tasks', 'clock',
    'inventory', 'procurement', 'compliance', 'reporting',
  ],
  orbitan_business: [
    'workforce', 'scheduling', 'tasks', 'clock',
    'inventory', 'procurement', 'compliance', 'reporting',
    'sales_invoice', 'finance_xero', 'ai_suite', 'customer_management',
  ],
  orbitan_enterprise: ['*'], // All modules
};

// Packs available per plan tier
export const PLAN_PACK_ACCESS = {
  orbitan_starter:    ['core'],
  orbitan_growth:     ['core', 'fnb', 'retail', 'recycling'],
  orbitan_business:   ['core', 'fnb', 'retail', 'recycling', 'healthcare', 'education', 'logistics'],
  orbitan_enterprise: ['*'], // All packs
};

export const PLAN_EMPLOYEE_LIMITS = {
  orbitan_starter:    10,
  orbitan_growth:     50,
  orbitan_business:   250,
  orbitan_enterprise: Infinity,
};

export const PLAN_LABELS = {
  orbitan_starter:    'Starter',
  orbitan_growth:     'Growth',
  orbitan_business:   'Business',
  orbitan_enterprise: 'Enterprise',
};

/**
 * Check if a tenant has access to a specific module.
 * @param {object} tenant - Tenant entity record
 * @param {string} moduleKey - Module key to check
 * @returns {boolean}
 */
export function hasModuleAccess(tenant, moduleKey) {
  if (!tenant) return false;
  const plan = tenant.subscription_plan || 'orbitan_starter';

  // Check plan-level access
  const planModules = PLAN_MODULE_ACCESS[plan] || [];
  if (planModules.includes('*')) return true;
  if (!planModules.includes(moduleKey)) return false;

  // Check tenant-level enabled_modules override
  if (tenant.enabled_modules && tenant.enabled_modules.length > 0) {
    return tenant.enabled_modules.includes(moduleKey);
  }

  return true;
}

/**
 * Check if a tenant has access to a specific industry pack.
 * @param {object} tenant - Tenant entity record
 * @param {string} packKey - Pack key to check
 * @returns {boolean}
 */
export function hasPackAccess(tenant, packKey) {
  if (!tenant) return false;
  const plan = tenant.subscription_plan || 'orbitan_starter';

  const planPacks = PLAN_PACK_ACCESS[plan] || [];
  if (planPacks.includes('*')) return true;
  if (!planPacks.includes(packKey)) return false;

  if (tenant.enabled_packs && tenant.enabled_packs.length > 0) {
    return tenant.enabled_packs.includes(packKey);
  }

  return true;
}

/**
 * Check if a tenant's plan is at or above a minimum required tier.
 * @param {object} tenant - Tenant entity record
 * @param {string} minimumPlan - Minimum required plan key
 * @returns {boolean}
 */
export function meetsMinimumPlan(tenant, minimumPlan) {
  if (!tenant) return false;
  const tenantTier = PLAN_HIERARCHY[tenant.subscription_plan] || 0;
  const requiredTier = PLAN_HIERARCHY[minimumPlan] || 0;
  return tenantTier >= requiredTier;
}

/**
 * Get the employee limit for a tenant's plan.
 * @param {object} tenant - Tenant entity record
 * @returns {number}
 */
export function getEmployeeLimit(tenant) {
  if (!tenant) return 0;
  if (tenant.max_employees) return tenant.max_employees;
  return PLAN_EMPLOYEE_LIMITS[tenant.subscription_plan] || 10;
}

/**
 * Get all active packs for a tenant (intersection of plan + enabled_packs).
 * @param {object} tenant - Tenant entity record
 * @returns {string[]}
 */
export function getActivePacks(tenant) {
  if (!tenant) return ['core'];
  const plan = tenant.subscription_plan || 'orbitan_starter';
  const planPacks = PLAN_PACK_ACCESS[plan] || ['core'];

  if (planPacks.includes('*')) {
    return tenant.enabled_packs && tenant.enabled_packs.length > 0
      ? tenant.enabled_packs
      : ['core'];
  }

  if (tenant.enabled_packs && tenant.enabled_packs.length > 0) {
    return tenant.enabled_packs.filter(p => planPacks.includes(p));
  }

  return planPacks;
}

/**
 * Is this tenant on an Enterprise plan?
 * @param {object} tenant - Tenant entity record
 * @returns {boolean}
 */
export function isEnterprise(tenant) {
  return tenant?.subscription_plan === 'orbitan_enterprise';
}