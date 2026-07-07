# Orbit Nexus — Knowledge Hub

> **The single source of truth for the Orbit ecosystem.**
> This directory is the "brain" behind Orbitan's evolution.

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
├── decision-records/            ← Architecture Decision Records (ADRs)
│   ├── 0001-registry-driven-architecture.md
│   ├── 0002-wallet-native-ledger.md
│   ├── 0003-shield-governance-interceptor.md
│   ├── 0004-dynamic-workspace-routing.md
│   ├── 0005-manifest-driven-navigation.md
│   └── 0006-orbit-nexus-intelligence-platform.md
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
**Last Updated:** 2026-07-07