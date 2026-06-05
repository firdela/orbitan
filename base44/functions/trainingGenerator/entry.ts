/**
 * OrbitanOS — trainingGenerator
 * ──────────────────────────────
 * AI Suite: Training Insights Generator Backend Function
 *
 * Principle: Renew (Learn from performance → generate growth content)
 * - Aggregates AuditLog events + ClockRecord performance data
 * - Identifies patterns (low productivity, recurring errors, compliance gaps)
 * - Generates personalised training modules that close specific skill/knowledge gaps
 * - Low-risk training tips auto-publish; full modules enter 'in_review' state
 * - Writes to AIDocument entity + fires AuditLog entry
 *
 * Exit-Ready: Deno adapter only. Core prompt logic is portable pure JS.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const INDUSTRY_TRAINING_CONTEXT = {
  food_beverage: `You write training content for F&B staff in Singapore restaurants. Focus on food safety (SFA standards), kitchen hygiene, customer service, and operational efficiency. Use practical, scenario-based learning.`,
  recycling_sustainability: `You write training content for sustainability operations staff. Focus on safe handling of materials, environmental compliance (NEA Singapore), sustainability impact measurement, and collection workflow efficiency.`,
  retail: `You write training content for retail staff managing upcycled and second-hand clothing. Focus on product grading, customer engagement, POS workflows, and sustainability storytelling.`,
  other: `You write training content for operational staff at a Singapore SME. Focus on practical skills, safety, and performance improvement.`,
};

function buildTrainingPrompt({ title, industry, tenantName, auditEvents, clockSummary, employeeContext }) {
  const industryCtx = INDUSTRY_TRAINING_CONTEXT[industry] || INDUSTRY_TRAINING_CONTEXT.other;

  const auditCtx = auditEvents?.length
    ? auditEvents.slice(0, 12).map(e => `- [${(e.module || 'system').toUpperCase()}] ${e.action_type} by ${e.actor_name || 'staff member'} at ${e.created_date ? new Date(e.created_date).toLocaleDateString('en-SG') : 'recent'}`).join('\n')
    : 'No specific audit events available — generate a general training module.';

  const performanceCtx = clockSummary
    ? `Workforce Performance Summary:\n- Average productivity score: ${clockSummary.avgProductivity?.toFixed(1) || 'N/A'}%\n- Total tasks assigned: ${clockSummary.totalTasksAssigned || 0}\n- Total tasks completed: ${clockSummary.totalTasksCompleted || 0}\n- Average hours worked: ${clockSummary.avgHours?.toFixed(1) || 'N/A'}h per shift\n- Employees below 70% productivity: ${clockSummary.lowPerformers || 0}`
    : 'No workforce performance data available.';

  const empCtx = employeeContext?.length
    ? `Target Learners: ${employeeContext.map(e => `${e.full_name || e} (${e.position || e.role || 'staff'})`).join(', ')}`
    : 'Target Learners: All operational staff';

  return `You are an expert training designer for Orbitan — ${industryCtx}

Generate a structured, engaging Training Module for the following:

**Organisation:** ${tenantName}
**Training Title:** ${title}
**${empCtx}**

**${performanceCtx}**

**Recent Operational Events (for contextual grounding — these inform WHY this training is needed):**
${auditCtx}

Instructions:
- Ground the training in the actual operational events above
- Identify the specific gaps these events reveal (e.g. repeated errors, process deviations)
- Make content specific to ${industry?.replace('_', ' ')} operations in Singapore
- Avoid generic filler — every section must connect to the evidence above

The Training Module must include:

## 1. Learning Objectives
(3-5 specific, measurable outcomes using action verbs: "staff will be able to...")

## 2. Why This Training Matters
(Connect directly to the operational events and performance data above — make it real)

## 3. Core Knowledge Sections
(3-5 sections. Each section: concept explanation + 1 practical tip)

## 4. Real-World Scenarios
(2 scenarios based on the operational events above. Format: Situation → Correct Response → Why It Matters)

## 5. Knowledge Check
(5 questions — mix of multiple choice and open-ended. Include answer key)

## 6. Completion Criteria
(What the learner must demonstrate to a manager to be signed off)

## 7. Review Checklist
(3 specific items for the manager to verify after the training is completed)`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const allowedRoles = ['admin', 'tenant_admin', 'outlet_manager'];
    if (!allowedRoles.includes(user.role)) {
      return Response.json({ error: 'Forbidden: Insufficient role to generate training modules' }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      tenant_id,
      outlet_id,
      industry,
      tenant_name,
      employee_ids = [],
      days_lookback = 14,
      model_preference = null,
      notes = '',
    } = body;

    if (!title || !tenant_id || !industry) {
      return Response.json({ error: 'title, tenant_id, and industry are required' }, { status: 400 });
    }

    // ── Fetch operational intelligence ─────────────────────
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - days_lookback);
    const lookbackISO = lookbackDate.toISOString().split('T')[0];

    // Fetch recent audit events
    let auditEvents = [];
    try {
      const allAuditEvents = await base44.asServiceRole.entities.AuditLog.filter(
        { tenant_id },
        '-created_date',
        20
      );
      auditEvents = allAuditEvents || [];
    } catch (e) {
      console.warn('[trainingGenerator] Could not fetch audit events:', e.message);
    }

    // Fetch clock records for performance analysis
    let clockRecords = [];
    try {
      const filter = { tenant_id };
      if (outlet_id) filter.outlet_id = outlet_id;
      clockRecords = await base44.asServiceRole.entities.ClockRecord.filter(filter, '-date', 30) || [];
    } catch (e) {
      console.warn('[trainingGenerator] Could not fetch clock records:', e.message);
    }

    // ── Compute performance summary ─────────────────────────
    const clockSummary = clockRecords.length > 0 ? {
      avgProductivity: clockRecords.reduce((s, r) => s + (r.productivity_score || 0), 0) / clockRecords.length,
      totalTasksAssigned: clockRecords.reduce((s, r) => s + (r.tasks_assigned || 0), 0),
      totalTasksCompleted: clockRecords.reduce((s, r) => s + (r.tasks_completed || 0), 0),
      avgHours: clockRecords.reduce((s, r) => s + (r.total_hours_worked || 0), 0) / clockRecords.length,
      lowPerformers: clockRecords.filter(r => (r.productivity_score || 0) < 70).length,
    } : null;

    // Fetch employee context if specific employees targeted
    let employeeContext = [];
    if (employee_ids.length > 0) {
      try {
        const allEmployees = await base44.asServiceRole.entities.Employee.filter({ tenant_id });
        employeeContext = allEmployees.filter(e => employee_ids.includes(e.id));
      } catch (e) {
        console.warn('[trainingGenerator] Could not fetch employees:', e.message);
      }
    }

    // ── Build & invoke AI ───────────────────────────────────
    const selectedModel = model_preference || 'automatic';

    const prompt = buildTrainingPrompt({
      title, industry,
      tenantName: tenant_name || tenant_id,
      auditEvents,
      clockSummary,
      employeeContext,
    });

    const modelParams = { prompt };
    if (selectedModel !== 'automatic') modelParams.model = selectedModel;

    const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM(modelParams);
    const generatedContent = typeof aiResult === 'string' ? aiResult : aiResult?.response || '';

    // ── Save AIDocument ─────────────────────────────────────
    const savedDoc = await base44.asServiceRole.entities.AIDocument.create({
      tenant_id,
      outlet_id: outlet_id || null,
      document_type: 'training_module',
      title,
      industry_context: industry,
      principle: 'renew',
      content_markdown: generatedContent,
      source_context: {
        days_lookback,
        audit_events_count: auditEvents.length,
        clock_records_count: clockRecords.length,
        clock_summary: clockSummary,
        employee_ids_targeted: employee_ids,
        top_audit_actions: auditEvents.slice(0, 5).map(e => e.action_type),
        user_notes: notes,
      },
      model_used: selectedModel,
      ai_confidence_score: clockRecords.length > 0 ? 90 : 75,
      status: 'in_review', // Training modules always require manager review
      auto_publish_eligible: true,
      linked_employee_ids: employee_ids,
      version: 1,
      notes,
    });

    // ── Audit Log ───────────────────────────────────────────
    await base44.asServiceRole.entities.AuditLog.create({
      tenant_id,
      actor_id: user.id,
      actor_name: user.full_name,
      actor_role: user.role,
      action_type: 'AI_TRAINING_GENERATED',
      module: 'workforce',
      target_entity: 'AIDocument',
      target_record_id: savedDoc.id,
      outlet_id: outlet_id || null,
      details: `AI generated Training Module "${title}" using ${auditEvents.length} audit events and ${clockRecords.length} clock records. Model: ${selectedModel}. Targeted employees: ${employee_ids.length || 'all'}`,
    });

    return Response.json({
      success: true,
      document_id: savedDoc.id,
      title,
      status: 'in_review',
      model_used: selectedModel,
      data_sources: {
        audit_events: auditEvents.length,
        clock_records: clockRecords.length,
        employees_targeted: employeeContext.length,
      },
      content_preview: generatedContent.slice(0, 300) + '...',
    });

  } catch (error) {
    console.error('[trainingGenerator] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});