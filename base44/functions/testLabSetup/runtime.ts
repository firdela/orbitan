// ============================================================
// ORBITAN TEST LAB — Runtime Lock & VerificationRun Helpers
// Build #28.2P-R.0R.1C-F — Extracted from entry.ts for maintainability.
//
// Contains: lock registry management, atomic CAS lock acquisition,
// lock release with read-back verification, verification run state
// lookup, operation ledger lifecycle, and the one-time singleton
// initialization + lock probe for CAS runtime proof.
//
// NO behaviour change from the inline implementations — pure extraction.
// ============================================================

import {
  OPERATION_LIFECYCLE_STATES, OPERATION_LOOKUP_STATES,
  BLOCKING_OPERATION_STATUSES,
  isBlockingOperationStatus,
  VERIFICATION_RUN_STATUSES, VERIFICATION_RUN_LOOKUP_STATES,
  lockKeyForTarget,
  generateOperationId,
} from '../../shared/test-lab-config.ts';

// ── CONSTANTS ──────────────────────────────────────────────────
export const LOCK_REGISTRY_KEY = 'test_lab_global';

// ── LOOKUP-ONLY LOCK REGISTRY (Build #28.2P-R.0R.1C-F) ────────
// Normal runtime MUST NOT lazily create another registry.
// The singleton is provisioned once through initializeLockRegistry,
// then this function is lookup-only forever.
//   0 registries → uninitialized (FAIL CLOSED)
//   1 registry   → use it
//  >1 registries → conflict (FAIL CLOSED)
export async function ensureLockRegistry(base44: any): Promise<{
  registry_id?: string;
  conflict?: boolean;
  uninitialized?: boolean;
  error?: string;
}> {
  try {
    const existing = await base44.asServiceRole.entities.TestLabLockRegistry.filter(
      { registry_key: LOCK_REGISTRY_KEY }, '-created_date', 10
    );
    if (!existing || existing.length === 0) {
      return { uninitialized: true };
    }
    if (existing.length === 1) return { registry_id: existing[0].id };
    return { conflict: true };
  } catch (err) {
    return { error: err.message };
  }
}

// ── ONE-TIME SINGLETON INITIALIZATION ──────────────────────────
// Provisions the canonical TestLabLockRegistry singleton.
// After initialization, ensureLockRegistry is lookup-only.
// If more than one already exists, does NOT delete blindly — returns conflict.
export async function initializeLockRegistry(base44: any): Promise<{
  registry_id?: string;
  created?: boolean;
  count_before?: number;
  count_after?: number;
  conflict?: boolean;
  error?: string;
}> {
  try {
    const existing = await base44.asServiceRole.entities.TestLabLockRegistry.filter(
      { registry_key: LOCK_REGISTRY_KEY }, '-created_date', 10
    );
    const countBefore = existing?.length || 0;

    if (countBefore === 1) {
      return { registry_id: existing[0].id, created: false, count_before: countBefore, count_after: countBefore };
    }
    if (countBefore > 1) {
      return { conflict: true, count_before: countBefore };
    }

    // Zero registries — create the singleton
    const record = await base44.asServiceRole.entities.TestLabLockRegistry.create({
      registry_key: LOCK_REGISTRY_KEY,
      active_locks: [],
      non_production: true,
    });

    // Verify exactly one exists now
    const after = await base44.asServiceRole.entities.TestLabLockRegistry.filter(
      { registry_key: LOCK_REGISTRY_KEY }, '-created_date', 10
    );
    const countAfter = after?.length || 0;

    if (countAfter !== 1) {
      return {
        conflict: countAfter > 1,
        error: countAfter === 0 ? 'Registry creation returned empty ID' : 'Multiple registries detected after creation',
        count_before: countBefore,
        count_after: countAfter,
      };
    }

    return { registry_id: record?.id || after[0].id, created: true, count_before: countBefore, count_after: countAfter };
  } catch (err) {
    return { error: err.message };
  }
}

