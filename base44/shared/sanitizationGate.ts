/**
 * OrbitanOS — Sanitization Gate (ADR-0044: Sovereign Intelligence Model)
 *
 * The single, authoritative enforcement point for the Zero-PII principle.
 * Any function that intends to emit an operational intelligence signal MUST
 * route through this module. The gate:
 *
 *   1. Validates the signal key against the OperationalMetric registry.
 *      Unregistered keys are silently dropped (logged, not errored —
 *      errors could leak signal existence to an attacker).
 *   2. Strips all identifying context (tenant_id, outlet_id, actor_id,
 *      entity content, monetary amounts, names) from the payload.
 *   3. Retains only the abstracted dimensions declared in the metric's
 *      aggregation_rules.group_by (industry, pack, module, shield_mode).
 *   4. Checks tenant consent (requires_tenant_consent) if a tenant record
 *      is provided. Non-consenting tenants' signals are dropped.
 *
 * Architectural invariants:
 *   - This module NEVER writes to a central data store. It returns a
 *     sanitized payload object; the caller is responsible for transmission.
 *   - This module NEVER receives raw entity records. Callers must extract
 *     the signal value (e.g., latency_ms) before calling.
 *   - There is no bypass path. Any code that emits intelligence data
 *     without routing through this gate is an architecture violation.
 *
 * Usage:
 *   import { sanitizeSignal } from '@/shared/sanitizationGate';
 *
 *   const signal = await sanitizeSignal(base44, {
 *     metric_key: 'shield_evaluation_latency_ms',
 *     value: 340,
 *     product_context: { industry: 'food_beverage', enabled_packs: ['fnb'] },
 *     tenant_id: resolvedTenantId
 *   });
 *   if (signal) { /* transmit signal to central hub *\/ }
 */

/**
 * Fields that are ALWAYS stripped from any payload passing through the gate.
 * This is the hard Zero-PII enforcement list. If any of these appear in
 * the output, it is a bug in the gate, not in the caller.
 */
const FORBIDDEN_FIELDS = [
  'tenant_id',
  'tenant_name',
  'outlet_id',
  'outlet_name',
  'actor_id',
  'actor_name',
  'actor_role',
  'created_by_id',
  'created_by_name',
  'signed_by_id',
  'signed_by_name',
  'uploaded_by',
  'uploaded_by_name',
  'email',
  'phone',
  'full_name',
  'contact_person',
  'contact_email',
  'contact_phone',
  'address',
  'ip_address',
  'target_record_id',
  'entity_content',
  'data',
  'previous_state',
  'new_state',
  'details',
  'justification',
  'memo',
  'vendor',
  'description',
  'notes',
];

/**
 * Dimensions that ARE permitted in the sanitized output. These are the
 * only fields that may appear alongside the signal value.
 */
const PERMITTED_DIMENSIONS = [
  'industry',
  'pack',
  'module',
  'shield_mode',
  'subscription_plan',
  'signal_value',
  'metric_key',
  'emitted_at',
];

/**
 * Sanitize a signal emission according to ADR-0044.
 *
 * @param {object} base44 - The Base44 SDK client (service role).
 * @param {object} params - The emission parameters.
 * @param {string} params.metric_key - The registered OperationalMetric key.
 * @param {number|string} params.value - The computed signal value (already extracted locally).
 * @param {object} params.product_context - Abstracted context from the tenant record.
 * @param {string} [params.tenant_id] - Tenant ID (used ONLY for consent check, never transmitted).
 * @returns {Promise<object|null>} The sanitized signal object, or null if dropped.
 */
