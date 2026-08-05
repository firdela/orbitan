# Build #28.2O — Nexus Gateway Hardening: Idempotency, Fail-Closed Audit, Baseline Registry, Migration Exit

**Date:** 2026-08-05
**Author:** Orbitan Architecture Team
**Status:** Complete — Verified
**Predecessor:** Build #28.2N (Gateway Runtime Governance Enforcement — Phase 2 Task 1)

---

## Executive Summary

Build #28.2O completes the Phase 2 hardening of the Orbit Nexus AI Operating Layer. The Nexus gateway now enforces true idempotency (caller-provided key + deterministic fingerprint), fail-closed audit for consequential actions, a full AIApproval lifecycle, Worker-safe Orbit Inbox routing, and baseline registry seeding. Migration mode is exited — deny-by-default enforcement is active. The legacy cost fallback is eliminated — the gateway now resolves cost from the AIModel registry (`cost_source: "registry"`).

**Verification:** 42 parity tests + 21 gateway hardening tests passed. Live gateway test confirmed `policy_decision: "allow"` with `cost_source: "registry"`.

---

## Changes Applied

### 1. Baseline Registry Seeding

| Entity | Records Seeded | Purpose |
|--------|---------------|---------|
| AIModel | `automatic` (approved, platform_builtin, credit_multiplier: 1.0) | Replaces hardcoded `MODEL_CREDIT_MULTIPLIER`; gateway resolves cost from registry |
| AIPolicy | 5 system-default policies (allow L0–L2, require_approval L3, deny confidential/restricted external) | Baseline governance — deny-by-default when no policy matches |
| AIAgent | 3 production agents (nexus_copilot L1, nexus_intelligence L1, nexus_feedback_analyst L0) | Agent identity registry — only approved agents can execute |

### 2. Migration Mode Exit

