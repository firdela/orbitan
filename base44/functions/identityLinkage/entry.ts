import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { classifyLinkage } from '../../shared/identityLinkage.ts';

/**
 * Identity Linkage Service (RA-0005).
 * Stamps user_id onto Employee records whose email matches the
 * authenticated user. Decision logic delegated to the shared
 * classifyLinkage classifier (single source of the contract).
 * Idempotent, conflict-guarded, per-record audited.
 */
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
    const employees = await base44.asServiceRole.entities.Employee.filter({
      email: userEmail,
    });

    // ── Decision: classify via the shared canonical classifier ──
    const { linked, skipped, conflicts } = classifyLinkage(
      employees || [],
      { id: userId, email: userEmail }
    );

    // ── Apply stamps only to records marked linkable ──
    const linkedResults = [];
    for (const l of linked) {
      try {
        await base44.asServiceRole.entities.Employee.update(l.id, { user_id: userId });
        linkedResults.push(l);

        // ── Per-record AuditLog (tenant-scoped for traceability) ──
        try {
          await base44.asServiceRole.entities.AuditLog.create({
            tenant_id: l.tenant_id || '',
            actor_id: userId,
            actor_name: user.full_name || '',
            actor_role: user.role || '',
            action_type: 'identity_linked',
            module: 'system',
            target_entity: 'Employee',
            target_record_id: l.id,
            new_state: { user_id: userId, email: userEmail },
            details: `${user.full_name || userEmail} linked to Employee record ${l.id} (role: ${l.role || 'unknown'}).`,
            shield_outcome: 'not_evaluated',
          });
        } catch (auditErr) {
          console.error('[identityLinkage] audit log failed for', l.id, auditErr.message);
        }
      } catch (stampErr) {
        console.error('[identityLinkage] stamp failed for', l.id, stampErr.message);
        skipped.push({ id: l.id, reason: 'stamp_failed', error: stampErr.message });
      }
    }

    return Response.json({
      success: true,
      user_id: userId,
      email: userEmail,
      linked: linkedResults,
      skipped,
      conflicts,
      total: (employees || []).length,
    });
  } catch (error) {
    console.error('[identityLinkage] fatal:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});