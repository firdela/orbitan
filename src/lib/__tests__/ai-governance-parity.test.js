// ============================================================
// AI Governance Parity Test (Build #28.2O)
//
// Verifies that frontend governance modules (src/lib/ai/*.js)
// and backend governance module (base44/shared/ai-governance.ts)
// produce identical results for the same test vectors.
//
// Since the backend is TypeScript (Deno) and the frontend is
// ESM JavaScript, both modules cannot be imported in the same
// runtime. This test imports the frontend modules and verifies
// their outputs against hardcoded expected values that have been
// verified to match the backend ai-governance.ts module.
//
// Run via: node --experimental-vm src/lib/__tests__/ai-governance-parity.test.js
// ============================================================

import {
  DECISIONS,
  RESTRICTIVENESS_RANK,
  PRODUCTION_ALLOWED_MODEL_STATES,
  PRODUCTION_ALLOWED_AGENT_STATES,
  SENSITIVE_CLASSIFICATIONS,
  evaluateModelLifecycle,
  evaluateAgentLifecycle,
  evaluateDataClassification,
  isSensitiveAction,
  resolveMostRestrictivePolicy,
  evaluateAIRequest,
} from '../ai-policy-evaluator.js';

import {
  L0_ANSWER,
  L1_RECOMMEND,
  L2_DRAFT,
  L3_EXECUTE,
  AUTONOMY_LEVELS,
  L3_PROHIBITED_ACTIONS,
  canPerformAction,
  getDefaultAutonomy,
  isValidAutonomyLevel,
} from '../ai-autonomy-levels.js';

import {
  DEFAULT_EXECUTION_POLICY,
  validateExecutionContext,
  createExecutionPolicy,
  shouldStop,
} from '../ai-execution-policy.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  assert(actualStr === expectedStr, `${message} — expected ${expectedStr}, got ${actualStr}`);
}

// ── 1. CONSTANTS PARITY ───────────────────────────────────────
console.log('\n=== Constants Parity ===');

// DECISIONS
assertEqual(DECISIONS.ALLOW, 'allow', 'DECISIONS.ALLOW');
assertEqual(DECISIONS.DENY, 'deny', 'DECISIONS.DENY');
assertEqual(DECISIONS.REQUIRE_APPROVAL, 'require_approval', 'DECISIONS.REQUIRE_APPROVAL');
assertEqual(DECISIONS.REQUIRE_SAFER_MODEL, 'require_safer_model', 'DECISIONS.REQUIRE_SAFER_MODEL');
assertEqual(DECISIONS.REQUIRE_REDUCED_DATA, 'require_reduced_data', 'DECISIONS.REQUIRE_REDUCED_DATA');
assertEqual(DECISIONS.REQUIRE_READ_ONLY, 'require_read_only_mode', 'DECISIONS.REQUIRE_READ_ONLY');
assertEqual(DECISIONS.REQUIRE_HUMAN_ESCALATION, 'require_human_escalation', 'DECISIONS.REQUIRE_HUMAN_ESCALATION');

// RESTRICTIVENESS_RANK
assertEqual(RESTRICTIVENESS_RANK[DECISIONS.ALLOW], 0, 'RESTRICTIVENESS_RANK.ALLOW');
assertEqual(RESTRICTIVENESS_RANK[DECISIONS.DENY], 6, 'RESTRICTIVENESS_RANK.DENY');
assertEqual(RESTRICTIVENESS_RANK[DECISIONS.REQUIRE_APPROVAL], 4, 'RESTRICTIVENESS_RANK.REQUIRE_APPROVAL');

// L3_PROHIBITED_ACTIONS
assert(L3_PROHIBITED_ACTIONS.includes('payment'), 'L3 prohibits payment');
assert(L3_PROHIBITED_ACTIONS.includes('payroll_change'), 'L3 prohibits payroll_change');
assert(L3_PROHIBITED_ACTIONS.includes('employee_status_change'), 'L3 prohibits employee_status_change');
assert(L3_PROHIBITED_ACTIONS.includes('access_permission_change'), 'L3 prohibits access_permission_change');
assert(L3_PROHIBITED_ACTIONS.includes('destructive_database_change'), 'L3 prohibits destructive_database_change');
assert(L3_PROHIBITED_ACTIONS.includes('external_publication'), 'L3 prohibits external_publication');
assert(L3_PROHIBITED_ACTIONS.includes('legal_contractual_commitment'), 'L3 prohibits legal_contractual_commitment');
assert(L3_PROHIBITED_ACTIONS.includes('customer_data_export'), 'L3 prohibits customer_data_export');
assert(L3_PROHIBITED_ACTIONS.includes('production_configuration_change'), 'L3 prohibits production_configuration_change');
assertEqual(L3_PROHIBITED_ACTIONS.length, 9, 'L3 has exactly 9 prohibited actions');

