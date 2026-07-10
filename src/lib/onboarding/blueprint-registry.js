// ============================================================
// ORBITAN — ONBOARDING BLUEPRINT REGISTRY
// Advisory Rules Engine — Heuristic + Governance Gate Logic
// Created by Muhammad Firdaus Bin Ismail
// © 2024–2026 Orbitan & OrbitanOS. All Rights Reserved.
//
// EXIT-READY ARCHITECTURE:
// This file is pure data — zero framework dependencies.
// Registry = "What rules exist" (advisory logic + recommendations)
// AdvisorContext = "How to apply" (real-time evaluation)
// shieldInterceptor = "Governance enforcement" (hard stops)
//
// The registry defines three layers:
//   1. INDUSTRY_ADVISOR_RULES — per-industry heuristic validation
//   2. PLAN_GATING_RULES — subscription-based capability constraints
//   3. MODULE_DEPENDENCY_MAP — cross-module prerequisites
//
// Migrating stacks: copy this file, rebuild the evaluator engine.
// Adding a new industry: add one object to INDUSTRY_ADVISOR_RULES.
// ============================================================

import { SUBSCRIPTION_PLANS, MODULES } from '@/lib/orbitan-config';

// ============================================================
// SEVERITY TYPES
// ============================================================
export const GATE_TYPES = {
  soft_gate: {
    key: "soft_gate",
    label: "Recommendation",
    description: "Advisory suggestion — can be bypassed without audit",
    icon: "Info",
    color: "#2563EB",
  },
  governance_gate: {
    key: "governance_gate",
    label: "Governance Gate",
    description: "Compliance-critical — bypass triggers audit log entry",
    icon: "Shield",
    color: "#DC2626",
  },
};

// ============================================================
// MODULE DEPENDENCY MAP
// Defines prerequisites: module X requires module Y to function.
// Used by the Advisor to detect incomplete configurations.
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
  sales_invoice: {
    requires: [],
    recommends: ["inventory", "reporting"],
    description: "Sales invoicing works best with Inventory (stock deduction) and Reporting (revenue analytics).",
  },
  reporting: {
    requires: [],
    recommends: [],
    description: "Reporting is standalone — pull data from any active module.",
  },
  compliance: {
    requires: [],
    recommends: [],
    description: "Compliance is standalone — define policies and checklists independently.",
  },
  customer_management: {
    requires: [],
    recommends: ["sales_invoice"],
    description: "Customer profiles pair naturally with Sales for purchase history tracking.",
  },
  training: {
    requires: ["workforce"],
    recommends: [],
    description: "Training assigns courses to employees — Workforce module provides the employee registry.",
  },
  knowledge: {
    requires: [],
    recommends: [],
    description: "Knowledge base is standalone — document SOPs and reference materials.",
  },
};

