import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ============================================================
// ORBIT NEXUS GATEWAY
// The single, governed entry point for all AI intelligence.
//
// Contract (NexusRequest):
//   { service_key, payload, tenant_id, outlet_id? }
//
// Principles:
//   1. Decoupled — UI never knows which underlying function runs.
//   2. Shielded — every request passes the Shield governance gate.
//   3. Metered — every request is tracked in OrbitUsageTracker + Wallet debited.
//   4. Scalable — adding a new AI service = one line in the SERVICE_REGISTRY.
//
// Created by Muhammad Firdaus Bin Ismail
// © 2024–2026 Orbitan & OrbitanOS. All Rights Reserved.
// ============================================================

// ── SERVICE REGISTRY ────────────────────────────────────────
// Maps a public service_key to the backend function that processes it.
// This is the ONLY place that changes when a service is added/swapped.
const SERVICE_REGISTRY: Record<string, { function_name: string; default_credits: number; description: string }> = {
  'ocr_receipt':        { function_name: 'nexusOCRProcessor', default_credits: 3,  description: 'AIReceipts — OCR extraction from supplier invoices/receipts' },
  'sop_gen':            { function_name: 'sopGenerator',      default_credits: 2,  description: 'SOP Generator — AI-generated standard operating procedures' },
  'training_gen':       { function_name: 'trainingGenerator', default_credits: 2, description: 'Training Generator — AI-generated training modules' },
  'biz_advisor':        { function_name: 'businessAdvisor',   default_credits: 5, description: 'Business Advisor — AI-powered operational recommendations' },
  'workforce_insights': { function_name: 'workforceInsights', default_credits: 2,  description: 'Workforce Insights — AI analysis of attendance/productivity' },
};

// ── CREDIT COST MAP PER MODEL ───────────────────────────────
// More expensive models consume more credits. The gateway reads
// the model from payload (optional) and adjusts the debit.
const MODEL_CREDIT_MULTIPLIER: Record<string, number> = {
  'automatic': 1.0,
  'gemini_3_flash': 1.0,
  'gpt_5_mini': 1.5,
  'claude_sonnet_4_6': 2.0,
  'gemini_3_1_pro': 2.5,
  'gpt_5_4': 3.0,
  'claude_opus_4_6': 4.0,
};

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

    const serviceConfig = SERVICE_REGISTRY[service_key];
    if (!serviceConfig) {
      return Response.json({
        error: `Service key '${service_key}' not found in Nexus registry`,
        available_services: Object.keys(SERVICE_REGISTRY),
      }, { status: 404 });
    }

    if (!tenantId) {
      return Response.json({ error: 'tenant_id is required — could not resolve from user context' }, { status: 400 });
    }

    // ── STEP 1: SHIELD GOVERNANCE GATE (Regulate principle) ──
    // Every intelligence request must pass governance before execution.
    let shieldOutcome: any = null;
    let shieldPolicyName: string | null = null;

    try {
      const shieldResponse = await base44.functions.invoke('shieldInterceptor', {
        action: service_key,
        entity_name: 'OrbitUsageTracker',
        data: { service_key, tenant_id, payload_summary: payload?.summary || 'Nexus AI request' },
        tenant_id: tenantId,
      });
      shieldOutcome = shieldResponse.data;

      if (shieldOutcome?.allowed === false && shieldOutcome?.effect === 'block') {
        // Shield blocked — log usage and return
        await trackUsage(base44, {
          tenant_id: tenantId,
          outlet_id: outlet_id || null,
          service_key,
          routed_function: serviceConfig.function_name,
          model_used: payload?.model || 'automatic',
          credits_consumed: 0,
          status: 'shield_blocked',
          error_message: shieldOutcome.reason || 'Shield policy block',
          actor_id: actorId,
          actor_name: user.full_name,
          shield_policy_evaluated: shieldOutcome.policy_name || null,
          shield_outcome: 'blocked',
          latency_ms: Date.now() - startTime,
          metadata: payload || {},
        });

        return Response.json({
          error: 'Governance block: Intelligence request denied by Orbitan Shield™',
          shield_response: shieldOutcome,
          service_key,
        }, { status: 403 });
      }

      shieldPolicyName = shieldOutcome?.policy_name || null;
    } catch (shieldErr) {
      // Fail-open on Shield errors — but log the anomaly
      console.log(`[nexusGateway] Shield evaluation failed for ${service_key}: ${shieldErr.message}`);
    }

    // ── STEP 2: CREDIT BALANCE CHECK ─────────────────────────
    // Verify the tenant has sufficient credits before consuming AI.
    const modelUsed = payload?.model || 'automatic';
    const creditMultiplier = MODEL_CREDIT_MULTIPLIER[modelUsed] || 1.0;
    const creditsRequired = Math.ceil(serviceConfig.default_credits * creditMultiplier);

    let walletRecord: any = null;
    try {
      const wallets = await base44.asServiceRole.entities.OrbitanWallet.filter({ tenant_id: tenantId, is_active: true });
      walletRecord = wallets[0];

      if (walletRecord && walletRecord.balance_credits < creditsRequired) {
        // Insufficient credits — log and return
        await trackUsage(base44, {
          tenant_id: tenantId,
          outlet_id: outlet_id || null,
          service_key,
          routed_function: serviceConfig.function_name,
          model_used: modelUsed,
          credits_consumed: 0,
          status: 'insufficient_credits',
          error_message: `Insufficient credits: ${walletRecord.balance_credits} available, ${creditsRequired} required`,
          actor_id: actorId,
          actor_name: user.full_name,
          shield_policy_evaluated: shieldPolicyName,
          shield_outcome: shieldOutcome?.effect === 'notify' ? 'notify' : 'pass',
          latency_ms: Date.now() - startTime,
          metadata: payload || {},
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
      // If wallet lookup fails, fail-open (don't block AI on infra issues)
      console.log(`[nexusGateway] Wallet lookup failed: ${walletErr.message}`);
    }

    // ── STEP 3: EXECUTE — Route to the domain processor ──────
    let result: any = null;
    let executionStatus: 'success' | 'failed' | 'timeout' = 'success';
    let errorMessage: string | null = null;

    try {
      const response = await base44.functions.invoke(serviceConfig.function_name, {
        ...payload,
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

    // ── STEP 4: DEBIT CREDITS & TRACK USAGE (parallel) ────────
    const trackingTasks = [];

    // Debit wallet (fire-and-forget)
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

    // Track usage (fire-and-forget)
    trackingTasks.push(
      trackUsage(base44, {
        tenant_id: tenantId,
        outlet_id: outlet_id || null,
        service_key,
        routed_function: serviceConfig.function_name,
        model_used: modelUsed,
        credits_consumed: executionStatus === 'success' ? creditsRequired : 0,
        status: executionStatus,
        error_message: errorMessage,
        actor_id: actorId,
        actor_name: user.full_name,
        shield_policy_evaluated: shieldPolicyName,
        shield_outcome: shieldOutcome?.effect === 'notify' ? 'notify' : 'pass',
        latency_ms: latencyMs,
        metadata: payload || {},
      })
    );

    await Promise.allSettled(trackingTasks);

    // ── STEP 5: RETURN RESULT ────────────────────────────────
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
    });

  } catch (error) {
    // Fallback usage tracking on unexpected errors
    if (base44 && tenantId && serviceKey) {
      await trackUsage(base44, {
        tenant_id: tenantId,
        outlet_id: null,
        service_key: serviceKey,
        routed_function: SERVICE_REGISTRY[serviceKey]?.function_name || 'unknown',
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
// Writes a metering record to OrbitUsageTracker for every request.
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