// ── ATOMIC CAS LOCK ACQUISITION ────────────────────────────────
// Uses MongoDB's atomic single-document updateMany:
//   filter: { id, 'active_locks.lock_key': { $ne: lockKey } }
//   update: { $push: { active_locks: { lock_key, operation_id, ... } } }
// Read-back verification confirms which operation_id acquired the lock.
export async function acquireOperationLock(
  base44: any, registryId: string, lockKey: string, operationId: string,
  targetType: string, targetKey: string
): Promise<{ acquired: boolean; error?: string }> {
  try {
    await base44.asServiceRole.entities.TestLabLockRegistry.updateMany(
      { id: registryId, 'active_locks.lock_key': { $ne: lockKey } },
      { $push: { active_locks: { lock_key: lockKey, operation_id: operationId, acquired_at: new Date().toISOString(), target_type: targetType, target_key: targetKey } } }
    );
    // Read back to verify acquisition
    const registry = await base44.asServiceRole.entities.TestLabLockRegistry.get(registryId);
    const myLock = (registry?.active_locks || []).find((l: any) => l.lock_key === lockKey);
    if (myLock?.operation_id === operationId) return { acquired: true };
    return { acquired: false };
  } catch (err) {
    return { acquired: false, error: err.message };
  }
}

// ── LOCK RELEASE WITH READ-BACK VERIFICATION (1C-F) ───────────
// Pulls by operation_id (ownership-based). After release, reads back
// the registry and confirms the lock is absent. If verification fails,
// returns verified=false so callers can surface a degraded state.
export async function releaseOperationLock(
  base44: any, registryId: string, operationId: string
): Promise<{ released: boolean; verified: boolean; error?: string }> {
  try {
    await base44.asServiceRole.entities.TestLabLockRegistry.updateMany(
      { id: registryId },
      { $pull: { active_locks: { operation_id: operationId } } }
    );
    // Read-back verification
    const registry = await base44.asServiceRole.entities.TestLabLockRegistry.get(registryId);
    const stillPresent = (registry?.active_locks || []).some((l: any) => l.operation_id === operationId);
    if (stillPresent) {
      return { released: false, verified: false, error: 'Lock release could not be verified — lock still present after release attempt' };
    }
    return { released: true, verified: true };
  } catch (err) {
    return { released: false, verified: false, error: err.message };
  }
}

// ── FAIL-CLOSED VERIFICATION RUN STATE (1C) ───────────────────
// Distinguishes NONE, ACTIVE, UNAVAILABLE, CONFLICT.
// UNAVAILABLE and CONFLICT MUST fail closed.
export async function getVerificationRunState(base44: any): Promise<{
  state: string;
  run?: any;
  runs?: any[];
  error?: string;
}> {
  try {
    const runs = await base44.asServiceRole.entities.VerificationRun.filter({
      status: VERIFICATION_RUN_STATUSES.ACTIVE,
    }, '-created_date', 10);
    if (!runs || runs.length === 0) return { state: VERIFICATION_RUN_LOOKUP_STATES.NONE };
    if (runs.length === 1) return { state: VERIFICATION_RUN_LOOKUP_STATES.ACTIVE, run: runs[0] };
    return { state: VERIFICATION_RUN_LOOKUP_STATES.CONFLICT, runs };
  } catch (err) {
    return { state: VERIFICATION_RUN_LOOKUP_STATES.UNAVAILABLE, error: err.message };
  }
}

// For OPTIONAL verification_run_id metadata ONLY. Security-sensitive
// operations (create_test_run) MUST use getVerificationRunState()
// directly with explicit state handling. This helper intentionally
// returns null on UNAVAILABLE/CONFLICT — acceptable for optional audit
// metadata, NOT for authority decisions.
export async function getOptionalVerificationRunId(base44: any): Promise<string | null> {
  const vrs = await getVerificationRunState(base44);
  if (vrs.state === VERIFICATION_RUN_LOOKUP_STATES.ACTIVE) return vrs.run.verification_run_id;
  return null;
}

