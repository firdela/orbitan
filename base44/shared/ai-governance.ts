// ============================================================
// ORBITAN AI OPERATING LAYER — Runtime Governance Module (Build #28.2N)
//
// Runtime-safe TypeScript governance evaluation for the Nexus gateway
// and other backend functions. Contains the same pure logic as
// src/lib/ai/*.js modules, adapted for the Deno backend environment.
//
// This is the "canonical runtime-safe equivalent" referenced in the
// Phase 2 Task 1 build directive. The frontend src/lib/ai/ modules
// remain the canonical source for the frontend/test environment;
// this module is the canonical source for the backend runtime.
//
// Pure functions only — no SDK calls, no side effects.
// ============================================================

// ── AUTONOMY LEVELS ──────────────────────────────────────────
export const L0_ANSWER = 'L0_answer';
export const L1_RECOMMEND = 'L1_recommend';
export const L2_DRAFT = 'L2_draft';
export const L3_EXECUTE = 'L3_execute';

export const AUTONOMY_LEVELS: Record<string, { level: number; label: string; description: string }> = {
  [L0_ANSWER]: { level: 0, label: 'Answer', description: 'Provides information. No actions taken.' },
  [L1_RECOMMEND]: { level: 1, label: 'Recommend', description: 'Suggests actions. Requires human confirmation.' },
  [L2_DRAFT]: { level: 2, label: 'Draft', description: 'Creates drafts. Not published without review.' },
  [L3_EXECUTE]: { level: 3, label: 'Execute', description: 'Performs actions. Restricted for sensitive operations.' },
};

export const L3_PROHIBITED_ACTIONS = [
  'payment',
  'payroll_change',
  'employee_status_change',
  'access_permission_change',
  'destructive_database_change',
  'external_publication',
  'legal_contractual_commitment',
  'customer_data_export',
  'production_configuration_change',
];

export function getDefaultAutonomy(): string {
  return L0_ANSWER;
}

export function isValidAutonomyLevel(level: string | null): boolean {
  return !!level && Object.keys(AUTONOMY_LEVELS).includes(level);
}

export function canPerformAction(autonomyLevel: string | null, actionType: string): {
  allowed: boolean;
  requiresApproval: boolean;
  reason: string;
} {
  if (!autonomyLevel || !AUTONOMY_LEVELS[autonomyLevel]) {
    return { allowed: false, requiresApproval: true, reason: 'Unknown autonomy level — deny by default' };
  }
  const level = AUTONOMY_LEVELS[autonomyLevel].level;
  if (level <= 1) {
    return { allowed: false, requiresApproval: true, reason: `${AUTONOMY_LEVELS[autonomyLevel].label} autonomy cannot perform actions autonomously` };
  }
  if (level === 2 && actionType && actionType.includes('publish')) {
    return { allowed: false, requiresApproval: true, reason: 'L2 Draft autonomy cannot publish without human review' };
  }
  if (level === 3) {
    if (L3_PROHIBITED_ACTIONS.includes(actionType)) {
      return { allowed: false, requiresApproval: true, reason: `L3 Execute autonomy is prohibited from performing: ${actionType}` };
    }
    return { allowed: true, requiresApproval: false, reason: 'L3 Execute autonomy permitted for this action' };
  }
  return { allowed: true, requiresApproval: false, reason: 'Action permitted' };
}

// ── PROVENANCE STATES ────────────────────────────────────────
export const PROVENANCE_STATES = {
  ai_generated: 'ai_generated',
  ai_assisted: 'ai_assisted',
  human_reviewed: 'human_reviewed',
  awaiting_review: 'awaiting_review',
  executed_after_approval: 'executed_after_approval',
};

// ── POLICY DECISIONS ─────────────────────────────────────────
export const DECISIONS = {
  ALLOW: 'allow',
  DENY: 'deny',
  REQUIRE_APPROVAL: 'require_approval',
  REQUIRE_SAFER_MODEL: 'require_safer_model',
  REQUIRE_REDUCED_DATA: 'require_reduced_data',
  REQUIRE_READ_ONLY: 'require_read_only_mode',
  REQUIRE_HUMAN_ESCALATION: 'require_human_escalation',
};

