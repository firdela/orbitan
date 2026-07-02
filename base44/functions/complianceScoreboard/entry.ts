// ============================================================
// ORBITANOS — complianceScoreboard Aggregator
// Registry-Driven Trust Score Engine (Operational Trust Score)
//
// Created by Muhammad Firdaus Bin Ismail
// © 2024–2026 Orbitan & OrbitanOS. All Rights Reserved.
//
// ARCHITECTURE:
// This function is a PURE execution engine. It contains ZERO
// hardcoded industry logic. Instead, it reads the trust_pillars
// capability manifest from the tenant's ActivationRegistry record
// and dynamically queries the entities specified there.
//
// To add a new industry: add trust_pillars to its ActivationRegistry.
// This function never changes.
//
// Scoring modes (defined per pillar in the registry):
//   - ratio_healthy:   healthy_count / total_count * 100
//   - violation_count: max(0, 100 - sum(violations_count) * penalty)
//   - count_penalty:   max(0, 100 - record_count * penalty)
//
// Exit-Ready: portable to any stack — re-implement the engine.
// ============================================================

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const PILLAR_KEYS = ['regulatory', 'governance', 'integrity', 'operational'] as const;

const DEFAULT_PILLARS: Record<string, any> = {
  regulatory:   { target_entity: 'ComplianceRecord', filter: {}, weight: 0.4, scoring_mode: 'ratio_healthy', healthy_statuses: ['approved', 'submitted'], label: 'Regulatory' },
  governance:   { target_entity: 'GovernancePolicy', filter: { is_active: true }, weight: 0.3, scoring_mode: 'violation_count', penalty_per_unit: 2, label: 'Shield Governance' },
  integrity:    { target_entity: 'AuditLog', filter: { shield_outcome: 'blocked' }, weight: 0.2, scoring_mode: 'count_penalty', penalty_per_unit: 10, label: 'Audit Integrity' },
  operational:  { target_entity: 'Task', filter: { status: 'pending', priority: 'high' }, weight: 0.1, scoring_mode: 'count_penalty', penalty_per_unit: 10, label: 'Task Velocity' },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { tenant_id, outlet_id } = body;
    const resolvedTenantId = tenant_id || user.data?.tenant_id;

    if (!resolvedTenantId) {
      return Response.json({ ots: null, reason: 'No tenant context', pillars: {}, recommendations: [] });
    }

    // ── Resolve tenant + ActivationRegistry in parallel ──
    const [tenants, registries] = await Promise.all([
      base44.asServiceRole.entities.Tenant.filter({ id: resolvedTenantId }),
      base44.asServiceRole.entities.ActivationRegistry.filter({ is_active: true }),
    ]);

    const tenant = tenants[0];
    if (!tenant) {
      return Response.json({ ots: null, reason: 'Tenant not found', pillars: {}, recommendations: [] });
    }

    // Resolve the industry pack registry and its trust_pillars manifest
    const registry = registries.find((r: any) => r.industry === tenant.industry);
    const pillarsConfig = registry?.trust_pillars || DEFAULT_PILLARS;

    // ── Execute pillar queries in parallel ──
    const pillarResults = await Promise.all(
      PILLAR_KEYS.map(async (key) => {
        const config = pillarsConfig[key] || DEFAULT_PILLARS[key];
        if (!config || !config.target_entity) {
          return { key, score: 100, weight: 0, raw: 0, label: key, detail: 'not_configured' };
        }

        const filter: any = { tenant_id: resolvedTenantId, ...(config.filter || {}) };
        if (outlet_id) filter.outlet_id = outlet_id;

        try {
          const entityClient = (base44.asServiceRole.entities as any)[config.target_entity];
          if (!entityClient || typeof entityClient.filter !== 'function') {
            return { key, score: 100, weight: config.weight || 0, raw: 0, label: config.label || key, detail: 'entity_unavailable' };
          }

          const records = await entityClient.filter(filter, '-created_date', 200);
          const score = scorePillar(config, records || []);

          return {
            key,
            score,
            weight: config.weight || 0,
            raw: (records || []).length,
            label: config.label || key,
            scoring_mode: config.scoring_mode || 'ratio_healthy',
          };
        } catch (err: any) {
          return { key, score: 100, weight: config.weight || 0, raw: 0, label: config.label || key, detail: err.message };
        }
      })
    );

    // ── Synthesize OTS (Operational Trust Score) ──
    const totalWeight = pillarResults.reduce((sum, p) => sum + p.weight, 0) || 1;
    const ots = Math.round(
      pillarResults.reduce((sum, p) => sum + p.score * p.weight, 0) / totalWeight
    );

    const risk_level = ots >= 85 ? 'green' : ots >= 65 ? 'amber' : 'red';

    // ── Build actionable recommendations ──
    const recommendations = buildRecommendations(pillarResults, resolvedTenantId, outlet_id, tenant);

    // ── Persist a ComplianceSnapshot (fire-and-forget) ──
    base44.asServiceRole.entities.ComplianceSnapshot.create({
      tenant_id: resolvedTenantId,
      outlet_id: outlet_id || null,
      ots_score: ots,
      risk_level,
      pillar_breakdown: Object.fromEntries(
        pillarResults.map(p => [p.key, { score: p.score, raw: p.raw, label: p.label }])
      ),
      recommendations: recommendations.map(r => r.label),
      generated_at: new Date().toISOString(),
    }).catch(() => {});

    return Response.json({
      ots,
      risk_level,
      trend: 'stable',
      industry: tenant.industry,
      governance_domain: registry?.governance_domain || tenant.governance_domain || null,
      pillars: Object.fromEntries(
        pillarResults.map(p => [p.key, {
          score: p.score,
          weight: p.weight,
          raw: p.raw,
          label: p.label,
          scoring_mode: p.scoring_mode,
        }])
      ),
      recommendations,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ── Scoring Engine ────────────────────────────────────────────
function scorePillar(config: any, records: any[]): number {
  if (!records || records.length === 0) return 100;
  const mode = config.scoring_mode || 'ratio_healthy';

  switch (mode) {
    case 'ratio_healthy': {
      const healthy = records.filter(r =>
        (config.healthy_statuses || ['approved', 'submitted']).includes(r.status)
      ).length;
      return Math.round((healthy / records.length) * 100);
    }
    case 'violation_count': {
      const totalViolations = records.reduce((sum, r) => sum + (r.violations_count || 0), 0);
      const penalty = config.penalty_per_unit || 2;
      return Math.max(0, 100 - totalViolations * penalty);
    }
    case 'count_penalty': {
      const penalty = config.penalty_per_unit || 10;
      return Math.max(0, 100 - records.length * penalty);
    }
    default:
      return 100;
  }
}

// ── Recommendation Builder ────────────────────────────────────
function buildRecommendations(pillarResults: any[], tenantId: string, outletId: string | null, tenant: any): any[] {
  const recs: any[] = [];
  const base = outletId ? `/workspace/${tenantId}` : `/workspace/${tenantId}`;

  for (const p of pillarResults) {
    if (p.score < 85 && p.weight > 0) {
      let label = '';
      let link = `${base}/compliance`;
      let priority = p.score < 50 ? 'high' : 'medium';

      switch (p.key) {
        case 'regulatory':
          label = `${p.raw} compliance record${p.raw === 1 ? '' : 's'} need attention — submit or approve pending items`;
          link = `${base}/compliance`;
          break;
        case 'governance':
          label = `Shield policies have accumulated violations — review governance overrides`;
          link = `/platform/shield`;
          break;
        case 'integrity':
          label = `${p.raw} blocked action${p.raw === 1 ? '' : 's'} flagged by Shield — review audit trail`;
          link = `${base}/compliance`;
          break;
        case 'operational':
          label = `${p.raw} high-priority task${p.raw === 1 ? '' : 's'} pending — clear backlog to improve velocity`;
          link = `${base}/tasks`;
          break;
        default:
          label = `${p.label}: score ${p.score}`;
      }

      recs.push({ pillar: p.key, priority, label, link });
    }
  }

  // Always include at least one positive note if score is healthy
  if (recs.length === 0) {
    recs.push({
      pillar: 'overall',
      priority: 'low',
      label: 'Operational Trust Score is healthy — no critical actions required',
      link: `${base}/compliance`,
    });
  }

  return recs;
}