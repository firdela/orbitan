// ============================================================
// ORBITAN — SUBSCRIPTION CAPABILITY REGISTRY (Monetization DNA)
// Created by Muhammad Firdaus Bin Ismail
// © 2024–2026 Orbitan & OrbitanOS. All Rights Reserved.
//
// EXIT-READY ARCHITECTURE:
// Pure data — zero framework dependencies.
// This registry is the single source of truth for:
//   1. Plan-tier definitions & pricing
//   2. Feature-to-plan mapping with credit costs
//   3. Module gating & pack availability
//   4. Consumption-based credit burn rates
//
// Product Owners adjust pricing/access here. Nothing else.
// All other files (subscriptionGate, walletEngine, UI) read from here.
//
// Migrating stacks: copy this file, rebuild evaluators.
// Adding a new plan: add one object to SUBSCRIPTION_CAPABILITIES.
// ============================================================

// ============================================================
// PLAN TIERS — Pricing & Limits
// ============================================================
export const PLAN_TIERS = {
  orbitan_starter: {
    key: "orbitan_starter",
    name: "Orbitan Starter",
    price_sgd: 49,
    price_label: "S$49/month",
    max_employees: 10,
    max_outlets: 1,
    max_brands: 1,
    tier_level: 1,
    gradient: "linear-gradient(135deg, #3B82F6, #1D4ED8)",
    color_hex: "#2563EB",
    monthly_credits: 100,
    credit_rollover: false,
    ai_access: false,
    advanced_reporting: false,
    integrations: false,
    shield_mode: "auditor",    // auditor | guardian
    description: "For small businesses, single outlet",
    suitable_for: ["Home-Based Businesses", "Single Outlet", "Startups"],
    limits: {
      modules: 4,
      packs: 1,
      employees: 10,
      outlets: 1,
      brands: 1,
    },
  },
  orbitan_growth: {
    key: "orbitan_growth",
    name: "Orbitan Growth",
    price_sgd: 149,
    price_label: "S$149/month",
    max_employees: 50,
    max_outlets: 5,
    max_brands: 2,
    tier_level: 2,
    gradient: "linear-gradient(135deg, #34D399, #059669)",
    color_hex: "#10B981",
    monthly_credits: 500,
    credit_rollover: true,
    ai_access: false,
    advanced_reporting: false,
    integrations: false,
    shield_mode: "auditor",
    description: "For growing businesses, multiple outlets",
    suitable_for: ["Growing SMEs", "Multi-Outlet", "Multi-Team"],
    limits: {
      modules: 7,
      packs: 1,
      employees: 50,
      outlets: 5,
      brands: 2,
    },
  },
  orbitan_business: {
    key: "orbitan_business",
    name: "Orbitan Business",
    price_sgd: 399,
    price_label: "S$399/month",
    max_employees: 250,
    max_outlets: 20,
    max_brands: 5,
    tier_level: 3,
    gradient: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
    color_hex: "#7C3AED",
    monthly_credits: 2000,
    credit_rollover: true,
    ai_access: true,
    advanced_reporting: true,
    integrations: true,
    shield_mode: "auditor",
    description: "For established organisations, multi-site",
    suitable_for: ["Established Organisations", "Multi-Brand", "Regional Operations"],
    limits: {
      modules: 10,
      packs: 3,
      employees: 250,
      outlets: 20,
      brands: 5,
    },
  },
  orbitan_enterprise: {
    key: "orbitan_enterprise",
    name: "Orbitan Enterprise",
    price_sgd: null,
    price_label: "Custom Pricing",
    max_employees: null,
    max_outlets: null,
    max_brands: null,
    tier_level: 4,
    gradient: "linear-gradient(135deg, #374151, #111827)",
    color_hex: "#111827",
    accent_hex: "#D4AF37",
    monthly_credits: null,      // unlimited
    credit_rollover: true,
    ai_access: true,
    advanced_reporting: true,
    integrations: true,
    shield_mode: "guardian",    // enterprise gets hard-block governance
    description: "Custom pricing — large organisations",
    suitable_for: ["Enterprises", "Holding Companies", "Global Operations"],
    limits: {
      modules: null,            // unlimited
      packs: null,
      employees: null,
      outlets: null,
      brands: null,
    },
  },
};

