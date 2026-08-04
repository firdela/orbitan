---
title: Orbitan Naming Conventions
category: Product
owner: Product Owner
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - BrandGuidelines.md
  - MasterVision.md
  - ../knowledge/DecisionRecords.md
tags:
  - naming
  - orbitan
  - orbit
  - orbit-core
  - orbit-nexus
  - orbit-shield
  - branding
---

# Orbitan Naming Conventions

## Purpose

Defines the permanent naming standard for the Orbitan ecosystem — the dual-prefix hierarchy, naming rules, reserved names, and future naming guidelines.

## Naming Standard

Adopt a **dual-prefix naming convention**:
- **"Orbitan"** is reserved for the company, master brand, and flagship Operating Systems (OrbitanOS, AquaOrbit, ChefOrbit).
- **"Orbit"** is reserved for shared platform services and capabilities (Orbit Core, Orbit Nexus, Orbit Shield, Orbit Connect, Orbit Wallet, Orbit Builder, Orbit Marketplace, Orbit Flow, Orbit Insight, Orbit ID, Orbit Notify, Orbit Rewards).

The customer-facing hierarchy reads:
> OrbitanOS by Orbitan — powered by Orbit Nexus, Orbit Shield, and Orbit Connect.

## Three-Tier Naming Hierarchy

| Tier | Prefix | Purpose | Examples |
|------|--------|---------|----------|
| **Company / Master Brand** | Orbitan | The organisation behind the ecosystem | "Orbitan" |
| **Operating Systems** | Orbitan/Orbit suffix | Flagship SaaS products | "OrbitanOS Starter" |
| **Shared Platform Services** | Orbit | The engines that power everything | Orbit Nexus, Orbit Shield, Orbit Wallet, Orbit Connect, Orbit Core, Orbit Builder, Orbit Rewards, Orbit Marketplace, Orbit Flow, Orbit Insight, Orbit ID, Orbit Notify |

## Full Platform Service Hierarchy

```
Orbitan (Company / Master Brand)
│
├── Orbit Core          — Foundational platform services (Auth, Tenancy, Identity, Audit, Config)
├── Orbit Nexus         — Intelligence Platform (AI, RAG, AIReceipts, Integration Hub)
├── Orbit Shield        — Security & Governance (Policy-as-Code, Override, Compliance)
├── Orbit Connect       — Integrations & Connectors (Xero, QuickBooks, Google, Slack, Shopify)
├── Orbit Builder       — Workspace & Configuration Builder (Manifest, Blueprint Studio)
├── Orbit Wallet        — Payments & Credits (Orbitan Credits, Cashback, Procurement Debit)
├── Orbit Rewards       — Loyalty & Incentives (Points, Tiers, Referrals)
├── Orbit Marketplace   — Apps & Extensions (Module marketplace — post-MVP)
├── Orbit Flow          — Automation Engine (Scheduled, entity-triggered, webhook automations)
├── Orbit Insight       — Analytics & Reporting (Dashboards, KPIs, Trends)
├── Orbit ID            — Identity & Access Management (RBAC, Invitations, Access Requests)
├── Orbit Notify        — Notifications & Communications (Announcements, Alerts)
│
├── OrbitanOS           — Workforce Operating System (flagship product)
├── AquaOrbit           — Aquarist Operating System (future)
├── ChefOrbit           — Kitchen Operating System (future)
└── Future Orbit Products
```

## Naming Rules

1. **"Orbitan"** is reserved for the company, master brand, and Operating Systems only.
2. **"Orbit"** prefix is reserved exclusively for shared platform services. It must never be used for tenant-facing features, modules, or industry packs.
3. **"OrbitanOS"** prefix is reserved for the flagship OS product and its subscription tiers only.
4. **Internal identifiers are immutable.** CSS tokens (`--orbitan-blue`), entity names (`OrbitanWallet`), and codebase keys (`orbitan_starter`) remain unchanged to prevent breaking changes. Only user-facing labels are updated.
5. **Stripe product names must match** `SUBSCRIPTION_PLANS[key].name` in `orbitan-config.js`. Any Stripe product rename requires a corresponding codebase update in the same session.
6. **New service additions** follow the pattern: `Orbit [ServiceName]` (e.g., future "Orbit Forms", "Orbit Scheduler").

## Reserved Names

| Name | Type | Status |
|------|------|--------|
| Orbitan | Company / Master Brand | Reserved — never used for services |
| OrbitanOS | Flagship Product | Reserved — never used for services |
| Orbit Core | Foundational Layer | Reserved — never used for product modules |
| Orbit Nexus | Intelligence Platform | Reserved — also a standalone subscription product |
| Orbit Shield | Security & Governance | Reserved |
| Orbit Connect | Integrations | Reserved |
| Orbit Wallet | Payments | Reserved |
| Orbit Builder | Configuration | Reserved |
| Orbit Marketplace | Extensions | Reserved |
| Orbit Flow | Automation | Reserved |
| Orbit Insight | Analytics | Reserved |
| Orbit ID | Identity | Reserved |
| Orbit Notify | Notifications | Reserved |
| Orbit Rewards | Loyalty | Reserved |
| AquaOrbit | Future OS | Reserved — Aquarist Operating System |
| ChefOrbit | Future OS | Reserved — Kitchen Operating System |

## Stripe Product Alignment

| Stripe Product | Product ID | Price | Codebase Key |
|---------------|-----------|-------|-------------|
| OrbitanOS Free | `prod_UrMhNXFzVIrQFu` | S$0/month | `orbitan_free` |
| OrbitanOS Starter | `prod_UqxyqWSPqzbmUU` | S$49/month | `orbitan_starter` |
| OrbitanOS Growth | `prod_UqCTflVC5RIRyA` | S$149/month | `orbitan_growth` |
| OrbitanOS Business | `prod_UqCTbi0NRW3noE` | S$399/month | `orbitan_business` |
| OrbitanOS Enterprise | `prod_UqzfnTh7fdnvTs` | S$1,999/month | `orbitan_enterprise` |

## Naming Philosophy

- **Orbitan** = The company and master brand. The organisation behind the ecosystem.
- **OrbitanOS** = The flagship SaaS platform. The Workforce Operating System.
- **Orbit** = Reserved for shared platform services. The engines that power the ecosystem.

This mirrors established ecosystems:
- Microsoft (Microsoft 365 + Defender, Entra, Intune)
- Google (Google Workspace + Gemini, Drive, Meet)
- Apple (Apple + iCloud, Wallet, Health)

## Future Naming

New services follow the pattern: `Orbit [ServiceName]`. Future Operating Systems follow the pattern: `[Industry]Orbit` or `Orbitan[Suffix]`.

## Related Documents

- [BrandGuidelines.md](./BrandGuidelines.md) — Visual brand standards
- [MasterVision.md](./MasterVision.md) — Ecosystem vision
- [../knowledge/DecisionRecords.md](../knowledge/DecisionRecords.md) — ADR-0008, ADR-0013, ADR-0014 (naming decisions)