// ============================================================
// PLAN GATING RULES
// Rules that enforce subscription plan constraints.
// The Advisor checks these when a tenant selects modules.
// ============================================================
export const PLAN_GATING_RULES = {
  // ── Module availability per plan tier ──
  module_tiers: {
    orbitan_starter: {
      max_modules: 4,
      allowed: ["workforce", "task", "reporting", "inventory", "sales_invoice", "customer_management"],
      locked: {
        procurement: {
          message: "Procurement requires Orbitan Business plan (S$399/mo). Manage suppliers and purchase orders.",
          upgrade_plan: "orbitan_business",
        },
        scheduling: {
          message: "Scheduling requires Orbitan Growth plan (S$149/mo). Create and assign shift schedules.",
          upgrade_plan: "orbitan_growth",
        },
        compliance: {
          message: "Compliance requires Orbitan Business plan (S$399/mo). Enable regulatory tracking and audits.",
          upgrade_plan: "orbitan_business",
        },
        finance_integration: {
          message: "Finance integration requires Orbitan Business plan (S$399/mo). Connect Xero for accounting sync.",
          upgrade_plan: "orbitan_business",
        },
        training: {
          message: "Training requires Orbitan Growth plan (S$149/mo). Assign courses and track certifications.",
          upgrade_plan: "orbitan_growth",
        },
        knowledge: {
          message: "Knowledge requires Orbitan Growth plan (S$149/mo). Document SOPs and build your knowledge base.",
          upgrade_plan: "orbitan_growth",
        },
      },
    },
    orbitan_growth: {
      max_modules: 7,
      allowed: ["workforce", "task", "reporting", "inventory", "scheduling", "training", "knowledge", "sales_invoice", "customer_management"],
      locked: {
        procurement: {
          message: "Procurement requires Orbitan Business plan (S$399/mo). Manage suppliers and purchase orders.",
          upgrade_plan: "orbitan_business",
        },
        compliance: {
          message: "Compliance requires Orbitan Business plan (S$399/mo). Enable regulatory tracking and audits.",
          upgrade_plan: "orbitan_business",
        },
        finance_integration: {
          message: "Finance integration requires Orbitan Business plan (S$399/mo). Connect Xero for accounting sync.",
          upgrade_plan: "orbitan_business",
        },
      },
    },
    orbitan_business: {
      max_modules: 10,
      allowed: ["workforce", "task", "reporting", "inventory", "procurement", "scheduling", "compliance", "sales_invoice", "finance_integration", "customer_management", "training", "knowledge"],
      locked: {},
    },
    orbitan_enterprise: {
      max_modules: null,
      allowed: ["all"],
      locked: {},
    },
  },

  // ── Pack availability per plan tier ──
  pack_tiers: {
    orbitan_starter: { max_packs: 1 },
    orbitan_growth: { max_packs: 1 },
    orbitan_business: { max_packs: 3 },
    orbitan_enterprise: { max_packs: null },
  },
};

