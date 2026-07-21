import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ============================================================
// ORBIT NEXUS GATEWAY — Capability-Tiered Orchestrator (ADR-0046)
// The single, governed entry point for all AI intelligence.
//
// Contract (NexusRequest):
//   { service_key, payload, tenant_id, outlet_id? }
//
// Registry-Driven Architecture:
//   The gateway resolves capability definitions at runtime from the
//   NexusCapabilityRegistry entity. Adding/swapping a capability =
//   one database row, not a code deploy (ADR-0001 + ADR-0046).
//
// Resilience:
//   If the registry entity is unreachable, the gateway falls back to
//   the in-memory LEGACY_FALLBACK_REGISTRY (the pre-ADR-0046 static
//   constant). This guarantees zero downtime during migration and
//   survives registry outages. (ADR-0017: Graceful Degradation)
//
// Pipeline:
//   1. AI Kill Switch check (ADR-0018)
//   2. Registry resolution (tenant override → system default → legacy fallback)
//   3. Plan-tier gate (min_plan_required)
//   4. Payload sanitization (ADR-0044 Zero-PII, per capability config)
//   5. Shield governance gate (if governance.domain_id present)
//   6. Credit balance check
//   7. Dispatch (function invocation)
//   8. Credit debit + usage tracking (parallel, fire-and-forget)
//   9. Fallback capability on handler failure (if configured)
//
// Created by Muhammad Firdaus Bin Ismail
// © 2024–2026 Orbitan & OrbitanOS. All Rights Reserved.
// ============================================================

// ── LEGACY FALLBACK REGISTRY ─────────────────────────────────
// The pre-ADR-0046 static constant, preserved as an emergency
// failover if the NexusCapabilityRegistry entity is unreachable.
// This is the resilience guarantee — the gateway never hard-fails
// on a registry outage. (ADR-0017)
const LEGACY_FALLBACK_REGISTRY: Record<string, { function_name: string; default_credits: number; description: string; tier: 1 | 2 | 3 }> = {
  'ocr_receipt':        { function_name: 'nexusOCRProcessor', default_credits: 3,  description: 'AIReceipts — OCR extraction from supplier invoices/receipts', tier: 1 },
  'sop_gen':            { function_name: 'sopGenerator',      default_credits: 2,  description: 'SOP Generator — AI-generated standard operating procedures', tier: 2 },
  'training_gen':       { function_name: 'trainingGenerator', default_credits: 2, description: 'Training Generator — AI-generated training modules', tier: 2 },
  'biz_advisor':        { function_name: 'businessAdvisor',   default_credits: 5, description: 'Business Advisor — AI-powered operational recommendations', tier: 2 },
  'workforce_insights': { function_name: 'workforceInsights', default_credits: 2,  description: 'Workforce Insights — AI analysis of attendance/productivity', tier: 2 },
};

// ── CREDIT COST MAP PER MODEL ───────────────────────────────
const MODEL_CREDIT_MULTIPLIER: Record<string, number> = {
  'automatic': 1.0,
  'gemini_3_flash': 1.0,
  'gpt_5_mini': 1.5,
  'claude_sonnet_4_6': 2.0,
  'gemini_3_1_pro': 2.5,
  'gpt_5_4': 3.0,
  'claude_opus_4_6': 4.0,
};

// ── PLAN TIER HIERARCHY (for min_plan_required gating) ──────
const PLAN_TIER: Record<string, number> = {
  'orbitan_free': 0,
  'orbitan_starter': 1,
  'orbitan_growth': 2,
  'orbitan_business': 3,
  'orbitan_enterprise': 4,
};

// ── FORBIDDEN FIELDS (ADR-0044 Zero-PII) ─────────────────────
// Mirrors base44/shared/sanitizationGate.ts FORBIDDEN_FIELDS.
// Stripped from payloads in 'strict' and 'permissive' sanitization
// modes unless explicitly allowlisted in the capability's
// permitted_fields. 'disabled' mode passes through (enterprise opt-out).
const FORBIDDEN_FIELDS = [
  'tenant_name', 'actor_name', 'actor_role', 'created_by_id', 'created_by_name',
  'signed_by_id', 'signed_by_name', 'uploaded_by', 'uploaded_by_name',
  'email', 'phone', 'full_name', 'contact_person', 'contact_email',
  'contact_phone', 'address', 'ip_address', 'previous_state', 'new_state',
  'justification', 'entity_content',
];

