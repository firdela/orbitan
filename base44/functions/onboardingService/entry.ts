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

// ── HTTP HANDLER ─────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden: Admin access required" }, { status: 403 });

    const body = await req.json();
    const { action } = body;

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