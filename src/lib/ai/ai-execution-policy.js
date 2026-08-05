// ============================================================
// ORBITAN AI OPERATING LAYER — Execution Policy (Build #28.2M)
//
// Technical execution-policy contract for AI agent and capability
// execution. Defines the security boundary for runtime execution:
// permitted tools, integrations, network destinations, credential
// scope, data classifications, runtime/token/cost limits, stop
// conditions, and kill-switch state.
//
// Default policies use: deny by default, narrow tenant scope,
// short-lived credentials, read-only access where possible,
// domain allowlists, sandboxed testing, reversible actions,
// explicit production approval.
//
// Pure JS — zero React imports — safe for tests and backend functions.
// ============================================================

/**
 * Default execution policy for new AI requests.
 * Deny by default — everything not explicitly permitted is denied.
 */
const DEFAULT_EXECUTION_POLICY = {
  environment: 'production',
  permitted_tenant_id: null, // Must be set per-request
  permitted_organisation_id: null,
  permitted_brand_id: null,
  permitted_outlet_id: null,
  allowed_tools: ['InvokeLLM', 'UploadFile'],
  allowed_integrations: ['Core.InvokeLLM', 'Core.UploadFile', 'Core.GenerateImage'],
  allowed_network_destinations: ['platform_builtin'], // No external network calls by default
  credential_scope: 'platform_builtin', // Uses platform credentials, not per-agent
  permitted_data_classifications: ['public', 'internal'],
  max_runtime_seconds: 30,
  max_token_usage: 50000,
  max_cost_credits: 10,
  required_monitoring: true,
  stop_conditions: [
    'kill_switch_activated',
    'policy_denied',
    'max_runtime_exceeded',
    'max_tokens_exceeded',
    'max_cost_exceeded',
    'credential_invalid',
  ],
  escalation_route: '/platform/shield',
  kill_switch_active: false,
};

/**
 * Validates an execution policy against a request context.
 * Blocks execution when the actual context conflicts with the declared policy.
 *
 * @param {object} policy - Execution policy
 * @param {object} context - Request context
 * @returns {{ allowed: boolean, reason: string, violatedConditions: string[] }}
 */
function validateExecutionContext(policy, context) {
  if (!policy) {
    return { allowed: false, reason: 'No execution policy provided — deny by default', violatedConditions: ['no_policy'] };
  }

  const violations = [];

  // Kill switch
  if (policy.kill_switch_active) {
    return { allowed: false, reason: 'AI kill switch is active — execution blocked', violatedConditions: ['kill_switch_activated'] };
  }

  // Tenant scope
  if (policy.permitted_tenant_id && context.tenantId !== policy.permitted_tenant_id) {
    violations.push('tenant_scope_mismatch');
  }

  // Environment
  if (policy.environment && context.environment && policy.environment !== context.environment) {
    violations.push('environment_mismatch');
  }

  // Data classification
  if (context.dataClassification && !policy.permitted_data_classifications.includes(context.dataClassification)) {
    violations.push('data_classification_not_permitted');
  }

  // Tools
  if (context.requestedTool && !policy.allowed_tools.includes(context.requestedTool)) {
    violations.push(`tool_not_permitted:${context.requestedTool}`);
  }

  // Network destinations
  if (context.networkDestination && !policy.allowed_network_destinations.includes(context.networkDestination)) {
    violations.push(`network_destination_not_allowed:${context.networkDestination}`);
  }

  // Runtime
  if (context.estimatedRuntimeSeconds && context.estimatedRuntimeSeconds > policy.max_runtime_seconds) {
    violations.push('max_runtime_exceeded');
  }

  // Token usage
  if (context.estimatedTokens && context.estimatedTokens > policy.max_token_usage) {
    violations.push('max_tokens_exceeded');
  }

  // Cost
  if (context.estimatedCostCredits && context.estimatedCostCredits > policy.max_cost_credits) {
    violations.push('max_cost_exceeded');
  }

  if (violations.length > 0) {
    return {
      allowed: false,
      reason: `Execution policy violations: ${violations.join(', ')}`,
      violatedConditions: violations,
    };
  }

  return { allowed: true, reason: 'Execution context validated', violatedConditions: [] };
}

/**
 * Creates a per-request execution policy from defaults + overrides.
 */
function createExecutionPolicy(overrides = {}) {
  return {
    ...DEFAULT_EXECUTION_POLICY,
    ...overrides,
    stop_conditions: overrides.stop_conditions || DEFAULT_EXECUTION_POLICY.stop_conditions,
  };
}

/**
 * Checks if a stop condition should halt execution.
 */
function shouldStop(policy, condition) {
  if (!policy || !policy.stop_conditions) return false;
  return policy.stop_conditions.includes(condition);
}

export {
  DEFAULT_EXECUTION_POLICY,
  validateExecutionContext,
  createExecutionPolicy,
  shouldStop,
};