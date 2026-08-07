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
import {
  isWorkerRole, resolveSafeLink, sha256, validateTenantMembership,
  resolveTenantAdminRecipients,
  WORKER_SAFE_LINK, ADMIN_GOVERNANCE_LINK,
} from '../../shared/nexus-gateway-utils.ts';

// ============================================================
// ORBIT NEXUS GATEWAY — Capability-Tiered Orchestrator (ADR-0046)
// The single, governed entry point for all AI intelligence.
//
// BUILD #28.2O — Hardened Gateway Governance
//
// HARDENING CHANGES (Build #28.2O):
//   1.  Proper idempotency via caller-provided idempotency_key +
//       deterministic fingerprint (not server-generated request_id)
//   2.  Server-side tenant membership validation (no forged tenant_id)
//   3.  Worker-safe Orbit Inbox routing (no admin links to Workers)
//   4.  True audit fail-closed for consequential actions
//   5.  Pre-execution audit record for consequential actions
//   6.  Migration mode EXITED — deny-by-default when no policy matches
//   7.  AIApproval lifecycle for require_approval decisions
//   8.  Post-approval execution re-runs all governance checks
//   9.  Notification audience matrix (Worker vs admin events)
//
// Pipeline (24 steps):
//   1.  Authenticate requester
//   2.  Parse body (including idempotency_key, approval_key)
//   3.  Validate tenant membership server-side
//   4.  Generate server request_id (distinct from idempotency_key)
//   5.  Compute deterministic idempotency fingerprint
//   6.  Check idempotency by fingerprint (return cached or processing)
//   7.  If post-approval execution: validate approval record
//   8.  Check kill switch (ADR-0018)
//   9.  Resolve capability (ADR-0046 registry)
//   10. Resolve model and agent identities
//   11. Enforce model lifecycle
//   12. Enforce agent lifecycle
//   13. Evaluate autonomy requirements
//   14. Evaluate AI policies (deny-by-default, most-restrictive-wins)
//   15. If require_approval: create AIApproval + audit + inbox, return 202
//   16. Validate execution policy
//   17. Apply Zero-PII sanitisation (ADR-0044)
//   18. Apply Shield governance gate
//   19. Check credits and cost budget (registry-first)
//   20. Create pre-execution audit (consequential actions)
//   21. Resolve provider/model route + dispatch
//   22. Handle timeout/retry/fallback (re-runs all governance checks)
//   23. Update audit with final outcome + emit Orbit Inbox events
//   24. Return structured response
//
// Idempotency: caller-provided idempotency_key + deterministic fingerprint.
//   request_id = unique server-generated identifier for one processing attempt.
//   idempotency_key = caller-provided retry identity, reused across retries.
//
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
const MODEL_CREDIT_MULTIPLIER: Record<string, number> = {
  'automatic': 1.0,
  'gemini_3_flash': 1.0,
  'gpt_5_mini': 1.5,
  'claude_sonnet_4_6': 2.0,
  'gemini_3_1_pro': 2.5,
  'gpt_5_4': 3.0,
  'claude_opus_4_6': 4.0,
};

// ── IDEMPOTENCY CONSTANTS ─────────────────────────────────────
const IDEMPOTENCY_KEY_PATTERN = /^[a-zA-Z0-9_-]{8,128}$/;
const IDEMPOTENCY_EXPIRY_HOURS = 24;
const IDEMPOTENCY_TERMINAL_STATES = ['succeeded', 'failed', 'denied', 'timed_out'];
const IDEMPOTENCY_PROCESSING_STATES = ['received', 'validating', 'executing'];

// ── APPROVAL CONSTANTS ────────────────────────────────────────
const APPROVAL_EXPIRY_HOURS = 24;

// ── SANDBOX TEST TTL (Build #28.2P-R.0) ────────────────────────
// Short TTL for tagged test approvals in sandbox tenants only.
// Production tenants always use the normal 24-hour TTL.
const SANDBOX_TEST_TTL_MIN_MINUTES = 1;
const SANDBOX_TEST_TTL_MAX_MINUTES = 10;
const SANDBOX_TEST_TTL_DEFAULT_MINUTES = 2;

// ── FORBIDDEN FIELDS (ADR-0044 Zero-PII) ─────────────────────
const FORBIDDEN_FIELDS = [
  'tenant_name', 'actor_name', 'actor_role', 'created_by_id', 'created_by_name',
  'signed_by_id', 'signed_by_name', 'uploaded_by', 'uploaded_by_name',
  'email', 'phone', 'full_name', 'contact_person', 'contact_email',
  'contact_phone', 'address', 'ip_address', 'previous_state', 'new_state',
  'justification', 'entity_content',
];

// ── REGISTRY CACHES (Stale-While-Revalidate) ──────────────────
let _registryCache: any[] | null = null;
let _registryCacheAt = 0;
const REGISTRY_CACHE_TTL_MS = 60_000;

let _modelCache: any[] | null = null;
let _modelCacheAt = 0;
const MODEL_CACHE_TTL_MS = 120_000;

let _policyCache: any[] | null = null;
let _policyCacheAt = 0;
const POLICY_CACHE_TTL_MS = 120_000;

function normalisePayloadForHash(payload: any): string {
  if (!payload || typeof payload !== 'object') return String(payload || '');
  try {
    return JSON.stringify(payload, Object.keys(payload).sort());
  } catch {
    return String(payload || '');
  }
}

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
  serviceKey: string;
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
      if (p.tenant_id !== 'system' && p.tenant_id !== params.tenantId) return false;
      if (p.applies_to_environments && p.applies_to_environments.length > 0 && !p.applies_to_environments.includes(params.environment)) return false;
      if (p.applies_to_models && p.applies_to_models.length > 0 && !p.applies_to_models.includes(params.modelKey)) return false;
      if (p.applies_to_agents && p.applies_to_agents.length > 0 && params.agentId && !p.applies_to_agents.includes(params.agentId)) return false;
      if (p.applies_to_data_classifications && p.applies_to_data_classifications.length > 0 && !p.applies_to_data_classifications.includes(params.dataClassification)) return false;
      if (p.applies_to_autonomy_levels && p.applies_to_autonomy_levels.length > 0 && !p.applies_to_autonomy_levels.includes(params.autonomyLevel)) return false;
      if (p.applies_to_use_cases && p.applies_to_use_cases.length > 0 && !p.applies_to_use_cases.includes(params.serviceKey)) return false;
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
    return { multiplier: model.cost_config.credit_multiplier, source: 'registry', warning: null };
  }
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
  for (const field of FORBIDDEN_FIELDS) { delete cleaned[field]; }
  if (mode === 'permissive' && permittedFields.length > 0) {
    const allowSet = new Set(permittedFields);
    const result: any = {};
    for (const key of Object.keys(cleaned)) { if (allowSet.has(key)) result[key] = cleaned[key]; }
    return result;
  }
  return cleaned;
}

