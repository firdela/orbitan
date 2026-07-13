---
title: Orbitan Product Strategy
category: Product
owner: Product Owner
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - NorthStar.md
  - MasterVision.md
  - CompetitorResearch.md
  - SubscriptionFramework.md
tags:
  - strategy
  - positioning
  - differentiation
  - competitive-advantage
---

# Orbitan Product Strategy

## Purpose

Defines product positioning, competitive advantage, value proposition, and strategic direction.

## Product Positioning

Orbitan is a **Workforce Operating System** — not just a tool, not just an app, but a complete operating system for running a business. It sits between generic SaaS tools (Monday, Odoo) and enterprise platforms (Workday, ServiceNow).

**OrbitanOS by Orbitan — Powered by Orbit Nexus**

## Competitive Advantage

1. **Registry-Driven Architecture** — Adding an industry = a database record, not a code change. Competitors hardcode industry logic.
2. **Wallet-Native Ledger** — Works for HBBs with no ERP and enterprises with Xero. No external dependency for core operations.
3. **Orbit Shield Governance** — Policy-as-code with override workflow. Enterprise-grade compliance from day one.
4. **Orbit Evolution** — Self-improving platform that continuously recommends improvements based on usage patterns.
5. **Business Access Intelligence** — Links identity, permissions, business workflows, and AI decisions into a single auditable trail.
6. **Independent Deployability** — Each Orbit product can be exported and deployed independently.

## Value Proposition

> One ecosystem. Two products. OrbitanOS runs your workforce and operations. Orbit Nexus powers it with AI. Subscribe to either — or both.

## Differentiation

| Dimension | Orbitan | Competitors |
|-----------|---------|-------------|
| Industry adaptation | Registry-driven (config, not code) | Hardcoded per industry |
| ERP dependency | None (wallet-native ledger) | Required for basic ops |
| AI | Optional, graceful degradation, kill switch | AI baked in, no opt-out |
| Governance | Policy-as-code, override workflow | Static role-based |
| Self-improvement | Orbit Evolution loop | Static analytics |
| Multi-product | Orbit Core shared across OS products | Single product |

## Platform Strategy

- **OrbitanOS** = Workforce OS (flagship)
- **Orbit Nexus** = AI & Intelligence Platform (standalone subscription)
- **Future products** (AquaOrbit, ChefOrbit) share Orbit Core
- All products communicate via `base44.functions.invoke()` (Interface-First Constraint)

## AI Strategy

- AI is an enhancement layer, not a dependency (ADR-0017)
- AI kill switch for instant global shutdown (ADR-0018)
- Human-in-control: high-impact AI actions require approval
- RAG indexes this Knowledge Hub for context-aware recommendations
- Agentic AI with trust levels and governance gates (post-MVP)

## Growth Strategy

1. **Phase 1 (MVP):** Pilot tenant validation — prove the architecture works
2. **Phase 2 (Public Launch):** Self-serve onboarding for external customers
3. **Phase 3 (Enterprise):** Compliance certification, enterprise sales, white-label

## Future Strategy

- Marketplace for third-party modules and industry packs
- MCP Server for external AI tool integration
- Cross-tenant pattern recognition (anonymised)
- Multi-currency, multi-region expansion

## Related Documents

- [NorthStar.md](./NorthStar.md) — Mission and vision
- [MasterVision.md](./MasterVision.md) — Ecosystem vision
- [CompetitorResearch.md](./CompetitorResearch.md) — Competitive analysis
- [SubscriptionFramework.md](./SubscriptionFramework.md) — Plan details