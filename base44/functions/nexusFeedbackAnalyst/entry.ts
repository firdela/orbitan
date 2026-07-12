// ============================================================
// ORBIT NEXUS — FEEDBACK ANALYST
// Intelligence service that analyses pilot feedback (IssueLog)
// for sentiment, priority, duplicate detection, and topic tagging.
//
// Triggered by:
//   1. Entity automation on IssueLog create (automatic)
//   2. Admin manual trigger from Feedback Intelligence Dashboard
//
// Contract (NexusFeedbackAnalystRequest):
//   { issue_id?: string, issue_data?: object, action?: 'analyze'|'batch_analyze' }
//
// EXIT-READY: Pure Deno, uses InvokeLLM via Base44 SDK. Zero
// external deps. To migrate to standalone Nexus: update the
// InvokeLLM call to point to the new AI Gateway URL.
//
// Created by Muhammad Firdaus Bin Ismail
// © 2024–2026 Orbitan & OrbitanOS. All Rights Reserved.
// ============================================================

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Allow both authenticated users (admin manual trigger) and
    // automation-triggered invocations (no user context — uses service role)
    const isAutomation = !user;
    const isAdmin = user?.role === 'admin';

    const body = await req.json().catch(() => ({}));
    const { issue_id, issue_data, action } = body;

    // ── AUTOMATION PAYLOAD ───────────────────────────────────
    // When triggered by entity automation, the payload contains:
    //   { event: { type, entity_name, entity_id }, data: {...issueLog} }
    const automationEvent = body.event;
    const automationData = body.data;

    let targetIssueId = issue_id || automationEvent?.entity_id || null;
    let targetIssue = issue_data || automationData || null;

    if (!targetIssueId && !targetIssue) {
      return Response.json({ error: 'issue_id or automation payload required' }, { status: 400 });
    }

    // ── FETCH THE ISSUE IF NOT PROVIDED ─────────────────────
    if (!targetIssue && targetIssueId) {
      try {
        const issues = await base44.asServiceRole.entities.IssueLog.filter({ id: targetIssueId });
        targetIssue = issues?.[0] || null;
      } catch (fetchErr) {
        return Response.json({ error: 'Failed to fetch issue: ' + fetchErr.message }, { status: 500 });
      }
    }

    if (!targetIssue) {
      return Response.json({ error: 'Issue not found' }, { status: 404 });
    }

    // Skip if already analysed (unless forced)
    if (targetIssue.ai_analyzed === true && action !== 'force_reanalyze') {
      return Response.json({
        success: true,
        message: 'Issue already analysed',
        issue_id: targetIssue.id || targetIssueId,
        ai_summary: targetIssue.ai_summary,
      });
    }

    // ── FETCH RECENT ISSUES FOR DUPLICATE DETECTION ─────────
    let recentIssues: any[] = [];
    try {
      recentIssues = await base44.asServiceRole.entities.IssueLog.filter(
        { tenant_id: targetIssue.tenant_id },
        '-created_date',
        20
      );
    } catch (recentErr) {
      console.log('[nexusFeedbackAnalyst] Recent issues fetch failed:', recentErr.message);
    }

    const recentSummaries = recentIssues
      .filter((i) => i.id !== targetIssue.id && i.id !== targetIssueId)
      .map((i) => ({
        id: i.id,
        title: i.title,
        module: i.module,
        issue_type: i.issue_type,
        ai_summary: i.ai_summary || '',
      }));

    // ── BUILD LLM PROMPT ────────────────────────────────────
    const prompt = `You are the Orbit Nexus Feedback Analyst. Analyse the following pilot feedback from an OrbitanOS user and produce structured intelligence.

FEEDBACK TO ANALYSE:
- Title: ${targetIssue.title}
- Description: ${targetIssue.description || 'N/A'}
- Issue Type: ${targetIssue.issue_type}
- Module: ${targetIssue.module}
- Severity (user-reported): ${targetIssue.severity}
- Page URL: ${targetIssue.page_url || 'N/A'}

RECENT FEEDBACK (for duplicate detection):
${JSON.stringify(recentSummaries.slice(0, 10), null, 2)}

Analyse this feedback and return:
1. sentiment: one of "positive", "neutral", "negative", "frustrated"
2. priority: one of "low", "medium", "high", "critical" (based on business impact, not just user-reported severity)
3. summary: a one-line summary (max 120 chars) for dashboard display
4. duplicate_group_id: if this feedback is similar to any recent issue, use that issue's id as the group key; otherwise generate a short slug like "inventory_replenishment_slow" that could group similar future reports
5. tags: 1-5 short topic tags (lowercase, underscore_separated) e.g. ["mobile", "loading_speed", "replenishment"]
6. is_duplicate: boolean — true if semantically similar to any recent issue`;

    // ── INVOKE LLM VIA NEXUS GATEWAY ────────────────────────
    let aiResult: any = null;
    try {
      const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative', 'frustrated'] },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            summary: { type: 'string' },
            duplicate_group_id: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            is_duplicate: { type: 'boolean' },
          },
          required: ['sentiment', 'priority', 'summary', 'duplicate_group_id', 'tags', 'is_duplicate'],
        },
      });

      aiResult = llmResponse;
    } catch (llmErr) {
      // If LLM fails, mark as analysed with fallback values so the loop doesn't retry forever
      console.log('[nexusFeedbackAnalyst] LLM invocation failed:', llmErr.message);
      aiResult = {
        sentiment: 'neutral',
        priority: targetIssue.severity || 'medium',
        summary: (targetIssue.title || '').substring(0, 120),
        duplicate_group_id: targetIssue.module + '_general',
        tags: [targetIssue.module, targetIssue.issue_type],
        is_duplicate: false,
        _llm_error: llmErr.message,
      };
    }

    // ── UPDATE THE ISSUELOG RECORD ─────────────────────────
    const updatePayload = {
      ai_analyzed: true,
      ai_analyzed_date: new Date().toISOString(),
      ai_sentiment: aiResult.sentiment,
      ai_priority: aiResult.priority,
      ai_summary: aiResult.summary,
      ai_duplicate_group_id: aiResult.duplicate_group_id,
      ai_tags: aiResult.tags || [],
    };

    // If AI detects a duplicate and the legacy status is still "new", mark as duplicate
    if (aiResult.is_duplicate && targetIssue.status === 'new') {
      updatePayload.status = 'duplicate';
    }

    const issueToUpdateId = targetIssue.id || targetIssueId;
    try {
      await base44.asServiceRole.entities.IssueLog.update(issueToUpdateId, updatePayload);
    } catch (updateErr) {
      return Response.json({ error: 'Failed to update issue: ' + updateErr.message }, { status: 500 });
    }

    // ── TRACK USAGE IN ORBITUSTRACKER ───────────────────────
    try {
      await base44.asServiceRole.entities.OrbitUsageTracker.create({
        tenant_id: targetIssue.tenant_id,
        service_key: 'feedback_analyst',
        routed_function: 'nexusFeedbackAnalyst',
        model_used: 'automatic',
        credits_consumed: 1,
        status: 'success',
        actor_id: user?.id || 'system_automation',
        actor_name: user?.full_name || 'Orbit Nexus Automation',
        shield_outcome: 'not_evaluated',
        metadata: {
          issue_id: issueToUpdateId,
          sentiment: aiResult.sentiment,
          priority: aiResult.priority,
          is_duplicate: aiResult.is_duplicate,
        },
      });
    } catch (trackErr) {
      console.log('[nexusFeedbackAnalyst] Usage tracking failed:', trackErr.message);
    }

    // ── EVOLUTION PROPOSAL TRIGGER ─────────────────────────
    // When 3+ issues share the same AI duplicate group, auto-generate
    // an EvolutionProposal to close the feedback → evolution loop.
    if (aiResult.duplicate_group_id) {
      try {
        const clusterIssues = await base44.asServiceRole.entities.IssueLog.filter(
          { tenant_id: targetIssue.tenant_id, ai_duplicate_group_id: aiResult.duplicate_group_id },
          '-created_date',
          50
        );

        if (clusterIssues.length >= 3) {
          const existingProposals = await base44.asServiceRole.entities.EvolutionProposal.filter(
            { tenant_id: targetIssue.tenant_id, status: 'pending_review' },
            '-created_date',
            50
          );

          const alreadyExists = existingProposals.some(
            (p) => p.usage_data_summary?.cluster_id === aiResult.duplicate_group_id
          );

          if (!alreadyExists) {
            const settings = await base44.asServiceRole.entities.SystemSettings.list();
            const globalSettings = settings?.[0];
            const governanceMode = globalSettings?.ai_governance_mode || 'proactive_approval';
            const clusterLabel = aiResult.duplicate_group_id.replace(/_/g, ' ');
            const frustratedCount = clusterIssues.filter(i => i.ai_sentiment === 'frustrated').length;
            const negativeCount = clusterIssues.filter(i => i.ai_sentiment === 'negative').length;

            await base44.asServiceRole.entities.EvolutionProposal.create({
              tenant_id: targetIssue.tenant_id,
              outlet_id: targetIssue.outlet_id || null,
              proposal_type: 'ui_ux_improvement',
              title: `Address recurring feedback: ${clusterLabel}`,
              description: `Orbit Nexus detected ${clusterIssues.length} similar feedback reports clustered under "${aiResult.duplicate_group_id}". This recurring pattern indicates a product improvement opportunity. AI summary: ${aiResult.summary}`,
              observed_pattern: `${clusterIssues.length} feedback reports clustered under "${aiResult.duplicate_group_id}". Sentiment breakdown: ${frustratedCount} frustrated, ${negativeCount} negative, ${clusterIssues.filter(i => i.ai_sentiment === 'neutral').length} neutral.`,
              expected_impact: clusterIssues.some(i => i.ai_priority === 'critical') ? 'critical' : 'high',
              affected_modules: [...new Set(clusterIssues.map(i => i.module).filter(Boolean))],
              governance_mode: governanceMode,
              status: governanceMode === 'proactive_approval' ? 'pending_review' : 'implemented',
              ai_confidence_score: 80,
              usage_data_summary: {
                cluster_id: aiResult.duplicate_group_id,
                cluster_size: clusterIssues.length,
                issue_ids: clusterIssues.map(i => i.id),
              },
              principle: targetIssue.principle || 'refine',
            });

            console.log(`[nexusFeedbackAnalyst] EvolutionProposal created for cluster "${aiResult.duplicate_group_id}" (${clusterIssues.length} reports)`);
          }
        }
      } catch (evolutionErr) {
        console.log('[nexusFeedbackAnalyst] Evolution proposal creation failed:', evolutionErr.message);
      }
    }

    return Response.json({
      success: true,
      issue_id: issueToUpdateId,
      analysis: {
        sentiment: aiResult.sentiment,
        priority: aiResult.priority,
        summary: aiResult.summary,
        duplicate_group_id: aiResult.duplicate_group_id,
        tags: aiResult.tags,
        is_duplicate: aiResult.is_duplicate,
      },
      triggered_by: isAutomation ? 'automation' : isAdmin ? 'admin_manual' : 'user',
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});