// ============================================================
// ORBITAN ACTION DISPATCHER — Backend Function (ADR-0032)
// Polymorphic Action & Automation Engine.
// Receives a trigger event + payload, evaluates matching
// AutomationRule records, runs them through Shield governance
// context, and executes the configured action.
//
// Phase 1 MVP: implements the `debit_wallet` action type,
// which invokes walletEngine.debit_procurement_sgd for the
// po.received → wallet ledger reference integration.
//
// Called by: frontend emitters (ProcurementPage) and future
// entity automations. Decouples emitters from subscribers.
// EXIT-READY: Pure Deno, zero external deps.
// ============================================================

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Resolve a dot-path like "data.total_amount" against an object.
function resolvePath(obj, path) {
  if (!path) return undefined;
  return String(path).split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

// Evaluate a single AutomationRule condition against the trigger payload.
function evaluateCondition(condition, payload) {
  const actual = resolvePath(payload, condition.field);
  const expected = condition.value;
  switch (condition.operator) {
    case 'equals': return actual === expected;
    case 'not_equals': return actual !== expected;
    case 'gt': return Number(actual) > Number(expected);
    case 'gte': return Number(actual) >= Number(expected);
    case 'lt': return Number(actual) < Number(expected);
    case 'lte': return Number(actual) <= Number(expected);
    case 'contains':
      return Array.isArray(actual) ? actual.includes(expected) : String(actual ?? '').includes(String(expected));
    case 'in_list': return Array.isArray(expected) && expected.includes(actual);
    case 'not_in_list': return Array.isArray(expected) && !expected.includes(actual);
    default: return false;
  }
}

// Evaluate all conditions (AND logic) for a rule.
function ruleMatches(rule, payload) {
  const conditions = rule.conditions || [];
  if (conditions.length === 0) return true;
  return conditions.every(c => evaluateCondition(c, payload));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { trigger_event, tenant_id, outlet_id, entity_id, entity_type, data } = body;

    if (!trigger_event) {
      return Response.json({ error: 'trigger_event is required' }, { status: 400 });
    }

    const targetTenantId = tenant_id || user.data?.tenant_id;
    if (!targetTenantId) {
      return Response.json({ error: 'tenant_id required (user has no tenant_id)' }, { status: 400 });
    }

    // Assemble the canonical trigger payload used for condition evaluation + action mapping.
    const payload = {
      tenant_id: targetTenantId,
      outlet_id: outlet_id || null,
      entity_id: entity_id || null,
      entity_type: entity_type || null,
      triggered_by: user.id,
      triggered_by_name: user.full_name,
      triggered_by_role: user.role,
      data: data || {},
    };

    // ── Resolve matching AutomationRule records ──
    // RLS read allows system defaults + the caller's tenant rules.
    const rules = await base44.entities.AutomationRule.filter({
      trigger_event,
      is_active: true,
    });

    // Prefer tenant-specific rules over system defaults when both match.
    const tenantRules = rules.filter(r => r.tenant_id === targetTenantId);
    const systemRules = rules.filter(r => r.tenant_id === 'system');
    const candidateRules = [...tenantRules, ...systemRules];

    const fired = [];
    const skipped = [];
    const errors = [];

    for (const rule of candidateRules) {
      if (!ruleMatches(rule, payload)) {
        skipped.push({ rule_key: rule.rule_key, reason: 'conditions_not_met' });
        continue;
      }

      try {
        // ── Execute the action ──
        const cfg = rule.action_config || {};
        let actionResult;

        if (rule.action_type === 'debit_wallet' || rule.action_type === 'credit_wallet') {
          // Invoke walletEngine with the mapped payload.
          const walletPayload = {
            action: cfg.wallet_action || (rule.action_type === 'debit_wallet' ? 'debit_procurement_sgd' : 'credit_wallet'),
            tenant_id: targetTenantId,
            outlet_id: payload.outlet_id,
            amount: cfg.amount_field ? resolvePath(payload, cfg.amount_field) : resolvePath(payload, 'data.total_amount'),
            reference_id: cfg.reference_id_field ? resolvePath(payload, cfg.reference_id_field) : payload.entity_id,
            reference_type: cfg.reference_type || payload.entity_type,
            reason: cfg.memo || rule.label,
            metadata: cfg.metadata_fields
              ? cfg.metadata_fields.reduce((acc, f) => {
                  acc[f] = resolvePath(payload, `data.${f}`);
                  return acc;
                }, {})
              : (payload.data || {}),
          };
          actionResult = await base44.functions.invoke('walletEngine', walletPayload);
        } else if (rule.action_type === 'no_op') {
          actionResult = { no_op: true };
        } else {
          skipped.push({ rule_key: rule.rule_key, reason: `action_type '${rule.action_type}' not implemented in this phase` });
          continue;
        }

        // ── Update rule fire stats ──
        try {
          await base44.entities.AutomationRule.update(rule.id, {
            fire_count: (rule.fire_count || 0) + 1,
            last_fired_at: new Date().toISOString(),
          });
        } catch (statErr) {
          console.error('[actionDispatcher] rule stat update failed:', statErr?.message);
        }

        // ── Audit log ──
        try {
          await base44.entities.AuditLog.create({
            tenant_id: targetTenantId,
            outlet_id: payload.outlet_id || null,
            actor_id: user.id,
            actor_name: user.full_name,
            actor_role: user.role,
            action_type: 'AUTOMATION_RULE_FIRED',
            module: rule.module,
            target_entity: payload.entity_type || rule.trigger_entity,
            target_record_id: payload.entity_id,
            details: `AutomationRule '${rule.rule_key}' fired for event '${trigger_event}'. Action: ${rule.action_type}.`,
            new_state: { rule_key: rule.rule_key, action_type: rule.action_type, result_status: 'dispatched' },
            shield_outcome: 'not_evaluated',
          });
        } catch (auditErr) {
          console.error('[actionDispatcher] AuditLog write failed:', auditErr?.message);
        }

        fired.push({
          rule_key: rule.rule_key,
          action_type: rule.action_type,
          result: actionResult?.data || actionResult || { dispatched: true },
        });
      } catch (actionErr) {
        errors.push({
          rule_key: rule.rule_key,
          error: actionErr?.message || 'Action execution failed',
        });
      }
    }

    return Response.json({
      success: true,
      trigger_event,
      rules_evaluated: candidateRules.length,
      rules_fired: fired.length,
      fired,
      skipped,
      errors,
    });
  } catch (error) {
    console.error('[actionDispatcher] fatal:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});