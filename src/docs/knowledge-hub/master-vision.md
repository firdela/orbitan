# Orbitan Master Vision

> **Orbitan = Product · OrbitanOS = Platform · Pilot Tenants = Validation · Future Customers = Primary Market**

## Ecosystem Vision

The long-term vision is to build an ecosystem of specialised Operating Systems
powered by shared platform capabilities and intelligence.

```
Orbitan Company (Future)
│
├── OrbitanOS     — Workforce Operating System
├── Orbit Nexus   — Intelligence Platform (Brain)
├── AquaOrbit     — Aquarist Operating System
├── ChefOrbit     — Kitchen Operating System
└── Future Orbit Products
```

Each product operates independently while leveraging common platform services:
Authentication · Permissions · Notifications · Analytics · Marketplace · Billing ·
Security · Shared AI Services · APIs & Integrations.

## Product Distinction

| Layer | What it is | Who uses it |
|-------|-----------|-------------|
| **Orbitan** | Customer-facing product | Organisations managing workforce, ops, finance, compliance |
| **OrbitanOS** | Underlying Workforce OS | Platform architecture, multi-tenancy, AI, governance, integrations |
| **Pilot Tenants** | Validation environments | Taqueria, Renewed Resources, Renewed Fashion, Izaliqa Bakes |
| **Future Customers** | Primary market | Any organisation that discovers and subscribes to Orbitan |

## Standard Organisational Architecture

```
Industry
  → Tenant / Company
    → Brand
      → Outlet
        → Department
          → Team
            → Employee
```

This structure must work across: Free Plans · Paid Subscriptions · Industry Packs ·
Enterprise Deployments · White Label · Future Marketplace Integrations.

Every customer — from a single-person HBB to a multi-brand enterprise — operates
within the same OrbitanOS framework.

## Platform Service Architecture

The Orbitan ecosystem is powered by shared platform services, each with a concise "Orbit" prefix.
Orbitan is the master brand; Orbit services are the engines that power everything.

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
│
├── OrbitanOS           — Workforce Operating System (flagship product)
├── AquaOrbit           — Aquarist Operating System (future)
├── ChefOrbit           — Kitchen Operating System (future)
└── Future Orbit Products
```

**Customer-facing branding:**
> OrbitanOS by Orbitan
> Powered by: Orbit Core · Orbit Nexus · Orbit Shield · Orbit Connect · Orbit Builder

### Orbit Core (Foundational Layer)

Every Orbit product is built on Orbit Core. These entities are **immutable** — product modules
must never add fields to them. Product-specific data lives in side-car entities that reference
Core via `tenant_id`, `outlet_id`, `employee_id`.

**Core entities:** Tenant, Company, Client, Outlet, Employee, Invitation, AccessRequest,
AuditLog, GovernancePolicy, GovernanceOverride, ActivationRegistry, PlatformManifest,
SubscriptionPolicy, OrbitanWallet, WalletTransaction, IntegrationCredential, SystemSettings.

### Orbit Nexus (Intelligence Platform)

Three clear responsibilities:

1. **Think** — RAG, Agentic AI, AIReceipts, recommendations
2. **Connect** — APIs, Connectors, Integration Hub (Xero, QuickBooks, Google Workspace, Slack, Shopify, Stripe)
3. **Act** — MCP tools, workflows, automations

```
Orbit Nexus
├── Integration Hub (Xero, QuickBooks, Google, Slack, Shopify, Stripe, ...)
├── API Gateway
├── MCP Server
└── AI Engines (RAG, Agent Engine, AIReceipts, Analytics, Recommendations)
```

### Independent Deployability

All cross-module communication between OrbitanOS and Orbit Nexus uses the **Interface-First
Constraint**: communication is exclusively via `base44.functions.invoke()`. No direct imports
of Nexus code into OrbitanOS. This ensures each product can be independently built, deployed,
and exported as a standalone application.

## Public Onboarding Flow

```
Public Landing (/) → Auth Gateway (/auth/gateway)
  ├─ Login (existing employees)
  ├─ Join Organisation (invited users)
  ├─ Request Access (workplace discovery)
  └─ Create Organisation (new businesses)
        → Select Industry → Select Plan → Configure Org → Activate Packs/Modules
→ Customer Workspace (/workspace/:tenantId/*)
```

## Founder & Product Ownership

- **Founder & Product Owner:** Muhammad Firdaus Bin Ismail
- **Co-founder:** Hamka Ariffin (pilot tenant association)
- **Final corporate ownership:** TBD (Orbitan Pte Ltd / LLC / Fetch Innovation / new holding)
- OrbitanOS remains architecturally independent from any future corporate arrangement.

## Scalability Principle

> Before implementing any feature, ask: **Will this still work when Orbit serves
> thousands of organisations, millions of users, multiple industries, and operates
> across multiple countries?**

If the answer is no, redesign the solution.

## 6-R Principles

`Regulate · Refine · Respond · Renew · Relate · Reach`

Every piece of feedback, every architectural decision, and every product improvement
should contribute to making OrbitanOS a smarter, more valuable, and continuously
evolving Workforce Operating System.

---

**Last Updated:** 2026-07-08