// ============================================================
// INDUSTRY ADVISOR RULES
// Per-industry heuristic validation and recommended paths.
//
// Each rule object:
//   id          — unique identifier (used for audit trail)
//   condition   — structured condition the evaluator checks
//   message     — user-facing advisory message
//   severity    — "soft_gate" (can bypass) or "governance_gate" (audit required)
//   blocking    — true = cannot proceed without override
//   principle   — which 6R operating principle this enforces
// ============================================================
export const INDUSTRY_ADVISOR_RULES = {

  fnb: {
    industry: "food_beverage",
    display_name: "Food & Beverage",
    color_hex: "#F97316",

    // ── Recommended activation path (ordered) ──
    recommended_path: [
      "workforce",
      "inventory",
      "task",
      "compliance",
      "scheduling",
      "procurement",
      "sales_invoice",
      "reporting",
      "finance_integration",
    ],

    // ── Critical modules (shown as "must-have" in Advisor) ──
    critical_modules: ["compliance", "inventory", "workforce"],

    // ── Advisory Rules ──
    rules: [
      {
        id: "fnb_compliance_required",
        condition: {
          field: "enabled_modules",
          operator: "not_contains",
          value: "compliance",
        },
        message: "F&B operations in Singapore require food safety compliance tracking. The Compliance Module provides audit-ready checklists and regulatory documentation.",
        severity: "governance_gate",
        blocking: false,
        principle: "regulate",
        category: "compliance",
      },
      {
        id: "fnb_finance_gate",
        condition: {
          field: "enabled_modules",
          operator: "contains",
          value: "finance_integration",
        },
        additional_condition: {
          field: "plan",
          operator: "not_in",
          value: ["orbitan_business", "orbitan_enterprise"],
        },
        message: "Xero finance integration requires Orbitan Business plan or above. Upgrade to unlock automated accounting sync.",
        severity: "soft_gate",
        blocking: false,
        principle: "regulate",
        category: "subscription",
      },
      {
        id: "fnb_inventory_foundation",
        condition: {
          field: "enabled_modules",
          operator: "not_contains",
          value: "inventory",
        },
        message: "Inventory tracking is the backbone of F&B operations. Without it, you cannot track ingredient stock, COGS, or trigger replenishment.",
        severity: "soft_gate",
        blocking: false,
        principle: "respond",
        category: "operations",
      },
      {
        id: "fnb_sales_without_reporting",
        condition: {
          field: "enabled_modules",
          operator: "contains_all",
          value: ["sales_invoice"],
        },
        additional_condition: {
          field: "enabled_modules",
          operator: "not_contains",
          value: "reporting",
        },
        message: "You've enabled Sales & Invoicing — pairing it with Reporting gives you daily revenue dashboards, trend analysis, and reconciliation insights.",
        severity: "soft_gate",
        blocking: false,
        principle: "refine",
        category: "optimization",
      },
      {
        id: "fnb_hbb_safety_reminder",
        condition: {
          field: "is_virtual",
          operator: "equals",
          value: true,
        },
        message: "Home-based food businesses in Singapore should still maintain basic food safety logs. The Compliance Module can be configured for lightweight HBB checklists.",
        severity: "soft_gate",
        blocking: false,
        principle: "regulate",
        category: "compliance",
        applies_to_plans: ["orbitan_starter", "orbitan_growth"],
      },
      {
        id: "fnb_replenishment_ready",
        condition: {
          field: "enabled_modules",
          operator: "contains_all",
          value: ["inventory", "procurement"],
        },
        additional_condition: {
          field: "enabled_modules",
          operator: "not_contains",
          value: "reporting",
        },
        message: "With Inventory + Procurement active, adding Reporting unlocks the Replenishment Engine — OrbitanOS can auto-suggest purchase orders when stock runs low.",
        severity: "soft_gate",
        blocking: false,
        principle: "refine",
        category: "optimization",
      },
    ],

    // ── Module-specific recommendations ──
    module_recommendations: {
      inventory: {
        title: "Set up ingredient categories",
        description: "Organise stock by category: proteins, produce, dry goods, beverages, packaging.",
        link_to: "inventory_setup",
      },
      compliance: {
        title: "Activate food safety templates",
        description: "Pre-built checklists for daily hygiene, temperature logs, and pest control.",
        link_to: "compliance_templates",
      },
      sales_invoice: {
        title: "Configure daily reconciliation",
        description: "Set up end-of-day sales reconciliation against POS data.",
        link_to: "reconciliation_setup",
      },
    },

    // ── Industry-specific compliance templates ──
    compliance_templates: [
      { type: "food_safety_audit", title: "Daily Food Safety Audit" },
      { type: "hygiene_checklist", title: "Kitchen Hygiene & Sanitation Checklist" },
      { type: "fire_safety", title: "Fire Safety Equipment Inspection" },
      { type: "licensing", title: "F&B License & Permit Renewal Tracker" },
    ],
  },

  recycling: {
    industry: "recycling_sustainability",
    display_name: "Recycling & Sustainability",
    color_hex: "#16A34A",

    recommended_path: [
      "workforce",
      "inventory",
      "task",
      "compliance",
      "reporting",
      "procurement",
    ],

    critical_modules: ["compliance", "reporting", "workforce"],

    rules: [
      {
        id: "recycling_compliance_required",
        condition: {
          field: "enabled_modules",
          operator: "not_contains",
          value: "compliance",
        },
        message: "Recycling operations require environmental compliance tracking. The Compliance Module manages audit trails, disposal certifications, and regulatory reporting.",
        severity: "governance_gate",
        blocking: false,
        principle: "regulate",
        category: "compliance",
      },
      {
        id: "recycling_reporting_required",
        condition: {
          field: "enabled_modules",
          operator: "not_contains",
          value: "reporting",
        },
        message: "Sustainability reporting is core to recycling operations. The Reporting Module tracks CO2 savings, material recovery rates, and impact metrics for stakeholders.",
        severity: "governance_gate",
        blocking: false,
        principle: "refine",
        category: "operations",
      },
      {
        id: "recycling_inventory_materials",
        condition: {
          field: "enabled_modules",
          operator: "not_contains",
          value: "inventory",
        },
        message: "Track recovered materials by category (paper, plastics, metals, e-waste). Inventory enables material valuation and processing workflow management.",
        severity: "soft_gate",
        blocking: false,
        principle: "respond",
        category: "operations",
      },
      {
        id: "recycling_vehicle_fleet",
        condition: {
          field: "enabled_modules",
          operator: "contains",
          value: "workforce",
        },
        message: "Tip: Set up your collection vehicle fleet and driver roster in the Workforce Module. Assign drivers to collection routes for operational visibility.",
        severity: "soft_gate",
        blocking: false,
        principle: "relate",
        category: "operations",
      },
    ],

    module_recommendations: {
      inventory: {
        title: "Configure material categories",
        description: "Set up categories: Paper/Cardboard, Plastics, Metals, E-Waste, Glass, Textiles, Organic.",
        link_to: "inventory_setup",
      },
      reporting: {
        title: "Define sustainability KPIs",
        description: "Track CO2 saved, trees equivalent, water saved, and material recovery rates.",
        link_to: "reporting_kpis",
      },
      compliance: {
        title: "Activate environmental templates",
        description: "Pre-built checklists for environmental audits, disposal certifications, and partner due diligence.",
        link_to: "compliance_templates",
      },
    },

    compliance_templates: [
      { type: "environmental_audit", title: "Monthly Environmental Impact Audit" },
      { type: "disposal_certification", title: "Disposal Certification & Waste Tracking" },
      { type: "safety_inspection", title: "Vehicle & Equipment Safety Inspection" },
      { type: "partner_due_diligence", title: "Recycling Partner Due Diligence Check" },
    ],
  },

  retail: {
    industry: "retail",
    display_name: "Retail",
    color_hex: "#22C55E",

    recommended_path: [
      "workforce",
      "inventory",
      "task",
      "sales_invoice",
      "customer_management",
      "reporting",
      "procurement",
    ],

    critical_modules: ["inventory", "sales_invoice"],

    rules: [
      {
        id: "retail_inventory_foundation",
        condition: {
          field: "enabled_modules",
          operator: "not_contains",
          value: "inventory",
        },
        message: "Inventory is essential for retail — track stock levels, product variants, and sourcing status. Without it, you cannot manage your catalogue.",
        severity: "governance_gate",
        blocking: false,
        principle: "respond",
        category: "operations",
      },
      {
        id: "retail_sales_required",
        condition: {
          field: "enabled_modules",
          operator: "not_contains",
          value: "sales_invoice",
        },
        message: "Sales & Invoicing enables transaction recording, revenue tracking, and customer purchase history. Recommended for any retail operation.",
        severity: "soft_gate",
        blocking: false,
        principle: "respond",
        category: "operations",
      },
      {
        id: "retail_customer_loyalty",
        condition: {
          field: "enabled_modules",
          operator: "contains",
          value: "sales_invoice",
        },
        additional_condition: {
          field: "enabled_modules",
          operator: "not_contains",
          value: "customer_management",
        },
        message: "With Sales active, Customer Management unlocks loyalty tiers, purchase history, and sustainability impact tracking per customer.",
        severity: "soft_gate",
        blocking: false,
        principle: "relate",
        category: "optimization",
      },
      {
        id: "retail_sustainability_story",
        condition: {
          field: "enabled_modules",
          operator: "contains",
          value: "customer_management",
        },
        message: "Share your sustainability impact with customers — track items diverted from landfill and CO2 saved per purchase. Builds brand loyalty in the circular economy.",
        severity: "soft_gate",
        blocking: false,
        principle: "renew",
        category: "optimization",
      },
    ],

    module_recommendations: {
      inventory: {
        title: "Set up product catalogue",
        description: "Categorise products by type, condition, size, and sourcing method (upcycled, donated, wholesale).",
        link_to: "catalogue_setup",
      },
      customer_management: {
        title: "Define loyalty tiers",
        description: "Create Green Starter → Eco Regular → Sustainability Champion → Orbitan Ambassador tiers.",
        link_to: "loyalty_setup",
      },
      sales_invoice: {
        title: "Configure POS workflow",
        description: "Set up point-of-sale with sustainability impact display per transaction.",
        link_to: "pos_setup",
      },
    },

    compliance_templates: [
      { type: "health_safety", title: "Store Health & Safety Inspection" },
      { type: "trade_licensing", title: "Trade License & Business Registration Review" },
    ],
  },

  // ── Future Industries (Seeded — ready to activate) ──

  technology: {
    industry: "technology_software",
    display_name: "Technology & Software",
    color_hex: "#0F172A",

    recommended_path: [
      "workforce",
      "task",
      "knowledge",
      "training",
      "reporting",
      "compliance",
      "scheduling",
    ],

    critical_modules: ["workforce", "task", "knowledge"],

    rules: [
      {
        id: "tech_knowledge_base",
        condition: {
          field: "enabled_modules",
          operator: "not_contains",
          value: "knowledge",
        },
        message: "Tech teams thrive on documentation. The Knowledge Module centralises SOPs, runbooks, architecture decisions, and onboarding guides.",
        severity: "soft_gate",
        blocking: false,
        principle: "renew",
        category: "operations",
      },
      {
        id: "tech_soc2_readiness",
        condition: {
          field: "enabled_modules",
          operator: "not_contains",
          value: "compliance",
        },
        message: "If you're pursuing SOC 2 or ISO 27001, the Compliance Module provides pre-built audit checklists and evidence collection.",
        severity: "soft_gate",
        blocking: false,
        principle: "regulate",
        category: "compliance",
      },
    ],

    module_recommendations: {},
    compliance_templates: [],
  },

  healthcare: {
    industry: "healthcare",
    display_name: "Healthcare",
    color_hex: "#06B6D4",

    recommended_path: [
      "workforce",
      "scheduling",
      "compliance",
      "task",
      "reporting",
      "training",
    ],

    critical_modules: ["compliance", "workforce", "scheduling"],

    rules: [
      {
        id: "healthcare_compliance_mandatory",
        condition: {
          field: "enabled_modules",
          operator: "not_contains",
          value: "compliance",
        },
        message: "Healthcare operations require rigorous compliance. The Compliance Module manages patient safety audits, infection control logs, and regulatory reporting.",
        severity: "governance_gate",
        blocking: false,
        principle: "regulate",
        category: "compliance",
      },
    ],

    module_recommendations: {},
    compliance_templates: [],
  },

  education: {
    industry: "education",
    display_name: "Education",
    color_hex: "#8B5CF6",

    recommended_path: [
      "workforce",
      "scheduling",
      "task",
      "compliance",
      "reporting",
      "training",
      "knowledge",
    ],

    critical_modules: ["workforce", "scheduling", "compliance"],

    rules: [
      {
        id: "education_safeguarding",
        condition: {
          field: "enabled_modules",
          operator: "not_contains",
          value: "compliance",
        },
        message: "Educational institutions should track safeguarding policies and health & safety compliance. The Compliance Module provides audit-ready checklists.",
        severity: "governance_gate",
        blocking: false,
        principle: "regulate",
        category: "compliance",
      },
    ],

    module_recommendations: {},
    compliance_templates: [],
  },

  logistics: {
    industry: "logistics",
    display_name: "Logistics",
    color_hex: "#2563EB",

    recommended_path: [
      "workforce",
      "task",
      "inventory",
      "procurement",
      "reporting",
      "compliance",
      "scheduling",
    ],

    critical_modules: ["workforce", "inventory", "compliance"],

    rules: [
      {
        id: "logistics_driver_compliance",
        condition: {
          field: "enabled_modules",
          operator: "not_contains",
          value: "compliance",
        },
        message: "Logistics requires driver license verification and vehicle maintenance tracking. The Compliance Module manages these regulatory requirements.",
        severity: "governance_gate",
        blocking: false,
        principle: "regulate",
        category: "compliance",
      },
    ],

    module_recommendations: {},
    compliance_templates: [],
  },

  events: {
    industry: "events_activations",
    display_name: "Events & Activations",
    color_hex: "#8B5CF6",

    recommended_path: [
      "workforce",
      "task",
      "procurement",
      "reporting",
      "compliance",
      "scheduling",
    ],

    critical_modules: ["workforce", "task"],

    rules: [
      {
        id: "events_crowd_safety",
        condition: {
          field: "enabled_modules",
          operator: "not_contains",
          value: "compliance",
        },
        message: "Events require crowd management plans and fire safety audits. The Compliance Module tracks these for regulatory approval.",
        severity: "soft_gate",
        blocking: false,
        principle: "regulate",
        category: "compliance",
      },
    ],

    module_recommendations: {},
    compliance_templates: [],
  },

  facilities: {
    industry: "facilities_management",
    display_name: "Facilities Management",
    color_hex: "#EAB308",

    recommended_path: [
      "workforce",
      "task",
      "compliance",
      "reporting",
      "procurement",
      "scheduling",
    ],

    critical_modules: ["workforce", "task", "compliance"],

    rules: [
      {
        id: "facilities_safety_audits",
        condition: {
          field: "enabled_modules",
          operator: "not_contains",
          value: "compliance",
        },
        message: "Facilities management requires fire safety audits, lift inspections, and electrical safety checks. The Compliance Module centralises these.",
        severity: "governance_gate",
        blocking: false,
        principle: "regulate",
        category: "compliance",
      },
    ],

    module_recommendations: {},
    compliance_templates: [],
  },
};

