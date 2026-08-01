/**
 * OrbitanOS — Shared Service Utilities (Build #27H.1)
 * ──────────────────────────────────────────────────
 * Eliminates duplicated service-level logic across backend functions.
 *
 * Exports:
 *   serviceError(code, message, status, retryable) → Response
 *   stripSecrets(obj) → cleaned obj
 *   createAuditWriter(defaults) → writeAuditCritical(base44, payload)
 *
 * Exit-Ready: pure TypeScript, no Deno-specific APIs beyond Response.
 */

// ── Secret/token field names that must never enter AuditLog ──────────
const FORBIDDEN_KEYS = new Set([
  'password', 'token', 'secret', 'api_key', 'apikey', 'authorization',
  'access_token', 'refresh_token', 'private_key', 'client_secret',
]);

/**
 * stripSecrets — recursively removes forbidden keys from an object.
 * Used before writing state snapshots to AuditLog.
 */
export function stripSecrets(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripSecrets);
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) continue;
    cleaned[key] = typeof value === 'object' ? stripSecrets(value) : value;
  }
  return cleaned;
}

/**
 * serviceError — returns a structured error Response.
 * { error: { code, message, retryable } }
 * No stack traces, internal paths, or secrets exposed.
 */
export function serviceError(code, message, status = 400, retryable = false) {
  return Response.json({ error: { code, message, retryable } }, { status });
}

/**
 * createAuditWriter — factory that produces a fail-closed audit writer
 * with service-specific defaults. Each backend service creates its own
 * writer once at module scope.
 *
 * The returned function throws on write failure so calling mutations
 * can roll back.
 */
export function createAuditWriter(defaults) {
  return async function writeAuditCritical(base44, payload) {
    const p = {
      tenant_id: payload.tenant_id,
      outlet_id: payload.outlet_id || null,
      actor_id: payload.actor_id,
      actor_name: payload.actor_name || 'system',
      actor_role: payload.actor_role || 'system_event',
      action_type: payload.action_type,
      module: payload.module || defaults.module || 'system',
      category: payload.category || defaults.category || 'operational',
      severity: payload.severity || defaults.severity || 'info',
      event_source: payload.event_source || defaults.event_source || 'service',
      target_entity: payload.target_entity || defaults.target_entity || 'Unknown',
      target_record_id: payload.target_record_id,
      related_workflow: payload.related_workflow || defaults.related_workflow || null,
      link: payload.link || null,
      details: payload.details || '',
      previous_state: stripSecrets(payload.previous_state) || null,
      new_state: stripSecrets(payload.new_state) || null,
      ip_address: 'server_context',
    };
    if (!p.tenant_id || !p.actor_id || !p.action_type || !p.target_record_id) {
      throw new Error('Critical audit event missing required identifiers — aborting');
    }
    return await base44.asServiceRole.entities.AuditLog.create(p);
  };
}