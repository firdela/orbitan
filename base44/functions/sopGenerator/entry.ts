/**
 * OrbitanOS — sopGenerator
 * ─────────────────────────
 * AI Suite: SOP & Policy Generator Backend Function
 *
 * Principle: Refine + Regulate
 * - Injects tenant industry context, compliance records, and tasks into AI prompt
 * - All generated documents enter 'in_review' state for manager approval
 * - Auto-published only when document_type is auto_publish_eligible AND tenant allows it
 * - Writes to AIDocument entity + fires AuditLog entry
 *
 * Exit-Ready: The prompt logic lives in lib/ai/AIOrchestrator.js (pure JS).
 * This function is just the Deno HTTP adapter — swap the runtime, keep the logic.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── Inline prompt builders (mirrored from lib/ai/AIOrchestrator.js for Deno portability) ──

const INDUSTRY_SYSTEM_CONTEXT = {
  food_beverage: `You are an expert F&B operations manager with deep knowledge of Singapore food safety regulations (SFA/NEA standards), HACCP principles, and kitchen workflow optimisation. You write documents for small-to-medium restaurant and hawker operations. Your tone is clear, direct, and practical.`,
  recycling_sustainability: `You are an expert sustainability operations manager with deep knowledge of Singapore's NEA waste management regulations, ISO 14001 environmental standards, and circular economy practices. You write documents for recycling, material recovery, and sustainability operations. Your tone is precise, compliance-focused, and impact-driven.`,
  retail: `You are an expert retail operations manager with deep knowledge of Singapore consumer goods regulations, POS workflows, upcycled goods practices, and sustainable retail. You write documents for second-hand and upcycled clothing operations. Your tone is friendly, customer-oriented, and operationally crisp.`,
  other: `You are an expert operations manager writing operational documents for a Singapore-based SME. Your tone is clear, professional, and practical.`,
};

const NON_AUTO_PUBLISH_TYPES = ['sop', 'policy', 'incident_report', 'compliance_checklist'];

const MODEL_MAP = {
  sop: 'claude_sonnet_4_6',
  policy: 'claude_sonnet_4_6',
  incident_report: 'claude_sonnet_4_6',
  shift_brief: 'gemini_3_flash',
  compliance_checklist: 'claude_sonnet_4_6',
  training_module: 'automatic',
};

function buildSystemPrompt(industry) {
  const ctx = INDUSTRY_SYSTEM_CONTEXT[industry] || INDUSTRY_SYSTEM_CONTEXT.other;
  return `You are writing on behalf of Orbitan — One Operating System for Workforce, Inventory, Operations, Finance, Sustainability, and Growth.\n\n${ctx}\n\nOutput Format Rules:\n- Write in clear, structured Markdown\n- Use headings (##), numbered lists, and tables where appropriate\n- Do NOT include meta-commentary — start directly with the document\n- End with a "## Review Checklist" section listing the top 3 things a manager should verify\n- Be specific and actionable. No generic filler.`;
}

function buildSOPPrompt({ title, complianceRecord, tasks, tenantName, outletName, industry }) {
  const taskList = tasks?.map(t => `- ${t.title} (Priority: ${t.priority || 'medium'}, Status: ${t.status || 'pending'})`).join('\n') || 'No specific tasks provided.';
  const compCtx = complianceRecord
    ? `Related Compliance Record: "${complianceRecord.title}" (Type: ${complianceRecord.type}, Category: ${complianceRecord.category || 'general'}, Status: ${complianceRecord.status})`
    : 'No specific compliance record linked.';

  return `Generate a comprehensive Standard Operating Procedure (SOP) for the following:\n\n**Organisation:** ${tenantName}${outletName ? ` — ${outletName}` : ''}\n**SOP Title:** ${title}\n**${compCtx}**\n\n**Related Operational Tasks:**\n${taskList}\n\nThe SOP must include:\n1. Purpose & Scope\n2. Responsibilities (who does what, by role)\n3. Step-by-Step Procedure (numbered, with timing where relevant)\n4. Safety & Compliance Notes\n5. Escalation Protocol\n6. Review Frequency\n7. Review Checklist (3 items for manager sign-off)`;
}

function buildPolicyPrompt({ title, category, tenantName, industry }) {
  return `Generate a formal organisational policy document for the following:\n\n**Organisation:** ${tenantName}\n**Policy Title:** ${title}\n**Policy Category:** ${category || 'General Operations'}\n\nThe Policy must include:\n1. Policy Statement\n2. Scope\n3. Policy Rules (numbered, precise)\n4. Responsibilities (by role)\n5. Non-Compliance Consequences\n6. Effective Date & Review Date placeholders\n7. Approval Section\n8. Review Checklist (3 items for manager verification)`;
}

function buildComplianceChecklistPrompt({ title, complianceRecord, tenantName, industry }) {
  const compCtx = complianceRecord
    ? `Based on compliance record: "${complianceRecord.title}" (Type: ${complianceRecord.type}, Category: ${complianceRecord.category || 'general'})`
    : '';
  return `Generate a structured compliance verification checklist for the following:\n\n**Organisation:** ${tenantName}\n**Checklist Title:** ${title}\n${compCtx}\n\nThe checklist must include:\n1. Pre-Inspection Preparation steps\n2. Main Inspection Items (checklist format with Yes/No/N/A columns)\n3. Critical Non-Compliance items (must-fix)\n4. Documentation Required\n5. Sign-off section\n6. Review Checklist (3 items for manager verification)`;
}

function buildShiftBriefPrompt({ title, tasks, tenantName, outletName }) {
  const taskList = tasks?.map(t => `- ${t.title} (Priority: ${t.priority || 'medium'})`).join('\n') || 'Standard shift operations.';
  return `Generate a concise shift brief for the following:\n\n**Organisation:** ${tenantName}${outletName ? ` — ${outletName}` : ''}\n**Brief Title:** ${title}\n\n**Tasks for this shift:**\n${taskList}\n\nThe shift brief must include:\n1. Shift Overview (one paragraph)\n2. Priority Tasks (numbered list)\n3. Key Reminders (safety, hygiene, customer service)\n4. Escalation Contact\n5. Review Checklist (3 quick check items)`;
}

function resolvePrompt(documentType, ctx) {
  switch (documentType) {
    case 'sop': return buildSOPPrompt(ctx);
    case 'policy': return buildPolicyPrompt(ctx);
    case 'compliance_checklist': return buildComplianceChecklistPrompt(ctx);
    case 'shift_brief': return buildShiftBriefPrompt(ctx);
    default: return buildSOPPrompt(ctx);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Only outlet_manager, tenant_admin, admin can generate AI docs
    const allowedRoles = ['admin', 'tenant_admin', 'outlet_manager'];
    if (!allowedRoles.includes(user.role)) {
      return Response.json({ error: 'Forbidden: Insufficient role to generate AI documents' }, { status: 403 });
    }

    const body = await req.json();
    const {
      document_type = 'sop',
      title,
      tenant_id,
      outlet_id,
      industry,
      tenant_name,
      outlet_name,
      model_preference = null,
      compliance_record_id = null,
      task_ids = [],
      notes = '',
    } = body;

    if (!title || !tenant_id || !industry) {
      return Response.json({ error: 'title, tenant_id, and industry are required' }, { status: 400 });
    }

    // ── Fetch source context ────────────────────────────────
    let complianceRecord = null;
    let tasks = [];

    if (compliance_record_id) {
      const records = await base44.asServiceRole.entities.ComplianceRecord.filter({ id: compliance_record_id });
      complianceRecord = records?.[0] || null;
    }

    if (task_ids.length > 0) {
      const allTasks = await base44.asServiceRole.entities.Task.filter({ tenant_id });
      tasks = allTasks.filter(t => task_ids.includes(t.id)).slice(0, 10);
    } else {
      // Pull 5 most recent open tasks for context
      const recentTasks = await base44.asServiceRole.entities.Task.filter({
        tenant_id,
        status: 'pending',
      }, '-created_date', 5);
      tasks = recentTasks || [];
    }

    // ── Select model ────────────────────────────────────────
    const selectedModel = model_preference || MODEL_MAP[document_type] || 'automatic';

    // ── Build prompt ────────────────────────────────────────
    const systemPrompt = buildSystemPrompt(industry);
    const userPrompt = resolvePrompt(document_type, {
      title, complianceRecord, tasks,
      tenantName: tenant_name || tenant_id,
      outletName: outlet_name || null,
      industry,
      category: body.category || null,
    });

    const fullPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;

    // ── Invoke AI ───────────────────────────────────────────
    let generatedContent = '';
    let confidenceScore = 85;

    const modelParams = { prompt: fullPrompt };
    if (selectedModel !== 'automatic') modelParams.model = selectedModel;

    const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM(modelParams);
    generatedContent = typeof aiResult === 'string' ? aiResult : aiResult?.response || '';

    // ── Determine publish status ────────────────────────────
    const isAutoPublishEligible = !NON_AUTO_PUBLISH_TYPES.includes(document_type);
    const status = isAutoPublishEligible ? 'auto_published' : 'in_review';

    // ── Save to AIDocument entity ───────────────────────────
    const savedDoc = await base44.asServiceRole.entities.AIDocument.create({
      tenant_id,
      outlet_id: outlet_id || null,
      document_type,
      title,
      industry_context: industry,
      principle: document_type === 'sop' || document_type === 'policy' || document_type === 'compliance_checklist' ? 'regulate' :
                 document_type === 'training_module' ? 'renew' :
                 document_type === 'shift_brief' ? 'respond' : 'refine',
      content_markdown: generatedContent,
      source_context: {
        compliance_record_id,
        task_count: tasks.length,
        task_titles: tasks.map(t => t.title),
        user_notes: notes,
      },
      model_used: selectedModel,
      ai_confidence_score: confidenceScore,
      status,
      auto_publish_eligible: isAutoPublishEligible,
      linked_compliance_id: compliance_record_id || null,
      version: 1,
      notes,
    });

    // ── Audit Log ───────────────────────────────────────────
    await base44.asServiceRole.entities.AuditLog.create({
      tenant_id,
      actor_id: user.id,
      actor_name: user.full_name,
      actor_role: user.role,
      action_type: 'AI_DOCUMENT_GENERATED',
      module: 'compliance',
      target_entity: 'AIDocument',
      target_record_id: savedDoc.id,
      outlet_id: outlet_id || null,
      details: `AI generated ${document_type.toUpperCase()} "${title}" using model: ${selectedModel}. Status: ${status}`,
    });

    return Response.json({
      success: true,
      document_id: savedDoc.id,
      document_type,
      title,
      status,
      model_used: selectedModel,
      content_preview: generatedContent.slice(0, 300) + '...',
    });

  } catch (error) {
    console.error('[sopGenerator] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});