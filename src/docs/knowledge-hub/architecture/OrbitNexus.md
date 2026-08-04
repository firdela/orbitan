---
title: Orbit Nexus
category: Architecture
owner: Product Architecture
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - PlatformArchitecture.md
  - OrbitServices.md
  - AIPrinciples.md
  - OrbitEvolution.md
  - ../product/MasterVision.md
  - ../product/SubscriptionFramework.md
  - ../knowledge/DecisionRecords.md
tags:
  - orbit-nexus
  - AI
  - RAG
  - AIReceipts
  - agentic-ai
  - MCP
  - integration-hub
---

# Orbit Nexus

## Purpose

Defines the architecture, responsibilities, and capabilities of Orbit Nexus — the Intelligence Platform that powers the Orbit ecosystem.

## Vision

Orbit Nexus is the AI & Intelligence Platform for the Orbit ecosystem. It is marketed and subscribed separately from OrbitanOS. Customers can subscribe to Orbit Nexus even if they do not use OrbitanOS.

**Positioning:** OrbitanOS by Orbitan — Powered by Orbit Nexus

## Three Responsibilities

### 1. Think (AI Engines)
- **RAG** (future): Knowledge search across SOPs, policies, documents, and this Knowledge Hub
- **Agentic AI** (future): Workflow agents for inventory, procurement, finance with trust levels and governance gates
- **AIReceipts** (MVP): OCR extraction, auto-categorisation, supplier detection
- **SOP Generator** (MVP): AI-generated standard operating procedures
- **Training Generator** (MVP): AI-generated training modules
- **Business Advisor** (future): AI-powered operational recommendations
- **Feedback Analyst** (MVP): Sentiment, priority, duplicate detection on IssueLog

### 2. Connect (Integration Hub)
- **Hub-and-Spoke pattern** via `FinanceSyncQueue` (async broker) + `FinanceMapping` (sync state) + `AccountMapping` (Chart of Accounts) + `financeController` (payload builder)
- Connectors: Xero, QuickBooks, Google Workspace, Slack, Shopify, Stripe
- All entries are governance-gated via `shieldInterceptor` and logged to `AuditLog`
- Per-tenant OAuth credentials stored in `IntegrationCredential` entity

### 3. Act (Automation & Workflows)
- **Automations** (scheduled, entity-triggered, connector webhooks)
- `OrbitUsageTracker` meters every AI request
- `OrbitanWallet` is debited per request
- Shield evaluates governance policies before AI actions that involve writes

## AI Gateway Pattern

```
App page / Backend function
  → base44.functions.invoke('nexus', { service_key, ...params })
  → nexus gateway routes to the appropriate function (nexusFeedbackAnalyst, sopGenerator, etc.)
  → Service function executes (calls InvokeLLM, OCR, etc.)
  → OrbitUsageTracker.create() — records: tenant, service, model, credits, latency, status
  → OrbitanWallet debited (if credits consumed)
  → Returns result to caller
```

### Kill Switch Evaluation Order
```
1. Authenticate user
2. CHECK KILL SWITCH → if disabled, return { ai_disabled: true } immediately
3. Shield governance gate
4. Wallet/credit check
5. Route to service function
6. Track usage + debit
```

## RAG (Retrieval-Augmented Generation)

When the RAG engine is operational, it will:
1. Index all `.md` files in this Knowledge Hub
2. Enable queries like "Why was AIReceipts designed this way?"
3. Cross-link related decisions
4. Recommend improvements based on historical context

## Knowledge Hub Integration

This Knowledge Hub is the RAG source for Orbit Nexus. Every document is chunked, embedded, and indexed for semantic search. Orbit Nexus uses this library to:
- Answer architecture questions
- Explain historical design decisions
- Recommend improvements
- Maintain consistency across OrbitanOS and future Orbit products

## Agent Engine (Future)

- Workflow agents with `tool_configs` for entity + function access
- Trust levels: `low` (approval for all writes), `medium` (autonomous within budget gates), `high` (enterprise only)
- Governance gates: actions that cannot be taken without human approval
- Binding: `ActivationRegistry.ai_governance` defines which agents are enabled per industry pack

## Graceful Degradation

OrbitanOS modules are AI-optional by design. If Orbit Nexus is down, disabled, or unsubscribed, every core module continues to function:
- `useNexusAI` hook returns `{ ai_available: false }` instead of throwing
- AI features are additive, not blocking
- No page shows a loading spinner indefinitely because AI failed

## Credit Metering

- Each AI service has a credit cost
- `OrbitUsageTracker` records: `credits_consumed`, `model_used`, `latency_ms`, `status`, `shield_outcome`
- `OrbitanWallet.balance_credits` is debited
- If balance insufficient → `status: insufficient_credits` → user prompted to top up

## Standalone Subscription

| Plan | Price | Key Features |
|------|-------|--------------|
| Free | S$0/mo | Basic AI Assistant, limited requests, AI Search |
| Pro | S$39/mo | AIReceipts, Document AI, Workflow AI, higher usage |
| Team | S$149/mo | AI Agents, RAG Knowledge Base, team collaboration, automations |
| Enterprise | Custom | Private deployment, MCP Server, APIs/SDKs, dedicated infra |

## Future Roadmap

1. **RAG Engine** — Index Knowledge Hub Markdown documents for retrieval
2. **Agent Engine** — Workflow agents with `tool_configs` for entity + function access
3. **Standalone Nexus** — Decouple from OrbitanOS SDK, offer as subscription product
4. **MCP Server** — Model Context Protocol for external AI tool integration
5. **Decision Records RAG** — "Why was X designed this way?" queries against this Knowledge Hub

## Related Documents

- [PlatformArchitecture.md](./PlatformArchitecture.md) — Platform architecture
- [OrbitServices.md](./OrbitServices.md) — Platform service registry
- [AIPrinciples.md](./AIPrinciples.md) — Responsible AI principles
- [OrbitEvolution.md](./OrbitEvolution.md) — Continuous improvement loop
- [../product/MasterVision.md](../product/MasterVision.md) — Ecosystem vision
- [../product/SubscriptionFramework.md](../product/SubscriptionFramework.md) — Orbit Nexus plans
- [../knowledge/DecisionRecords.md](../knowledge/DecisionRecords.md) — ADR-0006, ADR-0017, ADR-0018, ADR-0021