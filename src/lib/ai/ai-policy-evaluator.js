// ============================================================
// ORBITAN AI OPERATING LAYER — Policy Evaluator (Build #28.2M)
//
// Canonical AI policy evaluation service. Policy evaluation occurs
// before each AI execution. Applies deny-by-default behaviour for
// sensitive actions and most-restrictive-policy-wins when policies
// overlap.
//
// Pure JS — zero React imports — safe for tests and backend functions.
// Designed to be imported by the nexus gateway and backend functions.
// ============================================================

import { L3_PROHIBITED_ACTIONS, canPerformAction } from './ai-autonomy-levels.js';

/**
 * Policy decision types.
 */
const DECISIONS = {
  ALLOW: 'allow',
  DENY: 'deny',
  REQUIRE_APPROVAL: 'require_approval',
  REQUIRE_SAFER_MODEL: 'require_safer_model',
  REQUIRE_REDUCED_DATA: 'require_reduced_data',
  REQUIRE_READ_ONLY: 'require_read_only_mode',
  REQUIRE_HUMAN_ESCALATION: 'require_human_escalation',
};

/**
 * Restrictiveness ranking for most-restrictive-wins resolution.
 * Higher number = more restrictive.
 */
const RESTRICTIVENESS_RANK = {
  [DECISIONS.ALLOW]: 0,
  [DECISIONS.REQUIRE_REDUCED_DATA]: 1,
  [DECISIONS.REQUIRE_READ_ONLY]: 2,
  [DECISIONS.REQUIRE_SAFER_MODEL]: 3,
  [DECISIONS.REQUIRE_APPROVAL]: 4,
  [DECISIONS.REQUIRE_HUMAN_ESCALATION]: 5,
  [DECISIONS.DENY]: 6,
};

/**
 * Model lifecycle states that can serve production requests.
 */
const PRODUCTION_ALLOWED_MODEL_STATES = ['approved', 'restricted'];

/**
 * Agent lifecycle states that can execute in production.
 */
const PRODUCTION_ALLOWED_AGENT_STATES = ['approved'];

/**
 * Sensitive data classifications that require explicit policy.
 */
const SENSITIVE_CLASSIFICATIONS = ['confidential', 'restricted'];

/**
 * Evaluates whether a model is allowed to serve a production request.
 * @param {object} model - AIModel record
 * @returns {{ allowed: boolean, reason: string }}
 */
