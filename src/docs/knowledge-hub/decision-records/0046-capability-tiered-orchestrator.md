# ADR-0046: Capability-Tiered Orchestrator (Registry-Driven Intelligence)

**Date:** 2026-07-21
**Status:** Accepted
**Principle:** Regulate (Governance) + Refine (Extensibility) + Respond (Operational Agility)
**Supersedes:** —
**Related:** ADR-0001 (Registry-Driven Architecture), ADR-0006 (Orbit Nexus Intelligence Platform), ADR-0017 (Graceful Degradation), ADR-0018 (AI Kill Switch), ADR-0029 (Autonomous Governance Thresholds for Agentic AI), ADR-0032 (Polymorphic Action Engine), ADR-0044 (Sovereign Intelligence Model)

---

## Context

The `nexus` gateway (`base44/functions/nexus/entry.ts`) has served as the single governed entry point for all AI intelligence since ADR-0006. However, its `SERVICE_REGISTRY` constant — a hardcoded map of `service_key → { function_name, default_credits, description }` — introduced three structural constraints that now block the next phase of Orbitan's evolution:

1. **Code Coupling.** Adding, swapping, or retiring an AI service required editing `nexus/entry.ts` and redeploying the function. The gateway knew *which* backend function to call; the business logic of "what AI is available" was baked into infrastructure.
2. **No Tiered Autonomy.** The registry had no concept of *how much trust* a capability requires. A deterministic OCR extraction and a future autonomous procurement agent were treated identically — there was no schema-level place to declare "this needs a governance gate" vs "this is a stateless utility."
3. **No Sanitization Contract.** The gateway debited credits and tracked usage, but it did not enforce Zero-PII sanitization (ADR-0044) on the payload *before* dispatch. A new AI function could theoretically receive raw tenant data with no gate stopping it.

As Orbitan prepares to introduce Tier 2 (Assistant Synthesizer) and Tier 3 (Autonomous Delegate) capabilities for pilot tenants — inventory-to-procurement loops (Renewed Resources), emergency shift swaps (Taqueria), production planning (Izaliqa Bakes) — these three constraints become unacceptable. We need a model where intelligence is **a governed, registry-driven resource**, not a hardcoded routing table.

---

## Decision

Adopt a **Capability-Tiered Orchestrator** backed by a new `NexusCapabilityRegistry` entity. The `nexus` gateway transitions from a static service router to a **registry-driven dispatcher** that resolves capability definitions at runtime, enforces tiered governance, and sanitizes every payload before execution.

### 1. The NexusCapabilityRegistry Entity

A new entity (`base44/entities/NexusCapabilityRegistry.jsonc`) becomes the single source of truth for every AI capability. Each record declares:

- **`capability_key`** — the public identifier the frontend calls (e.g. `sop_gen`).
- **`tier`** — 1, 2, or 3 (see Tiering below).
- **`handler`** — `{ type: 'function' | 'agent_config', ref: <name> }` — the execution target, resolved at runtime.
- **`default_credits`** — base cost, multiplied by the model multiplier.
- **`governance`** — `{ domain_id, requires_consent, model_override }` — the Shield binding.
- **`sanitization`** — `{ mode: 'strict' | 'permissive' | 'disabled', permitted_fields }` — the Zero-PII enforcement config.
- **`fallback_capability_key`** — graceful degradation target.
- **`is_active`** — the per-capability runtime kill-switch.
- **`min_plan_required`** — subscription tier gating.

### 2. Capability Tiering

| Tier | Name | Description | Governance | Example |
|------|------|-------------|------------|---------|
| **1** | Deterministic Regulator | Direct, stateless function execution. No LLM autonomy. | None required (domain_id null). | OCR receipt extraction, recipe cost calculation. |
| **2** | Assistant Synthesizer | LLM + tools. Generates output from prompt + structured context. | Mandatory Shield domain binding. | SOP generation, training module generation, business advisor. |
| **3** | Autonomous Delegate | Agentic loop — proactive triggers, memory, multi-step execution. | Enterprise plan + high trust tier + explicit consent. | Future: autonomous procurement agent, shift auto-rebalancer. |