// ============================================================
// ADVISOR UTILS — Pure evaluation functions
// Exit-ready: no framework dependencies.
// ============================================================

/**
 * Evaluate a single rule condition against current tenant state.
 * Returns true if the rule SHOULD fire (condition is met).
 *
 * @param {object} condition — structured condition { field, operator, value }
 * @param {object} state — current tenant state { plan, enabled_modules, industry, is_virtual }
 * @returns {boolean}
 */
export function evaluateCondition(condition, state) {
  const { field, operator, value } = condition;
  const fieldValue = state[field];

  switch (operator) {
    case "contains":
      return Array.isArray(fieldValue) && fieldValue.includes(value);
    case "not_contains":
      return Array.isArray(fieldValue) && !fieldValue.includes(value);
    case "contains_all":
      return Array.isArray(fieldValue) && Array.isArray(value) &&
        value.every(v => fieldValue.includes(v));
    case "equals":
      return fieldValue === value;
    case "not_equals":
      return fieldValue !== value;
    case "not_in":
      return Array.isArray(value) && !value.includes(fieldValue);
    case "in":
      return Array.isArray(value) && value.includes(fieldValue);
    default:
      return false;
  }
}

/**
 * Get all active advisory rules for a given tenant state.
 * Evaluates both the primary condition and any additional_condition.
 *
 * @param {object} state — { industry, plan, enabled_modules, is_virtual }
 * @returns {array} — array of triggered rule objects with evaluated flag
 */
