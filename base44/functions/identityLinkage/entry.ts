// ============================================================
// ORBITANOS — Identity Linkage Service (RA-0005 Orbit Identity Model)
// Phase 1 — Build Manifest Foundation Layer
//
// THE governed linkage between the global User (identity) and the
// tenant-scoped Employee (membership). One User holds many Employee
// records, linked via Employee.user_id. Email is the discovery key
// at onboarding / invitation redemption; user_id is the canonical
// link once established.
//
// Contract:
//   - Authenticates the caller (proves email ownership).
//   - Finds every Employee record whose email matches the caller.
//   - Stamps user_id = caller.id on unlinked records (idempotent).
//   - NEVER overwrites an existing different user_id (identity-theft
//     guard). Conflicting records are skipped + reported.
//   - Writes an AuditLog entry per linked record (tenant-scoped).
//   - Uses asServiceRole for the stamp because the redeeming user
//     does not hold Employee update RLS across tenants; the function
//     is the trust boundary (it authenticated the email owner).
//
// Idempotent: re-invocation is a no-op for already-linked records.
// Fail-closed: any error returns 500 with a message; the frontend
// degrades gracefully (email fallback still resolves memberships).
// ============================================================

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = user.id;
    const userEmail = (user.email || '').toLowerCase().trim();
    if (!userEmail) {
      return Response.json({ error: 'Identity has no email — cannot link' }, { status: 400 });
    }

    // ── Discovery: all Employee records matching this email ──
    // (the OIM discovery key, per RA-0005).
    const employees = await base44.asServiceRole.entities.Employee.filter({
      email: userEmail,
    });

    const linked = [];
    const skipped = [];
    const conflicts = [];

    for (const emp of employees || []) {
      // 1. Already linked to THIS user — idempotent no-op.
      if (emp.user_id === userId) {
        skipped.push({ id: emp.id, reason: 'already_linked' });
        continue;
      }
      // 2. Linked to a DIFFERENT user — conflict. Do NOT overwrite.
      //    This is the identity-theft guard: a reclaimed email cannot
      //    hijack an existing membership. Reported for admin review.
      if (emp.user_id && emp.user_id !== userId) {
        conflicts.push({
          id: emp.id,
          tenant_id: emp.tenant_id,
          existing_user_id: emp.user_id,
        });
        continue;
      }

      // 3. Unlinked (user_id null/empty) — stamp the canonical link.
      try {
        await base44.asServiceRole.entities.Employee.update(emp.id, {
          user_id: userId,
        });
        linked.push({
          id: emp.id,
          tenant_id: emp.tenant_id,
          role: emp.role,
        });

        // ── Per-record AuditLog (tenant-scoped for traceability) ──
        try {
          await base44.asServiceRole.entities.AuditLog.create({
            tenant_id: emp.tenant_id || '',
            actor_id: userId,
            actor_name: user.full_name || '',
            actor_role: user.role || '',
            action_type: 'identity_linked',
            module: 'system',
            target_entity: 'Employee',
            target_record_id: emp.id,
            new_state: { user_id: userId, email: userEmail },
            details: `${user.full_name || userEmail} linked to Employee record ${emp.id} (role: ${emp.role || 'unknown'}).`,
            shield_outcome: 'not_evaluated',
          });
        } catch (auditErr) {
          console.error('[identityLinkage] audit log failed for', emp.id, auditErr.message);
        }
      } catch (stampErr) {
        console.error('[identityLinkage] stamp failed for', emp.id, stampErr.message);
        skipped.push({ id: emp.id, reason: 'stamp_failed', error: stampErr.message });
      }
    }

    return Response.json({
      success: true,
      user_id: userId,
      email: userEmail,
      linked,
      skipped,
      conflicts,
      total: (employees || []).length,
    });
  } catch (error) {
    console.error('[identityLinkage] fatal:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});