import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// ============================================================
// OrbitanOS Audit Bundle Generator (ADR-0031, Pillar 1)
//
// Assembles an immutable evidence bundle for a given audit scope:
//   - target_record_id (single-record trail), OR
//   - date range + optional module filter
//
// Returns a structured JSON bundle: a manifest with a SHA-256-style
// integrity hash, the matching AuditLog events, and resolved evidence
// metadata from ArtifactRecord. The frontend renders this as a
// downloadable PDF (jsPDF) for compliance / SOC 2 evidence.
//
// Invocation:
//   base44.functions.invoke('auditBundleGenerator', {
//     tenant_id, target_record_id, module?, date_from?, date_to?
//   })
// ============================================================

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Only tenant admins + platform admins may generate bundles —
    // these contain potentially sensitive governance evidence.
    const allowedRoles = ['admin', 'tenant_admin'];
    if (!allowedRoles.includes(user.role)) {
      return Response.json({ error: 'Forbidden — audit bundle generation requires admin privileges.' }, { status: 403 });
    }

    const body = await req.json();
    const { tenant_id, target_record_id, module, date_from, date_to, scope } = body || {};

    // ── Scope resolution ──
    // Platform admins may request scope='all_tenants' to bundle across all tenants.
    // Non-admins must always provide their own tenant_id.
    const allTenantsScope = scope === 'all_tenants' && user.role === 'admin';

    if (!tenant_id && !allTenantsScope) {
      return Response.json({ error: 'tenant_id is required (or scope=all_tenants for platform admins)' }, { status: 400 });
    }
    if (!target_record_id && !date_from && !date_to && !allTenantsScope) {
      return Response.json({ error: 'Provide target_record_id, a date range, or scope=all_tenants.' }, { status: 400 });
    }

    // ── Query AuditLog ──
    const filter = {};
    if (tenant_id) filter.tenant_id = tenant_id;
    if (target_record_id) filter.target_record_id = target_record_id;
    if (module) filter.module = module;

    const events = await base44.asServiceRole.entities.AuditLog.filter(filter, '-created_date', 500);

    // Apply date range filtering (server filter is less flexible for ranges)
    let scopedEvents = events || [];
    if (date_from) scopedEvents = scopedEvents.filter(e => e.created_date && new Date(e.created_date) >= new Date(date_from));
    if (date_to) scopedEvents = scopedEvents.filter(e => e.created_date && new Date(e.created_date) <= new Date(date_to + 'T23:59:59'));

    // ── Collect evidence URLs ──
    const evidenceUrls = new Set();
    const linkedArtifactIds = new Set();
    for (const ev of scopedEvents) {
      if (ev.evidence_urls) ev.evidence_urls.forEach(u => evidenceUrls.add(u));
      if (ev.override_id) linkedArtifactIds.add(ev.override_id);
    }

    // ── Resolve ArtifactRecord metadata for linked evidence ──
    let artifacts = [];
    if (evidenceUrls.size > 0 || linkedArtifactIds.size > 0) {
      try {
        const artifactFilter = {};
        if (tenant_id) artifactFilter.tenant_id = tenant_id;
        // Fetch tenant artifacts and match by storage_url or linked_entity_id
        const candidate = await base44.asServiceRole.entities.ArtifactRecord.filter(
          artifactFilter, '-created_date', 200
        );
        artifacts = (candidate || []).filter(a =>
          (a.storage_url && evidenceUrls.has(a.storage_url)) ||
          linkedArtifactIds.has(a.id) ||
          linkedArtifactIds.has(a.linked_entity_id)
        );
      } catch (artErr) {
        console.error('[auditBundleGenerator] artifact resolution failed:', artErr?.message || artErr);
      }
    }

    // ── Build manifest + integrity hash ──
    const generated_at = new Date().toISOString();
    const eventCount = scopedEvents.length;
    const artifactCount = artifacts.length;
    // Lightweight integrity fingerprint — not cryptographic, but
    // tamper-evident: changes if any event/artifact id or timestamp changes.
    const fingerprintSource = JSON.stringify({
      tenant_id, target_record_id, module, date_from, date_to,
      generated_at,
      event_ids: scopedEvents.map(e => e.id),
      event_timestamps: scopedEvents.map(e => e.created_date),
      artifact_ids: artifacts.map(a => a.id),
    });
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(fingerprintSource));
    const integrity_hash = [...new Uint8Array(hashBuffer)].map(b => b.toString(16).padStart(2, '0')).join('');

    const bundle = {
      manifest: {
        bundle_id: `BUNDLE-${integrity_hash.slice(0, 16).toUpperCase()}`,
        tenant_id: tenant_id || null,
        scope: allTenantsScope
          ? { type: 'all_tenants', date_from, date_to, module }
          : target_record_id
            ? { target_record_id, module }
            : { date_from, date_to, module },
        generated_at,
        generated_by: { id: user.id, name: user.full_name, role: user.role },
        integrity_hash,
        event_count: eventCount,
        artifact_count: artifactCount,
        platform: 'OrbitanOS',
        standard: 'SOC 2 evidence bundle (ADR-0031)',
      },
      events: scopedEvents.map(e => ({
        id: e.id,
        timestamp: e.created_date,
        actor_id: e.actor_id,
        actor_name: e.actor_name,
        actor_role: e.actor_role,
        action_type: e.action_type,
        module: e.module,
        target_entity: e.target_entity,
        target_record_id: e.target_record_id,
        details: e.details,
        shield_outcome: e.shield_outcome,
        justification: e.justification,
        ip_address: e.ip_address,
        evidence_urls: e.evidence_urls || [],
      })),
      artifacts: artifacts.map(a => ({
        id: a.id,
        title: a.title,
        artifact_type: a.artifact_type,
        status: a.status,
        storage_url: a.storage_url,
        uploaded_date: a.uploaded_date,
        reviewed_by_name: a.reviewed_by_name,
        reviewed_date: a.reviewed_date,
      })),
    };

    return Response.json(bundle);
  } catch (error) {
    console.error('[auditBundleGenerator] fatal:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});