export function getActiveAdvisoryRules(state, industryRulesOverride) {
  const industryRules = industryRulesOverride || INDUSTRY_ADVISOR_RULES[state.industry];
  if (!industryRules) return [];

  return industryRules.rules
    .filter(rule => {
      // Check primary condition
      const primaryMet = evaluateCondition(rule.condition, state);
      if (!primaryMet) return false;

      // Check additional condition if present
      if (rule.additional_condition) {
        const additionalMet = evaluateCondition(rule.additional_condition, state);
        if (!additionalMet) return false;
      }

      // Check plan filter if present
      if (rule.applies_to_plans && !rule.applies_to_plans.includes(state.plan)) {
        return false;
      }

      return true;
    })
    .map(rule => ({
      ...rule,
      _evaluated: true,
      _gate_type: GATE_TYPES[rule.severity] || GATE_TYPES.soft_gate,
    }));
}

/**
 * Calculate a "Blueprint Score" (0-100) for a tenant configuration.
 * Higher score = better alignment with industry best practices.
 *
 * Factors:
 *   - Critical modules activated (40%)
 *   - Recommended path adherence (30%)
 *   - No governance gate violations (20%)
 *   - Dependency chain completeness (10%)
 *
 * @param {object} state — { industry, plan, enabled_modules, is_virtual }
 * @returns {number} — 0-100 score
 */
