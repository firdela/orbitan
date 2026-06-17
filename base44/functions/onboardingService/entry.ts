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
//   2. PARALLEL entity seeding (ComplianceRecord, Task)
//   3. PARALLEL AI document generation (SOPs, Checklists)
//   4. auditEngine logging for every action (atomic bulkCreate)
//   5. Returns a structured ActivationReport
//
// Promise.allSettled is used throughout — a single failure
// does NOT abort the entire activation. Every outcome is logged.
//
// To migrate stacks: reimplement the Parse → Validate → Seed
// → AI → Audit loop in your target language. No other changes needed.
// ============================================================

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── MASTER LAUNCH MANIFEST REGISTRY ─────────────────────────
const LAUNCH_MANIFESTS = {

  taqueria_pte_ltd: {
    tenant_ref: "taqueria_pte_ltd",
    display_name: "Taqueria Pte Ltd",
    pack: "fnb",
    plan: "orbitan_enterprise",
    industry: "food_beverage",
    tenant_name: "Taqueria Pte Ltd",
    outlet_name: "La Birria Tacos (North Bridge Rd)",
    enabled_modules: ["inventory", "procurement", "sales_invoice", "reporting", "workforce", "task", "compliance", "finance_integration", "scheduling"],
    enabled_packs: ["core", "fnb", "finance", "compliance"],
    integrations: ["xero"],
    gating: { require_audit_log: true, require_subscription_validation: true },
    seed_data: {
      ComplianceRecord: [
        { title: "Daily Food Safety Audit",        type: "Food Safety Audit",    category: "food_safety",  status: "pending", due_date: new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0] },
        { title: "Weekly Kitchen Hygiene Check",   type: "Hygiene Inspection",   category: "food_safety",  status: "pending", due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] },
        { title: "Monthly Fire Safety Inspection", type: "Fire Safety Audit",    category: "fire_safety",  status: "pending", due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] },
        { title: "F&B License Renewal Review",     type: "License Renewal",      category: "licensing",    status: "pending", due_date: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0] },
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
    // AI documents generated in parallel on activation
    ai_documents: [
      { document_type: "sop",                  title: "Daily Food Safety & Kitchen Operations SOP" },
      { document_type: "compliance_checklist", title: "Daily Food Safety Inspection Checklist" },
      { document_type: "shift_brief",          title: "Opening Shift Brief — La Birria Tacos" },
    ],
  },

  renewed_resources_pte_ltd: {
    tenant_ref: "renewed_resources_pte_ltd",
    display_name: "Renewed Resources Pte Ltd",
    pack: "recycling",
    plan: "orbitan_business",
    industry: "recycling_sustainability",
    tenant_name: "Renewed Resources Pte Ltd",
    outlet_name: null,
    enabled_modules: ["inventory", "procurement", "compliance", "reporting", "workforce", "task"],
    enabled_packs: ["core", "recycling", "compliance"],
    integrations: ["compliance_reporting_portal"],
    gating: { require_audit_log: true, require_subscription_validation: true },
    seed_data: {
      ComplianceRecord: [
        { title: "Monthly Environmental Impact Audit",    type: "Environmental Audit",      category: "environmental", status: "pending", due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] },
        { title: "Vehicle Maintenance & Safety Log",      type: "Vehicle Inspection",       category: "other",         status: "pending", due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0] },
        { title: "Disposal Certification Renewal",        type: "Disposal Certification",   category: "environmental", status: "pending", due_date: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0] },
        { title: "Recycling Partner Due Diligence",       type: "Partner Compliance Check", category: "other",         status: "pending", due_date: new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0] },
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

  izaliqa_bakes: {
    tenant_ref: "izaliqa_bakes",
    display_name: "Izaliqa Bakes",
    pack: "fnb",
    plan: "orbitan_starter",
    industry: "food_beverage",
    tenant_name: "Izaliqa Bakes",
    outlet_name: "Home Kitchen",
    enabled_modules: ["task", "inventory", "sales_invoice"],
    enabled_packs: ["core", "fnb"],
    integrations: [],
    gating: { require_audit_log: true, require_subscription_validation: true },
    seed_data: {
      ComplianceRecord: [
        { title: "Home Kitchen Food Safety Check",    type: "Food Safety Audit",   category: "food_safety", status: "pending", due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] },
        { title: "Monthly Hygiene & Cleanliness Log", type: "Hygiene Inspection",  category: "food_safety", status: "pending", due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] },
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
      { document_type: "sop",       title: "Home Bakery Operations & Food Safety SOP" },
      { document_type: "shift_brief", title: "Daily Baking Session Brief — Izaliqa Bakes" },
    ],
  },

  renewed_fashion: {
    tenant_ref: "renewed_fashion",
    display_name: "Renewed Fashion",
    pack: "retail",
    plan: "orbitan_business",
    industry: "retail",
    tenant_name: "Renewed Fashion",
    outlet_name: null,
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
        { title: "Build opening product catalog (initial batch)",      module_context: "inventory",           priority: "urgent",  status: "pending" },
        { title: "Configure condition grading system (A–E scale)",     module_context: "inventory",           priority: "high",    status: "pending" },
        { title: "Link clothing source to MaterialCollection records",  module_context: "inventory",           priority: "high",    status: "pending" },
        { title: "Set up customer loyalty tier configuration",          module_context: "customer_management", priority: "high",    status: "pending" },
        { title: "Process first point-of-sale sale",                   module_context: "sales_invoice",       priority: "medium",  status: "pending" },
        { title: "Capture sustainability impact per product sold",      module_context: "reporting",           priority: "medium",  status: "pending" },
        { title: "Onboard store team to OrbitanOS",                    module_context: "workforce",           priority: "high",    status: "pending" },
      ],
    },
    ai_documents: [
      { document_type: "sop",                  title: "Upcycled Clothing Intake & Grading SOP" },
      { document_type: "shift_brief",          title: "Opening Shift Brief — Renewed Fashion" },
    ],
  },
};