// ── FAIL-CLOSED OPERATION STATE LOOKUP (1C) ───────────────────
// Returns CLEAR, BLOCKED, or UNAVAILABLE.
// UNAVAILABLE MUST fail closed — the caller returns 503.
export async function checkOperationState(
  base44: any, targetType: string, targetKey: string
): Promise<{ state: string; operations: any[]; error?: string }> {
  try {
    const operations = await base44.asServiceRole.entities.TestLabOperation.filter({
      target_type: targetType,
      target_key: targetKey,
      status: { $in: BLOCKING_OPERATION_STATUSES },
    }, '-created_date', 20);

    const blocking = (operations || []).filter((op: any) => isBlockingOperationStatus(op.status));

    if (blocking.length > 0) {
      return { state: OPERATION_LOOKUP_STATES.BLOCKED, operations: blocking };
    }
    return { state: OPERATION_LOOKUP_STATES.CLEAR, operations: [] };
  } catch (err) {
    return { state: OPERATION_LOOKUP_STATES.UNAVAILABLE, operations: [], error: err.message };
  }
}

// ── TESTLABOPERATION LEDGER ────────────────────────────────────
// Creates a PENDING TestLabOperation record. The operation_id is
// server-generated, immutable, and correlates every lifecycle stage.
// Acquires the atomic lock BEFORE creating the record.
export async function createOperation(base44: any, params: {
  action: string;
  target_type: string;
  target_key: string;
  tenant_id: string;
  actor_id: string;
  actor_name: string;
  verification_run_id?: string;
  lock_key_override?: string;
}): Promise<{ operation_id: string; record_id: string; registry_id: string; error?: string; lock_error?: string }> {
  // Track acquired lock state for cleanup on failure (Build #28.2P-R.0R.1C-F)
  let acquiredRegistryId: string | null = null;
  let acquiredOperationId: string | null = null;
  try {
    // 1. Ensure lock registry exists (LOOKUP-ONLY)
    const registry = await ensureLockRegistry(base44);
    if (registry.uninitialized) return { operation_id: '', record_id: '', registry_id: '', error: 'lock_registry_uninitialized', lock_error: 'lock_registry_uninitialized' };
    if (registry.error) return { operation_id: '', record_id: '', registry_id: '', error: `Lock registry unavailable: ${registry.error}` };
    if (registry.conflict) return { operation_id: '', record_id: '', registry_id: '', error: 'Lock registry conflict — multiple registries exist', lock_error: 'lock_registry_conflict' };

    // 2. Generate operation_id
    const operationId = generateOperationId();

    // 3. Acquire atomic lock
    const lockKey = params.lock_key_override || lockKeyForTarget(params.target_type, params.target_key);
    const lockResult = await acquireOperationLock(base44, registry.registry_id!, lockKey, operationId, params.target_type, params.target_key);
    if (!lockResult.acquired) {
      return { operation_id: '', record_id: '', registry_id: '', lock_error: 'operation_in_progress' };
    }

    // Track acquired lock for cleanup on failure
    acquiredRegistryId = registry.registry_id!;
    acquiredOperationId = operationId;

    // 4. Create TestLabOperation record
    const record = await base44.asServiceRole.entities.TestLabOperation.create({
      operation_id: operationId,
      verification_run_id: params.verification_run_id || null,
      action: params.action,
      target_type: params.target_type,
      target_key: params.target_key,
      tenant_id: params.tenant_id,
      actor_id: params.actor_id,
      actor_name: params.actor_name,
      status: OPERATION_LIFECYCLE_STATES.PENDING,
      intent_audit_id: null,
      mutation_resource_ids: [],
      completion_audit_id: null,
      failure_code: null,
      failure_summary: null,
      reconciliation_state: 'not_reconciled',
      non_production: true,
    });
    if (!record?.id) {
      // No durable record — release the lock with read-back verification
      const releaseResult = await releaseOperationLock(base44, acquiredRegistryId, acquiredOperationId);
      if (!releaseResult.verified) {
        return { operation_id: '', record_id: '', registry_id: '', error: `TestLabOperation creation returned empty ID AND lock release failed: ${releaseResult.error}. Manual lock recovery may be required.` };
      }
      return { operation_id: '', record_id: '', registry_id: '', error: 'TestLabOperation creation returned empty ID' };
    }
    return { operation_id: operationId, record_id: record.id, registry_id: registry.registry_id! };
  } catch (err) {
    // Build #28.2P-R.0R.1C-F: If we acquired a lock but haven't created a
    // durable record, attempt an ownership-safe release with read-back verification.
    if (acquiredRegistryId && acquiredOperationId) {
      try {
        const releaseResult = await releaseOperationLock(base44, acquiredRegistryId, acquiredOperationId);
        if (!releaseResult.verified) {
          return { operation_id: '', record_id: '', registry_id: '', error: `TestLabOperation creation failed: ${err.message}. Lock release also failed: ${releaseResult.error}. Manual lock recovery may be required.` };
        }
      } catch (releaseErr) {
        return { operation_id: '', record_id: '', registry_id: '', error: `TestLabOperation creation failed: ${err.message}. Lock release threw: ${releaseErr.message}. Manual lock recovery may be required.` };
      }
    }
    return { operation_id: '', record_id: '', registry_id: '', error: `TestLabOperation creation failed: ${err.message}` };
  }
}

