// ============================================================
// ORBITAN METRICS ENGINE — Backend Function (ADR-0033)
// Metrics & Analytics Registry compute engine + Observability
// Stream bridge to actionDispatcher (ADR-0032).
//
// Receives { metric_key, tenant_id, outlet_id, evaluate_threshold }
// Resolves the MetricDefinition (tenant override → system default),
// fetches source records (RLS-scoped), computes the value per
// aggregation_mode, and returns a standardised result.
//
// Observability Stream: when threshold_config is present and the
// value breaches a bound, this engine EMITS an event to
// actionDispatcher rather than executing remediation itself.
// This keeps the Action Engine as the sole traffic controller for
// all automated remediation — metrics quantify, actions execute.
//
// Phase 1 MVP: implements sum / count / average / ratio / custom
// (with inventory_value_sgd as the first custom formula) and
// threshold emission for po_pending_count.
// EXIT-READY: Pure Deno, zero external deps.
// ============================================================

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// ── Custom formula registry ──
// Each custom-mode MetricDefinition references a formula_ref here.
// Keep these pure functions of the source records array.
const CUSTOM_FORMULAS = {
  // Sum of (current_stock × cost_per_unit) across all active inventory items.
  inventory_value_sgd: (records) =>
    records.reduce((sum, r) => sum + ((Number(r.current_stock) || 0) * (Number(r.cost_per_unit) || 0)), 0),
};

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { metric_key, tenant_id, outlet_id, evaluate_threshold = true } = body;

    if (!metric_key) {
      return Response.json({ error: 'metric_key is required' }, { status: 400 });
    }

    const targetTenantId = tenant_id || user.data?.tenant_id;
    if (!targetTenantId) {
      return Response.json({ error: 'tenant_id required (user has no tenant_id)' }, { status: 400 });
    }

    // ── Resolve MetricDefinition (tenant override → system default) ──
    const definitions = await base44.entities.MetricDefinition.filter({
      metric_key,
      is_active: true,
    });
    const tenantDef = definitions.find((d) => d.tenant_id === targetTenantId);
    const systemDef = definitions.find((d) => d.tenant_id === 'system');
    const def = tenantDef || systemDef;

    if (!def) {
      return Response.json({ error: `No active MetricDefinition for '${metric_key}'` }, { status: 404 });
    }

    // ── Fetch source records (RLS scoping applies automatically via base44 client) ──
    const sourceEntityName = def.source_entities && def.source_entities[0];
    if (!sourceEntityName) {
      return Response.json({ error: 'MetricDefinition has no source_entities' }, { status: 500 });
    }
    const entityApi = base44.entities[sourceEntityName];
    if (!entityApi || typeof entityApi.filter !== 'function') {
      return Response.json({ error: `Entity '${sourceEntityName}' not accessible via SDK` }, { status: 500 });
    }
    const sourceFilter = { ...(def.source_filter || {}) };
    const records = await entityApi.filter(sourceFilter, '-created_date', 500);

    // ── Compute value per aggregation_mode ──
    let value = 0;
    switch (def.aggregation_mode) {
      case 'sum':
        value = records.reduce((s, r) => s + (Number(r[def.value_field]) || 0), 0);
        break;
      case 'count':
        value = records.length;
        break;
      case 'average':
        value = records.length
          ? records.reduce((s, r) => s + (Number(r[def.value_field]) || 0), 0) / records.length
          : 0;
        break;
      case 'ratio': {
        const num = records.reduce((s, r) => s + (Number(r[def.numerator_field]) || 0), 0);
        const den = records.reduce((s, r) => s + (Number(r[def.denominator_field]) || 0), 0);
        value = den ? num / den : 0;
        break;
      }
      case 'custom': {
        const formula = CUSTOM_FORMULAS[def.formula_ref];
        if (!formula) {
          return Response.json({ error: `Custom formula '${def.formula_ref}' not implemented in metricsEngine` }, { status: 500 });
        }
        value = formula(records);
        break;
      }
      default:
        return Response.json({ error: `Unsupported aggregation_mode '${def.aggregation_mode}'` }, { status: 500 });
    }

    const result = {
      success: true,
      metric_key: def.metric_key,
      display_name: def.display_name,
      description: def.description,
      module: def.module,
      unit: def.unit,
      value: round2(value),
      record_count: records.length,
      aggregation_mode: def.aggregation_mode,
      formula_version: def.formula_version,
      source_entity: sourceEntityName,
      computed_at: new Date().toISOString(),
    };

    // ── Observability Stream: threshold breach → emit event to actionDispatcher ──
    const tc = def.threshold_config;
    if (evaluate_threshold && tc && tc.trigger_event) {
      // Cooldown enforcement
      const cooldownMins = tc.cooldown_minutes != null ? tc.cooldown_minutes : 60;
      const lastEmitted = def.last_breach_emitted_at ? new Date(def.last_breach_emitted_at).getTime() : 0;
      const cooledDown = cooldownMins <= 0 || (Date.now() - lastEmitted) >= cooldownMins * 60 * 1000;

      let breach = null;
      if (tc.critical_above != null && value > tc.critical_above) breach = 'critical_above';
      else if (tc.critical_below != null && value < tc.critical_below) breach = 'critical_below';
      else if (tc.warn_above != null && value > tc.warn_above) breach = 'warn_above';
      else if (tc.warn_below != null && value < tc.warn_below) breach = 'warn_below';

      if (breach && cooledDown) {
        try {
          await base44.functions.invoke('actionDispatcher', {
            trigger_event: tc.trigger_event,
            tenant_id: targetTenantId,
            outlet_id: outlet_id || null,
            entity_type: 'MetricDefinition',
            entity_id: def.id,
            data: {
              metric_key: def.metric_key,
              display_name: def.display_name,
              value: result.value,
              unit: def.unit,
              breach,
              threshold_config: {
                warn_above: tc.warn_above,
                warn_below: tc.warn_below,
                critical_above: tc.critical_above,
                critical_below: tc.critical_below,
              },
            },
          });
          // Stamp cooldown timestamp
          try {
            await base44.entities.MetricDefinition.update(def.id, {
              last_breach_emitted_at: new Date().toISOString(),
            });
          } catch (stampErr) {
            console.error('[metricsEngine] cooldown stamp failed:', stampErr?.message);
          }
        } catch (dispatchErr) {
          console.error('[metricsEngine] threshold dispatch failed:', dispatchErr?.message);
        }
      }
    }

    return Response.json(result);
  } catch (error) {
    console.error('[metricsEngine] fatal:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});