// ============================================================
// ORBITAN — ONBOARDING MANIFEST REGISTRY
// Single Source of Truth for all Tenant Launch Blueprints
// Created by Muhammad Firdaus Bin Ismail
// © 2024–2026 Orbitan & OrbitanOS. All Rights Reserved.
//
// EXIT-READY ARCHITECTURE:
// This file is pure data — zero logic, zero framework dependencies.
// Manifest = "Who + What" (identity, pack, seed data, AI docs)
// onboardingService = "How" (execution engine)
//
// To add a new tenant: add one object here. That's it.
// To add a new industry: define it in orbitan-config.js first.
//
// Migrating stacks: copy this file, rebuild the engine.
// ============================================================

/**
 * LAUNCH_MANIFESTS — Canonical Tenant Blueprints
 *
 * Each manifest describes:
 *   - Identity (tenant_ref, display_name, pack, plan, industry)
 *   - Structure (tenant_name, outlet_name, enabled_modules, enabled_packs)
 *   - Seed Data (ComplianceRecord, Task — created on activation)
 *   - AI Documents (sop, compliance_checklist, shift_brief — generated on activation)
 *
 * The onboardingService engine reads a manifest and executes:
 *   1. Entity seeding (parallel)
 *   2. AI document generation (parallel)
 *   3. Audit logging
 */
