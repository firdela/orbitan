# ADR-0029: Autonomous Governance Thresholds for Agentic AI

**Status:** Accepted
**Date:** 2026-07-15
**Principle:** Regulate
**Depends on:** ADR-0003 (Shield Governance Interceptor), ADR-0020 (Orbit ID — Identity, Access & AI Governance), ADR-0018 (AI Kill Switch Pattern)
**Supersedes:** None

---

## Context

OrbitanOS is an AI-native Workforce Operating System. As Orbit Nexus agents (`procurement_agent`, `finance_agent`, `inventory_agent`) gain the ability to take operational actions — raising purchase orders, adjusting stock, publishing shifts — a critical trust question emerges:

> How much autonomy should an AI agent have, and who decides the boundary?

Hardcoding thresholds inside agent code creates three structural problems:

1. **Technical debt** — thresholds become scattered `if-else` branches as tenants and industries mature.
2. **Tenant rigidity** — an SME needing a $500 gate and an enterprise needing a $50,000 gate for the same department require code changes.
3. **No audit trail** — the "why" behind a gate decision is invisible to compliance auditors (SOC 2, ISO 27001).

The existing `ShieldInterceptor` already evaluates `GovernancePolicy` records for human actions, but it has no concept of an *agent* actor and no safe mechanism to calibrate thresholds before enforcement.

## Decision

Implement **Governance-as-Code** for agentic AI: a Policy Evaluation Pipeline where agents request permission from the Shield Interceptor before executing sensitive actions, and the Interceptor resolves tenant-specific rules at runtime — with a **Shadow Audit Mode** for safe rollout.

### 1. Agentic Policy Fields on `GovernancePolicy`

Extend the entity with:

| Field | Type | Purpose |
|-------|------|---------|
| `applies_to` | `"human" \| "agent" \| "both"` | Whether the policy governs human or AI agent actions (default `"both"`) |
| `agent_name` | string (nullable) | Target a specific agent slug; null = all agents |
| `agent_trust_level` | `"low" \| "medium" \| "high"` | Trust tier this policy gates |
| `agentic_threshold_sgd` | number (nullable) | Monetary threshold for autonomous agent actions |
| `shadow_audit_mode` | boolean | When true, `block` effects are downgraded to `notify` |
| `shadow_audit_until` | date-time (nullable) | Expiry timestamp for shadow audit calibration |

### 2. Shadow Audit Mode (Safety-First Rollout)

Before enforcing hard gates on agent actions, every new agentic policy runs in Shadow Audit Mode for a calibration period (default 14 days):

| Mode | `effect` | Outcome | AuditLog `shield_outcome` |
|------|---------|---------|---------------------------|
| Normal | `block` | Action halted, `GovernanceOverride` created | `blocked` |
| Shadow | `block` | **Action proceeds**, logged as "would-have-blocked" | `notify` (+ `shadow_audit: true`) |

This collects real operational data on where agent actions would breach thresholds, tunes the values empirically, and only then flips to hard-gate enforcement — preventing the "system is too rigid" feedback that derails enterprise pilots.

### 3. Contextual Policy Resolution Pipeline

When an agent initiates an action, the Shield Interceptor:

1. Resolves `tenant_id`, `governance_domain` (from the Tenant record), and subscription tier.
2. Fetches active tenant-specific + platform-wide policies.
3. Filters by `target_entity`, `trigger_action`, `domain_id`.
4. Filters by `applies_to` (agent vs. human) and `agent_name` if specified.
5. Evaluates `condition_json` against the action payload.
6. Classifies the outcome: **PASS**, **NOTIFY** (Shadow), **BLOCK**, or **AUTO_REMEDIATE**.

### 4. Delegated Authority Gates (Example)

A `tenant_admin` configures an agent's trust boundary by creating a `GovernancePolicy`:

```json
{
  "policy_name": "procurement_agent_autonomy_gate",
  "applies_to": "agent",
  "agent_name": "procurement_agent",
  "agent_trust_level": "medium",
  "target_entity": "PurchaseOrder",
  "trigger_action": "create",
  "condition_json": { "amount_gt": 200 },
  "effect": "block",
  "shadow_audit_mode": true,
  "shadow_audit_until": "2026-07-29T00:00:00Z"
}
```

The agent can autonomously raise POs below 200 SGD. Above that threshold, it must create a `GovernanceOverride` and wait for human approval before proceeding.

## Rationale

**Why Governance-as-Code over hardcoded thresholds?**
- Decouples business logic from agent code — threshold changes need no redeployment.
- Tenant-agnostic: an F&B tenant and a Recycling tenant hold different policies in the same entity, with zero `if-else` branching per industry.
- Audit-first: every gate decision is a queryable `AuditLog` record carrying `policy_name` and `shield_outcome` — directly exportable to Vanta for SOC 2 evidence.

**Why Shadow Audit over immediate enforcement?**
- Prevents false positives from blocking real operations during rollout.
- Provides empirical data to calibrate thresholds per industry pack before enforcement.
- Aligns with "Security-by-Design" rollout: observe before enforcing.

**Alternatives considered:**
- *Per-agent config files* — rejected: not queryable, not audit-bound, not tenant-isolated.
- *Subscription-tier-only gating* — rejected: too coarse; a Business-tier F&B tenant needs different thresholds than a Business-tier Retail tenant.

## Consequences

**Positive:**
- Tiered trust model justifies Enterprise/Business subscription pricing.
- SOC 2 auditors get a complete "why" trail for every agent action.
- New industries can be onboarded with calibrated thresholds without code changes.

**Negative / Risks:**
- Shadow audit logs add volume to `AuditLog` — mitigated by the `shadow_audit_until` expiry; the `orbitanOrchestrator` should purge expired shadow entries.
- Agent developers must call the Shield before writes — enforced via an Agentic Gate wrapper around agent tool calls.

## Verification

- [ ] `GovernancePolicy` schema accepts `applies_to`, `agent_name`, `agent_trust_level`, `agentic_threshold_sgd`, `shadow_audit_mode`, `shadow_audit_until`.
- [ ] `ShieldInterceptor` filters by `applies_to` when `actor_type` is provided in the payload.
- [ ] Shadow Audit downgrades `block` → `notify` and logs `shadow_audit: true` in `AuditLog.new_state`.
- [ ] `AuditLog` records `actor_type` and `agent_name` for agent-initiated actions.
- [ ] A procurement agent policy in Shadow Audit mode on Taqueria logs would-have-blocked events without halting operations.

## Cross-references

- ADR-0003: Shield Governance Interceptor
- ADR-0018: AI Kill Switch Pattern
- ADR-0020: Orbit ID — Identity, Access & AI Governance
- ADR-0028: Workforce-Financial Correlation Logic (consumes agentic thresholds for shift-cost gates)