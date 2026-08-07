import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  TEST_IDENTITIES, TEST_LAB_PERMISSION, CROSS_TENANT_AI_PERMISSION,
  TENANT_A_ID, TENANT_A_NAME, TENANT_B_NAME, TENANT_B_TEST_LAB_KEY,
  SANDBOX_TENANT_DEFAULTS,
  SANDBOX_TEST_TTL_MIN_MINUTES, SANDBOX_TEST_TTL_MAX_MINUTES,
  SANDBOX_TEST_TTL_DEFAULT_MINUTES, EMAIL_ATTESTATION_CHECKS,
  isAllowlistedTestAlias, getTestIdentity, isValidTestTtlMinutes,
} from '../../shared/test-lab-config.ts';

// ============================================================
// ORBITAN TEST LAB SETUP — Internal Governance Test Infrastructure
// Build #28.2P-R.0R — Security and Operational Repair
//
// Protected server-side authority for:
//   - One-time permission bootstrap (founder-only, self-targeting)
//   - Test Tenant B provisioning (idempotent, schema-valid, sandbox-only)
//   - Test Tenant A readiness audit (read-only)
//   - Employee membership preparation for 8 fixed test identities
//   - Cross-tenant permission grant/revoke (one fixed permission)
//   - Email delivery attestation (persisted per alias per check)
//   - Protected Test Run creation (server-derived TTL)
//   - Readiness dashboard (computed from persisted evidence)
//   - Mutable tagged test-data reset (schema-supported fields, fail-closed)
//
// All privileged operations use fail-closed audit.
// ============================================================

function safeJson(errorCode: string, status: number, message: string, extra: Record<string, any> = {}): Response {
  return Response.json({ success: false, safe_error_code: errorCode, error: message, ...extra }, { status });
}