export const LAUNCH_MANIFESTS = {

  // ── Taqueria Pte Ltd — La Birria Tacos (F&B · Enterprise) ──
  taqueria_pte_ltd: {
    tenant_ref: "taqueria_pte_ltd",
    display_name: "Taqueria Pte Ltd",
    pack: "fnb",
    plan: "orbitan_enterprise",
    industry: "food_beverage",
    tenant_name: "Taqueria Pte Ltd",
    outlet_name: "La Birria Tacos (North Bridge Rd)",
    enabled_modules: [
      "inventory", "procurement", "sales_invoice", "reporting",
      "workforce", "task", "compliance", "finance_integration", "scheduling"
    ],
    enabled_packs: ["core", "fnb", "finance", "compliance"],
    integrations: ["xero"],
    gating: { require_audit_log: true, require_subscription_validation: true },
    seed_data: {
      ComplianceRecord: [
        { title: "Daily Food Safety Audit",        type: "Food Safety Audit",    category: "food_safety",  status: "pending" },
        { title: "Weekly Kitchen Hygiene Check",   type: "Hygiene Inspection",   category: "food_safety",  status: "pending" },
        { title: "Monthly Fire Safety Inspection", type: "Fire Safety Audit",    category: "fire_safety",  status: "pending" },
        { title: "F&B License Renewal Review",     type: "License Renewal",      category: "licensing",    status: "pending" },
      ],
      Task: [
        { title: "Configure Xero accounting integration",    module_context: "finance",     priority: "urgent",  status: "pending" },
        { title: "Load opening ingredient inventory",        module_context: "inventory",   priority: "high",    status: "pending" },
        { title: "Create supplier profiles",                 module_context: "procurement", priority: "high",    status: "pending" },
        { title: "Set up COGS tracking for menu items",      module_context: "inventory",   priority: "high",    status: "pending" },
        { title: "Run first daily sales reconciliation",     module_context: "finance",     priority: "medium",  status: "pending" },
        { title: "Complete first payroll cycle setup",       module_context: "workforce",   priority: "medium",  status: "pending" },
        { title: "Schedule first food safety audit",         module_context: "compliance",  priority: "medium",  status: "pending" },
        { title: "Onboard outlet manager to OrbitanOS",      module_context: "workforce",   priority: "high",    status: "pending" },
      ],
    },
    ai_documents: [
      { document_type: "sop",                  title: "Daily Food Safety & Kitchen Operations SOP" },
      { document_type: "compliance_checklist", title: "Daily Food Safety Inspection Checklist" },
      { document_type: "shift_brief",          title: "Opening Shift Brief — La Birria Tacos" },
    ],
  },

  // ── Renewed Resources Pte Ltd (Recycling · Business) ──
  renewed_resources_pte_ltd: {
    tenant_ref: "renewed_resources_pte_ltd",
    display_name: "Renewed Resources Pte Ltd",
    pack: "recycling",
    plan: "orbitan_business",
    industry: "recycling_sustainability",
    tenant_name: "Renewed Resources Pte Ltd",
    outlet_name: null,
    enabled_modules: [
      "inventory", "procurement", "compliance", "reporting", "workforce", "task"
    ],
    enabled_packs: ["core", "recycling", "compliance"],
    integrations: ["compliance_reporting_portal"],
    gating: { require_audit_log: true, require_subscription_validation: true },
    seed_data: {
      ComplianceRecord: [
        { title: "Monthly Environmental Impact Audit",    type: "Environmental Audit",      category: "environmental", status: "pending" },
        { title: "Vehicle Maintenance & Safety Log",      type: "Vehicle Inspection",       category: "other",         status: "pending" },
        { title: "Disposal Certification Renewal",        type: "Disposal Certification",   category: "environmental", status: "pending" },
        { title: "Recycling Partner Due Diligence",       type: "Partner Compliance Check", category: "other",         status: "pending" },
      ],
      Task: [
        { title: "Register collection vehicle fleet",              module_context: "workforce",    priority: "high",   status: "pending" },
        { title: "Set up material category inventory",             module_context: "inventory",    priority: "high",   status: "pending" },
        { title: "Configure sustainability KPI reporting",         module_context: "reporting",    priority: "high",   status: "pending" },
        { title: "Onboard drivers and collection staff",           module_context: "workforce",    priority: "medium", status: "pending" },
        { title: "Create first recycling partner supplier profile",module_context: "procurement",  priority: "medium", status: "pending" },
        { title: "Log baseline CO2 impact metrics",                module_context: "reporting",    priority: "medium", status: "pending" },
        { title: "Submit first monthly sustainability report",     module_context: "compliance",   priority: "medium", status: "pending" },
      ],
    },
    ai_documents: [
      { document_type: "sop",                  title: "Material Collection & Processing SOP" },
      { document_type: "compliance_checklist", title: "Monthly Environmental Compliance Checklist" },
    ],
  },

  // ── Izaliqa Bakes (F&B · Starter · HBB) ──
  izaliqa_bakes: {
    tenant_ref: "izaliqa_bakes",
    display_name: "Izaliqa Bakes",
    pack: "fnb",
    plan: "orbitan_starter",
    industry: "food_beverage",
    tenant_name: "Izaliqa Bakes",
    outlet_name: "Primary Home Operation",
    enabled_modules: ["task", "inventory", "sales_invoice"],
    enabled_packs: ["core", "fnb"],
    integrations: [],
    gating: { require_audit_log: true, require_subscription_validation: true },
    is_virtual: true,
    status: "onboarding",
    notes: "Home-Based Business (HBB). Operates from home — festive cookies, seasonal baked goods. Seamless migration path to standard F&B structure on growth.",
    seed_data: {
      ComplianceRecord: [
        { title: "Home Kitchen Food Safety Check",    type: "Food Safety Audit",   category: "food_safety", status: "pending" },
        { title: "Monthly Hygiene & Cleanliness Log", type: "Hygiene Inspection",  category: "food_safety", status: "pending" },
      ],
      Task: [
        { title: "Set up product menu & price list",        module_context: "inventory",    priority: "high",   status: "pending" },
        { title: "Record opening inventory of ingredients", module_context: "inventory",    priority: "high",   status: "pending" },
        { title: "Log first sales order",                  module_context: "sales_invoice", priority: "medium", status: "pending" },
        { title: "Configure order tracking tasks",         module_context: "task",          priority: "medium", status: "pending" },
        { title: "Onboard to OrbitanOS Starter Plan",      module_context: "workforce",     priority: "high",   status: "pending" },
      ],
    },
    ai_documents: [
      { document_type: "sop",         title: "Home Bakery Operations & Food Safety SOP" },
      { document_type: "shift_brief", title: "Daily Baking Session Brief — Izaliqa Bakes" },
    ],
  },

  // ── Renewed Fashion (Retail · Starter · Planning) ──
  renewed_fashion: {
    tenant_ref: "renewed_fashion",
    display_name: "Renewed Fashion",
    pack: "retail",
    plan: "orbitan_starter",
    industry: "retail",
    tenant_name: "Renewed Fashion",
    outlet_name: null,
    enabled_modules: [
      "inventory", "sales_invoice", "reporting", "procurement",
      "workforce", "task", "customer_management"
    ],
    enabled_packs: ["core", "retail"],
    integrations: [],
    gating: { require_audit_log: true, require_subscription_validation: true },
    status: "onboarding",
    notes: "Not yet incorporated. In planning & development. Future focus: upcycled & sustainable clothing.",
    seed_data: {
      ComplianceRecord: [],
      Task: [
        { title: "Define brand identity and target market",      module_context: "workforce", priority: "high",   status: "pending" },
        { title: "Plan product sourcing & grading strategy",     module_context: "inventory", priority: "high",   status: "pending" },
        { title: "Draft initial outlet concept and location",    module_context: "workforce", priority: "medium", status: "pending" },
      ],
    },
    ai_documents: [],
  },
};

/**
 * Returns all manifests as a flat array (for UI rendering).
 */
export function getManifestList() {
  return Object.values(LAUNCH_MANIFESTS).map(m => ({
    tenant_ref: m.tenant_ref,
    display_name: m.display_name,
    pack: m.pack,
    plan: m.plan,
    industry: m.industry,
    tenant_name: m.tenant_name,
    outlet_name: m.outlet_name,
    enabled_modules: m.enabled_modules,
    enabled_packs: m.enabled_packs,
    seed_counts: {
      compliance_records: m.seed_data.ComplianceRecord?.length || 0,
      tasks: m.seed_data.Task?.length || 0,
      ai_documents: m.ai_documents?.length || 0,
      total: (m.seed_data.ComplianceRecord?.length || 0) + (m.seed_data.Task?.length || 0),
    },
    seed_preview: {
      ComplianceRecord: m.seed_data.ComplianceRecord?.map(r => r.title) || [],
      Task: m.seed_data.Task?.map(t => t.title) || [],
      AIDocument: m.ai_documents?.map(d => ({ title: d.title, document_type: d.document_type })) || [],
    },
  }));
}

/**
 * Get a single manifest by tenant_ref.
 */
export function getManifest(tenantRef) {
  return LAUNCH_MANIFESTS[tenantRef] || null;
}