const RESTRICTIVENESS_RANK: Record<string, number> = {
  [DECISIONS.ALLOW]: 0,
  [DECISIONS.REQUIRE_REDUCED_DATA]: 1,
  [DECISIONS.REQUIRE_READ_ONLY]: 2,
  [DECISIONS.REQUIRE_SAFER_MODEL]: 3,
  [DECISIONS.REQUIRE_APPROVAL]: 4,
  [DECISIONS.REQUIRE_HUMAN_ESCALATION]: 5,
  [DECISIONS.DENY]: 6,
};

const PRODUCTION_ALLOWED_MODEL_STATES = ['approved', 'restricted'];
const PRODUCTION_ALLOWED_AGENT_STATES = ['approved'];
const SENSITIVE_CLASSIFICATIONS = ['confidential', 'restricted'];

// ── MODEL LIFECYCLE ──────────────────────────────────────────
export function evaluateModelLifecycle(model: any): { allowed: boolean; reason: string } {
  if (!model) {
    return { allowed: false, reason: 'Model not found in registry — deny by default' };
  }
  if (!model.is_active) {
    return { allowed: false, reason: `Model '${model.model_key}' is inactive` };
  }
  if (model.lifecycle_status === 'retired') {
    return { allowed: false, reason: `Model '${model.model_key}' is retired and cannot serve requests` };
  }
  if (model.lifecycle_status === 'deprecated') {
    return { allowed: false, reason: `Model '${model.model_key}' is deprecated and cannot serve production requests` };
  }
  if (!PRODUCTION_ALLOWED_MODEL_STATES.includes(model.lifecycle_status)) {
    return { allowed: false, reason: `Model '${model.model_key}' lifecycle status '${model.lifecycle_status}' is not approved for production` };
  }
  return { allowed: true, reason: 'Model approved for production' };
}

// ── AGENT LIFECYCLE ──────────────────────────────────────────
export function evaluateAgentLifecycle(agent: any): { allowed: boolean; reason: string } {
  if (!agent) {
    return { allowed: false, reason: 'Agent not found in registry — deny by default' };
  }
  if (!agent.is_active) {
    return { allowed: false, reason: `Agent '${agent.agent_id}' is inactive` };
  }
  if (!PRODUCTION_ALLOWED_AGENT_STATES.includes(agent.lifecycle_status)) {
    return { allowed: false, reason: `Agent '${agent.agent_id}' lifecycle status '${agent.lifecycle_status}' is not approved for production` };
  }
  return { allowed: true, reason: 'Agent approved for production' };
}

// ── DATA CLASSIFICATION ──────────────────────────────────────
export function evaluateDataClassification(dataClassification: string | null, model: any): { allowed: boolean; reason: string } {
  if (!dataClassification) {
    return { allowed: true, reason: 'No data classification specified — default allow' };
  }
  if (!model) {
    return { allowed: true, reason: 'No model registry — default allow for unregistered models' };
  }
  const approved = model.approved_data_classifications || ['public', 'internal'];
  if (!approved.includes(dataClassification)) {
    return { allowed: false, reason: `Model '${model.model_key}' is not approved for data classification '${dataClassification}'` };
  }
  return { allowed: true, reason: 'Data classification approved for this model' };
}

// ── AUTONOMY EVALUATION ──────────────────────────────────────
export function evaluateAutonomy(autonomyLevel: string, actionType: string) {
  return canPerformAction(autonomyLevel, actionType);
}

export function isSensitiveAction(actionType: string): boolean {
  return L3_PROHIBITED_ACTIONS.includes(actionType);
}

// ── POLICY RESOLUTION ─────────────────────────────────────────
export function resolveMostRestrictivePolicy(matchedPolicies: any[]): {
  decision: string;
  policyKey: string | null;
  reason: string;
  evaluatedKeys: string[];
} {
  if (!matchedPolicies || matchedPolicies.length === 0) {
    return {
      decision: DECISIONS.DENY,
      policyKey: null,
      reason: 'No matching policy found — deny by default',
      evaluatedKeys: [],
    };
  }
  const sorted = [...matchedPolicies].sort((a, b) => {
    const rankA = RESTRICTIVENESS_RANK[a.decision] ?? 0;
    const rankB = RESTRICTIVENESS_RANK[b.decision] ?? 0;
    if (rankB !== rankA) return rankB - rankA;
    return (a.priority ?? 100) - (b.priority ?? 100);
  });
  const winner = sorted[0];
  return {
    decision: winner.decision,
    policyKey: winner.policy_key,
    reason: winner.description || `Policy '${winner.policy_key}' matched with decision: ${winner.decision}`,
    evaluatedKeys: matchedPolicies.map(p => p.policy_key),
  };
}

