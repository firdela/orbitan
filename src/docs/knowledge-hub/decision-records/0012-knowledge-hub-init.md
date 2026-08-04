# ADR-0012: Knowledge Hub & Decision Records

**Date:** 2026-07-08
**Status:** Confirmed (Historical — migrated from `src/docs/decision-records/` on 2026-08-04; structure updated to reflect canonical location)
**Impacted Modules:** Documentation, Knowledge Hub, Orbit Nexus RAG
**Related ADRs:** ADR-0008 (Orbit Naming Standards), RA-0000 (Architecture Governance Framework)

> **Migration Note:** This ADR was originally created at `src/docs/decision-records/0012-knowledge-hub-init.md`.
> It has been migrated to the canonical Knowledge Hub decision-records directory as part of Build #28.2G.1
> repository consolidation. The original structure referenced `src/docs/decision-records/` as the canonical
> ADR location; this has since been consolidated into `src/docs/knowledge-hub/decision-records/` as the
> single source of truth. The structural diagram below has been updated to reflect the current canonical layout.

## Context

To maintain institutional memory and allow AI to "query the past" for architectural decisions, we are establishing a structured Knowledge Hub.

## Decision

- Initialize `src/docs/knowledge-hub/decision-records/` as the canonical location for immutable architectural decisions (ADRs and Reference Architectures).
- Initialize `src/docs/knowledge-hub/` as the single source of truth for design, security, vision standards, product strategy, architecture, development, research, and legal frameworks.

## Purpose

The Markdown files in these directories serve as the RAG (Retrieval-Augmented Generation) source for Orbit Nexus to provide context-aware development advice in future sessions.

## Structure

```
src/docs/
├── PROJECT_MEMORY.md           # Canonical project memory (merged)
└── knowledge-hub/              # Single source of truth
    ├── README.md               # Index and navigation
    ├── CHANGELOG.md            # Build changelog
    ├── master-vision.md        # Ecosystem vision
    ├── golden-ui-ux-standard.md
    ├── mvp-roadmap.md
    ├── foundations/            # Frozen Foundations v1.0
    ├── decision-records/        # ADRs + Reference Architectures (canonical)
    │   ├── RA-0000.md           # Architecture Governance Framework (FROZEN)
    │   ├── RA-0004.md           # Platform Services Architecture (FROZEN)
    │   ├── RA-0005.md           # Identity Architecture (FROZEN)
    │   ├── 0001-...-0008-...   # ADRs
    │   └── ...
    ├── product/                # Product strategy, branding, subscriptions
    ├── architecture/           # Technical architecture, security, data, API
    ├── design/                 # Design standards, accessibility
    ├── development/            # Engineering rules, testing, release
    ├── knowledge/              # Product intelligence, glossary, risk register
    ├── research/               # Competitor analysis
    ├── legal/                  # Legal frameworks (drafts)
    └── implementation-notes/   # Build package reports
```

## Future Path

These documents will be indexed by Orbit Nexus for AI-assisted architectural reasoning. The Knowledge Hub README serves as the canonical index, and the RAG ingestion will follow the directory structure above.