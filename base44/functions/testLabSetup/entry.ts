import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  TEST_IDENTITIES, TEST_LAB_PERMISSION, CROSS_TENANT_AI_PERMISSION,
  TENANT_A_ID, TENANT_A_NAME, TENANT_B_NAME, TENANT_B_TEST_LAB_KEY,
  SANDBOX_TENANT_DEFAULTS,
  SANDBOX_TEST_TTL_DEFAULT_MINUTES, EMAIL_ATTESTATION_CHECKS,
  BOOTSTRAP_STATE,
  OPERATION_LIFECYCLE_STATES, OPERATION_LOOKUP_STATES,
  BLOCKING_OPERATION_STATUSES,
  VERIFICATION_RUN_STATUSES, VERIFICATION_RUN_LOOKUP_STATES,
  VERIFICATION_RUN_TRANSITIONS, isLegalVerificationRunTransition,
  TARGET_TYPES,
  isAllowlistedTestAlias, getTestIdentity,
  resolveServerTtl, isProductionRecord,
  targetKeyForSandboxTenant, targetKeyForMembership,
  targetKeyForPermission, targetKeyForAttestation,
  targetKeyForTestRun, targetKeyForReset,
  targetKeyForVerificationRun, targetKeyForVerificationActivation,
  lockKeyForTarget,
  generateVerificationRunId,
  VERIFICATION_RUN_CAMPAIGN_TYPES, PROOF_CLASSES,
  VERIFICATION_RESULT_STATUSES, MATRIX_VERSION,
  PERSONA_KEYS, getPersonaByKey,
  targetKeyForVerificationMatrix,
} from '../../shared/test-lab-config.ts';

import { ALL_SCENARIOS } from './verification-scenarios.js';

// Runtime helpers extracted to runtime.ts (Build #28.2P-R.0R.1C-F)
import {
  ensureLockRegistry,
  releaseOperationLock,
  getVerificationRunState, getOptionalVerificationRunId,
  checkOperationState, createOperation, transitionOperation,
  persistOperationIntent, persistOperationCompletion,
  persistOperationFailure,
} from './runtime.ts';
import { runSafeVerificationMatrix } from './verification-matrix.ts';

// ============================================================
// ORBITAN TEST LAB SETUP — Internal Governance Test Infrastructure
// Build #28.2P-R.0R.1B — Correlated Test Lab Operation Ledger,
//                        Verification-Run Readiness, Future-Tenant
//                        Architecture Boundary
//
// HARDENING CHANGES (Build #28.2P-R.0R.1B):
//   1.  Operation-state lookup FAILS CLOSED — UNAVAILABLE returns 503,
//       not "no incomplete operation exists".
//   2.  Stable TestLabOperation ledger — one server-generated immutable
//       operation_id correlates the entire lifecycle.
//   3.  Real persisted state machine: PENDING → INTENT_PERSISTED →
//       MUTATION_COMPLETED → COMPLETED (or FAILED / INCOMPLETE).
//   4.  Canonical target keys — deterministic server-side correlation
//       prevents logical-key/database-ID mismatch from hiding operations.
//   5.  Dependent operations block correctly via TestLabOperation ledger.
//   6.  Narrow reconciliation — resolves INCOMPLETE states with audit.
//   7.  VerificationRun model — readiness scoped to active run only.
//   8.  TestRun linked to verification_run_id — historical evidence
//       from other runs cannot satisfy current readiness.
//   9.  Exact scenario readiness — requires matching verification_run_id,
//       sandbox tenant, requester, service, scenario, test_tag.
//
// ARCHITECTURE BOUNDARY:
//   - TestLabOperation, VerificationRun, test aliases, short TTL, test
//     reset, reconciliation are INTERNAL TEST-LAB ONLY.
//   - Canonical tenant provisioning (Tenant/Company/Outlet creation)
//     remains reusable for future customer tenants.
//   - Future customer tenants do NOT inherit is_sandbox, test_lab_key,
//     platform.test_lab.manage, short TTL, or any Test Lab controls.
// ============================================================

function safeJson(errorCode: string, status: number, message: string, extra: Record<string, any> = {}): Response {
  return Response.json({ success: false, safe_error_code: errorCode, error: message, ...extra }, { status });
}

// ── PLATFORM ADMIN + TEST-LAB PERMISSION CHECK ────────────────
async function validateTestLabAuthority(base44: any, user: any): Promise<{ valid: boolean; reason?: string }> {
  if (!user) return { valid: false, reason: 'Not authenticated' };
  if (user.role !== 'admin') return { valid: false, reason: 'Only platform administrators can access Test Lab Setup' };
  const permissions = (user.data?.permissions || []) as string[];
  if (!permissions.includes(TEST_LAB_PERMISSION)) {
    return { valid: false, reason: 'Missing platform.test_lab.manage permission' };
  }
  return { valid: true };
}

// ── AUTOMATED GOVERNANCE READINESS (Build #28.2P-R.0R.3A) ────
// Evidence-derived readiness. Never hardcoded true.
// Ready ONLY when a COMPLETED automated_policy_matrix campaign with
// current MATRIX_VERSION has all required scenario PASS evidence,
// all non_production=true, full persona coverage, and no unresolved
// TestLabOperation for that campaign.
async function computeAutomatedReadiness(base44: any): Promise<any> {
  const baseResult = {
    ready: false,
    matrix_version: MATRIX_VERSION,
    campaign_type: VERIFICATION_RUN_CAMPAIGN_TYPES.AUTOMATED_POLICY_MATRIX,
    proof_classes: [PROOF_CLASSES.POLICY_UNIT],
    rls_proof_status: 'DEFERRED',
    real_auth_proof_status: 'DEFERRED_TO_BUILD_28_2Q',
    requires_registered_users: false,
    requires_verified_emails: false,
    requires_sessions: false,
  };

  // 1. Find all automated_policy_matrix VerificationRuns
  let automatedRuns: any[] | null = null;
  try {
    automatedRuns = await base44.asServiceRole.entities.VerificationRun.filter({
      campaign_type: VERIFICATION_RUN_CAMPAIGN_TYPES.AUTOMATED_POLICY_MATRIX,
    }, '-created_at', 50);
  } catch {
    return { ...baseResult, state: 'UNAVAILABLE', message: 'Cannot query verification runs — evidence unavailable.' };
  }

  if (!automatedRuns) {
    return { ...baseResult, state: 'UNAVAILABLE', message: 'Verification run query returned null.' };
  }

  // 2. Filter for current matrix_version AND non_production=true
  // Build #28.2P-R.0R.3A — a production or untagged campaign must NEVER make ready=true
  const currentVersionRuns = automatedRuns.filter((r: any) =>
    r.matrix_version === MATRIX_VERSION && r.non_production === true
  );
  if (currentVersionRuns.length === 0) {
    return { ...baseResult, state: 'NO_CAMPAIGN', message: 'No non-production automated_policy_matrix campaign with current matrix version exists.' };
  }

  // 3. Categorize by status
  const completedRuns = currentVersionRuns.filter((r: any) => r.status === VERIFICATION_RUN_STATUSES.COMPLETED)
    .sort((a, b) => new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime());
  const activeRuns = currentVersionRuns.filter((r: any) => r.status === VERIFICATION_RUN_STATUSES.ACTIVE);
  const failedRuns = currentVersionRuns.filter((r: any) => r.status === VERIFICATION_RUN_STATUSES.FAILED);

  let candidateRun: any = null;
  let state = 'NO_CAMPAIGN';

  if (completedRuns.length > 0) {
    candidateRun = completedRuns[0];
    state = 'COMPLETED';
  } else if (activeRuns.length > 0) {
    candidateRun = activeRuns[0];
    state = 'IN_PROGRESS';
  } else if (failedRuns.length > 0) {
    candidateRun = failedRuns[0];
    state = 'FAILED';
  }

  if (state !== 'COMPLETED' || !candidateRun) {
    return { ...baseResult, state, verification_run_id: candidateRun?.verification_run_id || null,
      message: state === 'IN_PROGRESS' ? 'Campaign is active but not yet completed.' : state === 'FAILED' ? 'Campaign failed.' : 'No completed automated campaign found.' };
  }

  // 4. Check all required scenarios have TestLabVerificationResult records
  let results: any[] | null = null;
  try {
    results = await base44.asServiceRole.entities.TestLabVerificationResult.filter({
      verification_run_id: candidateRun.verification_run_id,
    }, '-completed_at', 200);
  } catch {
    return { ...baseResult, state: 'UNAVAILABLE', verification_run_id: candidateRun.verification_run_id,
      message: 'Cannot query verification results — evidence unavailable.' };
  }

  if (!results) {
    return { ...baseResult, state: 'UNAVAILABLE', verification_run_id: candidateRun.verification_run_id,
      message: 'Verification result query returned null.' };
  }

  // 5. Check all required scenario_ids are present and PASS
  const requiredScenarioIds = ALL_SCENARIOS.map((s: any) => s.scenario_id);
  const resultScenarioIds = results.map((r: any) => r.scenario_id);
  const missingScenarios = requiredScenarioIds.filter((id: string) => !resultScenarioIds.includes(id));
  const allRequiredPresent = missingScenarios.length === 0;

  const passCount = results.filter((r: any) => r.result === VERIFICATION_RESULT_STATUSES.PASS).length;
  const failCount = results.filter((r: any) => r.result === VERIFICATION_RESULT_STATUSES.FAIL).length;
  const blockedCount = results.filter((r: any) => r.result === VERIFICATION_RESULT_STATUSES.BLOCKED).length;

  // 6. All required POLICY_UNIT scenarios must PASS
  const policyUnitResults = results.filter((r: any) => r.proof_class === PROOF_CLASSES.POLICY_UNIT);
  const allPolicyUnitPass = policyUnitResults.every((r: any) => r.result === VERIFICATION_RESULT_STATUSES.PASS);

  // 7. Every persisted result must have non_production = true
  const allNonProduction = results.every((r: any) => r.non_production === true);

  // 8. Persona coverage matches canonical expected persona matrix
  const resultPersonas = [...new Set(results.map((r: any) => r.persona_key))];
  const missingPersonas = PERSONA_KEYS.filter((p: string) => !resultPersonas.includes(p));
  const personaCoverageComplete = missingPersonas.length === 0;

  // 9. No unresolved/incomplete TestLabOperation for that campaign
  let hasUnresolvedOps = false;
  try {
    const unresolvedOps = await base44.asServiceRole.entities.TestLabOperation.filter({
      verification_run_id: candidateRun.verification_run_id,
      status: { $in: BLOCKING_OPERATION_STATUSES },
    });
    hasUnresolvedOps = !!(unresolvedOps && unresolvedOps.length > 0);
  } catch {
    // If we can't query, fail closed
    hasUnresolvedOps = true;
  }

  // 10. Evidence belongs to THAT exact verification_run_id (enforced by filter above)

  const ready = allRequiredPresent && failCount === 0 && blockedCount === 0 && allPolicyUnitPass && allNonProduction && personaCoverageComplete && !hasUnresolvedOps;

  return {
    ...baseResult,
    ready,
    state: ready ? 'COMPLETED' : 'EVIDENCE_INCOMPLETE',
    verification_run_id: candidateRun.verification_run_id,
    campaign_status: candidateRun.status,
    total_required_scenarios: requiredScenarioIds.length,
    total_results: results.length,
    pass_count: passCount,
    fail_count: failCount,
    blocked_count: blockedCount,
    missing_scenarios: missingScenarios,
    missing_personas: missingPersonas,
    all_non_production: allNonProduction,
    has_unresolved_operations: hasUnresolvedOps,
    message: ready
      ? 'Automated governance readiness verified from persisted evidence.'
      : 'Campaign completed but evidence is incomplete or inconsistent.',
  };
}