export function calculateBlueprintScore(state, industryRulesOverride) {
  const industryRules = industryRulesOverride || INDUSTRY_ADVISOR_RULES[state.industry];
  if (!industryRules) return 50; // Unknown industry — neutral score

  let score = 0;

  // 1. Critical modules (40 points)
  const criticalCount = industryRules.critical_modules.length || 0;
  if (criticalCount > 0) {
    const activatedCritical = industryRules.critical_modules.filter(
      m => state.enabled_modules?.includes(m)
    ).length;
    score += (activatedCritical / criticalCount) * 40;
  } else {
    score += 40;
  }

  // 2. Recommended path adherence (30 points)
  const recommendedOrder = industryRules.recommended_path || [];
  if (recommendedOrder.length > 0) {
    const activatedRecs = recommendedOrder.filter(
      m => state.enabled_modules?.includes(m)
    ).length;
    score += (activatedRecs / recommendedOrder.length) * 30;
  } else {
    score += 30;
  }

  // 3. Governance gate violations (20 points — subtract violations)
  const activeRules = getActiveAdvisoryRules(state);
  const governanceViolations = activeRules.filter(
    r => r.severity === "governance_gate"
  ).length;
  score += Math.max(0, 20 - governanceViolations * 5); // -5 per governance violation

  // 4. Dependency completeness (10 points)
  let dependencyScore = 10;
  const activeModules = state.enabled_modules || [];
  activeModules.forEach(moduleKey => {
    const deps = MODULE_DEPENDENCY_MAP[moduleKey];
    if (deps?.requires) {
      const missingDeps = deps.requires.filter(d => !activeModules.includes(d));
      dependencyScore -= missingDeps.length * 2;
    }
  });
  score += Math.max(0, dependencyScore);

  return Math.round(Math.min(100, Math.max(0, score)));
}