// ============================================================
// FEATURE CAPABILITY MAP — Every feature → plan + credit cost
// ============================================================
export const FEATURE_CAPABILITIES = {
  // ── Core Modules ────────────────────────────────────
  workforce: {
    key: "workforce",
    name: "Workforce Module",
    icon: "Users",
    principle: "relate",
    description: "Employee management, roles & departments",
    required_plan_tier: 1,
    credit_cost_per_action: 0,
    credit_cost_description: null,
    locked_message: {
      orbitan_starter: null,  // included
    },
  },
  task: {
    key: "task",
    name: "Task Module",
    icon: "CheckSquare",
    principle: "respond",
    description: "Task assignment and completion tracking",
    required_plan_tier: 1,
    credit_cost_per_action: 0,
    credit_cost_description: null,
  },
  reporting: {
    key: "reporting",
    name: "Reporting Module",
    icon: "BarChart2",
    principle: "refine",
    description: "Analytics and performance dashboards",
    required_plan_tier: 1,
    credit_cost_per_action: 0,
    credit_cost_description: null,
  },

  // ── Growth Modules — Tier 2+ ─────────────────────────
  inventory: {
    key: "inventory",
    name: "Inventory Module",
    icon: "Package",
    principle: "renew",
    description: "Stock management and replenishment",
    required_plan_tier: 1,      // available from Starter
    credit_cost_per_action: 0,
    credit_cost_description: null,
  },
  scheduling: {
    key: "scheduling",
    name: "Scheduling Module",
    icon: "Calendar",
    principle: "relate",
    description: "Shift scheduling and attendance tracking",
    required_plan_tier: 2,      // Growth+
    credit_cost_per_action: 0,
    credit_cost_description: null,
    locked_message: {
      orbitan_starter: "Scheduling requires Orbitan Growth (S$149/mo). Create and assign shift schedules.",
    },
    upgrade_plan: "orbitan_growth",
  },
  training: {
    key: "training",
    name: "Training Module",
    icon: "BookOpen",
    principle: "renew",
    description: "Staff training and certifications",
    required_plan_tier: 2,
    credit_cost_per_action: 0,
    credit_cost_description: null,
    locked_message: {
      orbitan_starter: "Training requires Orbitan Growth (S$149/mo). Assign courses and track certifications.",
    },
    upgrade_plan: "orbitan_growth",
  },
  knowledge: {
    key: "knowledge",
    name: "Knowledge Module",
    icon: "Archive",
    principle: "renew",
    description: "SOPs and knowledge base",
    required_plan_tier: 2,
    credit_cost_per_action: 0,
    credit_cost_description: null,
    locked_message: {
      orbitan_starter: "Knowledge requires Orbitan Growth (S$149/mo). Document SOPs and build your knowledge base.",
    },
    upgrade_plan: "orbitan_growth",
  },
  customer_management: {
    key: "customer_management",
    name: "Customer Management",
    icon: "UserCheck",
    principle: "relate",
    description: "Customer profiles and purchase history",
    required_plan_tier: 1,
    credit_cost_per_action: 0,
    credit_cost_description: null,
  },

  // ── Business Modules — Tier 3+ ────────────────────────
  procurement: {
    key: "procurement",
    name: "Procurement Module",
    icon: "ShoppingCart",
    principle: "respond",
    description: "Purchase orders and supplier management",
    required_plan_tier: 3,      // Business+
    credit_cost_per_action: 0,
    credit_cost_description: null,
    locked_message: {
      orbitan_starter: "Procurement requires Orbitan Business (S$399/mo). Manage suppliers and purchase orders.",
      orbitan_growth: "Procurement requires Orbitan Business (S$399/mo). Manage suppliers and purchase orders.",
    },
    upgrade_plan: "orbitan_business",
  },
  compliance: {
    key: "compliance",
    name: "Compliance Module",
    icon: "Shield",
    principle: "regulate",
    description: "Regulatory and audit management",
    required_plan_tier: 3,
    credit_cost_per_action: 0,
    credit_cost_description: null,
    locked_message: {
      orbitan_starter: "Compliance requires Orbitan Business (S$399/mo). Enable regulatory tracking and audits.",
      orbitan_growth: "Compliance requires Orbitan Business (S$399/mo). Enable regulatory tracking and audits.",
    },
    upgrade_plan: "orbitan_business",
  },
  finance_integration: {
    key: "finance_integration",
    name: "Finance Integration",
    icon: "Link",
    principle: "regulate",
    description: "Xero and accounting sync",
    required_plan_tier: 3,
    credit_cost_per_action: 0,
    credit_cost_description: null,
    locked_message: {
      orbitan_starter: "Finance integration requires Orbitan Business (S$399/mo). Connect Xero for accounting sync.",
      orbitan_growth: "Finance integration requires Orbitan Business (S$399/mo). Connect Xero for accounting sync.",
    },
    upgrade_plan: "orbitan_business",
  },
  sales_invoice: {
    key: "sales_invoice",
    name: "Sales & Invoice Module",
    icon: "FileText",
    principle: "respond",
    description: "Sales invoicing and daily reconciliation",
    required_plan_tier: 1,
    credit_cost_per_action: 0,
    credit_cost_description: null,
  },

  // ── AI Capabilities — Credit-based consumption ────────
  ai_sop_generation: {
    key: "ai_sop_generation",
    name: "AI SOP Generation",
    icon: "Sparkles",
    principle: "refine",
    description: "Generate standard operating procedures from prompts",
    required_plan_tier: 3,      // Business+
    credit_cost_per_action: 5,
    credit_cost_description: "5 credits per SOP generated",
    locked_message: {
      orbitan_starter: "AI SOP generation requires Orbitan Business (S$399/mo).",
      orbitan_growth: "AI SOP generation requires Orbitan Business (S$399/mo).",
    },
    upgrade_plan: "orbitan_business",
  },
  ai_training_content: {
    key: "ai_training_content",
    name: "AI Training Content",
    icon: "Brain",
    principle: "renew",
    description: "Auto-generate training materials and quizzes",
    required_plan_tier: 3,
    credit_cost_per_action: 8,
    credit_cost_description: "8 credits per training module generated",
    upgrade_plan: "orbitan_business",
  },
  ai_workforce_insights: {
    key: "ai_workforce_insights",
    name: "AI Workforce Insights",
    icon: "LineChart",
    principle: "refine",
    description: "AI-powered workforce analytics and recommendations",
    required_plan_tier: 3,
    credit_cost_per_action: 3,
    credit_cost_description: "3 credits per insight report",
    upgrade_plan: "orbitan_business",
  },
  ai_compliance_audit: {
    key: "ai_compliance_audit",
    name: "AI Compliance Audit",
    icon: "SearchCheck",
    principle: "regulate",
    description: "Automated compliance gap analysis",
    required_plan_tier: 3,
    credit_cost_per_action: 10,
    credit_cost_description: "10 credits per audit run",
    upgrade_plan: "orbitan_business",
  },
  ai_replenishment_autopilot: {
    key: "ai_replenishment_autopilot",
    name: "AI Replenishment Autopilot",
    icon: "Zap",
    principle: "respond",
    description: "Auto-generate purchase orders when stock hits threshold",
    required_plan_tier: 3,
    credit_cost_per_action: 2,
    credit_cost_description: "2 credits per auto-generated PO",
    upgrade_plan: "orbitan_business",
  },
  ai_assistant: {
    key: "ai_assistant",
    name: "Orbitan AI Assistant",
    icon: "MessageSquare",
    principle: "refine",
    description: "In-app AI assistant for operational questions",
    required_plan_tier: 3,
    credit_cost_per_action: 1,
    credit_cost_description: "1 credit per query",
    upgrade_plan: "orbitan_business",
  },

  // ── Advanced Capabilities — Tier 4 (Enterprise) ───────
  white_label: {
    key: "white_label",
    name: "White Label Deployment",
    icon: "Palette",
    principle: "reach",
    description: "Custom branded instance of OrbitanOS",
    required_plan_tier: 4,
    credit_cost_per_action: 0,
    credit_cost_description: null,
    locked_message: {
      orbitan_starter: "White label is an Enterprise feature. Contact us for custom pricing.",
      orbitan_growth: "White label is an Enterprise feature. Contact us for custom pricing.",
      orbitan_business: "White label is an Enterprise feature. Contact us for custom pricing.",
    },
  },
  custom_integrations: {
    key: "custom_integrations",
    name: "Custom API Integrations",
    icon: "Webhook",
    principle: "reach",
    description: "Bespoke third-party system integrations",
    required_plan_tier: 4,
    credit_cost_per_action: 0,
    credit_cost_description: null,
  },
  priority_support: {
    key: "priority_support",
    name: "Priority Support SLA",
    icon: "Headphones",
    principle: "relate",
    description: "Dedicated support with guaranteed response times",
    required_plan_tier: 4,
    credit_cost_per_action: 0,
    credit_cost_description: null,
  },

  // ── Consumption Credits — Marketplace & Extras ────────
  extra_credits_100: {
    key: "extra_credits_100",
    name: "100 Extra Credits",
    icon: "Coins",
    principle: "reach",
    description: "Top-up 100 Orbitan Credits",
    required_plan_tier: 1,
    credit_cost_per_action: null,
    credit_cost_description: "S$10 one-time purchase",
    is_topup: true,
    topup_amount: 100,
    topup_price_sgd: 10,
  },
  extra_credits_500: {
    key: "extra_credits_500",
    name: "500 Extra Credits",
    icon: "Coins",
    principle: "reach",
    description: "Top-up 500 Orbitan Credits (10% bonus)",
    required_plan_tier: 1,
    credit_cost_per_action: null,
    credit_cost_description: "S$45 one-time purchase",
    is_topup: true,
    topup_amount: 500,
    topup_price_sgd: 45,
  },
  extra_credits_2000: {
    key: "extra_credits_2000",
    name: "2,000 Extra Credits",
    icon: "Coins",
    principle: "reach",
    description: "Top-up 2,000 Orbitan Credits (20% bonus)",
    required_plan_tier: 1,
    credit_cost_per_action: null,
    credit_cost_description: "S$160 one-time purchase",
    is_topup: true,
    topup_amount: 2000,
    topup_price_sgd: 160,
  },
};