// ── FULL AI REQUEST EVALUATION ────────────────────────────────
export function evaluateAIRequest(params: {
  tenantId: string;
  userId: string;
  userRole: string;
  agentId?: string | null;
  agent?: any | null;
  modelKey: string;
  model: any | null;
  serviceKey: string;
  dataClassification: string | null;
  autonomyLevel: string;
  actionType: string;
  environment?: string;
  matchedPolicies?: any[];
}): {
  decision: string;
  reason: string;
  policyKey: string | null;
  evaluatedKeys: string[];
  modelAllowed: boolean;
  agentAllowed: boolean;
  dataAllowed: boolean;
  autonomyAllowed: boolean;
} {
  const {
    tenantId, userId, userRole,
    agentId, agent,
    modelKey, model,
    serviceKey,
    dataClassification,
    autonomyLevel,
    actionType,
    environment = 'production',
    matchedPolicies = [],
  } = params;

  // 1. Model lifecycle check
  const modelCheck = evaluateModelLifecycle(model);
  if (!modelCheck.allowed) {
    return {
      decision: DECISIONS.DENY, reason: modelCheck.reason, policyKey: 'model_lifecycle',
      evaluatedKeys: [], modelAllowed: false, agentAllowed: agent ? evaluateAgentLifecycle(agent).allowed : true,
      dataAllowed: false, autonomyAllowed: false,
    };
  }

  // 2. Agent lifecycle check
  let agentAllowed = true;
  if (agentId && agent) {
    const agentCheck = evaluateAgentLifecycle(agent);
    agentAllowed = agentCheck.allowed;
    if (!agentAllowed) {
      return {
        decision: DECISIONS.DENY, reason: agentCheck.reason, policyKey: 'agent_lifecycle',
        evaluatedKeys: [], modelAllowed: true, agentAllowed: false, dataAllowed: false, autonomyAllowed: false,
      };
    }
  }

  // 3. Data classification check
  const dataCheck = evaluateDataClassification(dataClassification, model);

  // 4. Autonomy check
  const autonomyCheck = evaluateAutonomy(autonomyLevel, actionType);

  // 5. Policy evaluation (most-restrictive-wins)
  const policyResult = resolveMostRestrictivePolicy(matchedPolicies);

  // 6. Deny-by-default for sensitive actions without explicit allow
  if (isSensitiveAction(actionType) && policyResult.decision !== DECISIONS.ALLOW) {
    return {
      decision: DECISIONS.REQUIRE_APPROVAL,
      reason: `Sensitive action '${actionType}' requires explicit human approval — deny by default`,
      policyKey: policyResult.policyKey || 'sensitive_action_default',
      evaluatedKeys: policyResult.evaluatedKeys,
      modelAllowed: true, agentAllowed, dataAllowed: dataCheck.allowed, autonomyAllowed: autonomyCheck.allowed,
    };
  }

  // 7. Data classification not approved
  if (!dataCheck.allowed) {
    return {
      decision: DECISIONS.REQUIRE_REDUCED_DATA, reason: dataCheck.reason, policyKey: 'data_classification',
      evaluatedKeys: [], modelAllowed: true, agentAllowed, dataAllowed: false, autonomyAllowed: autonomyCheck.allowed,
    };
  }

  // 8. Autonomy requires approval
  if (!autonomyCheck.allowed && autonomyCheck.requiresApproval) {
    return {
      decision: DECISIONS.REQUIRE_APPROVAL, reason: autonomyCheck.reason, policyKey: 'autonomy_level',
      evaluatedKeys: [], modelAllowed: true, agentAllowed, dataAllowed: dataCheck.allowed, autonomyAllowed: false,
    };
  }

  // 9. Return most-restrictive policy decision
  return {
    decision: policyResult.decision, reason: policyResult.reason, policyKey: policyResult.policyKey,
    evaluatedKeys: policyResult.evaluatedKeys, modelAllowed: true, agentAllowed,
    dataAllowed: dataCheck.allowed, autonomyAllowed: autonomyCheck.allowed,
  };
}

