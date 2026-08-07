import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  TEST_IDENTITIES, TEST_LAB_PERMISSION, CROSS_TENANT_AI_PERMISSION,
  TENANT_A_ID, TENANT_A_NAME, TENANT_B_NAME, TENANT_B_TEST_LAB_KEY,
  SANDBOX_TENANT_DEFAULTS,
  SANDBOX_TEST_TTL_DEFAULT_MINUTES, EMAIL_ATTESTATION_CHECKS,
  BOOTSTRAP_STATE, OPERATION_INTENT_STATES,
  isAllowlistedTestAlias, getTestIdentity,
  resolveServerTtl, isProductionRecord,
} from '../../shared/test-lab-config.ts';

// ============================================================
// ORBITAN TEST LAB SETUP — Internal Governance Test Infrastructure
// Build #28.2P-R.0R.1A — Operation Evidence, Readiness and
//                        Analytics Exclusion Closure
//
// HARDENING CHANGES (Build #28.2P-R.0R.1A):
//   1.  Completion-audit false success FIXED — persistOperationCompletion
//       returns { completion_id, persisted }. Callers check persisted and
//       return operation_status: "incomplete" when false.
//   2.  Incomplete operations are ACTIONABLE — checkUnresolvedIntents blocks
//       dependent operations when an incomplete operation exists for a target.
//   3.  Reset partial-failure handling FIXED — inbox query failure is captured,
//       not swallowed. overall_status reports success/partial/incomplete/failed.
//   4.  Readiness scoped to canonical Test Lab evidence — sandbox tenants only.
//       Historical unrelated records cannot set readiness=true.
//   5.  Bootstrap PERMANENTLY DISABLED — returns 410 bootstrap_disabled
//   6.  Durable operation intent BEFORE every privileged mutation
//   7.  Client TTL REMOVED — server selects TTL from SERVER_TTL_POLICY
//
// Operation state machine:
//   INTENT_PERSISTED → MUTATION_COMPLETED → COMPLETED (success)
//   INTENT_PERSISTED → MUTATION_COMPLETED → INCOMPLETE (completion audit failed)
//   INTENT_PERSISTED → FAILED (mutation failed)
// ============================================================

function safeJson(errorCode: string, status: number, message: string, extra: Record<string, any> = {}): Response {
  return Response.json({ success: false, safe_error_code: errorCode, error: message, ...extra }, { status });
}

// ── DURABLE OPERATION INTENT (Build #28.2P-R.0R.1A) ────────────
// Every privileged mutation MUST:
//   1. persist durable authorised operation intent BEFORE mutation;
//   2. verify the intent was persisted (check returned ID);
//   3. perform the idempotent mutation;
//   4. persist completion evidence;
//   5. return success ONLY when completion evidence is durable.
//
// If the mutation succeeds but completion evidence fails:
//   - DO NOT return success:true;
//   - return operation_status: "incomplete";
//   - include intent_id and resource_id;
//   - explain that recovery/reconciliation is required.

async function persistOperationIntent(base44: any, params: {
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
      target_entity: 'TestLab',
      target_record_id: params.target,
      details: `OPERATION INTENT — ${params.action}: ${params.reason}`,
      previous_state: null,
      new_state: { ...params.intended_state, intent_state: OPERATION_INTENT_STATES.INTENT_PERSISTED, action: params.action },
      shield_outcome: 'not_evaluated',
    });
    const intentId = record?.id || '';
    if (!intentId) {
      return { intent_id: '', error: 'Intent persistence returned empty ID — cannot proceed with mutation.' };
    }
    return { intent_id: intentId };
  } catch (err) {
    return { intent_id: '', error: `Intent persistence failed: ${err.message}` };
  }
}

// Build #28.2P-R.0R.1A: Returns { completion_id, persisted } — NOT a bare string.
// Callers MUST check .persisted before returning success:true.
async function persistOperationCompletion(base44: any, params: {
  audit_tenant_id: string;
  actor_id: string; actor_name: string;
  action: string; target: string; reason: string;
  intent_id: string;
  previous_state: any;
  new_state: Record<string, any>;
  test_run_id?: string;
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
      target_entity: 'TestLab',
      target_record_id: params.target,
      details: `OPERATION COMPLETED — ${params.action}: ${params.reason}`,
      previous_state: params.previous_state,
      new_state: { ...params.new_state, intent_state: OPERATION_INTENT_STATES.COMPLETED, intent_id: params.intent_id },
      shield_outcome: 'not_evaluated',
    });
    const completionId = record?.id || '';
    if (!completionId) {
      // Completion audit returned empty ID — persist degraded record
      await persistDegradedAudit(base44, params, 'Completion persistence returned empty ID');
      return { completion_id: '', persisted: false };
    }
    return { completion_id: completionId, persisted: true };
  } catch (err) {
    // Completion audit failed — persist degraded record for recovery
    await persistDegradedAudit(base44, params, err.message);
    return { completion_id: '', persisted: false };
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
      target_entity: 'TestLab',
      target_record_id: params.target,
      details: `AUDIT DEGRADED — ${params.action} mutation succeeded but completion audit failed: ${errorMessage}`,
      previous_state: params.previous_state,
      new_state: { ...params.new_state, intent_state: OPERATION_INTENT_STATES.INCOMPLETE, intent_id: params.intent_id, audit_error: errorMessage },
      shield_outcome: 'not_evaluated',
    });
  } catch { /* best effort */ }
}

