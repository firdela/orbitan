// ============================================================
// ORBITAN & ORBITANOS — PLATFORM CONFIGURATION (MASTER DNA)
// Created by Muhammad Firdaus Bin Ismail
// © 2024–2026 Orbitan & OrbitanOS. All Rights Reserved.
// Unauthorised reproduction or distribution is prohibited.
//
// EXIT-READY ARCHITECTURE:
// This file is the single source of truth for all platform
// business logic. It is pure JS — zero framework dependencies.
// Migrating to any stack: copy this file, build adapters.
// ============================================================

export const PLATFORM_IDENTITY = {
  creator: "Muhammad Firdaus Bin Ismail",
  platform: "Orbitan",
  os: "OrbitanOS",
  version: "1.1.0",
  tagline: "One Operating System for Workforce, Inventory, Operations, Finance, Sustainability, and Growth.",
  copyright: `© ${new Date().getFullYear()} Orbitan & OrbitanOS. Created by Muhammad Firdaus Bin Ismail. All Rights Reserved.`,
  strategic_partner: "Hamka — Renewed Resources Pte Ltd",
  operating_cycle: ["Renew", "Relate", "Respond", "Refine", "Regulate", "Reach"],
};

// ============================================================
// OPERATING CYCLE — The 6 Principles of OrbitanOS
// ============================================================
export const OPERATING_CYCLE = {
  renew:    { key: "renew",    label: "Renew",    color: "#16A34A", description: "Continuous learning, growth, sustainability & improvement" },
  relate:   { key: "relate",   label: "Relate",   color: "#2563EB", description: "People, teams, communication & relationships" },
  respond:  { key: "respond",  label: "Respond",  color: "#F97316", description: "Tasks, operations, execution & service delivery" },
  refine:   { key: "refine",   label: "Refine",   color: "#7C3AED", description: "Process improvement, analytics, optimisation & AI" },
  regulate: { key: "regulate", label: "Regulate", color: "#DC2626", description: "Compliance, governance, policies & auditing" },
  reach:    { key: "reach",    label: "Reach",    color: "#0F172A", description: "Expansion, multi-outlet, multi-country & scaling" },
};

// ============================================================
// SUBSCRIPTION PLANS
// ============================================================
export const SUBSCRIPTION_PLANS = {
  orbitan_starter: {
    key: "orbitan_starter",
    name: "Orbitan Starter",
    price_sgd: 49,
    price_label: "S$49/month",
    max_employees: 10,
    tier_level: 1,
    gradient: "linear-gradient(135deg, #3B82F6, #1D4ED8)",
    color_hex: "#2563EB",
    allowed_modules: ["workforce", "task", "reporting"],
    allowed_packs: [],
    pack_limit: 0,
    ai_access: false,
    advanced_reporting: false,
    integrations: false,
    description: "For small businesses, single outlet",
    suitable_for: "Small businesses — single outlet",
  },
  orbitan_growth: {
    key: "orbitan_growth",
    name: "Orbitan Growth",
    price_sgd: 149,
    price_label: "S$149/month",
    max_employees: 50,
    tier_level: 2,
    gradient: "linear-gradient(135deg, #34D399, #059669)",
    color_hex: "#10B981",
    allowed_modules: ["workforce", "task", "reporting", "inventory", "scheduling"],
    allowed_packs: ["one_pack"],
    pack_limit: 1,
    ai_access: false,
    advanced_reporting: false,
    integrations: false,
    description: "For growing businesses, multiple outlets",
    suitable_for: "Growing businesses — multiple outlets",
  },
  orbitan_business: {
    key: "orbitan_business",
    name: "Orbitan Business",
    price_sgd: 399,
    price_label: "S$399/month",
    max_employees: 250,
    tier_level: 3,
    gradient: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
    color_hex: "#7C3AED",
    allowed_modules: ["workforce", "task", "reporting", "inventory", "procurement", "scheduling", "compliance", "sales_invoice", "finance_integration", "customer_management"],
    allowed_packs: ["multiple_packs"],
    pack_limit: 3,
    ai_access: true,
    advanced_reporting: true,
    integrations: true,
    description: "For established organisations, multi-site",
    suitable_for: "Established organisations — multi-site operations",
  },
  orbitan_enterprise: {
    key: "orbitan_enterprise",
    name: "Orbitan Enterprise",
    price_sgd: null,
    price_label: "Custom Pricing",
    max_employees: null,
    tier_level: 4,
    gradient: "linear-gradient(135deg, #374151, #111827)",
    color_hex: "#111827",
    accent_hex: "#D4AF37",
    allowed_modules: ["all"],
    allowed_packs: ["all"],
    pack_limit: null,
    ai_access: true,
    advanced_reporting: true,
    integrations: true,
    description: "Custom pricing — large organisations",
    suitable_for: "Large organisations, multi-entity enterprises, regulated industries",
  },
};