// ── EXECUTION POLICY ──────────────────────────────────────────
export const DEFAULT_EXECUTION_POLICY = {
  environment: 'production',
  permitted_tenant_id: null as string | null,
  permitted_organisation_id: null as string | null,
  permitted_brand_id: null as string | null,
  permitted_outlet_id: null as string | null,
  allowed_tools: ['InvokeLLM', 'UploadFile'],
  allowed_integrations: ['Core.InvokeLLM', 'Core.UploadFile', 'Core.GenerateImage'],
  allowed_network_destinations: ['platform_builtin'],
  credential_scope: 'platform_builtin',
  permitted_data_classifications: ['public', 'internal'],
  max_runtime_seconds: 30,
  max_token_usage: 50000,
  max_cost_credits: 10,
  required_monitoring: true,
  stop_conditions: [
    'kill_switch_activated', 'policy_denied', 'max_runtime_exceeded',
    'max_tokens_exceeded', 'max_cost_exceeded', 'credential_invalid',
  ],
  escalation_route: '/platform/shield',
  kill_switch_active: false,
};

export function validateExecutionContext(policy: any, context: any): {
  allowed: boolean;
  reason: string;
  violatedConditions: string[];
} {
  if (!policy) {
    return { allowed: false, reason: 'No execution policy provided — deny by default', violatedConditions: ['no_policy'] };
  }
  const violations: string[] = [];

  if (policy.kill_switch_active) {
    return { allowed: false, reason: 'AI kill switch is active — execution blocked', violatedConditions: ['kill_switch_activated'] };
  }
  if (policy.permitted_tenant_id && context.tenantId !== policy.permitted_tenant_id) {
    violations.push('tenant_scope_mismatch');
  }
  if (policy.environment && context.environment && policy.environment !== context.environment) {
    violations.push('environment_mismatch');
  }
  if (context.dataClassification && !policy.permitted_data_classifications.includes(context.dataClassification)) {
    violations.push('data_classification_not_permitted');
  }
  if (context.requestedTool && !policy.allowed_tools.includes(context.requestedTool)) {
    violations.push(`tool_not_permitted:${context.requestedTool}`);
  }
  if (context.networkDestination && !policy.allowed_network_destinations.includes(context.networkDestination)) {
    violations.push(`network_destination_not_allowed:${context.networkDestination}`);
  }
  if (context.estimatedRuntimeSeconds && context.estimatedRuntimeSeconds > policy.max_runtime_seconds) {
    violations.push('max_runtime_exceeded');
  }
  if (context.estimatedTokens && context.estimatedTokens > policy.max_token_usage) {
    violations.push('max_tokens_exceeded');
  }
  if (context.estimatedCostCredits && context.estimatedCostCredits > policy.max_cost_credits) {
    violations.push('max_cost_exceeded');
  }

  if (violations.length > 0) {
    return { allowed: false, reason: `Execution policy violations: ${violations.join(', ')}`, violatedConditions: violations };
  }
  return { allowed: true, reason: 'Execution context validated', violatedConditions: [] };
}

export function createExecutionPolicy(overrides: Record<string, any> = {}): any {
  return {
    ...DEFAULT_EXECUTION_POLICY,
    ...overrides,
    stop_conditions: overrides.stop_conditions || DEFAULT_EXECUTION_POLICY.stop_conditions,
  };
}

export function shouldStop(policy: any, condition: string): boolean {
  if (!policy || !policy.stop_conditions) return false;
  return policy.stop_conditions.includes(condition);
}

// ── PROVIDER ADAPTER ─────────────────────────────────────────
export const PROVIDERS = {
  GOOGLE: 'google',
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  OPEN_SOURCE_HOSTED: 'open_source_hosted',
  PLATFORM_BUILTIN: 'platform_builtin',
  OTHER: 'other',
};

export const PROVIDER_REGISTRY: Record<string, any> = {
  [PROVIDERS.PLATFORM_BUILTIN]: {
    provider_id: PROVIDERS.PLATFORM_BUILTIN,
    display_name: 'Base44 Platform (Built-in)',
    status: 'configured',
    description: 'Platform-native AI integration via InvokeLLM.',
    streaming_support: false,
    region: 'platform_managed',
    retention_classification: 'no_retention',
  },
  [PROVIDERS.GOOGLE]: {
    provider_id: PROVIDERS.GOOGLE,
    display_name: 'Google AI (Gemini)',
    status: 'unconfigured',
    description: 'Google Gemini models. Requires credentials.',
    streaming_support: true,
    region: 'provider_managed',
    retention_classification: 'no_retention',
  },
  [PROVIDERS.OPENAI]: {
    provider_id: PROVIDERS.OPENAI,
    display_name: 'OpenAI',
    status: 'unconfigured',
    description: 'OpenAI GPT models. Requires credentials.',
    streaming_support: true,
    region: 'provider_managed',
    retention_classification: 'short_term',
  },
  [PROVIDERS.ANTHROPIC]: {
    provider_id: PROVIDERS.ANTHROPIC,
    display_name: 'Anthropic (Claude)',
    status: 'unconfigured',
    description: 'Anthropic Claude models. Requires credentials.',
    streaming_support: true,
    region: 'provider_managed',
    retention_classification: 'no_retention',
  },
  [PROVIDERS.OPEN_SOURCE_HOSTED]: {
    provider_id: PROVIDERS.OPEN_SOURCE_HOSTED,
    display_name: 'Hosted Open-Source Models',
    status: 'unconfigured',
    description: 'Self-hosted or approved hosted open-source models.',
    streaming_support: true,
    region: 'configurable',
    retention_classification: 'enterprise_isolated',
  },
};

