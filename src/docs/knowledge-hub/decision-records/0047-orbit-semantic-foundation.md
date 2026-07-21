# ADR-0047: Orbit Semantic Foundation (OSF)

**Date:** 2026-07-21
**Status:** Accepted
**Principle:** Regulate (Semantic Governance) + Relate (Organisational Meaning) + Reach (Platform Independence)
**Supersedes:** —
**Related:** ADR-0001 (Registry-Driven Architecture), ADR-0009 (Orbit Core Boundary), ADR-0029 (Autonomous Governance Thresholds), ADR-0046 (Capability-Tiered Orchestrator), Behavioural & Trust Framework v1.0, Cognitive Blueprint Draft Zero.2

---

## Context

The Orbit Intelligence Fabric (OIF) has progressed through three architectural layers: the **Behavioural & Trust Framework** (how Orbitan acts), the **Cognitive Blueprint** (how Orbitan reasons), and now requires the **semantic layer** — the stable language through which Orbitan understands organisations.

Prior to this ADR, Orbitan's entity model (Tenant, Employee, Shift, InventoryItem, PurchaseOrder, etc.) described data structures but not the *semantic relationships* between them. A manager supervises an employee, a recipe consumes ingredients, a policy governs a workflow, a supplier provides inventory — these are enduring organisational truths that transcend any implementation. Without a formal semantic model, the intelligence layer has no canonical vocabulary to reason over.

The risk of not addressing this is the **Ontology Trap**: every useful concept becomes a node, relationship, or edge until the model becomes ungovernable. Enterprise knowledge graph projects repeatedly fail this way. The semantic layer must describe *meaning*, not *implementation* — it must survive every storage technology change (PostgreSQL, Neo4j, RDF, document stores, knowledge graphs, vector databases).

---

## Decision

Adopt the **Orbit Semantic Foundation (OSF)** — a three-layer canonical semantic contract that defines the relationships through which every Orbitan capability understands organisations. The OSF is codified as a registry entity (`SemanticRelationship`) and governed by the principle that **relationships describe meaning, not implementation**.

### 1. Three-Layer Semantic Model

| Layer | Name | Scope | Stability | Change Requires |
|-------|------|-------|-----------|-----------------|
| **1** | Universal Platform Relationships | Every organisation regardless of industry | Most stable artefact in the platform | ADR + platform admin |
| **2** | Cross-Domain Operational Relationships | Reusable across many Industry Packs | Stable | ADR for additions |
| **3** | Industry Pack Extensions | Unique to a specific industry | Evolves with the pack | Pack versioning |

Layer 1 relationships are the semantic atoms — they rarely change because they represent enduring organisational truths. Layer 2 extends with operational verbs (consumes, produces, transforms, schedules). Layer 3 adds industry-specific semantics (marinates, diagnoses, enrols) without modifying Layers 1 or 2.

### 2. Separation of Reality, Knowledge, and Intelligence

The OSF enforces a strict three-layer separation to prevent the Ontology Trap:

- **Layer A — Semantic Reality:** Enduring truths about organisations (Employee RESPONSIBLE_FOR Task). Rarely changes. This is the OSF.
- **Layer B — Knowledge:** The platform's evolving understanding of reality (Recommendation, Evidence, Decision, Outcome, Lesson, Confidence). Evolves continuously. Lives in the Knowledge Layer, not the OSF.
- **Layer C — Intelligence:** The reasoning engine that consumes Semantic Reality + Knowledge + Context + Policies + Behavioural Framework to generate recommendations. Evolves independently.

**Key rule:** "Learning" is NOT a semantic relationship. It is an adaptive process that consumes the ontology. Lessons, outcomes, and confidence belong in the Knowledge Layer — they do not redefine Semantic Reality.

### 3. The SemanticRelationship Registry Entity

A new entity (`base44/entities/SemanticRelationship.jsonc`) becomes the single source of truth for relationship definitions. Each record is a first-class architectural citizen with a full contract:

- **`relationship_key`** — unique identifier (e.g. `RESPONSIBLE_FOR`)
- **`layer`** — universal / cross_domain / industry
- **`description`** — the semantic meaning (not implementation)
- **`inverse_relationship_key`** — bidirectional traversal without duplication
- **`source_semantic_types` / `target_semantic_types`** — semantic categories (agent, organisational_unit, resource, policy, event, artifact, outcome), NOT entity names
- **`cardinality`** — semantic constraint (one_to_one, one_to_many, etc.)
- **`temporal_behaviour`** — static / temporal / ephemeral
- **`governance_considerations`** — what governance the relationship carries
- **`privacy_implications`** — Privacy-by-Design at the semantic layer
- **`lifecycle_behaviour`** — immutable / evolvable / versioned
- **`ai_may_infer`** — whether AI may infer without human confirmation
- **`human_must_confirm`** — whether human approval is required to establish