// ============================================================
// MODULE DEPENDENCY MAP
// Defines prerequisites: module X requires module Y.
// Used by subscriptionGate and BlueprintAdvisor.
// ============================================================
export const MODULE_DEPENDENCY_MAP = {
  finance_integration: {
    requires: ["sales_invoice"],
    recommends: ["reporting"],
    description: "Finance integration syncs sales data — activate Sales & Invoice first.",
  },
  procurement: {
    requires: ["inventory"],
    recommends: [],
    description: "Procurement manages supplier orders — Inventory must be active to track received stock.",
  },
  scheduling: {
    requires: ["workforce"],
    recommends: [],
    description: "Scheduling assigns shifts to employees — Workforce module provides the employee registry.",
  },
  replenishment_autopilot: {
    requires: ["inventory", "procurement"],
    recommends: ["reporting"],
    description: "Replenishment auto-generates POs — Inventory + Procurement required for stock tracking and supplier orders.",
  },
  training: {
    requires: ["workforce"],
    recommends: [],
    description: "Training assigns courses to employees — Workforce module provides the employee registry.",
  },
  sales_invoice: {
    requires: [],
    recommends: ["inventory", "reporting"],
    description: "Sales invoicing works best with Inventory (stock deduction) and Reporting (revenue analytics).",
  },
  customer_management: {
    requires: [],
    recommends: ["sales_invoice"],
    description: "Customer profiles pair naturally with Sales for purchase history tracking.",
  },
};