export const ERROR_TYPES = {
  PROVIDER_TIMEOUT: 'provider_timeout',
  PROVIDER_ERROR: 'provider_error',
  RATE_LIMITED: 'rate_limited',
  AUTH_INVALID: 'auth_invalid',
  MODEL_UNAVAILABLE: 'model_unavailable',
  NETWORK_ERROR: 'network_error',
  UNKNOWN: 'unknown',
};

export function classifyProviderError(error: any): { type: string; retryable: boolean; user_message: string } {
  const msg = (error?.message || error?.toString() || '').toLowerCase();
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return { type: ERROR_TYPES.PROVIDER_TIMEOUT, retryable: true, user_message: 'The AI provider took too long to respond. Please try again.' };
  }
  if (msg.includes('rate limit') || msg.includes('429') || msg.includes('quota')) {
    return { type: ERROR_TYPES.RATE_LIMITED, retryable: true, user_message: 'AI request rate limit reached. Please try again in a moment.' };
  }
  if (msg.includes('unauthorized') || msg.includes('401') || msg.includes('auth') || msg.includes('api key')) {
    return { type: ERROR_TYPES.AUTH_INVALID, retryable: false, user_message: 'AI provider authentication failed. Contact your administrator.' };
  }
  if (msg.includes('model') && (msg.includes('not found') || msg.includes('unavailable') || msg.includes('deprecated'))) {
    return { type: ERROR_TYPES.MODEL_UNAVAILABLE, retryable: false, user_message: 'The requested AI model is not available.' };
  }
  if (msg.includes('network') || msg.includes('econnreset') || msg.includes('enotfound')) {
    return { type: ERROR_TYPES.NETWORK_ERROR, retryable: true, user_message: 'Network error connecting to AI provider. Please try again.' };
  }
  return { type: ERROR_TYPES.UNKNOWN, retryable: false, user_message: 'An unexpected AI error occurred. Please try again.' };
}

export function getConfiguredProviders(): any[] {
  return Object.values(PROVIDER_REGISTRY).filter((p: any) => p.status === 'configured');
}

export function isProviderConfigured(providerId: string): boolean {
  const provider = PROVIDER_REGISTRY[providerId];
  return !!provider && provider.status === 'configured';
}

// ── AUDIT OUTCOME CLASSIFICATION ─────────────────────────────
export function classifyOutcome(policyDecision: string, execAllowed: boolean, executionStatus: string): {
  outcome: string;
  errorClassification: string | null;
  provenanceState: string;
} {
  if (policyDecision === DECISIONS.DENY) {
    return { outcome: 'denied', errorClassification: 'policy_denied', provenanceState: PROVENANCE_STATES.ai_generated };
  }
  if (policyDecision === DECISIONS.REQUIRE_APPROVAL) {
    return { outcome: 'denied', errorClassification: null, provenanceState: PROVENANCE_STATES.awaiting_review };
  }
  if (!execAllowed) {
    return { outcome: 'denied', errorClassification: 'policy_denied', provenanceState: PROVENANCE_STATES.ai_generated };
  }
  if (executionStatus === 'success') {
    return { outcome: 'success', errorClassification: null, provenanceState: PROVENANCE_STATES.ai_generated };
  }
  if (executionStatus === 'timeout') {
    return { outcome: 'timeout', errorClassification: 'provider_timeout', provenanceState: PROVENANCE_STATES.ai_generated };
  }
  if (executionStatus === 'failed') {
    return { outcome: 'failed', errorClassification: 'provider_error', provenanceState: PROVENANCE_STATES.ai_generated };
  }
  return { outcome: 'success', errorClassification: null, provenanceState: PROVENANCE_STATES.ai_generated };
}