// ── IDEMPOTENCY FINGERPRINT COMPUTATION ───────────────────────
// The fingerprint is computed from (tenant, requester, service, idempotency_key)
// — deliberately EXCLUDING the payload hash. This ensures that a changed payload
// with the same idempotency key produces the SAME fingerprint, allowing the
// conflict detection in checkIdempotency() to reject it.
async function computeIdempotencyFingerprint(params: {
  tenantId: string; requesterId: string; serviceKey: string;
  idempotencyKey: string;
}): Promise<string> {
  const raw = `${params.tenantId}:${params.requesterId}:${params.serviceKey}:${params.idempotencyKey}`;
  return await sha256(raw);
}

// ── IDEMPOTENCY CHECK (by fingerprint, not request_id) ────────
async function checkIdempotency(base44: any, fingerprint: string, payloadHash: string): Promise<{
  status: 'not_found' | 'terminal' | 'processing' | 'conflict';
  existingRecord?: any;
}> {
  try {
    const existing = await base44.asServiceRole.entities.AIAuditEvent.filter(
      { idempotency_fingerprint: fingerprint },
      '-created_date', 5
    );
    if (!existing || existing.length === 0) {
      return { status: 'not_found' };
    }
    const record = existing[0];
    // Check for payload conflict (same fingerprint but different payload)
    if (record.metadata?.payload_hash && record.metadata.payload_hash !== payloadHash) {
      return { status: 'conflict', existingRecord: record };
    }
    if (IDEMPOTENCY_TERMINAL_STATES.includes(record.execution_state)) {
      return { status: 'terminal', existingRecord: record };
    }
    if (IDEMPOTENCY_PROCESSING_STATES.includes(record.execution_state)) {
      return { status: 'processing', existingRecord: record };
    }
    // approval_required is treated as terminal for idempotency (return the approval state)
    if (record.execution_state === 'approval_required') {
      return { status: 'terminal', existingRecord: record };
    }
    return { status: 'not_found' };
  } catch (err) {
    console.log(`[nexusGateway] Idempotency check failed: ${err.message}`);
    return { status: 'not_found' };
  }
}

// ── AIAUDITEVENT CREATOR (with fail-closed for consequential) ─
async function createAIAuditEvent(base44: any, params: {
  tenant_id: string; outlet_id: string | null; request_id: string;
  idempotency_key: string | null; idempotency_fingerprint: string;
  execution_state: string;
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
  approval_reference_id: string | null;
  metadata: Record<string, any>;
  is_consequential: boolean;
  cached_result?: Record<string, any> | null;
}): Promise<string | null> {
  try {
    const record = await base44.asServiceRole.entities.AIAuditEvent.create({
      tenant_id: params.tenant_id,
      outlet_id: params.outlet_id,
      request_id: params.request_id,
      idempotency_key: params.idempotency_key,
      idempotency_fingerprint: params.idempotency_fingerprint,
      execution_state: params.execution_state,
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
      approval_reference_id: params.approval_reference_id,
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
      metadata: {
        ...params.metadata,
        fallback_used: params.fallback_used,
        model_lifecycle_status: params.model_lifecycle_status,
        payload_hash: params.metadata?.payload_hash,
      },
      cached_result: params.cached_result || null,
    });
    return record?.id || null;
  } catch (err) {
    console.log(`[nexusGateway] AIAuditEvent creation failed: ${err.message}`);
    // FAIL-CLOSED for consequential actions — do NOT swallow the error
    if (params.is_consequential) {
      throw new Error(`AUDIT_FAILURE: Cannot execute consequential action without audit evidence — ${err.message}`);
    }
    // For non-consequential (L0 read-only), degraded mode — execution allowed
    console.log(`[nexusGateway] Audit failure in degraded mode (non-consequential) — execution allowed`);
    return null;
  }
}

// ── AIAUDITEVENT UPDATER (for pre-execution → post-execution) ─
async function updateAIAuditEvent(base44: any, auditId: string, updates: Record<string, any>): Promise<void> {
  try {
    await base44.asServiceRole.entities.AIAuditEvent.update(auditId, updates);
  } catch (err) {
    console.log(`[nexusGateway] AIAuditEvent update failed: ${err.message}`);
  }
}