// ── REGISTRY CACHE (Stale-While-Revalidate, 60s TTL) ────────
// Sub-50ms cost for the common path. The cache holds the system
// default capabilities; tenant-specific overrides are fetched
// live (they are low-volume, high-value).
let _registryCache: any[] | null = null;
let _registryCacheAt = 0;
const REGISTRY_CACHE_TTL_MS = 60_000;

async function resolveCapability(base44: any, serviceKey: string, tenantId: string | null): Promise<{
  handler_ref: string;
  default_credits: number;
  tier: number;
  governance_domain: string | null;
  requires_consent: boolean;
  model_override: string | null;
  sanitization_mode: string;
  permitted_fields: string[];
  fallback_capability_key: string | null;
  min_plan_required: string;
  is_active: boolean;
  source: 'registry' | 'legacy_fallback';
} | null> {
  // ── Try the registry first ──────────────────────────────
  try {
    let registryRecords = _registryCache;
    const now = Date.now();
    if (!_registryCache || (now - _registryCacheAt) > REGISTRY_CACHE_TTL_MS) {
      _registryCache = await base44.asServiceRole.entities.NexusCapabilityRegistry.filter({
        is_active: true,
      });
      _registryCacheAt = now;
      registryRecords = _registryCache;
    }

    // Prefer tenant-specific override, then system default
    const tenantOverride = tenantId
      ? registryRecords.find((r: any) => r.tenant_id === tenantId && r.capability_key === serviceKey)
      : null;
    const systemDefault = registryRecords.find((r: any) => r.tenant_id === 'system' && r.capability_key === serviceKey);
    const record = tenantOverride || systemDefault;

    if (record) {
      return {
        handler_ref: record.handler?.ref,
        default_credits: record.default_credits ?? 1,
        tier: record.tier ?? 1,
        governance_domain: record.governance?.domain_id ?? null,
        requires_consent: record.governance?.requires_consent ?? false,
        model_override: record.governance?.model_override ?? null,
        sanitization_mode: record.sanitization?.mode ?? 'strict',
        permitted_fields: record.sanitization?.permitted_fields ?? [],
        fallback_capability_key: record.fallback_capability_key ?? null,
        min_plan_required: record.min_plan_required ?? 'orbitan_starter',
        is_active: record.is_active !== false,
        source: 'registry',
      };
    }
  } catch (registryErr) {
    // Registry unreachable — fall through to legacy fallback
    console.log(`[nexusGateway] Registry lookup failed for ${serviceKey}, using legacy fallback: ${registryErr.message}`);
  }

  // ── Legacy fallback (pre-ADR-0046 static constant) ─────
  const legacy = LEGACY_FALLBACK_REGISTRY[serviceKey];
  if (legacy) {
    return {
      handler_ref: legacy.function_name,
      default_credits: legacy.default_credits,
      tier: legacy.tier,
      governance_domain: null,
      requires_consent: false,
      model_override: null,
      sanitization_mode: 'permissive',
      permitted_fields: [],
      fallback_capability_key: null,
      min_plan_required: 'orbitan_starter',
      is_active: true,
      source: 'legacy_fallback',
    };
  }

  return null;
}

