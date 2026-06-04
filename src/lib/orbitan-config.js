// ============================================================
// ORBITAN & ORBITANOS — PLATFORM CONFIGURATION
// Created by Muhammad Firdaus Bin Ismail
// © 2024–2026 Orbitan & OrbitanOS. All Rights Reserved.
// Unauthorised reproduction or distribution is prohibited.
// ============================================================

export const PLATFORM_IDENTITY = {
  creator: "Muhammad Firdaus Bin Ismail",
  platform: "Orbitan",
  os: "OrbitanOS",
  version: "1.0.0",
  tagline: "One Operating System for Workforce, Operations & Growth.",
  copyright: `© ${new Date().getFullYear()} Orbitan & OrbitanOS. Created by Muhammad Firdaus Bin Ismail. All Rights Reserved.`,
  strategic_partner: "Hamka — Renewed Resources Pte Ltd",
};

export const SUBSCRIPTION_PLANS = {
  orbitan_starter: {
    key: "orbitan_starter",
    name: "Orbitan Starter",
    price_sgd: 49,
    max_employees: 10,
    allowed_modules: ["workforce", "task", "reporting"],
    allowed_packs: [],
    description: "For small businesses, single outlet",
    color: "slate",
  },
  orbitan_growth: {
    key: "orbitan_growth",
    name: "Orbitan Growth",
    price_sgd: 149,
    max_employees: 50,
    allowed_modules: ["workforce", "task", "reporting", "inventory", "scheduling"],
    allowed_packs: ["one_pack"],
    description: "For growing businesses, multiple outlets",
    color: "blue",
  },
  orbitan_business: {
    key: "orbitan_business",
    name: "Orbitan Business",
    price_sgd: 399,
    max_employees: 250,
    allowed_modules: ["workforce", "task", "reporting", "inventory", "procurement", "scheduling", "compliance", "sales_invoice", "finance_integration"],
    allowed_packs: ["multiple_packs"],
    description: "For established organisations, multi-site",
    color: "purple",
  },
  orbitan_enterprise: {
    key: "orbitan_enterprise",
    name: "Orbitan Enterprise",
    price_sgd: null,
    max_employees: null,
    allowed_modules: ["all"],
    allowed_packs: ["all"],
    description: "Custom pricing — large organisations",
    color: "amber",
  },
};

export const MODULES = {
  workforce: { key: "workforce", name: "Workforce Module", icon: "Users", description: "Employee management, roles & departments" },
  scheduling: { key: "scheduling", name: "Scheduling Module", icon: "Calendar", description: "Shift scheduling and attendance tracking" },
  task: { key: "task", name: "Task Module", icon: "CheckSquare", description: "Task assignment and completion tracking" },
  inventory: { key: "inventory", name: "Inventory Module", icon: "Package", description: "Stock management and replenishment" },
  procurement: { key: "procurement", name: "Procurement Module", icon: "ShoppingCart", description: "Purchase orders and supplier management" },
  sales_invoice: { key: "sales_invoice", name: "Sales & Invoice Module", icon: "FileText", description: "Sales invoicing and daily reconciliation" },
  reporting: { key: "reporting", name: "Reporting Module", icon: "BarChart2", description: "Analytics and performance dashboards" },
  compliance: { key: "compliance", name: "Compliance Module", icon: "Shield", description: "Regulatory and audit management" },
  finance_integration: { key: "finance_integration", name: "Finance Integration Module", icon: "Link", description: "Xero and accounting sync" },
  training: { key: "training", name: "Training Module", icon: "BookOpen", description: "Staff training and certifications" },
  knowledge: { key: "knowledge", name: "Knowledge Module", icon: "Archive", description: "SOPs and knowledge base" },
  customer_management: { key: "customer_management", name: "Customer Management Module", icon: "UserCheck", description: "Customer profiles and purchase history" },
};

export const INDUSTRY_PACKS = {
  fnb: { key: "fnb", name: "F&B Pack", industry: "food_beverage", color: "amber", description: "Food & Beverage operations", modules: ["inventory", "procurement", "sales_invoice", "workforce", "task", "compliance", "finance_integration", "scheduling"] },
  recycling: { key: "recycling", name: "Recycling & Sustainability Pack", industry: "recycling_sustainability", color: "green", description: "Recycling and sustainability workflows", modules: ["inventory", "procurement", "compliance", "reporting", "workforce", "task"] },
  retail: { key: "retail", name: "Retail Pack", industry: "retail", color: "purple", description: "Retail operations and sales", modules: ["inventory", "sales_invoice", "reporting", "procurement", "workforce", "task", "customer_management"] },
  healthcare: { key: "healthcare", name: "Healthcare Pack", industry: "healthcare", color: "blue", description: "Healthcare workforce and compliance" },
  education: { key: "education", name: "Education Pack", industry: "education", color: "blue", description: "Campus and education operations" },
  events: { key: "events", name: "Events Pack", industry: "events_activations", color: "purple", description: "Events and brand activations" },
  logistics: { key: "logistics", name: "Logistics Pack", industry: "logistics", color: "slate", description: "Logistics and supply chain" },
  facilities: { key: "facilities", name: "Facilities Management Pack", industry: "facilities_management", color: "amber", description: "Facilities and property management" },
};

export const INDUSTRY_LABELS = {
  food_beverage: "Food & Beverage",
  recycling_sustainability: "Recycling & Sustainability",
  retail: "Retail",
  healthcare: "Healthcare",
  education: "Education",
  logistics: "Logistics",
  events_activations: "Events & Activations",
  technology_software: "Technology & Software",
  facilities_management: "Facilities Management",
  other: "Other",
};

export const ROLE_ROUTES = {
  platform_owner: "/leader-org",
  tenant_admin: "/company",
  client_manager: "/client",
  outlet_manager: "/outlet",
  worker: "/worker",
};