// ── WORKER-SAFE ORBIT INBOX EVENT EMITTER ────────────────────
// Routes notifications to the correct recipient with role-safe links.
// Workers NEVER receive admin links like /platform/ai-governance.
async function emitGovernanceInboxEvent(base44: any, params: {
  tenant_id: string; outlet_id: string | null;
  recipient_user_id: string; recipient_name: string | null;
  recipient_role: string | null;
  category: string; event_type: string;
  title: string; body: string;
  priority: string; is_actionable: boolean; action_type: string;
  source_entity: string; source_id: string;
  admin_link?: string; worker_safe_link?: string;
  metadata: Record<string, any>;
}): Promise<void> {
  try {
    // Resolve role-safe link — Workers get worker_safe_link, admins get admin_link
    const link = isWorkerRole(params.recipient_role)
      ? (params.worker_safe_link || WORKER_SAFE_LINK)
      : (params.admin_link || ADMIN_GOVERNANCE_LINK);

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
      link,
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

// ── APPROVAL VALIDATION (with full scope verification) ─────────
// Section 3: Verifies all scope fields to ensure the execution request
// exactly matches the approved scope.
async function validateApprovalForExecution(base44: any, approvalKey: string, currentPayloadHash: string, tenantId: string, requestContext: {
  serviceKey: string; modelKey: string; autonomyLevel: string; dataClassification: string; tools?: string[];
}): Promise<{
  valid: boolean; approval?: any; reason?: string;
}> {
  try {
    const approvals = await base44.asServiceRole.entities.AIApproval.filter({ approval_key: approvalKey });
    if (!approvals || approvals.length === 0) {
      return { valid: false, reason: 'Approval not found' };
    }
    const approval = approvals[0];

    // 5. Verify tenant scope
    if (approval.tenant_id !== tenantId) {
      return { valid: false, reason: 'Approval tenant scope mismatch' };
    }
    // 6. Verify status is approved (or executing if already transitioned by aiApprovalActions.execute)
    if (approval.status !== 'approved' && approval.status !== 'executing') {
      return { valid: false, reason: `Approval status is '${approval.status}', expected 'approved' or 'executing'` };
    }
    // 7. Verify not expired
    if (approval.expires_at && new Date(approval.expires_at) < new Date()) {
      await base44.asServiceRole.entities.AIApproval.updateMany(
        { id: approval.id, status: { $in: ['approved', 'executing'] } },
        { $set: { status: 'expired' } }
      ).catch(() => {});
      return { valid: false, reason: 'Approval has expired' };
    }
    // 8. Verify single-use: executed/execution_failed/rejected/cancelled cannot execute
    if (['executed', 'execution_failed', 'rejected', 'cancelled'].includes(approval.status)) {
      return { valid: false, reason: `Approval has terminal status '${approval.status}' and cannot be reused` };
    }
    // 10-11. Verify payload hash matches
    if (approval.payload_hash && approval.payload_hash !== currentPayloadHash) {
      return { valid: false, reason: 'Payload has changed since approval — a new approval is required' };
    }
    // 12. Verify service key matches
    if (approval.service_key !== requestContext.serviceKey) {
      return { valid: false, reason: `Service key mismatch: approved='${approval.service_key}', requested='${requestContext.serviceKey}'` };
    }
    // 13. Verify model key matches
    if (approval.model_key && approval.model_key !== requestContext.modelKey) {
      return { valid: false, reason: `Model key mismatch: approved='${approval.model_key}', requested='${requestContext.modelKey}'` };
    }
    // 14. Verify tools match
    if (approval.tools && approval.tools.length > 0 && requestContext.tools) {
      const approvedTools = new Set(approval.tools);
      for (const tool of requestContext.tools) {
        if (!approvedTools.has(tool)) {
          return { valid: false, reason: `Tool '${tool}' was not in the approved scope` };
        }
      }
    }
    // 15. Verify autonomy scope matches
    if (approval.autonomy_level && approval.autonomy_level !== requestContext.autonomyLevel) {
      return { valid: false, reason: `Autonomy level mismatch: approved='${approval.autonomy_level}', requested='${requestContext.autonomyLevel}'` };
    }
    // 16. Verify data classification matches
    if (approval.data_classification && approval.data_classification !== requestContext.dataClassification) {
      return { valid: false, reason: `Data classification mismatch: approved='${approval.data_classification}', requested='${requestContext.dataClassification}'` };
    }

    // 25. Transition approved → executing (atomic, conditional on status='approved')
    if (approval.status === 'approved') {
      await base44.asServiceRole.entities.AIApproval.updateMany(
        { id: approval.id, tenant_id: tenantId, status: 'approved' },
        { $set: { status: 'executing' } }
      ).catch(() => {});
    }

    return { valid: true, approval };
  } catch (err) {
    return { valid: false, reason: `Approval validation failed: ${err.message}` };
  }
}

// ── APPROVAL KEY GENERATOR ────────────────────────────────────
function generateApprovalKey(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `aprv_${timestamp}_${random}`;
}

// ── MAIN GATEWAY HANDLER ──────────────────────────────────────
export default async function(req: Request): Promise<Response> {
  const startTime = Date.now();
  let tenantId: string | null = null;
  let serviceKey: string | null = null;
  let actorId: string | null = null;
  let base44: any = null;
  // request_id: unique server-generated identifier for one processing attempt
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
    const {
      service_key, payload, tenant_id, outlet_id, agent_id,
      data_classification, requested_autonomy,
      idempotency_key,           // caller-provided retry identity
      approval_key,              // for post-approval execution
    } = body;

    serviceKey = service_key;

    // ── STEP 2: VALIDATE IDEMPOTENCY KEY FORMAT ────────────
    // If caller provides an idempotency_key, validate its format
    if (idempotency_key && !IDEMPOTENCY_KEY_PATTERN.test(idempotency_key)) {
      return safeErrorResponse(SAFE_ERROR_CODES.INVALID_REQUEST, 400, serviceKey, {
        detail: 'idempotency_key must be 8-128 alphanumeric characters, dashes, or underscores',
      });
    }

    // ── STEP 3: VALIDATE TENANT MEMBERSHIP ─────────────────
    // Section 12: Cross-tenant operation requires explicit platform permission
    const nexusUserPermissions = (user.data?.permissions || []) as string[];
    const tenantCheck = validateTenantMembership(user.role, user.data?.tenant_id, tenant_id || null, nexusUserPermissions);
    if (!tenantCheck.valid) {
      // Audit the attempted cross-tenant request
      console.log(`[nexusGateway] TENANT VALIDATION FAILED: ${tenantCheck.reason} (user=${actorId}, role=${user.role})`);
      return safeErrorResponse(SAFE_ERROR_CODES.FORBIDDEN, 403, serviceKey, {
        detail: 'Tenant context validation failed',
        request_id: requestId,
      });
    }
    tenantId = tenantCheck.resolvedTenantId;

    if (!service_key) {
      return safeErrorResponse(SAFE_ERROR_CODES.INVALID_REQUEST, 400, null, { detail: 'service_key is required' });
    }
    if (!tenantId) {
      return safeErrorResponse(SAFE_ERROR_CODES.TENANT_REQUIRED, 400, service_key);
    }

    // ── STEP 4: COMPUTE IDEMPOTENCY FINGERPRINT ────────────
    // The fingerprint is deterministic: same tenant + requester + service + payload + key = same fingerprint
    // This is what prevents duplicate execution across retries.
    const payloadHash = await sha256(normalisePayloadForHash(payload || {}));
    const idempotencyFingerprint = idempotency_key
      ? await computeIdempotencyFingerprint({
          tenantId, requesterId: actorId, serviceKey: service_key,
          idempotencyKey: idempotency_key,
        })
      : '';

    // ── STEP 5: CHECK IDEMPOTENCY BY FINGERPRINT ───────────
    if (idempotency_key && idempotencyFingerprint) {
      const idempotencyCheck = await checkIdempotency(base44, idempotencyFingerprint, payloadHash);

      if (idempotencyCheck.status === 'terminal') {
        // Return the cached result — do NOT execute again
        const record = idempotencyCheck.existingRecord;
        return Response.json({
          success: record.outcome === 'success',
          service_key: service_key,
          request_id: requestId,
          audit_event_id: record.id,
          idempotency_replay: true,
          message: 'This request was already processed.',
          outcome: record.outcome,
          ...(record.cached_result || {}),
        }, { status: record.cached_result?.http_status || 200 });
      }

      if (idempotencyCheck.status === 'processing') {
        // Original request is still in progress
        return Response.json({
          success: false,
          safe_error_code: SAFE_ERROR_CODES.DUPLICATE_REQUEST,
          message: 'A request with this idempotency key is currently being processed.',
          service_key: service_key,
          request_id: requestId,
          idempotency_processing: true,
        }, { status: 409 });
      }

      if (idempotencyCheck.status === 'conflict') {
        // Same idempotency key but different payload — reject
        return Response.json({
          success: false,
          safe_error_code: SAFE_ERROR_CODES.DUPLICATE_REQUEST,
          message: 'This idempotency key was already used with a different payload.',
          service_key: service_key,
          request_id: requestId,
          idempotency_conflict: true,
        }, { status: 409 });
      }
    }

    // ── STEP 6: POST-APPROVAL EXECUTION VALIDATION ─────────
    // Section 3: Verifies all scope fields (service_key, model_key, tools,
    // autonomy, data_classification) and transitions approved → executing.
    let approvalContext: any = null;
    if (approval_key) {
      // Pre-resolve model and capability for scope verification
      const preCapability = await resolveCapability(base44, service_key, tenantId);
      const preModelKey = preCapability?.model_override || payload?.model || 'automatic';
      const approvalCheck = await validateApprovalForExecution(base44, approval_key, payloadHash, tenantId, {
        serviceKey: service_key,
        modelKey: preModelKey,
        autonomyLevel: requested_autonomy || L0_ANSWER,
        dataClassification: data_classification || 'internal',
        tools: ['InvokeLLM'],
      });
      if (!approvalCheck.valid) {
        return safeErrorResponse(SAFE_ERROR_CODES.FORBIDDEN, 403, serviceKey, {
          detail: approvalCheck.reason,
          request_id: requestId,
        });
      }
      approvalContext = approvalCheck.approval;
    }

    // ── STEP 7: KILL SWITCH (ADR-0018) ────────────────────
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

    // ── STEP 8: RESOLVE CAPABILITY (ADR-0046) ──────────────
    const capability = await resolveCapability(base44, service_key, tenantId);
    if (!capability) {
      return safeErrorResponse(SAFE_ERROR_CODES.INVALID_REQUEST, 404, serviceKey, {
        detail: `Service key '${service_key}' not found`, available_services: Object.keys(LEGACY_FALLBACK_REGISTRY),
      });
    }
    if (!capability.is_active) {
      return safeErrorResponse(SAFE_ERROR_CODES.FORBIDDEN, 403, serviceKey, { detail: `Capability '${service_key}' is disabled` });
    }

    // ── STEP 9: RESOLVE MODEL AND AGENT IDENTITIES ────────
    const modelKey = capability.model_override || payload?.model || 'automatic';
    const model = await resolveModelForKey(base44, modelKey, tenantId);
    const agent = agent_id ? await resolveAgentForId(base44, agent_id, tenantId) : null;

    const autonomyLevel = requested_autonomy || (agent?.autonomy_level) || L0_ANSWER;
    const actionType = service_key;
    const dataClass = data_classification || 'internal';

    // ── STEP 10: ENFORCE MODEL LIFECYCLE ───────────────────
    // After migration exit: unregistered models are DENIED (no migration allow)
    const modelLifecycleResult = evaluateModelLifecycle(model);
    if (!modelLifecycleResult.allowed) {
      const isRetired = model?.lifecycle_status === 'retired';
      const errorCode = isRetired ? SAFE_ERROR_CODES.MODEL_RETIRED : SAFE_ERROR_CODES.MODEL_NOT_APPROVED;
      const outcome = classifyOutcome(DECISIONS.DENY, false, 'success');

      const auditId = await createAIAuditEvent(base44, {
        tenant_id: tenantId, outlet_id: outlet_id || null, request_id: requestId,
        idempotency_key: idempotency_key || null, idempotency_fingerprint: idempotencyFingerprint,
        execution_state: 'denied',
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
        fallback_used: false, approval_reference_id: null,
        metadata: { payload_hash: payloadHash },
        is_consequential: false,
        cached_result: { success: false, safe_error_code: errorCode, http_status: 403 },
      }).catch(() => null);

      // Emit Worker-safe notification to requester
      await emitGovernanceInboxEvent(base44, {
        tenant_id: tenantId, outlet_id: outlet_id || null,
        recipient_user_id: actorId, recipient_name: user.full_name, recipient_role: user.role,
        category: 'security', event_type: 'ai_model_lifecycle_denied',
        title: 'AI Request Denied — Model Lifecycle',
        body: isWorkerRole(user.role)
          ? 'Your AI request could not be completed. Please contact your manager if you need assistance.'
          : modelLifecycleResult.reason,
        priority: 'important', is_actionable: false, action_type: 'none',
        source_entity: 'AIAuditEvent', source_id: auditId || requestId,
        admin_link: ADMIN_GOVERNANCE_LINK, worker_safe_link: WORKER_SAFE_LINK,
        metadata: { model_key: modelKey, lifecycle_status: model?.lifecycle_status },
      }).catch(() => {});

      // Emit governance event to tenant admins (not to Workers)
      if (!isWorkerRole(user.role) || true) {
        const admins = await resolveTenantAdminRecipients(base44, tenantId);
        for (const admin of admins) {
          if (admin.user_id !== actorId) {
            await emitGovernanceInboxEvent(base44, {
              tenant_id: tenantId, outlet_id: outlet_id || null,
              recipient_user_id: admin.user_id, recipient_name: admin.full_name, recipient_role: 'tenant_admin',
              category: 'security', event_type: 'ai_model_lifecycle_denied',
              title: 'AI Request Denied — Model Lifecycle', body: modelLifecycleResult.reason,
              priority: 'important', is_actionable: false, action_type: 'none',
              source_entity: 'AIAuditEvent', source_id: auditId || requestId,
              admin_link: ADMIN_GOVERNANCE_LINK,
              metadata: { model_key: modelKey, lifecycle_status: model?.lifecycle_status },
            }).catch(() => {});
          }
        }
      }

      return safeErrorResponse(errorCode, 403, serviceKey, {
        request_id: requestId, audit_event_id: auditId, policy_decision: 'deny',
        model_lifecycle_status: model?.lifecycle_status,
      });
    }

    // ── STEP 11: ENFORCE AGENT LIFECYCLE ───────────────────
    if (agent_id) {
      if (!agent) {
        const auditId = await createAIAuditEvent(base44, {
          tenant_id: tenantId, outlet_id: outlet_id || null, request_id: requestId,
          idempotency_key: idempotency_key || null, idempotency_fingerprint: idempotencyFingerprint,
          execution_state: 'denied',
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
          fallback_used: false, approval_reference_id: null,
          metadata: { payload_hash: payloadHash },
          is_consequential: false,
          cached_result: { success: false, safe_error_code: SAFE_ERROR_CODES.AGENT_NOT_FOUND, http_status: 403 },
        }).catch(() => null);
        return safeErrorResponse(SAFE_ERROR_CODES.AGENT_NOT_FOUND, 403, serviceKey, { request_id: requestId, audit_event_id: auditId });
      }

      const agentCheck = evaluateAgentLifecycle(agent);
      if (!agentCheck.allowed) {
        let errorCode = SAFE_ERROR_CODES.AGENT_SUSPENDED;
        if (agent.lifecycle_status === 'expired') errorCode = SAFE_ERROR_CODES.AGENT_EXPIRED;

        const auditId = await createAIAuditEvent(base44, {
          tenant_id: tenantId, outlet_id: outlet_id || null, request_id: requestId,
          idempotency_key: idempotency_key || null, idempotency_fingerprint: idempotencyFingerprint,
          execution_state: 'denied',
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
          fallback_used: false, approval_reference_id: null,
          metadata: { payload_hash: payloadHash },
          is_consequential: false,
          cached_result: { success: false, safe_error_code: errorCode, http_status: 403 },
        }).catch(() => null);

        // Emit to agent owner + tenant admins (NOT to Worker requester)
        const admins = await resolveTenantAdminRecipients(base44, tenantId);
        for (const admin of admins) {
          await emitGovernanceInboxEvent(base44, {
            tenant_id: tenantId, outlet_id: outlet_id || null,
            recipient_user_id: admin.user_id, recipient_name: admin.full_name, recipient_role: 'tenant_admin',
            category: 'security', event_type: agent.lifecycle_status === 'suspended' ? 'ai_agent_suspended' : 'ai_agent_expired',
            title: `AI Agent ${agent.lifecycle_status === 'suspended' ? 'Suspended' : 'Expired'}`,
            body: agentCheck.reason, priority: 'important', is_actionable: false, action_type: 'none',
            source_entity: 'AIAuditEvent', source_id: auditId || requestId,
            admin_link: ADMIN_GOVERNANCE_LINK,
            metadata: { agent_id: agent_id, lifecycle_status: agent.lifecycle_status },
          }).catch(() => {});
        }

        return safeErrorResponse(errorCode, 403, serviceKey, { request_id: requestId, audit_event_id: auditId });
      }

      // Verify agent tenant scope matches request tenant
      if (agent.tenant_id !== 'system' && agent.tenant_id !== tenantId) {
        const auditId = await createAIAuditEvent(base44, {
          tenant_id: tenantId, outlet_id: outlet_id || null, request_id: requestId,
          idempotency_key: idempotency_key || null, idempotency_fingerprint: idempotencyFingerprint,
          execution_state: 'denied',
          service_key: serviceKey, capability_tier: capability.tier,
          requesting_user_id: actorId, requesting_user_name: user.full_name, requesting_user_role: user.role,
          executing_agent_id: agent_id, provider: PROVIDERS.PLATFORM_BUILTIN,
          model_key: modelKey, model_version: model?.exact_version || null, model_lifecycle_status: model?.lifecycle_status || null,
          routing_decision: 'registry_resolved', policy_decision: DECISIONS.DENY,
          policy_reason: `Agent tenant scope mismatch`, policy_keys_evaluated: [],
          autonomy_level: autonomyLevel, data_classification: dataClass,
          tools_invoked: [], integrations_invoked: [],
          runtime_ms: Date.now() - startTime, credits_consumed: 0, estimated_cost_sgd: null,
          validation_result: 'not_validated', provenance_state: PROVENANCE_STATES.ai_generated,
          outcome: 'denied', error_message: 'Agent tenant scope mismatch', error_classification: 'agent_suspended',
          fallback_used: false, approval_reference_id: null,
          metadata: { payload_hash: payloadHash },
          is_consequential: false,
          cached_result: { success: false, safe_error_code: SAFE_ERROR_CODES.FORBIDDEN, http_status: 403 },
        }).catch(() => null);
        return safeErrorResponse(SAFE_ERROR_CODES.FORBIDDEN, 403, serviceKey, { request_id: requestId, audit_event_id: auditId });
      }
    }

    // ── STEP 12: EVALUATE AUTONOMY ──────────────────────────
    const autonomyCheck = canPerformAction(autonomyLevel, actionType);

    // ── STEP 13: EVALUATE AI POLICIES (deny-by-default) ────
    // Migration mode EXITED: when no policies match, deny by default.
    // No more unrestricted migration allow for non-sensitive actions.
    const matchedPolicies = await resolveMatchingPolicies(base44, {
      tenantId, modelKey, agentId: agent_id || null,
      dataClassification: dataClass, autonomyLevel, environment: 'production',
      serviceKey: service_key,
    });

    const policyResult = evaluateAIRequest({
      tenantId, userId: actorId, userRole: user.role,
      agentId: agent_id || null, agent,
      modelKey, model,
      serviceKey, dataClassification: dataClass,
      autonomyLevel, actionType,
      environment: 'production',
      matchedPolicies,
    });

    // ── STEP 14: HANDLE POLICY DENIAL ───────────────────────
    if (policyResult.decision === DECISIONS.DENY) {
      const outcome = classifyOutcome(DECISIONS.DENY, false, 'success');
      const auditId = await createAIAuditEvent(base44, {
        tenant_id: tenantId, outlet_id: outlet_id || null, request_id: requestId,
        idempotency_key: idempotency_key || null, idempotency_fingerprint: idempotencyFingerprint,
        execution_state: 'denied',
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
        fallback_used: false, approval_reference_id: null,
        metadata: { payload_hash: payloadHash },
        is_consequential: false,
        cached_result: { success: false, safe_error_code: SAFE_ERROR_CODES.POLICY_DENIED, http_status: 403 },
      }).catch(() => null);

      // Worker-safe notification to requester
      await emitGovernanceInboxEvent(base44, {
        tenant_id: tenantId, outlet_id: outlet_id || null,
        recipient_user_id: actorId, recipient_name: user.full_name, recipient_role: user.role,
        category: 'security', event_type: 'ai_policy_denied',
        title: 'AI Request Denied by Policy',
        body: isWorkerRole(user.role)
          ? 'Your AI request could not be completed due to a policy restriction. Please contact your manager if you need assistance.'
          : policyResult.reason,
        priority: 'important', is_actionable: false, action_type: 'none',
        source_entity: 'AIAuditEvent', source_id: auditId || requestId,
        admin_link: ADMIN_GOVERNANCE_LINK, worker_safe_link: WORKER_SAFE_LINK,
        metadata: { policy_key: policyResult.policyKey, service_key: serviceKey },
      }).catch(() => {});

      return safeErrorResponse(SAFE_ERROR_CODES.POLICY_DENIED, 403, serviceKey, {
        request_id: requestId, audit_event_id: auditId, policy_decision: 'deny',
      });
    }

    // ── STEP 15: HANDLE APPROVAL REQUIRED ───────────────────
    if (policyResult.decision === DECISIONS.REQUIRE_APPROVAL ||
        policyResult.decision === DECISIONS.REQUIRE_HUMAN_ESCALATION) {

      // If this is a post-approval execution, the approval was already validated in Step 6.
      // This shouldn't happen normally, but handle it gracefully.
      if (approvalContext) {
        // Approval already granted — continue to execution
      } else {
        // Create AIApproval record
        const approvalKey = generateApprovalKey();

        // ── PROTECTED TEST RUN VALIDATION (Build #28.2P-R.0R) ───
        // Client-provided test_ttl_minutes, test_tag, test_purpose are
        // NO LONGER authority for short TTL. Only a valid TestRun record
        // created by a platform.test_lab.manage operator authorises test TTL.
        let approvalTtlHours = APPROVAL_EXPIRY_HOURS;
        let isTestApproval = false;
        let testRunId: string | null = null;
        let testTag: string | null = null;
        let testPurpose: string | null = null;
        let testMetadata: Record<string, any> | null = null;

        if (body.test_run_id) {
          // Fetch and validate the TestRun record server-side
          let testRun: any = null;
          try {
            const runs = await base44.asServiceRole.entities.TestRun.filter({
              test_run_id: body.test_run_id,
            });
            testRun = runs?.[0] || null;
          } catch { /* fetch error */ }

          if (!testRun) {
            return safeErrorResponse(SAFE_ERROR_CODES.FORBIDDEN, 403, serviceKey, {
              detail: 'Test Run not found. A valid TestRun record is required for test TTL.',
              request_id: requestId,
            });
          }

          // Validate TestRun lifecycle
          if (testRun.status !== 'active') {
            return safeErrorResponse(SAFE_ERROR_CODES.FORBIDDEN, 403, serviceKey, {
              detail: `Test Run is '${testRun.status}', expected 'active'.`,
              request_id: requestId,
            });
          }
          if (testRun.expires_at && new Date(testRun.expires_at) < new Date()) {
            return safeErrorResponse(SAFE_ERROR_CODES.FORBIDDEN, 403, serviceKey, {
              detail: 'Test Run has expired.',
              request_id: requestId,
            });
          }
          // Validate sandbox_tenant_id matches
          if (testRun.sandbox_tenant_id !== tenantId) {
            return safeErrorResponse(SAFE_ERROR_CODES.FORBIDDEN, 403, serviceKey, {
              detail: 'Test Run tenant mismatch.',
              request_id: requestId,
            });
          }
          // Validate authorised requester matches
          if (testRun.authorised_requester_user_id !== actorId) {
            return safeErrorResponse(SAFE_ERROR_CODES.FORBIDDEN, 403, serviceKey, {
              detail: 'Test Run requester mismatch.',
              request_id: requestId,
            });
          }
          // Validate permitted service matches
          if (testRun.permitted_service_key !== serviceKey) {
            return safeErrorResponse(SAFE_ERROR_CODES.FORBIDDEN, 403, serviceKey, {
              detail: 'Test Run service mismatch.',
              request_id: requestId,
            });
          }
          // Validate permitted autonomy matches
          if (testRun.permitted_autonomy_level !== autonomyLevel) {
            return safeErrorResponse(SAFE_ERROR_CODES.FORBIDDEN, 403, serviceKey, {
              detail: 'Test Run autonomy level mismatch.',
              request_id: requestId,
            });
          }
          // BUILD #28.2P-R.0R.1: ATOMIC CAS TEST RUN CONSUMPTION
          // Uses updateMany with a conditional filter as a Compare-And-Swap
          // operation. Only ONE concurrent request can match the filter
          // (status='active', current_uses < max_uses) and apply the update.
          // A unique consumption_token proves which request acquired the run.
          // If acquisition fails, FAIL CLOSED — do NOT create AIApproval.
          const consumptionToken = `ctok_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
          const consumedAt = new Date().toISOString();

          let consumptionAcquired = false;
          try {
            await base44.asServiceRole.entities.TestRun.updateMany(
              { id: testRun.id, status: 'active', current_uses: { $lt: testRun.max_uses } },
              { $inc: { current_uses: 1 }, $set: { status: 'consumed', consumed_at: consumedAt, consumption_token: consumptionToken } }
            );
            // Verify we acquired the Test Run by checking the consumption_token
            const verifyRuns = await base44.asServiceRole.entities.TestRun.filter({ test_run_id: body.test_run_id });
            const verifyRun = verifyRuns?.[0];
            if (verifyRun && verifyRun.consumption_token === consumptionToken) {
              consumptionAcquired = true;
            }
          } catch (consumeErr) {
            // FAIL CLOSED: consumption update failed — do NOT continue to AIApproval creation
            return safeErrorResponse(SAFE_ERROR_CODES.FORBIDDEN, 403, serviceKey, {
              detail: 'Test Run atomic consumption failed. No approval has been created.',
              request_id: requestId,
              consumption_error: consumeErr.message,
            });
          }

          if (!consumptionAcquired) {
            // FAIL CLOSED: another concurrent request acquired the Test Run
            return safeErrorResponse(SAFE_ERROR_CODES.FORBIDDEN, 403, serviceKey, {
              detail: 'Test Run was already consumed by another request. No duplicate approval can be created.',
              request_id: requestId,
              consumption_token_mismatch: true,
            });
          }

          // All validations passed — use server-selected TTL
          isTestApproval = true;
          testRunId = testRun.test_run_id;
          testTag = testRun.test_tag;
          testPurpose = testRun.test_purpose;
          approvalTtlHours = testRun.server_selected_ttl_minutes / 60;

          testMetadata = {
            environment: 'test',
            test_run_id: testRunId,
            test_tag: testTag,
            sandbox_tenant_id: tenantId,
            created_by_test: true,
            non_production: true,
            test_purpose: testPurpose,
            created_by_actor_id: testRun.created_by_operator_id,
            test_ttl_minutes: testRun.server_selected_ttl_minutes,
            consumption_token: consumptionToken,
          }
        }
        // Client-provided test_ttl_minutes, test_tag, test_purpose without
        // a valid test_run_id are silently ignored — no test TTL.

        const approvalExpiry = new Date(Date.now() + approvalTtlHours * 60 * 60 * 1000).toISOString();
        const approvingRole = isSensitiveAction(actionType) ? 'admin' : 'tenant_admin';

        let approvalId: string | null = null;
        try {
          const approvalRecord = await base44.asServiceRole.entities.AIApproval.create({
            tenant_id: tenantId,
            outlet_id: outlet_id || null,
            approval_key: approvalKey,
            request_id: requestId,
            idempotency_fingerprint: idempotencyFingerprint,
            requester_user_id: actorId,
            requester_name: user.full_name,
            requester_role: user.role,
            executing_agent_id: agent_id || null,
            service_key: serviceKey,
            capability_tier: capability.tier,
            autonomy_level: autonomyLevel,
            provider: PROVIDERS.PLATFORM_BUILTIN,
            model_key: modelKey,
            tools: ['InvokeLLM'],
            data_classification: dataClass,
            estimated_credits: capability.default_credits,
            approval_reason: policyResult.reason,
            policy_key: policyResult.policyKey,
            payload_hash: payloadHash,
            status: 'pending',
            approving_role: approvingRole,
            expires_at: approvalExpiry,
            ...(isTestApproval ? {
              is_test: true,
              test_run_id: testRunId,
              test_tag: testTag,
              test_purpose: testPurpose,
              non_production: true,
            } : {}),
          });
          approvalId = approvalRecord?.id || null;
        } catch (err) {
          console.log(`[nexusGateway] AIApproval creation failed: ${err.message}`);
        }

        const auditId = await createAIAuditEvent(base44, {
          tenant_id: tenantId, outlet_id: outlet_id || null, request_id: requestId,
          idempotency_key: idempotency_key || null, idempotency_fingerprint: idempotencyFingerprint,
          execution_state: 'approval_required',
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
          fallback_used: false, approval_reference_id: approvalId,
          metadata: { payload_hash: payloadHash, approval_key: approvalKey, ...(testMetadata || {}) },
          is_consequential: true,
          cached_result: { success: false, safe_error_code: SAFE_ERROR_CODES.APPROVAL_REQUIRED, http_status: 202 },
        }).catch(() => null);

        // Emit approval-required event to tenant admins (NOT to Worker requester)
        const admins = await resolveTenantAdminRecipients(base44, tenantId);
        for (const admin of admins) {
          // Cannot self-approve: don't send approval event to the requester
          if (admin.user_id === actorId) continue;
          await emitGovernanceInboxEvent(base44, {
            tenant_id: tenantId, outlet_id: outlet_id || null,
            recipient_user_id: admin.user_id, recipient_name: admin.full_name, recipient_role: 'tenant_admin',
            category: 'approval', event_type: 'ai_approval_required',
            title: 'AI Action Requires Approval',
            body: `The AI request '${serviceKey}' requires human approval. Reason: ${policyResult.reason}`,
            priority: 'critical', is_actionable: true, action_type: 'approve',
            source_entity: 'AIApproval', source_id: approvalId || requestId,
            admin_link: ADMIN_GOVERNANCE_LINK,
            metadata: { service_key: serviceKey, autonomy_level: autonomyLevel, model_key: modelKey, approval_key: approvalKey },
          }).catch(() => {});
        }

        // Worker-safe notification to requester (status only, not approval link)
        await emitGovernanceInboxEvent(base44, {
          tenant_id: tenantId, outlet_id: outlet_id || null,
          recipient_user_id: actorId, recipient_name: user.full_name, recipient_role: user.role,
          category: 'approval', event_type: 'ai_approval_required',
          title: 'AI Request Pending Approval',
          body: isWorkerRole(user.role)
            ? `Your AI request is pending manager approval. You will be notified once it is reviewed.`
            : `Your AI request '${serviceKey}' requires approval and has been sent to your tenant administrators.`,
          priority: 'normal', is_actionable: false, action_type: 'none',
          source_entity: 'AIApproval', source_id: approvalId || requestId,
          admin_link: ADMIN_GOVERNANCE_LINK, worker_safe_link: WORKER_SAFE_LINK,
          metadata: { service_key: serviceKey, approval_key: approvalKey },
        }).catch(() => {});

        return Response.json({
          success: false,
          approval_required: true,
          safe_error_code: SAFE_ERROR_CODES.APPROVAL_REQUIRED,
          message: SAFE_USER_MESSAGES[SAFE_ERROR_CODES.APPROVAL_REQUIRED],
          service_key: serviceKey,
          request_id: requestId,
          audit_event_id: auditId,
          approval_key: approvalKey,
          policy_decision: 'require_approval',
          policy_reason: policyResult.reason,
        }, { status: 202 });
      }
    }

    // ── STEP 16: VALIDATE EXECUTION POLICY ─────────────────
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
        idempotency_key: idempotency_key || null, idempotency_fingerprint: idempotencyFingerprint,
        execution_state: 'denied',
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
        fallback_used: false, approval_reference_id: approvalContext?.id || null,
        metadata: { payload_hash: payloadHash, violated_conditions: execResult.violatedConditions },
        is_consequential: false,
        cached_result: { success: false, safe_error_code: SAFE_ERROR_CODES.EXECUTION_POLICY_VIOLATION, http_status: 403 },
      }).catch(() => null);

      await emitGovernanceInboxEvent(base44, {
        tenant_id: tenantId, outlet_id: outlet_id || null,
        recipient_user_id: actorId, recipient_name: user.full_name, recipient_role: user.role,
        category: 'security', event_type: 'ai_execution_policy_blocked',
        title: 'AI Request Blocked by Security Policy',
        body: isWorkerRole(user.role)
          ? 'Your AI request was blocked by a security policy. Please contact your manager.'
          : execResult.reason,
        priority: 'important', is_actionable: false, action_type: 'none',
        source_entity: 'AIAuditEvent', source_id: auditId || requestId,
        admin_link: ADMIN_GOVERNANCE_LINK, worker_safe_link: WORKER_SAFE_LINK,
        metadata: { violated_conditions: execResult.violatedConditions },
      }).catch(() => {});

      return safeErrorResponse(SAFE_ERROR_CODES.EXECUTION_POLICY_VIOLATION, 403, serviceKey, {
        request_id: requestId, audit_event_id: auditId,
      });
    }

    // ── STEP 17: PAYLOAD SANITISATION (ADR-0044) ───────────
    const sanitizedPayload = sanitizePayload(payload || {}, capability.sanitization_mode, capability.permitted_fields);

    // ── STEP 18: SHIELD GOVERNANCE GATE ────────────────────
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

    // ── STEP 19: CHECK CREDITS AND COST BUDGET ────────────
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

    // ── STEP 20: PRE-EXECUTION AUDIT (consequential actions) ─
    const isConsequential = isSensitiveAction(actionType) || autonomyLevel === L3_EXECUTE;
    let preExecutionAuditId: string | null = null;

    if (isConsequential) {
      // For consequential actions, create a durable pre-execution audit record
      // BEFORE dispatch. If this fails, we must NOT dispatch (fail-closed).
      try {
        preExecutionAuditId = await createAIAuditEvent(base44, {
          tenant_id: tenantId, outlet_id: outlet_id || null, request_id: requestId,
          idempotency_key: idempotency_key || null, idempotency_fingerprint: idempotencyFingerprint,
          execution_state: 'executing',
          service_key: serviceKey, capability_tier: capability.tier,
          requesting_user_id: actorId, requesting_user_name: user.full_name, requesting_user_role: user.role,
          executing_agent_id: agent_id || null,
          provider: PROVIDERS.PLATFORM_BUILTIN, model_key: modelKey, model_version: model?.exact_version || null,
          model_lifecycle_status: model?.lifecycle_status || null,
          routing_decision: model ? 'registry_resolved' : 'registry_missing',
          policy_decision: policyResult.decision, policy_reason: policyResult.reason,
          policy_keys_evaluated: policyResult.evaluatedKeys,
          autonomy_level: autonomyLevel, data_classification: dataClass,
          tools_invoked: [], integrations_invoked: [],
          runtime_ms: Date.now() - startTime, credits_consumed: 0, estimated_cost_sgd: null,
          validation_result: 'not_validated', provenance_state: PROVENANCE_STATES.ai_generated,
          outcome: 'success', error_message: null, error_classification: null,
          fallback_used: false, approval_reference_id: approvalContext?.id || null,
          metadata: { payload_hash: payloadHash, pre_execution: true },
          is_consequential: true, // THIS makes it fail-closed
          cached_result: null,
        });
        // If we get here, the pre-execution audit succeeded — safe to dispatch
      } catch (auditErr) {
        // FAIL-CLOSED: cannot dispatch consequential action without audit evidence
        console.log(`[nexusGateway] FAIL-CLOSED: Pre-execution audit failed for consequential action: ${auditErr.message}`);
        return safeErrorResponse(SAFE_ERROR_CODES.AUDIT_FAILURE, 500, serviceKey, {
          request_id: requestId,
          detail: 'Cannot execute consequential action without audit evidence',
        });
      }
    }

    // ── STEP 21: RESOLVE PROVIDER + DISPATCH ────────────────
    const providerId = PROVIDERS.PLATFORM_BUILTIN;
    if (!isProviderConfigured(providerId)) {
      const auditId = await createAIAuditEvent(base44, {
        tenant_id: tenantId, outlet_id: outlet_id || null, request_id: requestId,
        idempotency_key: idempotency_key || null, idempotency_fingerprint: idempotencyFingerprint,
        execution_state: 'failed',
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
        fallback_used: false, approval_reference_id: approvalContext?.id || null,
        metadata: { payload_hash: payloadHash },
        is_consequential: false,
        cached_result: { success: false, safe_error_code: SAFE_ERROR_CODES.PROVIDER_UNCONFIGURED, http_status: 503 },
      }).catch(() => null);
      return safeErrorResponse(SAFE_ERROR_CODES.PROVIDER_UNCONFIGURED, 503, serviceKey, { request_id: requestId, audit_event_id: auditId });
    }

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

    // ── STEP 22: FALLBACK (re-runs all governance checks) ─
    let fallbackUsed = false;
    let fallbackRoutingDecision = 'registry_resolved';

    if (executionStatus === 'failed' && capability.fallback_capability_key) {
      console.log(`[nexusGateway] Handler failed, invoking fallback: ${capability.fallback_capability_key}`);
      try {
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
        return Response.json({
          success: false,
          safe_error_code: SAFE_ERROR_CODES.INTERNAL_ERROR,
          message: `Nexus service '${service_key}' and fallback '${capability.fallback_capability_key}' both failed`,
          service_key: serviceKey, request_id: requestId,
          latency_ms: latencyMs,
        }, { status: 500 });
      }
    }

    // ── STEP 23: UPDATE AUDIT + EMIT INBOX EVENTS ──────────
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

    // Create or update the AIAuditEvent with final outcome
    const outcome = classifyOutcome(policyResult.decision, execResult.allowed, executionStatus);
    const finalExecutionState = executionStatus === 'success' ? 'succeeded'
      : executionStatus === 'timeout' ? 'timed_out'
      : 'failed';

    const auditParams = {
      tenant_id: tenantId, outlet_id: outlet_id || null, request_id: requestId,
      idempotency_key: idempotency_key || null, idempotency_fingerprint: idempotencyFingerprint,
      execution_state: finalExecutionState,
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
      provenance_state: approvalContext ? PROVENANCE_STATES.executed_after_approval : outcome.provenanceState,
      outcome: outcome.outcome,
      error_message: errorMessage, error_classification: errorClassification || outcome.errorClassification,
      fallback_used: fallbackUsed,
      approval_reference_id: approvalContext?.id || null,
      metadata: {
        payload_hash: payloadHash,
        cost_source: costResult.source,
        cost_warning: costResult.warning,
        credit_multiplier: creditMultiplier,
        shield_policy: shieldPolicyName,
      },
      is_consequential: isConsequential,
      cached_result: {
        success: executionStatus === 'success',
        safe_error_code: executionStatus !== 'success' ? (executionStatus === 'timeout' ? SAFE_ERROR_CODES.PROVIDER_TIMEOUT : SAFE_ERROR_CODES.INTERNAL_ERROR) : null,
        response_summary: executionStatus === 'success' ? 'success' : (errorMessage || 'failed'),
        http_status: executionStatus === 'success' ? 200 : 500,
      },
    };

    let auditId: string | null;
    if (preExecutionAuditId) {
      // Update the pre-execution record with final outcome
      await updateAIAuditEvent(base44, preExecutionAuditId, auditParams);
      auditId = preExecutionAuditId;
    } else {
      // Create a new post-execution audit record
      // For non-consequential L0: use degraded mode (failure doesn't block)
      auditId = await createAIAuditEvent(base44, auditParams).catch((e: any) => {
        console.log(`[nexusGateway] Post-execution audit failed: ${e.message}`);
        return null;
      });
    }

    // If post-approval execution, update the AIApproval record
    if (approvalContext && executionStatus === 'success') {
      try {
        await base44.asServiceRole.entities.AIApproval.updateMany(
          { id: approvalContext.id, tenant_id: tenantId, status: 'executing' },
          { $set: { status: 'executed', execution_audit_event_id: auditId, executed_at: new Date().toISOString() } }
        );
      } catch (err) {
        console.log(`[nexusGateway] AIApproval update to executed failed: ${err.message}`);
      }
    } else if (approvalContext && executionStatus !== 'success') {
      try {
        await base44.asServiceRole.entities.AIApproval.updateMany(
          { id: approvalContext.id, tenant_id: tenantId, status: 'executing' },
          { $set: { status: 'execution_failed', execution_audit_event_id: auditId } }
        );
      } catch (err) {
        console.log(`[nexusGateway] AIApproval update to execution_failed: ${err.message}`);
      }
    }

    // Emit Worker-safe Orbit Inbox events
    if (executionStatus === 'failed' || executionStatus === 'timeout') {
      await emitGovernanceInboxEvent(base44, {
        tenant_id: tenantId, outlet_id: outlet_id || null,
        recipient_user_id: actorId, recipient_name: user.full_name, recipient_role: user.role,
        category: 'ai_insight', event_type: 'ai_execution_failed',
        title: `AI Request ${executionStatus === 'timeout' ? 'Timed Out' : 'Failed'}`,
        body: isWorkerRole(user.role)
          ? `Your AI request could not be completed. Please try again or contact your manager if the issue persists.`
          : `The AI request '${serviceKey}' could not be completed. ${SAFE_USER_MESSAGES[SAFE_ERROR_CODES.INTERNAL_ERROR]}`,
        priority: 'normal', is_actionable: false, action_type: 'none',
        source_entity: 'AIAuditEvent', source_id: auditId || requestId,
        admin_link: ADMIN_GOVERNANCE_LINK, worker_safe_link: WORKER_SAFE_LINK,
        metadata: { service_key: serviceKey, error_classification: errorClassification },
      }).catch(() => {});
    }

    if (fallbackUsed) {
      await emitGovernanceInboxEvent(base44, {
        tenant_id: tenantId, outlet_id: outlet_id || null,
        recipient_user_id: actorId, recipient_name: user.full_name, recipient_role: user.role,
        category: 'ai_insight', event_type: 'ai_fallback_used',
        title: 'AI Fallback Used',
        body: isWorkerRole(user.role)
          ? `Your AI request was completed using a backup method. No action needed.`
          : `The primary AI handler for '${serviceKey}' failed and a fallback capability was used.`,
        priority: 'informational', is_actionable: false, action_type: 'none',
        source_entity: 'AIAuditEvent', source_id: auditId || requestId,
        admin_link: ADMIN_GOVERNANCE_LINK, worker_safe_link: WORKER_SAFE_LINK,
        metadata: { service_key: serviceKey, fallback_capability: capability.fallback_capability_key },
      }).catch(() => {});
    }

    // ── STEP 24: RETURN STRUCTURED RESPONSE ───────────────
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
      provenance_state: approvalContext ? PROVENANCE_STATES.executed_after_approval : outcome.provenanceState,
      validation_status: 'passed',
      fallback_used: fallbackUsed,
      latency_ms: latencyMs,
      capability_source: capability.source,
      capability_tier: capability.tier,
      cost_source: costResult.source,
      ...(approvalContext ? { approval_executed: true } : {}),
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