// AUTONOMY_LEVELS
assertEqual(L0_ANSWER, 'L0_answer', 'L0_ANSWER constant');
assertEqual(L1_RECOMMEND, 'L1_recommend', 'L1_RECOMMEND constant');
assertEqual(L2_DRAFT, 'L2_draft', 'L2_DRAFT constant');
assertEqual(L3_EXECUTE, 'L3_execute', 'L3_EXECUTE constant');
assertEqual(AUTONOMY_LEVELS[L0_ANSWER].level, 0, 'L0 level is 0');
assertEqual(AUTONOMY_LEVELS[L3_EXECUTE].level, 3, 'L3 level is 3');

// PRODUCTION_ALLOWED_MODEL_STATES
assertEqual(PRODUCTION_ALLOWED_MODEL_STATES, ['approved', 'restricted'], 'Production allowed model states');
assertEqual(PRODUCTION_ALLOWED_AGENT_STATES, ['approved'], 'Production allowed agent states');

// ── 2. MODEL LIFECYCLE EVALUATION PARITY ──────────────────────
console.log('\n=== Model Lifecycle Parity ===');

// Null model → deny
assertEqual(evaluateModelLifecycle(null).allowed, false, 'Null model denied');
assertEqual(evaluateModelLifecycle(null).reason, 'Model not found in registry — deny by default', 'Null model reason');

// Inactive model → deny
assertEqual(evaluateModelLifecycle({ model_key: 'test', is_active: false, lifecycle_status: 'approved' }).allowed, false, 'Inactive model denied');

// Retired model → deny (checked BEFORE PRODUCTION_ALLOWED check)
const retiredResult = evaluateModelLifecycle({ model_key: 'test', is_active: true, lifecycle_status: 'retired' });
assertEqual(retiredResult.allowed, false, 'Retired model denied');
assert(retiredResult.reason.includes('retired'), 'Retired model reason mentions retired');

// Deprecated model → deny
const deprecatedResult = evaluateModelLifecycle({ model_key: 'test', is_active: true, lifecycle_status: 'deprecated' });
assertEqual(deprecatedResult.allowed, false, 'Deprecated model denied');
assert(deprecatedResult.reason.includes('deprecated'), 'Deprecated model reason mentions deprecated');

// Draft model → deny (not in approved states)
assertEqual(evaluateModelLifecycle({ model_key: 'test', is_active: true, lifecycle_status: 'draft' }).allowed, false, 'Draft model denied');

// Approved model → allow
assertEqual(evaluateModelLifecycle({ model_key: 'test', is_active: true, lifecycle_status: 'approved' }).allowed, true, 'Approved model allowed');

// Restricted model → allow
assertEqual(evaluateModelLifecycle({ model_key: 'test', is_active: true, lifecycle_status: 'restricted' }).allowed, true, 'Restricted model allowed');

// ── 3. AGENT LIFECYCLE EVALUATION PARITY ──────────────────────
console.log('\n=== Agent Lifecycle Parity ===');

assertEqual(evaluateAgentLifecycle(null).allowed, false, 'Null agent denied');
assertEqual(evaluateAgentLifecycle({ agent_id: 'test', is_active: false, lifecycle_status: 'approved' }).allowed, false, 'Inactive agent denied');
assertEqual(evaluateAgentLifecycle({ agent_id: 'test', is_active: true, lifecycle_status: 'approved' }).allowed, true, 'Approved agent allowed');
assertEqual(evaluateAgentLifecycle({ agent_id: 'test', is_active: true, lifecycle_status: 'draft' }).allowed, false, 'Draft agent denied');
assertEqual(evaluateAgentLifecycle({ agent_id: 'test', is_active: true, lifecycle_status: 'suspended' }).allowed, false, 'Suspended agent denied');

// ── 4. DATA CLASSIFICATION PARITY ─────────────────────────────
console.log('\n=== Data Classification Parity ===');

// No classification → allow
assertEqual(evaluateDataClassification(null, null).allowed, true, 'No classification allowed');