The registry defines WHAT relationships mean, not HOW they are stored or traversed. It is implementation-agnostic.

### 4. Layer 1 — Universal Platform Relationships (MVP Scope)

Twelve relationships form the Universal Layer, seeded as `is_system_default: true`, `tenant_id: 'system'`:

| # | Key | Meaning | Inverse | AI Infer | Human Confirm |
|---|-----|---------|---------|----------|---------------|
| 1 | `OWNED_BY` | Resource/asset control | `OWNS` | No | Yes |
| 2 | `RESPONSIBLE_FOR` | Human/agent accountability | `ACCOUNTABLE_TO` | No | Yes |
| 3 | `MEMBER_OF` | Organisational structure | `HAS_MEMBER` | No | Yes |
| 4 | `DEPENDS_ON` | Workflow prerequisites | `REQUIRED_BY` | Yes | No |
| 5 | `GOVERNS` | Policy enforcement | `GOVERNED_BY` | No | Yes |
| 6 | `PERMITTED_BY` | Access authorisation | `PERMITS` | No | Yes |
| 7 | `EVIDENCE_FOR` | Auditability | `EVIDENCED_BY` | Yes | No |
| 8 | `SCHEDULED_FOR` | Temporal intent | `SCHEDULES` | No | Yes |
| 9 | `CAUSES` | Causation (not correlation) | `CAUSED_BY` | Yes | No |
| 10 | `EXECUTED_BY` | Action provenance | `EXECUTES` | No | No |
| 11 | `DECIDED_BY` | Decision provenance | `DECIDED` | No | No |
| 12 | `YIELDS` | Outcome generation | `YIELDED_BY` | Yes | No |

---

## Alternatives Considered

### Alternative A: Embed learning as a first-class semantic relationship
- **Proposal:** `LESSON INFORMS POLICY` as a universal relationship.
- **Rejected:** "Learning" is not an organisational relationship — it is an adaptive process. Embedding it risks making the ontology unstable as AI capabilities evolve. Learning belongs in the Knowledge Layer (Layer B), not Semantic Reality (Layer A). The OSF must remain as stable as possible for many years.

### Alternative B: Use entity names instead of semantic types for source/target
- **Proposal:** `source_entity_types: ['Employee', 'Agent']` instead of `source_semantic_types: ['agent']`.
- **Rejected:** This couples the semantic layer to the current database structure. If `Employee` is renamed or split, the semantic contract breaks. Semantic types (agent, resource, policy, event) are implementation-agnostic and survive entity refactoring.

### Alternative C: Full knowledge graph (Neo4j-style) with edges stored in a graph DB
- **Proposal:** Store actual relationship instances as graph edges with traversal queries.
- **Rejected:** Premature for the MVP. The OSF defines *what relationships mean*, not *how instances are stored*. Relationship instances can be inferred at runtime from existing entity fields (tenant_id, outlet_id, created_by_id) without a separate graph store. A graph DB may be adopted in the future as an implementation choice — the OSF is agnostic to it.

### Alternative D: Define relationships in code (constant map) rather than a registry entity
- **Proposal:** A `SEMANTIC_REGISTRY` constant in a shared module.
- **Rejected:** Violates ADR-0001 (Registry-Driven Architecture). No tenant overrides. No admin UI. No runtime editability. Code coupling for every semantic change. Inconsistent with the established Orbitan pattern.

---

## Trade-offs

### Positive
- **Stability:** Universal Layer relationships endure for years — they represent organisational truths, not implementation choices.
- **Platform Independence:** The OSF is pure semantics — portable to any storage technology (ADR-0036/ADR-0038).
- **Governance:** `ai_may_infer` and `human_must_confirm` enforce the Behavioural Framework's human-authority principle at the schema level.
- **Privacy-by-Design:** `privacy_implications` is a required field — every relationship declares its privacy posture.
- **Auditability:** Immutable relationships (EVIDENCE_FOR, EXECUTED_BY, DECIDED_BY, CAUSES) create a tamper-evident provenance chain.
- **Extensibility:** Layer 3 industry packs extend without modifying Layers 1–2 — no semantic collision between industries.
- **RAG-Ready:** The canonical OSF document is a first-class Knowledge Hub artefact for Orbit Nexus retrieval.

### Negative
- **Runtime Lookup:** The intelligence layer reads the registry to resolve relationship contracts. Mitigated by caching — universal relationships change rarely (ADR-level changes only).
- **Discipline Required:** The team must resist adding every useful concept as a universal relationship. The test: "Is this an enduring organisational relationship?" If no → Knowledge Layer, not OSF.
- **Not a Graph Store:** The OSF does not store relationship *instances* — those are inferred at runtime from entity data. This is intentional (implementation-agnostic) but means graph-style queries require a resolution layer (deferred to Milestone 3).

