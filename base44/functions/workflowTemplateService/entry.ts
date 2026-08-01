/**
 * OrbitanOS — Workflow Template Service (Build #27H.1)
 * ──────────────────────────────────────────────────
 * Server-side authoritative lifecycle for workflow templates.
 *
 * Principle: The browser must NOT authorise lifecycle transitions,
 * publish, archive, restore, version, or governance mutations.
 * All state transitions are validated and executed here.
 *
 * Canonical Lifecycle:
 *   Draft → Published → Archived
 *   Restore: Archived → Draft
 *   Published templates are immutable.
 *   Editing a published template creates a new draft version.
 *
 * Actions:
 *   create, update (draft only), publish, archive, restore,
 *   duplicate, newVersion, assign, generateWork
 *
 * Audit: Every governance-sensitive action writes a canonical
 *   AuditLog via writeAuditCritical (fail-closed). If the audit
 *   write fails, the mutation is rolled back.
 *
 * Exit-Ready: pure business logic over Base44 entities; portable.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { serviceError, createAuditWriter } from '../../shared/serviceUtils.ts';

// ── Role matrices ──────────────────────────────────────────────────
const MANAGE_ROLES = ['admin', 'tenant_admin', 'outlet_manager'];
const GENERATE_ROLES = ['admin', 'tenant_admin', 'outlet_manager', 'supervisor'];

const VALID_CATEGORIES = new Set([
  'opening', 'closing', 'onboarding', 'inventory_count', 'procurement',
  'compliance_inspection', 'incident_response', 'food_safety', 'cleaning',
  'maintenance', 'audit_preparation', 'custom',
]);

const VALID_RECURRENCE = new Set([
  'none', 'daily', 'weekly', 'monthly', 'quarterly', 'custom',
]);

const writeAuditCritical = createAuditWriter({
  module: 'system',
  category: 'governance',
  event_source: 'workflowTemplateService',
  target_entity: 'WorkflowTemplate',
  related_workflow: 'workflow_template_lifecycle',
});

// ── Step validation ──────────────────────────────────────────────
function validateSteps(steps) {
  if (!steps || !Array.isArray(steps) || steps.length === 0) {
    return { valid: false, error: 'At least one step is required' };
  }
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (!s.title || !String(s.title).trim()) {
      return { valid: false, error: `Step ${i + 1} is missing a title` };
    }
    // Validate step order is sequential
    if (s.order !== undefined && Number(s.order) !== i + 1) {
      return { valid: false, error: 'Step order must be sequential starting from 1' };
    }
  }
  return { valid: true };
}

// ── Normalise steps to canonical format ──────────────────────────
function normaliseSteps(steps) {
  return steps.map((s, i) => ({
    order: i + 1,
    title: String(s.title).trim(),
    description: s.description?.trim() || undefined,
    assignee_role: s.assignee_role || undefined,
    expected_duration_mins: Number(s.expected_duration_mins) || 0,
    required_evidence: !!s.required_evidence,
    approval_required: !!s.approval_required,
  }));
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return serviceError('PERMISSION_DENIED', 'You do not have permission to perform this action.', 401);

    let payload = {};
    try { payload = await req.json(); } catch (e) {}
    const action = payload.action;
    const userTenantId = user?.data?.tenant_id;

    // ══════════════════════════════════════════════════════════════
    // ACTION: create
    // ══════════════════════════════════════════════════════════════
    if (action === 'create') {
      if (!MANAGE_ROLES.includes(user.role)) {
        return serviceError('PERMISSION_DENIED', 'You do not have permission to create templates.', 403);
      }

      const tenantId = payload.tenant_id || userTenantId;
      if (!tenantId) {
        return serviceError('TENANT_CONTEXT_REQUIRED', 'Select a tenant before managing templates.', 400);
      }

      if (!payload.name || !String(payload.name).trim()) {
        return serviceError('INVALID_TEMPLATE', 'Template name is required.', 400);
      }

      if (payload.category && !VALID_CATEGORIES.has(payload.category)) {
        return serviceError('INVALID_TEMPLATE', 'Invalid category.', 400);
      }

      const stepValidation = validateSteps(payload.steps);
      if (!stepValidation.valid) {
        return serviceError('INVALID_TEMPLATE', stepValidation.error, 400);
      }

      const publish = !!payload.publish;
      const now = new Date().toISOString();
      const normalisedSteps = normaliseSteps(payload.steps);

      const template = await base44.asServiceRole.entities.WorkflowTemplate.create({
        tenant_id: tenantId,
        name: String(payload.name).trim(),
        description: payload.description?.trim() || undefined,
        category: payload.category || 'custom',
        version: 1,
        steps: normalisedSteps,
        assignee_role: payload.assignee_role || undefined,
        expected_duration_mins: normalisedSteps.reduce((sum, s) => sum + s.expected_duration_mins, 0),
        required_evidence: normalisedSteps.some((s) => s.required_evidence),
        approval_required: normalisedSteps.some((s) => s.approval_required),
        recurrence: payload.recurrence || 'none',
        applicable_industry: payload.applicable_industry || undefined,
        applicable_outlet_id: payload.applicable_outlet_id || undefined,
        status: publish ? 'published' : 'draft',
        published_date: publish ? now : undefined,
        published_by: publish ? user.id : undefined,
        published_by_name: publish ? (user.full_name || user.email) : undefined,
        is_active: true,
        notes: payload.notes?.trim() || undefined,
      });

      try {
        await writeAuditCritical(base44, {
          tenant_id: tenantId,
          actor_id: user.id,
          actor_name: user.full_name || user.email,
          actor_role: user.role,
          action_type: publish ? 'workflow_template_published' : 'workflow_template_created',
          target_record_id: template.id,
          new_state: { name: template.name, status: template.status, version: 1 },
          details: `Template "${template.name}" ${publish ? 'created and published' : 'created as draft'} by ${user.full_name || user.email}.`,
        });
      } catch (auditErr) {
        try { await base44.asServiceRole.entities.WorkflowTemplate.delete(template.id); } catch (e) {}
        return serviceError('AUDIT_FAILURE', 'Critical audit write failed — template creation rolled back.', 500);
      }

      return Response.json({ success: true, template });
    }

    // ══════════════════════════════════════════════════════════════
    // ACTION: update (drafts only — published templates are immutable)
    // ══════════════════════════════════════════════════════════════
    if (action === 'update') {
      if (!MANAGE_ROLES.includes(user.role)) {
        return serviceError('PERMISSION_DENIED', 'You do not have permission to update templates.', 403);
      }

      const templateId = payload.template_id;
      if (!templateId) return serviceError('INVALID_REQUEST', 'template_id is required.', 400);

      const template = await base44.asServiceRole.entities.WorkflowTemplate.get(templateId);
      if (!template) return serviceError('NOT_FOUND', 'Template not found.', 404);

      const tenantId = payload.tenant_id || userTenantId;
      if (user.role === 'admin') {
        if (!payload.tenant_id) {
          return serviceError('TENANT_CONTEXT_REQUIRED', 'Platform admin must specify explicit tenant_id.', 400);
        }
        if (payload.tenant_id !== template.tenant_id) {
          return serviceError('CROSS_TENANT_DENIED', 'Template does not belong to specified tenant.', 403);
        }
      } else {
        if (template.tenant_id !== userTenantId) {
          return serviceError('CROSS_TENANT_DENIED', 'Template belongs to a different tenant.', 403);
        }
      }

      // Published templates are immutable
      if (template.status === 'published') {
        return serviceError('TEMPLATE_IMMUTABLE', 'Published templates cannot be edited. Create a new version instead.', 400);
      }
      if (template.status === 'archived') {
        return serviceError('TEMPLATE_ARCHIVED', 'Archived templates must be restored before editing.', 400);
      }

      // Validate steps if provided
      const steps = payload.steps || template.steps;
      const stepValidation = validateSteps(steps);
      if (!stepValidation.valid) {
        return serviceError('INVALID_TEMPLATE', stepValidation.error, 400);
      }

      const publish = !!payload.publish;
      const now = new Date().toISOString();
      const normalisedSteps = normaliseSteps(steps);

      const updates = {
        name: payload.name ? String(payload.name).trim() : template.name,
        description: payload.description !== undefined ? (payload.description?.trim() || undefined) : template.description,
        category: payload.category || template.category,
        steps: normalisedSteps,
        assignee_role: payload.assignee_role || template.assignee_role,
        expected_duration_mins: normalisedSteps.reduce((sum, s) => sum + s.expected_duration_mins, 0),
        required_evidence: normalisedSteps.some((s) => s.required_evidence),
        approval_required: normalisedSteps.some((s) => s.approval_required),
        recurrence: payload.recurrence || template.recurrence,
        applicable_industry: payload.applicable_industry !== undefined ? payload.applicable_industry : template.applicable_industry,
        applicable_outlet_id: payload.applicable_outlet_id !== undefined ? payload.applicable_outlet_id : template.applicable_outlet_id,
        notes: payload.notes !== undefined ? (payload.notes?.trim() || undefined) : template.notes,
      };

      if (publish) {
        updates.status = 'published';
        updates.published_date = now;
        updates.published_by = user.id;
        updates.published_by_name = user.full_name || user.email;
      }

      const updated = await base44.asServiceRole.entities.WorkflowTemplate.update(templateId, updates);

      try {
        await writeAuditCritical(base44, {
          tenant_id: tenantId,
          actor_id: user.id,
          actor_name: user.full_name || user.email,
          actor_role: user.role,
          action_type: publish ? 'workflow_template_published' : 'workflow_template_updated',
          target_record_id: templateId,
          previous_state: { status: template.status, name: template.name },
          new_state: { status: updates.status || template.status, name: updates.name },
          details: `Template "${updates.name}" ${publish ? 'updated and published' : 'updated'} by ${user.full_name || user.email}.`,
        });
      } catch (auditErr) {
        // Fail-closed: roll back update
        try { await base44.asServiceRole.entities.WorkflowTemplate.update(templateId, { status: template.status, name: template.name, steps: template.steps }); } catch (e) {}
        return serviceError('AUDIT_FAILURE', 'Critical audit write failed — update rolled back.', 500);
      }

      return Response.json({ success: true, template: updated });
    }

    // ══════════════════════════════════════════════════════════════
    // ACTION: publish
    // ══════════════════════════════════════════════════════════════
    if (action === 'publish') {
      if (!MANAGE_ROLES.includes(user.role)) {
        return serviceError('PERMISSION_DENIED', 'You do not have permission to publish templates.', 403);
      }

      const templateId = payload.template_id;
      if (!templateId) return serviceError('INVALID_REQUEST', 'template_id is required.', 400);

      const template = await base44.asServiceRole.entities.WorkflowTemplate.get(templateId);
      if (!template) return serviceError('NOT_FOUND', 'Template not found.', 404);

      const tenantId = payload.tenant_id || userTenantId;
      if (user.role === 'admin') {
        if (!payload.tenant_id) return serviceError('TENANT_CONTEXT_REQUIRED', 'Platform admin must specify explicit tenant_id.', 400);
        if (payload.tenant_id !== template.tenant_id) return serviceError('CROSS_TENANT_DENIED', 'Template does not belong to specified tenant.', 403);
      } else {
        if (template.tenant_id !== userTenantId) return serviceError('CROSS_TENANT_DENIED', 'Template belongs to a different tenant.', 403);
      }

      if (template.status !== 'draft') {
        return serviceError('INVALID_TRANSITION', `Cannot publish a template in '${template.status}' status. Only drafts can be published.`, 400);
      }

      const stepValidation = validateSteps(template.steps);
      if (!stepValidation.valid) {
        return serviceError('INVALID_TEMPLATE', stepValidation.error, 400);
      }

      const now = new Date().toISOString();
      const updated = await base44.asServiceRole.entities.WorkflowTemplate.update(templateId, {
        status: 'published',
        published_date: now,
        published_by: user.id,
        published_by_name: user.full_name || user.email,
      });

      try {
        await writeAuditCritical(base44, {
          tenant_id: tenantId,
          actor_id: user.id,
          actor_name: user.full_name || user.email,
          actor_role: user.role,
          action_type: 'workflow_template_published',
          target_record_id: templateId,
          previous_state: { status: 'draft' },
          new_state: { status: 'published', version: template.version || 1 },
          details: `Template "${template.name}" published by ${user.full_name || user.email}.`,
        });
      } catch (auditErr) {
        try { await base44.asServiceRole.entities.WorkflowTemplate.update(templateId, { status: 'draft', published_date: undefined, published_by: undefined, published_by_name: undefined }); } catch (e) {}
        return serviceError('AUDIT_FAILURE', 'Critical audit write failed — publish rolled back.', 500);
      }

      return Response.json({ success: true, template: updated });
    }

    // ══════════════════════════════════════════════════════════════
    // ACTION: archive
    // ══════════════════════════════════════════════════════════════
    if (action === 'archive') {
      if (!MANAGE_ROLES.includes(user.role)) {
        return serviceError('PERMISSION_DENIED', 'You do not have permission to archive templates.', 403);
      }

      const templateId = payload.template_id;
      if (!templateId) return serviceError('INVALID_REQUEST', 'template_id is required.', 400);

      const template = await base44.asServiceRole.entities.WorkflowTemplate.get(templateId);
      if (!template) return serviceError('NOT_FOUND', 'Template not found.', 404);

      const tenantId = payload.tenant_id || userTenantId;
      if (user.role === 'admin') {
        if (!payload.tenant_id) return serviceError('TENANT_CONTEXT_REQUIRED', 'Platform admin must specify explicit tenant_id.', 400);
        if (payload.tenant_id !== template.tenant_id) return serviceError('CROSS_TENANT_DENIED', 'Template does not belong to specified tenant.', 403);
      } else {
        if (template.tenant_id !== userTenantId) return serviceError('CROSS_TENANT_DENIED', 'Template belongs to a different tenant.', 403);
      }

      if (template.status === 'archived') {
        return serviceError('ALREADY_PROCESSED', 'Template is already archived.', 400);
      }

      const updated = await base44.asServiceRole.entities.WorkflowTemplate.update(templateId, {
        status: 'archived',
        is_active: false,
      });

      try {
        await writeAuditCritical(base44, {
          tenant_id: tenantId,
          actor_id: user.id,
          actor_name: user.full_name || user.email,
          actor_role: user.role,
          action_type: 'workflow_template_archived',
          target_record_id: templateId,
          previous_state: { status: template.status },
          new_state: { status: 'archived' },
          details: `Template "${template.name}" archived by ${user.full_name || user.email}.`,
        });
      } catch (auditErr) {
        try { await base44.asServiceRole.entities.WorkflowTemplate.update(templateId, { status: template.status, is_active: template.is_active }); } catch (e) {}
        return serviceError('AUDIT_FAILURE', 'Critical audit write failed — archive rolled back.', 500);
      }

      return Response.json({ success: true, template: updated });
    }

    // ══════════════════════════════════════════════════════════════
    // ACTION: restore (archived → draft)
    // ══════════════════════════════════════════════════════════════
    if (action === 'restore') {
      if (!MANAGE_ROLES.includes(user.role)) {
        return serviceError('PERMISSION_DENIED', 'You do not have permission to restore templates.', 403);
      }

      const templateId = payload.template_id;
      if (!templateId) return serviceError('INVALID_REQUEST', 'template_id is required.', 400);

      const template = await base44.asServiceRole.entities.WorkflowTemplate.get(templateId);
      if (!template) return serviceError('NOT_FOUND', 'Template not found.', 404);

      const tenantId = payload.tenant_id || userTenantId;
      if (user.role === 'admin') {
        if (!payload.tenant_id) return serviceError('TENANT_CONTEXT_REQUIRED', 'Platform admin must specify explicit tenant_id.', 400);
        if (payload.tenant_id !== template.tenant_id) return serviceError('CROSS_TENANT_DENIED', 'Template does not belong to specified tenant.', 403);
      } else {
        if (template.tenant_id !== userTenantId) return serviceError('CROSS_TENANT_DENIED', 'Template belongs to a different tenant.', 403);
      }

      if (template.status !== 'archived') {
        return serviceError('INVALID_TRANSITION', `Cannot restore a template in '${template.status}' status. Only archived templates can be restored.`, 400);
      }

      const updated = await base44.asServiceRole.entities.WorkflowTemplate.update(templateId, {
        status: 'draft',
        is_active: true,
        published_date: undefined,
        published_by: undefined,
        published_by_name: undefined,
      });

      try {
        await writeAuditCritical(base44, {
          tenant_id: tenantId,
          actor_id: user.id,
          actor_name: user.full_name || user.email,
          actor_role: user.role,
          action_type: 'workflow_template_restored',
          target_record_id: templateId,
          previous_state: { status: 'archived' },
          new_state: { status: 'draft' },
          details: `Template "${template.name}" restored to draft by ${user.full_name || user.email}.`,
        });
      } catch (auditErr) {
        try { await base44.asServiceRole.entities.WorkflowTemplate.update(templateId, { status: 'archived', is_active: false }); } catch (e) {}
        return serviceError('AUDIT_FAILURE', 'Critical audit write failed — restore rolled back.', 500);
      }

      return Response.json({ success: true, template: updated });
    }

    // ══════════════════════════════════════════════════════════════
    // ACTION: duplicate (independent copy, no parent linkage)
    // ══════════════════════════════════════════════════════════════
    if (action === 'duplicate') {
      if (!MANAGE_ROLES.includes(user.role)) {
        return serviceError('PERMISSION_DENIED', 'You do not have permission to duplicate templates.', 403);
      }

      const templateId = payload.template_id;
      if (!templateId) return serviceError('INVALID_REQUEST', 'template_id is required.', 400);

      const template = await base44.asServiceRole.entities.WorkflowTemplate.get(templateId);
      if (!template) return serviceError('NOT_FOUND', 'Template not found.', 404);

      const tenantId = payload.tenant_id || userTenantId;
      if (user.role === 'admin') {
        if (!payload.tenant_id) return serviceError('TENANT_CONTEXT_REQUIRED', 'Platform admin must specify explicit tenant_id.', 400);
        if (payload.tenant_id !== template.tenant_id) return serviceError('CROSS_TENANT_DENIED', 'Template does not belong to specified tenant.', 403);
      } else {
        if (template.tenant_id !== userTenantId) return serviceError('CROSS_TENANT_DENIED', 'Template belongs to a different tenant.', 403);
      }

      // Create independent copy — no parent_template_id, version resets to 1
      const dup = await base44.asServiceRole.entities.WorkflowTemplate.create({
        tenant_id: tenantId,
        name: `${template.name} (Copy)`,
        description: template.description,
        category: template.category,
        version: 1,
        steps: (template.steps || []).map((s, i) => ({
          order: i + 1,
          title: s.title,
          description: s.description,
          assignee_role: s.assignee_role,
          expected_duration_mins: s.expected_duration_mins || 0,
          required_evidence: !!s.required_evidence,
          approval_required: !!s.approval_required,
        })),
        assignee_role: template.assignee_role,
        expected_duration_mins: template.expected_duration_mins || 0,
        required_evidence: template.required_evidence,
        approval_required: template.approval_required,
        recurrence: template.recurrence || 'none',
        applicable_industry: template.applicable_industry,
        applicable_outlet_id: template.applicable_outlet_id,
        status: 'draft',
        is_active: true,
        notes: template.notes,
      });

      try {
        await writeAuditCritical(base44, {
          tenant_id: tenantId,
          actor_id: user.id,
          actor_name: user.full_name || user.email,
          actor_role: user.role,
          action_type: 'workflow_template_duplicated',
          target_record_id: dup.id,
          previous_state: { source_template_id: templateId, source_name: template.name },
          new_state: { name: dup.name, status: 'draft', version: 1 },
          details: `Template "${template.name}" duplicated to "${dup.name}" by ${user.full_name || user.email}.`,
        });
      } catch (auditErr) {
        try { await base44.asServiceRole.entities.WorkflowTemplate.delete(dup.id); } catch (e) {}
        return serviceError('AUDIT_FAILURE', 'Critical audit write failed — duplication rolled back.', 500);
      }

      return Response.json({ success: true, template: dup });
    }

    // ══════════════════════════════════════════════════════════════
    // ACTION: newVersion (create draft version from published template)
    // ══════════════════════════════════════════════════════════════
    if (action === 'newVersion') {
      if (!MANAGE_ROLES.includes(user.role)) {
        return serviceError('PERMISSION_DENIED', 'You do not have permission to create new versions.', 403);
      }

      const templateId = payload.template_id;
      if (!templateId) return serviceError('INVALID_REQUEST', 'template_id is required.', 400);

      const template = await base44.asServiceRole.entities.WorkflowTemplate.get(templateId);
      if (!template) return serviceError('NOT_FOUND', 'Template not found.', 404);

      const tenantId = payload.tenant_id || userTenantId;
      if (user.role === 'admin') {
        if (!payload.tenant_id) return serviceError('TENANT_CONTEXT_REQUIRED', 'Platform admin must specify explicit tenant_id.', 400);
        if (payload.tenant_id !== template.tenant_id) return serviceError('CROSS_TENANT_DENIED', 'Template does not belong to specified tenant.', 403);
      } else {
        if (template.tenant_id !== userTenantId) return serviceError('CROSS_TENANT_DENIED', 'Template belongs to a different tenant.', 403);
      }

      if (template.status !== 'published') {
        return serviceError('INVALID_TRANSITION', 'New versions can only be created from published templates.', 400);
      }

      const newVersion = (template.version || 1) + 1;

      const newDraft = await base44.asServiceRole.entities.WorkflowTemplate.create({
        tenant_id: tenantId,
        name: `${template.name} (v${newVersion})`,
        description: template.description,
        category: template.category,
        version: newVersion,
        steps: (template.steps || []).map((s, i) => ({
          order: i + 1,
          title: s.title,
          description: s.description,
          assignee_role: s.assignee_role,
          expected_duration_mins: s.expected_duration_mins || 0,
          required_evidence: !!s.required_evidence,
          approval_required: !!s.approval_required,
        })),
        assignee_role: template.assignee_role,
        expected_duration_mins: template.expected_duration_mins || 0,
        required_evidence: template.required_evidence,
        approval_required: template.approval_required,
        recurrence: template.recurrence || 'none',
        applicable_industry: template.applicable_industry,
        applicable_outlet_id: template.applicable_outlet_id,
        status: 'draft',
        parent_template_id: template.id,
        is_active: true,
        notes: template.notes,
      });

      try {
        await writeAuditCritical(base44, {
          tenant_id: tenantId,
          actor_id: user.id,
          actor_name: user.full_name || user.email,
          actor_role: user.role,
          action_type: 'workflow_template_version_created',
          target_record_id: newDraft.id,
          previous_state: { source_template_id: template.id, source_version: template.version || 1 },
          new_state: { name: newDraft.name, status: 'draft', version: newVersion, parent_template_id: template.id },
          details: `New version v${newVersion} created from "${template.name}" by ${user.full_name || user.email}.`,
        });
      } catch (auditErr) {
        try { await base44.asServiceRole.entities.WorkflowTemplate.delete(newDraft.id); } catch (e) {}
        return serviceError('AUDIT_FAILURE', 'Critical audit write failed — version creation rolled back.', 500);
      }

      return Response.json({ success: true, template: newDraft });
    }

    // ══════════════════════════════════════════════════════════════
    // ACTION: assign (assign template to outlet/industry — drafts only)
    // ══════════════════════════════════════════════════════════════
    if (action === 'assign') {
      if (!MANAGE_ROLES.includes(user.role)) {
        return serviceError('PERMISSION_DENIED', 'You do not have permission to assign templates.', 403);
      }

      const templateId = payload.template_id;
      if (!templateId) return serviceError('INVALID_REQUEST', 'template_id is required.', 400);

      const template = await base44.asServiceRole.entities.WorkflowTemplate.get(templateId);
      if (!template) return serviceError('NOT_FOUND', 'Template not found.', 404);

      const tenantId = payload.tenant_id || userTenantId;
      if (user.role === 'admin') {
        if (!payload.tenant_id) return serviceError('TENANT_CONTEXT_REQUIRED', 'Platform admin must specify explicit tenant_id.', 400);
        if (payload.tenant_id !== template.tenant_id) return serviceError('CROSS_TENANT_DENIED', 'Template does not belong to specified tenant.', 403);
      } else {
        if (template.tenant_id !== userTenantId) return serviceError('CROSS_TENANT_DENIED', 'Template belongs to a different tenant.', 403);
      }

      // Published templates are immutable — cannot assign
      if (template.status === 'published') {
        return serviceError('TEMPLATE_IMMUTABLE', 'Published templates cannot be modified. Create a new version instead.', 400);
      }

      const updates = {};
      if (payload.applicable_outlet_id !== undefined) updates.applicable_outlet_id = payload.applicable_outlet_id || undefined;
      if (payload.applicable_industry !== undefined) updates.applicable_industry = payload.applicable_industry || undefined;

      const updated = await base44.asServiceRole.entities.WorkflowTemplate.update(templateId, updates);

      try {
        await writeAuditCritical(base44, {
          tenant_id: tenantId,
          actor_id: user.id,
          actor_name: user.full_name || user.email,
          actor_role: user.role,
          action_type: 'workflow_template_assigned',
          target_record_id: templateId,
          previous_state: { applicable_outlet_id: template.applicable_outlet_id, applicable_industry: template.applicable_industry },
          new_state: updates,
          details: `Template "${template.name}" assigned by ${user.full_name || user.email}.`,
        });
      } catch (auditErr) {
        try { await base44.asServiceRole.entities.WorkflowTemplate.update(templateId, { applicable_outlet_id: template.applicable_outlet_id, applicable_industry: template.applicable_industry }); } catch (e) {}
        return serviceError('AUDIT_FAILURE', 'Critical audit write failed — assignment rolled back.', 500);
      }

      return Response.json({ success: true, template: updated });
    }

    // ══════════════════════════════════════════════════════════════
    // ACTION: generateWork (generate tasks from a published template)
    // ══════════════════════════════════════════════════════════════
    if (action === 'generateWork') {
      if (!GENERATE_ROLES.includes(user.role)) {
        return serviceError('PERMISSION_DENIED', 'You do not have permission to generate work from templates.', 403);
      }

      const templateId = payload.template_id;
      if (!templateId) return serviceError('INVALID_REQUEST', 'template_id is required.', 400);

      const template = await base44.asServiceRole.entities.WorkflowTemplate.get(templateId);
      if (!template) return serviceError('NOT_FOUND', 'Template not found.', 404);

      const tenantId = payload.tenant_id || userTenantId;
      if (user.role === 'admin') {
        if (!payload.tenant_id) return serviceError('TENANT_CONTEXT_REQUIRED', 'Platform admin must specify explicit tenant_id.', 400);
        if (payload.tenant_id !== template.tenant_id) return serviceError('CROSS_TENANT_DENIED', 'Template does not belong to specified tenant.', 403);
      } else {
        if (template.tenant_id !== userTenantId) return serviceError('CROSS_TENANT_DENIED', 'Template belongs to a different tenant.', 403);
      }

      if (template.status !== 'published') {
        return serviceError('INVALID_TRANSITION', 'Work can only be generated from published templates.', 400);
      }

      const outletId = payload.outlet_id || template.applicable_outlet_id;
      if (!outletId) {
        return serviceError('INVALID_REQUEST', 'outlet_id is required for work generation.', 400);
      }

      // Avoid duplicate generation: check if tasks already exist for this template + outlet
      const existingTasks = await base44.asServiceRole.entities.Task.filter({
        tenant_id: tenantId,
        outlet_id: outletId,
        module_context: 'workflow_template',
      });
      const templateRef = `[TemplateID:${template.id}|v${template.version || 1}]`;
      const alreadyGenerated = (existingTasks || []).some((t) => t.description && t.description.includes(templateRef));
      if (alreadyGenerated) {
        return serviceError('ALREADY_PROCESSED', 'Work has already been generated from this template for this outlet.', 400);
      }

      // Generate tasks for each step
      const steps = template.steps || [];
      const createdTasks = [];
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const task = await base44.asServiceRole.entities.Task.create({
          tenant_id: tenantId,
          outlet_id: outletId,
          title: step.title,
          description: `${step.description || ''}\n\n${templateRef} Source: ${template.name} v${template.version || 1}, Step ${step.order || i + 1}`.trim(),
          status: 'draft',
          priority: 'medium',
          module_context: 'workflow_template',
          category: template.category,
          last_transition_at: new Date().toISOString(),
          last_transition_by: user.id,
          last_transition_by_name: user.full_name || user.email,
          version: 1,
        });
        createdTasks.push({ id: task.id, title: task.title, step_order: step.order || i + 1 });
      }

      try {
        await writeAuditCritical(base44, {
          tenant_id: tenantId,
          outlet_id: outletId,
          actor_id: user.id,
          actor_name: user.full_name || user.email,
          actor_role: user.role,
          action_type: 'workflow_work_generated',
          target_record_id: templateId,
          new_state: { tasks_generated: createdTasks.length, template_version: template.version || 1, outlet_id: outletId },
          details: `Generated ${createdTasks.length} task(s) from template "${template.name}" v${template.version || 1} for outlet ${outletId} by ${user.full_name || user.email}.`,
        });
      } catch (auditErr) {
        // Best-effort cleanup of generated tasks
        for (const t of createdTasks) {
          try { await base44.asServiceRole.entities.Task.delete(t.id); } catch (e) {}
        }
        return serviceError('AUDIT_FAILURE', 'Critical audit write failed — work generation rolled back.', 500);
      }

      return Response.json({ success: true, tasks_generated: createdTasks.length, tasks: createdTasks });
    }

    return serviceError('UNKNOWN_ACTION', `Unknown action: ${action}`, 400);
  } catch (error) {
    console.error('[workflowTemplateService] Error:', error.message);
    return serviceError('SERVICE_UNAVAILABLE', 'Workflow Template service is temporarily unavailable.', 500, true);
  }
}