// ============================================================
// MAIN HANDLER
// ============================================================
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return safeJson('unauthorized', 401, 'You must be signed in.');

    const body = await req.json();
    const { action } = body;

    // ── BOOTSTRAP PERMISSION — PERMANENTLY DISABLED ────────
    if (action === 'bootstrap_permission') {
      return Response.json({
        success: false,
        safe_error_code: BOOTSTRAP_STATE.DISABLED_CODE,
        error: 'Bootstrap is permanently disabled. The initial bootstrap has already completed. Use the canonical Access Control architecture to manage platform.test_lab.manage permissions.',
        bootstrap_state: BOOTSTRAP_STATE.PERMANENTLY_DISABLED,
      }, { status: 410 });
    }

    // ── ALL REMAINING ACTIONS REQUIRE TEST LAB AUTHORITY ───
    const authCheck = await validateTestLabAuthority(base44, user);
    if (!authCheck.valid) {
      return safeJson('forbidden', 403, authCheck.reason || 'Permission denied.');
    }

    // ── CREATE VERIFICATION RUN (Build #28.2P-R.0R.1C) ─────
    // Uses operation ledger + atomic lock on the verification run target.
    if (action === 'create_verification_run') {
      const testPurpose = body.test_purpose;
      if (!testPurpose || testPurpose.length < 5) return safeJson('invalid_request', 400, 'A meaningful test_purpose is required.');

      // Fail-closed verification run state check
      const vrs = await getVerificationRunState(base44);
      if (vrs.state === VERIFICATION_RUN_LOOKUP_STATES.UNAVAILABLE) {
        return safeJson('verification_run_unavailable', 503, 'Cannot verify verification run state — database lookup failed. Creation blocked for safety.');
      }
      if (vrs.state === VERIFICATION_RUN_LOOKUP_STATES.CONFLICT) {
        return safeJson('verification_run_conflict', 409, 'Multiple active verification runs detected. Reconciliation is required before creating a new run.');
      }
      if (vrs.state === VERIFICATION_RUN_LOOKUP_STATES.ACTIVE) {
        return safeJson('conflict', 409, 'An active verification run already exists. Complete, fail, or archive it before creating a new one.', {
          existing_verification_run_id: vrs.run.verification_run_id,
        });
      }

      const verificationRunId = generateVerificationRunId();
      const targetKey = targetKeyForVerificationRun(verificationRunId);
      const targetKeyVar = targetKey;

      // Use operation ledger with atomic lock
      const opCreate = await createOperation(base44, {
        action: 'create_verification_run',
        target_type: TARGET_TYPES.VERIFICATION_RUN,
        target_key: targetKey,
        tenant_id: 'platform',
        actor_id: user.id, actor_name: user.full_name || 'Admin',
      });
      if (opCreate.lock_error === 'lock_registry_uninitialized') return safeJson('lock_registry_uninitialized', 503, 'Lock registry has not been initialized. Disaster recovery initialization required.');
      if (opCreate.lock_error === 'lock_registry_conflict') return safeJson('lock_registry_conflict', 509, 'Multiple lock registries detected. Reconciliation is required.');
      if (opCreate.lock_error) return safeJson('operation_in_progress', 409, 'Another operation is already in progress for this target.', { target_key: targetKeyVar });
      if (!opCreate.operation_id) return safeJson('audit_failure', 500, 'Cannot create verification run — TestLabOperation could not be created.', { error: opCreate.error });

      const intent = await persistOperationIntent(base44, {
        operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id,
        audit_tenant_id: 'platform',
        actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'create_verification_run', target: opCreate.record_id,
        reason: `Create verification run: ${testPurpose}`,
        intended_state: { verification_run_id: verificationRunId, status: VERIFICATION_RUN_STATUSES.PREPARING, test_purpose: testPurpose },
      });
      if (!intent.intent_id) {
        await releaseOperationLock(base44, opCreate.registry_id, opCreate.operation_id);
        await transitionOperation(base44, opCreate.record_id, OPERATION_LIFECYCLE_STATES.FAILED, { failure_code: 'intent_failed', failure_summary: intent.error });
        return safeJson('audit_failure', 500, 'Cannot create verification run — durable intent could not be persisted.', { error: intent.error });
      }

      const now = new Date().toISOString();
      let run: any = null;
      try {
        run = await base44.asServiceRole.entities.VerificationRun.create({
          verification_run_id: verificationRunId,
          created_by: user.id,
          created_by_name: user.full_name || 'Admin',
          created_at: now,
          status: VERIFICATION_RUN_STATUSES.PREPARING,
          campaign_type: body.campaign_type || VERIFICATION_RUN_CAMPAIGN_TYPES.AUTOMATED_POLICY_MATRIX,
          tenant_a_id: TENANT_A_ID,
          tenant_b_id: null,
          expected_identity_matrix: TEST_IDENTITIES.map(t => t.email),
          expected_personas: PERSONA_KEYS,
          // Build #28.2P-R.0R.3A — server-derived expected_scenarios for automated campaigns.
          // The browser/client cannot define the canonical automated scenario matrix.
          // For automated_policy_matrix: ALL_SCENARIOS is the server-defined registry.
          // For other campaign types: client-provided expected_scenarios are preserved.
          expected_scenarios: (body.campaign_type || VERIFICATION_RUN_CAMPAIGN_TYPES.AUTOMATED_POLICY_MATRIX) === VERIFICATION_RUN_CAMPAIGN_TYPES.AUTOMATED_POLICY_MATRIX
            ? ALL_SCENARIOS.map((s: any) => s.scenario_id)
            : Object.keys(body.expected_scenarios || {}),
          expected_proof_classes: [PROOF_CLASSES.POLICY_UNIT],
          matrix_version: MATRIX_VERSION,
          test_purpose: testPurpose,
          non_production: true,
        });
        await transitionOperation(base44, opCreate.record_id, OPERATION_LIFECYCLE_STATES.MUTATION_COMPLETED, { mutation_resource_ids: [run?.id || ''] });
      } catch (mutErr) {
        await persistOperationFailure(base44, {
          operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id,
          audit_tenant_id: 'platform',
          actor_id: user.id, actor_name: user.full_name || 'Admin',
          action: 'create_verification_run', target: opCreate.record_id, reason: testPurpose, intent_id: intent.intent_id,
          intended_state: { verification_run_id: verificationRunId }, error: mutErr.message,
        });
        return safeJson('internal_error', 500, 'Failed to create verification run. Operation intent is persisted for recovery.', { intent_id: intent.intent_id, operation_id: opCreate.operation_id, error: mutErr.message });
      }

      const completion = await persistOperationCompletion(base44, {
        operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id,
        audit_tenant_id: 'platform',
        actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'create_verification_run', target: opCreate.record_id, reason: testPurpose, intent_id: intent.intent_id,
        previous_state: null,
        new_state: { verification_run_id: verificationRunId, status: VERIFICATION_RUN_STATUSES.PREPARING },
        mutation_resource_ids: [run?.id || ''],
      });
      if (!completion.persisted) {
        return Response.json({ success: false, operation_status: 'incomplete', operation_id: opCreate.operation_id, intent_id: intent.intent_id, verification_run_id: verificationRunId, verification_run_record_id: run?.id, message: 'Verification run was created but completion evidence could not be persisted. Recovery/reconciliation is required.' }, { status: 500 });
      }

      return Response.json({
        success: true, operation_status: 'completed', operation_id: opCreate.operation_id,
        verification_run_id: verificationRunId, verification_run_record_id: run?.id,
        status: VERIFICATION_RUN_STATUSES.PREPARING, created_at: now,
        intent_id: intent.intent_id, completion_audit_id: completion.completion_id,
        message: 'Verification run created in PREPARING status. Activate it when ready to begin the verification cycle.',
      });
    }

    // ── ACTIVATE VERIFICATION RUN (Build #28.2P-R.0R.1C) ───
    // Uses GLOBAL activation lock to guarantee at most one ACTIVE run.
    // Does NOT swallow archive errors. Enforces legal transitions.
    if (action === 'activate_verification_run') {
      const { verification_run_id } = body;
      if (!verification_run_id) return safeJson('invalid_request', 400, 'verification_run_id is required.');

      const runs = await base44.asServiceRole.entities.VerificationRun.filter({ verification_run_id }).catch(() => []);
      if (!runs || runs.length === 0) return safeJson('not_found', 404, 'Verification run not found.');
      const run = runs[0];

      // Enforce legal transition
      if (!isLegalVerificationRunTransition(run.status, VERIFICATION_RUN_STATUSES.ACTIVE)) {
        return safeJson('invalid_request', 400, `Illegal transition: ${run.status} → ${VERIFICATION_RUN_STATUSES.ACTIVE}. Only PREPARING runs can be activated.`);
      }
      if (run.status === VERIFICATION_RUN_STATUSES.ACTIVE) {
        return Response.json({ success: true, verification_run_id, status: VERIFICATION_RUN_STATUSES.ACTIVE, already_active: true, message: 'Verification run is already active.' });
      }

      // Acquire GLOBAL activation lock
      const opCreate = await createOperation(base44, {
        action: 'activate_verification_run',
        target_type: TARGET_TYPES.VERIFICATION_ACTIVATION,
        target_key: targetKeyForVerificationActivation(),
        tenant_id: 'platform',
        actor_id: user.id, actor_name: user.full_name || 'Admin',
        verification_run_id: verification_run_id,
        lock_key_override: lockKeyForTarget(TARGET_TYPES.VERIFICATION_ACTIVATION, targetKeyForVerificationActivation()),
      });
      if (opCreate.lock_error === 'lock_registry_uninitialized') return safeJson('lock_registry_uninitialized', 503, 'Lock registry has not been initialized. Disaster recovery initialization required.');
      if (opCreate.lock_error === 'lock_registry_conflict') return safeJson('lock_registry_conflict', 509, 'Multiple lock registries detected. Reconciliation is required.');
      if (opCreate.lock_error) return safeJson('operation_in_progress', 409, 'Another verification run activation is already in progress. Wait for it to complete.', { lock_key: 'verification_activation:global' });
      if (!opCreate.operation_id) return safeJson('audit_failure', 500, 'Cannot activate — TestLabOperation could not be created.', { error: opCreate.error });

      const intent = await persistOperationIntent(base44, {
        operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id,
        audit_tenant_id: 'platform',
        actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'activate_verification_run', target: opCreate.record_id,
        reason: `Activate verification run ${verification_run_id}`,
        intended_state: { verification_run_id, from_status: run.status, to_status: VERIFICATION_RUN_STATUSES.ACTIVE },
      });
      if (!intent.intent_id) {
        await releaseOperationLock(base44, opCreate.registry_id, opCreate.operation_id);
        await transitionOperation(base44, opCreate.record_id, OPERATION_LIFECYCLE_STATES.FAILED, { failure_code: 'intent_failed', failure_summary: intent.error });
        return safeJson('audit_failure', 500, 'Cannot activate — durable intent could not be persisted.', { error: intent.error });
      }

      // Fail-closed: check for other active runs (do NOT swallow)
      const vrs = await getVerificationRunState(base44);
      if (vrs.state === VERIFICATION_RUN_LOOKUP_STATES.UNAVAILABLE) {
        await persistOperationFailure(base44, {
          operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id,
          audit_tenant_id: 'platform', actor_id: user.id, actor_name: user.full_name || 'Admin',
          action: 'activate_verification_run', target: opCreate.record_id, reason: 'Activate', intent_id: intent.intent_id,
          intended_state: { verification_run_id }, error: 'Verification run state unavailable',
        });
        return safeJson('verification_run_unavailable', 503, 'Cannot verify verification run state — activation blocked for safety.');
      }
      if (vrs.state === VERIFICATION_RUN_LOOKUP_STATES.CONFLICT) {
        await persistOperationFailure(base44, {
          operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id,
          audit_tenant_id: 'platform', actor_id: user.id, actor_name: user.full_name || 'Admin',
          action: 'activate_verification_run', target: opCreate.record_id, reason: 'Activate', intent_id: intent.intent_id,
          intended_state: { verification_run_id }, error: 'Multiple active runs detected',
        });
        return safeJson('verification_run_conflict', 409, 'Multiple active verification runs detected. Reconciliation is required.');
      }
      if (vrs.state === VERIFICATION_RUN_LOOKUP_STATES.ACTIVE && vrs.run.verification_run_id !== verification_run_id) {
        await persistOperationFailure(base44, {
          operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id,
          audit_tenant_id: 'platform', actor_id: user.id, actor_name: user.full_name || 'Admin',
          action: 'activate_verification_run', target: opCreate.record_id, reason: 'Activate', intent_id: intent.intent_id,
          intended_state: { verification_run_id }, error: 'Another run is already active',
        });
        return safeJson('conflict', 409, 'Another verification run is already active. Complete, fail, or archive it first.', { existing_verification_run_id: vrs.run.verification_run_id });
      }

      // Resolve Tenant B ID if provisioned
      const tenantBResults = await base44.asServiceRole.entities.Tenant.filter({ test_lab_key: TENANT_B_TEST_LAB_KEY }).catch(() => []);
      const tenantBId = tenantBResults?.[0]?.id || null;

      const now = new Date().toISOString();
      try {
        await base44.asServiceRole.entities.VerificationRun.update(run.id, {
          status: VERIFICATION_RUN_STATUSES.ACTIVE,
          started_at: now,
          tenant_b_id: tenantBId,
        });
        await transitionOperation(base44, opCreate.record_id, OPERATION_LIFECYCLE_STATES.MUTATION_COMPLETED, { mutation_resource_ids: [run.id] });
      } catch (mutErr) {
        await persistOperationFailure(base44, {
          operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id,
          audit_tenant_id: 'platform', actor_id: user.id, actor_name: user.full_name || 'Admin',
          action: 'activate_verification_run', target: opCreate.record_id, reason: 'Activate', intent_id: intent.intent_id,
          intended_state: { verification_run_id }, error: mutErr.message,
        });
        return safeJson('internal_error', 500, 'Failed to activate verification run. Operation intent is persisted for recovery.', { intent_id: intent.intent_id, operation_id: opCreate.operation_id, error: mutErr.message });
      }

      const completion = await persistOperationCompletion(base44, {
        operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id,
        audit_tenant_id: 'platform', actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'activate_verification_run', target: opCreate.record_id, reason: 'Activate', intent_id: intent.intent_id,
        previous_state: { status: VERIFICATION_RUN_STATUSES.PREPARING },
        new_state: { status: VERIFICATION_RUN_STATUSES.ACTIVE, started_at: now, tenant_b_id: tenantBId },
        mutation_resource_ids: [run.id],
      });
      if (!completion.persisted) {
        return Response.json({ success: false, operation_status: 'incomplete', operation_id: opCreate.operation_id, intent_id: intent.intent_id, verification_run_id, message: 'Verification run was activated but completion evidence could not be persisted. Recovery/reconciliation is required.' }, { status: 500 });
      }

      return Response.json({
        success: true, operation_status: 'completed', operation_id: opCreate.operation_id,
        verification_run_id, status: VERIFICATION_RUN_STATUSES.ACTIVE, started_at: now,
        tenant_a_id: TENANT_A_ID, tenant_b_id: tenantBId,
        intent_id: intent.intent_id, completion_audit_id: completion.completion_id,
        message: 'Verification run activated. Readiness is now scoped to this run.',
      });
    }

    // ── COMPLETE VERIFICATION RUN (Build #28.2P-R.0R.1C) ───
    if (action === 'complete_verification_run') {
      const { verification_run_id } = body;
      if (!verification_run_id) return safeJson('invalid_request', 400, 'verification_run_id is required.');

      const runs = await base44.asServiceRole.entities.VerificationRun.filter({ verification_run_id }).catch(() => []);
      if (!runs || runs.length === 0) return safeJson('not_found', 404, 'Verification run not found.');
      const run = runs[0];

      if (!isLegalVerificationRunTransition(run.status, VERIFICATION_RUN_STATUSES.COMPLETED)) {
        return safeJson('invalid_request', 400, `Illegal transition: ${run.status} → ${VERIFICATION_RUN_STATUSES.COMPLETED}. Only ACTIVE runs can be completed.`);
      }

      const targetKey = targetKeyForVerificationRun(verification_run_id);
      const opCreate = await createOperation(base44, {
        action: 'complete_verification_run', target_type: TARGET_TYPES.VERIFICATION_RUN, target_key: targetKey,
        tenant_id: 'platform', actor_id: user.id, actor_name: user.full_name || 'Admin', verification_run_id,
      });
      if (opCreate.lock_error === 'lock_registry_uninitialized') return safeJson('lock_registry_uninitialized', 503, 'Lock registry has not been initialized. Disaster recovery initialization required.');
      if (opCreate.lock_error === 'lock_registry_conflict') return safeJson('lock_registry_conflict', 509, 'Multiple lock registries detected. Reconciliation is required.');
      if (opCreate.lock_error) return safeJson('operation_in_progress', 409, 'Another operation is already in progress for this verification run.', { target_key: targetKey });
      if (!opCreate.operation_id) return safeJson('audit_failure', 500, 'Cannot complete — TestLabOperation could not be created.', { error: opCreate.error });

      const intent = await persistOperationIntent(base44, {
        operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id,
        audit_tenant_id: 'platform', actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'complete_verification_run', target: opCreate.record_id, reason: `Complete ${verification_run_id}`,
        intended_state: { verification_run_id, from_status: run.status, to_status: VERIFICATION_RUN_STATUSES.COMPLETED },
      });
      if (!intent.intent_id) { await releaseOperationLock(base44, opCreate.registry_id, opCreate.operation_id); await transitionOperation(base44, opCreate.record_id, OPERATION_LIFECYCLE_STATES.FAILED, { failure_code: 'intent_failed', failure_summary: intent.error }); return safeJson('audit_failure', 500, 'Cannot complete — durable intent could not be persisted.', { error: intent.error }); }

      const now = new Date().toISOString();
      try {
        await base44.asServiceRole.entities.VerificationRun.update(run.id, { status: VERIFICATION_RUN_STATUSES.COMPLETED, completed_at: now });
        await transitionOperation(base44, opCreate.record_id, OPERATION_LIFECYCLE_STATES.MUTATION_COMPLETED, { mutation_resource_ids: [run.id] });
      } catch (mutErr) {
        await persistOperationFailure(base44, { operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id, audit_tenant_id: 'platform', actor_id: user.id, actor_name: user.full_name || 'Admin', action: 'complete_verification_run', target: opCreate.record_id, reason: 'Complete', intent_id: intent.intent_id, intended_state: { verification_run_id }, error: mutErr.message });
        return safeJson('internal_error', 500, 'Failed to complete verification run.', { error: mutErr.message });
      }

      const completion = await persistOperationCompletion(base44, { operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id, audit_tenant_id: 'platform', actor_id: user.id, actor_name: user.full_name || 'Admin', action: 'complete_verification_run', target: opCreate.record_id, reason: 'Complete', intent_id: intent.intent_id, previous_state: { status: run.status }, new_state: { status: VERIFICATION_RUN_STATUSES.COMPLETED, completed_at: now }, mutation_resource_ids: [run.id] });
      if (!completion.persisted) return Response.json({ success: false, operation_status: 'incomplete', operation_id: opCreate.operation_id, verification_run_id, message: 'Verification run was completed but completion evidence could not be persisted.' }, { status: 500 });

      return Response.json({ success: true, operation_status: 'completed', operation_id: opCreate.operation_id, verification_run_id, status: VERIFICATION_RUN_STATUSES.COMPLETED, completed_at: now, message: 'Verification run completed.' });
    }

    // ── FAIL VERIFICATION RUN (Build #28.2P-R.0R.1C) ──────
    if (action === 'fail_verification_run') {
      const { verification_run_id, reason: failReason } = body;
      if (!verification_run_id) return safeJson('invalid_request', 400, 'verification_run_id is required.');

      const runs = await base44.asServiceRole.entities.VerificationRun.filter({ verification_run_id }).catch(() => []);
      if (!runs || runs.length === 0) return safeJson('not_found', 404, 'Verification run not found.');
      const run = runs[0];

      if (!isLegalVerificationRunTransition(run.status, VERIFICATION_RUN_STATUSES.FAILED)) {
        return safeJson('invalid_request', 400, `Illegal transition: ${run.status} → ${VERIFICATION_RUN_STATUSES.FAILED}. Only ACTIVE runs can be failed.`);
      }

      const targetKey = targetKeyForVerificationRun(verification_run_id);
      const opCreate = await createOperation(base44, {
        action: 'fail_verification_run', target_type: TARGET_TYPES.VERIFICATION_RUN, target_key: targetKey,
        tenant_id: 'platform', actor_id: user.id, actor_name: user.full_name || 'Admin', verification_run_id,
      });
      if (opCreate.lock_error === 'lock_registry_uninitialized') return safeJson('lock_registry_uninitialized', 503, 'Lock registry has not been initialized. Disaster recovery initialization required.');
      if (opCreate.lock_error === 'lock_registry_conflict') return safeJson('lock_registry_conflict', 509, 'Multiple lock registries detected. Reconciliation is required.');
      if (opCreate.lock_error) return safeJson('operation_in_progress', 409, 'Another operation is already in progress for this verification run.', { target_key: targetKey });
      if (!opCreate.operation_id) return safeJson('audit_failure', 500, 'Cannot fail — TestLabOperation could not be created.', { error: opCreate.error });

      const intent = await persistOperationIntent(base44, {
        operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id,
        audit_tenant_id: 'platform', actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'fail_verification_run', target: opCreate.record_id, reason: `Fail ${verification_run_id}: ${failReason || 'no reason provided'}`,
        intended_state: { verification_run_id, from_status: run.status, to_status: VERIFICATION_RUN_STATUSES.FAILED },
      });
      if (!intent.intent_id) { await releaseOperationLock(base44, opCreate.registry_id, opCreate.operation_id); await transitionOperation(base44, opCreate.record_id, OPERATION_LIFECYCLE_STATES.FAILED, { failure_code: 'intent_failed', failure_summary: intent.error }); return safeJson('audit_failure', 500, 'Cannot fail — durable intent could not be persisted.', { error: intent.error }); }

      const now = new Date().toISOString();
      try {
        await base44.asServiceRole.entities.VerificationRun.update(run.id, { status: VERIFICATION_RUN_STATUSES.FAILED, completed_at: now });
        await transitionOperation(base44, opCreate.record_id, OPERATION_LIFECYCLE_STATES.MUTATION_COMPLETED, { mutation_resource_ids: [run.id] });
      } catch (mutErr) {
        await persistOperationFailure(base44, { operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id, audit_tenant_id: 'platform', actor_id: user.id, actor_name: user.full_name || 'Admin', action: 'fail_verification_run', target: opCreate.record_id, reason: 'Fail', intent_id: intent.intent_id, intended_state: { verification_run_id }, error: mutErr.message });
        return safeJson('internal_error', 500, 'Failed to fail verification run.', { error: mutErr.message });
      }

      const completion = await persistOperationCompletion(base44, { operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id, audit_tenant_id: 'platform', actor_id: user.id, actor_name: user.full_name || 'Admin', action: 'fail_verification_run', target: opCreate.record_id, reason: 'Fail', intent_id: intent.intent_id, previous_state: { status: run.status }, new_state: { status: VERIFICATION_RUN_STATUSES.FAILED, completed_at: now }, mutation_resource_ids: [run.id] });
      if (!completion.persisted) return Response.json({ success: false, operation_status: 'incomplete', operation_id: opCreate.operation_id, verification_run_id, message: 'Verification run was failed but completion evidence could not be persisted.' }, { status: 500 });

      return Response.json({ success: true, operation_status: 'completed', operation_id: opCreate.operation_id, verification_run_id, status: VERIFICATION_RUN_STATUSES.FAILED, completed_at: now, message: 'Verification run failed.' });
    }

    // ── ARCHIVE VERIFICATION RUN (Build #28.2P-R.0R.1C) ──
    // Uses operation ledger. Does NOT swallow errors. Enforces legal transitions.
    if (action === 'archive_verification_run') {
      const { verification_run_id } = body;
      if (!verification_run_id) return safeJson('invalid_request', 400, 'verification_run_id is required.');

      const runs = await base44.asServiceRole.entities.VerificationRun.filter({ verification_run_id }).catch(() => []);
      if (!runs || runs.length === 0) return safeJson('not_found', 404, 'Verification run not found.');
      const run = runs[0];

      if (!isLegalVerificationRunTransition(run.status, VERIFICATION_RUN_STATUSES.ARCHIVED)) {
        return safeJson('invalid_request', 400, `Illegal transition: ${run.status} → ${VERIFICATION_RUN_STATUSES.ARCHIVED}. Only COMPLETED or FAILED runs can be archived.`);
      }

      const targetKey = targetKeyForVerificationRun(verification_run_id);
      const opCreate = await createOperation(base44, {
        action: 'archive_verification_run', target_type: TARGET_TYPES.VERIFICATION_RUN, target_key: targetKey,
        tenant_id: 'platform', actor_id: user.id, actor_name: user.full_name || 'Admin', verification_run_id,
      });
      if (opCreate.lock_error === 'lock_registry_uninitialized') return safeJson('lock_registry_uninitialized', 503, 'Lock registry has not been initialized. Disaster recovery initialization required.');
      if (opCreate.lock_error === 'lock_registry_conflict') return safeJson('lock_registry_conflict', 509, 'Multiple lock registries detected. Reconciliation is required.');
      if (opCreate.lock_error) return safeJson('operation_in_progress', 409, 'Another operation is already in progress for this verification run.', { target_key: targetKey });
      if (!opCreate.operation_id) return safeJson('audit_failure', 500, 'Cannot archive — TestLabOperation could not be created.', { error: opCreate.error });

      const intent = await persistOperationIntent(base44, {
        operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id,
        audit_tenant_id: 'platform', actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'archive_verification_run', target: opCreate.record_id, reason: `Archive ${verification_run_id}`,
        intended_state: { verification_run_id, from_status: run.status, to_status: VERIFICATION_RUN_STATUSES.ARCHIVED },
      });
      if (!intent.intent_id) { await releaseOperationLock(base44, opCreate.registry_id, opCreate.operation_id); await transitionOperation(base44, opCreate.record_id, OPERATION_LIFECYCLE_STATES.FAILED, { failure_code: 'intent_failed', failure_summary: intent.error }); return safeJson('audit_failure', 500, 'Cannot archive — durable intent could not be persisted.', { error: intent.error }); }

      const now = new Date().toISOString();
      try {
        await base44.asServiceRole.entities.VerificationRun.update(run.id, { status: VERIFICATION_RUN_STATUSES.ARCHIVED, archived_at: now });
        await transitionOperation(base44, opCreate.record_id, OPERATION_LIFECYCLE_STATES.MUTATION_COMPLETED, { mutation_resource_ids: [run.id] });
      } catch (mutErr) {
        await persistOperationFailure(base44, { operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id, audit_tenant_id: 'platform', actor_id: user.id, actor_name: user.full_name || 'Admin', action: 'archive_verification_run', target: opCreate.record_id, reason: 'Archive', intent_id: intent.intent_id, intended_state: { verification_run_id }, error: mutErr.message });
        return safeJson('internal_error', 500, 'Failed to archive verification run. Operation intent is persisted for recovery.', { error: mutErr.message });
      }

      const completion = await persistOperationCompletion(base44, { operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id, audit_tenant_id: 'platform', actor_id: user.id, actor_name: user.full_name || 'Admin', action: 'archive_verification_run', target: opCreate.record_id, reason: 'Archive', intent_id: intent.intent_id, previous_state: { status: run.status }, new_state: { status: VERIFICATION_RUN_STATUSES.ARCHIVED, archived_at: now }, mutation_resource_ids: [run.id] });
      if (!completion.persisted) return Response.json({ success: false, operation_status: 'incomplete', operation_id: opCreate.operation_id, verification_run_id, message: 'Verification run was archived but completion evidence could not be persisted.' }, { status: 500 });

      return Response.json({ success: true, operation_status: 'completed', operation_id: opCreate.operation_id, verification_run_id, status: VERIFICATION_RUN_STATUSES.ARCHIVED, archived_at: now, message: 'Verification run archived.' });
    }

    // ── RECONCILE OPERATION (Build #28.2P-R.0R.1B) ──────────
    // Narrow reconciliation: resolves INCOMPLETE TestLabOperation states.
    if (action === 'reconcile_operation') {
      const { operation_id, resolution, reason } = body;
      if (!operation_id) return safeJson('invalid_request', 400, 'operation_id is required.');
      if (!resolution || !['reconciled_completed', 'reconciled_failed'].includes(resolution)) {
        return safeJson('invalid_request', 400, 'resolution must be reconciled_completed or reconciled_failed.');
      }
      if (!reason || reason.length < 10) return safeJson('invalid_request', 400, 'A meaningful reconciliation reason is required (min 10 chars).');

      const ops = await base44.asServiceRole.entities.TestLabOperation.filter({ operation_id }).catch(() => []);
      if (!ops || ops.length === 0) return safeJson('not_found', 404, 'TestLabOperation not found.');
      const op = ops[0];

      if (op.status !== OPERATION_LIFECYCLE_STATES.INCOMPLETE) {
        return safeJson('invalid_request', 400, `Operation is in ${op.status} status. Only INCOMPLETE operations can be reconciled.`);
      }

      // Persist reconciliation audit evidence
      let reconciliationAuditId = '';
      try {
        const audit = await base44.asServiceRole.entities.AuditLog.create({
          tenant_id: op.tenant_id || 'platform',
          actor_id: user.id, actor_name: user.full_name || 'Admin',
          actor_role: 'admin',
          action_type: 'test_lab_reconcile_operation',
          module: 'system', category: 'governance', severity: 'warning',
          event_source: 'testLabSetup',
          target_entity: 'TestLabOperation', target_record_id: op.id,
          details: `RECONCILIATION — ${op.action}: ${resolution}. Reason: ${reason}`,
          previous_state: { status: op.status, failure_code: op.failure_code },
          new_state: { resolution, reason, reconciled_by: user.id },
          shield_outcome: 'not_evaluated',
        });
        reconciliationAuditId = audit?.id || '';
      } catch (err) {
        return safeJson('internal_error', 500, 'Failed to persist reconciliation audit evidence.', { error: err.message });
      }

      // Transition the operation to RECONCILED
      const newStatus = resolution === 'reconciled_completed' ? OPERATION_LIFECYCLE_STATES.COMPLETED : OPERATION_LIFECYCLE_STATES.FAILED;
      try {
        await base44.asServiceRole.entities.TestLabOperation.update(op.id, {
          status: newStatus,
          reconciliation_state: resolution,
          reconciled_by_id: user.id,
          reconciled_by_name: user.full_name || 'Admin',
          reconciliation_reason: reason,
          reconciliation_audit_id: reconciliationAuditId,
          updated_date: new Date().toISOString(),
        });
      } catch (reconcileErr) {
        return safeJson('internal_error', 500, 'Failed to transition operation to reconciled state. Reconciliation audit is persisted but the operation lock remains held.', { error: reconcileErr.message, reconciliation_audit_id: reconciliationAuditId });
      }

      // Release the atomic lock (INCOMPLETE → COMPLETED or FAILED is a terminal transition)
      const registry = await ensureLockRegistry(base44);
      let lockReleaseDegraded = false;
      let lockReleaseError: string | null = null;
      if (registry.uninitialized) {
        lockReleaseDegraded = true;
        lockReleaseError = 'Lock registry not initialized — cannot release operation lock';
      } else if (registry.conflict) {
        lockReleaseDegraded = true;
        lockReleaseError = 'Lock registry conflict — cannot safely release operation lock';
      } else if (registry.registry_id && op.operation_id) {
        const releaseResult = await releaseOperationLock(base44, registry.registry_id, op.operation_id);
        if (!releaseResult.verified) {
          lockReleaseDegraded = true;
          lockReleaseError = releaseResult.error || 'Lock release could not be verified';
        }
      }

      return Response.json({
        success: true,
        operation_id,
        previous_status: op.status,
        new_status: newStatus,
        reconciliation_state: resolution,
        reconciliation_audit_id: reconciliationAuditId,
        lock_release_degraded: lockReleaseDegraded,
        lock_release_error: lockReleaseError,
        message: lockReleaseDegraded
          ? `Operation reconciled to ${newStatus}. WARNING: Lock release is degraded — ${lockReleaseError}. Manual reconciliation of the lock registry may be required.`
          : `Operation reconciled to ${newStatus}. Dependent operations are now unblocked.`,
      });
    }

    // ── PROVISION TENANT B (intent-first, idempotent, schema-valid) ──
    if (action === 'provision_tenant_b') {
      const reason = body.reason || 'Provision Test Tenant B for governance verification';
      if (reason.length < 5) return safeJson('invalid_request', 400, 'A meaningful reason is required.');

      const targetKey = targetKeyForSandboxTenant();

      // FAIL-CLOSED operation state lookup
      const opState = await checkOperationState(base44, TARGET_TYPES.SANDBOX_TENANT, targetKey);
      if (opState.state === OPERATION_LOOKUP_STATES.UNAVAILABLE) {
        return safeJson('operation_state_unavailable', 503, 'Cannot verify operation state — operation ledger is unavailable. Provisioning blocked for safety.', { target_key: targetKey });
      }
      if (opState.state === OPERATION_LOOKUP_STATES.BLOCKED) {
        return safeJson('incomplete_operation', 409, 'An incomplete or unresolved operation exists for Test Tenant B. Recovery/reconciliation is required before provisioning can proceed.', {
          unresolved_operations: opState.operations.map((o: any) => ({
            operation_id: o.operation_id, action: o.action, target_type: o.target_type,
            target_key: o.target_key, status: o.status, created_date: o.created_date,
          })),
        });
      }

      // Idempotent check using canonical test_lab_key
      const existing = await base44.asServiceRole.entities.Tenant.filter({ test_lab_key: TENANT_B_TEST_LAB_KEY }).catch(() => []);
      if (existing && existing.length > 0) {
        const tenant = existing[0];
        if (!tenant.is_sandbox || !tenant.test_lab_key) {
          return safeJson('conflict', 409, 'A tenant with the same name exists but is not a valid Test Lab sandbox tenant. Refusing to reuse.', {
            tenant_id: tenant.id, is_sandbox: tenant.is_sandbox, has_test_lab_key: !!tenant.test_lab_key,
          });
        }
        const companies = await base44.asServiceRole.entities.Company.filter({ tenant_id: tenant.id }).catch(() => []);
        const outlets = await base44.asServiceRole.entities.Outlet.filter({ tenant_id: tenant.id }).catch(() => []);
        return Response.json({
          success: true, reused: true,
          tenant_id: tenant.id, tenant_name: tenant.name,
          is_sandbox: tenant.is_sandbox,
          company_id: companies?.[0]?.id || null,
          outlet_id: outlets?.[0]?.id || null,
          billing_activated: false, integration_activated: false,
          wallet_state: 'not_provisioned',
          readiness_state: 'provisioned',
          message: 'Test Tenant B already exists. Reusing existing hierarchy.',
        });
      }

      const nameConflict = await base44.asServiceRole.entities.Tenant.filter({ name: TENANT_B_NAME }).catch(() => []);
      if (nameConflict && nameConflict.length > 0) {
        const conflict = nameConflict[0];
        if (!conflict.test_lab_key || !conflict.is_sandbox) {
          return safeJson('conflict', 409, 'A tenant with the same display name exists but lacks the Test Lab key or sandbox flag. Refusing to reuse.', {
            tenant_id: conflict.id, is_sandbox: conflict.is_sandbox, has_test_lab_key: !!conflict.test_lab_key,
          });
        }
      }

      // STEP 0: Create TestLabOperation record (PENDING) + acquire atomic lock
      const optionalVRunId = await getOptionalVerificationRunId(base44);
      const opCreate = await createOperation(base44, {
        action: 'provision_tenant_b',
        target_type: TARGET_TYPES.SANDBOX_TENANT,
        target_key: targetKey,
        tenant_id: 'platform',
        actor_id: user.id, actor_name: user.full_name || 'Admin',
        verification_run_id: optionalVRunId,
      });
      if (opCreate.lock_error === 'lock_registry_uninitialized') return safeJson('lock_registry_uninitialized', 503, 'Lock registry has not been initialized. Disaster recovery initialization required.');
      if (opCreate.lock_error === 'lock_registry_conflict') return safeJson('lock_registry_conflict', 509, 'Multiple lock registries detected. Reconciliation is required.');
      if (opCreate.lock_error) {
        return safeJson('operation_in_progress', 409, 'Another operation is already in progress for this target. Wait for it to complete or reconcile any incomplete operation.', { target_key: targetKey });
      }
      if (!opCreate.operation_id) {
        return safeJson('audit_failure', 500, 'Cannot provision — TestLabOperation record could not be created. No mutation has occurred.', { error: opCreate.error });
      }

      // STEP 1: Persist durable operation intent BEFORE mutation
      const intent = await persistOperationIntent(base44, {
        operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id,
        audit_tenant_id: 'platform',
        actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'provision_tenant_b', target: opCreate.record_id,
        reason,
        intended_state: { tenant_name: TENANT_B_NAME, test_lab_key: TENANT_B_TEST_LAB_KEY, is_sandbox: true, operation_id: opCreate.operation_id },
      });
      if (!intent.intent_id) {
        return safeJson('audit_failure', 500, 'Cannot provision — durable operation intent could not be persisted. No mutation has occurred.', { error: intent.error, operation_id: opCreate.operation_id });
      }

      // STEP 2: Perform the idempotent mutation
      let tenantRecord: any = null, companyRec: any = null, outletRec: any = null;
      try {
        tenantRecord = await base44.asServiceRole.entities.Tenant.create({
          name: TENANT_B_NAME,
          legal_name: `${TENANT_B_NAME} (Sandbox Test Tenant)`,
          ...SANDBOX_TENANT_DEFAULTS,
          test_lab_key: TENANT_B_TEST_LAB_KEY,
          notes: 'TEST_LAB_B — Sandbox Test Tenant B for cross-tenant governance isolation testing. Not a real business. Provisioned by Test Lab Setup.',
        });
        if (!tenantRecord) throw new Error('Tenant creation returned null');
        companyRec = await base44.asServiceRole.entities.Company.create({
          tenant_id: tenantRecord.id, name: TENANT_B_NAME,
          legal_name: `${TENANT_B_NAME} (Sandbox)`, industry: 'food_beverage',
          country: 'Singapore', status: 'active',
        });
        outletRec = await base44.asServiceRole.entities.Outlet.create({
          tenant_id: tenantRecord.id, company_id: companyRec.id,
          name: 'Test Lab B — Outlet 1', type: 'other',
          address: 'Test Lab Address (Non-Physical)', is_virtual: true, status: 'active',
        });
        // Transition to MUTATION_COMPLETED
        await transitionOperation(base44, opCreate.record_id, OPERATION_LIFECYCLE_STATES.MUTATION_COMPLETED, {
          mutation_resource_ids: [tenantRecord.id, companyRec.id, outletRec.id],
        });
      } catch (mutErr) {
        await persistOperationFailure(base44, {
          operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id,
          audit_tenant_id: 'platform',
          actor_id: user.id, actor_name: user.full_name || 'Admin',
          action: 'provision_tenant_b', target: opCreate.record_id,
          reason, intent_id: intent.intent_id,
          intended_state: { tenant_name: TENANT_B_NAME }, error: mutErr.message,
        });
        return safeJson('internal_error', 500, 'Failed to create Test Tenant B hierarchy. Operation intent is persisted for recovery.', {
          intent_id: intent.intent_id, operation_id: opCreate.operation_id,
          partial_tenant_id: tenantRecord?.id || null,
          partial_company_id: companyRec?.id || null,
          error: mutErr.message,
        });
      }

      // STEP 3: Persist completion evidence
      const completion = await persistOperationCompletion(base44, {
        operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id,
        audit_tenant_id: tenantRecord.id,
        actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'provision_tenant_b', target: opCreate.record_id,
        reason, intent_id: intent.intent_id,
        previous_state: null,
        new_state: { tenant_id: tenantRecord.id, company_id: companyRec.id, outlet_id: outletRec.id, is_sandbox: true },
        mutation_resource_ids: [tenantRecord.id, companyRec.id, outletRec.id],
      });

      if (!completion.persisted) {
        return Response.json({
          success: false, operation_status: 'incomplete',
          operation_id: opCreate.operation_id,
          intent_id: intent.intent_id, resource_id: tenantRecord.id,
          tenant_id: tenantRecord.id, company_id: companyRec.id, outlet_id: outletRec.id,
          completion_audit_id: completion.completion_id,
          message: 'Test Tenant B was provisioned but completion evidence could not be persisted. Recovery/reconciliation is required. Dependent operations are blocked until resolved.',
        }, { status: 500 });
      }

      return Response.json({
        success: true, operation_status: 'completed',
        operation_id: opCreate.operation_id,
        tenant_id: tenantRecord.id, tenant_name: tenantRecord.name,
        is_sandbox: true, company_id: companyRec.id, outlet_id: outletRec.id,
        billing_activated: false, integration_activated: false,
        wallet_state: 'not_provisioned', readiness_state: 'provisioned',
        intent_id: intent.intent_id, completion_audit_id: completion.completion_id,
        message: 'Test Tenant B provisioned successfully with full hierarchy (Tenant → Company → Outlet).',
      });
    }

    // ── AUDIT TENANT A (read-only readiness) ───────────────
    if (action === 'audit_tenant_a') {
      let tenant: any = null;
      try { tenant = await base44.asServiceRole.entities.Tenant.get(TENANT_A_ID); } catch { return safeJson('not_found', 404, 'Test Tenant A not found.'); }
      if (!tenant) return safeJson('not_found', 404, 'Test Tenant A not found.');

      const [outlets, employees, approvals, inboxItems, usageRecords] = await Promise.all([
        base44.asServiceRole.entities.Outlet.filter({ tenant_id: TENANT_A_ID }).catch(() => []),
        base44.asServiceRole.entities.Employee.filter({ tenant_id: TENANT_A_ID }).catch(() => []),
        base44.asServiceRole.entities.AIApproval.filter({ tenant_id: TENANT_A_ID }).catch(() => []),
        base44.asServiceRole.entities.OrbitInbox.filter({ tenant_id: TENANT_A_ID }).catch(() => []),
        base44.asServiceRole.entities.OrbitUsageTracker.filter({ tenant_id: TENANT_A_ID }).catch(() => []),
      ]);

      const linkedUsers = (employees || []).filter((e: any) => e.user_id);
      const hasProductionData = (employees || []).some((e: any) =>
        !e.email?.includes('@orbitan.net') && !e.email?.includes('@orbitan.test')
      );

      let readiness: 'READY' | 'REQUIRES_CLEANUP' | 'BLOCKED' = 'READY';
      if (hasProductionData) readiness = 'REQUIRES_CLEANUP';
      if (!tenant.is_sandbox) readiness = 'BLOCKED';

      return Response.json({
        success: true,
        tenant: { id: tenant.id, name: tenant.name, status: tenant.status, is_sandbox: tenant.is_sandbox, subscription_plan: tenant.subscription_plan, governance_domain: tenant.governance_domain },
        outlets_count: outlets?.length || 0,
        employees_count: employees?.length || 0,
        linked_users_count: linkedUsers.length,
        ai_approval_count: approvals?.length || 0,
        orbit_inbox_count: inboxItems?.length || 0,
        usage_record_count: usageRecords?.length || 0,
        has_production_data: hasProductionData,
        readiness,
      });
    }

    // ── PREPARE MEMBERSHIP (intent-first) ──────────────────
    if (action === 'prepare_membership') {
      const { email } = body;
      if (!email || !isAllowlistedTestAlias(email)) {
        return safeJson('invalid_request', 400, 'Email is not in the fixed test-identity allowlist.');
      }
      const identity = getTestIdentity(email)!;
      const reason = body.reason || `Prepare membership for ${identity.label}`;
      if (reason.length < 5) return safeJson('invalid_request', 400, 'A meaningful reason is required.');

      let targetTenantId: string;
      if (identity.tenant === 'A') {
        targetTenantId = TENANT_A_ID;
      } else if (identity.tenant === 'B') {
        const tenantB = await base44.asServiceRole.entities.Tenant.filter({ test_lab_key: TENANT_B_TEST_LAB_KEY }).catch(() => []);
        if (!tenantB || tenantB.length === 0) return safeJson('invalid_request', 409, 'Test Tenant B has not been provisioned yet.');
        targetTenantId = tenantB[0].id;
      } else {
        return Response.json({ success: true, email, label: identity.label, membership_state: 'PLATFORM_IDENTITY', message: 'Platform identities do not require Employee membership. Invite directly.' });
      }

      const targetKey = targetKeyForMembership(targetTenantId, email);

      // FAIL-CLOSED operation state lookup
      const opState = await checkOperationState(base44, TARGET_TYPES.TEST_MEMBERSHIP, targetKey);
      if (opState.state === OPERATION_LOOKUP_STATES.UNAVAILABLE) {
        return safeJson('operation_state_unavailable', 503, 'Cannot verify operation state — operation ledger is unavailable. Membership preparation blocked for safety.', { target_key: targetKey });
      }
      if (opState.state === OPERATION_LOOKUP_STATES.BLOCKED) {
        return safeJson('incomplete_operation', 409, 'An incomplete operation exists for this membership. Recovery/reconciliation is required.', {
          unresolved_operations: opState.operations.map((o: any) => ({ operation_id: o.operation_id, action: o.action, status: o.status })),
        });
      }

      const outlets = await base44.asServiceRole.entities.Outlet.filter({ tenant_id: targetTenantId }).catch(() => []);
      const companies = await base44.asServiceRole.entities.Company.filter({ tenant_id: targetTenantId }).catch(() => []);
      const outletId = outlets?.[0]?.id || null;
      const companyId = companies?.[0]?.id || null;
      if (identity.outletRequired && !outletId) return safeJson('invalid_request', 409, 'No outlet exists in the target tenant. Provision the tenant first.');

      const existingEmployees = await base44.asServiceRole.entities.Employee.filter({ tenant_id: targetTenantId, email }).catch(() => []);
      if (existingEmployees && existingEmployees.length > 0) {
        const emp = existingEmployees[0];
        const optionalVRunId = await getOptionalVerificationRunId(base44);
        const opCreate = await createOperation(base44, {
          action: 'prepare_membership', target_type: TARGET_TYPES.TEST_MEMBERSHIP, target_key: targetKey,
          tenant_id: targetTenantId, actor_id: user.id, actor_name: user.full_name || 'Admin',
          verification_run_id: optionalVRunId,
        });
        if (opCreate.lock_error === 'lock_registry_uninitialized') return safeJson('lock_registry_uninitialized', 503, 'Lock registry has not been initialized. Disaster recovery initialization required.');
      if (opCreate.lock_error === 'lock_registry_conflict') return safeJson('lock_registry_conflict', 509, 'Multiple lock registries detected. Reconciliation is required.');
      if (opCreate.lock_error) return safeJson('operation_in_progress', 409, 'Another operation is already in progress for this target. Wait for it to complete or reconcile any incomplete operation.', { target_key: targetKey });
      if (!opCreate.operation_id) return safeJson('audit_failure', 500, 'Cannot record membership reuse — TestLabOperation could not be created.');

        const intent = await persistOperationIntent(base44, {
          operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id, audit_tenant_id: targetTenantId,
          actor_id: user.id, actor_name: user.full_name || 'Admin',
          action: 'prepare_membership', target: opCreate.record_id, reason: `Idempotent reuse of existing Employee for ${email}`,
          intended_state: { employee_id: emp.id, email, reused: true, operation_id: opCreate.operation_id },
        });
        if (!intent.intent_id) return safeJson('audit_failure', 500, 'Cannot record membership reuse — durable intent could not be persisted.');

        await transitionOperation(base44, opCreate.record_id, OPERATION_LIFECYCLE_STATES.MUTATION_COMPLETED, { mutation_resource_ids: [emp.id] });

        const completion = await persistOperationCompletion(base44, {
          operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id, audit_tenant_id: targetTenantId,
          actor_id: user.id, actor_name: user.full_name || 'Admin',
          action: 'prepare_membership', target: opCreate.record_id, reason: `Idempotent reuse of existing Employee for ${email}`,
          intent_id: intent.intent_id, previous_state: { role: emp.role, status: emp.status },
          new_state: { role: emp.role, status: emp.status, reused: true }, mutation_resource_ids: [emp.id],
        });
        if (!completion.persisted) {
          return Response.json({ success: false, operation_status: 'incomplete', operation_id: opCreate.operation_id, intent_id: intent.intent_id, resource_id: emp.id, email, employee_id: emp.id, role: emp.role, status: emp.status, reused: true, message: 'Membership reuse mutation succeeded but completion evidence could not be persisted. Recovery/reconciliation is required.' }, { status: 500 });
        }
        return Response.json({ success: true, operation_status: 'completed', operation_id: opCreate.operation_id, email, employee_id: emp.id, role: emp.role, status: emp.status, reused: true, membership_state: 'MEMBERSHIP_PREPARED', intent_id: intent.intent_id, completion_audit_id: completion.completion_id, message: 'Employee membership already exists. Reusing existing record.' });
      }

      // STEP 0: Create TestLabOperation record (PENDING)
      const optionalVRunId = await getOptionalVerificationRunId(base44);
      const opCreate = await createOperation(base44, {
        action: 'prepare_membership', target_type: TARGET_TYPES.TEST_MEMBERSHIP, target_key: targetKey,
        tenant_id: targetTenantId, actor_id: user.id, actor_name: user.full_name || 'Admin',
        verification_run_id: optionalVRunId,
      });
      if (opCreate.lock_error === 'lock_registry_uninitialized') return safeJson('lock_registry_uninitialized', 503, 'Lock registry has not been initialized. Disaster recovery initialization required.');
      if (opCreate.lock_error === 'lock_registry_conflict') return safeJson('lock_registry_conflict', 509, 'Multiple lock registries detected. Reconciliation is required.');
      if (opCreate.lock_error) return safeJson('operation_in_progress', 409, 'Another operation is already in progress for this target. Wait for it to complete or reconcile any incomplete operation.', { target_key: targetKey });
      if (!opCreate.operation_id) return safeJson('audit_failure', 500, 'Cannot prepare membership — TestLabOperation could not be created.', { error: opCreate.error });

      // STEP 1: Persist durable operation intent BEFORE mutation
      const intent = await persistOperationIntent(base44, {
        operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id, audit_tenant_id: targetTenantId,
        actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'prepare_membership', target: opCreate.record_id, reason,
        intended_state: { email, role: identity.employeeRole, tenant_id: targetTenantId, outlet_id: outletId, operation_id: opCreate.operation_id },
      });
      if (!intent.intent_id) return safeJson('audit_failure', 500, 'Cannot prepare membership — durable operation intent could not be persisted. No mutation has occurred.', { error: intent.error, operation_id: opCreate.operation_id });

      // STEP 2: Perform the mutation
      let employeeRecord: any;
      try {
        employeeRecord = await base44.asServiceRole.entities.Employee.create({
          tenant_id: targetTenantId, outlet_id: outletId, company_id: companyId,
          full_name: identity.label, email, role: identity.employeeRole,
          status: 'active', employment_type: 'full_time', hire_date: new Date().toISOString().split('T')[0],
        });
        await transitionOperation(base44, opCreate.record_id, OPERATION_LIFECYCLE_STATES.MUTATION_COMPLETED, { mutation_resource_ids: [employeeRecord.id] });
      } catch (mutErr) {
        await persistOperationFailure(base44, {
          operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id, audit_tenant_id: targetTenantId,
          actor_id: user.id, actor_name: user.full_name || 'Admin',
          action: 'prepare_membership', target: opCreate.record_id, reason, intent_id: intent.intent_id,
          intended_state: { email, role: identity.employeeRole }, error: mutErr.message,
        });
        return safeJson('internal_error', 500, 'Failed to create Employee. Operation intent is persisted for recovery.', { intent_id: intent.intent_id, operation_id: opCreate.operation_id, error: mutErr.message });
      }

      // STEP 3: Persist completion evidence
      const completion = await persistOperationCompletion(base44, {
        operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id, audit_tenant_id: targetTenantId,
        actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'prepare_membership', target: opCreate.record_id, reason, intent_id: intent.intent_id,
        previous_state: null,
        new_state: { employee_id: employeeRecord.id, email, role: identity.employeeRole, tenant_id: targetTenantId, outlet_id: outletId, user_id_linked: false },
        mutation_resource_ids: [employeeRecord.id],
      });

      if (!completion.persisted) {
        return Response.json({
          success: false, operation_status: 'incomplete', operation_id: opCreate.operation_id,
          intent_id: intent.intent_id, resource_id: employeeRecord.id,
          email, employee_id: employeeRecord.id, role: identity.employeeRole,
          tenant_id: targetTenantId, outlet_id: outletId, membership_state: 'MEMBERSHIP_PREPARED',
          message: 'Employee membership was created but completion evidence could not be persisted. Recovery/reconciliation is required. Dependent operations are blocked until resolved.',
        }, { status: 500 });
      }

      return Response.json({ success: true, operation_status: 'completed', operation_id: opCreate.operation_id, email, employee_id: employeeRecord.id, role: identity.employeeRole, tenant_id: targetTenantId, outlet_id: outletId, membership_state: 'MEMBERSHIP_PREPARED', intent_id: intent.intent_id, completion_audit_id: completion.completion_id, message: 'Employee membership prepared. The user must now be invited through the canonical /join flow.' });
    }

    // ── GRANT CROSS-TENANT PERMISSION (intent-first) ───────
    if (action === 'grant_permission') {
      const { email } = body;
      if (!email || !isAllowlistedTestAlias(email)) return safeJson('invalid_request', 400, 'Email is not in the fixed test-identity allowlist.');
      const identity = getTestIdentity(email)!;
      if (!identity.requiresCrossTenantPermission) return safeJson('invalid_request', 400, 'This identity is not eligible for the cross-tenant permission.');
      const reason = body.reason || `Grant cross-tenant AI permission to ${identity.label}`;
      if (reason.length < 5) return safeJson('invalid_request', 400, 'A meaningful reason is required.');

      const users = await base44.asServiceRole.entities.User.filter({ email }).catch(() => []);
      if (!users || users.length === 0) return safeJson('not_found', 404, 'Test identity has not registered yet. Invite and register first.');
      const targetUser = users[0];

      const currentPermissions = (targetUser.data?.permissions || []) as string[];
      if (currentPermissions.includes(CROSS_TENANT_AI_PERMISSION)) {
        return Response.json({ success: true, email, user_id: targetUser.id, permission: CROSS_TENANT_AI_PERMISSION, effective: true, already_granted: true, message: 'Permission was already granted.' });
      }

      const targetKey = targetKeyForPermission(targetUser.id);

      // FAIL-CLOSED operation state lookup
      const opState = await checkOperationState(base44, TARGET_TYPES.TEST_PERMISSION, targetKey);
      if (opState.state === OPERATION_LOOKUP_STATES.UNAVAILABLE) {
        return safeJson('operation_state_unavailable', 503, 'Cannot verify operation state — operation ledger is unavailable. Permission grant blocked for safety.', { target_key: targetKey });
      }
      if (opState.state === OPERATION_LOOKUP_STATES.BLOCKED) {
        return safeJson('incomplete_operation', 409, 'An incomplete operation exists for this user. Recovery/reconciliation is required.', {
          unresolved_operations: opState.operations.map((o: any) => ({ operation_id: o.operation_id, action: o.action, status: o.status })),
        });
      }

      // STEP 0: Create TestLabOperation record (PENDING)
      const optionalVRunId = await getOptionalVerificationRunId(base44);
      const opCreate = await createOperation(base44, {
        action: 'grant_permission', target_type: TARGET_TYPES.TEST_PERMISSION, target_key: targetKey,
        tenant_id: targetUser.data?.tenant_id || 'platform',
        actor_id: user.id, actor_name: user.full_name || 'Admin',
        verification_run_id: optionalVRunId,
      });
      if (opCreate.lock_error === 'lock_registry_uninitialized') return safeJson('lock_registry_uninitialized', 503, 'Lock registry has not been initialized. Disaster recovery initialization required.');
      if (opCreate.lock_error === 'lock_registry_conflict') return safeJson('lock_registry_conflict', 509, 'Multiple lock registries detected. Reconciliation is required.');
      if (opCreate.lock_error) return safeJson('operation_in_progress', 409, 'Another operation is already in progress for this target. Wait for it to complete or reconcile any incomplete operation.', { target_key: targetKey });
      if (!opCreate.operation_id) return safeJson('audit_failure', 500, 'Cannot grant permission — TestLabOperation could not be created.', { error: opCreate.error });

      // STEP 1: Persist durable operation intent BEFORE mutation
      const intent = await persistOperationIntent(base44, {
        operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id, audit_tenant_id: targetUser.data?.tenant_id || 'platform',
        actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'grant_permission', target: opCreate.record_id, reason,
        intended_state: { permission: CROSS_TENANT_AI_PERMISSION, target_email: email, target_user_id: targetUser.id, operation_id: opCreate.operation_id },
      });
      if (!intent.intent_id) return safeJson('audit_failure', 500, 'Cannot grant permission — durable operation intent could not be persisted. No mutation has occurred.', { error: intent.error, operation_id: opCreate.operation_id });

      // STEP 2: Perform the mutation
      const newPermissions = [...currentPermissions, CROSS_TENANT_AI_PERMISSION];
      try {
        await base44.asServiceRole.entities.User.update(targetUser.id, { data: { ...targetUser.data, permissions: newPermissions } });
        await transitionOperation(base44, opCreate.record_id, OPERATION_LIFECYCLE_STATES.MUTATION_COMPLETED, { mutation_resource_ids: [targetUser.id] });
      } catch (mutErr) {
        await persistOperationFailure(base44, {
          operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id, audit_tenant_id: targetUser.data?.tenant_id || 'platform',
          actor_id: user.id, actor_name: user.full_name || 'Admin',
          action: 'grant_permission', target: opCreate.record_id, reason, intent_id: intent.intent_id,
          intended_state: { permission: CROSS_TENANT_AI_PERMISSION, target_email: email }, error: mutErr.message,
        });
        return safeJson('internal_error', 500, 'Failed to grant permission. Operation intent is persisted for recovery.', { intent_id: intent.intent_id, operation_id: opCreate.operation_id, error: mutErr.message });
      }

      // STEP 3: Persist completion evidence
      const completion = await persistOperationCompletion(base44, {
        operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id, audit_tenant_id: targetUser.data?.tenant_id || 'platform',
        actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'grant_permission', target: opCreate.record_id, reason, intent_id: intent.intent_id,
        previous_state: { permission: CROSS_TENANT_AI_PERMISSION, granted: false },
        new_state: { permission: CROSS_TENANT_AI_PERMISSION, granted: true, target_email: email },
        mutation_resource_ids: [targetUser.id],
      });

      if (!completion.persisted) {
        return Response.json({
          success: false, operation_status: 'incomplete', operation_id: opCreate.operation_id,
          intent_id: intent.intent_id, resource_id: targetUser.id,
          email, user_id: targetUser.id, permission: CROSS_TENANT_AI_PERMISSION, effective: true,
          message: 'Permission was granted but completion evidence could not be persisted. Recovery/reconciliation is required.',
        }, { status: 500 });
      }

      return Response.json({ success: true, operation_status: 'completed', operation_id: opCreate.operation_id, email, user_id: targetUser.id, permission: CROSS_TENANT_AI_PERMISSION, effective: true, auth_refresh_required: true, intent_id: intent.intent_id, completion_audit_id: completion.completion_id, message: 'Cross-tenant AI permission granted. The user must sign out and sign back in.' });
    }

    // ── REVOKE CROSS-TENANT PERMISSION (intent-first) ──────
    if (action === 'revoke_permission') {
      const { email } = body;
      if (!email || !isAllowlistedTestAlias(email)) return safeJson('invalid_request', 400, 'Email is not in the fixed test-identity allowlist.');
      const reason = body.reason || `Revoke cross-tenant AI permission from ${getTestIdentity(email)?.label || email}`;
      if (reason.length < 5) return safeJson('invalid_request', 400, 'A meaningful reason is required.');

      const users = await base44.asServiceRole.entities.User.filter({ email }).catch(() => []);
      if (!users || users.length === 0) return safeJson('not_found', 404, 'Test identity not found.');
      const targetUser = users[0];

      const currentPermissions = (targetUser.data?.permissions || []) as string[];
      const previousValue = currentPermissions.includes(CROSS_TENANT_AI_PERMISSION);
      const newPermissions = currentPermissions.filter(p => p !== CROSS_TENANT_AI_PERMISSION);

      const targetKey = targetKeyForPermission(targetUser.id);

      // FAIL-CLOSED operation state lookup
      const opState = await checkOperationState(base44, TARGET_TYPES.TEST_PERMISSION, targetKey);
      if (opState.state === OPERATION_LOOKUP_STATES.UNAVAILABLE) {
        return safeJson('operation_state_unavailable', 503, 'Cannot verify operation state — operation ledger is unavailable. Permission revocation blocked for safety.', { target_key: targetKey });
      }
      if (opState.state === OPERATION_LOOKUP_STATES.BLOCKED) {
        return safeJson('incomplete_operation', 409, 'An incomplete operation exists for this user. Recovery/reconciliation is required.', {
          unresolved_operations: opState.operations.map((o: any) => ({ operation_id: o.operation_id, action: o.action, status: o.status })),
        });
      }

      // STEP 0: Create TestLabOperation record (PENDING)
      const optionalVRunId = await getOptionalVerificationRunId(base44);
      const opCreate = await createOperation(base44, {
        action: 'revoke_permission', target_type: TARGET_TYPES.TEST_PERMISSION, target_key: targetKey,
        tenant_id: targetUser.data?.tenant_id || 'platform',
        actor_id: user.id, actor_name: user.full_name || 'Admin',
        verification_run_id: optionalVRunId,
      });
      if (opCreate.lock_error === 'lock_registry_uninitialized') return safeJson('lock_registry_uninitialized', 503, 'Lock registry has not been initialized. Disaster recovery initialization required.');
      if (opCreate.lock_error === 'lock_registry_conflict') return safeJson('lock_registry_conflict', 509, 'Multiple lock registries detected. Reconciliation is required.');
      if (opCreate.lock_error) return safeJson('operation_in_progress', 409, 'Another operation is already in progress for this target. Wait for it to complete or reconcile any incomplete operation.', { target_key: targetKey });
      if (!opCreate.operation_id) return safeJson('audit_failure', 500, 'Cannot revoke permission — TestLabOperation could not be created.', { error: opCreate.error });

      // STEP 1: Persist durable operation intent BEFORE mutation
      const intent = await persistOperationIntent(base44, {
        operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id, audit_tenant_id: targetUser.data?.tenant_id || 'platform',
        actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'revoke_permission', target: opCreate.record_id, reason,
        intended_state: { permission: CROSS_TENANT_AI_PERMISSION, target_email: email, target_user_id: targetUser.id, operation_id: opCreate.operation_id },
      });
      if (!intent.intent_id) return safeJson('audit_failure', 500, 'Cannot revoke permission — durable operation intent could not be persisted. No mutation has occurred.', { error: intent.error, operation_id: opCreate.operation_id });

      // STEP 2: Perform the mutation
      try {
        await base44.asServiceRole.entities.User.update(targetUser.id, { data: { ...targetUser.data, permissions: newPermissions } });
        await transitionOperation(base44, opCreate.record_id, OPERATION_LIFECYCLE_STATES.MUTATION_COMPLETED, { mutation_resource_ids: [targetUser.id] });
      } catch (mutErr) {
        await persistOperationFailure(base44, {
          operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id, audit_tenant_id: targetUser.data?.tenant_id || 'platform',
          actor_id: user.id, actor_name: user.full_name || 'Admin',
          action: 'revoke_permission', target: opCreate.record_id, reason, intent_id: intent.intent_id,
          intended_state: { permission: CROSS_TENANT_AI_PERMISSION, target_email: email }, error: mutErr.message,
        });
        return safeJson('internal_error', 500, 'Failed to revoke permission. Operation intent is persisted for recovery.', { intent_id: intent.intent_id, operation_id: opCreate.operation_id, error: mutErr.message });
      }

      // STEP 3: Persist completion evidence
      const completion = await persistOperationCompletion(base44, {
        operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id, audit_tenant_id: targetUser.data?.tenant_id || 'platform',
        actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'revoke_permission', target: opCreate.record_id, reason, intent_id: intent.intent_id,
        previous_state: { permission: CROSS_TENANT_AI_PERMISSION, granted: previousValue },
        new_state: { permission: CROSS_TENANT_AI_PERMISSION, granted: false, target_email: email },
        mutation_resource_ids: [targetUser.id],
      });

      if (!completion.persisted) {
        return Response.json({
          success: false, operation_status: 'incomplete', operation_id: opCreate.operation_id,
          intent_id: intent.intent_id, resource_id: targetUser.id,
          email, user_id: targetUser.id, permission: CROSS_TENANT_AI_PERMISSION, effective: false,
          message: 'Permission was revoked but completion evidence could not be persisted. Recovery/reconciliation is required.',
        }, { status: 500 });
      }

      return Response.json({ success: true, operation_status: 'completed', operation_id: opCreate.operation_id, email, user_id: targetUser.id, permission: CROSS_TENANT_AI_PERMISSION, effective: false, auth_refresh_required: true, intent_id: intent.intent_id, completion_audit_id: completion.completion_id, message: 'Cross-tenant AI permission revoked. The user must sign out and sign back in.' });
    }

    // ── ATTEST EMAIL DELIVERY (intent-first, persisted) ────
    if (action === 'attest_delivery') {
      const { email, check, verified } = body;
      if (!email || !isAllowlistedTestAlias(email)) return safeJson('invalid_request', 400, 'Email is not in the fixed test-identity allowlist.');
      if (!EMAIL_ATTESTATION_CHECKS.includes(check)) return safeJson('invalid_request', 400, `Invalid attestation check. Must be one of: ${EMAIL_ATTESTATION_CHECKS.join(', ')}`);

      const identity = getTestIdentity(email)!;
      const auditTenantId = identity.tenant === 'platform' ? 'platform' : (identity.tenant === 'A' ? TENANT_A_ID : (await base44.asServiceRole.entities.Tenant.filter({ test_lab_key: TENANT_B_TEST_LAB_KEY }).catch(() => []))?.[0]?.id || 'platform');
      const reason = `Attest ${check} for ${email}`;
      const targetKey = targetKeyForAttestation(email, check);

      // FAIL-CLOSED operation state lookup
      const opState = await checkOperationState(base44, TARGET_TYPES.TEST_ATTESTATION, targetKey);
      if (opState.state === OPERATION_LOOKUP_STATES.UNAVAILABLE) {
        return safeJson('operation_state_unavailable', 503, 'Cannot verify operation state — operation ledger is unavailable. Attestation blocked for safety.', { target_key: targetKey });
      }
      if (opState.state === OPERATION_LOOKUP_STATES.BLOCKED) {
        return safeJson('incomplete_operation', 409, 'An incomplete operation exists for this attestation. Recovery/reconciliation is required.', {
          unresolved_operations: opState.operations.map((o: any) => ({ operation_id: o.operation_id, action: o.action, status: o.status })),
        });
      }

      // STEP 0: Create TestLabOperation record (PENDING)
      const optionalVRunId = await getOptionalVerificationRunId(base44);
      const opCreate = await createOperation(base44, {
        action: 'attest_delivery', target_type: TARGET_TYPES.TEST_ATTESTATION, target_key: targetKey,
        tenant_id: auditTenantId, actor_id: user.id, actor_name: user.full_name || 'Admin',
        verification_run_id: optionalVRunId,
      });
      if (opCreate.lock_error === 'lock_registry_uninitialized') return safeJson('lock_registry_uninitialized', 503, 'Lock registry has not been initialized. Disaster recovery initialization required.');
      if (opCreate.lock_error === 'lock_registry_conflict') return safeJson('lock_registry_conflict', 509, 'Multiple lock registries detected. Reconciliation is required.');
      if (opCreate.lock_error) return safeJson('operation_in_progress', 409, 'Another operation is already in progress for this target. Wait for it to complete or reconcile any incomplete operation.', { target_key: targetKey });
      if (!opCreate.operation_id) return safeJson('audit_failure', 500, 'Cannot attest — TestLabOperation could not be created.', { error: opCreate.error });

      // STEP 1: Persist durable operation intent BEFORE mutation
      const intent = await persistOperationIntent(base44, {
        operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id, audit_tenant_id: auditTenantId,
        actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'attest_delivery', target: opCreate.record_id, reason,
        intended_state: { alias: email, check_key: check, verified: !!verified, operation_id: opCreate.operation_id },
      });
      if (!intent.intent_id) return safeJson('audit_failure', 500, 'Cannot attest — durable operation intent could not be persisted. No mutation has occurred.', { error: intent.error, operation_id: opCreate.operation_id });

      const now = new Date().toISOString();
      const existing = await base44.asServiceRole.entities.TestLabAttestation.filter({ alias: email, check_key: check }).catch(() => []);

      // STEP 2: Perform the mutation
      try {
        if (existing && existing.length > 0) {
          const record = existing[0];
          await base44.asServiceRole.entities.TestLabAttestation.update(record.id, {
            verified: !!verified, attested_by_id: user.id, attested_by_name: user.full_name || 'Admin',
            attested_at: now, updated_at: now, evidence_type: verified ? 'manual_verification' : 'revoked',
          });
          await transitionOperation(base44, opCreate.record_id, OPERATION_LIFECYCLE_STATES.MUTATION_COMPLETED, { mutation_resource_ids: [record.id] });
          const completion = await persistOperationCompletion(base44, {
            operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id, audit_tenant_id: auditTenantId,
            actor_id: user.id, actor_name: user.full_name || 'Admin',
            action: 'attest_delivery', target: opCreate.record_id, reason, intent_id: intent.intent_id,
            previous_state: { verified: record.verified },
            new_state: { verified: !!verified, check, alias: email }, mutation_resource_ids: [record.id],
          });
          if (!completion.persisted) {
            return Response.json({ success: false, operation_status: 'incomplete', operation_id: opCreate.operation_id, intent_id: intent.intent_id, resource_id: record.id, email, check, verified: !!verified, message: 'Attestation was updated but completion evidence could not be persisted. Recovery/reconciliation is required.' }, { status: 500 });
          }
          return Response.json({ success: true, operation_status: 'completed', operation_id: opCreate.operation_id, email, check, verified: !!verified, attested_by: user.full_name || 'Admin', attested_at: now, attestation_id: record.id, intent_id: intent.intent_id, completion_audit_id: completion.completion_id, message: 'Email delivery attestation updated.' });
        }

        const attestation = await base44.asServiceRole.entities.TestLabAttestation.create({
          tenant_id: auditTenantId, alias: email, check_key: check, verified: !!verified,
          attested_by_id: user.id, attested_by_name: user.full_name || 'Admin',
          attested_at: now, updated_at: now, evidence_type: 'manual_verification', non_production: true,
        });
        await transitionOperation(base44, opCreate.record_id, OPERATION_LIFECYCLE_STATES.MUTATION_COMPLETED, { mutation_resource_ids: [attestation?.id || ''] });
        const completion = await persistOperationCompletion(base44, {
          operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id, audit_tenant_id: auditTenantId,
          actor_id: user.id, actor_name: user.full_name || 'Admin',
          action: 'attest_delivery', target: opCreate.record_id, reason, intent_id: intent.intent_id,
          previous_state: { verified: false },
          new_state: { verified: !!verified, check, alias: email, no_private_destination: true },
          mutation_resource_ids: [attestation?.id || ''],
        });
        if (!completion.persisted) {
          return Response.json({ success: false, operation_status: 'incomplete', operation_id: opCreate.operation_id, intent_id: intent.intent_id, resource_id: attestation?.id || '', email, check, verified: !!verified, message: 'Attestation was created but completion evidence could not be persisted. Recovery/reconciliation is required.' }, { status: 500 });
        }
        return Response.json({ success: true, operation_status: 'completed', operation_id: opCreate.operation_id, email, check, verified: !!verified, attested_by: user.full_name || 'Admin', attested_at: now, attestation_id: attestation?.id || '', intent_id: intent.intent_id, completion_audit_id: completion.completion_id, message: 'Email delivery attestation recorded.' });
      } catch (mutErr) {
        await persistOperationFailure(base44, {
          operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id, audit_tenant_id: auditTenantId,
          actor_id: user.id, actor_name: user.full_name || 'Admin',
          action: 'attest_delivery', target: opCreate.record_id, reason, intent_id: intent.intent_id,
          intended_state: { alias: email, check_key: check, verified: !!verified }, error: mutErr.message,
        });
        return safeJson('internal_error', 500, 'Failed to persist attestation. Operation intent is persisted for recovery.', { intent_id: intent.intent_id, operation_id: opCreate.operation_id, error: mutErr.message });
      }
    }

    // ── CREATE TEST RUN (server-derived TTL, verification-run linked) ─
    if (action === 'create_test_run') {
      const { sandbox_tenant_id, authorised_requester_email, permitted_service_key, permitted_action_type, permitted_autonomy_level, test_tag, test_purpose } = body;
      const clientTtlSupplied = body.ttl_minutes != null;

      if (!sandbox_tenant_id) return safeJson('invalid_request', 400, 'sandbox_tenant_id is required.');
      if (!authorised_requester_email || !isAllowlistedTestAlias(authorised_requester_email)) return safeJson('invalid_request', 400, 'authorised_requester_email must be an allowlisted test alias.');
      if (!permitted_service_key) return safeJson('invalid_request', 400, 'permitted_service_key is required.');
      if (!permitted_autonomy_level) return safeJson('invalid_request', 400, 'permitted_autonomy_level is required.');
      if (!test_tag) return safeJson('invalid_request', 400, 'test_tag is required.');
      if (!test_purpose || test_purpose.length < 5) return safeJson('invalid_request', 400, 'A meaningful test_purpose is required.');

      const tenant = await base44.asServiceRole.entities.Tenant.get(sandbox_tenant_id).catch(() => null);
      if (!tenant || !tenant.is_sandbox) return safeJson('forbidden', 403, 'Test Runs can only be created for sandbox tenants.');

      // Build #28.2P-R.0R.1C-F: FAIL-CLOSED verification run state for create_test_run.
      // Does NOT use getOptionalVerificationRunId — security-sensitive operation
      // must distinguish NONE, UNAVAILABLE, and CONFLICT explicitly.
      const vrsCreate = await getVerificationRunState(base44);
      if (vrsCreate.state === VERIFICATION_RUN_LOOKUP_STATES.UNAVAILABLE) {
        return safeJson('verification_run_unavailable', 503, 'Cannot verify verification run state — database lookup failed. Test Run creation blocked for safety.');
      }
      if (vrsCreate.state === VERIFICATION_RUN_LOOKUP_STATES.CONFLICT) {
        return safeJson('verification_run_conflict', 409, 'Multiple active verification runs detected. Reconciliation is required before creating Test Runs.');
      }
      if (vrsCreate.state === VERIFICATION_RUN_LOOKUP_STATES.NONE) {
        return safeJson('no_active_verification_run', 409, 'No active verification run exists. Create and activate a verification run before creating Test Runs.');
      }
      const activeVRun = vrsCreate.run;

      const targetKey = targetKeyForTestRun(activeVRun.verification_run_id, sandbox_tenant_id, authorised_requester_email, permitted_service_key, test_tag);

      // FAIL-CLOSED operation state lookup
      const opState = await checkOperationState(base44, TARGET_TYPES.TEST_RUN, targetKey);
      if (opState.state === OPERATION_LOOKUP_STATES.UNAVAILABLE) {
        return safeJson('operation_state_unavailable', 503, 'Cannot verify operation state — operation ledger is unavailable. Test Run creation blocked for safety.', { target_key: targetKey });
      }
      if (opState.state === OPERATION_LOOKUP_STATES.BLOCKED) {
        return safeJson('incomplete_operation', 409, 'An incomplete operation exists for this test run target. Recovery/reconciliation is required.', {
          unresolved_operations: opState.operations.map((o: any) => ({ operation_id: o.operation_id, action: o.action, status: o.status })),
        });
      }

      const users = await base44.asServiceRole.entities.User.filter({ email: authorised_requester_email }).catch(() => []);
      if (!users || users.length === 0) return safeJson('not_found', 404, 'Authorised requester has not registered yet.');
      const requester = users[0];

      const serverTtl = resolveServerTtl(test_tag);
      const testRunId = `trun_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      // STEP 0: Create TestLabOperation record (PENDING)
      const opCreate = await createOperation(base44, {
        action: 'create_test_run', target_type: TARGET_TYPES.TEST_RUN, target_key: targetKey,
        tenant_id: sandbox_tenant_id, actor_id: user.id, actor_name: user.full_name || 'Admin',
        verification_run_id: activeVRun.verification_run_id,
      });
      if (opCreate.lock_error === 'lock_registry_uninitialized') return safeJson('lock_registry_uninitialized', 503, 'Lock registry has not been initialized. Disaster recovery initialization required.');
      if (opCreate.lock_error === 'lock_registry_conflict') return safeJson('lock_registry_conflict', 509, 'Multiple lock registries detected. Reconciliation is required.');
      if (opCreate.lock_error) return safeJson('operation_in_progress', 409, 'Another operation is already in progress for this target. Wait for it to complete or reconcile any incomplete operation.', { target_key: targetKey });
      if (!opCreate.operation_id) return safeJson('audit_failure', 500, 'Cannot create Test Run — TestLabOperation could not be created.', { error: opCreate.error });

      // STEP 1: Persist durable operation intent BEFORE mutation
      const intent = await persistOperationIntent(base44, {
        operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id, audit_tenant_id: sandbox_tenant_id,
        actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'create_test_run', target: opCreate.record_id, reason: `Create Test Run ${testRunId} for ${permitted_service_key}`,
        intended_state: { test_run_id: testRunId, sandbox_tenant_id, permitted_service_key, server_selected_ttl_minutes: serverTtl, test_tag, client_ttl_ignored: clientTtlSupplied, verification_run_id: activeVRun.verification_run_id, operation_id: opCreate.operation_id },
      });
      if (!intent.intent_id) return safeJson('audit_failure', 500, 'Cannot create Test Run — durable operation intent could not be persisted. No mutation has occurred.', { error: intent.error, operation_id: opCreate.operation_id });

      // STEP 2: Perform the mutation
      let testRun: any;
      try {
        testRun = await base44.asServiceRole.entities.TestRun.create({
          tenant_id: sandbox_tenant_id, test_run_id: testRunId,
          verification_run_id: activeVRun.verification_run_id,
          sandbox_tenant_id, authorised_requester_user_id: requester.id,
          authorised_requester_name: requester.full_name || authorised_requester_email,
          permitted_service_key, permitted_action_type: permitted_action_type || 'require_approval',
          permitted_autonomy_level, server_selected_ttl_minutes: serverTtl,
          test_tag, test_purpose,
          created_by_operator_id: user.id, created_by_operator_name: user.full_name || 'Admin',
          status: 'active', max_uses: 1, current_uses: 0, expires_at: expiresAt,
          non_production: true,
        });
        await transitionOperation(base44, opCreate.record_id, OPERATION_LIFECYCLE_STATES.MUTATION_COMPLETED, { mutation_resource_ids: [testRun?.id || testRunId] });
      } catch (mutErr) {
        await persistOperationFailure(base44, {
          operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id, audit_tenant_id: sandbox_tenant_id,
          actor_id: user.id, actor_name: user.full_name || 'Admin',
          action: 'create_test_run', target: opCreate.record_id, reason: `Create Test Run ${testRunId}`, intent_id: intent.intent_id,
          intended_state: { test_run_id: testRunId, server_selected_ttl_minutes: serverTtl }, error: mutErr.message,
        });
        return safeJson('internal_error', 500, 'Failed to create Test Run. Operation intent is persisted for recovery.', { intent_id: intent.intent_id, operation_id: opCreate.operation_id, error: mutErr.message });
      }

      // STEP 3: Persist completion evidence
      const completion = await persistOperationCompletion(base44, {
        operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id, audit_tenant_id: sandbox_tenant_id,
        actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'create_test_run', target: opCreate.record_id, reason: `Create Test Run ${testRunId}`, intent_id: intent.intent_id,
        previous_state: null,
        new_state: { test_run_id: testRunId, sandbox_tenant_id, permitted_service_key, server_selected_ttl_minutes: serverTtl, test_tag, client_ttl_ignored: clientTtlSupplied, verification_run_id: activeVRun.verification_run_id },
        mutation_resource_ids: [testRun?.id || testRunId],
      });

      if (!completion.persisted) {
        return Response.json({
          success: false, operation_status: 'incomplete', operation_id: opCreate.operation_id,
          intent_id: intent.intent_id, resource_id: testRunId,
          test_run_id: testRunId, test_run_record_id: testRun?.id,
          sandbox_tenant_id, permitted_service_key,
          server_selected_ttl_minutes: serverTtl, server_ttl_source: 'SERVER_TTL_POLICY',
          client_ttl_ignored: clientTtlSupplied, expires_at: expiresAt,
          verification_run_id: activeVRun.verification_run_id,
          message: 'Test Run was created but completion evidence could not be persisted. Recovery/reconciliation is required. The Test Run may not be usable until resolved.',
        }, { status: 500 });
      }

      return Response.json({
        success: true, operation_status: 'completed', operation_id: opCreate.operation_id,
        test_run_id: testRunId, test_run_record_id: testRun?.id,
        verification_run_id: activeVRun.verification_run_id,
        sandbox_tenant_id, authorised_requester_user_id: requester.id, permitted_service_key,
        server_selected_ttl_minutes: serverTtl, server_ttl_source: 'SERVER_TTL_POLICY',
        client_ttl_ignored: clientTtlSupplied,
        expires_at: expiresAt, intent_id: intent.intent_id, completion_audit_id: completion.completion_id,
        message: 'Test Run created and linked to the active verification run. Only the authorised requester can use it for the permitted service.',
      });
    }

    // ── READINESS STATUS (current-verification-run scoped) ──
    if (action === 'readiness_status') {
      let tenantA: any = null;
      try { tenantA = await base44.asServiceRole.entities.Tenant.get(TENANT_A_ID); } catch {}

      const tenantBResults = await base44.asServiceRole.entities.Tenant.filter({ test_lab_key: TENANT_B_TEST_LAB_KEY }).catch(() => []);
      const tenantB = tenantBResults?.[0] || null;

      const allUsers = await base44.asServiceRole.entities.User.list().catch(() => []);
      const testUsers = (allUsers || []).filter((u: any) => isAllowlistedTestAlias(u.email));

      const employeesA = await base44.asServiceRole.entities.Employee.filter({ tenant_id: TENANT_A_ID }).catch(() => []);
      const tenantBId = tenantB?.id;
      const employeesB = tenantBId ? await base44.asServiceRole.entities.Employee.filter({ tenant_id: tenantBId }).catch(() => []) : [];

      const attestations = await base44.asServiceRole.entities.TestLabAttestation.list().catch(() => []);

      // ── BUILD #28.2P-R.0R.1C: FAIL-CLOSED VERIFICATION RUN STATE ──
      const vrs = await getVerificationRunState(base44);
      const activeVRun = vrs.state === VERIFICATION_RUN_LOOKUP_STATES.ACTIVE ? vrs.run : null;
      const activeVRunId = activeVRun?.verification_run_id || null;
      const vrunLookupState = vrs.state; // NONE, ACTIVE, UNAVAILABLE, CONFLICT

      const sandboxTenantIds: string[] = [TENANT_A_ID];
      if (tenantBId) sandboxTenantIds.push(tenantBId);

      // test_tagging_ready: requires EXACT match against active verification run
      let verifiedTaggedApproval: any = null;
      if (activeVRunId) {
        const taggedApprovals = await base44.asServiceRole.entities.AIApproval.filter({
          is_test: true,
          tenant_id: { $in: sandboxTenantIds },
        }).catch(() => []);
        verifiedTaggedApproval = (taggedApprovals || []).find((a: any) =>
          a.test_run_id && a.test_tag && a.is_test === true && a.non_production === true &&
          a.test_run_id && a.test_tag
        );
      }

      // short_ttl_ready: requires EXACT match against active verification run
      let verifiedConsumedRun: any = null;
      if (activeVRunId) {
        const consumedTestRuns = await base44.asServiceRole.entities.TestRun.filter({
          status: 'consumed',
          sandbox_tenant_id: { $in: sandboxTenantIds },
        }).catch(() => []);
        verifiedConsumedRun = (consumedTestRuns || []).find((r: any) =>
          r.consumption_token &&
          r.server_selected_ttl_minutes >= 1 && r.server_selected_ttl_minutes <= 10 &&
          r.verification_run_id === activeVRunId
        );
      }

      // ── UNRESOLVED INCOMPLETE OPERATIONS (from TestLabOperation ledger) ──
      let allUnresolved: any[] = [];
      let unresolvedLookupAvailable = true;
      try {
        const incompleteOps = await base44.asServiceRole.entities.TestLabOperation.filter({
          status: { $in: BLOCKING_OPERATION_STATUSES },
        }, '-created_date', 50);
        allUnresolved = (incompleteOps || []).map((op: any) => ({
          operation_id: op.operation_id,
          action: op.action,
          target_type: op.target_type,
          target_key: op.target_key,
          status: op.status,
          created_date: op.created_date,
          failure_summary: op.failure_summary,
        }));
      } catch {
        unresolvedLookupAvailable = false;
      }

      const identities = TEST_IDENTITIES.map(identity => {
        const userRecord = testUsers.find((u: any) => u.email === identity.email);
        const employee = [...(employeesA || []), ...(employeesB || [])].find((e: any) => e.email === identity.email);

        let state = 'ALIAS_CONFIGURED';
        if (employee) state = 'MEMBERSHIP_PREPARED';
        if (userRecord) {
          state = userRecord.is_verified ? 'EMAIL_VERIFIED' : 'EMAIL_VERIFICATION_REQUIRED';
          if (employee?.user_id === userRecord.id) state = 'IDENTITY_LINKED';
        }

        const permissions = (userRecord?.data?.permissions || []) as string[];
        const hasCrossTenant = permissions.includes(CROSS_TENANT_AI_PERMISSION);

        const aliasAttestations = (attestations || []).filter((a: any) => a.alias === identity.email);
        const allChecksVerified = EMAIL_ATTESTATION_CHECKS.every(check =>
          aliasAttestations.some((a: any) => a.check_key === check && a.verified)
        );

        return {
          email: identity.email, label: identity.label, tenant: identity.tenant,
          user_role: identity.userRole, employee_role: identity.employeeRole,
          readiness_state: state,
          user_registered: !!userRecord,
          email_verified: userRecord?.is_verified || false,
          membership_linked: !!(employee && userRecord && employee.user_id === userRecord.id),
          cross_tenant_permission: identity.requiresCrossTenantPermission ? hasCrossTenant : null,
          expected_cross_tenant: identity.requiresCrossTenantPermission,
          delivery_attested: allChecksVerified,
        };
      });

      const requester = identities.find(i => i.email === 'test.requester.a@orbitan.net');
      const approver = identities.find(i => i.email === 'test.approver.a@orbitan.net');
      const workerA = identities.find(i => i.email === 'test.worker.a@orbitan.net');
      const platformAllowed = identities.find(i => i.email === 'test.platform.allowed@orbitan.net');
      const platformDenied = identities.find(i => i.email === 'test.platform.denied@orbitan.net');
      const adminB = identities.find(i => i.email === 'test.admin.b@orbitan.net');
      const workerB = identities.find(i => i.email === 'test.worker.b@orbitan.net');

      const tenantBHierarchyValid = !!(tenantB && tenantB.is_sandbox && tenantB.test_lab_key);
      let tenantBCompany = null, tenantBOutlet = null;
      if (tenantBId) {
        tenantBCompany = (await base44.asServiceRole.entities.Company.filter({ tenant_id: tenantBId }).catch(() => []))?.[0];
        tenantBOutlet = (await base44.asServiceRole.entities.Outlet.filter({ tenant_id: tenantBId }).catch(() => []))?.[0];
      }
      const tenantBIsolationReady = !!(tenantBHierarchyValid && tenantBCompany && tenantBOutlet && adminB?.membership_linked && workerB?.membership_linked);

      return Response.json({
        success: true,
        active_verification_run: activeVRun ? {
          verification_run_id: activeVRun.verification_run_id,
          status: activeVRun.status,
          created_at: activeVRun.created_at,
          started_at: activeVRun.started_at,
          test_purpose: activeVRun.test_purpose,
        } : null,
        tenants: {
          A: tenantA ? { id: tenantA.id, name: tenantA.name, is_sandbox: tenantA.is_sandbox, status: tenantA.status, exists: true } : { exists: false },
          B: tenantB ? { id: tenantB.id, name: tenantB.name, is_sandbox: tenantB.is_sandbox, test_lab_key: tenantB.test_lab_key, status: tenantB.status, exists: true, company_id: tenantBCompany?.id, outlet_id: tenantBOutlet?.id } : { exists: false },
        },
        identities,
        test_capability: {
          test_tagging_ready: !!verifiedTaggedApproval,
          test_tagging_evidence: verifiedTaggedApproval ? {
            approval_id: verifiedTaggedApproval.id,
            test_run_id: verifiedTaggedApproval.test_run_id,
            test_tag: verifiedTaggedApproval.test_tag,
            is_test: verifiedTaggedApproval.is_test,
            non_production: verifiedTaggedApproval.non_production,
            tenant_id: verifiedTaggedApproval.tenant_id,
          } : null,
          short_ttl_ready: !!verifiedConsumedRun,
          short_ttl_evidence: verifiedConsumedRun ? {
            test_run_id: verifiedConsumedRun.test_run_id,
            verification_run_id: verifiedConsumedRun.verification_run_id,
            server_selected_ttl_minutes: verifiedConsumedRun.server_selected_ttl_minutes,
            consumption_token: verifiedConsumedRun.consumption_token,
            status: verifiedConsumedRun.status,
            sandbox_tenant_id: verifiedConsumedRun.sandbox_tenant_id,
          } : null,
          independent_approver_ready: !!(requester?.user_registered && approver?.user_registered && requester?.email_verified && approver?.email_verified && requester?.membership_linked && approver?.membership_linked && requester?.email !== approver?.email),
          worker_isolation_ready: !!(workerA?.user_registered && workerA?.user_role === 'user' && workerA?.employee_role === 'worker' && workerA?.membership_linked),
          tenant_b_isolation_ready: tenantBIsolationReady,
          platform_permission_distinction_ready: !!(platformAllowed?.user_registered && platformDenied?.user_registered && platformAllowed?.cross_tenant_permission === true && platformDenied?.cross_tenant_permission === false),
          readiness_scope: activeVRunId ? 'current_verification_run' : 'no_active_run',
          verification_run_lookup_state: vrunLookupState,
          readiness_unavailable: vrunLookupState === VERIFICATION_RUN_LOOKUP_STATES.UNAVAILABLE,
          readiness_conflict: vrunLookupState === VERIFICATION_RUN_LOOKUP_STATES.CONFLICT,
        },
        automated_governance_readiness: await computeAutomatedReadiness(base44),
        unresolved_operations: allUnresolved,
        has_unresolved_operations: allUnresolved.length > 0,
        unresolved_lookup_available: unresolvedLookupAvailable,
      });
    }

    // ── RESET TEST DATA (intent-first, fail-closed, NO swallowing) ───
    if (action === 'reset_test_data') {
      const { test_run_id, tenant_id } = body;
      if (!test_run_id || !tenant_id) return safeJson('invalid_request', 400, 'test_run_id and tenant_id are required.');
      const reason = body.reason || `Reset test data for run ${test_run_id}`;
      if (reason.length < 5) return safeJson('invalid_request', 400, 'A meaningful reason is required.');

      const tenant = await base44.asServiceRole.entities.Tenant.get(tenant_id).catch(() => null);
      if (!tenant || !tenant.is_sandbox) return safeJson('forbidden', 403, 'Test data reset is only allowed for sandbox tenants.');

      const targetKey = targetKeyForReset(tenant_id, test_run_id);

      // FAIL-CLOSED operation state lookup
      const opState = await checkOperationState(base44, TARGET_TYPES.TEST_RESET, targetKey);
      if (opState.state === OPERATION_LOOKUP_STATES.UNAVAILABLE) {
        return safeJson('operation_state_unavailable', 503, 'Cannot verify operation state — operation ledger is unavailable. Reset blocked for safety.', { target_key: targetKey });
      }
      if (opState.state === OPERATION_LOOKUP_STATES.BLOCKED) {
        return safeJson('incomplete_operation', 409, 'An incomplete operation exists for this reset target. Recovery/reconciliation is required.', {
          unresolved_operations: opState.operations.map((o: any) => ({ operation_id: o.operation_id, action: o.action, status: o.status })),
        });
      }

      // STEP 0: Create TestLabOperation record (PENDING)
      const optionalVRunId = await getOptionalVerificationRunId(base44);
      const opCreate = await createOperation(base44, {
        action: 'reset_test_data', target_type: TARGET_TYPES.TEST_RESET, target_key: targetKey,
        tenant_id, actor_id: user.id, actor_name: user.full_name || 'Admin',
        verification_run_id: optionalVRunId,
      });
      if (opCreate.lock_error === 'lock_registry_uninitialized') return safeJson('lock_registry_uninitialized', 503, 'Lock registry has not been initialized. Disaster recovery initialization required.');
      if (opCreate.lock_error === 'lock_registry_conflict') return safeJson('lock_registry_conflict', 509, 'Multiple lock registries detected. Reconciliation is required.');
      if (opCreate.lock_error) return safeJson('operation_in_progress', 409, 'Another operation is already in progress for this target. Wait for it to complete or reconcile any incomplete operation.', { target_key: targetKey });
      if (!opCreate.operation_id) return safeJson('audit_failure', 500, 'Cannot reset — TestLabOperation could not be created.', { error: opCreate.error });

      // STEP 1: Persist durable operation intent BEFORE any deletion
      const intent = await persistOperationIntent(base44, {
        operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id, audit_tenant_id: tenant_id,
        actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'reset_test_data', target: opCreate.record_id, reason,
        intended_state: { test_run_id, tenant_id, scope: 'mutable_tagged_records', operation_id: opCreate.operation_id },
      });
      if (!intent.intent_id) return safeJson('audit_failure', 500, 'Cannot reset — durable operation intent could not be persisted. No data has been deleted.', { error: intent.error, operation_id: opCreate.operation_id });

      let attemptedApprovals = 0, deletedApprovals = 0;
      let attemptedInbox = 0, deletedInbox = 0;
      let failedRecordIds: string[] = [];
      let approvalsQueryError: string | null = null;
      let inboxQueryError: string | null = null;

      // ── APPROVALS PHASE ──
      try {
        const approvals = await base44.asServiceRole.entities.AIApproval.filter({ tenant_id, test_run_id });
        attemptedApprovals = approvals?.length || 0;
        for (const approval of approvals || []) {
          if (approval.status === 'pending') {
            try {
              await base44.asServiceRole.entities.AIApproval.delete(approval.id);
              deletedApprovals++;
            } catch (err) {
              failedRecordIds.push(`approval:${approval.id}`);
            }
          }
        }
      } catch (err) {
        approvalsQueryError = err.message;
      }

      // ── INBOX PHASE ──
      try {
        const inboxItems = await base44.asServiceRole.entities.OrbitInbox.filter({ tenant_id });
        attemptedInbox = (inboxItems || []).filter((i: any) => i.metadata?.test_run_id === test_run_id).length;
        for (const item of inboxItems || []) {
          if (item.metadata?.test_run_id === test_run_id) {
            try {
              await base44.asServiceRole.entities.OrbitInbox.delete(item.id);
              deletedInbox++;
            } catch (err) {
              failedRecordIds.push(`inbox:${item.id}`);
            }
          }
        }
      } catch (err) {
        inboxQueryError = err.message;
      }

      // ── DETERMINE OVERALL STATUS ──
      let overallStatus: 'success' | 'partial' | 'incomplete' | 'failed';
      const hasQueryErrors = !!(approvalsQueryError || inboxQueryError);
      const hasDeleteFailures = failedRecordIds.length > 0;

      if (hasQueryErrors && hasDeleteFailures) {
        overallStatus = 'failed';
      } else if (hasQueryErrors) {
        overallStatus = 'incomplete';
      } else if (hasDeleteFailures) {
        overallStatus = 'partial';
      } else {
        overallStatus = 'success';
      }

      // Transition to MUTATION_COMPLETED
      await transitionOperation(base44, opCreate.record_id, OPERATION_LIFECYCLE_STATES.MUTATION_COMPLETED, {
        mutation_resource_ids: [`approvals:${deletedApprovals}`, `inbox:${deletedInbox}`],
      });

      // STEP 3: Persist completion evidence
      const completion = await persistOperationCompletion(base44, {
        operation_record_id: opCreate.record_id, registry_id: opCreate.registry_id, operation_id: opCreate.operation_id, audit_tenant_id: tenant_id,
        actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'reset_test_data', target: opCreate.record_id, reason, intent_id: intent.intent_id,
        previous_state: { test_run_id },
        new_state: {
          attempted_approvals: attemptedApprovals, deleted_approvals: deletedApprovals,
          attempted_inbox: attemptedInbox, deleted_inbox: deletedInbox,
          failed_record_ids: failedRecordIds, immutable_audit_retained: true,
          approvals_query_error: approvalsQueryError,
          inbox_query_error: inboxQueryError,
          overall_status: overallStatus,
        },
        test_run_id,
      });

      if (!completion.persisted) {
        return Response.json({
          success: false, operation_status: 'incomplete', operation_id: opCreate.operation_id,
          intent_id: intent.intent_id, resource_id: tenant_id,
          attempted: { approvals: attemptedApprovals, inbox: attemptedInbox },
          deleted: { approvals: deletedApprovals, inbox: deletedInbox },
          retained: { immutable_audit: true },
          failed_record_ids: failedRecordIds,
          approvals_query_error: approvalsQueryError,
          inbox_query_error: inboxQueryError,
          overall_status: 'incomplete',
          message: 'Reset mutation completed but completion evidence could not be persisted. Recovery/reconciliation is required. Counts may be inaccurate.',
        }, { status: 500 });
      }

      const success = overallStatus === 'success';

      return Response.json({
        success,
        operation_status: overallStatus,
        operation_id: opCreate.operation_id,
        attempted: { approvals: attemptedApprovals, inbox: attemptedInbox },
        deleted: { approvals: deletedApprovals, inbox: deletedInbox },
        retained: { immutable_audit: true },
        failed_record_ids: failedRecordIds,
        approvals_query_error: approvalsQueryError,
        inbox_query_error: inboxQueryError,
        overall_status: overallStatus,
        intent_id: intent.intent_id,
        completion_audit_id: completion.completion_id,
        message: overallStatus === 'success'
          ? 'Mutable tagged test data reset. Immutable AIAuditEvent records retained per policy.'
          : overallStatus === 'partial'
            ? 'Reset completed with partial failures. Some records could not be deleted. See failed_record_ids.'
            : overallStatus === 'incomplete'
              ? 'Reset incomplete — a query phase failed. Not all relevant records may have been processed. See approvals_query_error/inbox_query_error.'
              : 'Reset failed — query errors and delete failures occurred. See error details.',
      });
    }

    // ── RUN SAFE VERIFICATION MATRIX (Build #28.2P-R.0R.3) ──────
    if (action === 'run_safe_verification_matrix') {
      const { scenario_id } = body;

      // Fail-closed verification run state check
      const vrs = await getVerificationRunState(base44);
      if (vrs.state === VERIFICATION_RUN_LOOKUP_STATES.UNAVAILABLE) {
        return safeJson('verification_run_unavailable', 503, 'Cannot verify verification run state — database lookup failed. Matrix execution blocked for safety.');
      }
      if (vrs.state === VERIFICATION_RUN_LOOKUP_STATES.CONFLICT) {
        return safeJson('verification_run_conflict', 409, 'Multiple active verification runs detected. Reconciliation is required.');
      }
      if (vrs.state === VERIFICATION_RUN_LOOKUP_STATES.NONE) {
        return safeJson('no_active_verification_run', 409, 'No active verification run exists. Create and activate an automated_policy_matrix verification run first.');
      }

      const activeRun = vrs.run;

      // Validate campaign type — MUST be exactly automated_policy_matrix.
      // Rejects null, undefined, manual_live_identity, auth_canary, and any unknown value.
      // Build #28.2P-R.0R.3A — fail-closed: no automatic conversion of legacy runs.
      if (activeRun.campaign_type !== VERIFICATION_RUN_CAMPAIGN_TYPES.AUTOMATED_POLICY_MATRIX) {
        return safeJson('invalid_campaign_type', 409, 'Active verification run is not an automated_policy_matrix campaign. The matrix may only run against an explicitly created automated_policy_matrix VerificationRun.', {
          current_campaign_type: activeRun.campaign_type || null,
        });
      }

      // Run the matrix — the orchestrator handles TestLabOperation lifecycle
      const matrixResult = await runSafeVerificationMatrix(base44, user, {
        verificationRunId: activeRun.verification_run_id,
        scenarioId: scenario_id || null,
      });

      if (matrixResult.success === false) {
        return Response.json(matrixResult, { status: matrixResult.safe_error_code === 'invalid_test_scenario' ? 400 : 500 });
      }

      return Response.json(matrixResult);
    }

    // ── GET MATRIX RESULTS (Build #28.2P-R.0R.3) ───────────────
    if (action === 'get_matrix_results') {
      // Build #28.2P-R.0R.3A — supports both ACTIVE and latest COMPLETED
      // automated_policy_matrix runs. Never selects manual/auth-canary runs.
      const requestedVRunId = body.verification_run_id || null;
      let targetRun: any = null;

      if (requestedVRunId) {
        // Selector mode — lookup only, does not provide authority
        const selectorRuns = await base44.asServiceRole.entities.VerificationRun.filter({
          verification_run_id: requestedVRunId,
        }).catch(() => []);
        if (!selectorRuns || selectorRuns.length === 0) {
          return Response.json({ success: false, safe_error_code: 'not_found', error: 'Verification run not found.' }, { status: 404 });
        }
        const run = selectorRuns[0];
        if (run.campaign_type !== VERIFICATION_RUN_CAMPAIGN_TYPES.AUTOMATED_POLICY_MATRIX) {
          return Response.json({ success: false, safe_error_code: 'invalid_campaign_type', error: 'Selector may only target automated_policy_matrix runs.' }, { status: 400 });
        }
        // Build #28.2P-R.0R.3A — non-production guard: production records are forbidden
        if (run.non_production !== true) {
          return Response.json({ success: false, safe_error_code: 'production_record_forbidden', error: 'Selector may only target non-production verification runs.' }, { status: 403 });
        }
        targetRun = run;
      } else {
        // Default: try ACTIVE automated_policy_matrix first
        const vrs = await getVerificationRunState(base44);
        if (vrs.state === VERIFICATION_RUN_LOOKUP_STATES.ACTIVE && vrs.run.campaign_type === VERIFICATION_RUN_CAMPAIGN_TYPES.AUTOMATED_POLICY_MATRIX) {
          targetRun = vrs.run;
        }
        // If no active automated run, try latest COMPLETED automated run
        // Build #28.2P-R.0R.3A — must be non_production=true AND current matrix_version
        if (!targetRun) {
          const completedRuns = await base44.asServiceRole.entities.VerificationRun.filter({
            campaign_type: VERIFICATION_RUN_CAMPAIGN_TYPES.AUTOMATED_POLICY_MATRIX,
            status: VERIFICATION_RUN_STATUSES.COMPLETED,
          }, '-completed_at', 10).catch(() => []);
          if (completedRuns && completedRuns.length > 0) {
            const currentVersionNonProd = completedRuns.filter((r: any) =>
              r.matrix_version === MATRIX_VERSION && r.non_production === true
            );
            targetRun = currentVersionNonProd[0] || null;
          }
        }
      }

      if (!targetRun) {
        return Response.json({ success: true, scenarios: [], message: 'No automated_policy_matrix verification run found (active or completed).' });
      }
      const activeVRunId = targetRun.verification_run_id;
      const results = await base44.asServiceRole.entities.TestLabVerificationResult.filter({
        verification_run_id: activeVRunId,
      }, '-completed_at', 200).catch(() => []);
      const passCount = (results || []).filter((r: any) => r.result === VERIFICATION_RESULT_STATUSES.PASS).length;
      const failCount = (results || []).filter((r: any) => r.result === VERIFICATION_RESULT_STATUSES.FAIL).length;
      const blockedCount = (results || []).filter((r: any) => r.result === VERIFICATION_RESULT_STATUSES.BLOCKED).length;
      const unverifiedCount = (results || []).filter((r: any) => r.result === VERIFICATION_RESULT_STATUSES.UNVERIFIED).length;
      return Response.json({
        success: true,
        verification_run_id: activeVRunId,
        matrix_version: MATRIX_VERSION,
        total_scenarios: (results || []).length,
        pass_count: passCount,
        fail_count: failCount,
        blocked_count: blockedCount,
        unverified_count: unverifiedCount,
        scenarios: (results || []).map((r: any) => ({
          scenario_id: r.scenario_id, matrix_type: r.matrix_type, persona_key: r.persona_key,
          source_tenant_id: r.source_tenant_id, target_tenant_id: r.target_tenant_id,
          operation: r.operation, proof_class: r.proof_class,
          expected_outcome: r.expected_outcome, actual_outcome: r.actual_outcome,
          result: r.result, reason_code: r.reason_code, reason_detail: r.reason_detail,
        })),
      });
    }

    return safeJson('invalid_request', 400, `Unknown action: ${action}`);
  } catch (error) {
    return safeJson('internal_error', 500, 'An unexpected error occurred.');
  }
}