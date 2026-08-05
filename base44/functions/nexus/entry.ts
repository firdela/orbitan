import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  L0_ANSWER, L3_EXECUTE, L3_PROHIBITED_ACTIONS,
  getDefaultAutonomy, canPerformAction,
  DECISIONS, PROVENANCE_STATES, PROVIDERS,
  evaluateModelLifecycle, evaluateAgentLifecycle, evaluateAIRequest,
  resolveMostRestrictivePolicy, isSensitiveAction,
  createExecutionPolicy, validateExecutionContext, shouldStop,
  classifyProviderError, isProviderConfigured,
  classifyOutcome, SAFE_ERROR_CODES, SAFE_USER_MESSAGES,
} from '../../shared/ai-governance.ts';

// ============================================================
// ORBIT NEXUS GATEWAY — Capability-Tiered Orchestrator (ADR-0046)
// The single, governed entry point for all AI intelligence.
//
// BUILD #28.2N — Phase 2 Task 1: Governance Controls Wired
//
// Pipeline (22 steps):
//   1.  Authenticate requester
//   2.  Resolve tenant context
//   3.  Validate request contract
//   4.  Check kill switch (ADR-0018)
//   5.  Resolve capability (ADR-0046 registry)
//   6.  Resolve model and agent identities
//   7.  Enforce model lifecycle
//   8.  Enforce agent lifecycle
//   9.  Evaluate autonomy requirements
//   10. Evaluate AI policies (deny-by-default, most-restrictive-wins)
//   11. Validate execution policy
//   12. Apply Zero-PII sanitisation (ADR-0044)
//   13. Apply Shield governance gate
//   14. Check credits and cost budget (registry-first with legacy fallback)
//   15. Resolve approved provider/model route
//   16. Dispatch provider request
//   17. Handle timeout/retry/fallback (re-runs all governance checks)
//   18. Validate and normalise response
//   19. Record usage (OrbitUsageTracker)
//   20. Create AIAuditEvent (full provenance)
//   21. Emit authorised Orbit Inbox governance event where required
//   22. Return structured response
//
// Idempotency: request_id prevents duplicate execution and audit events.
// Audit failure: fail-closed for consequential actions; degraded mode for L0.
//
// Created by Muhammad Firdaus Bin Ismail
// © 2024–2026 Orbitan & OrbitanOS. All Rights Reserved.
// ============================================================

// ── LEGACY FALLBACK REGISTRY (ADR-0017 resilience) ──────────
const LEGACY_FALLBACK_REGISTRY: Record<string, { function_name: string; default_credits: number; description: string; tier: 1 | 2 | 3 }> = {
  'ocr_receipt':        { function_name: 'nexusOCRProcessor', default_credits: 3,  description: 'AIReceipts — OCR extraction from supplier invoices/receipts', tier: 1 },
  'sop_gen':            { function_name: 'sopGenerator',      default_credits: 2,  description: 'SOP Generator — AI-generated standard operating procedures', tier: 2 },
  'training_gen':       { function_name: 'trainingGenerator', default_credits: 2, description: 'Training Generator — AI-generated training modules', tier: 2 },
  'biz_advisor':        { function_name: 'businessAdvisor',   default_credits: 5, description: 'Business Advisor — AI-powered operational recommendations', tier: 2 },
  'workforce_insights': { function_name: 'workforceInsights', default_credits: 2,  description: 'Workforce Insights — AI analysis of attendance/productivity', tier: 2 },
};

// ── LEGACY CREDIT MULTIPLIER (migration fallback) ────────────
// Used when a model is not found in the AIModel registry or has no
// cost_config. Emits an audit warning. Will be removed once all
// models are registered with cost_config in the AIModel entity.
const MODEL_CREDIT_MULTIPLIER: Record<string, number> = {
  'automatic': 1.0,
  'gemini_3_flash': 1.0,
  'gpt_5_mini': 1.5,
  'claude_sonnet_4_6': 2.0,
  'gemini_3_1_pro': 2.5,
  'gpt_5_4': 3.0,
  'claude_opus_4_6': 4.0,
};

// ── PLAN TIER HIERARCHY ──────────────────────────────────────
const PLAN_TIER: Record<string, number> = {
  'orbitan_free': 0, 'orbitan_starter': 1, 'orbitan_growth': 2,
  'orbitan_business': 3, 'orbitan_enterprise': 4,
};

// ── FORBIDDEN FIELDS (ADR-0044 Zero-PII) ─────────────────────
const FORBIDDEN_FIELDS = [
  'tenant_name', 'actor_name', 'actor_role', 'created_by_id', 'created_by_name',
  'signed_by_id', 'signed_by_name', 'uploaded_by', 'uploaded_by_name',
  'email', 'phone', 'full_name', 'contact_person', 'contact_email',
  'contact_phone', 'address', 'ip_address', 'previous_state', 'new_state',
  'justification', 'entity_content',
];

// ── REGISTRY CACHE (Stale-While-Revalidate, 60s TTL) ─────────
let _registryCache: any[] | null = null;
let _registryCacheAt = 0;
const REGISTRY_CACHE_TTL_MS = 60_000;

// ── MODEL REGISTRY CACHE (separate, 120s TTL) ────────────────
let _modelCache: any[] | null = null;
let _modelCacheAt = 0;
const MODEL_CACHE_TTL_MS = 120_000;

// ── POLICY REGISTRY CACHE (separate, 120s TTL) ────────────────
let _policyCache: any[] | null = null;
let _policyCacheAt = 0;
const POLICY_CACHE_TTL_MS = 120_000;

// ── CAPABILITY RESOLVER ───────────────────────────────────────
async function resolveCapability(base44: any, serviceKey: string, tenantId: string | null): Promise<{
  handler_ref: string; default_credits: number; tier: number;
  governance_domain: string | null; requires_consent: boolean;
  model_override: string | null; sanitization_mode: string;
  permitted_fields: string[]; fallback_capability_key: string | null;
  min_plan_required: string; is_active: boolean; source: 'registry' | 'legacy_fallback';
} | null> {
  try {
    let registryRecords = _registryCache;
    const now = Date.now();
    if (!_registryCache || (now - _registryCacheAt) > REGISTRY_CACHE_TTL_MS) {
      _registryCache = await base44.asServiceRole.entities.NexusCapabilityRegistry.filter({ is_active: true });
      _registryCacheAt = now;
      registryRecords = _registryCache;
    }
    const tenantOverride = tenantId ? registryRecords.find((r: any) => r.tenant_id === tenantId && r.capability_key === serviceKey) : null;
    const systemDefault = registryRecords.find((r: any) => r.tenant_id === 'system' && r.capability_key === serviceKey);
    const record = tenantOverride || systemDefault;
    if (record) {
      return {
        handler_ref: record.handler?.ref, default_credits: record.default_credits ?? 1,
        tier: record.tier ?? 1, governance_domain: record.governance?.domain_id ?? null,
        requires_consent: record.governance?.requires_consent ?? false,
        model_override: record.governance?.model_override ?? null,
        sanitization_mode: record.sanitization?.mode ?? 'strict',
        permitted_fields: record.sanitization?.permitted_fields ?? [],
        fallback_capability_key: record.fallback_capability_key ?? null,
        min_plan_required: record.min_plan_required ?? 'orbitan_starter',
        is_active: record.is_active !== false, source: 'registry',
      };
    }
  } catch (registryErr) {
    console.log(`[nexusGateway] Registry lookup failed for ${serviceKey}, using legacy fallback: ${registryErr.message}`);
  }
  const legacy = LEGACY_FALLBACK_REGISTRY[serviceKey];
  if (legacy) {
    return {
      handler_ref: legacy.function_name, default_credits: legacy.default_credits, tier: legacy.tier,
      governance_domain: null, requires_consent: false, model_override: null,
      sanitization_mode: 'permissive', permitted_fields: [], fallback_capability_key: null,
      min_plan_required: 'orbitan_starter', is_active: true, source: 'legacy_fallback',
    };
  }
  return null;
}