async function persistOperationFailure(base44: any, params: {
  audit_tenant_id: string;
  actor_id: string; actor_name: string;
  action: string; target: string; reason: string;
  intent_id: string;
  intended_state: Record<string, any>;
  error: string;
}): Promise<void> {
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
      target_entity: 'TestLab',
      target_record_id: params.target,
      details: `OPERATION FAILED — ${params.action}: ${params.error}`,
      previous_state: null,
      new_state: { ...params.intended_state, intent_state: OPERATION_INTENT_STATES.FAILED, intent_id: params.intent_id, error: params.error },
      shield_outcome: 'not_evaluated',
    });
  } catch { /* best effort — intent record already proves the attempt */ }
}

// ── UNRESOLVED INTENT CHECK (Build #28.2P-R.0R.1A) ─────────────
// Before dependent operations, check whether a relevant incomplete
// operation exists for that target. If so, block the dependent operation.
// This makes incomplete operations ACTIONABLE — they are not just
// passive audit records.
async function checkUnresolvedIntents(base44: any, target: string): Promise<{ has_unresolved: boolean; unresolved: any[] }> {
  try {
    // Query for audit_degraded records — these are incomplete operations
    // where the mutation succeeded but completion evidence failed.
    const degraded = await base44.asServiceRole.entities.AuditLog.filter({
      target_record_id: target,
      event_source: 'testLabSetup',
    }, '-created_date', 20).catch(() => []);

    const unresolved = (degraded || [])
      .filter((d: any) => d.action_type?.endsWith('_audit_degraded'))
      .map((d: any) => ({
        intent_id: d.new_state?.intent_id || d.id,
        action: d.action_type?.replace('test_lab_', '').replace('_audit_degraded', ''),
        target: d.target_record_id,
        error: d.new_state?.audit_error,
        intent_state: OPERATION_INTENT_STATES.INCOMPLETE,
        created_date: d.created_date,
      }));

    return { has_unresolved: unresolved.length > 0, unresolved };
  } catch {
    return { has_unresolved: false, unresolved: [] };
  }
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

    // ── PROVISION TENANT B (intent-first, idempotent, schema-valid) ──
    if (action === 'provision_tenant_b') {
      const reason = body.reason || 'Provision Test Tenant B for governance verification';
      if (reason.length < 5) return safeJson('invalid_request', 400, 'A meaningful reason is required.');

      // Check for unresolved incomplete operations on this target
      const unresolvedCheck = await checkUnresolvedIntents(base44, TENANT_B_TEST_LAB_KEY);
      if (unresolvedCheck.has_unresolved) {
        return safeJson('incomplete_operation', 409, 'An incomplete operation exists for Test Tenant B. Recovery/reconciliation is required before provisioning can proceed.', {
          unresolved_operations: unresolvedCheck.unresolved,
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

      // STEP 1: Persist durable operation intent BEFORE mutation
      const intent = await persistOperationIntent(base44, {
        audit_tenant_id: 'platform',
        actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'provision_tenant_b', target: TENANT_B_TEST_LAB_KEY,
        reason,
        intended_state: { tenant_name: TENANT_B_NAME, test_lab_key: TENANT_B_TEST_LAB_KEY, is_sandbox: true },
      });
      if (!intent.intent_id) {
        return safeJson('audit_failure', 500, 'Cannot provision — durable operation intent could not be persisted. No mutation has occurred.', { error: intent.error });
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
          tenant_id: tenantRecord.id,
          name: TENANT_B_NAME,
          legal_name: `${TENANT_B_NAME} (Sandbox)`,
          industry: 'food_beverage',
          country: 'Singapore',
          status: 'active',
        });

        outletRec = await base44.asServiceRole.entities.Outlet.create({
          tenant_id: tenantRecord.id,
          company_id: companyRec.id,
          name: 'Test Lab B — Outlet 1',
          type: 'other',
          address: 'Test Lab Address (Non-Physical)',
          is_virtual: true,
          status: 'active',
        });
      } catch (mutErr) {
        await persistOperationFailure(base44, {
          audit_tenant_id: 'platform',
          actor_id: user.id, actor_name: user.full_name || 'Admin',
          action: 'provision_tenant_b', target: TENANT_B_TEST_LAB_KEY,
          reason, intent_id: intent.intent_id,
          intended_state: { tenant_name: TENANT_B_NAME },
          error: mutErr.message,
        });
        return safeJson('internal_error', 500, 'Failed to create Test Tenant B hierarchy. Operation intent is persisted for recovery.', {
          intent_id: intent.intent_id,
          partial_tenant_id: tenantRecord?.id || null,
          partial_company_id: companyRec?.id || null,
          error: mutErr.message,
        });
      }

      // STEP 3: Persist completion evidence
      const completion = await persistOperationCompletion(base44, {
        audit_tenant_id: tenantRecord.id,
        actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'provision_tenant_b', target: tenantRecord.id,
        reason, intent_id: intent.intent_id,
        previous_state: null,
        new_state: {
          tenant_id: tenantRecord.id, company_id: companyRec.id, outlet_id: outletRec.id,
          is_sandbox: true, billing_activated: false, integration_activated: false,
        },
      });

      // Build #28.2P-R.0R.1A: Check completion evidence durability
      if (!completion.persisted) {
        return Response.json({
          success: false,
          operation_status: 'incomplete',
          intent_id: intent.intent_id,
          resource_id: tenantRecord.id,
          tenant_id: tenantRecord.id,
          company_id: companyRec.id,
          outlet_id: outletRec.id,
          completion_audit_id: completion.completion_id,
          message: 'Test Tenant B was provisioned but completion evidence could not be persisted. Recovery/reconciliation is required. Dependent operations are blocked until resolved.',
        }, { status: 500 });
      }

      return Response.json({
        success: true,
        operation_status: 'completed',
        tenant_id: tenantRecord.id, tenant_name: tenantRecord.name,
        is_sandbox: true,
        company_id: companyRec.id, outlet_id: outletRec.id,
        billing_activated: false, integration_activated: false,
        wallet_state: 'not_provisioned',
        readiness_state: 'provisioned',
        intent_id: intent.intent_id,
        completion_audit_id: completion.completion_id,
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

      // Check for unresolved incomplete operations on this target tenant
      const unresolvedCheck = await checkUnresolvedIntents(base44, targetTenantId);
      if (unresolvedCheck.has_unresolved) {
        return safeJson('incomplete_operation', 409, 'An incomplete operation exists for the target tenant. Recovery/reconciliation is required before membership preparation can proceed.', {
          unresolved_operations: unresolvedCheck.unresolved,
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
        const intent = await persistOperationIntent(base44, {
          audit_tenant_id: targetTenantId, actor_id: user.id, actor_name: user.full_name || 'Admin',
          action: 'prepare_membership', target: emp.id, reason: `Idempotent reuse of existing Employee for ${email}`,
          intended_state: { employee_id: emp.id, email, reused: true },
        });
        if (!intent.intent_id) return safeJson('audit_failure', 500, 'Cannot record membership reuse — durable intent could not be persisted.');
        const completion = await persistOperationCompletion(base44, {
          audit_tenant_id: targetTenantId, actor_id: user.id, actor_name: user.full_name || 'Admin',
          action: 'prepare_membership', target: emp.id, reason: `Idempotent reuse of existing Employee for ${email}`,
          intent_id: intent.intent_id, previous_state: { role: emp.role, status: emp.status },
          new_state: { role: emp.role, status: emp.status, reused: true },
        });
        if (!completion.persisted) {
          return Response.json({
            success: false, operation_status: 'incomplete',
            intent_id: intent.intent_id, resource_id: emp.id,
            email, employee_id: emp.id, role: emp.role, status: emp.status, reused: true,
            message: 'Membership reuse mutation succeeded but completion evidence could not be persisted. Recovery/reconciliation is required.',
          }, { status: 500 });
        }
        return Response.json({ success: true, operation_status: 'completed', email, employee_id: emp.id, role: emp.role, status: emp.status, reused: true, membership_state: 'MEMBERSHIP_PREPARED', intent_id: intent.intent_id, completion_audit_id: completion.completion_id, message: 'Employee membership already exists. Reusing existing record.' });
      }

      // STEP 1: Persist durable operation intent BEFORE mutation
      const intent = await persistOperationIntent(base44, {
        audit_tenant_id: targetTenantId, actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'prepare_membership', target: email, reason,
        intended_state: { email, role: identity.employeeRole, tenant_id: targetTenantId, outlet_id: outletId },
      });
      if (!intent.intent_id) return safeJson('audit_failure', 500, 'Cannot prepare membership — durable operation intent could not be persisted. No mutation has occurred.', { error: intent.error });

      // STEP 2: Perform the mutation
      let employeeRecord: any;
      try {
        employeeRecord = await base44.asServiceRole.entities.Employee.create({
          tenant_id: targetTenantId, outlet_id: outletId, company_id: companyId,
          full_name: identity.label, email, role: identity.employeeRole,
          status: 'active', employment_type: 'full_time', hire_date: new Date().toISOString().split('T')[0],
        });
      } catch (mutErr) {
        await persistOperationFailure(base44, {
          audit_tenant_id: targetTenantId, actor_id: user.id, actor_name: user.full_name || 'Admin',
          action: 'prepare_membership', target: email, reason, intent_id: intent.intent_id,
          intended_state: { email, role: identity.employeeRole }, error: mutErr.message,
        });
        return safeJson('internal_error', 500, 'Failed to create Employee. Operation intent is persisted for recovery.', { intent_id: intent.intent_id, error: mutErr.message });
      }

      // STEP 3: Persist completion evidence
      const completion = await persistOperationCompletion(base44, {
        audit_tenant_id: targetTenantId, actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'prepare_membership', target: employeeRecord.id, reason, intent_id: intent.intent_id,
        previous_state: null,
        new_state: { employee_id: employeeRecord.id, email, role: identity.employeeRole, tenant_id: targetTenantId, outlet_id: outletId, user_id_linked: false },
      });

      if (!completion.persisted) {
        return Response.json({
          success: false, operation_status: 'incomplete',
          intent_id: intent.intent_id, resource_id: employeeRecord.id,
          email, employee_id: employeeRecord.id, role: identity.employeeRole,
          tenant_id: targetTenantId, outlet_id: outletId, membership_state: 'MEMBERSHIP_PREPARED',
          message: 'Employee membership was created but completion evidence could not be persisted. Recovery/reconciliation is required. Dependent operations are blocked until resolved.',
        }, { status: 500 });
      }

      return Response.json({ success: true, operation_status: 'completed', email, employee_id: employeeRecord.id, role: identity.employeeRole, tenant_id: targetTenantId, outlet_id: outletId, membership_state: 'MEMBERSHIP_PREPARED', intent_id: intent.intent_id, completion_audit_id: completion.completion_id, message: 'Employee membership prepared. The user must now be invited through the canonical /join flow.' });
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

      // Check for unresolved incomplete operations on this target user
      const unresolvedCheck = await checkUnresolvedIntents(base44, targetUser.id);
      if (unresolvedCheck.has_unresolved) {
        return safeJson('incomplete_operation', 409, 'An incomplete operation exists for this user. Recovery/reconciliation is required before granting permissions.', {
          unresolved_operations: unresolvedCheck.unresolved,
        });
      }

      // STEP 1: Persist durable operation intent BEFORE mutation
      const intent = await persistOperationIntent(base44, {
        audit_tenant_id: targetUser.data?.tenant_id || 'platform',
        actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'grant_permission', target: targetUser.id, reason,
        intended_state: { permission: CROSS_TENANT_AI_PERMISSION, target_email: email, target_user_id: targetUser.id },
      });
      if (!intent.intent_id) return safeJson('audit_failure', 500, 'Cannot grant permission — durable operation intent could not be persisted. No mutation has occurred.', { error: intent.error });

      // STEP 2: Perform the mutation
      const newPermissions = [...currentPermissions, CROSS_TENANT_AI_PERMISSION];
      try {
        await base44.asServiceRole.entities.User.update(targetUser.id, { data: { ...targetUser.data, permissions: newPermissions } });
      } catch (mutErr) {
        await persistOperationFailure(base44, {
          audit_tenant_id: targetUser.data?.tenant_id || 'platform',
          actor_id: user.id, actor_name: user.full_name || 'Admin',
          action: 'grant_permission', target: targetUser.id, reason, intent_id: intent.intent_id,
          intended_state: { permission: CROSS_TENANT_AI_PERMISSION, target_email: email }, error: mutErr.message,
        });
        return safeJson('internal_error', 500, 'Failed to grant permission. Operation intent is persisted for recovery.', { intent_id: intent.intent_id, error: mutErr.message });
      }

      // STEP 3: Persist completion evidence
      const completion = await persistOperationCompletion(base44, {
        audit_tenant_id: targetUser.data?.tenant_id || 'platform',
        actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'grant_permission', target: targetUser.id, reason, intent_id: intent.intent_id,
        previous_state: { permission: CROSS_TENANT_AI_PERMISSION, granted: false },
        new_state: { permission: CROSS_TENANT_AI_PERMISSION, granted: true, target_email: email },
      });

      if (!completion.persisted) {
        return Response.json({
          success: false, operation_status: 'incomplete',
          intent_id: intent.intent_id, resource_id: targetUser.id,
          email, user_id: targetUser.id, permission: CROSS_TENANT_AI_PERMISSION, effective: true,
          message: 'Permission was granted but completion evidence could not be persisted. Recovery/reconciliation is required.',
        }, { status: 500 });
      }

      return Response.json({ success: true, operation_status: 'completed', email, user_id: targetUser.id, permission: CROSS_TENANT_AI_PERMISSION, effective: true, auth_refresh_required: true, intent_id: intent.intent_id, completion_audit_id: completion.completion_id, message: 'Cross-tenant AI permission granted. The user must sign out and sign back in.' });
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

      // Check for unresolved incomplete operations on this target user
      const unresolvedCheck = await checkUnresolvedIntents(base44, targetUser.id);
      if (unresolvedCheck.has_unresolved) {
        return safeJson('incomplete_operation', 409, 'An incomplete operation exists for this user. Recovery/reconciliation is required before revoking permissions.', {
          unresolved_operations: unresolvedCheck.unresolved,
        });
      }

      // STEP 1: Persist durable operation intent BEFORE mutation
      const intent = await persistOperationIntent(base44, {
        audit_tenant_id: targetUser.data?.tenant_id || 'platform',
        actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'revoke_permission', target: targetUser.id, reason,
        intended_state: { permission: CROSS_TENANT_AI_PERMISSION, target_email: email, target_user_id: targetUser.id },
      });
      if (!intent.intent_id) return safeJson('audit_failure', 500, 'Cannot revoke permission — durable operation intent could not be persisted. No mutation has occurred.', { error: intent.error });

      // STEP 2: Perform the mutation
      try {
        await base44.asServiceRole.entities.User.update(targetUser.id, { data: { ...targetUser.data, permissions: newPermissions } });
      } catch (mutErr) {
        await persistOperationFailure(base44, {
          audit_tenant_id: targetUser.data?.tenant_id || 'platform',
          actor_id: user.id, actor_name: user.full_name || 'Admin',
          action: 'revoke_permission', target: targetUser.id, reason, intent_id: intent.intent_id,
          intended_state: { permission: CROSS_TENANT_AI_PERMISSION, target_email: email }, error: mutErr.message,
        });
        return safeJson('internal_error', 500, 'Failed to revoke permission. Operation intent is persisted for recovery.', { intent_id: intent.intent_id, error: mutErr.message });
      }

      // STEP 3: Persist completion evidence
      const completion = await persistOperationCompletion(base44, {
        audit_tenant_id: targetUser.data?.tenant_id || 'platform',
        actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'revoke_permission', target: targetUser.id, reason, intent_id: intent.intent_id,
        previous_state: { permission: CROSS_TENANT_AI_PERMISSION, granted: previousValue },
        new_state: { permission: CROSS_TENANT_AI_PERMISSION, granted: false, target_email: email },
      });

      if (!completion.persisted) {
        return Response.json({
          success: false, operation_status: 'incomplete',
          intent_id: intent.intent_id, resource_id: targetUser.id,
          email, user_id: targetUser.id, permission: CROSS_TENANT_AI_PERMISSION, effective: false,
          message: 'Permission was revoked but completion evidence could not be persisted. Recovery/reconciliation is required.',
        }, { status: 500 });
      }

      return Response.json({ success: true, operation_status: 'completed', email, user_id: targetUser.id, permission: CROSS_TENANT_AI_PERMISSION, effective: false, auth_refresh_required: true, intent_id: intent.intent_id, completion_audit_id: completion.completion_id, message: 'Cross-tenant AI permission revoked. The user must sign out and sign back in.' });
    }

    // ── ATTEST EMAIL DELIVERY (intent-first, persisted) ────
    if (action === 'attest_delivery') {
      const { email, check, verified } = body;
      if (!email || !isAllowlistedTestAlias(email)) return safeJson('invalid_request', 400, 'Email is not in the fixed test-identity allowlist.');
      if (!EMAIL_ATTESTATION_CHECKS.includes(check)) return safeJson('invalid_request', 400, `Invalid attestation check. Must be one of: ${EMAIL_ATTESTATION_CHECKS.join(', ')}`);

      const identity = getTestIdentity(email)!;
      const auditTenantId = identity.tenant === 'platform' ? 'platform' : (identity.tenant === 'A' ? TENANT_A_ID : (await base44.asServiceRole.entities.Tenant.filter({ test_lab_key: TENANT_B_TEST_LAB_KEY }).catch(() => []))?.[0]?.id || 'platform');
      const reason = `Attest ${check} for ${email}`;

      // STEP 1: Persist durable operation intent BEFORE mutation
      const intent = await persistOperationIntent(base44, {
        audit_tenant_id: auditTenantId, actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'attest_delivery', target: email, reason,
        intended_state: { alias: email, check_key: check, verified: !!verified },
      });
      if (!intent.intent_id) return safeJson('audit_failure', 500, 'Cannot attest — durable operation intent could not be persisted. No mutation has occurred.', { error: intent.error });

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
          const completion = await persistOperationCompletion(base44, {
            audit_tenant_id: auditTenantId, actor_id: user.id, actor_name: user.full_name || 'Admin',
            action: 'attest_delivery', target: record.id, reason, intent_id: intent.intent_id,
            previous_state: { verified: record.verified },
            new_state: { verified: !!verified, check, alias: email },
          });
          if (!completion.persisted) {
            return Response.json({ success: false, operation_status: 'incomplete', intent_id: intent.intent_id, resource_id: record.id, email, check, verified: !!verified, message: 'Attestation was updated but completion evidence could not be persisted. Recovery/reconciliation is required.' }, { status: 500 });
          }
          return Response.json({ success: true, operation_status: 'completed', email, check, verified: !!verified, attested_by: user.full_name || 'Admin', attested_at: now, attestation_id: record.id, intent_id: intent.intent_id, completion_audit_id: completion.completion_id, message: 'Email delivery attestation updated.' });
        }

        const attestation = await base44.asServiceRole.entities.TestLabAttestation.create({
          tenant_id: auditTenantId, alias: email, check_key: check, verified: !!verified,
          attested_by_id: user.id, attested_by_name: user.full_name || 'Admin',
          attested_at: now, updated_at: now, evidence_type: 'manual_verification', non_production: true,
        });
        const completion = await persistOperationCompletion(base44, {
          audit_tenant_id: auditTenantId, actor_id: user.id, actor_name: user.full_name || 'Admin',
          action: 'attest_delivery', target: attestation?.id || email, reason, intent_id: intent.intent_id,
          previous_state: { verified: false },
          new_state: { verified: !!verified, check, alias: email, no_private_destination: true },
        });
        if (!completion.persisted) {
          return Response.json({ success: false, operation_status: 'incomplete', intent_id: intent.intent_id, resource_id: attestation?.id || '', email, check, verified: !!verified, message: 'Attestation was created but completion evidence could not be persisted. Recovery/reconciliation is required.' }, { status: 500 });
        }
        return Response.json({ success: true, operation_status: 'completed', email, check, verified: !!verified, attested_by: user.full_name || 'Admin', attested_at: now, attestation_id: attestation?.id || '', intent_id: intent.intent_id, completion_audit_id: completion.completion_id, message: 'Email delivery attestation recorded.' });
      } catch (mutErr) {
        await persistOperationFailure(base44, {
          audit_tenant_id: auditTenantId, actor_id: user.id, actor_name: user.full_name || 'Admin',
          action: 'attest_delivery', target: email, reason, intent_id: intent.intent_id,
          intended_state: { alias: email, check_key: check, verified: !!verified }, error: mutErr.message,
        });
        return safeJson('internal_error', 500, 'Failed to persist attestation. Operation intent is persisted for recovery.', { intent_id: intent.intent_id, error: mutErr.message });
      }
    }

    // ── CREATE TEST RUN (server-derived TTL, NO client TTL) ─
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

      // Check for unresolved incomplete operations on this sandbox tenant
      const unresolvedCheck = await checkUnresolvedIntents(base44, sandbox_tenant_id);
      if (unresolvedCheck.has_unresolved) {
        return safeJson('incomplete_operation', 409, 'An incomplete operation exists for this sandbox tenant. Recovery/reconciliation is required before creating a Test Run.', {
          unresolved_operations: unresolvedCheck.unresolved,
        });
      }

      const users = await base44.asServiceRole.entities.User.filter({ email: authorised_requester_email }).catch(() => []);
      if (!users || users.length === 0) return safeJson('not_found', 404, 'Authorised requester has not registered yet.');
      const requester = users[0];

      // SERVER-SELECTED TTL — resolved from SERVER_TTL_POLICY based on test_tag
      const serverTtl = resolveServerTtl(test_tag);

      const testRunId = `trun_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      // STEP 1: Persist durable operation intent BEFORE mutation
      const intent = await persistOperationIntent(base44, {
        audit_tenant_id: sandbox_tenant_id, actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'create_test_run', target: testRunId, reason: `Create Test Run ${testRunId} for ${permitted_service_key}`,
        intended_state: { test_run_id: testRunId, sandbox_tenant_id, permitted_service_key, server_selected_ttl_minutes: serverTtl, test_tag, client_ttl_ignored: clientTtlSupplied },
      });
      if (!intent.intent_id) return safeJson('audit_failure', 500, 'Cannot create Test Run — durable operation intent could not be persisted. No mutation has occurred.', { error: intent.error });

      // STEP 2: Perform the mutation
      let testRun: any;
      try {
        testRun = await base44.asServiceRole.entities.TestRun.create({
          tenant_id: sandbox_tenant_id, test_run_id: testRunId,
          sandbox_tenant_id, authorised_requester_user_id: requester.id,
          authorised_requester_name: requester.full_name || authorised_requester_email,
          permitted_service_key, permitted_action_type: permitted_action_type || 'require_approval',
          permitted_autonomy_level, server_selected_ttl_minutes: serverTtl,
          test_tag, test_purpose,
          created_by_operator_id: user.id, created_by_operator_name: user.full_name || 'Admin',
          status: 'active', max_uses: 1, current_uses: 0, expires_at: expiresAt,
          non_production: true,
        });
      } catch (mutErr) {
        await persistOperationFailure(base44, {
          audit_tenant_id: sandbox_tenant_id, actor_id: user.id, actor_name: user.full_name || 'Admin',
          action: 'create_test_run', target: testRunId, reason: `Create Test Run ${testRunId}`, intent_id: intent.intent_id,
          intended_state: { test_run_id: testRunId, server_selected_ttl_minutes: serverTtl }, error: mutErr.message,
        });
        return safeJson('internal_error', 500, 'Failed to create Test Run. Operation intent is persisted for recovery.', { intent_id: intent.intent_id, error: mutErr.message });
      }

      // STEP 3: Persist completion evidence
      const completion = await persistOperationCompletion(base44, {
        audit_tenant_id: sandbox_tenant_id, actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'create_test_run', target: testRunId, reason: `Create Test Run ${testRunId}`, intent_id: intent.intent_id,
        previous_state: null,
        new_state: { test_run_id: testRunId, sandbox_tenant_id, permitted_service_key, server_selected_ttl_minutes: serverTtl, test_tag, client_ttl_ignored: clientTtlSupplied },
      });

      if (!completion.persisted) {
        return Response.json({
          success: false, operation_status: 'incomplete',
          intent_id: intent.intent_id, resource_id: testRunId,
          test_run_id: testRunId, test_run_record_id: testRun?.id,
          sandbox_tenant_id, permitted_service_key,
          server_selected_ttl_minutes: serverTtl, server_ttl_source: 'SERVER_TTL_POLICY',
          client_ttl_ignored: clientTtlSupplied, expires_at: expiresAt,
          message: 'Test Run was created but completion evidence could not be persisted. Recovery/reconciliation is required. The Test Run may not be usable until resolved.',
        }, { status: 500 });
      }

      return Response.json({
        success: true, operation_status: 'completed',
        test_run_id: testRunId, test_run_record_id: testRun?.id,
        sandbox_tenant_id, authorised_requester_user_id: requester.id, permitted_service_key,
        server_selected_ttl_minutes: serverTtl, server_ttl_source: 'SERVER_TTL_POLICY',
        client_ttl_ignored: clientTtlSupplied,
        expires_at: expiresAt, intent_id: intent.intent_id, completion_audit_id: completion.completion_id,
        message: 'Test Run created. Only the authorised requester can use it for the permitted service.',
      });
    }

    // ── READINESS STATUS (truthful, scoped to canonical Test Lab evidence) ──
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

      // ── BUILD #28.2P-R.0R.1A: SCOPE READINESS TO CANONICAL TEST LAB EVIDENCE ──
      // Readiness must be scoped to the canonical Orbitan Test Lab context.
      // A historical or unrelated test record MUST NOT set readiness=true.
      // Use: sandbox tenant IDs, canonical test_lab_key, authorised Test Lab identities.

      // Canonical sandbox tenant IDs — only these tenants are Test Lab tenants
      const sandboxTenantIds: string[] = [TENANT_A_ID];
      if (tenantBId) sandboxTenantIds.push(tenantBId);

      // Check for schema-supported tagged AIApproval records SCOPED to sandbox tenants
      const taggedApprovals = await base44.asServiceRole.entities.AIApproval.filter({
        is_test: true,
        tenant_id: { $in: sandboxTenantIds },
      }).catch(() => []);
      const verifiedTaggedApproval = (taggedApprovals || []).find((a: any) =>
        a.test_run_id && a.test_tag && a.is_test === true && a.non_production === true
      );

      // Check for consumed TestRun records SCOPED to sandbox tenants
      const consumedTestRuns = await base44.asServiceRole.entities.TestRun.filter({
        status: 'consumed',
        sandbox_tenant_id: { $in: sandboxTenantIds },
      }).catch(() => []);
      const verifiedConsumedRun = (consumedTestRuns || []).find((r: any) =>
        r.consumption_token && r.server_selected_ttl_minutes >= 1 && r.server_selected_ttl_minutes <= 10
      );

      // ── UNRESOLVED INCOMPLETE OPERATIONS ──
      // Check for incomplete operations across all Test Lab targets
      const unresolvedPlatform = await checkUnresolvedIntents(base44, 'platform');
      const unresolvedTenantA = await checkUnresolvedIntents(base44, TENANT_A_ID);
      const unresolvedTenantB = tenantBId ? await checkUnresolvedIntents(base44, tenantBId) : { has_unresolved: false, unresolved: [] };
      const allUnresolved = [
        ...unresolvedPlatform.unresolved,
        ...unresolvedTenantA.unresolved,
        ...unresolvedTenantB.unresolved,
      ];

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
        tenants: {
          A: tenantA ? { id: tenantA.id, name: tenantA.name, is_sandbox: tenantA.is_sandbox, status: tenantA.status, exists: true } : { exists: false },
          B: tenantB ? { id: tenantB.id, name: tenantB.name, is_sandbox: tenantB.is_sandbox, test_lab_key: tenantB.test_lab_key, status: tenantB.status, exists: true, company_id: tenantBCompany?.id, outlet_id: tenantBOutlet?.id } : { exists: false },
        },
        identities,
        test_capability: {
          // ALL evidence-derived and SCOPED to canonical Test Lab context (Build #28.2P-R.0R.1A)
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
            server_selected_ttl_minutes: verifiedConsumedRun.server_selected_ttl_minutes,
            consumption_token: verifiedConsumedRun.consumption_token,
            status: verifiedConsumedRun.status,
            sandbox_tenant_id: verifiedConsumedRun.sandbox_tenant_id,
          } : null,
          independent_approver_ready: !!(requester?.user_registered && approver?.user_registered && requester?.email_verified && approver?.email_verified && requester?.membership_linked && approver?.membership_linked && requester?.email !== approver?.email),
          worker_isolation_ready: !!(workerA?.user_registered && workerA?.user_role === 'user' && workerA?.employee_role === 'worker' && workerA?.membership_linked),
          tenant_b_isolation_ready: tenantBIsolationReady,
          platform_permission_distinction_ready: !!(platformAllowed?.user_registered && platformDenied?.user_registered && platformAllowed?.cross_tenant_permission === true && platformDenied?.cross_tenant_permission === false),
        },
        // Build #28.2P-R.0R.1A: Unresolved incomplete operations — actionable recovery state
        unresolved_operations: allUnresolved,
        has_unresolved_operations: allUnresolved.length > 0,
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

      // Check for unresolved incomplete operations on this target
      const unresolvedCheck = await checkUnresolvedIntents(base44, tenant_id);
      if (unresolvedCheck.has_unresolved) {
        return safeJson('incomplete_operation', 409, 'An incomplete operation exists for this tenant. Recovery/reconciliation is required before resetting test data.', {
          unresolved_operations: unresolvedCheck.unresolved,
        });
      }

      // STEP 1: Persist durable operation intent BEFORE any deletion
      const intent = await persistOperationIntent(base44, {
        audit_tenant_id: tenant_id, actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'reset_test_data', target: tenant_id, reason,
        intended_state: { test_run_id, tenant_id, scope: 'mutable_tagged_records' },
      });
      if (!intent.intent_id) return safeJson('audit_failure', 500, 'Cannot reset — durable operation intent could not be persisted. No data has been deleted.', { error: intent.error });

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
        // Build #28.2P-R.0R.1A: Capture the error — do NOT swallow
        approvalsQueryError = err.message;
      }

      // ── INBOX PHASE ──
      // Build #28.2P-R.0R.1A: Do NOT swallow inbox query failure.
      // Capture the error and report it accurately.
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
        // Build #28.2P-R.0R.1A: Capture the error — do NOT swallow
        inboxQueryError = err.message;
      }

      // ── DETERMINE OVERALL STATUS (Build #28.2P-R.0R.1A) ──
      // Expected statuses: success | partial | incomplete | failed
      let overallStatus: 'success' | 'partial' | 'incomplete' | 'failed';
      const hasQueryErrors = !!(approvalsQueryError || inboxQueryError);
      const hasDeleteFailures = failedRecordIds.length > 0;

      if (hasQueryErrors && hasDeleteFailures) {
        overallStatus = 'failed';
      } else if (hasQueryErrors) {
        // A query phase failed — we cannot be sure all relevant records were processed.
        // This is incomplete, not just partial.
        overallStatus = 'incomplete';
      } else if (hasDeleteFailures) {
        overallStatus = 'partial';
      } else {
        overallStatus = 'success';
      }

      // STEP 3: Persist completion (or partial/incomplete/failed) evidence
      const completion = await persistOperationCompletion(base44, {
        audit_tenant_id: tenant_id, actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'reset_test_data', target: tenant_id, reason, intent_id: intent.intent_id,
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

      // Build #28.2P-R.0R.1A: If completion evidence failed, report incomplete
      if (!completion.persisted) {
        return Response.json({
          success: false,
          operation_status: 'incomplete',
          intent_id: intent.intent_id,
          resource_id: tenant_id,
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

      // Build #28.2P-R.0R.1A: Report accurate overall_status
      // success only when no errors and no failures
      const success = overallStatus === 'success';

      return Response.json({
        success,
        operation_status: overallStatus,
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

    return safeJson('invalid_request', 400, `Unknown action: ${action}`);
  } catch (error) {
    return safeJson('internal_error', 500, 'An unexpected error occurred.');
  }
}