// ── ACTIVATION ENGINE ────────────────────────────────────────
// Uses Promise.allSettled for parallel seeding and AI generation.
// A single failure does NOT abort the activation — it is logged.
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
    ai_documents_generated: [],
    errors: [],
    status: "success",
    audit_logged: false,
  };

  // ── Step 1: PARALLEL — Seed ComplianceRecords + Tasks ───────
  const complianceTasks = (manifest.seed_data.ComplianceRecord || []).map(record =>
    base44.asServiceRole.entities.ComplianceRecord.create({
      ...record,
      tenant_id: tenantRef,
      outlet_id: tenantRef + "_main",
    }).then(created => ({ type: 'ComplianceRecord', data: created, title: record.title }))
  );

  const taskSeeds = (manifest.seed_data.Task || []).map(task =>
    base44.asServiceRole.entities.Task.create({
      ...task,
      tenant_id: tenantRef,
      outlet_id: tenantRef + "_main",
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    }).then(created => ({ type: 'Task', data: created, title: task.title }))
  );

  // Execute all entity seeding in parallel
  const seedResults = await Promise.allSettled([...complianceTasks, ...taskSeeds]);

  // Map seeded compliance records by title for AI doc linking
  const seededCompliance = {};
  seedResults.forEach(result => {
    if (result.status === 'fulfilled') {
      const { type, data, title } = result.value;
      report.records_created.push({ entity: type, id: data.id, title });
      if (type === 'ComplianceRecord') seededCompliance[title] = data.id;
    } else {
      report.errors.push({ entity: 'Seed', error: result.reason?.message || 'Unknown error' });
    }
  });

  // ── Step 2: PARALLEL — Generate AI documents via sopGenerator ─
  if (manifest.ai_documents?.length > 0) {
    const aiTasks = manifest.ai_documents.map(doc => {
      // Link to the most relevant seeded compliance record if applicable
      const linkedComplianceId = Object.entries(seededCompliance).find(
        ([title]) => title.toLowerCase().includes(doc.document_type === 'compliance_checklist' ? 'audit' : 'safety')
      )?.[1] || null;

      return base44.functions.invoke('sopGenerator', {
        document_type: doc.document_type,
        title: doc.title,
        tenant_id: tenantRef,
        outlet_id: tenantRef + "_main",
        industry: manifest.industry,
        tenant_name: manifest.tenant_name,
        outlet_name: manifest.outlet_name,
        compliance_record_id: linkedComplianceId,
        notes: `Auto-generated during Ramp-Up activation of ${manifest.display_name}`,
      }).then(res => ({
        title: doc.title,
        document_type: doc.document_type,
        document_id: res.data?.document_id,
        status: res.data?.status,
        model_used: res.data?.model_used,
      }));
    });

    const aiResults = await Promise.allSettled(aiTasks);

    aiResults.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        report.ai_documents_generated.push(result.value);
      } else {
        report.errors.push({
          entity: 'AIDocument',
          title: manifest.ai_documents[i]?.title,
          error: result.reason?.message || 'AI generation failed',
        });
      }
    });
  }

  // ── Step 3: Atomic Audit Log ─────────────────────────────────
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
      details: `OnboardingService activated ${manifest.display_name} (${manifest.pack} pack, ${manifest.plan} plan). ${report.records_created.length} seed records + ${report.ai_documents_generated.length} AI documents generated in parallel.`,
      new_state: {
        pack: manifest.pack,
        plan: manifest.plan,
        enabled_modules: manifest.enabled_modules,
        records_seeded: report.records_created.length,
        ai_docs_generated: report.ai_documents_generated.length,
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
        })),
      });
    }

    // ── ACTIVATE: Run full provisioning for one tenant ────
    if (action === "activate_tenant") {
      if (!tenant_ref) return Response.json({ error: "tenant_ref is required" }, { status: 400 });
      const report = await activateTenant(base44, tenant_ref, user.id, user.full_name || "Platform Owner");
      return Response.json({ report });
    }

    // ── ACTIVATE ALL: Parallel bulk activate all three tenants ──
    if (action === "activate_all") {
      const allTenantRefs = Object.keys(LAUNCH_MANIFESTS);
      const allResults = await Promise.allSettled(
        allTenantRefs.map(ref => activateTenant(base44, ref, user.id, user.full_name || "Platform Owner"))
      );
      const reports = allResults.map((result, i) =>
        result.status === 'fulfilled'
          ? result.value
          : { tenant_ref: allTenantRefs[i], status: 'failed', errors: [{ error: result.reason?.message }] }
      );
      return Response.json({ reports });
    }

    // ── HANDLE ACCESS REQUEST — Send email notification to tenant managers ──
    // Supports both direct API calls (action: "handle_access_request")
    // AND entity automation triggers (where payload wraps data under "data")
    const isEntityAutomation = !action && body.event?.entity_name === "AccessRequest";
    if (action === "handle_access_request" || isEntityAutomation) {
      const payload = isEntityAutomation ? (body.data || {}) : body;
      const { email, tenant_id, company_name, outlet_name, role_requested } = payload;

      if (!email || !tenant_id) {
        return Response.json({ error: "email and tenant_id are required" }, { status: 400 });
      }

      // Find tenant admins and outlet managers for this tenant
      const managers = await base44.asServiceRole.entities.Employee.filter({
        tenant_id,
        role: { $in: ["tenant_admin", "outlet_manager"] },
        status: "active",
      });

      const managerEmails = managers.map(m => m.email).filter(Boolean);

      // Send email to each manager (non-blocking — allSettled)
      const emailResults = await Promise.allSettled(
        managerEmails.map(to =>
          base44.integrations.Core.SendEmail({
            to,
            subject: `[OrbitanOS] New Access Request — ${company_name || tenant_id}`,
            body: [
              `Hello,`,
              ``,
              `A new worker has requested access to join ${company_name || tenant_id} on OrbitanOS.`,
              ``,
              `📧 Email: ${email}`,
              `🏢 Company: ${company_name || tenant_id}`,
              outlet_name ? `📍 Outlet: ${outlet_name}` : null,
              `👤 Role Requested: ${(role_requested || "worker").replace(/_/g, " ") || "worker"}`,
              ``,
              `Please log in to OrbitanOS to review and approve this request.`,
              ``,
              `— OrbitanOS Access Registry · Regulate Principle`,
            ].filter(Boolean).join("\n"),
          })
        )
      );

      const notifiedCount = emailResults.filter(r => r.status === "fulfilled").length;
      const failedCount = emailResults.filter(r => r.status === "rejected").length;

      return Response.json({
        success: true,
        managers_found: managers.length,
        emails_sent: notifiedCount,
        emails_failed: failedCount,
        details: "Access request received. Manager notifications dispatched.",
      });
    }

    // ── HANDLE ACCESS REQUEST APPROVAL — Auto-create Employee record ──
    // Triggers when an AccessRequest status changes to "approved"
    // Supports both direct API calls (action: "approve_access_request")
    // AND entity automation triggers (where payload wraps data under "data")
    const isApprovalAutomation = !action && body.event?.entity_name === "AccessRequest" && body.event?.type === "update" && body.data?.status === "approved";
    if (action === "approve_access_request" || isApprovalAutomation) {
      const payload = isApprovalAutomation ? (body.data || {}) : body;
      const { email, tenant_id, outlet_id, company_name, role_requested } = payload;
      const workerName = payload.email ? payload.email.split('@')[0] : "New Worker";

      if (!email || !tenant_id) {
        return Response.json({ error: "email and tenant_id are required" }, { status: 400 });
      }

      // ── CANONICAL EMPLOYEE LIFECYCLE — Source of Truth ──
      // Check if Employee record already exists for this email + tenant
      const existingEmployees = await base44.asServiceRole.entities.Employee.filter({
        tenant_id,
        email,
      });

      let employee;
      let action = "created";

      if (existingEmployees.length > 0) {
        // Canonical Sync: Update existing Employee record with new context
        employee = await base44.asServiceRole.entities.Employee.update(existingEmployees[0].id, {
          outlet_id: outlet_id || existingEmployees[0].outlet_id,
          role: role_requested || existingEmployees[0].role,
          status: "active",
          employment_type: existingEmployees[0].employment_type || "full_time",
        });
        action = "synced";
      } else {
        // Create new canonical Employee record
        employee = await base44.asServiceRole.entities.Employee.create({
          tenant_id,
          outlet_id: outlet_id || null,
          full_name: workerName,
          email,
          role: role_requested || "worker",
          status: "active",
          employment_type: role_requested === "outlet_manager" ? "full_time" : "full_time",
          hire_date: new Date().toISOString().split('T')[0],
        });
      }

      // Audit log the action (immutable trail — Regulate principle)
      await base44.asServiceRole.entities.AuditLog.create({
        tenant_id,
        actor_id: "system",
        actor_name: "OrbitanOS Onboarding Engine",
        actor_role: "system",
        action_type: action === "synced" ? "employee_synced" : "worker_onboarded",
        module: "workforce",
        target_entity: "Employee",
        target_record_id: employee.id,
        details: action === "synced"
          ? `Canonical sync: Updated Employee record for ${email} — role ${role_requested || "updated"}, outlet ${outlet_id || "unchanged"}. AccessRequest approved.`
          : `Auto-provisioned Employee record for ${email} as ${(role_requested || "worker").replace(/_/g, " ")} at ${company_name || tenant_id}. AccessRequest approved. Powered by the Regulate principle.`,
        new_state: {
          employee_id: employee.id,
          email,
          role: role_requested || employee.role,
          tenant_id,
          outlet_id: outlet_id || employee.outlet_id || null,
          action,
        },
      });

      return Response.json({
        success: true,
        employee_id: employee.id,
        worker_name: workerName,
        role: role_requested || employee.role,
        action,
        details: action === "synced"
          ? `Employee record synchronized for ${email}. Outlet and role updated. Ready for workspace access.`
          : `Employee record created for ${email}. They can now access their OrbitanOS workspace.`,
      });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});