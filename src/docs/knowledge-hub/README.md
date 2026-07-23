# Orbit Nexus — Knowledge Hub

> **The single source of truth for the Orbit ecosystem.**
> This directory is the "brain" behind Orbitan's evolution.

---

## 🧊 Frozen Foundations v1.0 — 2026-07-23

The three foundational Reference Architectures are **FROZEN**. Build Mode is **ON**.
Git baseline tag: `v1.0-foundation-freeze`.

| Pillar | ID | Status | Document |
| :--- | :--- | :--- | :--- |
| Architecture Governance | RA-0000 | Frozen | [RA-0000.md](./decision-records/RA-0000.md) |
| Platform Services | RA-0004 | Frozen | [RA-0004.md](./decision-records/RA-0004.md) |
| Identity Architecture | RA-0005 | Frozen | [RA-0005.md](./decision-records/RA-0005.md) |

**Foundation documents:**
- [Orbitan Frozen Foundations v1.0](./foundations/Orbitan-Frozen-Foundations-v1.md)
- [Orbitan MVP Charter](./foundations/MVP-Charter.md)
- [Orbitan Build Manifest v1.0](./foundations/Build-Manifest.md)

> **Build Mode rules:** No silent redesign. Implementation-first. AFR compliance per
> merge. Docs updated alongside code. New architecture requires governed ADRs.
> Discussion Mode returns only for foundational changes.

---

## Purpose

The Knowledge Hub stores architecture decisions, master vision, product principles,
roadmap, industry packs, modules, standards, and improvement logs in AI-friendly
Markdown format. Future Orbit Nexus RAG ingestion will index these documents so
AI conversations can retrieve historical context, explain design decisions, and
recommend improvements.

## Directory Structure

```
knowledge-hub/
├── README.md                    ← you are here (index)
├── master-vision.md             ← ecosystem vision, product distinction, org architecture
├── golden-ui-ux-standard.md    ← non-negotiable design & accessibility standards
├── mvp-roadmap.md               ← sprint plan, scope, build philosophy
├── pilot-tenants.md             ← pilot tenant registry (validation only, not the product)
├── foundations/                 ← 🧊 Frozen Foundations v1.0
│   ├── Orbitan-Frozen-Foundations-v1.md
│   ├── MVP-Charter.md
│   └── Build-Manifest.md
├── decision-records/            ← Architecture Decision Records (ADRs) + Reference Architectures
│   ├── RA-0000.md               ← Architecture Governance Framework (FROZEN)
│   ├── RA-0004.md               ← Platform Services Architecture (FROZEN)
│   ├── RA-0005.md               ← Identity Architecture (FROZEN)
│   ├── 0001-registry-driven-architecture.md
│   ├── 0002-wallet-native-ledger.md
│   ├── 0003-shield-governance-interceptor.md
│   ├── 0004-dynamic-workspace-routing.md
│   ├── 0005-manifest-driven-navigation.md
│   ├── 0006-orbit-nexus-intelligence-platform.md
│   ├── 0007-delegated-integration-hub.md
│   ├── 0008-orbit-naming-standards.md
│   ├── 0009-orbit-core-boundary.md
│   ├── 0010-independent-deployability.md
│   └── ... (0011–0034 in directory)
│   ├── 0035-github-two-way-code-sync.md
│   ├── 0036-github-first-platform-independence-strategy.md
│   ├── 0037-registry-driven-onboarding-blueprint-preview.md
│   ├── 0038-github-first-platform-independence-engineering-standards.md
│   ├── 0039-customer-communications-governance-policy.md
│   ├── 0040-registry-driven-dashboard-drill-down.md
│   ├── 0041-shield-forensic-artifact-linkage.md
│   ├── 0042-public-access-security-ip-protection.md
│   ├── 0043-pilot-shield-governance-seeding.md
│   └── 0044-platform-intelligence-self-optimization.md
```

## How to Use

1. **Before making changes:** Read the relevant ADR to understand *why* something
   was built a certain way. Do not contradict decisions recorded here unless the
   Product Owner explicitly asks for a revision.

2. **When making a significant decision:** Create a new ADR using the template
   at the bottom of this file. Number it sequentially (0007, 0008, ...).

3. **When discovering improvements:** Add to the relevant document or create a
   new one. Cross-link related documents.

## ADR Template

```markdown
# ADR-XXXX: [Decision Title]

**Date:** YYYY-MM-DD
**Status:** Accepted | Superseded | Deprecated
**Impacted Modules:** [list]

## Context
[Why is this decision needed? What problem does it solve?]

## Alternatives Considered
[What other approaches were evaluated? Why were they rejected?]

## Decision
[What was chosen and why.]

## Trade-offs
[What are the consequences — positive and negative?]

## Future Review Date
[When should this decision be revisited?]
```

## AI Memory Protocol

When Orbit Nexus RAG is operational, it will:
1. Index all `.md` files in this directory
2. Enable queries like "Why was AIReceipts designed this way?"
3. Cross-link related decisions
4. Recommend improvements based on historical context

Until then, these documents serve as human-readable institutional memory.

---

**Product Owner:** Muhammad Firdaus Bin Ismail
**Last Updated:** 2026-07-23 (Frozen Foundations v1.0 — Build Mode ON)