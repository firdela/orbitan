---
title: Orbitan Subscription Framework
category: Product
owner: Product Owner
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - BusinessModel.md
  - ProductStrategy.md
  - ../architecture/OrbitServices.md
  - ../knowledge/DecisionRecords.md
tags:
  - subscriptions
  - plans
  - stripe
  - billing
  - pricing
---

# Orbitan Subscription Framework

## Purpose

Defines all subscription plans for OrbitanOS and Orbit Nexus, including features, limits, billing rules, and upgrade/downgrade logic.

## OrbitanOS Plans

### OrbitanOS Free — S$0/month
- **Stripe Product ID:** `prod_UrMhNXFzVIrQFu`
- **Max Employees:** 3
- **Industry Packs:** None
- **AI:** No
- **Reporting:** Basic
- **Support:** Community
- **Target:** Home-based businesses, startups testing the platform

### OrbitanOS Starter — S$49/month
- **Stripe Product ID:** `prod_UqxyqWSPqzbmUU`
- **Max Employees:** 10
- **Industry Packs:** None
- **AI:** No
- **Reporting:** Basic
- **Support:** Community
- **Target:** Small single-outlet businesses

### OrbitanOS Growth — S$149/month
- **Stripe Product ID:** `prod_UqCTflVC5RIRyA`
- **Max Employees:** 50
- **Industry Packs:** 1 Pack
- **AI:** Basic (Orbit Nexus Free tier embedded)
- **Reporting:** Advanced
- **Support:** Standard
- **Target:** Growing SMEs, single-outlet operations

### OrbitanOS Business — S$399/month
- **Stripe Product ID:** `prod_UqCTbi0NRW3noE`
- **Max Employees:** 250
- **Industry Packs:** Multi-Pack
- **AI:** Full (Orbit Nexus Pro tier embedded)
- **Reporting:** Advanced
- **Support:** Standard
- **Target:** Multi-outlet, multi-brand organisations

### OrbitanOS Enterprise — From S$1,999/month (Custom)
- **Stripe Product ID:** `prod_UqzfnTh7fdnvTs` (S$1,999/month base)
- **Max Employees:** Unlimited
- **Industry Packs:** All Packs
- **AI:** Full AI Suite (Orbit Nexus Team tier embedded; Enterprise available as upgrade)
- **Reporting:** Advanced
- **Support:** Dedicated
- **Target:** Enterprise, regional/global operations

**Note:** Free and Starter do not go through Stripe Checkout (no payment). Enterprise is "Contact Sales." Only Growth and Business use Stripe Checkout.

## Orbit Nexus Plans (Standalone Subscription — Post-MVP)

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

## Orbit Nexus Relationship to OrbitanOS Plans

| OrbitanOS Plan | Orbit Nexus Tier Embedded |
|----------------|--------------------------|
| Free | None |
| Starter | None (can be added as standalone subscription) |
| Growth | Free tier |
| Business | Pro tier |
| Enterprise | Team tier (Enterprise available as upgrade) |

Customers can upgrade their Orbit Nexus tier independently of their OrbitanOS plan.

## Add-Ons (Future)

- AIReceipts+ (enhanced receipt processing)
- Additional AI Agents (beyond plan quota)
- Premium Connectors (beyond standard set)
- MCP Extensions
- API Usage (metered)
- Extra AI Credits (top-up packs)
- Industry AI Models (specialised models per industry)
- Custom Knowledge Bases (private RAG indexes)

## Billing Rules

- **Currency:** SGD (multi-currency ready via `Tenant.currency` field)
- **Billing cycle:** Monthly
- **Stripe integration:** Live mode, real payments
- **Transaction tracking:** `base44_app_id` in Stripe metadata
- **IFrame check:** Checkout blocked if running from iframe; user must use published app
- **Pilot mode:** `SystemSettings.billing_paused` — only pilot tenants bypass billing during pilot phase

## Upgrade Rules

- Tenants can upgrade plans at any time
- Stripe Checkout creates new subscription
- Proration handled by Stripe
- `OrbitanWallet.subscription_plan` updated on successful checkout
- `SubscriptionPolicy` controls module/pack entitlement after upgrade

## Downgrade Rules

- Tenants can downgrade plans
- Graceful Lockout: modules exceeding new plan are visible but greyed out
- Data is preserved — no deletion on downgrade
- `SubscriptionPolicy.allowed_modules` intersection governs visible modules

## Related Documents

- [BusinessModel.md](./BusinessModel.md) — Revenue model overview
- [ProductStrategy.md](./ProductStrategy.md) — Product positioning
- [../architecture/OrbitServices.md](../architecture/OrbitServices.md) — Orbit Wallet
- [../knowledge/DecisionRecords.md](../knowledge/DecisionRecords.md) — ADR-0013 (Stripe alignment)