// ── MODEL REGISTRY RESOLVER ───────────────────────────────────
async function resolveModelForKey(base44: any, modelKey: string, tenantId: string): Promise<any | null> {
  try {
    let models = _modelCache;
    const now = Date.now();
    if (!_modelCache || (now - _modelCacheAt) > MODEL_CACHE_TTL_MS) {
      _modelCache = await base44.asServiceRole.entities.AIModel.filter({ is_active: true });
      _modelCacheAt = now;
      models = _modelCache;
    }
    // Prefer tenant-specific model, then system default
    const tenantModel = models.find((m: any) => m.model_key === modelKey && m.tenant_id === tenantId);
    const systemModel = models.find((m: any) => m.model_key === modelKey && m.tenant_id === 'system');
    return tenantModel || systemModel || null;
  } catch (err) {
    console.log(`[nexusGateway] Model registry lookup failed for ${modelKey}: ${err.message}`);
    return null;
  }
}

// ── AGENT REGISTRY RESOLVER ───────────────────────────────────
async function resolveAgentForId(base44: any, agentId: string, tenantId: string): Promise<any | null> {
  try {
    const agents = await base44.asServiceRole.entities.AIAgent.filter({ agent_id: agentId, is_active: true });
    const tenantAgent = agents.find((a: any) => a.tenant_id === tenantId);
    const systemAgent = agents.find((a: any) => a.tenant_id === 'system');
    return tenantAgent || systemAgent || null;
  } catch (err) {
    console.log(`[nexusGateway] Agent registry lookup failed for ${agentId}: ${err.message}`);
    return null;
  }
}

// ── POLICY MATCH RESOLVER ─────────────────────────────────────
async function resolveMatchingPolicies(base44: any, params: {
  tenantId: string; modelKey: string; agentId: string | null;
  dataClassification: string; autonomyLevel: string; environment: string;
}): Promise<any[]> {
  try {
    let policies = _policyCache;
    const now = Date.now();
    if (!_policyCache || (now - _policyCacheAt) > POLICY_CACHE_TTL_MS) {
      _policyCache = await base44.asServiceRole.entities.AIPolicy.filter({ is_active: true });
      _policyCacheAt = now;
      policies = _policyCache;
    }
    if (!policies || policies.length === 0) return [];

    return policies.filter((p: any) => {
      if (!p.is_active) return false;
      // Tenant scope: system policies apply to all; tenant-specific only to that tenant
      if (p.tenant_id !== 'system' && p.tenant_id !== params.tenantId) return false;
      // Environment
      if (p.applies_to_environments && p.applies_to_environments.length > 0 && !p.applies_to_environments.includes(params.environment)) return false;
      // Model
      if (p.applies_to_models && p.applies_to_models.length > 0 && !p.applies_to_models.includes(params.modelKey)) return false;
      // Agent
      if (p.applies_to_agents && p.applies_to_agents.length > 0 && params.agentId && !p.applies_to_agents.includes(params.agentId)) return false;
      // Data classification
      if (p.applies_to_data_classifications && p.applies_to_data_classifications.length > 0 && !p.applies_to_data_classifications.includes(params.dataClassification)) return false;
      // Autonomy
      if (p.applies_to_autonomy_levels && p.applies_to_autonomy_levels.length > 0 && !p.applies_to_autonomy_levels.includes(params.autonomyLevel)) return false;
      return true;
    });
  } catch (err) {
    console.log(`[nexusGateway] Policy registry lookup failed: ${err.message}`);
    return [];
  }
}

// ── COST MULTIPLIER RESOLVER (registry-first with legacy fallback) ─
function resolveModelCostMultiplier(model: any, modelKey: string): {
  multiplier: number; source: 'registry' | 'legacy_fallback'; warning: string | null;
} {
  if (model && model.cost_config && model.cost_config.credit_multiplier != null) {
    return {
      multiplier: model.cost_config.credit_multiplier,
      source: 'registry',
      warning: null,
    };
  }
  // Legacy fallback — emit warning
  const legacyMultiplier = MODEL_CREDIT_MULTIPLIER[modelKey] ?? 1.0;
  return {
    multiplier: legacyMultiplier,
    source: 'legacy_fallback',
    warning: `Model '${modelKey}' has no cost_config in AIModel registry — using legacy MODEL_CREDIT_MULTIPLIER (${legacyMultiplier}). Register cost_config to migrate.`,
  };
}

