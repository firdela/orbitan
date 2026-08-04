---
title: Orbitan Knowledge Hub
category: Knowledge
owner: Product Architecture
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - ../README.md
  - ../README.md
  - ../architecture/OrbitNexus.md
  - DecisionRecords.md
tags:
  - knowledge-hub
  - AI-memory
  - markdown
  - RAG
  - AI-search
  - institutional-memory
---

# Orbitan Knowledge Hub

## Purpose

Defines the structure, purpose, and AI integration of the Orbit Knowledge Hub — the single source of truth for the Orbit ecosystem.

## Knowledge Hub

The Knowledge Hub (this `/knowledge/` directory) is the single source of truth for the Orbit ecosystem. It stores architecture decisions, master vision, product principles, roadmap, industry packs, modules, standards, and improvement logs in AI-friendly Markdown format.

## AI Memory

Orbit Nexus uses this Knowledge Hub as its RAG (Retrieval-Augmented Generation) knowledge base. Every `.md` file is:
1. Parsed for YAML metadata (title, category, owner, status, version, tags, related)
2. Chunked into semantic sections
3. Embedded for vector search
4. Indexed for retrieval

This enables Orbit Nexus to:
- Answer architecture questions ("Why was X designed this way?")
- Explain historical design decisions
- Recommend improvements based on historical context
- Maintain consistency across OrbitanOS and future Orbit products
- Learn from product documentation, pilot feedback, and engineering standards

## Markdown

All documents are written in AI-friendly Markdown:
- Plain headings (H1, H2, H3)
- Bullet lists and numbered lists
- Code blocks with language tags
- Tables for structured data
- Relative links between documents
- No HTML (except in code examples)

## RAG (Retrieval-Augmented Generation)

When the RAG engine is operational:
1. Index all `.md` files in this Knowledge Hub
2. Enable natural language queries: "Why was AIReceipts designed this way?"
3. Cross-link related decisions
4. Recommend improvements based on historical context
5. Provide context-aware development advice

## AI Search

The Knowledge Hub enables AI-powered search across all documentation:
- Semantic search (not just keyword matching)
- Cross-document linking
- Context-aware ranking
- Metadata-filtered retrieval (by category, tags, status)

## Standard Header

Every document carries a YAML metadata block for RAG indexing:

```yaml
---
title: Document Title
category: Product | Architecture | Design | Development | Knowledge | Research | Legal
owner: Responsible team or role
status: Active | Draft | Deprecated
version: 1.0
last_updated: YYYY-MM-DD
related:
  - RelatedDocument.md
tags:
  - relevant
  - tags
---
```

## Contribution Rules

1. **Preserve existing content** — Never delete information. Move or restructure only.
2. **Create a Decision Record** for every significant architectural, product, or security decision.
3. **Cross-reference** related documents using relative Markdown links.
4. **Update `last_updated`** on every edit.
5. **Keep Markdown AI-friendly** — Plain headings, bullet lists, code blocks. No HTML.
6. **Version history** — Increment `version` on material content changes.

## Continuous Improvement

The Knowledge Hub must become a living system. Whenever significant architecture, UI, AI, security, business, or product decisions are made:
- Update the appropriate document.
- Create or update a Decision Record.
- Cross-reference related documentation.
- Preserve version history where possible.

## Related Documents

- [../README.md](../README.md) — Orbit Knowledge Library overview
- [../README.md](../README.md) — Master index
- [../architecture/OrbitNexus.md](../architecture/OrbitNexus.md) — Intelligence platform
- [DecisionRecords.md](./DecisionRecords.md) — Decision records index