/**
 * Get plan-gating violations for a given configuration.
 *
 * @param {object} state — { plan, enabled_modules }
 * @returns {array} — array of locked module violations
 */
export function getPlanGatingViolations(state) {
  const tier = PLAN_GATING_RULES.module_tiers[state.plan];
  if (!tier) return [];

  const violations = [];
  const activeModules = state.enabled_modules || [];

  // Check if tier allows "all"
  if (tier.allowed.includes("all")) return [];

  // Check locked modules
  if (tier.locked) {
    Object.entries(tier.locked).forEach(([moduleKey, rule]) => {
      if (activeModules.includes(moduleKey)) {
        violations.push({
          module: moduleKey,
          ...rule,
          severity: "governance_gate",
        });
      }
    });
  }

  // Check module count limit
  if (tier.max_modules !== null && activeModules.length > tier.max_modules) {
    violations.push({
      module: "too_many_modules",
      message: `Your plan allows up to ${tier.max_modules} modules. You have ${activeModules.length} selected.`,
      upgrade_plan: Object.keys(SUBSCRIPTION_PLANS).find(
        k => SUBSCRIPTION_PLANS[k].tier_level > (SUBSCRIPTION_PLANS[state.plan]?.tier_level || 0)
      ),
      severity: "governance_gate",
    });
  }

  return violations;
}

/**
 * Get module dependency violations.
 *
 * @param {array} enabledModules — list of active module keys
 * @returns {array} — array of { module, missing, description }
 */
export function getDependencyViolations(enabledModules) {
  const violations = [];
  enabledModules.forEach(moduleKey => {
    const deps = MODULE_DEPENDENCY_MAP[moduleKey];
    if (deps?.requires) {
      const missing = deps.requires.filter(d => !enabledModules.includes(d));
      if (missing.length > 0) {
        violations.push({
          module: moduleKey,
          missing,
          description: deps.description,
        });
      }
    }
  });
  return violations;
}