# ADR-0067: Orbitan AI Operating Layer — Phase 1 Security & Governance Foundation

**Date:** 2026-08-05
**Status:** Accepted
**Principle:** Regulate (Governance) + Shield (Security)
**Supersedes:** —
**Related:** ADR-0006 (Orbit Nexus Intelligence Platform), ADR-0018 (AI Kill Switch), ADR-0029 (Autonomous Governance Thresholds), ADR-0044 (Sovereign Intelligence Model), ADR-0046 (Capability-Tiered Orchestrator), ADR-0053 (Orbit Inbox)

---

## Context

The Orbit Nexus intelligence platform has matured through ADRs 0006, 0018, 0029, 0044, and 0046 into
a capable, governed AI layer: a canonical gateway, registry-driven capabilities, kill switch,
Shield governance integration, Zero-PII sanitization, usage tracking, and credit metering.

However, a comprehensive audit (Build #28.2M) identified foundational gaps that must be closed
before Orbit Nexus can be considered production-safe for governed AI operations:

1. **No formal model lifecycle management.** The `MODEL_CREDIT_MULTIPLIER` constant in `nexus/entry.ts`
   is a hardcoded list of 7 models with no lifecycle state, approval status, deprecation tracking,
   capability profile, or data-classification clearance. An unapproved or retired model could serve
   production requests with no enforcement.

2. **No agent identity governance.** The `NexusCapabilityRegistry.handler.type = 'agent_config'` field
   is reserved for future agents, but no entity tracks agent identity, approved skills, autonomy level,
   permissions, or lifecycle. Without this, any function could act as an "agent" with no accountability.

3. **No AI-specific policy evaluation.** The Shield Interceptor governs entity writes via
   `GovernancePolicy`, but it is action/entity-oriented, not AI-request-oriented. There is no
   evaluation of provider, model, data classification, autonomy level, or environment before AI execution.

4. **No AI audit provenance.** `OrbitUsageTracker` meters usage (credits, model, latency) but does
   not capture AI-specific provenance: routing decision, policy decision, data-product references,
   knowledge-source references, tools invoked, approval references, validation result, or safe
   provenance states (AI-generated, AI-assisted, Human-reviewed).

5. **No provider adapter abstraction.** All AI calls route through `base44.integrations.Core.InvokeLLM`
   (platform_builtin). No direct provider SDK calls exist (verified by codebase scan), but there is
   no formal adapter interface for future multi-provider routing (OpenAI, Anthropic, Gemini, hosted
   open-source).

6. **No autonomy classification.** ADR-0046 defines capability tiers (1/2/3), and ADR-0029 defines
   agentic governance thresholds, but there is no formal L0–L3 autonomy classification (Answer,
   Recommend, Draft, Execute) with programmatic enforcement of L3 restrictions.

---

## Decision

Establish the **Orbitan AI Operating Layer** as a formal security and governance foundation,
complementing the existing Nexus Gateway architecture. Phase 1 implements only verified P0/P1 gaps.

### 1. AI Model Registry (`AIModel` entity)

A new entity becomes the single source of truth for every AI model the platform can route to.
Replaces the hardcoded `MODEL_CREDIT_MULTIPLIER` constant. Enforces lifecycle states:
Draft → Evaluation → Approved → Restricted → Deprecated → Retired.

Production routing rejects models not in Approved or Restricted state. Each model declares:
capability profile, supported modalities, cost configuration, data-classification clearance,
approved/restricted use cases, fallback model, deprecation/retirement dates, replacement model,
responsible owner, and last reviewed date.

### 2. AI Agent Registry (`AIAgent` entity)

A new entity tracks every production-capable agent identity. Default new agents to Draft status
with minimum permissions and L0 (lowest) autonomy. Enforces lifecycle states:
Draft → Testing → Approved → Suspended → Expired → Retired.

Each agent declares: business/technical owner, tenant/outlet scope, approved skills, approved
tools, approved data products, permitted integrations, credential type, data classification,
autonomy level, cost budget, runtime limit, version, risk status, last activity, last permission
review, and expiry/review date.

No unrestricted shared agent identity is permitted for all actions.

### 3. AI Policy Evaluation (`AIPolicy` entity + `ai-policy-evaluator.js`)

A new entity and shared module provide AI-specific policy evaluation that occurs before each AI
execution. Distinct from `GovernancePolicy` (which governs entity writes via Shield).

Applies **deny-by-default** for sensitive actions without explicit authorisation.
Applies **most-restrictive-policy-wins** when policies overlap.

Returns structured decisions: allow, deny, require_approval, require_safer_model,
require_reduced_data, require_read_only_mode, require_human_escalation.

### 4. AI Execution Policy (`ai-execution-policy.js`)

A shared module defining the technical execution-policy contract: environment type, permitted
tenant/org/brand/outlet, allowed tools, allowed integrations, allowed network destinations,
credential scope, permitted data classifications, max runtime, max tokens, max cost, required
monitoring, stop conditions, escalation route, and kill-switch state.

Default policies use: deny by default, narrow tenant scope, short-lived credentials, read-only
access where possible, domain allowlists, sandboxed testing, reversible actions, explicit
production approval.

Execution is blocked when the actual context conflicts with the declared policy. Prompts are
NOT the security boundary.

### 5. AI Audit Provenance (`AIAuditEvent` entity)

A new entity records every AI execution with full provenance: provider, model, routing decision,
policy decision, data-product references, knowledge-source references, tools invoked, approval
references, runtime, usage, estimated cost, validation result, outcome, and safe provenance state.

Extends (does not duplicate) the existing `AuditLog` entity — AuditLog captures operational actions;
AIAuditEvent captures AI-specific execution provenance. Never stores provider secrets, passwords,
credentials, tokens, or chain-of-thought.

Safe user-facing provenance states: AI-generated, AI-assisted, Human-reviewed, Awaiting review,
Executed after approval.

### 6. Provider Adapter Interface (`ai-provider-adapter.js`)

A shared module defining the standard provider-adapter contract for OpenAI, Anthropic, Google
Gemini, approved hosted open-source models, and future providers. Phase 1 implements the interface
shape only; live adapters are Phase 2 (when external credentials are available).

The platform currently routes all AI through `base44.integrations.Core.InvokeLLM` (platform_builtin
provider), which already abstracts provider selection server-side. No provider secrets exist in
frontend code.

### 7. Autonomy Classification (`ai-autonomy-levels.js`)

A shared module defining the canonical L0–L3 autonomy classification:
- **L0 Answer** — provides information, no actions
- **L1 Recommend** — suggests actions, requires human confirmation
- **L2 Draft** — creates drafts, not published without review
- **L3 Execute** — performs actions, restricted for sensitive operations

L3 cannot autonomously perform: payments, payroll changes, employee-status changes, access-
permission changes, destructive database changes, external publication, legal/contractual
commitments, customer-data exports, or production configuration changes.

New agents and skills default to L0 (lowest appropriate autonomy).

---

## Alternatives Considered

1. **Extend existing GovernancePolicy for AI** — Rejected: GovernancePolicy is action/entity-oriented
   (Shield governs entity writes). AI requests have different dimensions (provider, model, data
   classification, autonomy). Conflating them would create ambiguity and reduce clarity for
   compliance auditors.

2. **Extend OrbitUsageTracker for audit provenance** — Rejected: OrbitUsageTracker is usage metering
   (credits, model, latency, status). Audit provenance requires different fields (routing decision,
   policy decision, tools invoked, approval references, validation result). Extending the usage
   tracker would bloat it beyond its purpose.

3. **Hardcode model lifecycle in gateway** — Rejected: ADR-0046 already established the
   registry-driven pattern. Hardcoding model lifecycle would reintroduce the code-coupling problem
   that ADR-0046 solved for capabilities.

4. **Create a single unified AI entity** — Rejected: Model, agent, policy, and audit have distinct
   lifecycles, ownership, and RLS requirements. A single entity would be unwieldy and violate
   single-responsibility.

5. **Delay all AI governance until Phase 2** — Rejected: P0/P1 gaps are security-critical.
   Operating without model lifecycle enforcement, agent identity governance, or AI-specific policy
   evaluation is an unacceptable risk for a platform handling workforce and financial data.

---

## Security & Privacy

- **No provider secrets in frontend:** All AI calls go through `base44.integrations.Core.InvokeLLM`
  (server-side). No direct provider SDK calls. Verified by codebase scan.
- **Deny by default:** Sensitive AI actions without explicit policy authorisation are denied.
- **Most-restrictive-wins:** When policies overlap, the most restrictive valid policy applies.
- **Tenant isolation:** All AI entities require `tenant_id` and have tenant-scoped RLS.
- **No chain-of-thought storage:** AIAuditEvent never stores prompts, chain-of-thought, or provider
  secrets.
- **RLS enforced server-side:** Workers cannot read AI model/agent/policy administration.
  Workers cannot read other tenants' AI audit events.
- **Kill switch preserved:** The existing AI Kill Switch (ADR-0018) remains the highest-priority gate.

---

## Worker/Leader/Management Boundaries

- **Workers** access AI only via `useNexusAI` hook (graceful degradation). No model/agent/policy
  administration. No AI audit event access beyond their own requests.
- **Leaders/Management** access AI intelligence via existing Nexus Intelligence page, Copilot, and
  Feedback Analyst (all role-gated to supervisor+).
- **Administrators** access AI governance via new admin-only routes (`/platform/ai-governance`).

No Worker route may resolve into a management-only AI surface. This is enforced by:
- `ProtectedRoute` with admin-only access on AI admin routes
- `worker/notification-routing.js` rejecting management route prefixes (Build #28.2L)
- RLS on all AI entities (Workers cannot read AIModel, AIAgent, AIPolicy, or other tenants' AIAuditEvent)

---

## Database Impact

Four new entities created:
1. `AIModel` — model lifecycle registry
2. `AIAgent` — agent identity registry
3. `AIPolicy` — AI-specific policy registry
4. `AIAuditEvent` — AI execution audit provenance

All entities:
- Require `tenant_id`
- Have lifecycle status
- Have ownership/audit fields
- Have timestamps (built-in)
- Have RLS with tenant-scoped read and admin-only create/delete
- Support safe archival/deprecation behaviour

No existing entities were modified.

---

## Testing

`src/lib/__tests__/ai-operating-layer.test.js` — 60+ pure-function test cases covering:
- Autonomy level enforcement (L0–L3, prohibited actions, defaults)
- Model lifecycle enforcement (approved/draft/retired/deprecated/restricted)
- Agent lifecycle enforcement (approved/draft/suspended/expired/retired)
- Data classification evaluation
- Most-restrictive-policy-wins resolution
- Deny-by-default for sensitive actions
- Execution policy validation (kill switch, tenant scope, tools, data, runtime, tokens)
- Provider adapter classification (timeout, rate limit, auth, model unavailable)
- Security verification (no secrets in frontend modules, tenant_id required, RLS present)

**Result: 60/60 passed (100%).**

---

## Phase 2+ Roadmap

The following capabilities are documented as future phases and NOT implemented in this build:

| Capability | Phase | Priority |
|-----------|-------|----------|
| Semantic data-product catalogue | 3+ | P3 |
| Strategy-to-execution graph | 3+ | P3 |
| Full AI budget analytics | 2 | P2 |
| AI readiness assessment | 2 | P2 |
| Full evaluation centre UI | 3+ | P3 |
| Advanced outcome analytics | 3+ | P3 |
| Voice/video/multimodal processing | 3+ | P3 |
| Public developer SDK | 3+ | P3 |
| Broad autonomous agents | 3+ | P3 |
| AI governance Orbit Inbox events | 2 | P2 |
| Live provider adapters (OpenAI, Anthropic, Gemini) | 2 | P2 |
| Gateway integration (runtime policy evaluation in nexus/entry.ts) | 2 | P1 |