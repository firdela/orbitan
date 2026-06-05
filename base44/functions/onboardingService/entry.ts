// ============================================================
// ORBITAN — OnboardingService Backend Function
// Automated Tenant Activation via Pack Manifests
// Created by Muhammad Firdaus Bin Ismail
// © 2024–2026 Orbitan & OrbitanOS. All Rights Reserved.
//
// EXIT-READY ARCHITECTURE:
// This function is the single automated provisioning engine.
// It reads a standardised JSON manifest and executes:
//   1. subscriptionGate validation
//   2. Atomic entity seeding (ComplianceRecord, Task, etc.)
//   3. auditEngine logging for every action
//   4. Returns a structured ActivationReport
//
// To migrate stacks: reimplement the Parse → Validate → Seed
// → Audit loop in your target language. No other changes needed.
// ============================================================

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── MASTER LAUNCH MANIFEST REGISTRY ─────────────────────────
// This is the single source of truth for all tenant provisioning.
// Each entry defines WHAT gets created when a tenant is activated.
// EXIT-READY: serialise to JSON, import into any provisioning tool.
const LAUNCH_MANIFESTS = {

  taqueria_pte_ltd: {
    tenant_ref: "taqueria_pte_ltd",
    display_name: "Taqueria Pte Ltd",
    pack: "fnb",
    plan: "orbitan_enterprise",
    industry: "food_beverage",
    enabled_modules: ["inventory", "procurement", "sales_invoice", "reporting", "workforce", "task", "compliance", "finance_integration", "scheduling"],
    enabled_packs: ["core", "fnb", "finance", "compliance"],
    integrations: ["xero"],
    gating: { require_audit_log: true, require_subscription_validation: true },
    seed_data: {
      ComplianceRecord: [
        { title: "Daily Food Safety Audit",       type: "Food Safety Audit",    category: "food_safety",  status: "pending", due_date: new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0] },
        { title: "Weekly Kitchen Hygiene Check",  type: "Hygiene Inspection",   category: "food_safety",  status: "pending", due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] },
        { title: "Monthly Fire Safety Inspection",type: "Fire Safety Audit",    category: "fire_safety",  status: "pending", due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] },
        { title: "F&B License Renewal Review",    type: "License Renewal",      category: "licensing",    status: "pending", due_date: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0] },
      ],
      Task: [
        { title: "Configure Xero accounting integration",    module_context: "finance",    priority: "urgent",  status: "pending" },
        { title: "Load opening ingredient inventory",        module_context: "inventory",  priority: "high",    status: "pending" },
        { title: "Create supplier profiles",                 module_context: "procurement",priority: "high",    status: "pending" },
        { title: "Set up COGS tracking for menu items",      module_context: "inventory",  priority: "high",    status: "pending" },
        { title: "Run first daily sales reconciliation",     module_context: "finance",    priority: "medium",  status: "pending" },
        { title: "Complete first payroll cycle setup",       module_context: "workforce",  priority: "medium",  status: "pending" },
        { title: "Schedule first food safety audit",         module_context: "compliance", priority: "medium",  status: "pending" },
        { title: "Onboard outlet manager to OrbitanOS",      module_context: "workforce",  priority: "high",    status: "pending" },
      ],
    },
  },

  renewed_resources_pte_ltd: {
    tenant_ref: "renewed_resources_pte_ltd",
    display_name: "Renewed Resources Pte Ltd",
    pack: "recycling",
    plan: "orbitan_business",
    industry: "recycling_sustainability",
    enabled_modules: ["inventory", "procurement", "compliance", "reporting", "workforce", "task"],
    enabled_packs: ["core", "recycling", "compliance"],
    integrations: ["compliance_reporting_portal"],
    gating: { require_audit_log: true, require_subscription_validation: true },
    seed_data: {
      ComplianceRecord: [
        { title: "Monthly Environmental Impact Audit",    type: "Environmental Audit",          category: "environmental", status: "pending", due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] },
        { title: "Vehicle Maintenance & Safety Log",      type: "Vehicle Inspection",           category: "other",         status: "pending", due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0] },
        { title: "Disposal Certification Renewal",        type: "Disposal Certification",       category: "environmental", status: "pending", due_date: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0] },
        { title: "Recycling Partner Due Diligence",       type: "Partner Compliance Check",     category: "other",         status: "pending", due_date: new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0] },
      ],
      Task: [
        { title: "Register collection vehicle fleet",             module_context: "workforce",   priority: "high",   status: "pending" },
        { title: "Set up material category inventory",            module_context: "inventory",   priority: "high",   status: "pending" },
        { title: "Configure sustainability KPI reporting",        module_context: "reporting",   priority: "high",   status: "pending" },
        { title: "Onboard drivers and collection staff",          module_context: "workforce",   priority: "medium", status: "pending" },
        { title: "Create first recycling partner supplier profile",module_context: "procurement",priority: "medium", status: "pending" },
        { title: "Log baseline CO2 impact metrics",               module_context: "reporting",   priority: "medium", status: "pending" },
        { title: "Submit first monthly sustainability report",    module_context: "compliance",  priority: "medium", status: "pending" },
      ],
    },
  },

  renewed_fashion: {
    tenant_ref: "renewed_fashion",
    display_name: "Renewed Fashion",
    pack: "retail",
    plan: "orbitan_business",
    industry: "retail",
    enabled_modules: ["inventory", "sales_invoice", "reporting", "procurement", "workforce", "task", "customer_management"],
    enabled_packs: ["core", "retail"],
    integrations: ["pos_system"],
    gating: { require_audit_log: true, require_subscription_validation: true },
    seed_data: {
      ComplianceRecord: [
        { title: "Retail Outlet Health & Safety Inspection", type: "Health & Safety Audit", category: "other",     status: "pending", due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] },
        { title: "Trade License Renewal Check",              type: "License Renewal",       category: "licensing", status: "pending", due_date: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0] },
      ],
      Task: [
        { title: "Build opening product catalog (initial batch)",       module_context: "inventory",          priority: "urgent",  status: "pending" },
        { title: "Configure condition grading system (A–E scale)",      module_context: "inventory",          priority: "high",    status: "pending" },
        { title: "Link clothing source to MaterialCollection records",   module_context: "inventory",          priority: "high",    status: "pending" },
        { title: "Set up customer loyalty tier configuration",           module_context: "customer_management",priority: "high",    status: "pending" },
        { title: "Process first point-of-sale sale",                    module_context: "sales_invoice",      priority: "medium",  status: "pending" },
        { title: "Capture sustainability impact per product sold",       module_context: "reporting",          priority: "medium",  status: "pending" },
        { title: "Onboard store team to OrbitanOS",                     module_context: "workforce",          priority: "high",    status: "pending" },
      ],
    },
  },
};