**Why tiers?** They map directly to audit risk. A Tier 1 capability is deterministic and reversible — it writes no state without a separate entity call. A Tier 3 capability *acts* — it writes purchase orders, shifts, and financial records. SOC 2 requires that we treat these differently, and the tier field is the schema-level declaration of that difference.

### 3. Registry-Driven Dispatch Contract

The refactored `nexus/entry.ts` will:

1. **Look up** the `capability_key` in `NexusCapabilityRegistry` (tenant-specific override first, then `system` default).
2. **Fail-over** to the in-memory `LEGACY_FALLBACK_REGISTRY` (the current static constant) if the entity lookup fails — guaranteeing zero downtime during migration.
3. **Enforce** `min_plan_required` against the tenant's subscription.
4. **Sanitize** the payload through `sanitizationGate` using the capability's `sanitization.mode` and `permitted_fields`.
5. **Shield-gate** the request using `governance.domain_id` (if present).
6. **Check** credit balance and debit on success.
7. **Dispatch** to `handler.ref` (function invocation or agent invocation).
8. **Track** usage in `OrbitUsageTracker` and increment `fire_count` on the registry record.
9. **Fallback** to `fallback_capability_key` on handler failure, if configured.

### 4. Sanitization-First Principle (ADR-0044 Enforcement)

Every capability declares its `sanitization.mode`:

- **`strict`** — full `sanitizationGate` pipeline: registry lookup + consent check + PII strip. Default for Tier 2/3.
- **`permissive`** — PII strip only (skip registry/consent), for Tier 1 capabilities with structured, non-PII payloads (e.g. `file_url`, `prompt_template`).
- **`disabled`** — pass-through. Enterprise opt-out, audit-logged. Requires admin role.

This makes Zero-PII a **schema-level contract**, not a developer convention. A new capability cannot be registered without declaring its sanitization posture.

---

## Alternatives Considered

### Alternative A: Keep the static registry, add a `tier` field to the constant
- **Pros:** Zero migration. No new entity. No runtime lookup latency.
- **Cons:** Every capability change still requires a code deploy. No tenant-specific overrides. No admin UI. Violates ADR-0001 (Registry-Driven Architecture). Cannot support Tier 3 runtime enablement without redeploy.
- **Rejected:** Does not achieve the decoupling or governance goals.

### Alternative B: Move to a pure config file (JSON in repo)
- **Pros:** Version-controlled. No DB lookup latency. Reviewable in PRs.
- **Cons:** Not runtime-editable. No tenant-specific overrides. No admin UI. Requires deploy to change capabilities. Half-measure between static and registry-driven.
- **Rejected:** Does not satisfy the "intelligence as a governed resource" principle.

### Alternative C: Full agentic orchestrator (LangGraph-style)
- **Pros:** Maximum flexibility. Native tool-calling. Future-proof for Tier 3.
- **Cons:** Massive complexity. Introduces a new framework dependency. Premature for the current pilot needs. Violates "prevent unnecessary complexity" principle. Tier 3 is not yet required by any pilot tenant.
- **Rejected:** Right architecture, wrong time. The tiered registry is the stepping stone — when Tier 3 lands, the registry already has the `handler.type: 'agent_config'` seam ready.

---

## Trade-offs

### Positive
- **Decoupling:** Adding a capability = one database row, not a code deploy.
- **Governance:** Tier field makes audit risk schema-explicit. Shield binding is per-capability, not per-function.
- **Privacy-by-Design:** Sanitization mode is a schema contract, not a convention.
- **Graceful Degradation:** `fallback_capability_key` + `is_active` kill-switch + `LEGACY_FALLBACK_REGISTRY` = three layers of resilience.
- **Platform Independence:** The registry is pure JSON — portable to any stack (ADR-0036/ADR-0038).
- **Tenant Overridability:** Enterprise tenants can override capability routing without platform code changes.