// ── SAFE ERROR CODES ──────────────────────────────────────────
export const SAFE_ERROR_CODES = {
  INVALID_REQUEST: 'invalid_request',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  TENANT_REQUIRED: 'tenant_required',
  MODEL_NOT_FOUND: 'model_not_found',
  MODEL_NOT_APPROVED: 'model_not_approved',
  MODEL_RETIRED: 'model_retired',
  AGENT_NOT_FOUND: 'agent_not_found',
  AGENT_SUSPENDED: 'agent_suspended',
  AGENT_EXPIRED: 'agent_expired',
  POLICY_DENIED: 'policy_denied',
  APPROVAL_REQUIRED: 'approval_required',
  EXECUTION_POLICY_VIOLATION: 'execution_policy_violation',
  PROVIDER_UNCONFIGURED: 'provider_unconfigured',
  PROVIDER_UNAVAILABLE: 'provider_unavailable',
  PROVIDER_TIMEOUT: 'provider_timeout',
  RATE_LIMITED: 'rate_limited',
  INSUFFICIENT_CREDITS: 'insufficient_credits',
  COST_LIMIT_EXCEEDED: 'cost_limit_exceeded',
  AUDIT_FAILURE: 'audit_failure',
  INTERNAL_ERROR: 'internal_error',
  DUPLICATE_REQUEST: 'duplicate_request',
  KILL_SWITCH_ACTIVE: 'kill_switch_active',
};

export const SAFE_USER_MESSAGES: Record<string, string> = {
  [SAFE_ERROR_CODES.INVALID_REQUEST]: 'The request was invalid. Please check your input and try again.',
  [SAFE_ERROR_CODES.UNAUTHORIZED]: 'You must be signed in to use this feature.',
  [SAFE_ERROR_CODES.FORBIDDEN]: 'You do not have permission to perform this action.',
  [SAFE_ERROR_CODES.TENANT_REQUIRED]: 'Workspace context is required.',
  [SAFE_ERROR_CODES.MODEL_NOT_FOUND]: 'The requested AI model is not available.',
  [SAFE_ERROR_CODES.MODEL_NOT_APPROVED]: 'The requested AI model is not approved for production use.',
  [SAFE_ERROR_CODES.MODEL_RETIRED]: 'The requested AI model has been retired.',
  [SAFE_ERROR_CODES.AGENT_NOT_FOUND]: 'The AI agent identity could not be verified.',
  [SAFE_ERROR_CODES.AGENT_SUSPENDED]: 'The AI agent has been suspended.',
  [SAFE_ERROR_CODES.AGENT_EXPIRED]: 'The AI agent identity has expired.',
  [SAFE_ERROR_CODES.POLICY_DENIED]: 'This request was denied by AI governance policy.',
  [SAFE_ERROR_CODES.APPROVAL_REQUIRED]: 'This action requires human approval before it can proceed.',
  [SAFE_ERROR_CODES.EXECUTION_POLICY_VIOLATION]: 'This request was blocked by security policy.',
  [SAFE_ERROR_CODES.PROVIDER_UNCONFIGURED]: 'The AI provider is not configured. Contact your administrator.',
  [SAFE_ERROR_CODES.PROVIDER_UNAVAILABLE]: 'The AI service is temporarily unavailable. Please try again.',
  [SAFE_ERROR_CODES.PROVIDER_TIMEOUT]: 'The AI service took too long to respond. Please try again.',
  [SAFE_ERROR_CODES.RATE_LIMITED]: 'Too many AI requests. Please try again in a moment.',
  [SAFE_ERROR_CODES.INSUFFICIENT_CREDITS]: 'You do not have enough Orbitan Credits for this request.',
  [SAFE_ERROR_CODES.COST_LIMIT_EXCEEDED]: 'This request would exceed the cost limit.',
  [SAFE_ERROR_CODES.AUDIT_FAILURE]: 'An internal error occurred. Please try again.',
  [SAFE_ERROR_CODES.INTERNAL_ERROR]: 'An unexpected error occurred. Please try again.',
  [SAFE_ERROR_CODES.DUPLICATE_REQUEST]: 'This request was already processed.',
  [SAFE_ERROR_CODES.KILL_SWITCH_ACTIVE]: 'AI intelligence is currently disabled by the platform administrator.',
};