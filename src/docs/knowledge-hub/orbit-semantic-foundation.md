# Orbit Semantic Foundation (OSF)

> **Status:** Architectural Baseline (v1.0) — Approved for MVP Foundation
> **Date:** 2026-07-21
> **Governance:** ADR-0047
> **Owner:** Product Architecture

---

## Purpose

The Orbit Semantic Foundation (OSF) is the canonical semantic contract of the Orbit ecosystem. It defines the stable language through which every Orbitan capability — Orbit Nexus intelligence, Orbit Shield governance, Orbit Flow automation, and all product modules — understands organisations.

The OSF describes **meaning, not implementation**. It is agnostic to storage technology (PostgreSQL, Neo4j, RDF, document stores, knowledge graphs, vector databases), API design, and UI layout. The semantic layer is designed to outlive every implementation choice.

---

## Architectural Position

The OSF is one of three approved architectural baselines for the Orbit Intelligence Fabric:

| Baseline | Scope | ADR |
|----------|-------|-----|
| **Behavioural & Trust Framework v1.0** | How Orbitan acts | — |
| **Cognitive Blueprint Draft Zero.2** | How Orbitan reasons | — |
| **Orbit Semantic Foundation v1.0** | How Orbitan understands organisations | ADR-0047 |

Together, these define Orbitan's enduring architectural contract: **Behaviour** (how to act), **Cognition** (how to reason), and **Semantics** (the language of organisations).

---

## The Three-Layer Separation

The OSF enforces a strict separation to prevent the Ontology Trap — the failure mode where every useful concept becomes a semantic primitive until the model becomes ungovernable.

### Layer A — Semantic Reality (The OSF)

Enduring truths about organisations. These relationships rarely change because they represent how organisations fundamentally work.

```
Employee RESPONSIBLE_FOR Task
Recipe CONSUMES Ingredient
Policy GOVERNS Workflow
Supplier PROVIDES Resource
Manager SUPERVISES Employee
```

**These are the OSF. They must remain stable for years.**

### Layer B — Knowledge

The platform's evolving understanding of reality. Knowledge evolves continuously as the platform learns.

```
Recommendation        — an AI-generated suggestion
Evidence              — an artifact substantiating a claim
Decision              — a choice made by an agent (human or AI)
Outcome               — the result of an action
Lesson                — a learning derived from an outcome
Confidence            — the certainty of a recommendation
Policy effectiveness  — how well a policy achieves its intent
```

**These are NOT semantic relationships. They belong in the Knowledge Layer.**

### Layer C — Intelligence

The reasoning engine. This consumes Semantic Reality + Knowledge + Context + Policies + the Behavioural Framework to generate recommendations.

**Key rule:** "Learning" is NOT a semantic relationship. It is an adaptive process that consumes the ontology. A `Lesson` does not `INFORM` a `Policy` as a semantic primitive — the evolution engine reads outcomes, derives lessons, and proposes policy revisions through a governed workflow. The ontology is not rewritten by learning.

---

## Semantic Relationship Layers

### Layer 1 — Universal Platform Relationships

Applicable to every organisation regardless of industry. The most stable artefact in the platform. Changes require an ADR.

| # | Key | Meaning | Inverse | Cardinality | Temporal | Lifecycle | AI Infer | Human Confirm |
|---|-----|---------|---------|-------------|----------|-----------|----------|---------------|
| 1 | `OWNED_BY` | Resource/asset control | `OWNS` | many_to_one | static | evolvable | No | Yes |
| 2 | `RESPONSIBLE_FOR` | Human/agent accountability | `ACCOUNTABLE_TO` | one_to_many | temporal | evolvable | No | Yes |
| 3 | `MEMBER_OF` | Organisational structure | `HAS_MEMBER` | many_to_many | temporal | evolvable | No | Yes |
| 4 | `DEPENDS_ON` | Workflow prerequisites | `REQUIRED_BY` | many_to_many | static | evolvable | Yes | No |
| 5 | `GOVERNS` | Policy enforcement | `GOVERNED_BY` | one_to_many | static | versioned | No | Yes |
| 6 | `PERMITTED_BY` | Access authorisation | `PERMITS` | many_to_many | temporal | evolvable | No | Yes |
| 7 | `EVIDENCE_FOR` | Auditability | `EVIDENCED_BY` | many_to_many | static | immutable | Yes | No |
| 8 | `SCHEDULED_FOR` | Temporal intent | `SCHEDULES` | many_to_one | temporal | evolvable | No | Yes |
| 9 | `CAUSES` | Causation (not correlation) | `CAUSED_BY` | many_to_many | static | immutable | Yes | No |
| 10 | `EXECUTED_BY` | Action provenance | `EXECUTES` | many_to_one | static | immutable | No | No |
| 11 | `DECIDED_BY` | Decision provenance | `DECIDED` | many_to_one | static | immutable | No | No |
| 12 | `YIELDS` | Outcome generation | `YIELDED_BY` | one_to_many | static | immutable | Yes | No |

### Layer 2 — Cross-Domain Operational Relationships (Milestone 3)

Reusable across many Industry Packs. Stable, but additions are more frequent than Layer 1.

```
CONSUMES · PRODUCES · TRANSFORMS · SCHEDULES · ALLOCATES · FULFILS ·
PROCURES · ASSIGNS · VERIFIES · RECONCILES · APPROVES · REVIEWS
```

### Layer 3 — Industry Pack Extensions (Post-MVP)

Relationships unique to an industry. Extend Layers 1–2 without modifying them.

```
Healthcare:    DIAGNOSES · PRESCRIBES · ADMINISTERS
F&B:           MARINATES · COOKS · PLATES
Manufacturing:  ASSEMBLES · CALIBRATES · INSPECTS
Education:      ENROLS · GRADES · CERTIFIES
```

