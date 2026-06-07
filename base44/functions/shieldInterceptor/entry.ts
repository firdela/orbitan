import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * OrbitanOS — Shield Interceptor
 * Policy-as-Code enforcement engine for the Regulate principle.
 *
 * Evaluates GovernancePolicy rules before sensitive write operations.
 * Supports: block (Guardian), notify (Auditor), auto_remediate (Enterprise).
 *
 * Payload: { action, entity_name, data, tenant_id }
 * Returns: { allowed: bool, effect: string, policy_name: string, reason: string }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Platform admins bypass all shield checks
    if (user.role === 'admin') {
      return Response.json({ allowed: true, bypassed_by: 'admin_role' });
    }

    const body = await req.json();
    const { action, entity_name, data, tenant_id } = body;

    if (!action || !entity_name) {
      return Response.json({ error: 'Missing required fields: action, entity_name' }, { status: 400 });
    }

    const resolvedTenantId = tenant_id || user.data?.tenant_id;
    if (!resolvedTenantId) {
      return Response.json({ allowed: true, reason: 'No tenant context — pass-through' });
    }

    // Fetch active policies for this entity and tenant
    const policies = await base44.asServiceRole.entities.GovernancePolicy.filter({
      tenant_id: resolvedTenantId,
      is_active: true
    });

    const applicablePolicies = policies.filter(p =>
      p.target_entity === entity_name &&
      (p.trigger_action === 'all' || p.trigger_action === action)
    );

    if (applicablePolicies.length === 0) {
      return Response.json({ allowed: true, reason: 'No applicable policies' });
    }

    const violations = [];

    for (const policy of applicablePolicies) {
      const condition = policy.condition_json || {};
      let triggered = false;

      // Evaluate condition logic
      if (condition.role_not && user.role === condition.role_not) triggered = true;
      if (condition.role_required && user.role !== condition.role_required) triggered = true;
      if (condition.amount_gt && data?.amount > condition.amount_gt) triggered = true;
      if (condition.amount_lt && data?.amount < condition.amount_lt) triggered = true;
      if (condition.field && condition.value && data?.[condition.field] === condition.value) triggered = true;
      if (condition.field_exists && data?.[condition.field_exists] === undefined) triggered = true;

      if (triggered) {
        violations.push(policy);

        // Increment violation count (fire-and-forget)
        base44.asServiceRole.entities.GovernancePolicy.update(policy.id, {
          violations_count: (policy.violations_count || 0) + 1,
          last_triggered_at: new Date().toISOString()
        }).catch(() => {});

        // Write to AuditLog
        base44.asServiceRole.entities.AuditLog.create({
          tenant_id: resolvedTenantId,
          actor_id: user.id,
          actor_name: user.full_name,
          actor_role: user.role,
          action_type: `shield_${policy.effect}`,
          module: 'compliance',
          target_entity: entity_name,
          target_record_id: data?.id || 'new',
          details: `Shield triggered policy [${policy.policy_name}] — effect: ${policy.effect} — action: ${action}`,
          new_state: { policy: policy.policy_name, condition, triggered_by: user.id }
        }).catch(() => {});
      }
    }

    if (violations.length === 0) {
      return Response.json({ allowed: true });
    }

    // Determine final outcome from highest-severity violation
    const blockViolations = violations.filter(v => v.effect === 'block');
    const remediateViolations = violations.filter(v => v.effect === 'auto_remediate');
    const notifyViolations = violations.filter(v => v.effect === 'notify');

    if (blockViolations.length > 0) {
      const critical = blockViolations[0];
      return Response.json({
        allowed: false,
        effect: 'block',
        policy_name: critical.policy_name,
        severity: critical.severity,
        reason: critical.description || `Action blocked by Orbitan Shield™ policy: ${critical.policy_name}`,
        shield_mode: critical.shield_mode
      }, { status: 403 });
    }

    if (remediateViolations.length > 0) {
      const policy = remediateViolations[0];
      return Response.json({
        allowed: true,
        effect: 'auto_remediate',
        policy_name: policy.policy_name,
        remediation_action: policy.auto_remediation_action,
        reason: `Auto-remediation triggered: ${policy.auto_remediation_action}`
      });
    }

    // Notify-only — allow but surface the warning
    return Response.json({
      allowed: true,
      effect: 'notify',
      violations: notifyViolations.map(v => ({
        policy_name: v.policy_name,
        severity: v.severity,
        reason: v.description
      }))
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});