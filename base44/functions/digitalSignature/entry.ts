import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

/**
 * OrbitanOS — Digital Signature Service
 * ─────────────────────────────────────
 * Creates a tamper-evident, immutable audit trail for compliance
 * sign-offs and procurement approvals. Computes a SHA-256 hash of
 * the record state at signing time and writes it to both the source
 * record and an AuditLog entry (the "notary" record).
 *
 * SOC 2 / Vanta evidence: every signature produces a verifiable
 * hash + audit log that can be exported as compliance evidence.
 *
 * Payload: { action: "sign", entity_name, record_id }
 * Returns:  { success, signature_hash, audit_log_id, signed_date }
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, entity_name, record_id } = body;

    if (action !== 'sign') {
      return Response.json({ error: 'Unknown action. Use action: "sign".' }, { status: 400 });
    }

    if (!entity_name || !record_id) {
      return Response.json({ error: 'entity_name and record_id are required' }, { status: 400 });
    }

    // ── Fetch the record server-side (tamper-proof) ──────────
    const record = await base44.asServiceRole.entities[entity_name]?.get?.(record_id);
    if (!record) {
      return Response.json({ error: 'Record not found' }, { status: 404 });
    }

    const tenant_id = record.tenant_id;
    if (!tenant_id) {
      return Response.json({ error: 'Record has no tenant_id' }, { status: 400 });
    }

    // ── Compute SHA-256 hash of the record state ─────────────
    // The hash excludes system fields that change on every update,
    // so the signature remains verifiable against the original content.
    const { id, created_date, updated_date, created_by_id, ...contentFields } = record;
    const contentJson = JSON.stringify(contentFields, Object.keys(contentFields).sort());
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(contentJson));
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const signedDate = new Date().toISOString();
    const signerName = user.full_name || user.email;
    const signerRole = user.role;

    // ── Update the source record with signature metadata ─────
    await base44.asServiceRole.entities[entity_name].update(record_id, {
      signed_by_id: user.id,
      signed_by_name: signerName,
      signed_by_role: signerRole,
      signed_date: signedDate,
      signature_hash: hashHex,
      status: entity_name === 'ComplianceRecord' ? 'approved' : record.status,
    });

    // ── Create the immutable AuditLog notary entry ──────────
    const auditEntry = await base44.asServiceRole.entities.AuditLog.create({
      tenant_id,
      actor_id: user.id,
      actor_name: signerName,
      actor_role: signerRole,
      action_type: 'digital_signature',
      module: entity_name === 'PurchaseOrder' ? 'procurement' : 'compliance',
      target_entity: entity_name,
      target_record_id: record_id,
      outlet_id: record.outlet_id || null,
      shield_outcome: 'override_approved',
      details: `Digital signature applied by ${signerName} (${signerRole}) on ${entity_name} [${record_id}]. Content hash: ${hashHex}. This serves as a tamper-evident notary record for SOC 2 compliance.`,
      new_state: {
        signed_by: signerName,
        signed_by_role: signerRole,
        signed_date: signedDate,
        signature_hash: hashHex,
        record_title: record.title || record.po_number || record.id,
      },
    });

    return Response.json({
      success: true,
      signature_hash: hashHex,
      audit_log_id: auditEntry.id,
      signed_date: signedDate,
      signed_by: signerName,
    });

  } catch (error) {
    console.error('[digitalSignature] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});