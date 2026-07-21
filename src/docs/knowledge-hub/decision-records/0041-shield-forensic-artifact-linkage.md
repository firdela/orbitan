# ADR-0041: Shield Forensic Artifact Linkage

**Date:** 2026-07-21
**Status:** Accepted
**Principle:** Regulate (audit-ready governance) + Relate (trust evidence)
**Impacted Modules:** Shield Interceptor, Artifact Registry, AuditLog, Compliance

---

## Context

The Shield Interceptor (`shieldInterceptor`) evaluates `GovernancePolicy` rules before sensitive write operations and writes an `AuditLog` entry for every triggered policy (block, notify, auto_remediate). However, the AuditLog alone captures only a **summary** of the violation — the policy name, the actor, and a text description. It does **not** preserve the full record state at the moment of the violation.

For SOC 2 / ISO 27001 audit readiness and the MVP Pilot's "audit-ready governance" objective, we need **tamper-evident forensic evidence**: a complete snapshot of the blocked record, the policy that triggered, the condition that matched, and the actor context — stored as an immutable `ArtifactRecord` that enters a review lifecycle (pending → in_review → approved) and is bound to the Shield AuditLog entry.

Without this linkage, a compliance auditor reviewing a blocked action would see only a one-line AuditLog entry. With it, they retrieve a full forensic artifact with the exact record state, the governance domain, the policy condition, and the actor identity — sufficient for an audit bundle.

---

## Alternatives Considered

### Alternative A: Expand AuditLog Schema to Store Full Record State
- **Pros:** Single entity; no additional writes.
- **Cons:** AuditLog is designed as a lightweight event trail (previous_state / new_state are already optional). Storing full record snapshots bloats the AuditLog collection and conflates "event log" with "evidence artifact." AuditLog entries are immutable but lack the review lifecycle (pending → approved) that governance evidence requires.
- **Rejected:** Conflates two concerns; no review gate on evidence.

### Alternative B: Create a New "ShieldEvidence" Entity
- **Pros:** Purpose-built schema.
- **Cons:** Introduces a new entity, new RLS rules, new automations, new UI — all for a narrow use case. The `ArtifactRecord` registry (ADR-0025) already exists as the unified, audit-bound storage for all platform artifacts, including `incident_evidence`.
- **Rejected:** Violates ADR-0025 (Unified Artifact Engine); duplicates existing capability.

### Alternative C: Shield Interceptor Creates ArtifactRecord on Block (Chosen)
- **Pros:** Reuses the existing `ArtifactRecord` registry and its review lifecycle. The artifact enters `in_review` (requires manager approval — Regulate principle). Links to the Shield AuditLog via `linked_entity_id`. The ArtifactRecord entity automation already creates its own AuditLog entry (`ARTIFACT_UPLOADED`), so the full chain is: Shield block → AuditLog (shield_blocked) → ArtifactRecord (incident_evidence) → AuditLog (ARTIFACT_UPLOADED). Tamper-evident, review-gated, SOC 2-ready.
- **Cons:** Adds one write per block event. Blocks are rare (policy violations), so the volume is acceptable. Adds one awaited call (AuditLog) on the block path, adding small latency to the 403 response.
- **Accepted:** Reuses existing registry; provides full forensic evidence; review gate enforced.

---

## Decision

When the Shield Interceptor returns a `block` outcome, it creates an `ArtifactRecord` with:

| Field | Value |
|---|---|
| `artifact_type` | `incident_evidence` |
| `title` | `Shield Block — {policy_name} — {ISO timestamp}` |
| `status` | `in_review` (requires manager approval) |
| `metadata` | Full forensic context: policy name/ID, governance domain, condition triggered, actor ID/name/role, actor type (human/agent), agent name, shadow audit flag, blocked entity, blocked action, **full blocked record state**, Shield AuditLog ID, capture timestamp |
| `linked_entity_type` | `AuditLog` (if AuditLog ID captured) or `GovernancePolicy` |
| `linked_entity_id` | Shield AuditLog ID or policy ID |
| `governance_policy_id` | The GovernancePolicy that triggered the block |
| `uploaded_by` / `uploaded_by_name` | The actor who triggered the block |
| `tags` | `['shield_block', 'soc2_evidence', {governance_domain}]` |
| `is_ai_generated` | `false` |

### Latency Trade-off

- **Notify / auto_remediate path:** Unchanged — AuditLog writes remain fire-and-forget (`.catch(() => {})`) to preserve interceptor latency on the common path.
- **Block path:** The AuditLog creation is awaited to capture its ID for forensic linkage. Block events are rare (policy violations), and the 403 response already signals a hard stop, so the added latency is acceptable.

### Fail-Open Semantics

If the forensic `ArtifactRecord` write fails, the block response is **still returned**. The AuditLog entry already captured the event. The artifact is a best-effort enhancement — it must never prevent the Shield from blocking.

### Review Lifecycle

The artifact enters `in_review` and follows the standard `ArtifactRecord` review lifecycle (ADR-0025):
1. `in_review` — auto-created by the Shield
2. `approved` — a manager reviews the forensic evidence and approves it into the audit bundle
3. `rejected` — a manager determines the block was a false positive and rejects the evidence

This ensures all Shield block evidence is human-reviewed before it enters the permanent audit trail.

---

## Verification

- [x] `shieldInterceptor` modified to await AuditLog for block violations and capture the ID.
- [x] `ArtifactRecord` created with `artifact_type: 'incident_evidence'` on block events.
- [x] Full record state stored in `metadata.blocked_record_state`.
- [x] Linked to Shield AuditLog via `linked_entity_id`.
- [x] Fail-open: block response returned even if artifact write fails.
- [x] Notify path unchanged (fire-and-forget).
- [ ] End-to-end test with a non-admin pilot tenant user triggering a block (deferred — admin role bypasses Shield).

---

## Cross-References

- [ADR-0025: Universal Artifact Repository](./0025-universal-artifact-repository.md) — ArtifactRecord registry and review lifecycle.
- [ADR-0003: Shield Governance Interceptor](./0003-shield-governance-interceptor.md) — Shield policy-as-code enforcement engine.
- [ADR-0029: Autonomous Governance Thresholds for Agentic AI](./0029-autonomous-governance-thresholds-for-agentic-ai.md) — Shadow audit mode and agentic actor support.
- [ADR-0022: Enterprise Compliance Readiness](./0022-enterprise-compliance-readiness.md) — SOC 2 audit-bundle generation.

---

**Authored by:** Base44 (acting as Strategic Architect)
**Last Updated:** 2026-07-21