// ============================================================
// REGISTRY EVALUATION UTILS — Pure functions, exit-ready
// ============================================================

/**
 * Check if a plan can access a specific feature/capability.
 * Returns { allowed: boolean, reason: string | null, upgrade_plan: string | null }
 *
 * @param {string} planKey — e.g. "orbitan_starter"
 * @param {string} featureKey — e.g. "procurement"
 * @returns {{ allowed: boolean, reason: string|null, upgrade_plan: string|null }}
 */
export function canAccessFeature(planKey, featureKey) {
  const plan = PLAN_TIERS[planKey];
  const feature = FEATURE_CAPABILITIES[featureKey];

  if (!plan) return { allowed: false, reason: `Unknown plan: ${planKey}`, upgrade_plan: null };
  if (!feature) return { allowed: false, reason: `Unknown feature: ${featureKey}`, upgrade_plan: null };

  // Enterprise has access to everything
  if (plan.tier_level === 4) return { allowed: true, reason: null, upgrade_plan: null };

  if (plan.tier_level < feature.required_plan_tier) {
    const reason = feature.locked_message?.[planKey] ||
      `${feature.name} requires a higher plan tier.`;
    return {
      allowed: false,
      reason,
      upgrade_plan: feature.upgrade_plan || null,
    };
  }

  return { allowed: true, reason: null, upgrade_plan: null };
}

