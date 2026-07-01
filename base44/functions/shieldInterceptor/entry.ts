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
    const { action, entity_name, data, tenant_id, domain_id } = body;

    if (!action || !entity_name) {
      return Response.json({ error: 'Missing required fields: action, entity_name' }, { status: 400 });
    }

    // Domain-based policy resolution: if domain_id provided, fetch only that domain's policies first
    // This enables hierarchical evaluation (Domain A → B → C priority)

    const resolvedTenantId = tenant_id || user.data?.tenant_id;
    if (!resolvedTenantId) {
      return Response.json({ allowed: true, reason: 'No tenant context — pass-through' });
    }

    // SUBSCRIPTION POLICY CHECK: Enforce resource limits before governance policies
    // This blocks actions that exceed subscription tier limits (employees, outlets, brands)
    const subscriptionCheck = await checkSubscriptionLimits(base44, resolvedTenantId, entity_name, action, data);
    if (!subscriptionCheck.allowed) {
      return Response.json(subscriptionCheck, { status: 403 });
    }

    // Fetch active policies — BOTH tenant-specific AND platform-wide (tenant_id = 'orbitan_platform')
    // Domain-based resolution: if domain_id provided, prioritize that domain's policies
    const [tenantPolicies, platformPolicies] = await Promise.all([
      base44.asServiceRole.entities.GovernancePolicy.filter({
        tenant_id: resolvedTenantId,
        is_active: true
      }),
      base44.asServiceRole.entities.GovernancePolicy.filter({
        tenant_id: 'orbitan_platform',
        is_active: true
      })
    ]);

    const policies = [...tenantPolicies, ...platformPolicies];

    let applicablePolicies = policies.filter(p =>
      p.target_entity === entity_name &&
      (p.trigger_action === 'all' || p.trigger_action === action)
    );

    // If domain_id specified, filter to only that domain's policies (Domain-First architecture)
    if (domain_id) {
      applicablePolicies = applicablePolicies.filter(p => p.domain_id === domain_id);
    }

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
        shield_mode: critical.shield_mode,
        domain_id: critical.domain_id,
        // Override-ready context: pre-filled data for GovernanceOverride creation
        override_context: {
          target_entity: entity_name,
          target_record_id: data?.id || null,
          block_reason: critical.description,
          request_type: mapEntityToOverrideType(entity_name),
          policy_effect: critical.effect,
          condition_triggered: critical.condition_json
        }
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

// Helper: Map entity names to GovernanceOverride.request_type enum
function mapEntityToOverrideType(entityName: string): string {
  const entityMap: Record<string, string> = {
    SalesInvoice: 'finance_threshold',
    PurchaseOrder: 'finance_threshold',
    WalletTransaction: 'finance_threshold',
    ClockRecord: 'clock_in_compliance',
    InventoryItem: 'stock_limit',
    Shift: 'schedule_breach',
    ComplianceRecord: 'compliance_gate'
  };
  return entityMap[entityName] || 'custom';
}

// Helper: Check subscription policy resource limits
async function checkSubscriptionLimits(base44: any, tenantId: string, entityName: string, action: string, data: any) {
  try {
    // Fetch tenant and subscription policy
    const [tenants, policies] = await Promise.all([
      base44.asServiceRole.entities.Tenant.filter({ id: tenantId }),
      base44.asServiceRole.entities.SubscriptionPolicy.filter({ is_active: true })
    ]);

    const tenant = tenants[0];
    if (!tenant) return { allowed: true, reason: 'Tenant not found — pass-through' };

    const plan = tenant.subscription_plan || 'orbitan_starter';
    const policy = policies.find(p => p.plan_key === plan);

    // If no policy exists, use hardcoded fallback (backward compatibility)
    if (!policy) {
      return { allowed: true, reason: 'No subscription policy — using fallback' };
    }

    const limits = policy.limits || {};
    const planTier = policy.tier || 1;

    // Enterprise plans have no limits
    if (planTier === 4 || plan === 'orbitan_enterprise') {
      return { allowed: true, reason: 'Enterprise plan — unlimited' };
    }

    // Check entity-specific limits
    if (entityName === 'Employee' && action === 'create') {
      const currentEmployees = await base44.asServiceRole.entities.Employee.filter({ tenant_id: tenantId, status: 'active' });
      const maxEmployees = limits.max_employees ?? 999999;
      
      if (currentEmployees.length >= maxEmployees) {
        return {
          allowed: false,
          effect: 'block',
          policy_name: 'subscription_employee_limit',
          severity: 'high',
          reason: `Subscription limit reached: Maximum ${maxEmployees} employees allowed on ${policy.plan_name || plan}. Please upgrade your plan or deactivate inactive employees.`,
          shield_mode: 'guardian',
          limit_type: 'employee',
          limit_value: maxEmployees,
          current_value: currentEmployees.length,
          override_context: {
            target_entity: entityName,
            target_record_id: data?.id || null,
            block_reason: `Employee limit: ${currentEmployees.length}/${maxEmployees}`,
            request_type: 'custom',
            policy_effect: 'block',
            upgrade_required: true,
            current_plan: plan,
            current_tier: planTier
          }
        };
      }
    }

    if (entityName === 'Outlet' && action === 'create') {
      const currentOutlets = await base44.asServiceRole.entities.Outlet.filter({ tenant_id: tenantId, status: 'active' });
      const maxOutlets = limits.max_outlets ?? 999999;
      
      if (currentOutlets.length >= maxOutlets) {
        return {
          allowed: false,
          effect: 'block',
          policy_name: 'subscription_outlet_limit',
          severity: 'high',
          reason: `Subscription limit reached: Maximum ${maxOutlets} outlets allowed on ${policy.plan_name || plan}. Please upgrade your plan.`,
          shield_mode: 'guardian',
          limit_type: 'outlet',
          limit_value: maxOutlets,
          current_value: currentOutlets.length,
          override_context: {
            target_entity: entityName,
            target_record_id: data?.id || null,
            block_reason: `Outlet limit: ${currentOutlets.length}/${maxOutlets}`,
            request_type: 'custom',
            policy_effect: 'block',
            upgrade_required: true,
            current_plan: plan,
            current_tier: planTier
          }
        };
      }
    }

    if (entityName === 'Client' && action === 'create') {
      const currentBrands = await base44.asServiceRole.entities.Client.filter({ tenant_id: tenantId, status: 'active' });
      const maxBrands = limits.max_brands ?? 999999;
      
      if (currentBrands.length >= maxBrands) {
        return {
          allowed: false,
          effect: 'block',
          policy_name: 'subscription_brand_limit',
          severity: 'high',
          reason: `Subscription limit reached: Maximum ${maxBrands} brands allowed on ${policy.plan_name || plan}. Please upgrade your plan.`,
          shield_mode: 'guardian',
          limit_type: 'brand',
          limit_value: maxBrands,
          current_value: currentBrands.length,
          override_context: {
            target_entity: entityName,
            target_record_id: data?.id || null,
            block_reason: `Brand limit: ${currentBrands.length}/${maxBrands}`,
            request_type: 'custom',
            policy_effect: 'block',
            upgrade_required: true,
            current_plan: plan,
            current_tier: planTier
          }
        };
      }
    }

    return { allowed: true, reason: 'Within subscription limits' };

  } catch (error) {
    // Fail open — don't block operations if subscription check fails
    return { allowed: true, reason: 'Subscription check error — pass-through', error: error.message };
  }
}