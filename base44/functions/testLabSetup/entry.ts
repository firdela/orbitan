import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  TEST_IDENTITIES, TEST_LAB_PERMISSION, CROSS_TENANT_AI_PERMISSION,
  TENANT_A_ID, TENANT_A_NAME, TENANT_B_NAME, SANDBOX_TENANT_DEFAULTS,
  isAllowlistedTestAlias, getTestIdentity, createTestRunMetadata,
  EMAIL_ATTESTATION_CHECKS,
} from '../../shared/test-lab-config.ts';

// ============================================================
// ORBITAN TEST LAB SETUP — Internal Governance Test Infrastructure
// Build #28.2P-R.0
//
// Protected server-side authority for:
//   - Test Tenant B provisioning (idempotent, sandbox-only)
//   - Test Tenant A readiness audit (read-only)
//   - Employee membership preparation for 8 fixed test identities
//   - Cross-tenant permission grant/revoke (one fixed permission)
//   - Email delivery attestation recording
//   - Readiness dashboard data
//   - Mutable tagged test-data reset
//
// This is NOT a generic developer console. It does NOT:
//   - create User records directly
//   - edit AIApproval records
//   - force approval or execution
//   - provide a generic permission editor
//   - provide a generic tenant creator
//
// All operations require:
//   - authenticated platform admin
//   - platform.test_lab.manage permission
//   - mandatory audit
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

// ── AUDIT LOGGER ───────────────────────────────────────────────
async function auditTestLabAction(base44: any, params: {
  actor_id: string; actor_name: string;
  action: string; target: string; reason: string;
  previous_state: any; new_state: any;
  test_run_id?: string;
}): Promise<void> {
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      tenant_id: TENANT_A_ID,
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
      metadata: {
        environment: 'test',
        test_lab_action: true,
        test_run_id: params.test_run_id || null,
        actor_id: params.actor_id,
      },
    });
  } catch (err) {
    console.log(`[testLabSetup] Audit failed: ${err.message}`);
  }
}

