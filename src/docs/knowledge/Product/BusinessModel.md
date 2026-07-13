---
title: Orbitan Business Model
category: Product
owner: Product Owner
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - SubscriptionFramework.md
  - ProductStrategy.md
  - ../Architecture/OrbitServices.md
tags:
  - revenue
  - subscriptions
  - marketplace
  - wallet
  - pricing
---

# Orbitan Business Model

## Purpose

Defines the revenue streams, pricing philosophy, and commercial architecture for the Orbitan ecosystem.

## Revenue Streams

### 1. OrbitanOS Subscriptions
Primary SaaS revenue. Per-tenant monthly subscription based on plan tier (Free, Starter, Growth, Business, Enterprise).

### 2. Orbit Nexus Subscriptions
Standalone AI & Intelligence platform subscription. Customers can subscribe without OrbitanOS. Plans: Free, Pro, Team, Enterprise.

### 3. Marketplace (Post-MVP)
Third-party apps, modules, and industry packs. Revenue split model (platform commission).

### 4. Orbitan Credits
Metered AI usage credits. Tenants purchase top-up packs when their monthly quota is exhausted. Used for AI calls, premium modules, and marketplace purchases.

### 5. Enterprise Licensing
Custom pricing for Enterprise tier. Dedicated infrastructure, white-label deployments, SLA, custom AI models.

## Pricing Philosophy

- **SGD default** — Singapore-first, multi-currency ready
- **Per-tenant, not per-user** — Simplifies billing and scales with organisation size
- **Free tier exists** — Removes friction for HBBs and startups to onboard
- **Graceful Lockout** — Locked modules are visible but greyed out (upsell opportunity, not hidden)
- **AI is additive** — OrbitanOS works without AI; AI is an enhancement layer

## Subscription Plans

See [SubscriptionFramework.md](./SubscriptionFramework.md) for complete plan details.

## Future Opportunities

- White-label deployments
- Per-tenant Stripe Connect (marketplace revenue splitting)
- Industry AI models (specialised models per industry)
- Custom Knowledge Bases (private RAG indexes)
- API metered usage
- MCP Extensions

## Related Documents

- [SubscriptionFramework.md](./SubscriptionFramework.md) — Complete plan details
- [ProductStrategy.md](./ProductStrategy.md) — Product positioning
- [../Architecture/OrbitServices.md](../Architecture/OrbitServices.md) — Orbit Wallet and Rewards