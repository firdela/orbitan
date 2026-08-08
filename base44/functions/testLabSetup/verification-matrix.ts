// ============================================================
// ORBITAN TEST LAB — Verification Matrix Orchestrator
// Build #28.2P-R.0R.3
//
// Protected Test Lab orchestrator that runs the automated
// governance verification matrix. Exercises the SAME production
// policy functions used by the live system — no mirrored
// authorization engine.
//
// Security boundaries:
//   - Requires platform.test_lab.manage (checked by entry.ts)
//   - Requires an active automated_policy_matrix VerificationRun
//   - Server-defined scenarios only — no client authority input
//   - asServiceRole for orchestration/evidence only — NOT persona
//     impersonation
//   - All evidence is non_production=true
//   - No paid AI providers invoked
//   - No production customer mutations
//   - No wallet debits
//
// The operator (real admin) and evaluated persona are always
// distinct. The operator's identity is preserved separately in
// every TestLabVerificationResult record.
// ============================================================

import {
  TEST_IDENTITIES, TENANT_A_ID, TENANT_B_TEST_LAB_KEY,
  TARGET_TYPES, targetKeyForVerificationMatrix,
  PROOF_CLASSES, VERIFICATION_RESULT_STATUSES, MATRIX_VERSION,
  PERSONA_KEYS, getPersonaByKey,
  OPERATION_LIFECYCLE_STATES,
} from '../../shared/test-lab-config.ts';
import { deriveTestSecurityContext, validateClientScenarioInput } from '../../shared/test-security-context.ts';
import { ALL_SCENARIOS, getScenarioById, SCENARIO_REGISTRY_VERSION } from './verification-scenarios.js';
import {
  createOperation, persistOperationIntent, persistOperationCompletion,
  persistOperationFailure, transitionOperation, releaseOperationLock,
} from './runtime.ts';

// ── LOAD FIXTURE DATA ────────────────────────────────────────
// Loads sandbox tenant + employee + outlet fixtures for context derivation.
async function loadFixtureData(base44: any): Promise<any> {
  const [tenantA, tenantBResults, employeesA, employeesB, outletsA, outletsB] = await Promise.all([
    base44.asServiceRole.entities.Tenant.get(TENANT_A_ID).catch(() => null),
    base44.asServiceRole.entities.Tenant.filter({ test_lab_key: TENANT_B_TEST_LAB_KEY }).catch(() => []),
    base44.asServiceRole.entities.Employee.filter({ tenant_id: TENANT_A_ID }).catch(() => []),
    base44.asServiceRole.entities.Tenant.filter({ test_lab_key: TENANT_B_TEST_LAB_KEY }).catch(async (e: any) => []),
    base44.asServiceRole.entities.Outlet.filter({ tenant_id: TENANT_A_ID }).catch(() => []),
    Promise.resolve().then(async () => {
      const tb = (await base44.asServiceRole.entities.Tenant.filter({ test_lab_key: TENANT_B_TEST_LAB_KEY }).catch(() => []))?.[0];
      return tb ? await base44.asServiceRole.entities.Outlet.filter({ tenant_id: tb.id }).catch(() => []) : [];
    }),
  ]);

  const tenantB = tenantBResults?.[0] || null;
  const tenantBId = tenantB?.id || null;
  const employeesBFinal = tenantBId ? await base44.asServiceRole.entities.Employee.filter({ tenant_id: tenantBId }).catch(() => []) : [];

  const employeesByEmail: Record<string, any> = {};
  for (const emp of [...(employeesA || []), ...employeesBFinal]) {
    if (emp?.email) employeesByEmail[emp.email] = emp;
  }

  const outletsByTenant: Record<string, any[]> = {};
  outletsByTenant[TENANT_A_ID] = outletsA || [];
  if (tenantBId) outletsByTenant[tenantBId] = outletsB || [];

  return { tenantA, tenantB, tenantBId, employeesByEmail, outletsByTenant };
}