// Transitions the TestLabOperation to a new status.
export async function transitionOperation(
  base44: any, operationRecordId: string, newStatus: string, updates: Record<string, any> = {}
): Promise<{ persisted: boolean; error?: string }> {
  try {
    await base44.asServiceRole.entities.TestLabOperation.update(operationRecordId, {
      status: newStatus,
      updated_date: new Date().toISOString(),
      ...updates,
    });
    return { persisted: true };
  } catch (err) {
    return { persisted: false, error: err.message };
  }
}

// ── DURABLE OPERATION INTENT ──────────────────────────────────
// Persists intent audit evidence AND transitions to INTENT_PERSISTED.
export async function persistOperationIntent(base44: any, params: {
  operation_record_id: string;
  audit_tenant_id: string;
  actor_id: string; actor_name: string;
  action: string; target: string; reason: string;
  intended_state: Record<string, any>;
}): Promise<{ intent_id: string; error?: string }> {
  try {
    const record = await base44.asServiceRole.entities.AuditLog.create({
      tenant_id: params.audit_tenant_id,
      actor_id: params.actor_id,
      actor_name: params.actor_name,
      actor_role: 'admin',
      action_type: `test_lab_intent_${params.action}`,
      module: 'system',
      category: 'governance',
      severity: 'warning',
      event_source: 'testLabSetup',
      target_entity: 'TestLabOperation',
      target_record_id: params.target,
      details: `OPERATION INTENT — ${params.action}: ${params.reason}`,
      previous_state: null,
      new_state: { ...params.intended_state, intent_state: OPERATION_LIFECYCLE_STATES.INTENT_PERSISTED, action: params.action },
      shield_outcome: 'not_evaluated',
    });
    const intentId = record?.id || '';
    if (!intentId) {
      return { intent_id: '', error: 'Intent persistence returned empty ID — cannot proceed with mutation.' };
    }
    // Build #28.2P-R.0R.1C-F: Verify the transition succeeded before returning intent_id.
    // Durable intent requires BOTH AuditLog evidence AND TestLabOperation INTENT_PERSISTED.
    const transition = await transitionOperation(base44, params.operation_record_id, OPERATION_LIFECYCLE_STATES.INTENT_PERSISTED, {
      intent_audit_id: intentId,
    });
    if (!transition.persisted) {
      return { intent_id: '', error: `Intent audit was persisted (ID: ${intentId}) but the operation record could not be transitioned to INTENT_PERSISTED: ${transition.error}. Mutation blocked for safety.` };
    }
    return { intent_id: intentId };
  } catch (err) {
    return { intent_id: '', error: `Intent persistence failed: ${err.message}` };
  }
}