/**
 * Get all features a plan can access.
 * Returns array of feature keys.
 *
 * @param {string} planKey
 * @returns {string[]}
 */
export function getAccessibleFeatures(planKey) {
  const plan = PLAN_TIERS[planKey];
  if (!plan) return [];

  if (plan.tier_level === 4) return Object.keys(FEATURE_CAPABILITIES);

  return Object.entries(FEATURE_CAPABILITIES)
    .filter(([, feature]) => plan.tier_level >= feature.required_plan_tier)
    .map(([key]) => key);
}

/**
 * Get features locked behind a higher plan tier.
 * Returns array of { key, name, description, required_tier, upgrade_plan, reason }
 *
 * @param {string} planKey
 * @returns {Array}
 */
export function getLockedFeatures(planKey) {
  const plan = PLAN_TIERS[planKey];
  if (!plan) return [];

  if (plan.tier_level === 4) return [];

  return Object.entries(FEATURE_CAPABILITIES)
    .filter(([, feature]) => plan.tier_level < feature.required_plan_tier)
    .map(([key, feature]) => {
      const gateResult = canAccessFeature(planKey, key);
      return {
        key,
        name: feature.name,
        icon: feature.icon,
        description: feature.description,
        required_tier: feature.required_plan_tier,
        required_plan_name: Object.values(PLAN_TIERS).find(p => p.tier_level === feature.required_plan_tier)?.name || null,
        upgrade_plan: feature.upgrade_plan || null,
        reason: gateResult.reason,
        credit_cost: feature.credit_cost_per_action,
        credit_cost_description: feature.credit_cost_description,
      };
    });
}

/**
 * Calculate credit cost for an action.
 * Returns { cost: number, description: string | null }
 *
 * @param {string} featureKey
 * @returns {{ cost: number, description: string|null }}
 */