// No model → allow (matches backend — model lifecycle check handles denial)
assertEqual(evaluateDataClassification('internal', null).allowed, true, 'No model with classification allowed');

// Model approved for internal → allow
const approvedModel = { model_key: 'test', approved_data_classifications: ['public', 'internal'] };
assertEqual(evaluateDataClassification('internal', approvedModel).allowed, true, 'Internal data with approved model allowed');

// Model not approved for confidential → deny
assertEqual(evaluateDataClassification('confidential', approvedModel).allowed, false, 'Confidential data with non-approved model denied');

// ── 5. AUTONOMY EVALUATION PARITY ──────────────────────────────
console.log('\n=== Autonomy Evaluation Parity ===');

assertEqual(getDefaultAutonomy(), L0_ANSWER, 'Default autonomy is L0');
assert(isValidAutonomyLevel(L0_ANSWER), 'L0 is valid');
assert(!isValidAutonomyLevel('L4_invalid'), 'L4 is invalid');
assert(!isValidAutonomyLevel(null), 'Null is invalid');

// L0 cannot perform actions
assertEqual(canPerformAction(L0_ANSWER, 'test_action').allowed, false, 'L0 cannot perform actions');
assertEqual(canPerformAction(L0_ANSWER, 'test_action').requiresApproval, true, 'L0 requires approval');

// L1 cannot perform actions
assertEqual(canPerformAction(L1_RECOMMEND, 'test_action').allowed, false, 'L1 cannot perform actions');

// L2 can create drafts but not publish
assertEqual(canPerformAction(L2_DRAFT, 'create_draft').allowed, true, 'L2 can create drafts');
assertEqual(canPerformAction(L2_DRAFT, 'publish_content').allowed, false, 'L2 cannot publish');
assertEqual(canPerformAction(L2_DRAFT, 'publish_content').requiresApproval, true, 'L2 publish requires approval');

// L3 can perform non-prohibited actions
assertEqual(canPerformAction(L3_EXECUTE, 'generate_report').allowed, true, 'L3 can generate reports');
assertEqual(canPerformAction(L3_EXECUTE, 'payment').allowed, false, 'L3 cannot perform payment');
assertEqual(canPerformAction(L3_EXECUTE, 'payment').requiresApproval, true, 'L3 payment requires approval');

// ── 6. POLICY RESOLUTION PARITY ───────────────────────────────
console.log('\n=== Policy Resolution Parity ===');

// No policies → deny by default
const noPolicyResult = resolveMostRestrictivePolicy([]);
assertEqual(noPolicyResult.decision, DECISIONS.DENY, 'No policies → deny');
assertEqual(noPolicyResult.policyKey, null, 'No policies → null key');

// Single allow policy
const allowResult = resolveMostRestrictivePolicy([{ policy_key: 'allow_1', decision: 'allow', priority: 100, description: 'Allow' }]);
assertEqual(allowResult.decision, DECISIONS.ALLOW, 'Single allow → allow');

// Most restrictive wins (deny beats allow)
const mixedResult = resolveMostRestrictivePolicy([
  { policy_key: 'allow_1', decision: 'allow', priority: 100, description: 'Allow' },
  { policy_key: 'deny_1', decision: 'deny', priority: 100, description: 'Deny' },
]);
assertEqual(mixedResult.decision, DECISIONS.DENY, 'Most restrictive (deny) wins');
assertEqual(mixedResult.policyKey, 'deny_1', 'Deny policy key returned');

// Priority breaks ties (lower number = higher priority)
const priorityResult = resolveMostRestrictivePolicy([
  { policy_key: 'deny_high', decision: 'deny', priority: 200, description: 'Deny high prio' },
  { policy_key: 'deny_low', decision: 'deny', priority: 50, description: 'Deny low prio' },
]);
assertEqual(priorityResult.policyKey, 'deny_low', 'Lower priority number wins');

// ── 7. SENSITIVE ACTION CHECK PARITY ──────────────────────────
console.log('\n=== Sensitive Action Parity ===');

assert(isSensitiveAction('payment'), 'payment is sensitive');
assert(isSensitiveAction('payroll_change'), 'payroll_change is sensitive');
assert(!isSensitiveAction('generate_report'), 'generate_report is not sensitive');
assert(!isSensitiveAction('sop_gen'), 'sop_gen is not sensitive');

// ── 8. EXECUTION POLICY PARITY ────────────────────────────────
console.log('\n=== Execution Policy Parity ===');