// ── RUN SINGLE SCENARIO ──────────────────────────────────────
async function runScenario(base44: any, scenario: any, fixtureData: any, operator: any, verificationRunId: string): Promise<any> {
  const ctx = deriveTestSecurityContext(scenario.persona_key, { ...fixtureData, verificationRunId });
  if (ctx.error) {
    return {
      scenario_id: scenario.scenario_id,
      matrix_type: scenario.matrix_type,
      persona_key: scenario.persona_key,
      source_tenant_id: null,
      target_tenant_id: null,
      operation: scenario.operation,
      proof_class: scenario.proof_class,
      expected_outcome: scenario.expected_outcome,
      actual_outcome: 'blocked',
      result: VERIFICATION_RESULT_STATUSES.BLOCKED,
      reason_code: 'context_derivation_failed',
      reason_detail: ctx.message,
      policy_module: 'test-security-context',
      evaluator_version: SCENARIO_REGISTRY_VERSION,
      operator_actor_id: operator.id,
      operator_actor_name: operator.full_name || 'Admin',
    };
  }

  try {
    const evalResult = await scenario.evaluator({ ctx, fixtureData });
    const passed = evalResult.actual_outcome === scenario.expected_outcome;
    const result = passed ? VERIFICATION_RESULT_STATUSES.PASS : VERIFICATION_RESULT_STATUSES.FAIL;

    return {
      scenario_id: scenario.scenario_id,
      matrix_type: scenario.matrix_type,
      persona_key: scenario.persona_key,
      source_tenant_id: ctx.tenant_id,
      target_tenant_id: scenario.matrix_type === 'tenant_isolation' && scenario.scenario_id.includes('tenant_b') ? (fixtureData.tenantBId || null) : ctx.tenant_id,
      operation: scenario.operation,
      proof_class: scenario.proof_class,
      expected_outcome: scenario.expected_outcome,
      actual_outcome: evalResult.actual_outcome,
      result,
      reason_code: evalResult.reason_code,
      reason_detail: evalResult.reason_detail,
      policy_module: getPolicyModule(scenario.matrix_type),
      evaluator_version: SCENARIO_REGISTRY_VERSION,
      operator_actor_id: operator.id,
      operator_actor_name: operator.full_name || 'Admin',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    };
  } catch (err) {
    return {
      scenario_id: scenario.scenario_id,
      matrix_type: scenario.matrix_type,
      persona_key: scenario.persona_key,
      source_tenant_id: ctx.tenant_id,
      target_tenant_id: null,
      operation: scenario.operation,
      proof_class: scenario.proof_class,
      expected_outcome: scenario.expected_outcome,
      actual_outcome: 'blocked',
      result: VERIFICATION_RESULT_STATUSES.BLOCKED,
      reason_code: 'evaluator_error',
      reason_detail: `Evaluator threw: ${err.message}`,
      policy_module: getPolicyModule(scenario.matrix_type),
      evaluator_version: SCENARIO_REGISTRY_VERSION,
      operator_actor_id: operator.id,
      operator_actor_name: operator.full_name || 'Admin',
    };
  }
}

function getPolicyModule(matrixType: string): string {
  const moduleMap: Record<string, string> = {
    tenant_isolation: 'nexus-gateway-utils.validateTenantMembership',
    worker_boundary: 'ai-approval-policy.validateApproverAuthority',
    approval_authority: 'ai-approval-policy.validateApproverAuthority+isSelfApproval',
    cross_tenant_permission: 'nexus-gateway-utils.hasCrossTenantPermission',
    tenant_membership: 'nexus-gateway-utils.validateTenantMembership',
    approval_scope: 'nexus-gateway-utils.validateApprovalScope',
    approval_lifecycle: 'nexus-gateway-utils.isValidTransition+isTerminalStatus',
    access_engine: 'AccessEngine.evaluate',
  };
  return moduleMap[matrixType] || 'unknown';
}