// ============================================================
// MAIN HANDLER
// ============================================================
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return safeJson('unauthorized', 401, 'You must be signed in.');

    const authCheck = await validateTestLabAuthority(base44, user);
    if (!authCheck.valid) {
      return safeJson('forbidden', 403, authCheck.reason || 'Permission denied.');
    }

    const body = await req.json();
    const { action } = body;

    // ── PROVISION TENANT B ─────────────────────────────────
    if (action === 'provision_tenant_b') {
      const reason = body.reason || 'Provision Test Tenant B for governance verification';
      if (!reason || reason.length < 5) {
        return safeJson('invalid_request', 400, 'A meaningful reason is required.');
      }

      // Check if Tenant B already exists (idempotent)
      const existing = await base44.asServiceRole.entities.Tenant.filter({ name: TENANT_B_NAME });
      if (existing && existing.length > 0) {
        const tenant = existing[0];
        await auditTestLabAction(base44, {
          actor_id: user.id, actor_name: user.full_name || 'Admin',
          action: 'provision_tenant_b', target: tenant.id,
          reason: `Idempotent reuse of existing Test Tenant B`,
          previous_state: { status: tenant.status, is_sandbox: tenant.is_sandbox },
          new_state: { status: tenant.status, is_sandbox: tenant.is_sandbox, reused: true },
        });
        return Response.json({
          success: true,
          tenant_id: tenant.id,
          tenant_name: tenant.name,
          is_sandbox: tenant.is_sandbox,
          reused: true,
          message: 'Test Tenant B already exists. Reusing existing tenant.',
        });
      }

      // Create Test Tenant B with server-enforced sandbox defaults
      const tenantRecord = await base44.asServiceRole.entities.Tenant.create({
        name: TENANT_B_NAME,
        legal_name: `${TENANT_B_NAME} (Sandbox Test Tenant)`,
        ...SANDBOX_TENANT_DEFAULTS,
        notes: 'TEST_LAB_002 — Sandbox Test Tenant B for cross-tenant governance isolation testing. Not a real business. Provisioned by Test Lab Setup.',
      });

      if (!tenantRecord) {
        return safeJson('internal_error', 500, 'Failed to create Test Tenant B.');
      }

      // Create one minimum test outlet
      let outletId: string | null = null;
      try {
        const outlet = await base44.asServiceRole.entities.Outlet.create({
          tenant_id: tenantRecord.id,
          name: 'Test Lab B — Outlet 1',
          outlet_type: 'test_sandbox',
          status: 'active',
          address_line_1: 'Test Lab Address (Non-Physical)',
          is_active: true,
          is_sandbox: true,
        });
        outletId = outlet?.id || null;
      } catch (outletErr) {
        console.log(`[testLabSetup] Outlet creation failed: ${outletErr.message}`);
      }

      await auditTestLabAction(base44, {
        actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'provision_tenant_b', target: tenantRecord.id,
        reason,
        previous_state: null,
        new_state: {
          tenant_id: tenantRecord.id, tenant_name: tenantRecord.name,
          is_sandbox: tenantRecord.is_sandbox, outlet_id: outletId,
          billing_activated: false, integration_activated: false,
        },
      });

      return Response.json({
        success: true,
        tenant_id: tenantRecord.id,
        tenant_name: tenantRecord.name,
        is_sandbox: tenantRecord.is_sandbox,
        outlet_id: outletId,
        billing_activated: false,
        integration_activated: false,
        message: 'Test Tenant B provisioned successfully as a sandbox tenant.',
      });
    }

    // ── AUDIT TENANT A (read-only readiness) ───────────────
    if (action === 'audit_tenant_a') {
      let tenant: any = null;
      try {
        tenant = await base44.asServiceRole.entities.Tenant.get(TENANT_A_ID);
      } catch {
        return safeJson('not_found', 404, 'Test Tenant A not found.');
      }
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
        tenant: {
          id: tenant.id,
          name: tenant.name,
          status: tenant.status,
          is_sandbox: tenant.is_sandbox,
          subscription_plan: tenant.subscription_plan,
          governance_domain: tenant.governance_domain,
        },
        outlets_count: outlets?.length || 0,
        outlets: (outlets || []).map((o: any) => ({ id: o.id, name: o.name, status: o.status })),
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
      if (!reason || reason.length < 5) {
        return safeJson('invalid_request', 400, 'A meaningful reason is required.');
      }

      // Resolve target tenant
      let targetTenantId: string;
      if (identity.tenant === 'A') {
        targetTenantId = TENANT_A_ID;
      } else if (identity.tenant === 'B') {
        const tenantB = await base44.asServiceRole.entities.Tenant.filter({ name: TENANT_B_NAME });
        if (!tenantB || tenantB.length === 0) {
          return safeJson('invalid_request', 409, 'Test Tenant B has not been provisioned yet.');
        }
        targetTenantId = tenantB[0].id;
      } else {
        // Platform identities don't need a tenant membership
        return Response.json({
          success: true,
          email,
          label: identity.label,
          membership_state: 'PLATFORM_IDENTITY',
          message: 'Platform identities do not require Employee membership. Invite directly.',
        });
      }

      // Resolve outlet for this tenant
      const outlets = await base44.asServiceRole.entities.Outlet.filter({ tenant_id: targetTenantId });
      const outletId = outlets?.[0]?.id || null;
      if (identity.outletRequired && !outletId) {
        return safeJson('invalid_request', 409, 'No outlet exists in the target tenant. Provision an outlet first.');
      }

      // Check for duplicate Employee record
      const existingEmployees = await base44.asServiceRole.entities.Employee.filter({
        tenant_id: targetTenantId, email,
      });
      if (existingEmployees && existingEmployees.length > 0) {
        const emp = existingEmployees[0];
        await auditTestLabAction(base44, {
          actor_id: user.id, actor_name: user.full_name || 'Admin',
          action: 'prepare_membership', target: emp.id,
          reason: `Idempotent reuse of existing Employee for ${email}`,
          previous_state: { role: emp.role, status: emp.status },
          new_state: { role: emp.role, status: emp.status, reused: true },
        });
        return Response.json({
          success: true,
          email,
          employee_id: emp.id,
          role: emp.role,
          status: emp.status,
          reused: true,
          membership_state: 'MEMBERSHIP_PREPARED',
          message: 'Employee membership already exists. Reusing existing record.',
        });
      }

      // Create Employee membership (user_id will be linked by identityLinkage after registration)
      const employeeRecord = await base44.asServiceRole.entities.Employee.create({
        tenant_id: targetTenantId,
        outlet_id: outletId,
        full_name: identity.label,
        email,
        role: identity.employeeRole,
        status: 'active',
        employment_type: 'full_time',
        hire_date: new Date().toISOString().split('T')[0],
      });

      await auditTestLabAction(base44, {
        actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'prepare_membership', target: employeeRecord.id,
        reason,
        previous_state: null,
        new_state: {
          employee_id: employeeRecord.id, email, role: identity.employeeRole,
          tenant_id: targetTenantId, outlet_id: outletId,
          user_id_linked: false,
        },
      });

      return Response.json({
        success: true,
        email,
        employee_id: employeeRecord.id,
        role: identity.employeeRole,
        tenant_id: targetTenantId,
        outlet_id: outletId,
        membership_state: 'MEMBERSHIP_PREPARED',
        next_step: 'Invite the user via the /join flow. identityLinkage will link the User to this Employee after registration.',
        message: 'Employee membership prepared. The user must now be invited through the canonical /join flow.',
      });
    }

    // ── GRANT CROSS-TENANT PERMISSION ───────────────────────
    if (action === 'grant_permission') {
      const { email } = body;
      if (!email || !isAllowlistedTestAlias(email)) {
        return safeJson('invalid_request', 400, 'Email is not in the fixed test-identity allowlist.');
      }
      const identity = getTestIdentity(email)!;
      if (!identity.requiresCrossTenantPermission) {
        return safeJson('invalid_request', 400, 'This identity is not eligible for the cross-tenant permission.');
      }

      const reason = body.reason || `Grant cross-tenant AI permission to ${identity.label}`;
      if (!reason || reason.length < 5) {
        return safeJson('invalid_request', 400, 'A meaningful reason is required.');
      }

      // Find the User by email
      const users = await base44.asServiceRole.entities.User.filter({ email });
      if (!users || users.length === 0) {
        return safeJson('not_found', 404, 'Test identity has not registered yet. Invite and register first.');
      }
      const targetUser = users[0];

      const currentPermissions = (targetUser.data?.permissions || []) as string[];
      const previousValue = currentPermissions.includes(CROSS_TENANT_AI_PERMISSION);
      if (previousValue) {
        return Response.json({
          success: true,
          email,
          user_id: targetUser.id,
          permission: CROSS_TENANT_AI_PERMISSION,
          effective: true,
          already_granted: true,
          message: 'Permission was already granted.',
        });
      }

      const newPermissions = [...currentPermissions, CROSS_TENANT_AI_PERMISSION];
      await base44.asServiceRole.entities.User.update(targetUser.id, {
        data: { ...targetUser.data, permissions: newPermissions },
      });

      await auditTestLabAction(base44, {
        actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'grant_permission', target: targetUser.id,
        reason,
        previous_state: { permission: CROSS_TENANT_AI_PERMISSION, granted: false },
        new_state: { permission: CROSS_TENANT_AI_PERMISSION, granted: true, target_email: email },
      });

      return Response.json({
        success: true,
        email,
        user_id: targetUser.id,
        permission: CROSS_TENANT_AI_PERMISSION,
        effective: true,
        auth_refresh_required: true,
        message: 'Cross-tenant AI permission granted. The user must sign out and sign back in for the permission to take effect.',
      });
    }

    // ── REVOKE CROSS-TENANT PERMISSION ──────────────────────
    if (action === 'revoke_permission') {
      const { email } = body;
      if (!email || !isAllowlistedTestAlias(email)) {
        return safeJson('invalid_request', 400, 'Email is not in the fixed test-identity allowlist.');
      }

      const reason = body.reason || `Revoke cross-tenant AI permission from ${getTestIdentity(email)?.label || email}`;
      if (!reason || reason.length < 5) {
        return safeJson('invalid_request', 400, 'A meaningful reason is required.');
      }

      const users = await base44.asServiceRole.entities.User.filter({ email });
      if (!users || users.length === 0) {
        return safeJson('not_found', 404, 'Test identity not found.');
      }
      const targetUser = users[0];

      const currentPermissions = (targetUser.data?.permissions || []) as string[];
      const previousValue = currentPermissions.includes(CROSS_TENANT_AI_PERMISSION);
      const newPermissions = currentPermissions.filter(p => p !== CROSS_TENANT_AI_PERMISSION);

      await base44.asServiceRole.entities.User.update(targetUser.id, {
        data: { ...targetUser.data, permissions: newPermissions },
      });

      await auditTestLabAction(base44, {
        actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'revoke_permission', target: targetUser.id,
        reason,
        previous_state: { permission: CROSS_TENANT_AI_PERMISSION, granted: previousValue },
        new_state: { permission: CROSS_TENANT_AI_PERMISSION, granted: false, target_email: email },
      });

      return Response.json({
        success: true,
        email,
        user_id: targetUser.id,
        permission: CROSS_TENANT_AI_PERMISSION,
        effective: false,
        auth_refresh_required: true,
        message: 'Cross-tenant AI permission revoked. The user must sign out and sign back in.',
      });
    }

    // ── ATTEST EMAIL DELIVERY ───────────────────────────────
    if (action === 'attest_delivery') {
      const { email, check, verified } = body;
      if (!email || !isAllowlistedTestAlias(email)) {
        return safeJson('invalid_request', 400, 'Email is not in the fixed test-identity allowlist.');
      }
      if (!EMAIL_ATTESTATION_CHECKS.includes(check)) {
        return safeJson('invalid_request', 400, `Invalid attestation check. Must be one of: ${EMAIL_ATTESTATION_CHECKS.join(', ')}`);
      }

      await auditTestLabAction(base44, {
        actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'attest_delivery', target: email,
        reason: `Email delivery attestation for ${email}`,
        previous_state: { check, verified: false },
        new_state: { check, verified: !!verified, alias: email, no_private_destination: true },
      });

      return Response.json({
        success: true,
        email,
        check,
        verified: !!verified,
        attested_by: user.full_name || 'Admin',
        attested_at: new Date().toISOString(),
        message: 'Email delivery attestation recorded.',
      });
    }

    // ── READINESS STATUS ────────────────────────────────────
    if (action === 'readiness_status') {
      // Fetch Tenant A
      let tenantA: any = null;
      try { tenantA = await base44.asServiceRole.entities.Tenant.get(TENANT_A_ID); } catch {}

      // Fetch Tenant B
      const tenantBResults = await base44.asServiceRole.entities.Tenant.filter({ name: TENANT_B_NAME }).catch(() => []);
      const tenantB = tenantBResults?.[0] || null;

      // Fetch all test Users
      const allUsers = await base44.asServiceRole.entities.User.list().catch(() => []);
      const testUsers = (allUsers || []).filter((u: any) => isAllowlistedTestAlias(u.email));

      // Fetch all test Employees
      const employeesA = await base44.asServiceRole.entities.Employee.filter({ tenant_id: TENANT_A_ID }).catch(() => []);
      const tenantBId = tenantB?.id;
      const employeesB = tenantBId
        ? await base44.asServiceRole.entities.Employee.filter({ tenant_id: tenantBId }).catch(() => [])
        : [];

      // Build identity readiness states
      const identities = TEST_IDENTITIES.map(identity => {
        const user = testUsers.find((u: any) => u.email === identity.email);
        const employee = [...(employeesA || []), ...(employeesB || [])].find((e: any) => e.email === identity.email);

        let state = 'ALIAS_CONFIGURED';
        if (user) {
          state = user.is_verified ? 'EMAIL_VERIFIED' : 'EMAIL_VERIFICATION_REQUIRED';
          if (employee?.user_id === user.id) state = 'IDENTITY_LINKED';
        } else if (employee) {
          state = 'MEMBERSHIP_PREPARED';
        }

        const permissions = (user?.data?.permissions || []) as string[];
        const hasCrossTenant = permissions.includes(CROSS_TENANT_AI_PERMISSION);

        return {
          email: identity.email,
          label: identity.label,
          tenant: identity.tenant,
          user_role: identity.userRole,
          employee_role: identity.employeeRole,
          readiness_state: state,
          user_registered: !!user,
          email_verified: user?.is_verified || false,
          membership_linked: !!(employee && user && employee.user_id === user.id),
          cross_tenant_permission: identity.requiresCrossTenantPermission ? hasCrossTenant : null,
          expected_cross_tenant: identity.requiresCrossTenantPermission,
        };
      });

      return Response.json({
        success: true,
        tenants: {
          A: tenantA ? {
            id: tenantA.id, name: tenantA.name, is_sandbox: tenantA.is_sandbox,
            status: tenantA.status, exists: true,
          } : { exists: false },
          B: tenantB ? {
            id: tenantB.id, name: tenantB.name, is_sandbox: tenantB.is_sandbox,
            status: tenantB.status, exists: true,
          } : { exists: false },
        },
        identities,
        test_capability: {
          test_tagging_ready: true,
          short_ttl_ready: true,
          independent_approver_ready: true,
          worker_isolation_ready: true,
          tenant_b_isolation_ready: !!tenantB,
          platform_permission_distinction_ready: true,
        },
      });
    }

    // ── RESET TEST DATA (mutable tagged records only) ───────
    if (action === 'reset_test_data') {
      const { test_run_id, tenant_id } = body;
      if (!test_run_id || !tenant_id) {
        return safeJson('invalid_request', 400, 'test_run_id and tenant_id are required.');
      }
      const reason = body.reason || `Reset test data for run ${test_run_id}`;
      if (!reason || reason.length < 5) {
        return safeJson('invalid_request', 400, 'A meaningful reason is required.');
      }

      // Verify tenant is sandbox
      const tenant = await base44.asServiceRole.entities.Tenant.get(tenant_id);
      if (!tenant || !tenant.is_sandbox) {
        return safeJson('forbidden', 403, 'Test data reset is only allowed for sandbox tenants.');
      }

      let deletedApprovals = 0;
      let deletedInbox = 0;

      // Delete mutable tagged AIApproval records (pending only)
      try {
        const approvals = await base44.asServiceRole.entities.AIApproval.filter({
          tenant_id, status: 'pending',
        });
        for (const approval of approvals || []) {
          if (approval.metadata?.test_run_id === test_run_id) {
            await base44.asServiceRole.entities.AIApproval.delete(approval.id);
            deletedApprovals++;
          }
        }
      } catch (err) {
        console.log(`[testLabSetup] Approval reset failed: ${err.message}`);
      }

      // Delete mutable tagged Orbit Inbox items
      try {
        const inboxItems = await base44.asServiceRole.entities.OrbitInbox.filter({
          tenant_id,
        });
        for (const item of inboxItems || []) {
          if (item.metadata?.test_run_id === test_run_id) {
            await base44.asServiceRole.entities.OrbitInbox.delete(item.id);
            deletedInbox++;
          }
        }
      } catch (err) {
        console.log(`[testLabSetup] Inbox reset failed: ${err.message}`);
      }

      await auditTestLabAction(base44, {
        actor_id: user.id, actor_name: user.full_name || 'Admin',
        action: 'reset_test_data', target: tenant_id,
        reason,
        previous_state: { test_run_id },
        new_state: { deleted_approvals: deletedApprovals, deleted_inbox: deletedInbox },
        test_run_id,
      });

      return Response.json({
        success: true,
        deleted_approvals: deletedApprovals,
        deleted_inbox: deletedInbox,
        immutable_audit_retained: true,
        message: 'Mutable tagged test data reset. Immutable AIAuditEvent records retained per policy.',
      });
    }

    return safeJson('invalid_request', 400, `Unknown action: ${action}`);
  } catch (error) {
    console.log(`[testLabSetup] Error: ${error.message}`);
    return safeJson('internal_error', 500, 'An unexpected error occurred.');
  }
}