export function getCreditCost(featureKey) {
  const feature = FEATURE_CAPABILITIES[featureKey];
  if (!feature) return { cost: 0, description: null };
  return {
    cost: feature.credit_cost_per_action || 0,
    description: feature.credit_cost_description || null,
  };
}

/**
 * Check if a tenant has enough credits to perform an action.
 *
 * @param {object} wallet — OrbitanWallet record
 * @param {string} featureKey
 * @returns {{ sufficient: boolean, cost: number, balance: number }}
 */
export function hasSufficientCredits(wallet, featureKey) {
  const { cost } = getCreditCost(featureKey);
  const balance = wallet?.balance_credits || 0;
  return {
    sufficient: cost === 0 || balance >= cost,
    cost,
    balance,
  };
}

/**
 * Validate a module configuration against plan limits.
 * Returns array of violations.
 *
 * @param {string} planKey
 * @param {string[]} enabledModules
 * @param {number} outletCount
 * @param {number} brandCount
 * @param {number} employeeCount
 * @returns {Array}
 */
export function validatePlanLimits(planKey, { enabledModules = [], outletCount = 0, brandCount = 0, employeeCount = 0 } = {}) {
  const plan = PLAN_TIERS[planKey];
  if (!plan) return [{ type: "invalid_plan", message: `Unknown plan: ${planKey}` }];

  // Enterprise has no limits
  if (plan.tier_level === 4) return [];

  const limits = plan.limits;
  const violations = [];

  if (limits.modules !== null && enabledModules.length > limits.modules) {
    violations.push({
      type: "module_limit",
      current: enabledModules.length,
      limit: limits.modules,
      message: `Your plan allows ${limits.modules} modules. You have ${enabledModules.length} active.`,
      upgrade_plan: "orbitan_growth",
    });
  }

  if (limits.outlets !== null && outletCount > limits.outlets) {
    violations.push({
      type: "outlet_limit",
      current: outletCount,
      limit: limits.outlets,
      message: `Your plan allows ${limits.outlets} outlets. You have ${outletCount}.`,
    });
  }

  if (limits.brands !== null && brandCount > limits.brands) {
    violations.push({
      type: "brand_limit",
      current: brandCount,
      limit: limits.brands,
      message: `Your plan allows ${limits.brands} brands. You have ${brandCount}.`,
    });
  }

  if (limits.employees !== null && employeeCount > limits.employees) {
    violations.push({
      type: "employee_limit",
      current: employeeCount,
      limit: limits.employees,
      message: `Your plan allows ${limits.employees} employees. You have ${employeeCount}.`,
    });
  }

  return violations;
}

/**
 * Get all module keys categorised by their required plan tier.
 * Useful for rendering plan comparison tables.
 *
 * @returns {object} — { 1: [...], 2: [...], 3: [...], 4: [...] }
 */
export function getFeaturesByTier() {
  const tiers = { 1: [], 2: [], 3: [], 4: [] };
  Object.entries(FEATURE_CAPABILITIES).forEach(([key, feature]) => {
    if (!feature.is_topup) {
      tiers[feature.required_plan_tier]?.push({
        key,
        name: feature.name,
        icon: feature.icon,
        credit_cost: feature.credit_cost_per_action,
      });
    }
  });
  return tiers;
}

/**
 * Get module dependency violations for a given set of enabled modules.
 *
 * @param {string[]} enabledModules
 * @returns {Array} — [{ module, missing: string[], description }]
 */
export function getDependencyViolations(enabledModules) {
  const violations = [];
  Object.entries(MODULE_DEPENDENCY_MAP).forEach(([moduleKey, deps]) => {
    if (!enabledModules.includes(moduleKey)) return;
    if (!deps.requires?.length) return;

    const missing = deps.requires.filter(d => !enabledModules.includes(d));
    if (missing.length > 0) {
      violations.push({
        module: moduleKey,
        missing,
        description: deps.description,
      });
    }
  });
  return violations;
}