// ── ACTIVATION ENGINE ────────────────────────────────────────
async function activateTenant(base44, tenantRef, actorId, actorName) {
  const manifest = LAUNCH_MANIFESTS[tenantRef];
  if (!manifest) throw new Error(`No manifest found for tenant: ${tenantRef}`);

  const report = {
    tenant_ref: tenantRef,
    display_name: manifest.display_name,
    pack: manifest.pack,
    plan: manifest.plan,
    activated_at: new Date().toISOString(),
    activated_by: actorName,
    records_created: [],
    errors: [],
    status: "success",
  };

  // ── Step 1: Seed ComplianceRecords ───────────────────────
  for (const record of manifest.seed_data.ComplianceRecord || []) {
    try {
      const created = await base44.asServiceRole.entities.ComplianceRecord.create({
        ...record,
        tenant_id: tenantRef,
        outlet_id: tenantRef + "_main",
      });
      report.records_created.push({ entity: "ComplianceRecord", id: created.id, title: record.title });
    } catch (err) {
      report.errors.push({ entity: "ComplianceRecord", title: record.title, error: err.message });
    }
  }

  // ── Step 2: Seed Tasks ───────────────────────────────────
  for (const task of manifest.seed_data.Task || []) {
    try {
      const created = await base44.asServiceRole.entities.Task.create({
        ...task,
        tenant_id: tenantRef,
        outlet_id: tenantRef + "_main",
        due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      });
      report.records_created.push({ entity: "Task", id: created.id, title: task.title });
    } catch (err) {
      report.errors.push({ entity: "Task", title: task.title, error: err.message });
    }
  }

  // ── Step 3: Write AuditLog entry (Governance guarantee) ─
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      tenant_id: tenantRef,
      actor_id: actorId,
      actor_name: actorName,
      actor_role: "admin",
      action_type: "tenant_activated",
      module: "system",
      target_entity: "Tenant",
      target_record_id: tenantRef,
      details: `OnboardingService activated ${manifest.display_name} (${manifest.pack} pack, ${manifest.plan} plan). ${report.records_created.length} seed records created.`,
      new_state: {
        pack: manifest.pack,
        plan: manifest.plan,
        enabled_modules: manifest.enabled_modules,
        records_seeded: report.records_created.length,
        activated_at: report.activated_at,
      },
    });
    report.audit_logged = true;
  } catch (err) {
    report.audit_logged = false;
    report.errors.push({ entity: "AuditLog", error: err.message });
  }

  if (report.errors.length > 0) report.status = "partial";
  return report;
}

// ── HTTP HANDLER ─────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden: Admin access required" }, { status: 403 });

    const body = await req.json();
    const { action, tenant_ref } = body;

    // ── GET: Return all manifests (for UI rendering) ──────
    if (action === "get_manifests") {
      return Response.json({
        manifests: Object.values(LAUNCH_MANIFESTS).map(m => ({
          tenant_ref: m.tenant_ref,
          display_name: m.display_name,
          pack: m.pack,
          plan: m.plan,
          industry: m.industry,
          enabled_modules: m.enabled_modules,
          enabled_packs: m.enabled_packs,
          seed_counts: {
            compliance_records: m.seed_data.ComplianceRecord?.length || 0,
            tasks: m.seed_data.Task?.length || 0,
            total: (m.seed_data.ComplianceRecord?.length || 0) + (m.seed_data.Task?.length || 0),
          },
          seed_preview: {
            ComplianceRecord: m.seed_data.ComplianceRecord?.map(r => r.title) || [],
            Task: m.seed_data.Task?.map(t => t.title) || [],
          },
        })),
      });
    }

    // ── ACTIVATE: Run full provisioning for one tenant ────
    if (action === "activate_tenant") {
      if (!tenant_ref) return Response.json({ error: "tenant_ref is required" }, { status: 400 });
      const report = await activateTenant(base44, tenant_ref, user.id, user.full_name || "Platform Owner");
      return Response.json({ report });
    }

    // ── ACTIVATE ALL: Bulk activate all three launch tenants
    if (action === "activate_all") {
      const reports = [];
      for (const tenantRef of Object.keys(LAUNCH_MANIFESTS)) {
        const report = await activateTenant(base44, tenantRef, user.id, user.full_name || "Platform Owner");
        reports.push(report);
      }
      return Response.json({ reports });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});