import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * OrbitanOS — Platform Orchestrator
 * System Health Aggregator for the Product Owner.
 *
 * Aggregates cross-tenant intelligence from:
 *   - IssueLog (pilot feedback, bugs, by module)
 *   - AuditLog (shield blocks, override events)
 *   - EvolutionProposal (pending AI improvement proposals)
 *   - FinanceSyncQueue (failed/stuck sync entries)
 *   - GovernanceOverride (pending human approval gates)
 *
 * Returns a unified Platform Health Score + actionable insights.
 * Admin-only. Powers the "Regulate" + "Refine" principles.
 *
 * Exit-Ready: pure aggregation engine — portable to any stack.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Platform admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { scope } = body; // 'platform' (default) or 'tenant'

    const sr = base44.asServiceRole;

    // ── Parallel data collection ──────────────────────────────────
    const [
      issues,
      shieldBlocks,
      overridesPending,
      evolutionPending,
      syncFailed,
      syncPending,
      systemSettingsArr,
    ] = await Promise.all([
      sr.entities.IssueLog.list('-created_date', 200).catch(() => []),
      sr.entities.AuditLog.filter({ shield_outcome: 'blocked' }, '-created_date', 100).catch(() => []),
      sr.entities.GovernanceOverride.filter({ status: 'pending' }, '-created_date', 50).catch(() => []),
      sr.entities.EvolutionProposal.filter({ status: 'pending_review' }, '-created_date', 50).catch(() => []),
      sr.entities.FinanceSyncQueue.filter({ status: 'failed' }, '-created_date', 50).catch(() => []),
      sr.entities.FinanceSyncQueue.filter({ status: 'pending' }, '-created_date', 50).catch(() => []),
      sr.entities.SystemSettings.list().catch(() => []),
    ]);

    const settings = systemSettingsArr[0] || null;

    // ── IssueLog breakdown ────────────────────────────────────────
    const openIssues = (issues || []).filter(i =>
      !['closed', 'released', 'resolved'].includes(i.workflow_status) &&
      !['resolved', 'wont_fix', 'duplicate'].includes(i.status)
    );

    const bugsByModule = {};
    const criticalIssues = [];
    for (const issue of openIssues) {
      const mod = issue.module || 'general';
      bugsByModule[mod] = (bugsByModule[mod] || 0) + 1;
      if (issue.severity === 'critical' || issue.ai_priority === 'critical') {
        criticalIssues.push({
          id: issue.id,
          title: issue.title,
          module: mod,
          severity: issue.severity,
          tenant_id: issue.tenant_id,
        });
      }
    }

    const topBugModules = Object.entries(bugsByModule)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([module, count]) => ({ module, count }));

    // ── Shield intelligence ──────────────────────────────────────
    const recentBlocks = (shieldBlocks || []).slice(0, 10).map(b => ({
      id: b.id,
      action_type: b.action_type,
      module: b.module,
      actor_name: b.actor_name,
      details: b.details,
      created_date: b.created_date,
    }));

    // ── Finance sync health ────────────────────────────────────────
    const syncHealth = {
      failed_count: (syncFailed || []).length,
      pending_count: (syncPending || []).length,
      failed_entries: (syncFailed || []).slice(0, 5).map(f => ({
        id: f.id,
        tenant_id: f.tenant_id,
        queue_type: f.queue_type,
        source_entity: f.source_entity,
        last_error: f.last_error,
        sync_attempts: f.sync_attempts,
      })),
    };

    // ── Evolution intelligence ────────────────────────────────────
    const evolutionInsights = (evolutionPending || []).slice(0, 5).map(e => ({
      id: e.id,
      title: e.title,
      proposal_type: e.proposal_type,
      expected_impact: e.expected_impact,
      ai_confidence_score: e.ai_confidence_score,
      tenant_id: e.tenant_id,
    }));

    // ── Platform Health Score calculation ─────────────────────────
    // Weighted: critical issues (40%), shield blocks (25%), failed syncs (20%), pending overrides (15%)
    const criticalPenalty = Math.min(criticalIssues.length * 15, 40);
    const blockPenalty = Math.min((shieldBlocks || []).length * 3, 25);
    const syncFailPenalty = Math.min(syncHealth.failed_count * 5, 20);
    const overridePenalty = Math.min(overridesPending.length * 4, 15);

    const rawScore = 100 - criticalPenalty - blockPenalty - syncFailPenalty - overridePenalty;
    const healthScore = Math.max(0, Math.round(rawScore));
    const healthStatus = healthScore >= 85 ? 'green' : healthScore >= 65 ? 'amber' : 'red';

    // ── Actionable insights ───────────────────────────────────────
    const insights = [];

    if (criticalIssues.length > 0) {
      insights.push({
        priority: 'critical',
        principle: 'respond',
        label: `${criticalIssues.length} critical issue${criticalIssues.length === 1 ? '' : 's'} need immediate attention`,
        link: '/leader-org?tab=feedback-intelligence',
        icon: 'AlertTriangle',
      });
    }

    if (topBugModules.length > 0) {
      const top = topBugModules[0];
      insights.push({
        priority: 'high',
        principle: 'refine',
        label: `Module "${top.module}" has the most open feedback (${top.count} items) — prioritise for next sprint`,
        link: '/leader-org?tab=feedback-intelligence',
        icon: 'Bug',
      });
    }

    if (syncHealth.failed_count > 0) {
      insights.push({
        priority: 'high',
        principle: 'regulate',
        label: `${syncHealth.failed_count} finance sync${syncHealth.failed_count === 1 ? '' : 's'} failed — review Xero connection or retry queue`,
        link: '/platform/integrations',
        icon: 'RefreshCw',
      });
    }

    if (overridesPending.length > 0) {
      insights.push({
        priority: 'medium',
        principle: 'regulate',
        label: `${overridesPending.length} governance override${overridesPending.length === 1 ? '' : 's'} pending human review`,
        link: '/platform/shield',
        icon: 'Shield',
      });
    }

    if (evolutionInsights.length > 0) {
      const top = evolutionInsights
        .filter(e => e.ai_confidence_score)
        .sort((a, b) => (b.ai_confidence_score || 0) - (a.ai_confidence_score || 0))[0];
      if (top) {
        insights.push({
          priority: 'low',
          principle: 'renew',
          label: `Orbit Evolution recommends: "${top.title}" (${top.ai_confidence_score}% confidence)`,
          link: '/platform/shield',
          icon: 'Sparkles',
        });
      }
    }

    if (insights.length === 0) {
      insights.push({
        priority: 'low',
        principle: 'respond',
        label: 'All systems healthy — no critical actions required',
        link: '/leader-org',
        icon: 'CheckCircle2',
      });
    }

    return Response.json({
      health_score: healthScore,
      health_status: healthStatus,
      generated_at: new Date().toISOString(),
      system_state: {
        maintenance_mode: settings?.maintenance_mode || false,
        shield_level: settings?.shield_level || 'auditor',
        nexus_ai_enabled: settings?.nexus_ai_enabled !== false,
        billing_paused: settings?.billing_paused !== false,
        platform_version: settings?.platform_version || null,
      },
      metrics: {
        open_issues: openIssues.length,
        critical_issues: criticalIssues.length,
        shield_blocks: (shieldBlocks || []).length,
        pending_overrides: (overridesPending || []).length,
        pending_evolution_proposals: (evolutionPending || []).length,
        failed_syncs: syncHealth.failed_count,
        pending_syncs: syncHealth.pending_count,
      },
      top_bug_modules: topBugModules,
      critical_issues: criticalIssues.slice(0, 5),
      recent_shield_blocks: recentBlocks,
      sync_health: syncHealth,
      evolution_insights: evolutionInsights,
      insights,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});