### Negative
- **Runtime Lookup Latency:** Every request now reads the registry. Mitigated by stale-while-revalidate caching (60s TTL) — sub-50ms cost.
- **Single Point of Failure:** If the registry entity is unavailable, the gateway fails. Mitigated by the in-memory `LEGACY_FALLBACK_REGISTRY` — the current static constant is preserved as an emergency failover.
- **Migration Effort:** Existing `SERVICE_REGISTRY` entries must be seeded into the new entity. One-time, scripted.
- **Admin Surface Area:** A new admin UI is needed to manage capabilities. Deferred to post-MVP.

---

## Implementation Path (Non-Breaking)

| Phase | Action | Risk | Rollback |
|-------|--------|------|---------|
| **1** | Create `NexusCapabilityRegistry` entity. | None — additive. | Delete entity. |
| **2** | Seed registry with the 5 existing `SERVICE_REGISTRY` entries (all Tier 1/2, `is_system_default: true`, `tenant_id: 'system'`). | None — additive. | Delete seeded records. |
| **3** | Refactor `nexus/entry.ts`: registry lookup with `LEGACY_FALLBACK_REGISTRY` failover. Sanitization gate wired. | Medium — gateway is production path. | `LEGACY_FALLBACK_REGISTRY` makes the refactor a no-op if registry lookup fails. |
| **4** | Publish this ADR + update `DecisionRecords.md` index. | None. | — |
| **5** | (Post-MVP) Admin UI for capability management. | — | — |

**Stateless Function Rule (Tier 1):** All Tier 1 handlers MUST remain stateless — they read input, return output, and write no entity state directly. State writes go through entity automations or the Action Engine (ADR-0032). This prevents complexity debt and keeps Tier 1 capabilities trivially auditable.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Registry lookup failure breaks all AI. | `LEGACY_FALLBACK_REGISTRY` in-memory constant preserves the current static map as emergency failover. |
| Tenant override misroutes a capability. | `is_system_default` records are read-only for non-admins. Tenant overrides require `tenant_admin` role and are audited. |
| Sanitization strips a field the handler needs. | `permitted_fields` allowlist per capability. Tier 1 deterministic capabilities use `permissive` mode. |
| Tier 3 capability acts without consent. | Tier 3 requires `orbitan_enterprise` plan + `requires_consent: true` + Shield `domain_id` binding. Three gates. |
| Credit debit drift if registry `default_credits` differs from legacy. | Seeded records copy `default_credits` from the legacy `SERVICE_REGISTRY` exactly. |
| Performance regression from DB read per request. | Stale-while-revalidate cache (60s TTL). `fire_count` / `last_fired_at` updates are fire-and-forget. |

---

## Cross-References

- [ADR-0001: Registry-Driven Architecture](./0001-registry-driven-architecture.md) — the foundational pattern this extends.
- [ADR-0006: Orbit Nexus Intelligence Platform](./0006-orbit-nexus-intelligence-platform.md) — the gateway this refactors.
- [ADR-0017: Graceful Degradation / No AI Dependency](./0017-orbitanos-graceful-degradation-no-ai-dependency.md) — the `fallback_capability_key` + kill-switch lineage.
- [ADR-0018: AI Kill Switch Pattern](./0018-ai-kill-switch-pattern.md) — the `is_active` per-capability kill-switch.
- [ADR-0029: Autonomous Governance Thresholds for Agentic AI](./0029-autonomous-governance-thresholds-for-agentic-ai.md) — the Tier 3 governance model.
- [ADR-0032: Polymorphic Action Engine](./0032-polymorphic-action-automation-engine.md) — the event-driven action layer Tier 3 will integrate with.
- [ADR-0044: Platform Intelligence Self-Optimization](./0044-platform-intelligence-self-optimization.md) — the Zero-PII sanitization contract this enforces.

---

**Product Owner:** Muhammad Firdaus Bin Ismail
**Authored by:** Base44 (acting as Strategic Architect)
**Last Updated:** 2026-07-21