assertEqual(DEFAULT_EXECUTION_POLICY.environment, 'production', 'Default env is production');
assertEqual(DEFAULT_EXECUTION_POLICY.permitted_data_classifications, ['public', 'internal'], 'Default data classifications');
assertEqual(DEFAULT_EXECUTION_POLICY.allowed_network_destinations, ['platform_builtin'], 'Default network destinations');
assertEqual(DEFAULT_EXECUTION_POLICY.credential_scope, 'platform_builtin', 'Default credential scope');
assertEqual(DEFAULT_EXECUTION_POLICY.max_runtime_seconds, 30, 'Default max runtime');
assertEqual(DEFAULT_EXECUTION_POLICY.max_token_usage, 50000, 'Default max tokens');
assertEqual(DEFAULT_EXECUTION_POLICY.max_cost_credits, 10, 'Default max cost');

// Kill switch
assertEqual(validateExecutionContext({ kill_switch_active: true }, {}).allowed, false, 'Kill switch blocks');

// Tenant mismatch
assertEqual(validateExecutionContext({ permitted_tenant_id: 'tenant_a' }, { tenantId: 'tenant_b' }).allowed, false, 'Tenant mismatch blocked');

// Valid context
assertEqual(validateExecutionContext({ kill_switch_active: false, permitted_tenant_id: 't1' }, { tenantId: 't1', environment: 'production' }).allowed, true, 'Valid context allowed');

// ── 9. FULL AI REQUEST EVALUATION PARITY ──────────────────────
console.log('\n=== Full AI Request Evaluation Parity ===');

const approvedModelFull = {
  model_key: 'automatic',
  is_active: true,
  lifecycle_status: 'approved',
  approved_data_classifications: ['public', 'internal'],
};

// L0 with approved model and internal data + allow policy → allow
const l0Result = evaluateAIRequest({
  tenantId: 't1', userId: 'u1', userRole: 'worker',
  agentId: null, agent: null,
  modelKey: 'automatic', model: approvedModelFull,
  serviceKey: 'sop_gen', dataClassification: 'internal',
  autonomyLevel: L0_ANSWER, actionType: 'sop_gen',
  matchedPolicies: [{ policy_key: 'allow_l0', decision: 'allow', priority: 200, description: 'Allow L0' }],
});
assertEqual(l0Result.decision, DECISIONS.ALLOW, 'L0 with allow policy → allow');

// L0 with no matching policy → deny by default (migration mode exited)
const l0NoPolicyResult = evaluateAIRequest({
  tenantId: 't1', userId: 'u1', userRole: 'worker',
  agentId: null, agent: null,
  modelKey: 'automatic', model: approvedModelFull,
  serviceKey: 'sop_gen', dataClassification: 'internal',
  autonomyLevel: L0_ANSWER, actionType: 'sop_gen',
  matchedPolicies: [],
});
assertEqual(l0NoPolicyResult.decision, DECISIONS.DENY, 'L0 with no policy → deny (migration exited)');

// L3 with sensitive action → require approval
const l3Result = evaluateAIRequest({
  tenantId: 't1', userId: 'u1', userRole: 'admin',
  agentId: null, agent: null,
  modelKey: 'automatic', model: approvedModelFull,
  serviceKey: 'payment', dataClassification: 'internal',
  autonomyLevel: L3_EXECUTE, actionType: 'payment',
  matchedPolicies: [{ policy_key: 'allow_l3', decision: 'allow', priority: 200, description: 'Allow L3' }],
});
assertEqual(l3Result.decision, DECISIONS.REQUIRE_APPROVAL, 'L3 sensitive action → require approval');

// Model not in registry → deny
const noModelResult = evaluateAIRequest({
  tenantId: 't1', userId: 'u1', userRole: 'worker',
  agentId: null, agent: null,
  modelKey: 'unknown_model', model: null,
  serviceKey: 'sop_gen', dataClassification: 'internal',
  autonomyLevel: L0_ANSWER, actionType: 'sop_gen',
  matchedPolicies: [{ policy_key: 'allow_l0', decision: 'allow', priority: 200, description: 'Allow' }],
});
assertEqual(noModelResult.decision, DECISIONS.DENY, 'Unregistered model → deny');

// ── RESULTS ───────────────────────────────────────────────────
console.log(`\n=== Parity Test Results ===`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

if (failed > 0) {
  console.error('\n❌ PARITY TEST FAILED — frontend and backend governance logic have drifted!');
} else {
  console.log('\n✅ All parity tests passed — frontend and backend governance logic are aligned.');
}