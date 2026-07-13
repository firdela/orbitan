---
title: Orbit Knowledge Library
category: Root
owner: Product Architecture
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - 00-index.md
tags:
  - knowledge-hub
  - RAG
  - orbit-nexus
  - institutional-memory
---

# Orbit Knowledge Library

## Purpose

The single source of truth for the Orbit ecosystem. This knowledge library powers Orbit Nexus RAG retrieval, human decision-making, and institutional memory across all Orbit products.

## Objectives

- **Single Source of Truth** — Architecture, product, engineering, and governance decisions live here, not in tribal knowledge or scattered chat messages.
- **Product Documentation** — Vision, strategy, roadmap, subscriptions, branding, and competitive positioning.
- **Engineering Documentation** — Architecture patterns, data models, API contracts, security standards, and development rules.
- **Architecture** — Platform layers, service boundaries, Orbit Core, Orbit Nexus, and data architecture.
- **AI Knowledge** — AI principles, governance, kill switch patterns, and Orbit Evolution.
- **Founder Decisions** — Decision Records (ADRs/ODRs) documenting every significant architectural choice with rationale.
- **Product Intelligence** — Pilot feedback, improvement logs, lessons learned, and risk register.

## Libraries

| Library | Purpose |
|---------|---------|
| [Product/](./Product/) | Vision, strategy, roadmap, subscriptions, branding, naming, go-to-market |
| [Architecture/](./Architecture/) | Platform architecture, Orbit Core, Orbit Nexus, data, security, AI principles |
| [Design/](./Design/) | Golden UI/UX standard, accessibility, responsive, design principles |
| [Development/](./Development/) | Development rules, testing, release process, mobile strategy, MVP roadmap, pilot programme |
| [Knowledge/](./Knowledge/) | Decision records, product intelligence, improvement log, lessons, risk register, glossary |
| [Research/](./Research/) | Competitor analysis (ServiceNow, Workday, WorkOS, Rippling, Odoo, Monday, Shopify, Apple, Google, Microsoft) |
| [Legal/](./Legal/) | Privacy policy, terms, data processing, security policy, incident response, compliance checklist |

## How Orbit Nexus Uses This Library

Orbit Nexus indexes all `.md` files in this library for RAG (Retrieval-Augmented Generation):

1. **RAG Indexing** — Every document is chunked, embedded, and indexed for semantic search.
2. **Decision Making** — "Why was X designed this way?" queries retrieve relevant Decision Records.
3. **Product Intelligence** — Pilot feedback and usage patterns are cross-referenced with architecture decisions.
4. **Recommendations** — AI-generated improvement proposals reference historical context from this library.
5. **Consistency Enforcement** — New features are checked against existing standards before implementation.

## Standard Header

Every document in this library carries a YAML metadata block:

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

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-07-13 | Initial Knowledge Hub refactoring. Migrated all existing documentation from `src/docs/knowledge-hub/` and `src/docs/` into structured libraries. Added YAML metadata headers. Created master index. |

## Related Documents

- [00-index.md](./00-index.md) — Master navigation index