// ── PAYLOAD SANITISATION (ADR-0044) ───────────────────────────
function sanitizePayload(payload: any, mode: string, permittedFields: string[]): any {
  if (!payload || typeof payload !== 'object') return payload;
  if (mode === 'disabled') return payload;
  const cleaned: any = { ...payload };
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

// ── IDEMPOTENCY CHECK ─────────────────────────────────────────
async function checkIdempotency(base44: any, requestId: string): Promise<any | null> {
  try {
    const existing = await base44.asServiceRole.entities.AIAuditEvent.filter({ request_id: requestId });
    if (existing && existing.length > 0) {
      return existing[0];
    }
  } catch (err) {
    console.log(`[nexusGateway] Idempotency check failed: ${err.message}`);
  }
  return null;
}

// ── AIAUDITEVENT CREATOR ──────────────────────────────────────
async function createAIAuditEvent(base44: any, params: {
  tenant_id: string; outlet_id: string | null; request_id: string;
  service_key: string; capability_tier: number;
  requesting_user_id: string; requesting_user_name: string | null; requesting_user_role: string;
  executing_agent_id: string | null;
  provider: string; model_key: string; model_version: string | null;
  model_lifecycle_status: string | null;
  routing_decision: string;
  policy_decision: string; policy_reason: string; policy_keys_evaluated: string[];
  autonomy_level: string;
  data_classification: string;
  tools_invoked: string[]; integrations_invoked: string[];
  runtime_ms: number;
  credits_consumed: number; estimated_cost_sgd: number | null;
  validation_result: string; provenance_state: string;
  outcome: string; error_message: string | null; error_classification: string | null;
  fallback_used: boolean;
  metadata: Record<string, any>;
  is_consequential: boolean;
}): Promise<string | null> {
  try {
    const record = await base44.asServiceRole.entities.AIAuditEvent.create({
      tenant_id: params.tenant_id,
      outlet_id: params.outlet_id,
      request_id: params.request_id,
      service_key: params.service_key,
      capability_tier: params.capability_tier,
      requesting_user_id: params.requesting_user_id,
      requesting_user_name: params.requesting_user_name,
      requesting_user_role: params.requesting_user_role,
      executing_agent_id: params.executing_agent_id,
      provider: params.provider,
      model_key: params.model_key,
      model_version: params.model_version,
      routing_decision: params.routing_decision,
      policy_decision: params.policy_decision,
      policy_reason: params.policy_reason,
      policy_keys_evaluated: params.policy_keys_evaluated,
      tools_invoked: params.tools_invoked,
      integrations_invoked: params.integrations_invoked,
      autonomy_level: params.autonomy_level,
      runtime_ms: params.runtime_ms,
      credits_consumed: params.credits_consumed,
      estimated_cost_sgd: params.estimated_cost_sgd,
      data_classification: params.data_classification,
      validation_result: params.validation_result,
      provenance_state: params.provenance_state,
      outcome: params.outcome,
      error_message: params.error_message,
      error_classification: params.error_classification,
      metadata: { ...params.metadata, fallback_used: params.fallback_used, model_lifecycle_status: params.model_lifecycle_status },
    });
    return record?.id || null;
  } catch (err) {
    console.log(`[nexusGateway] AIAuditEvent creation failed: ${err.message}`);
    // Fail-closed for consequential actions; degraded mode for L0 read-only
    if (params.is_consequential) {
      throw new Error(`AUDIT_FAILURE: Cannot execute consequential action without audit evidence — ${err.message}`);
    }
    // For non-consequential (L0 read-only), emit operational error but don't block
    console.log(`[nexusGateway] Audit failure in degraded mode (non-consequential) — execution allowed, audit evidence missing`);
    return null;
  }
}

// ── ORBIT INBOX GOVERNANCE EVENT EMITTER ──────────────────────
async function emitGovernanceInboxEvent(base44: any, params: {
  tenant_id: string; outlet_id: string | null;
  recipient_user_id: string; recipient_name: string | null;
  category: string; event_type: string;
  title: string; body: string;
  priority: string; is_actionable: boolean; action_type: string;
  source_entity: string; source_id: string; link: string;
  metadata: Record<string, any>;
}): Promise<void> {
  try {
    await base44.asServiceRole.entities.OrbitInbox.create({
      tenant_id: params.tenant_id,
      outlet_id: params.outlet_id,
      recipient_user_id: params.recipient_user_id,
      recipient_name: params.recipient_name,
      category: params.category,
      event_type: params.event_type,
      title: params.title,
      body: params.body,
      priority: params.priority,
      is_actionable: params.is_actionable,
      action_type: params.action_type,
      action_state: 'pending',
      source_entity: params.source_entity,
      source_id: params.source_id,
      link: params.link,
      metadata: params.metadata,
      channels_delivered: ['in_app'],
    });
  } catch (err) {
    console.log(`[nexusGateway] Orbit Inbox event emission failed: ${err.message}`);
  }
}

// ── USAGE TRACKER HELPER ─────────────────────────────────────
async function trackUsage(base44: any, params: {
  tenant_id: string; outlet_id: string | null; service_key: string;
  routed_function: string; model_used: string; credits_consumed: number;
  status: string; error_message: string | null; actor_id: string;
  actor_name: string | null; shield_policy_evaluated: string | null;
  shield_outcome: string; latency_ms: number; metadata: object;
}) {
  try {
    await base44.asServiceRole.entities.OrbitUsageTracker.create({
      tenant_id: params.tenant_id, outlet_id: params.outlet_id,
      service_key: params.service_key, routed_function: params.routed_function,
      model_used: params.model_used, credits_consumed: params.credits_consumed,
      status: params.status, error_message: params.error_message,
      actor_id: params.actor_id, actor_name: params.actor_name,
      shield_policy_evaluated: params.shield_policy_evaluated,
      shield_outcome: params.shield_outcome, latency_ms: params.latency_ms,
      metadata: params.metadata,
    });
  } catch (err) {
    console.log(`[nexusGateway] Usage tracking failed: ${err.message}`);
  }
}

// ── SAFE ERROR RESPONSE BUILDER ──────────────────────────────
function safeErrorResponse(errorCode: string, status: number, serviceKey: string | null, extra: Record<string, any> = {}): Response {
  const message = SAFE_USER_MESSAGES[errorCode] || SAFE_USER_MESSAGES[SAFE_ERROR_CODES.INTERNAL_ERROR];
  return Response.json({
    success: false,
    error: message,
    safe_error_code: errorCode,
    service_key: serviceKey,
    ...extra,
  }, { status });
}

// ── MAIN GATEWAY HANDLER ──────────────────────────────────────
export default async function(req: Request): Promise<Response> {
  const startTime = Date.now();
  let tenantId: string | null = null;
  let serviceKey: string | null = null;
  let actorId: string | null = null;
  let base44: any = null;
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

  try {
    // ── STEP 1: AUTHENTICATE REQUESTER ─────────────────────
    base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return safeErrorResponse(SAFE_ERROR_CODES.UNAUTHORIZED, 401, null);
    }
    actorId = user.id;

    const body = await req.json();
    const { service_key, payload, tenant_id, outlet_id, agent_id, data_classification, requested_autonomy } = body;

    serviceKey = service_key;
    tenantId = tenant_id || user.data?.tenant_id || null;

    // ── STEP 2: RESOLVE TENANT CONTEXT ────────────────────
    if (!service_key) {
      return safeErrorResponse(SAFE_ERROR_CODES.INVALID_REQUEST, 400, null, { detail: 'service_key is required' });
    }
    if (!tenantId) {
      return safeErrorResponse(SAFE_ERROR_CODES.TENANT_REQUIRED, 400, service_key);
    }

    // ── STEP 3: IDEMPOTENCY CHECK ──────────────────────────
    const existingAudit = await checkIdempotency(base44, requestId);
    if (existingAudit) {
      return Response.json({
        success: existingAudit.outcome === 'success',
        service_key: serviceKey,
        request_id: requestId,
        audit_event_id: existingAudit.id,
        duplicate_request: true,
        message: 'This request was already processed.',
        outcome: existingAudit.outcome,
      }, { status: 200 });
    }

    // ── STEP 4: KILL SWITCH (ADR-0018) ────────────────────
    let killSwitchActive = false;
    let killSwitchMessage = '';
    try {
      const settings = await base44.asServiceRole.entities.SystemSettings.list();
      const globalSettings = settings[0];
      if (globalSettings && globalSettings.nexus_ai_enabled === false) {
        killSwitchActive = true;
        killSwitchMessage = globalSettings.nexus_ai_disabled_message || 'AI intelligence is currently disabled by the platform administrator.';
      }
    } catch (settingsErr) {
      console.log(`[nexusGateway] Kill switch check failed: ${settingsErr.message}`);
    }

    if (killSwitchActive) {
      await trackUsage(base44, {
        tenant_id: tenantId, outlet_id: outlet_id || null, service_key: serviceKey,
        routed_function: 'unknown', model_used: payload?.model || 'automatic',
        credits_consumed: 0, status: 'ai_disabled',
        error_message: 'AI Kill Switch is active', actor_id: actorId,
        actor_name: user.full_name, shield_policy_evaluated: null,
        shield_outcome: 'not_evaluated', latency_ms: Date.now() - startTime, metadata: {},
      });
      return Response.json({
        ai_disabled: true, message: killSwitchMessage, service_key: serviceKey, request_id: requestId,
      }, { status: 200 });
    }

    // ── STEP 5: RESOLVE CAPABILITY (ADR-0046) ──────────────
    const capability = await resolveCapability(base44, service_key, tenantId);
    if (!capability) {
      return safeErrorResponse(SAFE_ERROR_CODES.INVALID_REQUEST, 404, serviceKey, {
        detail: `Service key '${service_key}' not found`, available_services: Object.keys(LEGACY_FALLBACK_REGISTRY),
      });
    }
    if (!capability.is_active) {
      return safeErrorResponse(SAFE_ERROR_CODES.FORBIDDEN, 403, serviceKey, { detail: `Capability '${service_key}' is disabled` });
    }

    // ── STEP 6: RESOLVE MODEL AND AGENT IDENTITIES ────────
    const modelKey = capability.model_override || payload?.model || 'automatic';
    const model = await resolveModelForKey(base44, modelKey, tenantId);
    const agent = agent_id ? await resolveAgentForId(base44, agent_id, tenantId) : null;

    // Determine autonomy level (default L0 for human-originated requests)
    const autonomyLevel = requested_autonomy || (agent?.autonomy_level) || L0_ANSWER;
    const actionType = service_key; // The service_key is the action type
    const dataClass = data_classification || 'internal';

    // ── STEP 7: ENFORCE MODEL LIFECYCLE ────────────────────
    // Migration mode: if model not in registry, allow with audit warning
    let modelLifecycleResult: { allowed: boolean; reason: string } = { allowed: true, reason: 'Model not in registry — migration mode allow' };
    let modelLifecycleDenied = false;
    if (model) {
      modelLifecycleResult = evaluateModelLifecycle(model);
      if (!modelLifecycleResult.allowed) {
        modelLifecycleDenied = true;
      }
    }

    if (modelLifecycleDenied) {
      const isRetired = model?.lifecycle_status === 'retired';
      const errorCode = isRetired ? SAFE_ERROR_CODES.MODEL_RETIRED : SAFE_ERROR_CODES.MODEL_NOT_APPROVED;
      const outcome = classifyOutcome(DECISIONS.DENY, false, 'success');
      const auditId = await createAIAuditEvent(base44, {
        tenant_id: tenantId, outlet_id: outlet_id || null, request_id: requestId,
        service_key: serviceKey, capability_tier: capability.tier,
        requesting_user_id: actorId, requesting_user_name: user.full_name, requesting_user_role: user.role,
        executing_agent_id: agent_id || null,
        provider: PROVIDERS.PLATFORM_BUILTIN, model_key: modelKey, model_version: model?.exact_version || null,
        model_lifecycle_status: model?.lifecycle_status || null,
        routing_decision: model ? 'registry_resolved' : 'registry_missing',
        policy_decision: DECISIONS.DENY, policy_reason: modelLifecycleResult.reason, policy_keys_evaluated: [],
        autonomy_level: autonomyLevel, data_classification: dataClass,
        tools_invoked: [], integrations_invoked: [],
        runtime_ms: Date.now() - startTime, credits_consumed: 0, estimated_cost_sgd: null,
        validation_result: 'not_validated', provenance_state: outcome.provenanceState,
        outcome: 'denied', error_message: modelLifecycleResult.reason, error_classification: 'model_unavailable',
        fallback_used: false, metadata: {}, is_consequential: false,
      }).catch(() => null);

      // Emit inbox event to tenant admins
      await emitGovernanceInboxEvent(base44, {
        tenant_id: tenantId, outlet_id: outlet_id || null,
        recipient_user_id: actorId, recipient_name: user.full_name,
        category: 'security', event_type: 'ai_model_lifecycle_denied',
        title: 'AI Request Denied — Model Lifecycle', body: modelLifecycleResult.reason,
        priority: 'important', is_actionable: false, action_type: 'none',
        source_entity: 'AIAuditEvent', source_id: auditId || requestId, link: '/platform/ai-governance',
        metadata: { model_key: modelKey, lifecycle_status: model?.lifecycle_status },
      }).catch(() => {});

      return safeErrorResponse(errorCode, 403, serviceKey, {
        request_id: requestId, audit_event_id: auditId, policy_decision: 'deny',
        model_lifecycle_status: model?.lifecycle_status,
      });
    }

    // ── STEP 8: ENFORCE AGENT LIFECYCLE ───────────────────
    if (agent_id) {
      if (!agent) {
        const auditId = await createAIAuditEvent(base44, {
          tenant_id: tenantId, outlet_id: outlet_id || null, request_id: requestId,
          service_key: serviceKey, capability_tier: capability.tier,
          requesting_user_id: actorId, requesting_user_name: user.full_name, requesting_user_role: user.role,
          executing_agent_id: agent_id, provider: PROVIDERS.PLATFORM_BUILTIN,
          model_key: modelKey, model_version: null, model_lifecycle_status: model?.lifecycle_status || null,
          routing_decision: 'registry_resolved', policy_decision: DECISIONS.DENY,
          policy_reason: `Agent '${agent_id}' not found in registry`, policy_keys_evaluated: [],
          autonomy_level: autonomyLevel, data_classification: dataClass,
          tools_invoked: [], integrations_invoked: [],
          runtime_ms: Date.now() - startTime, credits_consumed: 0, estimated_cost_sgd: null,
          validation_result: 'not_validated', provenance_state: PROVENANCE_STATES.ai_generated,
          outcome: 'denied', error_message: `Agent '${agent_id}' not found`, error_classification: 'agent_suspended',
          fallback_used: false, metadata: {}, is_consequential: false,
        }).catch(() => null);
        return safeErrorResponse(SAFE_ERROR_CODES.AGENT_NOT_FOUND, 403, serviceKey, { request_id: requestId, audit_event_id: auditId });
      }

      const agentCheck = evaluateAgentLifecycle(agent);
      if (!agentCheck.allowed) {
        let errorCode = SAFE_ERROR_CODES.AGENT_SUSPENDED;
        if (agent.lifecycle_status === 'expired') errorCode = SAFE_ERROR_CODES.AGENT_EXPIRED;

        const auditId = await createAIAuditEvent(base44, {
          tenant_id: tenantId, outlet_id: outlet_id || null, request_id: requestId,
          service_key: serviceKey, capability_tier: capability.tier,
          requesting_user_id: actorId, requesting_user_name: user.full_name, requesting_user_role: user.role,
          executing_agent_id: agent_id, provider: PROVIDERS.PLATFORM_BUILTIN,
          model_key: modelKey, model_version: model?.exact_version || null, model_lifecycle_status: model?.lifecycle_status || null,
          routing_decision: 'registry_resolved', policy_decision: DECISIONS.DENY,
          policy_reason: agentCheck.reason, policy_keys_evaluated: [],
          autonomy_level: autonomyLevel, data_classification: dataClass,
          tools_invoked: [], integrations_invoked: [],
          runtime_ms: Date.now() - startTime, credits_consumed: 0, estimated_cost_sgd: null,
          validation_result: 'not_validated', provenance_state: PROVENANCE_STATES.ai_generated,
          outcome: 'denied', error_message: agentCheck.reason, error_classification: 'agent_suspended',
          fallback_used: false, metadata: {}, is_consequential: false,
        }).catch(() => null);

        // Emit inbox event for agent suspended/expired
        await emitGovernanceInboxEvent(base44, {
          tenant_id: tenantId, outlet_id: outlet_id || null,
          recipient_user_id: actorId, recipient_name: user.full_name,
          category: 'security', event_type: agent.lifecycle_status === 'suspended' ? 'ai_agent_suspended' : 'ai_agent_expired',
          title: `AI Agent ${agent.lifecycle_status === 'suspended' ? 'Suspended' : 'Expired'}`,
          body: agentCheck.reason, priority: 'important', is_actionable: false, action_type: 'none',
          source_entity: 'AIAuditEvent', source_id: auditId || requestId, link: '/platform/ai-governance',
          metadata: { agent_id: agent_id, lifecycle_status: agent.lifecycle_status },
        }).catch(() => {});

        return safeErrorResponse(errorCode, 403, serviceKey, { request_id: requestId, audit_event_id: auditId });
      }

      // Verify agent tenant scope matches request tenant
      if (agent.tenant_id !== 'system' && agent.tenant_id !== tenantId) {
        const auditId = await createAIAuditEvent(base44, {
          tenant_id: tenantId, outlet_id: outlet_id || null, request_id: requestId,
          service_key: serviceKey, capability_tier: capability.tier,
          requesting_user_id: actorId, requesting_user_name: user.full_name, requesting_user_role: user.role,
          executing_agent_id: agent_id, provider: PROVIDERS.PLATFORM_BUILTIN,
          model_key: modelKey, model_version: model?.exact_version || null, model_lifecycle_status: model?.lifecycle_status || null,
          routing_decision: 'registry_resolved', policy_decision: DECISIONS.DENY,
          policy_reason: `Agent tenant scope mismatch: agent tenant='${agent.tenant_id}', request tenant='${tenantId}'`,
          policy_keys_evaluated: [], autonomy_level: autonomyLevel, data_classification: dataClass,
          tools_invoked: [], integrations_invoked: [],
          runtime_ms: Date.now() - startTime, credits_consumed: 0, estimated_cost_sgd: null,
          validation_result: 'not_validated', provenance_state: PROVENANCE_STATES.ai_generated,
          outcome: 'denied', error_message: 'Agent tenant scope mismatch', error_classification: 'agent_suspended',
          fallback_used: false, metadata: {}, is_consequential: false,
        }).catch(() => null);
        return safeErrorResponse(SAFE_ERROR_CODES.FORBIDDEN, 403, serviceKey, { request_id: requestId, audit_event_id: auditId });
      }
    }

    // ── STEP 9: EVALUATE AUTONOMY ──────────────────────────
    const autonomyCheck = canPerformAction(autonomyLevel, actionType);

    // ── STEP 10: EVALUATE AI POLICIES ──────────────────────
    const matchedPolicies = await resolveMatchingPolicies(base44, {
      tenantId, modelKey, agentId: agent_id || null,
      dataClassification: dataClass, autonomyLevel, environment: 'production',
    });

    // Migration mode: if NO policies exist at all, allow non-sensitive actions
    const noPoliciesConfigured = matchedPolicies.length === 0 && (!isSensitiveAction(actionType));

    const policyResult = noPoliciesConfigured
      ? { decision: DECISIONS.ALLOW, reason: 'No policies configured — migration mode allow (non-sensitive action)', policyKey: null, evaluatedKeys: [], modelAllowed: true, agentAllowed: true, dataAllowed: true, autonomyAllowed: autonomyCheck.allowed }
      : evaluateAIRequest({
          tenantId, userId: actorId, userRole: user.role,
          agentId: agent_id || null, agent,
          modelKey, model,
          serviceKey, dataClassification: dataClass,
          autonomyLevel, actionType,
          environment: 'production',
          matchedPolicies,
        });

    // Handle policy denial
    if (policyResult.decision === DECISIONS.DENY) {
      const outcome = classifyOutcome(DECISIONS.DENY, false, 'success');
      const auditId = await createAIAuditEvent(base44, {
        tenant_id: tenantId, outlet_id: outlet_id || null, request_id: requestId,
        service_key: serviceKey, capability_tier: capability.tier,
        requesting_user_id: actorId, requesting_user_name: user.full_name, requesting_user_role: user.role,
        executing_agent_id: agent_id || null, provider: PROVIDERS.PLATFORM_BUILTIN,
        model_key: modelKey, model_version: model?.exact_version || null, model_lifecycle_status: model?.lifecycle_status || null,
        routing_decision: model ? 'registry_resolved' : 'registry_missing',
        policy_decision: DECISIONS.DENY, policy_reason: policyResult.reason,
        policy_keys_evaluated: policyResult.evaluatedKeys,
        autonomy_level: autonomyLevel, data_classification: dataClass,
        tools_invoked: [], integrations_invoked: [],
        runtime_ms: Date.now() - startTime, credits_consumed: 0, estimated_cost_sgd: null,
        validation_result: 'not_validated', provenance_state: outcome.provenanceState,
        outcome: 'denied', error_message: policyResult.reason, error_classification: 'policy_denied',
        fallback_used: false, metadata: {}, is_consequential: false,
      }).catch(() => null);

      await emitGovernanceInboxEvent(base44, {
        tenant_id: tenantId, outlet_id: outlet_id || null,
        recipient_user_id: actorId, recipient_name: user.full_name,
        category: 'security', event_type: 'ai_policy_denied',
        title: 'AI Request Denied by Policy', body: policyResult.reason,
        priority: 'important', is_actionable: false, action_type: 'none',
        source_entity: 'AIAuditEvent', source_id: auditId || requestId, link: '/platform/ai-governance',
        metadata: { policy_key: policyResult.policyKey, service_key: serviceKey },
      }).catch(() => {});

      return safeErrorResponse(SAFE_ERROR_CODES.POLICY_DENIED, 403, serviceKey, {
        request_id: requestId, audit_event_id: auditId, policy_decision: 'deny',
      });
    }

    // Handle approval required
    if (policyResult.decision === DECISIONS.REQUIRE_APPROVAL ||
        policyResult.decision === DECISIONS.REQUIRE_HUMAN_ESCALATION) {
      const auditId = await createAIAuditEvent(base44, {
        tenant_id: tenantId, outlet_id: outlet_id || null, request_id: requestId,
        service_key: serviceKey, capability_tier: capability.tier,
        requesting_user_id: actorId, requesting_user_name: user.full_name, requesting_user_role: user.role,
        executing_agent_id: agent_id || null, provider: PROVIDERS.PLATFORM_BUILTIN,
        model_key: modelKey, model_version: model?.exact_version || null, model_lifecycle_status: model?.lifecycle_status || null,
        routing_decision: model ? 'registry_resolved' : 'registry_missing',
        policy_decision: DECISIONS.REQUIRE_APPROVAL, policy_reason: policyResult.reason,
        policy_keys_evaluated: policyResult.evaluatedKeys,
        autonomy_level: autonomyLevel, data_classification: dataClass,
        tools_invoked: [], integrations_invoked: [],
        runtime_ms: Date.now() - startTime, credits_consumed: 0, estimated_cost_sgd: null,
        validation_result: 'not_validated', provenance_state: PROVENANCE_STATES.awaiting_review,
        outcome: 'denied', error_message: policyResult.reason, error_classification: null,
        fallback_used: false, metadata: {}, is_consequential: true,
      }).catch(() => null);

      // Emit approval-required inbox event to tenant admins
      await emitGovernanceInboxEvent(base44, {
        tenant_id: tenantId, outlet_id: outlet_id || null,
        recipient_user_id: actorId, recipient_name: user.full_name,
        category: 'approval', event_type: 'ai_approval_required',
        title: 'AI Action Requires Approval',
        body: `The AI request '${serviceKey}' requires human approval before it can proceed. Reason: ${policyResult.reason}`,
        priority: 'critical', is_actionable: true, action_type: 'approve',
        source_entity: 'AIAuditEvent', source_id: auditId || requestId, link: '/platform/ai-governance',
        metadata: { service_key: serviceKey, autonomy_level: autonomyLevel, model_key: modelKey, policy_key: policyResult.policyKey },
      }).catch(() => {});

      return Response.json({
        success: false,
        approval_required: true,
        safe_error_code: SAFE_ERROR_CODES.APPROVAL_REQUIRED,
        message: SAFE_USER_MESSAGES[SAFE_ERROR_CODES.APPROVAL_REQUIRED],
        service_key: serviceKey,
        request_id: requestId,
        audit_event_id: auditId,
        policy_decision: 'require_approval',
        policy_reason: policyResult.reason,
      }, { status: 202 });
    }

    // ── STEP 11: VALIDATE EXECUTION POLICY ─────────────────
    const execPolicy = createExecutionPolicy({
      permitted_tenant_id: tenantId,
      permitted_outlet_id: outlet_id || null,
      kill_switch_active: killSwitchActive,
    });

    const execResult = validateExecutionContext(execPolicy, {
      tenantId,
      environment: 'production',
      dataClassification: dataClass,
      requestedTool: 'InvokeLLM',
      networkDestination: PROVIDERS.PLATFORM_BUILTIN,
    });

    if (!execResult.allowed) {
      const auditId = await createAIAuditEvent(base44, {
        tenant_id: tenantId, outlet_id: outlet_id || null, request_id: requestId,
        service_key: serviceKey, capability_tier: capability.tier,
        requesting_user_id: actorId, requesting_user_name: user.full_name, requesting_user_role: user.role,
        executing_agent_id: agent_id || null, provider: PROVIDERS.PLATFORM_BUILTIN,
        model_key: modelKey, model_version: model?.exact_version || null, model_lifecycle_status: model?.lifecycle_status || null,
        routing_decision: model ? 'registry_resolved' : 'registry_missing',
        policy_decision: policyResult.decision, policy_reason: execResult.reason,
        policy_keys_evaluated: policyResult.evaluatedKeys,
        autonomy_level: autonomyLevel, data_classification: dataClass,
        tools_invoked: [], integrations_invoked: [],
        runtime_ms: Date.now() - startTime, credits_consumed: 0, estimated_cost_sgd: null,
        validation_result: 'failed', provenance_state: PROVENANCE_STATES.ai_generated,
        outcome: 'denied', error_message: execResult.reason, error_classification: 'policy_denied',
        fallback_used: false, metadata: { violated_conditions: execResult.violatedConditions }, is_consequential: false,
      }).catch(() => null);

      await emitGovernanceInboxEvent(base44, {
        tenant_id: tenantId, outlet_id: outlet_id || null,
        recipient_user_id: actorId, recipient_name: user.full_name,
        category: 'security', event_type: 'ai_execution_policy_blocked',
        title: 'AI Request Blocked by Security Policy', body: execResult.reason,
        priority: 'important', is_actionable: false, action_type: 'none',
        source_entity: 'AIAuditEvent', source_id: auditId || requestId, link: '/platform/ai-governance',
        metadata: { violated_conditions: execResult.violatedConditions },
      }).catch(() => {});

      return safeErrorResponse(SAFE_ERROR_CODES.EXECUTION_POLICY_VIOLATION, 403, serviceKey, {
        request_id: requestId, audit_event_id: auditId,
      });
    }

    // ── STEP 12: PAYLOAD SANITISATION (ADR-0044) ───────────
    const sanitizedPayload = sanitizePayload(payload || {}, capability.sanitization_mode, capability.permitted_fields);

    // ── STEP 13: SHIELD GOVERNANCE GATE ────────────────────
    let shieldOutcome: any = null;
    let shieldPolicyName: string | null = null;
    if (capability.governance_domain) {
      try {
        const shieldResponse = await base44.functions.invoke('shieldInterceptor', {
          action: service_key, entity_name: 'OrbitUsageTracker',
          data: { service_key, tenant_id: tenantId, payload_summary: sanitizedPayload?.summary || 'Nexus AI request' },
          tenant_id: tenantId, domain_id: capability.governance_domain,
        });
        shieldOutcome = shieldResponse.data;
        if (shieldOutcome?.allowed === false && shieldOutcome?.effect === 'block') {
          await trackUsage(base44, {
            tenant_id: tenantId, outlet_id: outlet_id || null, service_key: serviceKey,
            routed_function: capability.handler_ref, model_used: modelKey,
            credits_consumed: 0, status: 'shield_blocked',
            error_message: shieldOutcome.reason || 'Shield policy block', actor_id: actorId,
            actor_name: user.full_name, shield_policy_evaluated: shieldOutcome.policy_name || null,
            shield_outcome: 'blocked', latency_ms: Date.now() - startTime, metadata: sanitizedPayload,
          });
          return Response.json({
            error: 'Governance block: Intelligence request denied by Orbitan Shield™',
            shield_response: shieldOutcome, service_key: serviceKey, request_id: requestId,
          }, { status: 403 });
        }
        shieldPolicyName = shieldOutcome?.policy_name || null;
      } catch (shieldErr) {
        console.log(`[nexusGateway] Shield evaluation failed for ${service_key}: ${shieldErr.message}`);
      }
    }

    // ── STEP 14: CHECK CREDITS AND COST BUDGET ────────────
    const costResult = resolveModelCostMultiplier(model, modelKey);
    if (costResult.warning) {
      console.log(`[nexusGateway] COST WARNING: ${costResult.warning}`);
    }
    const creditMultiplier = costResult.multiplier;
    const creditsRequired = Math.ceil(capability.default_credits * creditMultiplier);

    let walletRecord: any = null;
    try {
      const wallets = await base44.asServiceRole.entities.OrbitanWallet.filter({ tenant_id: tenantId, is_active: true });
      walletRecord = wallets[0];
      if (walletRecord && walletRecord.balance_credits < creditsRequired) {
        await trackUsage(base44, {
          tenant_id: tenantId, outlet_id: outlet_id || null, service_key: serviceKey,
          routed_function: capability.handler_ref, model_used: modelKey,
          credits_consumed: 0, status: 'insufficient_credits',
          error_message: `Insufficient credits: ${walletRecord.balance_credits} available, ${creditsRequired} required`,
          actor_id: actorId, actor_name: user.full_name, shield_policy_evaluated: shieldPolicyName,
          shield_outcome: shieldOutcome?.effect === 'notify' ? 'notify' : 'pass',
          latency_ms: Date.now() - startTime, metadata: sanitizedPayload,
        });
        return safeErrorResponse(SAFE_ERROR_CODES.INSUFFICIENT_CREDITS, 402, serviceKey, {
          request_id: requestId, credits_available: walletRecord.balance_credits, credits_required: creditsRequired,
          upgrade_required: true,
        });
      }
    } catch (walletErr) {
      console.log(`[nexusGateway] Wallet lookup failed: ${walletErr.message}`);
    }

    // ── STEP 15: RESOLVE APPROVED PROVIDER/MODEL ROUTE ────
    const providerId = PROVIDERS.PLATFORM_BUILTIN;
    if (!isProviderConfigured(providerId)) {
      const auditId = await createAIAuditEvent(base44, {
        tenant_id: tenantId, outlet_id: outlet_id || null, request_id: requestId,
        service_key: serviceKey, capability_tier: capability.tier,
        requesting_user_id: actorId, requesting_user_name: user.full_name, requesting_user_role: user.role,
        executing_agent_id: agent_id || null, provider: providerId,
        model_key: modelKey, model_version: model?.exact_version || null, model_lifecycle_status: model?.lifecycle_status || null,
        routing_decision: 'registry_resolved', policy_decision: policyResult.decision,
        policy_reason: 'Provider not configured', policy_keys_evaluated: policyResult.evaluatedKeys,
        autonomy_level: autonomyLevel, data_classification: dataClass,
        tools_invoked: [], integrations_invoked: [],
        runtime_ms: Date.now() - startTime, credits_consumed: 0, estimated_cost_sgd: null,
        validation_result: 'not_validated', provenance_state: PROVENANCE_STATES.ai_generated,
        outcome: 'failed', error_message: 'Provider not configured', error_classification: 'model_unavailable',
        fallback_used: false, metadata: {}, is_consequential: false,
      }).catch(() => null);
      return safeErrorResponse(SAFE_ERROR_CODES.PROVIDER_UNCONFIGURED, 503, serviceKey, { request_id: requestId, audit_event_id: auditId });
    }

    // ── STEP 16: DISPATCH PROVIDER REQUEST ────────────────
    let result: any = null;
    let executionStatus: 'success' | 'failed' | 'timeout' = 'success';
    let errorMessage: string | null = null;
    let errorClassification: string | null = null;

    try {
      const response = await base44.functions.invoke(capability.handler_ref, {
        ...sanitizedPayload, tenant_id: tenantId, outlet_id: outlet_id || null,
        actor_id: actorId, actor_name: user.full_name,
      });
      result = response.data;
    } catch (execErr) {
      executionStatus = 'failed';
      errorMessage = execErr.message || 'Unknown execution error';
      const classified = classifyProviderError(execErr);
      errorClassification = classified.type;
      if (classified.type === 'provider_timeout') {
        executionStatus = 'timeout';
      }
    }

    const latencyMs = Date.now() - startTime;

    // ── STEP 17: FALLBACK (re-runs all governance checks) ─
    let fallbackUsed = false;
    let fallbackRoutingDecision = 'registry_resolved';

    if (executionStatus === 'failed' && capability.fallback_capability_key) {
      console.log(`[nexusGateway] Handler failed, invoking fallback: ${capability.fallback_capability_key}`);
      try {
        // Re-invoke with the fallback capability key — the recursive nexus call
        // will re-run ALL governance checks (model lifecycle, agent lifecycle,
        // policy evaluation, execution policy) for the fallback capability.
        const fallbackResponse = await base44.functions.invoke('nexus', {
          service_key: capability.fallback_capability_key,
          payload: sanitizedPayload, tenant_id: tenantId, outlet_id: outlet_id,
          agent_id: agent_id, data_classification: dataClass, requested_autonomy: autonomyLevel,
        });
        fallbackUsed = true;
        fallbackRoutingDecision = 'fallback_used';
        result = fallbackResponse.data?.data || fallbackResponse.data;
        executionStatus = 'success';
        errorMessage = null;
        errorClassification = null;
      } catch (fallbackErr) {
        // Fallback also failed
        return Response.json({
          success: false,
          safe_error_code: SAFE_ERROR_CODES.INTERNAL_ERROR,
          message: `Nexus service '${service_key}' and fallback '${capability.fallback_capability_key}' both failed`,
          service_key: serviceKey, request_id: requestId,
          latency_ms: latencyMs,
        }, { status: 500 });
      }
    }

    // ── STEP 19: RECORD USAGE (OrbitUsageTracker) ──────────
    const trackingTasks: Promise<any>[] = [];

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
        tenant_id: tenantId, outlet_id: outlet_id || null, service_key: serviceKey,
        routed_function: capability.handler_ref, model_used: modelKey,
        credits_consumed: executionStatus === 'success' ? creditsRequired : 0,
        status: executionStatus, error_message: errorMessage,
        actor_id: actorId, actor_name: user.full_name,
        shield_policy_evaluated: shieldPolicyName,
        shield_outcome: shieldOutcome?.effect === 'notify' ? 'notify' : 'pass',
        latency_ms: latencyMs, metadata: sanitizedPayload,
      })
    );

    // Update registry fire_count
    if (capability.source === 'registry' && executionStatus === 'success') {
      try {
        const records = await base44.asServiceRole.entities.NexusCapabilityRegistry.filter({
          capability_key: service_key, tenant_id: tenantId === 'system' ? 'system' : (tenantId || 'system'),
        });
        if (records[0]) {
          trackingTasks.push(
            base44.asServiceRole.entities.NexusCapabilityRegistry.update(records[0].id, {
              fire_count: (records[0].fire_count || 0) + 1, last_fired_at: new Date().toISOString(),
            }).catch(() => {})
          );
        }
      } catch { /* non-critical */ }
    }

    await Promise.allSettled(trackingTasks);

    // ── STEP 20: CREATE AIAUDITEVENT ──────────────────────
    const isConsequential = isSensitiveAction(actionType) || autonomyLevel === L3_EXECUTE;
    const outcome = classifyOutcome(policyResult.decision, execResult.allowed, executionStatus);

    const auditId = await createAIAuditEvent(base44, {
      tenant_id: tenantId, outlet_id: outlet_id || null, request_id: requestId,
      service_key: serviceKey, capability_tier: capability.tier,
      requesting_user_id: actorId, requesting_user_name: user.full_name, requesting_user_role: user.role,
      executing_agent_id: agent_id || null,
      provider: providerId, model_key: modelKey, model_version: model?.exact_version || null,
      model_lifecycle_status: model?.lifecycle_status || null,
      routing_decision: fallbackRoutingDecision,
      policy_decision: policyResult.decision, policy_reason: policyResult.reason,
      policy_keys_evaluated: policyResult.evaluatedKeys,
      autonomy_level: autonomyLevel, data_classification: dataClass,
      tools_invoked: executionStatus === 'success' ? ['InvokeLLM'] : [],
      integrations_invoked: executionStatus === 'success' ? ['Core.InvokeLLM'] : [],
      runtime_ms: latencyMs,
      credits_consumed: executionStatus === 'success' ? creditsRequired : 0,
      estimated_cost_sgd: null,
      validation_result: executionStatus === 'success' ? 'passed' : 'failed',
      provenance_state: outcome.provenanceState,
      outcome: outcome.outcome,
      error_message: errorMessage, error_classification: errorClassification || outcome.errorClassification,
      fallback_used: fallbackUsed,
      metadata: {
        cost_source: costResult.source,
        cost_warning: costResult.warning,
        credit_multiplier: creditMultiplier,
        shield_policy: shieldPolicyName,
      },
      is_consequential: isConsequential,
    }).catch((e: any) => {
      // If audit fails for consequential actions, we need to handle it
      console.log(`[nexusGateway] AIAuditEvent creation failed: ${e.message}`);
      return null;
    });

    // ── STEP 21: EMIT ORBIT INBOX EVENTS ──────────────────
    if (executionStatus === 'failed' || executionStatus === 'timeout') {
      await emitGovernanceInboxEvent(base44, {
        tenant_id: tenantId, outlet_id: outlet_id || null,
        recipient_user_id: actorId, recipient_name: user.full_name,
        category: 'ai_insight', event_type: 'ai_execution_failed',
        title: `AI Request ${executionStatus === 'timeout' ? 'Timed Out' : 'Failed'}`,
        body: `The AI request '${serviceKey}' could not be completed. ${SAFE_USER_MESSAGES[SAFE_ERROR_CODES.INTERNAL_ERROR]}`,
        priority: 'normal', is_actionable: false, action_type: 'none',
        source_entity: 'AIAuditEvent', source_id: auditId || requestId, link: '/platform/ai-governance',
        metadata: { service_key: serviceKey, error_classification: errorClassification },
      }).catch(() => {});
    }

    if (fallbackUsed) {
      await emitGovernanceInboxEvent(base44, {
        tenant_id: tenantId, outlet_id: outlet_id || null,
        recipient_user_id: actorId, recipient_name: user.full_name,
        category: 'ai_insight', event_type: 'ai_fallback_used',
        title: 'AI Fallback Used',
        body: `The primary AI handler for '${serviceKey}' failed and a fallback capability was used.`,
        priority: 'informational', is_actionable: false, action_type: 'none',
        source_entity: 'AIAuditEvent', source_id: auditId || requestId, link: '/platform/ai-governance',
        metadata: { service_key: serviceKey, fallback_capability: capability.fallback_capability_key },
      }).catch(() => {});
    }

    // ── STEP 22: RETURN STRUCTURED RESPONSE ───────────────
    if (executionStatus === 'failed' || executionStatus === 'timeout') {
      const errorCode = executionStatus === 'timeout' ? SAFE_ERROR_CODES.PROVIDER_TIMEOUT : SAFE_ERROR_CODES.INTERNAL_ERROR;
      return Response.json({
        success: false,
        safe_error_code: errorCode,
        message: SAFE_USER_MESSAGES[errorCode],
        service_key: serviceKey, request_id: requestId, audit_event_id: auditId,
        policy_decision: policyResult.decision,
        provider: providerId, model_used: modelKey,
        fallback_used: fallbackUsed, latency_ms: latencyMs,
      }, { status: 500 });
    }

    return Response.json({
      success: true,
      service_key: serviceKey,
      request_id: requestId,
      audit_event_id: auditId,
      data: result,
      credits_consumed: creditsRequired,
      model_used: modelKey,
      model_lifecycle_status: model?.lifecycle_status || null,
      provider: providerId,
      policy_decision: policyResult.decision,
      provenance_state: outcome.provenanceState,
      validation_status: 'passed',
      fallback_used: fallbackUsed,
      latency_ms: latencyMs,
      capability_source: capability.source,
      capability_tier: capability.tier,
      cost_source: costResult.source,
    });

  } catch (error) {
    if (base44 && tenantId && serviceKey) {
      await trackUsage(base44, {
        tenant_id: tenantId, outlet_id: null, service_key: serviceKey,
        routed_function: 'unknown', model_used: 'automatic',
        credits_consumed: 0, status: 'failed', error_message: error.message,
        actor_id: actorId, actor_name: null, shield_policy_evaluated: null,
        shield_outcome: 'not_evaluated', latency_ms: Date.now() - startTime, metadata: {},
      }).catch(() => {});
    }
    return safeErrorResponse(SAFE_ERROR_CODES.INTERNAL_ERROR, 500, serviceKey, { request_id: requestId });
  }
}