// ============================================================
// MODULES — Reusable platform capabilities
// Principle mapping ties each module to an OrbitanOS cycle key
// ============================================================
export const MODULES = {
  workforce:          { key: "workforce",          name: "Workforce Module",          icon: "Users",        principle: "relate",   description: "Employee management, roles & departments" },
  scheduling:         { key: "scheduling",         name: "Scheduling Module",         icon: "Calendar",     principle: "relate",   description: "Shift scheduling and attendance tracking" },
  task:               { key: "task",               name: "Task Module",               icon: "CheckSquare",  principle: "respond",  description: "Task assignment and completion tracking" },
  inventory:          { key: "inventory",          name: "Inventory Module",          icon: "Package",      principle: "renew",    description: "Stock management and replenishment" },
  procurement:        { key: "procurement",        name: "Procurement Module",        icon: "ShoppingCart", principle: "respond",  description: "Purchase orders and supplier management" },
  sales_invoice:      { key: "sales_invoice",      name: "Sales & Invoice Module",    icon: "FileText",     principle: "respond",  description: "Sales invoicing and daily reconciliation" },
  reporting:          { key: "reporting",          name: "Reporting Module",          icon: "BarChart2",    principle: "refine",   description: "Analytics and performance dashboards" },
  compliance:         { key: "compliance",         name: "Compliance Module",         icon: "Shield",       principle: "regulate", description: "Regulatory and audit management" },
  finance_integration:{ key: "finance_integration",name: "Finance Integration",       icon: "Link",         principle: "regulate", description: "Xero and accounting sync" },
  training:           { key: "training",           name: "Training Module",           icon: "BookOpen",     principle: "renew",    description: "Staff training and certifications" },
  knowledge:          { key: "knowledge",          name: "Knowledge Module",          icon: "Archive",      principle: "renew",    description: "SOPs and knowledge base" },
  customer_management:{ key: "customer_management",name: "Customer Management",       icon: "UserCheck",    principle: "relate",   description: "Customer profiles and purchase history" },
};

