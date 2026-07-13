---
title: Orbit Services Registry
category: Architecture
owner: Product Architecture
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - PlatformArchitecture.md
  - OrbitCore.md
  - OrbitNexus.md
  - ../Product/NamingConventions.md
tags:
  - orbit-services
  - orbit-builder
  - orbit-shield
  - orbit-flow
  - orbit-wallet
  - orbit-marketplace
  - orbit-rewards
  - orbit-notify
  - orbit-connect
  - orbit-insight
  - orbit-id
---

# Orbit Services Registry

## Purpose

Defines each shared platform service in the Orbit ecosystem — its responsibility, scope, and relationship to other services.

## Service Overview

```
Orbitan (Company / Master Brand)
│
├── Orbit Core          — Foundational services (Auth, Tenancy, Identity, Audit, Config)
├── Orbit Nexus         — Intelligence Platform (AI, RAG, AIReceipts, Integration Hub)
├── Orbit Shield        — Security & Governance (Policy-as-Code, Override, Compliance)
├── Orbit Connect       — Integrations & Connectors (Xero, QuickBooks, Google, Slack, Shopify)
├── Orbit Builder       — Workspace & Configuration Builder (Manifest, Blueprint Studio)
├── Orbit Wallet        — Payments & Credits (Orbitan Credits, Cashback, Procurement Debit)
├── Orbit Rewards       — Loyalty & Incentives (Points, Tiers, Referrals)
├── Orbit Marketplace   — Apps & Extensions (post-MVP)
├── Orbit Flow          — Automation Engine (Scheduled, Entity, Webhook automations)
├── Orbit Insight       — Analytics & Reporting (Dashboards, KPIs, Trends)
├── Orbit ID            — Identity & Access Management (RBAC, Invitations, Access Requests)
├── Orbit Notify        — Notifications & Communications (Announcements, Alerts)
```

## Orbit Builder

**Responsibility:** Workspace and configuration builder.
- PlatformManifest management (navigation blueprints)
- Blueprint Studio (visual industry pack configuration)
- DashboardLayout (customizable widget layouts)
- ManifestHydrator (runtime navigation resolution)

## Orbit Shield

**Responsibility:** Security and governance.
- GovernancePolicy (policy-as-code registry)
- GovernanceOverride (override release valve with approval workflow)
- shieldInterceptor (backend function evaluating policies before sensitive writes)
- ShieldGuard.js (client-side guard)
- Two modes: Auditor (notify) / Guardian (block)
- Three protection domains: Financial Integrity, Access & Identity, Operational Trust

## Orbit Flow

**Responsibility:** Automation engine.
- Scheduled automations (cron/interval)
- Entity-triggered automations (create/update/delete)
- Connector webhook automations (Google Calendar, Slack, etc.)
- `base44.functions.invoke()` pattern for cross-module automation

## Orbit Wallet

**Responsibility:** Payments and credits.
- OrbitanWallet (per-tenant wallet: credits, points, cashback, reward tier)
- WalletTransaction (immutable transaction ledger)
- walletEngine (backend function: procurement debits, threshold checks, audit logging)
- Orbitan Credits (AI calls, premium modules, marketplace)
- Cashback (redeemable against subscription invoices)

## Orbit Marketplace

**Responsibility:** Apps and extensions (post-MVP).
- MarketplaceModule entity
- Third-party modules and industry packs
- Revenue split model (platform commission)
- Per-tenant Stripe Connect (marketplace revenue splitting)

## Orbit Rewards

**Responsibility:** Loyalty and incentives.
- Loyalty points (Orbitan Rewards)
- Reward tiers: bronze, silver, gold, platinum, orbitan_elite
- Referrals, training completions, renewals
- Lifetime points earned/redeemed tracking

## Orbit Notify

**Responsibility:** Notifications and communications.
- Announcement entity (broadcasts to tenants/outlets)
- Operational alerts (inventory, compliance, task assignments)
- In-app notifications
- Future: push, email, SMS channels

## Orbit Connect

**Responsibility:** Integrations and connectors.
- IntegrationCredential (per-tenant OAuth credential vault)
- FinanceSyncQueue (async broker for ERP integration)
- FinanceMapping (sync state tracking)
- AccountMapping (Chart of Accounts mapping)
- financeController (payload builder + Shield gate)
- Connectors: Xero, QuickBooks, Google Workspace, Slack, Shopify, Stripe

## Orbit Insight

**Responsibility:** Analytics and reporting.
- Dashboards and KPIs
- Financial and operational reporting
- Trends and forecasting
- Orbit Evolution integration (usage pattern analysis)

## Orbit ID

**Responsibility:** Identity and access management.
- Human identities (RBAC + RLS)
- Machine identities (API keys, connectors, webhooks, MCP servers)
- AI agent identities (Orbit Nexus agents with permission policies, trust levels, approval gates)
- ModuleAccessPolicy (per-tenant, per-role, per-module access matrix)
- Invitation (governed onboarding pipeline)
- AccessRequest (worker access request registry)
- Business Access Intelligence (linking identity to business decisions)

## Related Documents

- [PlatformArchitecture.md](./PlatformArchitecture.md) — Platform architecture
- [OrbitCore.md](./OrbitCore.md) — Foundational layer
- [OrbitNexus.md](./OrbitNexus.md) — Intelligence platform
- [../Product/NamingConventions.md](../Product/NamingConventions.md) — Naming standard