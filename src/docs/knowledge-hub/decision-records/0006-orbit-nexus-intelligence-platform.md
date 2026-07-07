# ADR-0006: Orbit Nexus Intelligence Platform

**Date:** 2026-07-01
**Status:** Accepted
**Impacted Modules:** nexus (backend function), OrbitUsageTracker, nexusFeedbackAnalyst, nexusIntegrationHub strategy, all AI-powered features (AIReceipts, SOP Generator, Training Generator, Business Advisor)

## Context

OrbitanOS needed an intelligence layer to power:
1. AI services (AIReceipts OCR, SOP generation, training modules, business advisory)
2. AI usage metering (per-tenant credit consumption)
3. Feedback analysis (sentiment, priority, duplicate detection)
4. Future RAG (knowledge search across SOPs, policies, documents)
5. Future agentic AI (workflow agents for inventory, procurement, finance)
6. Integration routing (Hub-and-Spoke pattern for Xero, Stripe, etc.)

The vision is that Orbit Nexus will eventually be a standalone subscription product — not just an internal OrbitanOS service. This means it must be architecturally independent but deeply integrated.

## Alternatives Considered

1. **Embedded AI in OrbitanOS** (each module calls InvokeLLM directly)
   - Rejected: No central metering — can't track or debit credits per tenant
   - Rejected: No central routing — can't apply Shield governance to AI calls
   - Rejected: Can't be productised as a standalone platform later

2. **External microservice** (separate API for all AI calls)
   - Rejected: Over-engineered for MVP — adds deployment + network complexity
   - Rejected: Base44 backend functions already provide the right isolation level
   - Deferred: Future standalone Nexus product can wrap the existing function pattern

3. **Nexus Gateway pattern** (central routing function + usage tracker + wallet debit)
   - Selected: Single entry point for all intelligence requests
   - Selected: `OrbitUsageTracker` meters every request (credits, model, latency, status)
   - Selected: `OrbitanWallet` is debited for each request
   - Selected: Shield governance can be applied at the gateway level
   - Selected: Each Nexus service (nexusFeedbackAnalyst, sopGenerator, etc.) is a separate function but routed through the gateway

## Decision

Adopt the **Nexus Gateway Pattern** with three responsibilities:

### 1. Think (AI Engines)
- **RAG** (future): Knowledge search across SOPs, policies, documents
- **Agentic AI** (future): Workflow agents for inventory, procurement, finance
- **AIReceipts** (MVP): OCR extraction, auto-categorisation, supplier detection
- **SOP Generator** (MVP): AI-generated standard operating procedures
- **Training Generator** (MVP): AI-generated training modules
- **Business Advisor** (future): AI-powered operational recommendations
- **Feedback Analyst** (MVP): Sentiment, priority, duplicate detection on IssueLog

### 2. Connect (Integration Hub)
- **Hub-and-Spoke pattern** already implemented via `FinanceSyncQueue` (async broker) + `FinanceMapping` (sync state) + `AccountMapping` (Chart of Accounts) + `financeController` (payload builder)
- **No new `NexusIntegrationHub` entity was created** — that would duplicate existing infrastructure
- Finance events flow: OrbitanOS → `FinanceSyncQueue` (pending) → `financeController` (payload builder + Shield gate) → External API (Xero/Stripe)
- All entries are governance-gated via `shieldInterceptor` and logged to `AuditLog`

### 3. Act (Automation & Workflows)
- **Automations** (scheduled, entity-triggered, connector webhooks)
- **OrbitUsageTracker** meters every AI request
- **OrbitanWallet** is debited per request
- **Shield** evaluates governance policies before AI actions that involve writes

### Routing Flow
```
App page / Backend function
  → base44.functions.invoke('nexus', { service_key, ...params })
  → nexus gateway routes to the appropriate function (nexusFeedbackAnalyst, sopGenerator, etc.)
  → Service function executes (calls InvokeLLM, OCR, etc.)
  → OrbitUsageTracker.create() — records: tenant, service, model, credits, latency, status
  → OrbitanWallet debited (if credits consumed)
  → Returns result to caller
```

### Credit Metering
- Each AI service has a credit cost (defined in the nexus function or service config)
- `OrbitUsageTracker` records: `credits_consumed`, `model_used`, `latency_ms`, `status`, `shield_outcome`
- `OrbitanWallet.balance_credits` is debited
- If balance is insufficient → `status: insufficient_credits` → user prompted to top up

## Trade-offs

**Positive:**
- Central metering — every AI request is tracked and debited
- Future productisation — Nexus can be offered as a standalone subscription
- Shield governance applies at the gateway level
- Integration Hub uses existing `FinanceSyncQueue` infrastructure (no duplication)
- Each AI service is a separate function — independently deployable + testable

**Negative:**
- Extra network call through the gateway (mitigated: services can be called directly by backend functions using `base44.functions.invoke`)
- Credit system adds complexity to AI features (mitigated: `automatic` model is cheapest)
- Nexus is not yet a standalone product — it's deeply coupled to OrbitanOS SDK (planned decoupling post-MVP)

## Future Roadmap

1. **RAG Engine** — Index Knowledge Hub Markdown documents for retrieval
2. **Agent Engine** — Workflow agents with `tool_configs` for entity + function access
3. **Standalone Nexus** — Decouple from OrbitanOS SDK, offer as subscription product
4. **MCP Server** — Model Context Protocol for external AI tool integration
5. **Decision Records RAG** — "Why was X designed this way?" queries against this Knowledge Hub

## Future Review Date

**2026-09-01** — Evaluate whether to build the RAG engine for Knowledge Hub indexing. Assess credit pricing model for AI services (currently 1 credit per request, may need tiered pricing).

---

**Related ADRs:** ADR-0001 (Registry-Driven Architecture), ADR-0002 (Wallet-Native Ledger), ADR-0003 (Shield Governance Interceptor)