// ============================================================
// INDUSTRY PACKS — Self-Aware Capability Blueprints
// Each pack is a complete operational DNA for that industry.
// Adding a new industry = adding one object here. Nothing else.
// ============================================================
export const INDUSTRY_PACKS = {

  // ── ACTIVE LAUNCH PACKS ─────────────────────────────────

  fnb: {
    key: "fnb",
    name: "F&B Pack",
    industry: "food_beverage",
    color_hex: "#F97316",
    badge_label: "F&B",
    description: "Food & Beverage operations",
    launch_tenants: ["Taqueria Pte Ltd"],
    launch_brands: ["La Birria Tacos"],
    modules: ["inventory", "procurement", "sales_invoice", "reporting", "workforce", "task", "compliance", "finance_integration", "scheduling"],
    capabilities: {
      required_integrations: ["xero"],
      default_workflows: ["daily_sales_reconciliation", "cogs_tracking", "goods_receiving", "replenishment_alerts"],
      compliance_templates: ["food_safety_audit", "hygiene_checklist", "fire_safety"],
      access_roles: ["worker", "supervisor", "outlet_manager", "tenant_admin"],
    },
  },

  recycling: {
    key: "recycling",
    name: "Recycling & Sustainability Pack",
    industry: "recycling_sustainability",
    color_hex: "#16A34A",
    badge_label: "Sustainability",
    description: "Recycling collection, waste processing & sustainability reporting",
    launch_tenants: ["Renewed Resources Pte Ltd"],
    launch_brands: ["Renewed Resources"],
    modules: ["inventory", "procurement", "compliance", "reporting", "workforce", "task"],
    capabilities: {
      required_integrations: ["iot_weight_scales", "compliance_reporting_portal"],
      default_workflows: ["waste_collection_routing", "material_recovery_processing", "sustainability_impact_reporting"],
      compliance_templates: ["environmental_audit", "disposal_certification", "safety_inspection"],
      access_roles: ["worker", "supervisor", "outlet_manager", "tenant_admin"],
    },
  },

  retail: {
    key: "retail",
    name: "Retail Pack",
    industry: "retail",
    color_hex: "#22C55E",
    badge_label: "Retail",
    description: "Retail operations, product cataloguing & sustainability commerce",
    launch_tenants: ["Renewed Fashion"],
    launch_brands: ["Renewed Fashion"],
    modules: ["inventory", "sales_invoice", "reporting", "procurement", "workforce", "task", "customer_management"],
    capabilities: {
      required_integrations: ["pos_system", "ecommerce_sync", "customer_loyalty_engine"],
      default_workflows: ["product_cataloguing", "upcycling_refurbishment_log", "loyalty_program_management"],
      compliance_templates: ["health_safety_inspection", "trade_licensing"],
      access_roles: ["worker", "outlet_manager", "tenant_admin"],
    },
  },

  // ── FUTURE-PROOFED PACKS (Seeded — ready to activate) ───

  technology: {
    key: "technology",
    name: "Tech & Software Pack",
    industry: "technology_software",
    color_hex: "#0F172A",
    badge_label: "Technology",
    description: "Software teams, sprint operations & technical workforce management",
    launch_tenants: [],
    launch_brands: [],
    modules: ["workforce", "task", "reporting", "knowledge", "training", "compliance", "scheduling"],
    capabilities: {
      required_integrations: ["github", "slack", "jira"],
      default_workflows: ["sprint_planning", "knowledge_base_documentation", "deployment_monitoring", "incident_management"],
      compliance_templates: ["soc2_readiness", "data_privacy_audit", "iso27001_checklist"],
      access_roles: ["worker", "supervisor", "tenant_admin"],
    },
  },

  events: {
    key: "events",
    name: "Events & Activations Pack",
    industry: "events_activations",
    color_hex: "#8B5CF6",
    badge_label: "Events",
    description: "Event planning, vendor coordination & brand activation management",
    launch_tenants: [],
    launch_brands: [],
    modules: ["workforce", "task", "procurement", "reporting", "compliance", "scheduling"],
    capabilities: {
      required_integrations: ["ticketing_platform", "crm", "payment_gateway"],
      default_workflows: ["event_planning", "vendor_coordination", "attendance_tracking", "post_event_reporting"],
      compliance_templates: ["fire_safety_audit", "crowd_management_plan", "vendor_due_diligence"],
      access_roles: ["worker", "supervisor", "outlet_manager", "tenant_admin"],
    },
  },

  healthcare: {
    key: "healthcare",
    name: "Healthcare Pack",
    industry: "healthcare",
    color_hex: "#06B6D4",
    badge_label: "Healthcare",
    description: "Healthcare workforce, patient safety & regulatory compliance",
    launch_tenants: [],
    launch_brands: [],
    modules: ["workforce", "scheduling", "compliance", "task", "reporting", "training"],
    capabilities: {
      required_integrations: ["emr_system", "pharmacy_system"],
      default_workflows: ["shift_handover", "incident_reporting", "medication_dispensing_log"],
      compliance_templates: ["patient_data_privacy_audit", "medical_device_log", "infection_control_checklist"],
      access_roles: ["worker", "supervisor", "outlet_manager", "tenant_admin"],
    },
  },

  education: {
    key: "education",
    name: "Education Pack",
    industry: "education",
    color_hex: "#8B5CF6",
    badge_label: "Education",
    description: "Campus operations, staff scheduling & student-facing compliance",
    launch_tenants: [],
    launch_brands: [],
    modules: ["workforce", "scheduling", "task", "compliance", "reporting", "training", "knowledge"],
    capabilities: {
      required_integrations: ["lms_system", "student_information_system"],
      default_workflows: ["class_scheduling", "staff_onboarding", "compliance_reporting"],
      compliance_templates: ["safeguarding_policy", "health_safety_audit", "data_protection_review"],
      access_roles: ["worker", "supervisor", "tenant_admin"],
    },
  },

  logistics: {
    key: "logistics",
    name: "Logistics Pack",
    industry: "logistics",
    color_hex: "#2563EB",
    badge_label: "Logistics",
    description: "Fleet, supply chain & delivery workforce management",
    launch_tenants: [],
    launch_brands: [],
    modules: ["workforce", "task", "inventory", "procurement", "reporting", "compliance", "scheduling"],
    capabilities: {
      required_integrations: ["gps_telemetry", "fleet_management_api", "wms_system"],
      default_workflows: ["delivery_route_planning", "goods_dispatch", "driver_compliance_check"],
      compliance_templates: ["driver_license_verification", "vehicle_maintenance_log", "load_safety_checklist"],
      access_roles: ["worker", "supervisor", "outlet_manager", "tenant_admin"],
    },
  },

  facilities: {
    key: "facilities",
    name: "Facilities Management Pack",
    industry: "facilities_management",
    color_hex: "#EAB308",
    badge_label: "Facilities",
    description: "Property maintenance, asset management & building compliance",
    launch_tenants: [],
    launch_brands: [],
    modules: ["workforce", "task", "compliance", "reporting", "procurement", "scheduling"],
    capabilities: {
      required_integrations: ["bms_system", "asset_tracking_api"],
      default_workflows: ["preventive_maintenance_scheduling", "work_order_management", "contractor_management"],
      compliance_templates: ["fire_safety_audit", "lift_inspection_log", "electrical_safety_checklist"],
      access_roles: ["worker", "supervisor", "outlet_manager", "tenant_admin"],
    },
  },
};