// Helper: persist a degraded (incomplete) audit record when completion fails
async function persistDegradedAudit(base44: any, params: any, errorMessage: string): Promise<void> {
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      tenant_id: params.audit_tenant_id,
      actor_id: params.actor_id,
      actor_name: params.actor_name,
      actor_role: 'admin',
      action_type: `test_lab_${params.action}_audit_degraded`,
      module: 'system',
      category: 'governance',
      severity: 'critical',
      event_source: 'testLabSetup',
      target_entity: 'TestLabOperation',
      target_record_id: params.target,
      details: `AUDIT DEGRADED — ${params.action} mutation succeeded but completion audit failed: ${errorMessage}`,
      previous_state: params.previous_state,
      new_state: { ...params.new_state, intent_state: OPERATION_LIFECYCLE_STATES.INCOMPLETE, intent_id: params.intent_id, audit_error: errorMessage },
      shield_outcome: 'not_evaluated',
    });
  } catch { /* best effort */ }
}

// On COMPLETED: releases the atomic lock. On INCOMPLETE: lock remains held.
export async function persistOperationCompletion(base44: any, params: {
  operation_record_id: string;
  audit_tenant_id: string;
  actor_id: string; actor_name: string;
  action: string; target: string; reason: string;
  intent_id: string;
  previous_state: any;
  new_state: Record<string, any>;
  mutation_resource_ids?: string[];
  test_run_id?: string;
  registry_id?: string;
  operation_id?: string;
}): Promise<{ completion_id: string; persisted: boolean }> {
  try {
    const record = await base44.asServiceRole.entities.AuditLog.create({
      tenant_id: params.audit_tenant_id,
      actor_id: params.actor_id,
      actor_name: params.actor_name,
      actor_role: 'admin',
      action_type: `test_lab_${params.action}_completed`,
      module: 'system',
      category: 'governance',
      severity: 'success',
      event_source: 'testLabSetup',
      target_entity: 'TestLabOperation',
      target_record_id: params.target,
      details: `OPERATION COMPLETED — ${params.action}: ${params.reason}`,
      previous_state: params.previous_state,
      new_state: { ...params.new_state, intent_state: OPERATION_LIFECYCLE_STATES.COMPLETED, intent_id: params.intent_id },
      shield_outcome: 'not_evaluated',
    });
    const completionId = record?.id || '';
    if (!completionId) {
      await persistDegradedAudit(base44, params, 'Completion persistence returned empty ID');
      await transitionOperation(base44, params.operation_record_id, OPERATION_LIFECYCLE_STATES.INCOMPLETE, {
        failure_code: 'completion_evidence_empty',
        failure_summary: 'Completion persistence returned empty ID',
      });
      return { completion_id: '', persisted: false };
    }
    const transition = await transitionOperation(base44, params.operation_record_id, OPERATION_LIFECYCLE_STATES.COMPLETED, {
      completion_audit_id: completionId,
      mutation_resource_ids: params.mutation_resource_ids || [],
      completed_at: new Date().toISOString(),
    });
    if (!transition.persisted) {
      // Completion audit exists but operation transition failed — degraded state
      await transitionOperation(base44, params.operation_record_id, OPERATION_LIFECYCLE_STATES.INCOMPLETE, {
        failure_code: 'completion_transition_failed',
        failure_summary: `Completion audit persisted (${completionId}) but operation transition to COMPLETED failed: ${transition.error}`,
      });
      return { completion_id: completionId, persisted: false };
    }
    // Build #28.2P-R.0R.1C-F: Release lock with read-back verification.
    // A COMPLETED operation must NOT report clean completion if its lock
    // cannot be released and verified.
    if (params.registry_id && params.operation_id) {
      const releaseResult = await releaseOperationLock(base44, params.registry_id, params.operation_id);
      if (!releaseResult.verified) {
        // Lock release failed — transition to INCOMPLETE for reconciliation
        await transitionOperation(base44, params.operation_record_id, OPERATION_LIFECYCLE_STATES.INCOMPLETE, {
          failure_code: 'lock_release_failed',
          failure_summary: `Operation completed and audit persisted but lock release could not be verified: ${releaseResult.error}. Manual lock recovery may be required.`,
          completion_audit_id: completionId,
          mutation_resource_ids: params.mutation_resource_ids || [],
        });
        return { completion_id: completionId, persisted: false };
      }
    }
    return { completion_id: completionId, persisted: true };
  } catch (err) {
    await persistDegradedAudit(base44, params, err.message);
    await transitionOperation(base44, params.operation_record_id, OPERATION_LIFECYCLE_STATES.INCOMPLETE, {
      failure_code: 'completion_evidence_failed',
      failure_summary: err.message,
    });
    return { completion_id: '', persisted: false };
  }
}