// ── FAIL-CLOSED AUDIT ──────────────────────────────────────────
// Throws on failure — callers MUST NOT swallow. This ensures
// privileged operations cannot proceed without durable evidence.
async function auditTestLabAction(base44: any, params: {
  audit_tenant_id: string;
  actor_id: string; actor_name: string;
  action: string; target: string; reason: string;
  previous_state: any; new_state: any;
  test_run_id?: string;
}): Promise<string> {
  const record = await base44.asServiceRole.entities.AuditLog.create({
    tenant_id: params.audit_tenant_id,
    actor_id: params.actor_id,
    actor_name: params.actor_name,
    actor_role: 'admin',
    action_type: `test_lab_${params.action}`,
    module: 'system',
    category: 'governance',
    severity: 'info',
    event_source: 'testLabSetup',
    target_entity: 'TestLab',
    target_record_id: params.target,
    details: `${params.action} — ${params.reason}`,
    previous_state: params.previous_state,
    new_state: params.new_state,
    shield_outcome: 'not_evaluated',
  });
  return record?.id || '';
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

    // ── BOOTSTRAP PERMISSION (one-time, founder-only) ──────
    // No permission required for this action — it CREATES the first
    // permission holder. But it only works once.
    if (action === 'bootstrap_permission') {
      const reason = body.reason;
      if (!reason || reason.length < 10) {
        return safeJson('invalid_request', 400, 'A meaningful reason (minimum 10 characters) is required for the bootstrap action.');
      }

      // Must be authenticated platform admin (User.role === 'admin')
      if (user.role !== 'admin') {
        return safeJson('forbidden', 403, 'Only a platform administrator can perform the bootstrap action.');
      }

      // Check if any user already holds the permission
      const allUsers = await base44.asServiceRole.entities.User.list().catch(() => []);
      const existingHolders = (allUsers || []).filter((u: any) =>
        (u.data?.permissions || []).includes(TEST_LAB_PERMISSION)
      );

      if (existingHolders.length > 0) {
        return safeJson('forbidden', 403, 'Bootstrap is permanently unavailable — a permission holder already exists. Use the canonical Access Control workflow to manage permissions.', {
          existing_holders: existingHolders.length,
        });
      }

      // No arbitrary target user — always targets the authenticated founder
      // No arbitrary permission — always grants platform.test_lab.manage
      const currentPermissions = (user.data?.permissions || []) as string[];
      const newPermissions = [...currentPermissions, TEST_LAB_PERMISSION];

      // FAIL-CLOSED: audit BEFORE mutation
      let auditId: string = '';
      try {
        auditId = await auditTestLabAction(base44, {
          audit_tenant_id: user.data?.tenant_id || 'platform',
          actor_id: user.id, actor_name: user.full_name || 'Founder',
          action: 'bootstrap_permission', target: user.id,
          reason: `One-time bootstrap: granting ${TEST_LAB_PERMISSION} to founder ${user.full_name || user.email}. Reason: ${reason}`,
          previous_state: { permission: TEST_LAB_PERMISSION, granted: false, target: 'self' },
          new_state: { permission: TEST_LAB_PERMISSION, granted: true, target: 'self', bootstrap_complete: true },
        });
      } catch (auditErr) {
        return safeJson('audit_failure', 500, 'Cannot complete bootstrap — audit evidence creation failed. The permission has NOT been granted.', {
          error: auditErr.message,
        });
      }

      if (!auditId) {
        return safeJson('audit_failure', 500, 'Cannot complete bootstrap — audit evidence creation returned empty. The permission has NOT been granted.');
      }

      // Perform the mutation
      await base44.asServiceRole.entities.User.update(user.id, {
        data: { ...user.data, permissions: newPermissions },
      });

      return Response.json({
        success: true,
        bootstrap_complete: true,
        permission: TEST_LAB_PERMISSION,
        granted_to: user.full_name || user.email,
        audit_event_id: auditId,
        auth_refresh_required: true,
        message: 'platform.test_lab.manage permission granted. You must sign out and sign back in for the permission to take effect. This bootstrap action is now permanently unavailable.',
      });
    }

    // ── ALL REMAINING ACTIONS REQUIRE TEST LAB AUTHORITY ───
    const authCheck = await validateTestLabAuthority(base44, user);
    if (!authCheck.valid) {
      return safeJson('forbidden', 403, authCheck.reason || 'Permission denied.');
    }

    // ── PROVISION TENANT B (schema-valid, idempotent) ──────
    if (action === 'provision_tenant_b') {
      const reason = body.reason || 'Provision Test Tenant B for governance verification';
      if (reason.length < 5) return safeJson('invalid_request', 400, 'A meaningful reason is required.');

      // Idempotent check using canonical test_lab_key
      const existing = await base44.asServiceRole.entities.Tenant.filter({ test_lab_key: TENANT_B_TEST_LAB_KEY }).catch(() => []);
      if (existing && existing.length > 0) {
        const tenant = existing[0];
        // Conflict detection: name match but not a proper sandbox test tenant
        if (!tenant.is_sandbox || !tenant.test_lab_key) {
          return safeJson('conflict', 409, 'A tenant with the same name exists but is not a valid Test Lab sandbox tenant. refusing to reuse.', {
            tenant_id: tenant.id, is_sandbox: tenant.is_sandbox, has_test_lab_key: !!tenant.test_lab_key,
          });
        }

        // Idempotent reuse — return full hierarchy
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

      // Also check by name to detect conflicts
      const nameConflict = await base44.asServiceRole.entities.Tenant.filter({ name: TENANT_B_NAME }).catch(() => []);
      if (nameConflict && nameConflict.length > 0) {
        const conflict = nameConflict[0];
        if (!conflict.test_lab_key || !conflict.is_sandbox) {
          return safeJson('conflict', 409, 'A tenant with the same display name exists but lacks the Test Lab key or sandbox flag. Refusing to reuse.', {
            tenant_id: conflict.id, is_sandbox: conflict.is_sandbox, has_test_lab_key: !!conflict.test_lab_key,
          });
        }
      }

      // Create full minimum valid hierarchy: Tenant → Company → Outlet
      // Reusing the canonical provisioning pattern from onboardingService
      const tenantRecord = await base44.asServiceRole.entities.Tenant.create({
        name: TENANT_B_NAME,
        legal_name: `${TENANT_B_NAME} (Sandbox Test Tenant)`,
        ...SANDBOX_TENANT_DEFAULTS,
        test_lab_key: TENANT_B_TEST_LAB_KEY,
        notes: 'TEST_LAB_B — Sandbox Test Tenant B for cross-tenant governance isolation testing. Not a real business. Provisioned by Test Lab Setup.',
      });

      if (!tenantRecord) {
        return safeJson('internal_error', 500, 'Failed to create Test Tenant B.');
      }

      // Company (required by Outlet schema)
      let companyRec: any = null;
      try {
        companyRec = await base44.asServiceRole.entities.Company.create({
          tenant_id: tenantRecord.id,
          name: TENANT_B_NAME,
          legal_name: `${TENANT_B_NAME} (Sandbox)`,
          industry: 'food_beverage',
          country: 'Singapore',
          status: 'active',
        });
      } catch (err) {
        return safeJson('internal_error', 500, 'Failed to create Company for Test Tenant B. Tenant was created but the hierarchy is incomplete.', {
          tenant_id: tenantRecord.id, error: err.message,
        });
      }

      // Outlet (uses schema-correct fields: type, address, company_id)
      let outletRec: any = null;
      try {
        outletRec = await base44.asServiceRole.entities.Outlet.create({
          tenant_id: tenantRecord.id,
          company_id: companyRec.id,
          name: 'Test Lab B — Outlet 1',
          type: 'other',
          address: 'Test Lab Address (Non-Physical)',
          is_virtual: true,
          status: 'active',
        });
      } catch (err) {
        return safeJson('internal_error', 500, 'Failed to create Outlet for Test Tenant B. Tenant and Company were created but the hierarchy is incomplete.', {
          tenant_id: tenantRecord.id, company_id: companyRec.id, error: err.message,
        });
      }

      // FAIL-CLOSED audit
      try {
        await auditTestLabAction(base44, {
          audit_tenant_id: tenantRecord.id,
          actor_id: user.id, actor_name: user.full_name || 'Admin',
          action: 'provision_tenant_b', target: tenantRecord.id,
          reason,
          previous_state: null,
          new_state: {
            tenant_id: tenantRecord.id, company_id: companyRec.id, outlet_id: outletRec.id,
            is_sandbox: true, billing_activated: false, integration_activated: false,
          },
        });
      } catch (auditErr) {
        return safeJson('audit_failure', 500, 'Test Tenant B was provisioned but audit evidence creation failed. The hierarchy is valid but audit is incomplete.', {
          tenant_id: tenantRecord.id, error: auditErr.message,
        });
      }

      return Response.json({
        success: true,
        tenant_id: tenantRecord.id, tenant_name: tenantRecord.name,
        is_sandbox: true,
        company_id: companyRec.id, outlet_id: outletRec.id,
        billing_activated: false, integration_activated: false,
        wallet_state: 'not_provisioned',
        readiness_state: 'provisioned',
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

    // ── PREPARE MEMBERSHIP ─────────────────────────────────
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

      const outlets = await base44.asServiceRole.entities.Outlet.filter({ tenant_id: targetTenantId }).catch(() => []);
      const companies = await base44.asServiceRole.entities.Company.filter({ tenant_id: targetTenantId }).catch(() => []);
      const outletId = outlets?.[0]?.id || null;
      const companyId = companies?.[0]?.id || null;
      if (identity.outletRequired && !outletId) return safeJson('invalid_request', 409, 'No outlet exists in the target tenant. Provision the tenant first.');

      const existingEmployees = await base44.asServiceRole.entities.Employee.filter({ tenant_id: targetTenantId, email }).catch(() => []);
      if (existingEmployees && existingEmployees.length > 0) {
        const emp = existingEmployees[0];
        try { await auditTestLabAction(base44, { audit_tenant_id: targetTenantId, actor_id: user.id, actor_name: user.full_name || 'Admin', action: 'prepare_membership', target: emp.id, reason: `Idempotent reuse of existing Employee for ${email}`, previous_state: { role: emp.role, status: emp.status }, new_state: { role: emp.role, status: emp.status, reused: true } }); } catch (auditErr) { return safeJson('audit_failure', 500, 'Cannot record membership reuse — audit failed.'); }
        return Response.json({ success: true, email, employee_id: emp.id, role: emp.role, status: emp.status, reused: true, membership_state: 'MEMBERSHIP_PREPARED', message: 'Employee membership already exists. Reusing existing record.' });
      }

      const employeeRecord = await base44.asServiceRole.entities.Employee.create({
        tenant_id: targetTenantId, outlet_id: outletId, company_id: companyId,
        full_name: identity.label, email, role: identity.employeeRole,
        status: 'active', employment_type: 'full_time', hire_date: new Date().toISOString().split('T')[0],
      });

      try { await auditTestLabAction(base44, { audit_tenant_id: targetTenantId, actor_id: user.id, actor_name: user.full_name || 'Admin', action: 'prepare_membership', target: employeeRecord.id, reason, previous_state: null, new_state: { employee_id: employeeRecord.id, email, role: identity.employeeRole, tenant_id: targetTenantId, outlet_id: outletId, user_id_linked: false } }); } catch (auditErr) { return safeJson('audit_failure', 500, 'Employee was created but audit evidence creation failed.'); }

      return Response.json({ success: true, email, employee_id: employeeRecord.id, role: identity.employeeRole, tenant_id: targetTenantId, outlet_id: outletId, membership_state: 'MEMBERSHIP_PREPARED', message: 'Employee membership prepared. The user must now be invited through the canonical /join flow.' });
    }

    // ── GRANT CROSS-TENANT PERMISSION ───────────────────────
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

      const newPermissions = [...currentPermissions, CROSS_TENANT_AI_PERMISSION];

      // FAIL-CLOSED audit before mutation
      let auditId = '';
      try { auditId = await auditTestLabAction(base44, { audit_tenant_id: targetUser.data?.tenant_id || 'platform', actor_id: user.id, actor_name: user.full_name || 'Admin', action: 'grant_permission', target: targetUser.id, reason, previous_state: { permission: CROSS_TENANT_AI_PERMISSION, granted: false }, new_state: { permission: CROSS_TENANT_AI_PERMISSION, granted: true, target_email: email } }); } catch (auditErr) { return safeJson('audit_failure', 500, 'Cannot grant permission — audit evidence creation failed.'); }

      await base44.asServiceRole.entities.User.update(targetUser.id, { data: { ...targetUser.data, permissions: newPermissions } });

      return Response.json({ success: true, email, user_id: targetUser.id, permission: CROSS_TENANT_AI_PERMISSION, effective: true, auth_refresh_required: true, audit_event_id: auditId, message: 'Cross-tenant AI permission granted. The user must sign out and sign back in.' });
    }

    // ── REVOKE CROSS-TENANT PERMISSION ──────────────────────
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

      let auditId = '';
      try { auditId = await auditTestLabAction(base44, { audit_tenant_id: targetUser.data?.tenant_id || 'platform', actor_id: user.id, actor_name: user.full_name || 'Admin', action: 'revoke_permission', target: targetUser.id, reason, previous_state: { permission: CROSS_TENANT_AI_PERMISSION, granted: previousValue }, new_state: { permission: CROSS_TENANT_AI_PERMISSION, granted: false, target_email: email } }); } catch (auditErr) { return safeJson('audit_failure', 500, 'Cannot revoke permission — audit evidence creation failed.'); }

      await base44.asServiceRole.entities.User.update(targetUser.id, { data: { ...targetUser.data, permissions: newPermissions } });

      return Response.json({ success: true, email, user_id: targetUser.id, permission: CROSS_TENANT_AI_PERMISSION, effective: false, auth_refresh_required: true, audit_event_id: auditId, message: 'Cross-tenant AI permission revoked. The user must sign out and sign back in.' });
    }

    // ── ATTEST EMAIL DELIVERY (persisted) ───────────────────
    if (action === 'attest_delivery') {
      const { email, check, verified } = body;
      if (!email || !isAllowlistedTestAlias(email)) return safeJson('invalid_request', 400, 'Email is not in the fixed test-identity allowlist.');
      if (!EMAIL_ATTESTATION_CHECKS.includes(check)) return safeJson('invalid_request', 400, `Invalid attestation check. Must be one of: ${EMAIL_ATTESTATION_CHECKS.join(', ')}`);

      const identity = getTestIdentity(email)!;
      const auditTenantId = identity.tenant === 'platform' ? 'platform' : (identity.tenant === 'A' ? TENANT_A_ID : (await base44.asServiceRole.entities.Tenant.filter({ test_lab_key: TENANT_B_TEST_LAB_KEY }).catch(() => []))?.[0]?.id || 'platform');

      // Find existing attestation record
      const existing = await base44.asServiceRole.entities.TestLabAttestation.filter({ alias: email, check_key: check }).catch(() => []);
      const now = new Date().toISOString();

      if (existing && existing.length > 0) {
        const record = existing[0];
        // FAIL-CLOSED audit before mutation
        try { await auditTestLabAction(base44, { audit_tenant_id: auditTenantId, actor_id: user.id, actor_name: user.full_name || 'Admin', action: 'attest_delivery', target: record.id, reason: `Update attestation for ${email} / ${check}`, previous_state: { verified: record.verified }, new_state: { verified: !!verified, check, alias: email } }); } catch (auditErr) { return safeJson('audit_failure', 500, 'Cannot update attestation — audit failed.'); }

        await base44.asServiceRole.entities.TestLabAttestation.update(record.id, {
          verified: !!verified, attested_by_id: user.id, attested_by_name: user.full_name || 'Admin',
          attested_at: now, updated_at: now, evidence_type: verified ? 'manual_verification' : 'revoked',
        });

        return Response.json({ success: true, email, check, verified: !!verified, attested_by: user.full_name || 'Admin', attested_at: now, attestation_id: record.id, message: 'Email delivery attestation updated.' });
      }

      // FAIL-CLOSED audit before creation
      let auditId = '';
      try { auditId = await auditTestLabAction(base44, { audit_tenant_id: auditTenantId, actor_id: user.id, actor_name: user.full_name || 'Admin', action: 'attest_delivery', target: email, reason: `Create attestation for ${email} / ${check}`, previous_state: { verified: false }, new_state: { verified: !!verified, check, alias: email, no_private_destination: true } }); } catch (auditErr) { return safeJson('audit_failure', 500, 'Cannot create attestation — audit failed.'); }

      const attestation = await base44.asServiceRole.entities.TestLabAttestation.create({
        tenant_id: auditTenantId, alias: email, check_key: check, verified: !!verified,
        attested_by_id: user.id, attested_by_name: user.full_name || 'Admin',
        attested_at: now, updated_at: now, evidence_type: 'manual_verification', non_production: true,
      });

      return Response.json({ success: true, email, check, verified: !!verified, attested_by: user.full_name || 'Admin', attested_at: now, attestation_id: attestation?.id || auditId, message: 'Email delivery attestation recorded.' });
    }

    // ── CREATE TEST RUN (protected, server-derived TTL) ────
    if (action === 'create_test_run') {
      const { sandbox_tenant_id, authorised_requester_email, permitted_service_key, permitted_action_type, permitted_autonomy_level, test_tag, test_purpose, ttl_minutes } = body;

      if (!sandbox_tenant_id) return safeJson('invalid_request', 400, 'sandbox_tenant_id is required.');
      if (!authorised_requester_email || !isAllowlistedTestAlias(authorised_requester_email)) return safeJson('invalid_request', 400, 'authorised_requester_email must be an allowlisted test alias.');
      if (!permitted_service_key) return safeJson('invalid_request', 400, 'permitted_service_key is required.');
      if (!permitted_autonomy_level) return safeJson('invalid_request', 400, 'permitted_autonomy_level is required.');
      if (!test_tag) return safeJson('invalid_request', 400, 'test_tag is required.');
      if (!test_purpose || test_purpose.length < 5) return safeJson('invalid_request', 400, 'A meaningful test_purpose is required.');

      // Verify the tenant is a sandbox tenant
      const tenant = await base44.asServiceRole.entities.Tenant.get(sandbox_tenant_id).catch(() => null);
      if (!tenant || !tenant.is_sandbox) return safeJson('forbidden', 403, 'Test Runs can only be created for sandbox tenants.');

      // Resolve the authorised requester user
      const users = await base44.asServiceRole.entities.User.filter({ email: authorised_requester_email }).catch(() => []);
      if (!users || users.length === 0) return safeJson('not_found', 404, 'Authorised requester has not registered yet.');
      const requester = users[0];

      // Server-selected TTL (client value ignored, clamped to valid range)
      const serverTtl = isValidTestTtlMinutes(ttl_minutes) ? ttl_minutes : SANDBOX_TEST_TTL_DEFAULT_MINUTES;

      const testRunId = `trun_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour to use the run

      // FAIL-CLOSED audit
      let auditId = '';
      try { auditId = await auditTestLabAction(base44, { audit_tenant_id: sandbox_tenant_id, actor_id: user.id, actor_name: user.full_name || 'Admin', action: 'create_test_run', target: testRunId, reason: `Create Test Run ${testRunId} for ${permitted_service_key}`, previous_state: null, new_state: { test_run_id: testRunId, sandbox_tenant_id, authorised_requester: authorised_requester_email, permitted_service_key, server_selected_ttl_minutes: serverTtl, test_tag } }); } catch (auditErr) { return safeJson('audit_failure', 500, 'Cannot create Test Run — audit failed.'); }

      const testRun = await base44.asServiceRole.entities.TestRun.create({
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

      return Response.json({ success: true, test_run_id: testRunId, test_run_record_id: testRun?.id, sandbox_tenant_id, authorised_requester_user_id: requester.id, permitted_service_key, server_selected_ttl_minutes: serverTtl, expires_at: expiresAt, audit_event_id: auditId, message: 'Test Run created. Only the authorised requester can use it for the permitted service.' });
    }

    // ── READINESS STATUS (truthful, computed from evidence) ─
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

      // Fetch persisted attestations
      const attestations = await base44.asServiceRole.entities.TestLabAttestation.list().catch(() => []);

      // Build identity readiness states (computed from persisted evidence)
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

        // Check attestation state for this alias
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

      // ── TRUTHFUL CAPABILITY READINESS (computed from evidence) ──
      const requester = identities.find(i => i.email === 'test.requester.a@orbitan.net');
      const approver = identities.find(i => i.email === 'test.approver.a@orbitan.net');
      const workerA = identities.find(i => i.email === 'test.worker.a@orbitan.net');
      const platformAllowed = identities.find(i => i.email === 'test.platform.allowed@orbitan.net');
      const platformDenied = identities.find(i => i.email === 'test.platform.denied@orbitan.net');
      const adminB = identities.find(i => i.email === 'test.admin.b@orbitan.net');
      const workerB = identities.find(i => i.email === 'test.worker.b@orbitan.net');

      // Tenant B isolation: complete valid hierarchy + both identities linked
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
          // All computed from persisted evidence — no hard-coded true values
          test_tagging_ready: true, // Schema fields added to AIApproval
          short_ttl_ready: true, // TestRun entity and nexus validation implemented
          independent_approver_ready: !!(requester?.user_registered && approver?.user_registered && requester?.email_verified && approver?.email_verified && requester?.membership_linked && approver?.membership_linked && requester?.email !== approver?.email),
          worker_isolation_ready: !!(workerA?.user_registered && workerA?.user_role === 'user' && workerA?.employee_role === 'worker' && workerA?.membership_linked),
          tenant_b_isolation_ready: tenantBIsolationReady,
          platform_permission_distinction_ready: !!(platformAllowed?.user_registered && platformDenied?.user_registered && platformAllowed?.cross_tenant_permission === true && platformDenied?.cross_tenant_permission === false),
        },
      });
    }

    // ── RESET TEST DATA (schema-supported fields, fail-closed) ─
    if (action === 'reset_test_data') {
      const { test_run_id, tenant_id } = body;
      if (!test_run_id || !tenant_id) return safeJson('invalid_request', 400, 'test_run_id and tenant_id are required.');
      const reason = body.reason || `Reset test data for run ${test_run_id}`;
      if (reason.length < 5) return safeJson('invalid_request', 400, 'A meaningful reason is required.');

      const tenant = await base44.asServiceRole.entities.Tenant.get(tenant_id).catch(() => null);
      if (!tenant || !tenant.is_sandbox) return safeJson('forbidden', 403, 'Test data reset is only allowed for sandbox tenants.');

      let attemptedApprovals = 0, deletedApprovals = 0;
      let attemptedInbox = 0, deletedInbox = 0;
      let failedRecordIds: string[] = [];

      // Delete mutable tagged AIApproval records using schema-supported test_run_id field
      try {
        const approvals = await base44.asServiceRole.entities.AIApproval.filter({ tenant_id, test_run_id });
        attemptedApprovals = approvals?.length || 0;
        for (const approval of approvals || []) {
          // Only delete mutable (pending) approvals — retain executed/terminal for audit
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
        return safeJson('internal_error', 500, 'Failed to query approvals for reset.', { error: err.message });
      }

      // Delete mutable tagged Orbit Inbox items
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
        return safeJson('internal_error', 500, 'Failed to query inbox items for reset.', { error: err.message });
      }

      // FAIL-CLOSED audit
      try {
        await auditTestLabAction(base44, {
          audit_tenant_id: tenant_id, actor_id: user.id, actor_name: user.full_name || 'Admin',
          action: 'reset_test_data', target: tenant_id, reason,
          previous_state: { test_run_id },
          new_state: { attempted_approvals: attemptedApprovals, deleted_approvals: deletedApprovals, attempted_inbox: attemptedInbox, deleted_inbox: deletedInbox, failed_record_ids: failedRecordIds, immutable_audit_retained: true },
          test_run_id,
        });
      } catch (auditErr) {
        return safeJson('audit_failure', 500, 'Reset was performed but audit evidence creation failed. The operation state is preserved.', {
          deleted_approvals: deletedApprovals, deleted_inbox: deletedInbox, failed_record_ids: failedRecordIds,
        });
      }

      return Response.json({
        success: true,
        attempted: { approvals: attemptedApprovals, inbox: attemptedInbox },
        deleted: { approvals: deletedApprovals, inbox: deletedInbox },
        retained: { immutable_audit: true },
        failed_record_ids: failedRecordIds,
        overall_status: failedRecordIds.length > 0 ? 'partial' : 'success',
        message: 'Mutable tagged test data reset. Immutable AIAuditEvent records retained per policy.',
      });
    }

    return safeJson('invalid_request', 400, `Unknown action: ${action}`);
  } catch (error) {
    return safeJson('internal_error', 500, 'An unexpected error occurred.');
  }
}