// ============================================================
// LAUNCH TENANTS — The 3 primary day-one customers
// ============================================================
export const LAUNCH_TENANTS = {
  taqueria: {
    id_ref: "taqueria_pte_ltd",
    name: "Taqueria Pte Ltd",
    legal_name: "Taqueria Pte Ltd",
    industry: "food_beverage",
    pack: "fnb",
    plan: "orbitan_enterprise",
    brands: ["La Birria Tacos"],
    outlets: ["La Birria Tacos (North Bridge Rd)"],
    enabled_modules: ["inventory", "procurement", "sales_invoice", "reporting", "workforce", "task", "compliance", "finance_integration", "scheduling"],
    enabled_packs: ["core", "fnb", "finance", "compliance"],
    country: "Singapore",
    currency: "SGD",
    status: "active",
  },
  renewed_resources: {
    id_ref: "renewed_resources_pte_ltd",
    name: "Renewed Resources Pte Ltd",
    legal_name: "Renewed Resources Pte Ltd",
    industry: "recycling_sustainability",
    pack: "recycling",
    plan: "orbitan_business",
    brands: ["Renewed Resources"],
    outlets: [],
    enabled_modules: ["inventory", "procurement", "compliance", "reporting", "workforce", "task"],
    enabled_packs: ["core", "recycling", "compliance"],
    country: "Singapore",
    currency: "SGD",
    status: "active",
  },
  renewed_fashion: {
    id_ref: "renewed_fashion",
    name: "Renewed Fashion",
    legal_name: "Renewed Fashion Pte Ltd",
    industry: "retail",
    pack: "retail",
    plan: "orbitan_business",
    brands: ["Renewed Fashion"],
    outlets: [],
    enabled_modules: ["inventory", "sales_invoice", "reporting", "procurement", "workforce", "task", "customer_management"],
    enabled_packs: ["core", "retail"],
    country: "Singapore",
    currency: "SGD",
    status: "active",
  },
  izaliqa_bakes: {
    id_ref: "izaliqa_bakes",
    name: "Izaliqa Bakes",
    legal_name: "Izaliqa Bakes",
    industry: "food_beverage",
    pack: "fnb",
    plan: "orbitan_starter",
    brands: ["Izaliqa Bakes"],
    outlets: ["Home Kitchen"],
    enabled_modules: ["task", "inventory", "sales_invoice"],
    enabled_packs: ["core", "fnb"],
    country: "Singapore",
    currency: "SGD",
    status: "active",
  },
};