// ── MAIN ORCHESTRATOR ────────────────────────────────────────
export async function runSafeVerificationMatrix(base44: any, operator: any, options: {
  verificationRunId: string;
  scenarioId?: string | null;
}): Promise<any> {
  const { verificationRunId, scenarioId = null } = options;

  // Validate client input — no authority-adjacent fields allowed
  const inputCheck = validateClientScenarioInput({ scenario_id: scenarioId });
  if (!inputCheck.valid) {
    return {
      success: false,
      safe_error_code: 'invalid_client_input',
      error: `Client must not provide authority fields: ${inputCheck.violations.join(', ')}`,
      violations: inputCheck.violations,
    };
  }

  // Validate scenario ID if provided
  let scenariosToRun = ALL_SCENARIOS;
  if (scenarioId) {
    const scenario = getScenarioById(scenarioId);
    if (!scenario) {
      return {
        success: false,
        safe_error_code: 'invalid_test_scenario',
        error: `Unknown scenario ID: ${scenarioId}. Server-defined scenarios only.`,
      };
    }
    scenariosToRun = [scenario];
  }

  // Load fixture data
  let fixtureData: any;
  try {
    fixtureData = await loadFixtureData(base44);
  } catch (err) {
    return {
      success: false,
      safe_error_code: 'fixture_load_failed',
      error: `Failed to load fixture data: ${err.message}`,
    };
  }

  // Create TestLabOperation for the matrix campaign
  const targetKey = targetKeyForVerificationMatrix(verificationRunId);
  const opCreate = await createOperation(base44, {
    action: 'run_safe_verification_matrix',
    target_type: TARGET_TYPES.VERIFICATION_MATRIX,
    target_key: targetKey,
    tenant_id: 'platform',
    actor_id: operator.id,
    actor_name: operator.full_name || 'Admin',
    verification_run_id: verificationRunId,
  });

  if (opCreate.lock_error === 'lock_registry_uninitialized') {
    return { success: false, safe_error_code: 'lock_registry_uninitialized', error: 'Lock registry has not been initialized.' };
  }
  if (opCreate.lock_error === 'lock_registry_conflict') {
    return { success: false, safe_error_code: 'lock_registry_conflict', error: 'Multiple lock registries detected.' };
  }
  if (opCreate.lock_error) {
    return { success: false, safe_error_code: 'operation_in_progress', error: 'Another matrix operation is in progress.' };
  }
  if (!opCreate.operation_id) {
    return { success: false, safe_error_code: 'audit_failure', error: 'Cannot create TestLabOperation.', error_detail: opCreate.error };
  }

  // Persist durable intent
  const intent = await persistOperationIntent(base44, {
    operation_record_id: opCreate.record_id,
    registry_id: opCreate.registry_id,
    operation_id: opCreate.operation_id,
    audit_tenant_id: 'platform',
    actor_id: operator.id,
    actor_name: operator.full_name || 'Admin',
    action: 'run_safe_verification_matrix',
    target: opCreate.record_id,
    reason: `Run safe verification matrix (${scenariosToRun.length} scenarios)`,
    intended_state: { verification_run_id: verificationRunId, scenario_count: scenariosToRun.length, scenario_id: scenarioId },
  });

  if (!intent.intent_id) {
    await releaseOperationLock(base44, opCreate.registry_id, opCreate.operation_id);
    await transitionOperation(base44, opCreate.record_id, OPERATION_LIFECYCLE_STATES.FAILED, { failure_code: 'intent_failed', failure_summary: intent.error });
    return { success: false, safe_error_code: 'audit_failure', error: 'Cannot persist operation intent.', error_detail: intent.error };
  }

  // Run all scenarios
  const scenarioResults: any[] = [];
  for (const scenario of scenariosToRun) {
    const result = await runScenario(base44, scenario, fixtureData, operator, verificationRunId);
    scenarioResults.push(result);
  }

  // Persist results to TestLabVerificationResult
  try {
    const records = scenarioResults.map(r => ({
      verification_run_id: verificationRunId,
      scenario_id: r.scenario_id,
      matrix_type: r.matrix_type,
      persona_key: r.persona_key,
      source_tenant_id: r.source_tenant_id,
      target_tenant_id: r.target_tenant_id,
      operation: r.operation,
      proof_class: r.proof_class,
      expected_outcome: r.expected_outcome,
      actual_outcome: r.actual_outcome,
      result: r.result,
      reason_code: r.reason_code,
      reason_detail: r.reason_detail,
      policy_module: r.policy_module,
      evaluator_version: r.evaluator_version,
      operator_actor_id: r.operator_actor_id,
      operator_actor_name: r.operator_actor_name,
      started_at: r.started_at || new Date().toISOString(),
      completed_at: r.completed_at || new Date().toISOString(),
      non_production: true,
    }));
    await base44.asServiceRole.entities.TestLabVerificationResult.bulkCreate(records);
    await transitionOperation(base44, opCreate.record_id, OPERATION_LIFECYCLE_STATES.MUTATION_COMPLETED, {
      mutation_resource_ids: records.map(r => r.scenario_id),
    });
  } catch (err) {
    await persistOperationFailure(base44, {
      operation_record_id: opCreate.record_id,
      registry_id: opCreate.registry_id,
      operation_id: opCreate.operation_id,
      audit_tenant_id: 'platform',
      actor_id: operator.id,
      actor_name: operator.full_name || 'Admin',
      action: 'run_safe_verification_matrix',
      target: opCreate.record_id,
      reason: 'Matrix execution',
      intent_id: intent.intent_id,
      intended_state: { verification_run_id: verificationRunId },
      error: `Result persistence failed: ${err.message}`,
    });
    return { success: false, safe_error_code: 'internal_error', error: 'Failed to persist verification results.', error_detail: err.message };
  }

  // Compute summary
  const passCount = scenarioResults.filter(r => r.result === VERIFICATION_RESULT_STATUSES.PASS).length;
  const failCount = scenarioResults.filter(r => r.result === VERIFICATION_RESULT_STATUSES.FAIL).length;
  const blockedCount = scenarioResults.filter(r => r.result === VERIFICATION_RESULT_STATUSES.BLOCKED).length;
  const unverifiedCount = scenarioResults.filter(r => r.result === VERIFICATION_RESULT_STATUSES.UNVERIFIED).length;
  const naCount = scenarioResults.filter(r => r.result === VERIFICATION_RESULT_STATUSES.NOT_APPLICABLE).length;
  const allPassed = failCount === 0 && blockedCount === 0;

  // Persist completion evidence
  const completion = await persistOperationCompletion(base44, {
    operation_record_id: opCreate.record_id,
    registry_id: opCreate.registry_id,
    operation_id: opCreate.operation_id,
    audit_tenant_id: 'platform',
    actor_id: operator.id,
    actor_name: operator.full_name || 'Admin',
    action: 'run_safe_verification_matrix',
    target: opCreate.record_id,
    reason: `Matrix completed: ${passCount} pass, ${failCount} fail, ${blockedCount} blocked`,
    intent_id: intent.intent_id,
    previous_state: null,
    new_state: { verification_run_id: verificationRunId, total: scenarioResults.length, pass: passCount, fail: failCount, blocked: blockedCount, all_passed: allPassed },
    mutation_resource_ids: scenarioResults.map(r => r.scenario_id),
  });

  if (!completion.persisted) {
    return {
      success: false,
      operation_status: 'incomplete',
      operation_id: opCreate.operation_id,
      verification_run_id: verificationRunId,
      matrix_version: MATRIX_VERSION,
      total_scenarios: scenarioResults.length,
      pass_count: passCount,
      fail_count: failCount,
      blocked_count: blockedCount,
      unverified_count: unverifiedCount,
      not_applicable_count: naCount,
      scenarios: scenarioResults,
      message: 'Matrix executed but completion evidence could not be persisted. Recovery required.',
    };
  }

  return {
    success: true,
    operation_status: 'completed',
    operation_id: opCreate.operation_id,
    verification_run_id: verificationRunId,
    matrix_version: MATRIX_VERSION,
    scenario_registry_version: SCENARIO_REGISTRY_VERSION,
    total_scenarios: scenarioResults.length,
    pass_count: passCount,
    fail_count: failCount,
    blocked_count: blockedCount,
    unverified_count: unverifiedCount,
    not_applicable_count: naCount,
    all_passed: allPassed,
    scenarios: scenarioResults,
    completion_audit_id: completion.completion_id,
  };
}