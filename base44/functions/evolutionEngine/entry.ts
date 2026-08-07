import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { isProductionRecord } from '../../shared/test-lab-config.ts';

Deno.serve(async (req) => {
  const startTime = Date.now();
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, tenant_id, outlet_id } = body;

    if (!action) {
      return Response.json({ error: 'action is required (analyze | review_proposal | measure)' }, { status: 400 });
    }

    const resolvedTenantId = tenant_id || user.data?.tenant_id;
    if (!resolvedTenantId) {
      return Response.json({ error: 'tenant_id is required — could not resolve from user context' }, { status: 400 });
    }

    // ── STEP 0: Check if Orbit Evolution is enabled ──
    const settings = await base44.asServiceRole.entities.SystemSettings.list();
    const globalSettings = settings[0];

    if (globalSettings && globalSettings.orbit_evolution_enabled === false) {
      return Response.json({
        evolution_disabled: true,
        message: 'Orbit Evolution is currently disabled by the platform administrator.',
      });
    }

    // ── ACTION: ANALYZE ──
    // Scans OrbitUsageTracker for patterns and generates EvolutionProposal records
    if (action === 'analyze') {
      // Fetch recent usage data for this tenant
      const usageRecordsRaw = await base44.asServiceRole.entities.OrbitUsageTracker.filter(
        { tenant_id: resolvedTenantId, status: 'success' },
        '-created_date',
        200
      );
      // Exclude test usage records using canonical helper (Build #28.2P-R.0R.1A)
      const usageRecords = (usageRecordsRaw || []).filter(r => isProductionRecord(r));

      // Fetch existing proposals to avoid duplicates
      const existingProposals = await base44.asServiceRole.entities.EvolutionProposal.filter(
        { tenant_id: resolvedTenantId, status: { $in: ['pending_review', 'approved', 'measuring'] } },
        '-created_date',
        50
      );

      // Analyze usage patterns
      const serviceCounts: Record<string, number> = {};
      const moduleActivity: Record<string, number> = {};

      for (const record of usageRecords) {
        const svc = record.service_key || 'unknown';
        serviceCounts[svc] = (serviceCounts[svc] || 0) + 1;

        const meta = record.metadata || {};
        if (meta.module) {
          moduleActivity[meta.module] = (moduleActivity[meta.module] || 0) + 1;
        }
      }

      // Identify patterns and generate proposals
      const proposals: any[] = [];
      const governanceMode = globalSettings?.ai_governance_mode || 'proactive_approval';

      // Pattern 1: High AI usage in procurement → suggest automation
      if ((serviceCounts['procurement_ai'] || serviceCounts['replenishment'] || 0) > 10) {
        const alreadyExists = existingProposals.some(
          (p) => p.proposal_type === 'procurement_improvement' && p.status === 'pending_review'
        );
        if (!alreadyExists) {
          proposals.push({
            tenant_id: resolvedTenantId,
            outlet_id: outlet_id || null,
            proposal_type: 'procurement_improvement',
            title: 'Automate repetitive purchase order creation',
            description: 'Orbit Intelligence detected frequent manual PO creation for recurring items. Consider setting up automated replenishment rules to reduce manual workload.',
            observed_pattern: `${serviceCounts['procurement_ai'] || serviceCounts['replenishment'] || 0} procurement-related AI requests in recent activity.`,
            expected_impact: 'high',
            affected_modules: ['procurement', 'inventory'],
            governance_mode: governanceMode,
            status: governanceMode === 'proactive_approval' ? 'pending_review' : 'implemented',
            ai_confidence_score: 78,
            usage_data_summary: { service_counts: serviceCounts, module_activity: moduleActivity },
            principle: 'refine',
          });
        }
      }

      // Pattern 2: Low module adoption → suggest configuration review
      const lowUsageModules = Object.keys(moduleActivity).filter(
        (m) => moduleActivity[m] < 3 && m !== 'unknown'
      );
      if (lowUsageModules.length > 0) {
        const alreadyExists = existingProposals.some(
          (p) => p.proposal_type === 'module_configuration' && p.status === 'pending_review'
        );
        if (!alreadyExists) {
          proposals.push({
            tenant_id: resolvedTenantId,
            outlet_id: outlet_id || null,
            proposal_type: 'module_configuration',
            title: `Review underutilised module: ${lowUsageModules[0]}`,
            description: `Orbit Intelligence detected low activity in the ${lowUsageModules[0]} module. Consider reviewing the configuration or providing additional training to increase adoption.`,
            observed_pattern: `Module "${lowUsageModules[0]}" has only ${moduleActivity[lowUsageModules[0]]} recent interactions.`,
            expected_impact: 'medium',
            affected_modules: lowUsageModules,
            governance_mode: governanceMode,
            status: governanceMode === 'proactive_approval' ? 'pending_review' : 'implemented',
            ai_confidence_score: 65,
            usage_data_summary: { low_usage_modules: lowUsageModules, module_activity: moduleActivity },
            principle: 'refine',
          });
        }
      }

      // Pattern 3: High workforce module usage → suggest scheduling automation
      if ((moduleActivity['workforce'] || moduleActivity['scheduling'] || 0) > 15) {
        const alreadyExists = existingProposals.some(
          (p) => p.proposal_type === 'workflow_automation' && p.status === 'pending_review'
        );
        if (!alreadyExists) {
          proposals.push({
            tenant_id: resolvedTenantId,
            outlet_id: outlet_id || null,
            proposal_type: 'workflow_automation',
            title: 'Automate shift scheduling patterns',
            description: 'Orbit Intelligence detected frequent manual shift management. Consider enabling automated shift templates based on historical patterns to reduce scheduling time.',
            observed_pattern: `${moduleActivity['workforce'] || moduleActivity['scheduling'] || 0} workforce/scheduling interactions detected.`,
            expected_impact: 'medium',
            affected_modules: ['scheduling', 'workforce'],
            governance_mode: governanceMode,
            status: governanceMode === 'proactive_approval' ? 'pending_review' : 'implemented',
            ai_confidence_score: 72,
            usage_data_summary: { workforce_activity: moduleActivity['workforce'] || 0, scheduling_activity: moduleActivity['scheduling'] || 0 },
            principle: 'respond',
          });
        }
      }

      // Bulk create proposals
      let createdProposals: any[] = [];
      if (proposals.length > 0) {
        createdProposals = await base44.asServiceRole.entities.EvolutionProposal.bulkCreate(proposals);
      }

      // Log to audit
      await base44.asServiceRole.entities.AuditLog.create({
        tenant_id: resolvedTenantId,
        actor_id: user.id,
        actor_name: user.full_name,
        actor_role: user.role,
        action_type: 'evolution_analysis_run',
        module: 'system',
        target_entity: 'EvolutionProposal',
        target_record_id: 'batch',
        details: `Orbit Evolution analysis completed. ${createdProposals.length} proposals generated.`,
        new_state: { proposals_generated: createdProposals.length, patterns_analyzed: Object.keys(serviceCounts).length },
      });

      return Response.json({
        success: true,
        analysis_summary: {
          usage_records_analyzed: usageRecords.length,
          patterns_detected: Object.keys(serviceCounts).length,
          proposals_generated: createdProposals.length,
          governance_mode: governanceMode,
        },
        proposals: createdProposals,
        latency_ms: Date.now() - startTime,
      });
    }

    // ── ACTION: REVIEW PROPOSAL ──
    // Manager approves or rejects a proposal
    if (action === 'review_proposal') {
      const { proposal_id, decision, reviewer_notes } = body;

      if (!proposal_id || !decision) {
        return Response.json({ error: 'proposal_id and decision are required' }, { status: 400 });
      }

      if (!['approved', 'rejected'].includes(decision)) {
        return Response.json({ error: 'decision must be "approved" or "rejected"' }, { status: 400 });
      }

      const updated = await base44.asServiceRole.entities.EvolutionProposal.update(proposal_id, {
        status: decision,
        reviewed_by_id: user.id,
        reviewed_by_name: user.full_name,
        reviewed_date: new Date().toISOString(),
        reviewer_notes: reviewer_notes || '',
      });

      // Audit log
      await base44.asServiceRole.entities.AuditLog.create({
        tenant_id: resolvedTenantId,
        actor_id: user.id,
        actor_name: user.full_name,
        actor_role: user.role,
        action_type: decision === 'approved' ? 'evolution_proposal_approved' : 'evolution_proposal_rejected',
        module: 'system',
        target_entity: 'EvolutionProposal',
        target_record_id: proposal_id,
        details: `Orbit Evolution proposal "${updated?.title}" was ${decision} by ${user.full_name}.`,
        new_state: { status: decision, reviewer_notes },
      });

      return Response.json({
        success: true,
        proposal: updated,
        latency_ms: Date.now() - startTime,
      });
    }

    // ── ACTION: MARK IMPLEMENTED ──
    if (action === 'mark_implemented') {
      const { proposal_id, outcome_measured, outcome_improvement_pct } = body;

      if (!proposal_id) {
        return Response.json({ error: 'proposal_id is required' }, { status: 400 });
      }

      const updated = await base44.asServiceRole.entities.EvolutionProposal.update(proposal_id, {
        status: 'completed',
        implemented_date: new Date().toISOString(),
        outcome_measured: outcome_measured || 'Implementation completed',
        outcome_improvement_pct: outcome_improvement_pct || null,
      });

      return Response.json({
        success: true,
        proposal: updated,
        latency_ms: Date.now() - startTime,
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[evolutionEngine] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});