// On FAILED — releases the atomic lock (terminal state).
export async function persistOperationFailure(base44: any, params: {
  operation_record_id: string;
  audit_tenant_id: string;
  actor_id: string; actor_name: string;
  action: string; target: string; reason: string;
  intent_id: string;
  intended_state: Record<string, any>;
  error: string;
  registry_id?: string;
  operation_id?: string;
}): Promise<{ lock_release_degraded: boolean; lock_release_error?: string }> {
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      tenant_id: params.audit_tenant_id,
      actor_id: params.actor_id,
      actor_name: params.actor_name,
      actor_role: 'admin',
      action_type: `test_lab_${params.action}_failed`,
      module: 'system',
      category: 'governance',
      severity: 'critical',
      event_source: 'testLabSetup',
      target_entity: 'TestLabOperation',
      target_record_id: params.target,
      details: `OPERATION FAILED — ${params.action}: ${params.error}`,
      previous_state: null,
      new_state: { ...params.intended_state, intent_state: OPERATION_LIFECYCLE_STATES.FAILED, intent_id: params.intent_id, error: params.error },
      shield_outcome: 'not_evaluated',
    });
    await transitionOperation(base44, params.operation_record_id, OPERATION_LIFECYCLE_STATES.FAILED, {
      failure_code: 'mutation_failed',
      failure_summary: params.error,
    });
  } catch { /* best effort — intent record already proves the attempt */ }
  // Build #28.2P-R.0R.1C-F: FAILED — release lock (terminal state) with
  // read-back verification. Do NOT swallow release errors via .catch(() => {}).
  let lockReleaseDegraded = false;
  let lockReleaseError: string | null = null;
  if (params.registry_id && params.operation_id) {
    try {
      const releaseResult = await releaseOperationLock(base44, params.registry_id, params.operation_id);
      if (!releaseResult.verified) {
        lockReleaseDegraded = true;
        lockReleaseError = releaseResult.error || 'Lock release verification failed';
      }
    } catch (releaseErr) {
      lockReleaseDegraded = true;
      lockReleaseError = releaseErr.message;
    }
  }
  // If lock release failed, record a degraded audit for recovery
  if (lockReleaseDegraded) {
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        tenant_id: params.audit_tenant_id,
        actor_id: params.actor_id, actor_name: params.actor_name,
        actor_role: 'admin',
        action_type: `test_lab_${params.action}_lock_release_degraded`,
        module: 'system', category: 'governance', severity: 'critical',
        event_source: 'testLabSetup',
        target_entity: 'TestLabOperation', target_record_id: params.target,
        details: `LOCK RELEASE DEGRADED — ${params.action} failed and lock release could not be verified: ${lockReleaseError}. Manual lock recovery may be required.`,
        previous_state: null,
        new_state: { operation_id: params.operation_id, lock_release_error: lockReleaseError },
        shield_outcome: 'not_evaluated',
      });
    } catch { /* best effort */ }
  }
  return { lock_release_degraded: lockReleaseDegraded, lock_release_error: lockReleaseError || undefined };
}

// Build #28.2P-R.0R.1C-F: probeLock and PROBE_LOCK_KEYS have been removed.
// The live CAS proof was obtained and documented. Normal runtime no longer
// exposes a temporary probe endpoint through the testLabSetup action router.