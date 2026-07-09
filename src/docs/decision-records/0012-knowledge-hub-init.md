# Decision Record 0012: Knowledge Hub & Decision Records

## Status
Confirmed

## Context
To maintain institutional memory and allow AI to "query the past" for architectural decisions, we are establishing a structured Knowledge Hub.

## Decision
- Initialize `src/docs/decision-records/` for immutable architectural decisions.
- Initialize `src/docs/knowledge-hub/` as the single source of truth for design, security, and vision standards.

## Purpose
The Markdown files in these directories serve as the RAG (Retrieval-Augmented Generation) source for Orbit Nexus to provide context-aware development advice in future sessions.

## Structure
```
src/docs/
├── decision-records/     # Architecture Decision Records (ADRs)
│   ├── 0001-registry-driven-architecture.md
│   ├── 0002-wallet-native-ledger.md
│   ├── ...
│   └── 0012-knowledge-hub-init.md
└── knowledge-hub/        # Single source of truth
    ├── master-vision.md
    ├── golden-ui-ux-standard.md
    ├── mvp-roadmap.md
    ├── pilot-tenants.md
    └── ...
```

## Future Path
These documents will be indexed by Orbit Nexus for AI-assisted architectural reasoning.