---

## Architectural Fitness Criteria

Every future relationship proposed for the OSF must pass this checklist before acceptance:

1. **Endurance:** Is this an enduring organisational truth, or an evolving understanding? (Enduring → OSF; evolving → Knowledge Layer)
2. **Universality:** Does this apply to every organisation regardless of industry? (Yes → Layer 1; reusable across many → Layer 2; industry-specific → Layer 3)
3. **Privacy:** Does the relationship carry PII? If yes, is it tenant-isolated?
4. **Governance:** What governance implications does it carry?
5. **AI Inference:** May AI infer this, or must a human confirm it?
6. **Recoverability:** Is the relationship immutable (audit trail) or evolvable?
7. **Provenance:** Does it maintain a clear source/evidence chain?

---

## Implementation Path

| Phase | Action | Risk | Rollback |
|-------|--------|------|---------|
| **1** | Create `SemanticRelationship` entity. | None — additive. | Delete entity. |
| **2** | Seed 12 Universal Layer relationships (`is_system_default: true`, `tenant_id: 'system'`). | None — additive. | Delete seeded records. |
| **3** | Publish this ADR + OSF canonical document + update `DecisionRecords.md` index. | None. | — |
| **4** | (Milestone 2) Core Entity Model — map existing entities to semantic types. | Medium — schema review. | Revert mappings. |
| **5** | (Milestone 3) Foundational Relationship Families — Layer 2 cross-domain relationships. | None — additive. | Delete records. |
| **6** | (Post-MVP) Layer 3 industry pack extensions per pilot tenant validation. | — | — |

---

## Pilot Tenant Validation (Required Before Freezing Universal Layer)

Each Universal Layer relationship must be validated against all four pilot tenants:

| Tenant | Validation Focus |
|--------|-----------------|
| **La Birria Tacos** | RESPONSIBLE_FOR (manager→shift), CONSUMES (recipe→ingredient), YIELDS (recipe→dish) |
| **Renewed Resources** | GOVERNS (policy→workflow), EVIDENCE_FOR (permit→compliance), SCHEDULED_FOR (collection→route) |
| **Renewed Fashion** | DEPENDS_ON (product→inventory), OWNED_BY (outlet→stock), PERMITTED_BY (role→module) |
| **Izaliqa Bakes** | MEMBER_OF (baker→team), EXECUTED_BY (order→baker), DECIDED_BY (pricing→owner) |

Stress-test against future industries: Healthcare, Retail, Logistics, Manufacturing, Construction, Education, Hospitality, Agriculture. The Universal Layer must scale horizontally without modification.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Ontology bloat — every concept becomes a relationship. | The "enduring organisational truth" test + ADR requirement for Universal Layer changes. Knowledge Layer absorbs evolving concepts. |
| Semantic types drift from entity reality. | Milestone 2 (Core Entity Model) explicitly maps every entity to a semantic type. Mismatches surface as ADRs. |
| AI infers relationships that should be human-confirmed. | `ai_may_infer: false` + `human_must_confirm: true` on accountability/ownership/governance relationships. Behavioural Framework enforces. |
| Registry lookup latency in intelligence hot path. | Universal relationships cached (stale-while-revalidate, 24h TTL — they change only via ADR). |
| Layer 3 extensions collide across industries. | `pack_key` field namespaces Layer 3 relationships. Cross-pack collisions are resolved by pack scope. |

---

## Cross-References

- [ADR-0001: Registry-Driven Architecture](./0001-registry-driven-architecture.md) — the foundational pattern this extends.
- [ADR-0009: Orbit Core Boundary](./0009-orbit-core-boundary.md) — Core entities are stable; the OSF is the semantic layer above them.
- [ADR-0029: Autonomous Governance Thresholds](./0029-autonomous-governance-thresholds-for-agentic-ai.md) — `ai_may_infer` / `human_must_confirm` enforce agentic governance at the semantic level.
- [ADR-0046: Capability-Tiered Orchestrator](./0046-capability-tiered-orchestrator.md) — the Nexus gateway consumes the OSF to understand capability semantics.
- [Behavioural & Trust Framework v1.0](../orbit-semantic-foundation.md) — the OSF is the semantic expression of the Behavioural Framework's human-authority principle.
- [Cognitive Blueprint Draft Zero.2] — the 9-stage cognitive lifecycle reasons over OSF relationships.
- [Orbit Semantic Foundation (Canonical Document)](../orbit-semantic-foundation.md) — the full specification.

---

**Product Owner:** Muhammad Firdaus Bin Ismail
**Authored by:** Base44 (acting as Strategic Architect)
**Last Updated:** 2026-07-21