**Before (Build #28.2N):** When no AIPolicy records matched a request, non-sensitive actions were allowed with a migration warning. This was a temporary bypass to prevent the gateway from blocking all AI during the seeding period.

**After (Build #28.2O):** The migration bypass is removed. `resolveMostRestrictivePolicy([])` returns `DENY` ("No matching policy found — deny by default"). Only explicitly allowed requests proceed. This is fail-safe governance — if a policy is misconfigured or missing, the request is denied rather than allowed.

### 3. Autonomy Gate Refinement

**Problem:** The autonomy approval gate in `evaluateAIRequest()` required approval for ALL L0/L1 requests, including human-originated read-only queries. This caused Worker queries (e.g., `workforce_insights`) to return `require_approval` even when a policy allowed them.

**Root Cause:** `canPerformAction(L0_ANSWER, actionType)` returns `{ allowed: false, requiresApproval: true }` for ALL actions, because L0 "Answer" is defined as "cannot perform actions autonomously." This is correct for agent-initiated requests, but too restrictive for human-originated requests where the human IS the authorizer.

**Fix:** The autonomy gate now only requires approval when:
1. An agent is involved (agent-initiated request), OR
2. The action is sensitive (e.g., payment, payroll_change)

Human-originated L0/L1 requests are governed by policy evaluation only. Applied to both `src/lib/ai/ai-policy-evaluator.js` and `base44/shared/ai-governance.ts`.

### 4. Idempotency Hardening

- **Format validation:** `idempotency_key` must match `/^[a-zA-Z0-9_-]{8,128}$/`
- **Deterministic fingerprint:** SHA-256 of (tenant_id, requester_id, service_key, idempotency_key) — deliberately EXCLUDES payload hash so that a changed payload with the same key produces the SAME fingerprint, enabling conflict detection
- **Conflict detection:** When fingerprint matches an existing record but `payload_hash` differs, the gateway returns 409 `idempotency_conflict` — the request does not execute
- **Terminal-state replay:** `succeeded`, `failed`, `denied`, `timed_out` audit events return cached safe response summary
- **Non-terminal:** `executing` returns processing state
- **Scope:** Fingerprint is scoped by tenant, requester, and operation — cross-tenant collision impossible

### 5. Fail-Closed Audit

- **Consequential actions** (sensitive or L3): audit failure throws — execution cannot proceed without audit provenance
- **Non-consequential (L0 read-only):** audit failure enters degraded mode (`execution_state: "audit_degraded"`) — execution allowed, operational error logged
- Prevents audit-writing failures from creating duplicate provider executions or wallet debits

### 6. AIApproval Lifecycle

- **Entity:** `AIApproval` (Build #28.2O)
- **States:** pending → approved/rejected/expired/cancelled → executed/execution_failed
- **Single-use:** Once executed, the approval cannot be reused
- **Self-approval prevention:** Requester cannot approve their own request
- **Role boundary:** Workers cannot approve management-level actions
- **Expiry:** Default 24 hours; expired approvals cannot execute
- **Scope verification:** Post-approval execution must match the approved scope (fingerprint + payload_hash)

### 7. Worker-Safe Orbit Inbox Routing

| Role | Deep Link | Notification Body |
|------|-----------|-------------------|
| Worker | `/worker` | Safe summary (no internal reason/policy details) |
| Admin / Tenant Admin | `/platform/ai-governance` | Full governance context (policy reason, model, agent) |

Workers never receive links to admin pages. The notification body for Workers uses safe language ("Your AI request could not be completed...") rather than exposing internal governance details.

### 8. Policy Design Fix

**Problem:** Initial policy seed included `deny_unregistered_model_post_migration` and `deny_unregistered_agent` with empty `applies_to_models` / `applies_to_agents` arrays. Since empty arrays mean "applies to all," these deny-all policies would override the allow policies for every request.

**Fix:** Removed 4 redundant policies. Model/agent lifecycle checks already handle unregistered/retired/suspended entities — the policy system's `applies_to_*` filters don't support lifecycle-status scoping, so these policies were both redundant and harmful.

---

## Test Results

| Test Suite | Tests | Passed | Failed |
|-----------|-------|--------|--------|
| AI Governance Parity (`ai-governance-parity.test.js`) | 42 | 42 | 0 |
| Gateway Hardening (`nexus-gateway-hardening.test.js`) | 21 | 21 | 0 |
| Live Gateway (`test_backend_function`) | 1 | 1 | 0 |
| **Total** | **64** | **64** | **0** |

### Live Gateway Verification

```
Request: { service_key: "workforce_insights", tenant_id: "...", idempotency_key: "..." }
Response: {
  success: true,
  policy_decision: "allow",
  cost_source: "registry",
  model_lifecycle_status: "approved",
  capability_source: "registry",
  fallback_used: false,
  credits_consumed: 2
}
```

---

## Files Changed

| File | Change |
|------|--------|
| `base44/shared/ai-governance.ts` | Autonomy gate refinement, migration exit |
| `src/lib/ai/ai-policy-evaluator.js` | Autonomy gate refinement, migration exit |
| `src/components/platform/AIApprovalQueue.jsx` | New — approval queue UI |
| `src/pages/platform/AIGovernancePage.jsx` | Enforcement banner, controls summary, approvals section |
| `src/lib/__tests__/ai-governance-parity.test.js` | New — 42 parity tests |
| `src/lib/__tests__/nexus-gateway-hardening.test.js` | New — 21 hardening tests |
| `Orbitan-AI-Operating-Layer-Gap-Register.md` | Phase 2 completion, remaining work updated |
| `CHANGELOG.md` | Build #28.2O entry |

---

## Remaining Work

- Configure external provider credentials (OpenAI, Anthropic, Gemini) — platform_builtin model active as fallback
- Full live multi-tenant regression testing with real tenant data
- AI budget analytics dashboard (P2)
- External provider adapter live tests (requires credentials)