function evaluateModelLifecycle(model) {
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

/**
 * Evaluates whether an agent is allowed to execute.
 * @param {object} agent - AIAgent record
 * @returns {{ allowed: boolean, reason: string }}
 */
function evaluateAgentLifecycle(agent) {
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

/**
 * Evaluates data classification against model approval.
 * @param {string} dataClassification
 * @param {object} model - AIModel record
 * @returns {{ allowed: boolean, reason: string }}
 */
function evaluateDataClassification(dataClassification, model) {
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

/**
 * Evaluates autonomy level against the requested action.
 * @param {string} autonomyLevel
 * @param {string} actionType
 * @returns {{ allowed: boolean, requiresApproval: boolean, reason: string }}
 */
function evaluateAutonomy(autonomyLevel, actionType) {
  return canPerformAction(autonomyLevel, actionType);
}

/**
 * Checks if an action is in the L3 prohibited list.
 */
function isSensitiveAction(actionType) {
  return L3_PROHIBITED_ACTIONS.includes(actionType);
}

/**
 * Resolves the most-restrictive decision from a set of matching policies.
 * @param {Array} matchedPolicies - Array of AIPolicy records that matched
 * @returns {{ decision: string, policyKey: string, reason: string, evaluatedKeys: string[] }}
 */
function resolveMostRestrictivePolicy(matchedPolicies) {
  if (!matchedPolicies || matchedPolicies.length === 0) {
    // Deny by default when no policies match for sensitive contexts
    return {
      decision: DECISIONS.DENY,
      policyKey: null,
      reason: 'No matching policy found — deny by default',
      evaluatedKeys: [],
    };
  }

  // Sort by restrictiveness (descending) then by priority (ascending)
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

/**
 * Main policy evaluation function.
 * Evaluates all dimensions and returns a structured decision.
 *
 * @param {object} params
 * @param {string} params.tenantId
 * @param {string} params.userId
 * @param {string} params.userRole
 * @param {string} params.agentId
 * @param {object} params.agent - AIAgent record (optional, null for human requests)
 * @param {string} params.modelKey
 * @param {object} params.model - AIModel record
 * @param {string} params.serviceKey
 * @param {string} params.dataClassification
 * @param {string} params.autonomyLevel
 * @param {string} params.actionType
 * @param {string} params.environment
 * @param {Array} params.matchedPolicies - AIPolicy records that match this request
 * @returns {{ decision: string, reason: string, policyKey: string, evaluatedKeys: string[], modelAllowed: boolean, agentAllowed: boolean, dataAllowed: boolean, autonomyAllowed: boolean }}
 */
function evaluateAIRequest(params) {
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
      decision: DECISIONS.DENY,
      reason: modelCheck.reason,
      policyKey: 'model_lifecycle',
      evaluatedKeys: [],
      modelAllowed: false,
      agentAllowed: agent ? evaluateAgentLifecycle(agent).allowed : true,
      dataAllowed: false,
      autonomyAllowed: false,
    };
  }

  // 2. Agent lifecycle check (if agent-scoped)
  let agentAllowed = true;
  let agentReason = null;
  if (agentId && agent) {
    const agentCheck = evaluateAgentLifecycle(agent);
    agentAllowed = agentCheck.allowed;
    agentReason = agentCheck.reason;
    if (!agentAllowed) {
      return {
        decision: DECISIONS.DENY,
        reason: agentReason,
        policyKey: 'agent_lifecycle',
        evaluatedKeys: [],
        modelAllowed: true,
        agentAllowed: false,
        dataAllowed: false,
        autonomyAllowed: false,
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
      modelAllowed: true,
      agentAllowed,
      dataAllowed: dataCheck.allowed,
      autonomyAllowed: autonomyCheck.allowed,
    };
  }

  // 7. If data classification check failed, require reduced data
  if (!dataCheck.allowed) {
    return {
      decision: DECISIONS.REQUIRE_REDUCED_DATA,
      reason: dataCheck.reason,
      policyKey: 'data_classification',
      evaluatedKeys: [],
      modelAllowed: true,
      agentAllowed,
      dataAllowed: false,
      autonomyAllowed: autonomyCheck.allowed,
    };
  }

  // 8. If autonomy requires approval
  if (!autonomyCheck.allowed && autonomyCheck.requiresApproval) {
    return {
      decision: DECISIONS.REQUIRE_APPROVAL,
      reason: autonomyCheck.reason,
      policyKey: 'autonomy_level',
      evaluatedKeys: [],
      modelAllowed: true,
      agentAllowed,
      dataAllowed: dataCheck.allowed,
      autonomyAllowed: false,
    };
  }

  // 9. Return the most-restrictive policy decision
  return {
    decision: policyResult.decision,
    reason: policyResult.reason,
    policyKey: policyResult.policyKey,
    evaluatedKeys: policyResult.evaluatedKeys,
    modelAllowed: true,
    agentAllowed,
    dataAllowed: dataCheck.allowed,
    autonomyAllowed: autonomyCheck.allowed,
  };
}

export {
  DECISIONS,
  RESTRICTIVENESS_RANK,
  PRODUCTION_ALLOWED_MODEL_STATES,
  PRODUCTION_ALLOWED_AGENT_STATES,
  SENSITIVE_CLASSIFICATIONS,
  evaluateModelLifecycle,
  evaluateAgentLifecycle,
  evaluateDataClassification,
  evaluateAutonomy,
  isSensitiveAction,
  resolveMostRestrictivePolicy,
  evaluateAIRequest,
};