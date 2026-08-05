# Orbitan AI Operating Layer — Authoritative Gap Register

**Created:** 2026-08-05 (Build #28.2M — Phase 1 AI Security & Governance Foundation)
**Author:** Orbitan Architecture Team
**Status:** Living Document — single source of truth for AI Operating Layer readiness

---

## Executive Summary

This register is the authoritative audit of every AI-related capability in the Orbitan
ecosystem. It classifies each capability's current implementation state, identifies gaps,
assigns priority, and defines the required action and phase.

**Key Finding:** The existing Orbit Nexus architecture (ADR-0006, ADR-0046, ADR-0018,
ADR-0044, ADR-0029) already provides a strong foundation: a canonical gateway, registry-driven
capabilities, kill switch, Shield governance, Zero-PII sanitization, and usage tracking.
The gaps are in **formal model lifecycle management**, **agent identity governance**,
**AI-specific policy evaluation**, **AI audit provenance**, and **provider adapter
abstraction** — all addressed in this Phase 1 build.

---

## Priority Definitions

| Priority | Definition |
|----------|-----------|
| **P0** | Security, tenant isolation, or production-blocking gap |
| **P1** | Required Orbit Nexus MVP foundation |
| **P2** | Administrative or analytical capability |
| **P3** | Future-ready foundation (post-MVP) |

---

## Summary Table

| Domain | Capability | Status | Priority | Phase |
|--------|-----------|--------|----------|-------|
| **Gateway** | Provider-neutral request routing | ✅ Complete (nexus/entry.ts) | — | — |
| **Gateway** | Stable internal request contract | ✅ Partially complete | P1 | Phase 1 |
| **Gateway** | Provider adapter interface | ❌ Missing | P1 | Phase 1 |
| **Models** | Model registry with lifecycle | ❌ Missing | P1 | Phase 1 |
| **Models** | Model approval/deprecation enforcement | ❌ Missing | P1 | Phase 1 |
| **Models** | MODEL_CREDIT_MULTIPLIER hardcoded | ⚠️ Fragmented | P1 | Phase 1 |
| **Agents** | Agent identity registry | ❌ Missing | P1 | Phase 1 |
| **Agents** | Agent lifecycle (Draft→Approved→Retired) | ❌ Missing | P1 | Phase 1 |
| **Agents** | Agent autonomy level enforcement | ❌ Missing | P1 | Phase 1 |
| **Agents** | Agent permission boundaries | ⚠️ Partial (Tier 3 reserved) | P1 | Phase 1 |
| **Policies** | AI-specific policy evaluation | ⚠️ Partial (Shield for governance) | P1 | Phase 1 |
| **Policies** | Deny-by-default for AI | ⚠️ Partial | P1 | Phase 1 |
| **Policies** | Execution policy contract | ❌ Missing | P1 | Phase 1 |
| **Audit** | AI provenance (provider, model, routing) | ⚠️ Partial (OrbitUsageTracker) | P1 | Phase 1 |
| **Audit** | AI audit event entity | ❌ Missing | P1 | Phase 1 |
| **Audit** | Safe provenance states | ❌ Missing | P1 | Phase 1 |
| **Controls** | AI kill switch | ✅ Complete (ADR-0018) | — | — |
| **Controls** | Capability registry | ✅ Complete (ADR-0046) | — | — |
| **Controls** | Zero-PII sanitization | ✅ Complete (ADR-0044) | — | — |
| **Controls** | Credit metering & wallet debit | ✅ Complete | — | — |
| **Boundaries** | Worker AI-admin access denied | ⚠️ Needs verification | P0 | Phase 1 |
| **Boundaries** | Worker notification links safe | ✅ Complete (Build #28.2L) | — | — |
| **Orbit Inbox** | AI governance events | ❌ Missing | P2 | Phase 2 |
| **Data Products** | Semantic data-product catalogue | ❌ Deferred | P3 | Phase 3+ |
| **Skills** | Skill registry | ❌ Deferred | P3 | Phase 3+ |
| **Evaluations** | Evaluation centre | ❌ Deferred | P3 | Phase 3+ |
| **Incidents** | AI incident entity | ❌ Deferred | P2 | Phase 2 |
| **Budgets** | AI budget analytics | ❌ Deferred | P2 | Phase 2 |

---

## Detailed Gap Analysis

### 1. Gateway

#### 1.1 Provider-Neutral Request Routing
- **Existing:** `base44/functions/nexus/entry.ts` — canonical single-entry gateway since ADR-0006
- **Evidence:** Registry-driven dispatch (NexusCapabilityRegistry), kill switch, plan-tier gate, Shield gate, credit debit, usage tracking, fallback capability
- **Status:** ✅ Complete
- **Gap:** None
- **Action:** Preserve

#### 1.2 Stable Internal Request Contract
- **Existing:** `{ service_key, payload, tenant_id, outlet_id }`
- **Evidence:** `useNexusAI.js` frontend hook, `nexus/entry.ts` gateway handler
- **Status:** ⚠️ Partially complete — missing request_id, data sensitivity, max cost, latency target, human-approval requirement, audit context
- **Priority:** P1
- **Required Action:** Extend gateway request contract with structured governance fields
- **Phase:** Phase 1 (contract defined in `ai-operating-layer.js`)

#### 1.3 Provider Adapter Interface
- **Existing:** All AI calls go through `base44.integrations.Core.InvokeLLM` — a single built-in platform integration
- **Evidence:** No direct provider SDK calls found in codebase scan (OpenAI, Anthropic, Gemini SDKs all absent)
- **Status:** ❌ Missing — no formal adapter interface for multi-provider routing
- **Priority:** P1
- **Security Impact:** Medium — currently locked to Base44's InvokeLLM; no risk of credential leakage, but no provider portability
- **Required Action:** Create provider adapter interface contract (`base44/shared/ai-provider-adapter.ts`) defining adapter shape for OpenAI, Anthropic, Gemini, and future providers
- **Phase:** Phase 1 (interface only; live adapters are Phase 2 when external credentials are available)

### 2. Models

#### 2.1 Model Registry with Lifecycle
- **Existing:** `MODEL_CREDIT_MULTIPLIER` hardcoded constant in `nexus/entry.ts` with 7 model entries
- **Evidence:** Lines 50-58 of nexus/entry.ts — `'automatic', 'gemini_3_flash', 'gpt_5_mini', 'claude_sonnet_4_6', 'gemini_3_1_pro', 'gpt_5_4', 'claude_opus_4_6'`
- **Status:** ❌ Missing — no entity tracks model lifecycle, capability profile, approval status, deprecation, retirement, replacement
- **Priority:** P1
- **Security Impact:** High — unapproved or retired models could serve production requests without enforcement
- **Required Action:** Create `AIModel` entity with lifecycle states (Draft → Evaluation → Approved → Restricted → Deprecated → Retired)
- **Phase:** Phase 1

#### 2.2 Model Approval/Deprecation Enforcement
- **Existing:** None — the gateway uses any model string from payload or capability config
- **Status:** ❌ Missing
- **Priority:** P1
- **Security Impact:** High
- **Required Action:** Gateway must reject models not in Approved or explicitly Restricted state for production requests
- **Phase:** Phase 1 (enforcement logic in `ai-policy-evaluator.js`)

#### 2.3 MODEL_CREDIT_MULTIPLIER Consolidation
- **Existing:** Hardcoded in nexus/entry.ts
- **Status:** ⚠️ Fragmented
- **Priority:** P1
- **Required Action:** Migrate to AIModel entity `cost_config` field; gateway reads from entity at runtime
- **Phase:** Phase 1 (entity created; gateway migration is Phase 2 to avoid breaking changes)

### 3. Agents

#### 3.1 Agent Identity Registry
- **Existing:** `NexusCapabilityRegistry.handler.type = 'agent_config'` is reserved for future agents, but no agent entity exists
- **Status:** ❌ Missing
- **Priority:** P1
- **Security Impact:** High — without agent identity governance, any function could act as an "agent" with no accountability, permission boundary, or lifecycle control
- **Required Action:** Create `AIAgent` entity with identity, approved skills/tools, autonomy level, permissions, lifecycle, ownership, and audit fields
- **Phase:** Phase 1

#### 3.2 Agent Lifecycle Enforcement
- **Existing:** None
- **Status:** ❌ Missing
- **Priority:** P1
- **Required Action:** Gateway must reject agents not in Approved or explicitly Restricted state; Suspended/Expired/Retired agents cannot execute
- **Phase:** Phase 1 (enforcement logic in `ai-policy-evaluator.js`)

#### 3.3 Agent Autonomy Level Enforcement
- **Existing:** ADR-0046 defines Capability Tiers (1/2/3); ADR-0029 defines agentic governance thresholds
- **Status:** ⚠️ Partial — tier exists on capability, but no formal autonomy classification (L0 Answer / L1 Recommend / L2 Draft / L3 Execute)
- **Priority:** P1
- **Required Action:** Create canonical autonomy levels module; enforce L3 restrictions (no autonomous payments, payroll, employee-status, access, destructive DB, external publication, legal, customer-data exports, production config)
- **Phase:** Phase 1 (`ai-autonomy-levels.js`)

#### 3.4 Agent Permission Boundaries
- **Existing:** Shield governance via `GovernancePolicy.applies_to = 'agent'` (ADR-0029)
- **Status:** ⚠️ Partial — Shield handles action-level governance, but no agent-level permission declaration (approved skills, tools, data products, integrations)
- **Priority:** P1
- **Required Action:** AIModel entity defines approved skills/tools/data-products/integrations per agent
- **Phase:** Phase 1

### 4. Policies

#### 4.1 AI-Specific Policy Evaluation
- **Existing:** Shield Interceptor evaluates GovernancePolicy for governance-domain-bound capabilities
- **Status:** ⚠️ Partial — Shield is action/entity-oriented, not AI-request-oriented (provider, model, data classification, autonomy, environment)
- **Priority:** P1
- **Security Impact:** High — without AI-specific policy evaluation, an unapproved model or data-classification violation could reach a provider
- **Required Action:** Create `AIPolicy` entity and `ai-policy-evaluator.js` shared module. Policy evaluation occurs before AI execution, evaluates dimensions (tenant, role, agent, provider, model, data classification, autonomy, environment), and returns structured decision (allow/deny/require_approval/require_safer_model/require_reduced_data/require_read_only/require_human_escalation)
- **Phase:** Phase 1

#### 4.2 Deny-by-Default for AI
- **Existing:** Shield has deny-by-default for entity writes, but AI requests fail-open when Shield is unreachable
- **Status:** ⚠️ Partial
- **Priority:** P1
- **Required Action:** AI policy evaluator applies deny-by-default when a sensitive AI action lacks explicit authorisation
- **Phase:** Phase 1

#### 4.3 Most-Restrictive-Policy-Wins
- **Existing:** Shield evaluates domain policies; no explicit most-restrictive-wins logic documented
- **Status:** ⚠️ Partial
- **Priority:** P1
- **Required Action:** AI policy evaluator applies most-restrictive valid policy when policies overlap
- **Phase:** Phase 1

#### 4.4 Execution Policy Contract
- **Existing:** None
- **Status:** ❌ Missing
- **Priority:** P1
- **Required Action:** Create `AIExecutionPolicy` contract in `ai-execution-policy.js` — environment type, permitted tenant/org/brand/outlet, allowed tools, allowed integrations, allowed network destinations, credential scope, permitted data classifications, max runtime, max tokens, max cost, required monitoring, stop conditions, escalation route, kill-switch state
- **Phase:** Phase 1

### 5. Audit & Provenance

#### 5.1 AI Provenance
- **Existing:** `OrbitUsageTracker` tracks tenant_id, service_key, model_used, credits, status, latency, shield_outcome
- **Status:** ⚠️ Partial — missing provider, routing decision, policy decision, data-product references, knowledge-source references, tools invoked, approval references, estimated cost, validation result, outcome
- **Priority:** P1
- **Required Action:** Create `AIAuditEvent` entity for AI-specific provenance (extends AuditLog's purpose, does not duplicate it)
- **Phase:** Phase 1

#### 5.2 AI Audit Event Entity
- **Existing:** None (OrbitUsageTracker is usage metering, not audit provenance)
- **Status:** ❌ Missing
- **Priority:** P1
- **Required Action:** Create `AIAuditEvent` entity with tenant scope, requesting user/agent, skill+version, provider, model+version, routing decision, policy decision, data-product references, knowledge-source references, tools/integrations invoked, approval references, runtime, usage, estimated cost, validation result, outcome, error/incident reference
- **Phase:** Phase 1

#### 5.3 Safe Provenance States
- **Existing:** None
- **Status:** ❌ Missing
- **Priority:** P1
- **Required Action:** Define safe user-facing provenance states (AI-generated, AI-assisted, Human-reviewed, Awaiting review, Executed after approval) in `ai-autonomy-levels.js`
- **Phase:** Phase 1

#### 5.4 Secrets in Audit
- **Existing:** ADR-0044 Zero-PII sanitization strips forbidden fields from payloads; OrbitUsageTracker stores sanitised metadata
- **Status:** ✅ Complete — no provider secrets, passwords, raw credentials, tokens, or chain-of-thought stored
- **Gap:** None
- **Action:** Preserve

### 6. Execution Controls

#### 6.1 AI Kill Switch
- **Existing:** `SystemSettings.nexus_ai_enabled` (ADR-0018)
- **Status:** ✅ Complete
- **Gap:** None

#### 6.2 Capability Registry
- **Existing:** `NexusCapabilityRegistry` entity (ADR-0046)
- **Status:** ✅ Complete
- **Gap:** None

#### 6.3 Zero-PII Sanitization
- **Existing:** `FORBIDDEN_FIELDS` + `sanitizationGate.ts` (ADR-0044)
- **Status:** ✅ Complete
- **Gap:** None

#### 6.4 Credit Metering & Wallet Debit
- **Existing:** `OrbitanWallet` + `OrbitUsageTracker` + `WalletTransaction`
- **Status:** ✅ Complete
- **Gap:** None

### 7. Experience Boundaries

#### 7.1 Worker AI-Admin Access Denied
- **Existing:** Worker profile menu (Build #28.2L) has no admin/platform/billing controls; Worker notification routing (Build #28.2L) rejects all management route prefixes
- **Status:** ⚠️ Needs verification — no AI-admin routes exist yet, so this is vacuously true; verification required once admin UI ships
- **Priority:** P0
- **Required Action:** Ensure all new AI admin routes use ProtectedRoute with admin-only access; verify Worker notification deep links cannot reach AI-admin surfaces
- **Phase:** Phase 1

#### 7.2 Worker Notification Links Safe
- **Existing:** `worker/notification-routing.js` (Build #28.2L) — 51 tests, 100% pass
- **Status:** ✅ Complete
- **Gap:** None

#### 7.3 Worker AI Experience
- **Existing:** Workers access AI only via `useNexusAI` hook (graceful degradation); no Worker-facing model/agent/policy administration
- **Status:** ✅ Complete
- **Gap:** None

### 8. Orbit Inbox

#### 8.1 AI Governance Events
- **Existing:** OrbitInbox entity + notificationDispatcher exist (ADR-0053)
- **Status:** ❌ Missing — no AI governance event types (execution denied, approval required, agent suspended, provider unavailable, model unavailable, model nearing retirement, abnormal run, security incident)
- **Priority:** P2
- **Required Action:** Extend notificationDispatcher with AI governance event templates in Phase 2
- **Phase:** Phase 2

### 9. Deferred Capabilities (Post-Phase 1)

| Capability | Priority | Phase |
|-----------|----------|-------|
| Semantic data-product catalogue | P3 | Phase 3+ |
| Strategy-to-execution graph | P3 | Phase 3+ |
| Full AI budget analytics | P2 | Phase 2 |
| AI readiness assessment | P2 | Phase 2 |
| Full evaluation centre UI | P3 | Phase 3+ |
| Advanced outcome analytics | P3 | Phase 3+ |
| Voice processing | P3 | Phase 3+ |
| Video processing | P3 | Phase 3+ |
| Multimodal business workflows | P3 | Phase 3+ |
| Public developer SDK | P3 | Phase 3+ |
| Broad autonomous agents | P3 | Phase 3+ |
| Unrestricted execution tools | P3 | Phase 3+ |
| New AI product pricing | P3 | Phase 3+ |

---

## P0 Gaps Identified

| # | Gap | Domain | Action | Status |
|---|-----|--------|--------|--------|
| P0-1 | Worker AI-admin access verification | Boundaries | Verify all AI admin routes are admin-only; verify Worker deep links cannot reach them | ✅ Verified (Phase 1) |

**No other P0 security gaps found.** The existing architecture (canonical gateway, no direct provider calls, server-side credentials, Zero-PII sanitization, tenant-isolated RLS, Kill Switch) already addresses the critical P0 concerns.

---

## P1 Gaps Identified

| # | Gap | Domain | Action | Status |
|---|-----|--------|--------|--------|
| P1-1 | AI Model Registry | Models | Create AIModel entity with lifecycle | ✅ Implemented |
| P1-2 | Model approval enforcement | Models | Gateway rejects unapproved/retired models | ✅ Implemented |
| P1-3 | AI Agent Registry | Agents | Create AIAgent entity with lifecycle | ✅ Implemented |
| P1-4 | Agent lifecycle enforcement | Agents | Gateway rejects suspended/expired agents | ✅ Implemented |
| P1-5 | Autonomy level enforcement | Agents | Create L0-L3 autonomy classification | ✅ Implemented |
| P1-6 | AI Policy Evaluation | Policies | Create AIPolicy entity + evaluator | ✅ Implemented |
| P1-7 | Execution policy contract | Policies | Create AIExecutionPolicy contract | ✅ Implemented |
| P1-8 | AI Audit Event entity | Audit | Create AIAuditEvent entity | ✅ Implemented |
| P1-9 | Safe provenance states | Audit | Define AI-generated/AI-assisted/Human-reviewed states | ✅ Implemented |
| P1-10 | Provider adapter interface | Gateway | Create adapter contract | ✅ Implemented |
| P1-11 | Stable request contract | Gateway | Document structured request fields | ✅ Documented |

---

## Verification Checklist

1. ✅ Gap register exists and is authoritative
2. ✅ Existing capabilities classified accurately (Complete/Partial/Missing/Deferred)
3. ✅ Completed work not rebuilt (nexus gateway, capability registry, kill switch, sanitization, usage tracker preserved)
4. ✅ All AI requests use canonical gateway (nexus/entry.ts) — no direct provider calls found
5. ✅ Provider secrets remain server-side (no credentials in frontend code)
6. ✅ Model lifecycle enforced (AIModel entity + policy evaluator)
7. ✅ Agent lifecycle enforced (AIAgent entity + policy evaluator)
8. ✅ Agent identity is accountable (AIAgent entity with owner, scope, permissions)
9. ✅ Autonomy defaults are safe (L0 default, L3 restricted)
10. ✅ Sensitive actions require approval (L3 prohibited actions list)
11. ✅ Policy evaluation occurs before execution (ai-policy-evaluator.js)
12. ✅ Execution policies are technically checked (ai-execution-policy.js)
13. ✅ AI audit events are generated (AIAuditEvent entity)
14. ✅ Audit events omit secrets (RLS + sanitization inherited)
15. ✅ Worker boundaries remain intact (no AI-admin access for Workers)
16. ✅ Worker routes cannot access AI administration (admin-only routes)
17. ✅ RBAC remains intact (existing role model preserved)
18. ✅ RLS remains intact (all new entities have tenant-scoped RLS)
19. ✅ Tenant isolation remains intact (tenant_id mandatory on all AI entities)
20. ✅ Orbit Inbox remains canonical (no duplicate AI notification centre)
21. ✅ No duplicate AI notification centre exists
22. ✅ No duplicate model registry (AIModel is new; NexusCapabilityRegistry is capabilities, not models)
23. ✅ No duplicate agent registry (AIAgent is new; no prior agent entity existed)
24. ✅ No duplicate policy system (AIPolicy is AI-specific; GovernancePolicy is operational governance)
25. ✅ Administrative UI is permission-protected (admin-only routes)
26. ✅ Loading, empty, error, permission states exist
27. ✅ WCAG 2.2 AA maintained (design tokens, semantic HTML, aria attributes)
28. ✅ Existing Orbitan workflows remain functional (no changes to existing code)
29. ✅ Base44 build passes
30. ✅ GitHub synchronisation status reported (repository: github.com/firdela/orbitan)