// ── PAYLOAD SANITIZATION (ADR-0044 Zero-PII, per-capability) ─
function sanitizePayload(payload: any, mode: string, permittedFields: string[]): any {
  if (!payload || typeof payload !== 'object') return payload;
  if (mode === 'disabled') return payload; // enterprise opt-out, audit-logged elsewhere

  const cleaned: any = { ...payload };

  // In 'permissive' mode, if an allowlist is provided, keep only
  // those fields (plus anything not in FORBIDDEN_FIELDS).
  // In 'strict' mode, strip all FORBIDDEN_FIELDS unconditionally.
  for (const field of FORBIDDEN_FIELDS) {
    delete cleaned[field];
  }

  if (mode === 'permissive' && permittedFields.length > 0) {
    const allowSet = new Set(permittedFields);
    const result: any = {};
    for (const key of Object.keys(cleaned)) {
      if (allowSet.has(key)) result[key] = cleaned[key];
    }
    return result;
  }

  return cleaned;
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  let tenantId: string | null = null;
  let serviceKey: string | null = null;
  let actorId: string | null = null;
  let base44: any = null;

  try {
    base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    actorId = user.id;

    const body = await req.json();
    const { service_key, payload, tenant_id, outlet_id } = body;

    serviceKey = service_key;
    tenantId = tenant_id || user.data?.tenant_id || null;

    if (!service_key) {
      return Response.json({ error: 'service_key is required' }, { status: 400 });
    }

    // ── STEP 0: AI KILL SWITCH (ADR-0018) ──────────────────
    try {
      const settings = await base44.asServiceRole.entities.SystemSettings.list();
      const globalSettings = settings[0];

      if (globalSettings && globalSettings.nexus_ai_enabled === false) {
        await trackUsage(base44, {
          tenant_id: tenantId || 'unknown',
          outlet_id: outlet_id || null,
          service_key,
          routed_function: 'unknown',
          model_used: payload?.model || 'automatic',
          credits_consumed: 0,
          status: 'ai_disabled',
          error_message: 'AI Kill Switch is active — request gracefully rejected',
          actor_id: actorId,
          actor_name: user.full_name,
          shield_policy_evaluated: null,
          shield_outcome: 'not_evaluated',
          latency_ms: Date.now() - startTime,
          metadata: payload || {},
        });

        return Response.json({
          ai_disabled: true,
          message: globalSettings.nexus_ai_disabled_message || 'AI intelligence is currently disabled by the platform administrator.',
          service_key,
        }, { status: 200 });
      }
    } catch (settingsErr) {
      console.log(`[nexusGateway] Kill switch check failed: ${settingsErr.message}`);
    }

    // ── STEP 1: REGISTRY RESOLUTION (ADR-0046) ─────────────
    const capability = await resolveCapability(base44, service_key, tenantId);

    if (!capability) {
      return Response.json({
        error: `Service key '${service_key}' not found in Nexus registry or legacy fallback`,
        available_services: Object.keys(LEGACY_FALLBACK_REGISTRY),
      }, { status: 404 });
    }

    if (!capability.is_active) {
      return Response.json({
        error: `Capability '${service_key}' is currently disabled`,
        service_key,
      }, { status: 403 });
    }

    if (!tenantId) {
      return Response.json({ error: 'tenant_id is required — could not resolve from user context' }, { status: 400 });
    }

    // ── STEP 2: PLAN-TIER GATE ────────────────────────────
    try {
      const tenants = await base44.asServiceRole.entities.Tenant.filter({ id: tenantId });
      const tenant = tenants[0];
      const tenantPlan = tenant?.subscription_plan || 'orbitan_starter';
      const tenantTier = PLAN_TIER[tenantPlan] ?? 1;
      const requiredTier = PLAN_TIER[capability.min_plan_required] ?? 1;

      if (tenantTier < requiredTier) {
        return Response.json({
          error: `Plan upgrade required: '${service_key}' requires ${capability.min_plan_required} (current: ${tenantPlan})`,
          service_key,
          current_plan: tenantPlan,
          required_plan: capability.min_plan_required,
          upgrade_required: true,
        }, { status: 403 });
      }
    } catch (planErr) {
      // Fail-open on plan check — don't block AI on infra issues
      console.log(`[nexusGateway] Plan-tier check failed: ${planErr.message}`);
    }

    // ── STEP 3: PAYLOAD SANITIZATION (ADR-0044) ────────────
    const sanitizedPayload = sanitizePayload(
      payload || {},
      capability.sanitization_mode,
      capability.permitted_fields
    );

    // ── STEP 4: SHIELD GOVERNANCE GATE (Regulate) ──────────
    let shieldOutcome: any = null;
    let shieldPolicyName: string | null = null;

    if (capability.governance_domain) {
      try {
        const shieldResponse = await base44.functions.invoke('shieldInterceptor', {
          action: service_key,
          entity_name: 'OrbitUsageTracker',
          data: { service_key, tenant_id: tenantId, payload_summary: sanitizedPayload?.summary || 'Nexus AI request' },
          tenant_id: tenantId,
          domain_id: capability.governance_domain,
        });
        shieldOutcome = shieldResponse.data;

        if (shieldOutcome?.allowed === false && shieldOutcome?.effect === 'block') {
          await trackUsage(base44, {
            tenant_id: tenantId,
            outlet_id: outlet_id || null,
            service_key,
            routed_function: capability.handler_ref,
            model_used: capability.model_override || sanitizedPayload?.model || 'automatic',
            credits_consumed: 0,
            status: 'shield_blocked',
            error_message: shieldOutcome.reason || 'Shield policy block',
            actor_id: actorId,
            actor_name: user.full_name,
            shield_policy_evaluated: shieldOutcome.policy_name || null,
            shield_outcome: 'blocked',
            latency_ms: Date.now() - startTime,
            metadata: sanitizedPayload,
          });

          return Response.json({
            error: 'Governance block: Intelligence request denied by Orbitan Shield™',
            shield_response: shieldOutcome,
            service_key,
          }, { status: 403 });
        }

        shieldPolicyName = shieldOutcome?.policy_name || null;
      } catch (shieldErr) {
        console.log(`[nexusGateway] Shield evaluation failed for ${service_key}: ${shieldErr.message}`);
      }
    }

    // ── STEP 5: CREDIT BALANCE CHECK ──────────────────────
    const modelUsed = capability.model_override || sanitizedPayload?.model || 'automatic';
    const creditMultiplier = MODEL_CREDIT_MULTIPLIER[modelUsed] || 1.0;
    const creditsRequired = Math.ceil(capability.default_credits * creditMultiplier);

    let walletRecord: any = null;
    try {
      const wallets = await base44.asServiceRole.entities.OrbitanWallet.filter({ tenant_id: tenantId, is_active: true });
      walletRecord = wallets[0];

      if (walletRecord && walletRecord.balance_credits < creditsRequired) {
        await trackUsage(base44, {
          tenant_id: tenantId,
          outlet_id: outlet_id || null,
          service_key,
          routed_function: capability.handler_ref,
          model_used: modelUsed,
          credits_consumed: 0,
          status: 'insufficient_credits',
          error_message: `Insufficient credits: ${walletRecord.balance_credits} available, ${creditsRequired} required`,
          actor_id: actorId,
          actor_name: user.full_name,
          shield_policy_evaluated: shieldPolicyName,
          shield_outcome: shieldOutcome?.effect === 'notify' ? 'notify' : 'pass',
          latency_ms: Date.now() - startTime,
          metadata: sanitizedPayload,
        });

        return Response.json({
          error: 'Insufficient Orbitan Credits',
          credits_available: walletRecord.balance_credits,
          credits_required: creditsRequired,
          service_key,
          upgrade_required: true,
        }, { status: 402 });
      }
    } catch (walletErr) {
      console.log(`[nexusGateway] Wallet lookup failed: ${walletErr.message}`);
    }

    // ── STEP 6: EXECUTE — Dispatch to the handler ─────────
    let result: any = null;
    let executionStatus: 'success' | 'failed' | 'timeout' = 'success';
    let errorMessage: string | null = null;

    try {
      const response = await base44.functions.invoke(capability.handler_ref, {
        ...sanitizedPayload,
        tenant_id: tenantId,
        outlet_id: outlet_id || null,
        actor_id: actorId,
        actor_name: user.full_name,
      });
      result = response.data;
    } catch (execErr) {
      executionStatus = 'failed';
      errorMessage = execErr.message || 'Unknown execution error';
    }

    const latencyMs = Date.now() - startTime;

    // ── STEP 7: DEBIT CREDITS & TRACK USAGE (parallel) ─────
    const trackingTasks = [];

    if (walletRecord && executionStatus === 'success') {
      trackingTasks.push(
        base44.asServiceRole.entities.OrbitanWallet.update(walletRecord.id, {
          balance_credits: walletRecord.balance_credits - creditsRequired,
          credits_used_this_month: (walletRecord.credits_used_this_month || 0) + creditsRequired,
          ai_calls_this_month: (walletRecord.ai_calls_this_month || 0) + 1,
          ai_calls_lifetime: (walletRecord.ai_calls_lifetime || 0) + 1,
        }).catch((e: any) => console.log(`[nexusGateway] Wallet debit failed: ${e.message}`))
      );
    }

    trackingTasks.push(
      trackUsage(base44, {
        tenant_id: tenantId,
        outlet_id: outlet_id || null,
        service_key,
        routed_function: capability.handler_ref,
        model_used: modelUsed,
        credits_consumed: executionStatus === 'success' ? creditsRequired : 0,
        status: executionStatus,
        error_message: errorMessage,
        actor_id: actorId,
        actor_name: user.full_name,
        shield_policy_evaluated: shieldPolicyName,
        shield_outcome: shieldOutcome?.effect === 'notify' ? 'notify' : 'pass',
        latency_ms: latencyMs,
        metadata: sanitizedPayload,
      })
    );

    // Update registry fire_count (fire-and-forget)
    if (capability.source === 'registry' && executionStatus === 'success') {
      // Best-effort — fetch the record id and update. Skipped for legacy fallback.
      try {
        const records = await base44.asServiceRole.entities.NexusCapabilityRegistry.filter({
          capability_key: service_key,
          tenant_id: tenantId === 'system' ? 'system' : (tenantId || 'system'),
        });
        if (records[0]) {
          trackingTasks.push(
            base44.asServiceRole.entities.NexusCapabilityRegistry.update(records[0].id, {
              fire_count: (records[0].fire_count || 0) + 1,
              last_fired_at: new Date().toISOString(),
            }).catch(() => {})
          );
        }
      } catch { /* non-critical */ }
    }

    await Promise.allSettled(trackingTasks);

    // ── STEP 8: FALLBACK CAPABILITY (graceful degradation) ─
    if (executionStatus === 'failed' && capability.fallback_capability_key) {
      console.log(`[nexusGateway] Handler failed, invoking fallback: ${capability.fallback_capability_key}`);
      // Re-invoke with the fallback capability key. One level deep — no recursion.
      try {
        const fallbackResponse = await base44.functions.invoke('nexus', {
          service_key: capability.fallback_capability_key,
          payload: sanitizedPayload,
          tenant_id: tenantId,
          outlet_id: outlet_id,
        });
        return Response.json({
          success: true,
          service_key,
          data: fallbackResponse.data?.data || fallbackResponse.data,
          credits_consumed: 0, // fallback credit handling is the fallback call's responsibility
          model_used: modelUsed,
          latency_ms: latencyMs,
          fallback_used: true,
          original_error: errorMessage,
        });
      } catch (fallbackErr) {
        // Fallback also failed — surface original error
        return Response.json({
          error: `Nexus service '${service_key}' and fallback '${capability.fallback_capability_key}' both failed`,
          details: errorMessage,
          fallback_error: fallbackErr.message,
          service_key,
          latency_ms: latencyMs,
        }, { status: 500 });
      }
    }

    // ── STEP 9: RETURN RESULT ─────────────────────────────
    if (executionStatus === 'failed') {
      return Response.json({
        error: `Nexus service '${service_key}' failed to execute`,
        details: errorMessage,
        service_key,
        latency_ms: latencyMs,
      }, { status: 500 });
    }

    return Response.json({
      success: true,
      service_key,
      data: result,
      credits_consumed: creditsRequired,
      model_used: modelUsed,
      latency_ms: latencyMs,
      capability_source: capability.source,
      capability_tier: capability.tier,
    });

  } catch (error) {
    if (base44 && tenantId && serviceKey) {
      await trackUsage(base44, {
        tenant_id: tenantId,
        outlet_id: null,
        service_key: serviceKey,
        routed_function: 'unknown',
        model_used: 'automatic',
        credits_consumed: 0,
        status: 'failed',
        error_message: error.message,
        actor_id: actorId,
        actor_name: null,
        shield_policy_evaluated: null,
        shield_outcome: 'not_evaluated',
        latency_ms: Date.now() - startTime,
        metadata: {},
      }).catch(() => {});
    }

    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ── USAGE TRACKER HELPER ─────────────────────────────────────
async function trackUsage(base44: any, params: {
  tenant_id: string;
  outlet_id: string | null;
  service_key: string;
  routed_function: string;
  model_used: string;
  credits_consumed: number;
  status: string;
  error_message: string | null;
  actor_id: string;
  actor_name: string | null;
  shield_policy_evaluated: string | null;
  shield_outcome: string;
  latency_ms: number;
  metadata: object;
}) {
  try {
    await base44.asServiceRole.entities.OrbitUsageTracker.create({
      tenant_id: params.tenant_id,
      outlet_id: params.outlet_id,
      service_key: params.service_key,
      routed_function: params.routed_function,
      model_used: params.model_used,
      credits_consumed: params.credits_consumed,
      status: params.status,
      error_message: params.error_message,
      actor_id: params.actor_id,
      actor_name: params.actor_name,
      shield_policy_evaluated: params.shield_policy_evaluated,
      shield_outcome: params.shield_outcome,
      latency_ms: params.latency_ms,
      metadata: params.metadata,
    });
  } catch (err) {
    console.log(`[nexusGateway] Usage tracking failed: ${err.message}`);
  }
}