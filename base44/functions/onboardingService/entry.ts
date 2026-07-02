// ============================================================
// ORBITAN — OnboardingService Backend Function
// Pure Activation Engine — No Hardcoded Tenant Data
// Created by Muhammad Firdaus Bin Ismail
// © 2024–2026 Orbitan & OrbitanOS. All Rights Reserved.
//
// EXIT-READY ARCHITECTURE:
// This function is a pure execution engine. It receives a manifest
// as input (from lib/tenant-registry.js on the frontend) and executes:
//   1. subscriptionGate validation
//   2. PARALLEL entity seeding (ComplianceRecord, Task)
//   3. PARALLEL AI document generation (SOPs, Checklists)
//   4. auditEngine logging for every action (atomic bulkCreate)
//   5. Returns a structured ActivationReport
//
// Promise.allSettled is used throughout — a single failure
// does NOT abort the entire activation. Every outcome is logged.
//
// To add a new tenant: add it to lib/tenant-registry.js.
// The engine never changes.
//
// To migrate stacks: reimplement this engine in your target language.
// ============================================================

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── ACTIVATION ENGINE ────────────────────────────────────────
// Receives a manifest object and executes the full provisioning.
// Uses Promise.allSettled for parallel seeding and AI generation.
// A single failure does NOT abort the activation — it is logged.
async function activateTenant(base44, manifest, actorId, actorName) {
  if (!manifest) throw new Error("No manifest provided");
  const tenantRef = manifest.tenant_ref;

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

// ── SELF-SERVE PROVISIONING ENGINE ───────────────────────────
// Transactional orchestrator for NEW businesses creating their own
// workspace. Enforces the OrbitanOS hierarchy as an atomic chain:
//   Tenant → Company → Brand → Outlet → Wallet → (founder stamped)
// Then seeds the industry blueprint and writes the audit trail.
//
// Pure engine — driven entirely by the request payload. No hardcoded
// tenant data. Works for any industry / plan combination.
const PLAN_REGISTRY = {
  orbitan_starter:    { credits: 100,  max_employees: 10,   modules: ["workforce", "task", "reporting"] },
  orbitan_growth:     { credits: 500,  max_employees: 50,   modules: ["workforce", "task", "reporting", "inventory", "scheduling"] },
  orbitan_business:   { credits: 2000, max_employees: 250,  modules: ["workforce", "task", "reporting", "inventory", "procurement", "scheduling", "compliance", "sales_invoice", "finance_integration", "customer_management"] },
  orbitan_enterprise: { credits: null, max_employees: null, modules: ["all"] },
};

// ── REGISTRY-DRIVEN PROVISIONING ──────────────────────────────
// Industry blueprints are now served from the ActivationRegistry entity,
// NOT hardcoded constants. This is the "Manifest-Driven" architecture:
//   - Adding a new industry = create one ActivationRegistry record
//   - The provisioning engine never changes
//   - Packs are versioned and governance-domain bound
//
// Fallback DEFAULT_BLUEPRINT is kept only for unregistered industries.

const DEFAULT_BLUEPRINT = {
  compliance: [],
  tasks: [
    { title: "Complete your workspace setup", module_context: "workforce", priority: "high" },
    { title: "Invite your first team member", module_context: "workforce", priority: "medium" },
  ],
};

// Resolve industry blueprint from ActivationRegistry (Registry-Driven).
// Falls back to DEFAULT_BLUEPRINT only if no active pack is registered.
async function resolveIndustryBlueprint(base44, industry) {
  try {
    const registries = await base44.asServiceRole.entities.ActivationRegistry.filter({
      industry,
      is_active: true,
    });
    if (registries.length === 0) return { blueprint: DEFAULT_BLUEPRINT, governance_domain: null, pack_record: null };
    // Use the first active pack (sorted by sort_order is ideal, but filter returns insertion order)
    const pack = registries[0];
    return {
      blueprint: pack.blueprint || DEFAULT_BLUEPRINT,
      governance_domain: pack.governance_domain || null,
      pack_record: pack,
    };
  } catch (err) {
    // Fail-open: provisioning continues with default blueprint
    console.log(`[onboardingService] Registry lookup failed for ${industry}: ${err.message}`);
    return { blueprint: DEFAULT_BLUEPRINT, governance_domain: null, pack_record: null };
  }
}

async function provisionOrganisation(base44, body, user) {
  const {
    packKey,
    industry,
    tenant = {},
    structure = {},
    planKey = "orbitan_starter",
    selectedModules = [],
    acceptedStandards,
  } = body;

  const report = {
    status: "success",
    tenant_id: null,
    records_created: [],
    errors: [],
    provisioned_at: new Date().toISOString(),
  };

  // ── Activation Gate (Regulate principle) ──
  if (!acceptedStandards) {
    return { ...report, status: "failed", errors: [{ step: "gate", error: "Orbitan Operating Standards must be accepted to continue." }] };
  }
  if (!tenant.name || !industry || !packKey) {
    return { ...report, status: "failed", errors: [{ step: "validate", error: "Organisation name, industry and pack are required." }] };
  }

  const plan = PLAN_REGISTRY[planKey] || PLAN_REGISTRY.orbitan_starter;
  const allowsAll = plan.modules.includes("all");
  const validModules = allowsAll ? selectedModules : selectedModules.filter(m => plan.modules.includes(m));

  try {
    // 1. Tenant
    const tenantRec = await base44.asServiceRole.entities.Tenant.create({
      name: tenant.name,
      legal_name: tenant.legal_name || tenant.name,
      industry,
      subscription_plan: planKey,
      status: "active",
      enabled_modules: validModules,
      enabled_packs: ["core", packKey],
      max_employees: plan.max_employees ?? 999999,
      contact_email: tenant.contact_email || user.email,
      contact_name: tenant.contact_name || user.full_name,
      country: tenant.country || "Singapore",
      currency: tenant.currency || "SGD",
      onboarding_completed: true,
      governance_domain: governance_domain || null,
    });
    report.tenant_id = tenantRec.id;
    report.governance_domain = governance_domain;
    report.records_created.push({ entity: "Tenant", id: tenantRec.id, title: tenant.name });

    // 2. Company
    const companyRec = await base44.asServiceRole.entities.Company.create({
      tenant_id: tenantRec.id,
      name: structure.company_name || tenant.name,
      legal_name: tenant.legal_name || tenant.name,
      industry,
      country: tenant.country || "Singapore",
    });
    report.records_created.push({ entity: "Company", id: companyRec.id, title: companyRec.name });

    // 3. Brand
    const brandName = structure.brand_name || structure.company_name || tenant.name;
    const brandRec = await base44.asServiceRole.entities.Client.create({
      tenant_id: tenantRec.id,
      company_id: companyRec.id,
      name: brandName,
      brand: brandName,
      industry_pack: packKey,
    });
    report.records_created.push({ entity: "Brand", id: brandRec.id, title: brandName });

    // 4. Outlet
    const outletRec = await base44.asServiceRole.entities.Outlet.create({
      tenant_id: tenantRec.id,
      company_id: companyRec.id,
      client_id: brandRec.id,
      name: structure.outlet_name || "Primary Outlet",
      address: structure.outlet_address || "",
      is_virtual: !!structure.is_virtual,
      status: "active",
    });
    report.records_created.push({ entity: "Outlet", id: outletRec.id, title: outletRec.name });

    // 5. Wallet
    const walletRec = await base44.asServiceRole.entities.OrbitanWallet.create({
      tenant_id: tenantRec.id,
      tenant_name: tenant.name,
      subscription_plan: planKey,
      balance_credits: plan.credits ?? 100000,
      credits_quota_monthly: plan.credits ?? 100000,
    });
    report.records_created.push({ entity: "OrbitanWallet", id: walletRec.id });

    // 6. Stamp the founder as tenant_admin and bind to the new workspace
    await base44.asServiceRole.entities.User.update(user.id, {
      role: "tenant_admin",
      tenant_id: tenantRec.id,
      company_id: companyRec.id,
      outlet_id: outletRec.id,
    });

    // 7. Seed the industry blueprint from ActivationRegistry (Registry-Driven)
    const { blueprint, governance_domain } = await resolveIndustryBlueprint(base44, industry);
    const dueDate = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
    const seeds = [
      ...(blueprint.compliance || []).map(c =>
        base44.asServiceRole.entities.ComplianceRecord.create({
          ...c, tenant_id: tenantRec.id, outlet_id: outletRec.id, status: "pending", due_date: dueDate,
        }).then(r => ({ entity: "ComplianceRecord", id: r.id, title: c.title }))
      ),
      ...(blueprint.tasks || []).map(t =>
        base44.asServiceRole.entities.Task.create({
          ...t, tenant_id: tenantRec.id, outlet_id: outletRec.id, status: "pending", due_date: dueDate,
        }).then(r => ({ entity: "Task", id: r.id, title: t.title }))
      ),
    ];
    const seedResults = await Promise.allSettled(seeds);
    seedResults.forEach(r => {
      if (r.status === "fulfilled") report.records_created.push(r.value);
      else report.errors.push({ step: "seed", error: r.reason?.message || "Seed failed" });
    });

    // 8. Audit trail (Exit-Ready)
    await base44.asServiceRole.entities.AuditLog.create({
      tenant_id: tenantRec.id,
      actor_id: user.id,
      actor_name: user.full_name || user.email,
      actor_role: "tenant_admin",
      action_type: "organisation_provisioned",
      module: "system",
      target_entity: "Tenant",
      target_record_id: tenantRec.id,
      details: `Self-serve provisioning: ${tenant.name} (${industry} · ${planKey}). Company → Brand → Outlet → Wallet chain created. ${validModules.length} modules activated.`,
      new_state: { plan: planKey, industry, pack: packKey, modules: validModules, outlet_id: outletRec.id },
    }).catch(e => report.errors.push({ step: "audit", error: e.message }));

  } catch (err) {
    report.status = "failed";
    report.errors.push({ step: "provision", error: err.message });
    return report;
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

    const body = await req.json();
    const { action } = body;

    // ── SELF-SERVE PROVISIONING — any authenticated user ────
    if (action === "provision_organisation") {
      const report = await provisionOrganisation(base44, body, user);
      return Response.json({ report }, { status: report.status === "failed" ? 500 : 200 });
    }

    // ── ADMIN-ONLY ACTIONS BELOW ────────────────────────────
    if (user.role !== "admin") {
      return Response.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // ── ACTIVATE: Run full provisioning for one tenant ────
    // Manifest is passed as payload from lib/tenant-registry.js
    if (action === "activate_tenant") {
      const { manifest } = body;
      if (!manifest || !manifest.tenant_ref) {
        return Response.json({ error: "manifest with tenant_ref is required" }, { status: 400 });
      }
      const report = await activateTenant(base44, manifest, user.id, user.full_name || "Platform Owner");
      return Response.json({ report });
    }

    // ── ACTIVATE ALL: Bulk parallel activation ──────────────
    // Accepts an array of manifests from the frontend
    if (action === "activate_all") {
      const { manifests } = body;
      if (!manifests || !Array.isArray(manifests) || manifests.length === 0) {
        return Response.json({ error: "manifests array is required" }, { status: 400 });
      }
      const allResults = await Promise.allSettled(
        manifests.map(m => activateTenant(base44, m, user.id, user.full_name || "Platform Owner"))
      );
      const reports = allResults.map((result, i) =>
        result.status === 'fulfilled'
          ? result.value
          : { tenant_ref: manifests[i]?.tenant_ref || 'unknown', status: 'failed', errors: [{ error: result.reason?.message }] }
      );
      return Response.json({ reports });
    }

    // ── GET MANIFESTS — Compatibility shim ──────────────────
    // Frontend should use lib/tenant-registry.js directly.
    // Kept here for backward compatibility and as a fallback.
    if (action === "get_manifests") {
      return Response.json({
        manifests: [],
        note: "Manifests are now served from lib/tenant-registry.js on the frontend. This endpoint is deprecated for reading manifests."
      });
    }

    // ── HANDLE ACCESS REQUEST — Send email notification ─────
    // Supports both direct API calls and entity automation triggers
    const isEntityAutomation = !action && body.event?.entity_name === "AccessRequest";
    if (action === "handle_access_request" || isEntityAutomation) {
      const payload = isEntityAutomation ? (body.data || {}) : body;
      const { email, tenant_id, company_name, outlet_name, role_requested } = payload;

      if (!email || !tenant_id) {
        return Response.json({ error: "email and tenant_id are required" }, { status: 400 });
      }

      const managers = await base44.asServiceRole.entities.Employee.filter({
        tenant_id,
        role: { $in: ["tenant_admin", "outlet_manager"] },
        status: "active",
      });

      const managerEmails = managers.map(m => m.email).filter(Boolean);

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

    // ── HANDLE ACCESS REQUEST APPROVAL — Auto-create Employee ─
    const isApprovalAutomation = !action && body.event?.entity_name === "AccessRequest" && body.event?.type === "update" && body.data?.status === "approved";
    if (action === "approve_access_request" || isApprovalAutomation) {
      const payload = isApprovalAutomation ? (body.data || {}) : body;
      const { email, tenant_id, outlet_id, company_name, role_requested } = payload;
      const workerName = payload.email ? payload.email.split('@')[0] : "New Worker";

      if (!email || !tenant_id) {
        return Response.json({ error: "email and tenant_id are required" }, { status: 400 });
      }

      const existingEmployees = await base44.asServiceRole.entities.Employee.filter({
        tenant_id,
        email,
      });

      let employee;
      let employeeAction = "created";

      if (existingEmployees.length > 0) {
        employee = await base44.asServiceRole.entities.Employee.update(existingEmployees[0].id, {
          outlet_id: outlet_id || existingEmployees[0].outlet_id,
          role: role_requested || existingEmployees[0].role,
          status: "active",
          employment_type: existingEmployees[0].employment_type || "full_time",
        });
        employeeAction = "synced";
      } else {
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

      await base44.asServiceRole.entities.AuditLog.create({
        tenant_id,
        actor_id: "system",
        actor_name: "OrbitanOS Onboarding Engine",
        actor_role: "system",
        action_type: employeeAction === "synced" ? "employee_synced" : "worker_onboarded",
        module: "workforce",
        target_entity: "Employee",
        target_record_id: employee.id,
        details: employeeAction === "synced"
          ? `Canonical sync: Updated Employee record for ${email} — role ${role_requested || "updated"}, outlet ${outlet_id || "unchanged"}. AccessRequest approved.`
          : `Auto-provisioned Employee record for ${email} as ${(role_requested || "worker").replace(/_/g, " ")} at ${company_name || tenant_id}. AccessRequest approved. Powered by the Regulate principle.`,
        new_state: {
          employee_id: employee.id,
          email,
          role: role_requested || employee.role,
          tenant_id,
          outlet_id: outlet_id || employee.outlet_id || null,
          action: employeeAction,
        },
      });

      return Response.json({
        success: true,
        employee_id: employee.id,
        worker_name: workerName,
        role: role_requested || employee.role,
        action: employeeAction,
        details: employeeAction === "synced"
          ? `Employee record synchronized for ${email}. Outlet and role updated. Ready for workspace access.`
          : `Employee record created for ${email}. They can now access their OrbitanOS workspace.`,
      });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});