export async function sanitizeSignal(base44, params) {
  const { metric_key, value, product_context = {}, tenant_id } = params;

  if (!metric_key) {
    console.warn('[sanitizationGate] Emission dropped: missing metric_key');
    return null;
  }

  // ── Step 1: Registry Validation ──────────────────────────────────
  // Look up the metric definition. If not registered or inactive, drop.
  let metricDef;
  try {
    const defs = await base44.asServiceRole.entities.OperationalMetric.filter({
      metric_key,
      is_active: true,
    });
    // Prefer system default; fall back to tenant-specific override if present
    metricDef = defs.find(d => d.tenant_id === 'system') || defs[0];
  } catch (e) {
    // Fail-closed: if registry is unreachable, drop the signal.
    console.warn(`[sanitizationGate] Emission dropped for "${metric_key}": registry unreachable`);
    return null;
  }

  if (!metricDef) {
    // Silently drop — do not error (errors could leak signal existence)
    console.debug(`[sanitizationGate] Emission dropped: unregistered metric_key "${metric_key}"`);
    return null;
  }

  // ── Step 2: Consent Check ────────────────────────────────────────
  if (metricDef.requires_tenant_consent && tenant_id) {
    try {
      const tenants = await base44.asServiceRole.entities.Tenant.filter({ id: tenant_id });
      const tenant = tenants[0];
      const consentGranted = tenant?.feature_flags?.platform_intelligence_consent === true;
      if (!consentGranted) {
        // Tenant has not opted in — drop the signal silently
        return null;
      }
    } catch {
      // Fail-closed on consent lookup failure
      return null;
    }
  }

  // ── Step 3: Build Sanitized Payload ──────────────────────────────
  // Extract only permitted dimensions from product_context.
  const sanitized = {
    metric_key,
    signal_value: value,
    module: metricDef.module,
    emitted_at: new Date().toISOString(),
  };

  // Map product_context fields to permitted dimensions
  if (product_context.industry) sanitized.industry = product_context.industry;
  if (product_context.enabled_packs?.length) sanitized.pack = product_context.enabled_packs;
  if (product_context.governance_domain) sanitized.shield_mode = product_context.governance_domain;
  if (product_context.subscription_plan) sanitized.subscription_plan = product_context.subscription_plan;

  // ── Step 4: Final PII Scan ───────────────────────────────────────
  // Defensive sweep: ensure no forbidden field leaked into the output.
  for (const field of FORBIDDEN_FIELDS) {
    if (field in sanitized) {
      console.error(`[sanitizationGate] CRITICAL: forbidden field "${field}" detected in sanitized output — dropping emission`);
      return null;
    }
  }

  // Verify only permitted dimensions remain
  for (const key of Object.keys(sanitized)) {
    if (!PERMITTED_DIMENSIONS.includes(key)) {
      console.warn(`[sanitizationGate] Stripping unexpected field "${key}" from emission`);
      delete sanitized[key];
    }
  }

  return sanitized;
}

/**
 * Synchronous variant for cases where the metric definition is already
 * fetched (e.g., batch emission). Performs the PII stripping and dimension
 * filtering only — skips registry lookup and consent check.
 *
 * Use this ONLY when the caller has already validated the metric key
 * against the registry and checked consent. Prefer the async variant.
 */
export function sanitizePayloadSync(metric_key, value, product_context = {}) {
  const sanitized = {
    metric_key,
    signal_value: value,
    emitted_at: new Date().toISOString(),
  };

  if (product_context.industry) sanitized.industry = product_context.industry;
  if (product_context.enabled_packs?.length) sanitized.pack = product_context.enabled_packs;
  if (product_context.governance_domain) sanitized.shield_mode = product_context.governance_domain;
  if (product_context.subscription_plan) sanitized.subscription_plan = product_context.subscription_plan;

  // Final PII scan
  for (const field of FORBIDDEN_FIELDS) {
    if (field in sanitized) {
      console.error(`[sanitizationGate] CRITICAL: forbidden field "${field}" in sync sanitization — dropping`);
      return null;
    }
  }

  for (const key of Object.keys(sanitized)) {
    if (!PERMITTED_DIMENSIONS.includes(key)) {
      delete sanitized[key];
    }
  }

  return sanitized;
}

export { FORBIDDEN_FIELDS, PERMITTED_DIMENSIONS };