---

## Relationship Contract Template

Every relationship in the OSF is a first-class architectural citizen with a full contract. The `SemanticRelationship` entity stores this contract as a registry record:

| Field | Description |
|-------|-------------|
| **`relationship_key`** | Unique identifier (e.g. `RESPONSIBLE_FOR`) |
| **`layer`** | universal / cross_domain / industry |
| **`description`** | The semantic meaning — what this represents in organisational reality |
| **`inverse_relationship_key`** | Enables bidirectional traversal without duplication |
| **`source_semantic_types`** | Semantic categories of the source (agent, organisational_unit, resource, policy, event, artifact, outcome) |
| **`target_semantic_types`** | Semantic categories of the target |
| **`cardinality`** | one_to_one / one_to_many / many_to_one / many_to_many |
| **`temporal_behaviour`** | static / temporal / ephemeral |
| **`governance_considerations`** | What governance the relationship carries |
| **`privacy_implications`** | Privacy-by-Design declaration |
| **`lifecycle_behaviour`** | immutable / evolvable / versioned |
| **`ai_may_infer`** | Whether AI may infer without human confirmation |
| **`human_must_confirm`** | Whether human approval is required to establish |

**Semantic types** (not entity names) are used for source/target to remain implementation-agnostic:
- `agent` — human or AI actor
- `organisational_unit` — tenant, company, outlet, department, team
- `resource` — physical or digital asset
- `policy` — governance rule
- `event` — action or occurrence
- `artifact` — document or evidence
- `outcome` — result or product

---

## Architectural Fitness Criteria

Before any relationship is accepted into the OSF, it must pass this checklist:

1. **Endurance:** Is this an enduring organisational truth, or an evolving understanding? (Enduring → OSF; evolving → Knowledge Layer)
2. **Universality:** Does this apply to every organisation? (Yes → Layer 1; reusable across many → Layer 2; industry-specific → Layer 3)
3. **Privacy:** Does the relationship carry PII? If yes, is it tenant-isolated?
4. **Governance:** What governance implications does it carry?
5. **AI Inference:** May AI infer this, or must a human confirm it?
6. **Recoverability:** Is the relationship immutable (audit trail) or evolvable?
7. **Provenance:** Does it maintain a clear source/evidence chain?

---

## Pilot Tenant Validation

Each Universal Layer relationship is validated against all four pilot tenants:

| Tenant | Key Relationships Validated |
|--------|------------------------------|
| **La Birria Tacos** | RESPONSIBLE_FOR (manager→shift), CONSUMES (recipe→ingredient), YIELDS (recipe→dish), SCHEDULED_FOR (staff→shift) |
| **Renewed Resources** | GOVERNS (policy→workflow), EVIDENCE_FOR (permit→compliance), SCHEDULED_FOR (collection→route), DEPENDS_ON (route→vehicle) |
| **Renewed Fashion** | DEPENDS_ON (product→inventory), OWNED_BY (outlet→stock), PERMITTED_BY (role→module), YIELDS (sale→revenue) |
| **Izaliqa Bakes** | MEMBER_OF (baker→team), EXECUTED_BY (order→baker), DECIDED_BY (pricing→owner), RESPONSIBLE_FOR (baker→order) |

**Future industry stress-test:** Healthcare, Retail, Logistics, Manufacturing, Construction, Education, Hospitality, Agriculture. The Universal Layer must scale horizontally without modification.

---

## Governance Rules for the Semantic Layer

1. **Universal Layer changes require an ADR.** These are the most stable artefacts in the platform — changes are architectural events, not routine edits.
2. **Layer 2 additions require ADR review** but are more frequent than Layer 1.
3. **Layer 3 extensions are governed by pack versioning** — they extend, never modify, Layers 1–2.
4. **The "enduring organisational truth" test:** Before proposing a new universal relationship, ask: "Will this still be true in 10 years regardless of technology, industry, or AI capability?" If the answer is uncertain, it belongs in the Knowledge Layer.
5. **Learning does not rewrite reality.** Lessons, outcomes, and confidence evolve in the Knowledge Layer. The OSF is not redefined by what the platform learns.

---

## MVP Scope

The MVP implements only what is required to support:
- **Explainability** — the OSF provides the vocabulary for "why" a recommendation exists
- **Provenance** — EXECUTED_BY, DECIDED_BY, EVIDENCE_FOR create the audit chain
- **Approval-gated workflows** — RESPONSIBLE_FOR, GOVERNS, PERMITTED_BY define who can act
- **Confidence communication** — the Knowledge Layer references OSF relationships
- **Human override** — ai_may_infer / human_must_confirm enforce human authority
- **Privacy boundaries** — privacy_implications on every relationship
- **Conservative autonomy** — AI may infer only DEPENDS_ON, EVIDENCE_FOR, CAUSES, YIELDS

Everything else — advanced agent autonomy, digital twins, self-evolving knowledge, cross-tenant intelligence — remains intentionally deferred until validated by real-world usage.

---

## Cross-References

- [ADR-0047: Orbit Semantic Foundation](./decision-records/0047-orbit-semantic-foundation.md) — the formal architectural decision
- [ADR-0001: Registry-Driven Architecture](./decision-records/0001-registry-driven-architecture.md) — the pattern this extends
- [ADR-0046: Capability-Tiered Orchestrator](./decision-records/0046-capability-tiered-orchestrator.md) — Nexus consumes the OSF
- [Master Vision](./master-vision.md) — the OSF is the semantic expression of the Master Vision
- [Golden UI/UX Standard](./golden-ui-ux-standard.md) — UI implementation of semantic outcomes (uncertainty visibility, provenance labels)

---

**Last Updated:** 2026-07-21