// ============================================================
// INDUSTRY LABELS — Human-readable display map
// ============================================================
export const INDUSTRY_LABELS = {
  food_beverage:        "Food & Beverage",
  recycling_sustainability: "Recycling & Sustainability",
  retail:               "Retail",
  healthcare:           "Healthcare",
  education:            "Education",
  logistics:            "Logistics",
  events_activations:   "Events & Activations",
  technology_software:  "Technology & Software",
  facilities_management:"Facilities Management",
  other:                "Other",
};

// ============================================================
// ROLE ROUTES — Maps user roles to home routes
// ============================================================
export const ROLE_ROUTES = {
  platform_owner: "/leader-org",
  tenant_admin:   "/company",
  client_manager: "/client",
  outlet_manager: "/outlet",
  worker:         "/worker",
};

// ============================================================
// ORBITAN ENGINE UTILS
// Pure functions — zero framework dependency. Exit-ready.
// ============================================================

/**
 * Get a tenant's full resolved configuration from the DNA registry.
 * This is the single function your OrbitanEngine calls on login.
 */
export function resolveTenantConfig(tenant) {
  if (!tenant) return null;
  const plan = SUBSCRIPTION_PLANS[tenant.subscription_plan] || SUBSCRIPTION_PLANS.orbitan_starter;
  const isEnterprise = plan.tier_level === 4;
  const packKeys = tenant.enabled_packs || [];
  const moduleKeys = tenant.enabled_modules || [];

  const resolvedPacks = packKeys
    .map(k => INDUSTRY_PACKS[k])
    .filter(Boolean);

  const resolvedModules = moduleKeys
    .map(k => MODULES[k])
    .filter(Boolean);

  return {
    tenant,
    plan,
    isEnterprise,
    resolvedPacks,
    resolvedModules,
    canAccessModule: (moduleKey) => {
      if (isEnterprise) return true;
      if (tenant.feature_flags?.[moduleKey] === true) return true;
      if (tenant.feature_flags?.[moduleKey] === false) return false;
      return moduleKeys.includes(moduleKey);
    },
    canAccessPack: (packKey) => {
      if (isEnterprise) return true;
      return packKeys.includes(packKey);
    },
    primaryPackColor: () => {
      const primaryPack = resolvedPacks.find(p => INDUSTRY_PACKS[p.key]);
      return primaryPack?.color_hex || "#2563EB";
    },
  };
}

/**
 * Returns whether a given plan allows a specific module.
 * Used by subscriptionGate backend function.
 */
export function planAllowsModule(planKey, moduleKey) {
  const plan = SUBSCRIPTION_PLANS[planKey];
  if (!plan) return false;
  if (plan.allowed_modules.includes("all")) return true;
  return plan.allowed_modules.includes(moduleKey);
}

/**
 * Returns whether a given plan allows a specific pack.
 */
export function planAllowsPack(planKey, packKey) {
  const plan = SUBSCRIPTION_PLANS[planKey];
  if (!plan) return false;
  if (plan.allowed_packs.includes("all")) return true;
  return false; // Pack access is tenant-specific, not plan-wide below Enterprise
}