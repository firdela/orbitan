# ODR-0021: Orbit Nexus — Standalone Subscription Framework

**Date:** 2026-07-12
**Status:** Accepted
**Product Owner:** Muhammad Firdaus Bin Ismail
**Impacted Modules:** SubscriptionPolicy (entity), Stripe integration, OrbitanWallet, OrbitUsageTracker, nexus (backend function), marketing/landing page

---

## Decision

Establish **Orbit Nexus** as a standalone AI & Intelligence subscription product, marketed and subscribed separately from OrbitanOS. Customers can subscribe to Orbit Nexus even if they do not use OrbitanOS.

## Positioning

- **OrbitanOS** = Workforce Operating System (manages people, operations, finance, compliance)
- **Orbit Nexus** = AI & Intelligence Platform (thinks, connects, acts)

Customers see: **OrbitanOS by Orbitan — Powered by Orbit Nexus**

## Subscription Plans

### Orbit Nexus Free — S$0/month
- Basic AI Assistant
- Limited AI requests
- Basic AI Search
- Community support

### Orbit Nexus Pro — S$39/month
- AI Assistant
- AI Search
- AIReceipts
- Document AI
- Workflow AI
- Higher AI usage
- Standard support

### Orbit Nexus Team — S$149/month
- Everything in Pro
- Shared AI workspace
- AI Agents
- RAG Knowledge Base
- Team collaboration
- Advanced AI automations
- Priority support

### Orbit Nexus Enterprise — Custom Pricing
- Private AI deployment
- Unlimited AI usage (subject to fair use)
- MCP Server
- APIs & SDKs
- Connectors & Integration Hub
- Dedicated infrastructure
- Advanced security & governance
- Custom AI models
- SLA & enterprise support

## Future Add-ons (Independently Subscribable)

- AIReceipts+ (enhanced receipt processing)
- Additional AI Agents (beyond plan quota)
- Premium Connectors (beyond standard set)
- MCP Extensions
- API Usage (metered)
- Extra AI Credits (top-up packs)
- Industry AI Models (specialised models per industry)
- Custom Knowledge Bases (private RAG indexes)

## Architecture Principle

Orbit Nexus must remain an **independent subscription product** while seamlessly powering OrbitanOS, AquaOrbit, ChefOrbit, and future Orbit products through:
- APIs (via `base44.functions.invoke()`)
- MCP (Model Context Protocol — future)
- Connectors (Orbit Connect integration hub)
- Shared AI services (RAG, Agent Engine, AIReceipts)

## Relationship to OrbitanOS Plans

OrbitanOS plans (Free, Starter, Growth, Business, Enterprise) include varying levels of Orbit Nexus integration:
- **Orbitan Free:** No AI (Orbit Nexus not included)
- **Orbitan Starter:** No AI (Orbit Nexus not included; can be added as standalone subscription)
- **Orbitan Growth:** Standard AI features (Orbit Nexus Free tier embedded)
- **Orbitan Business:** AI Suite access (Orbit Nexus Pro tier embedded)
- **Orbitan Enterprise:** Full AI access (Orbit Nexus Team tier embedded; Enterprise available as upgrade)

Customers can upgrade their Orbit Nexus tier independently of their OrbitanOS plan.

## Implementation Notes

### Current State
- `SubscriptionPolicy` entity currently defines OrbitanOS plans only
- Stripe products are configured for OrbitanOS plans (Free, Starter, Growth, Business, Enterprise)
- `OrbitanWallet.balance_credits` and `credits_quota_monthly` meter AI usage per tenant
- `OrbitUsageTracker` records every AI request with credit consumption

### Required for Standalone Nexus Subscription
1. Create Stripe products for Orbit Nexus plans (Free, Pro, Team, Enterprise) — **requires Product Owner action in Stripe dashboard**
2. Add `SubscriptionPolicy` records for `nexus_free`, `nexus_pro`, `nexus_team`, `nexus_enterprise` plan keys
3. Add a `nexus_subscription_plan` field to `Tenant` entity (separate from OrbitanOS `subscription_plan`)
4. Update `nexus` backend function to check Nexus subscription tier before serving AI requests
5. Update landing page to market Orbit Nexus as a separate product with its own pricing section

### MVP Scope
For the MVP pilot, Orbit Nexus AI features are bundled within OrbitanOS plans (Growth+). Standalone Nexus subscription is a **post-MVP** capability. The architectural separation is documented now to ensure the foundation is ready.

## Trade-offs

| Aspect | Impact |
|--------|--------|
| **Revenue diversification** | **Positive** — Two independent revenue streams (OrbitanOS + Orbit Nexus) |
| **Customer clarity** | **Positive** — Customers understand what they're paying for (workforce OS vs. AI) |
| **Market positioning** | **Positive** — Orbit Nexus can compete in the AI platform market independently |
| **Implementation complexity** | **Neutral** — Dual subscription tracking adds complexity, but wallet + usage tracker already exist |
| **MVP scope** | **Neutral** — Standalone subscription is post-MVP; current bundling works for pilot validation |

## Future Review Date

**2026-09-01** — Evaluate whether to launch standalone Orbit Nexus subscription before OrbitanOS public launch, based on pilot tenant AI usage patterns and market demand signals.

---

**Related ADRs:** ADR-0006 (Orbit Nexus Intelligence Platform), ADR-0002 (Wallet-Native Ledger), ADR-0001 (Registry-Driven Architecture)