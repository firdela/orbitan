# ODR-0014: Orbit Naming Architecture — "Orbitan" vs "Orbit" Prefix

**Date:** 2026-07-10
**Status:** Accepted
**Product Owner:** Muhammad Firdaus Bin Ismail
**Impacted Modules:** All — branding, UI copy, documentation, marketing, entity naming, future products

---

## Decision

Adopt a dual-prefix naming convention:
- **"Orbitan"** is reserved for the company, master brand, and flagship Operating Systems (OrbitanOS, AquaOrbit, ChefOrbit).
- **"Orbit"** is reserved for shared platform services and capabilities (Orbit Core, Orbit Nexus, Orbit Shield, Orbit Connect, Orbit Wallet, Orbit Builder, Orbit Marketplace, Orbit Flow, Orbit Insight, Orbit ID, Orbit Notify, Orbit Rewards).

The customer-facing hierarchy reads:
> OrbitanOS by Orbitan — powered by Orbit Nexus, Orbit Shield, and Orbit Connect.

## Context

As the ecosystem grows beyond OrbitanOS into future products (AquaOrbit, ChefOrbit), a naming system is needed that:
1. Avoids repetitive use of "Orbitan" which loses impact when overused.
2. Clearly separates the **company/brand** from **platform services**.
3. Mirrors the naming discipline of established ecosystems (Microsoft, Google, Apple).

## Alternatives Considered

### Option A: "Orbitan" prefix for everything
- Orbitan Shield, Orbitan Wallet, Orbitan Connect, Orbitan Nexus...
- **Rejected:** Repetitive. "OrbitanOS by Orbitan uses Orbitan Shield, Orbitan Connect..." — the word loses impact.

### Option B: No prefix — generic service names
- Shield, Wallet, Connect, Nexus...
- **Rejected:** Too generic. Lacks brand association. Cannot be trademarked or distinguished in a crowded market.

### Option C: Dual-prefix — "Orbitan" for brand, "Orbit" for services (CHOSEN)
- OrbitanOS by Orbitan, powered by Orbit Nexus, Orbit Shield, Orbit Connect.
- **Accepted:** Clean, scalable, professional. Mirrors Microsoft (Microsoft 365 / Copilot / Defender / Entra) and Apple (Apple / iCloud / Wallet / Health).

## Trade-offs

| Aspect | Impact |
|--------|--------|
| Brand clarity | **Positive** — customers understand OrbitanOS is the product, Orbit services are the engines |
| Marketing | **Positive** — concise, memorable, avoids repetition |
| Naming exhaustion | **Positive** — ample room for future services without cluttering the brand |
| Migration cost | **Neutral** — existing references to "Orbitan Wallet" etc. need renaming, but manageable |
| Trademarking | **Positive** — "Orbit" + service name is more distinctive than generic terms |

## Naming Standard

| Layer | Prefix | Examples |
|-------|--------|----------|
| Company | Orbitan | Orbitan (parent company) |
| Operating Systems | Orbitan + suffix | OrbitanOS, AquaOrbit, ChefOrbit |
| Shared Services | Orbit + name | Orbit Nexus, Orbit Shield, Orbit Connect |
| Foundation | Orbit Core | Auth, Tenants, Audit, Config |

## Architecture Hierarchy

```
Orbitan (Company)
│
├── Orbit Core          — Foundation: Auth, Tenants, RLS, Audit, Config
├── Orbit Nexus          — Intelligence: AI Gateway, RAG, Agents, AIReceipts, MCP
├── Orbit Shield         — Security: Governance, Compliance, Access Control
├── Orbit Connect        — Integrations: Xero, Stripe, Slack, Shopify, Google
├── Orbit Builder        — Configuration: Workspace, Manifests, Blueprints
├── Orbit Wallet         — Payments: Credits, Points, Cashback, Transactions
├── Orbit Rewards         — Loyalty: Referrals, Training Incentives, Renewals
├── Orbit Marketplace     — Extensions: Apps, Modules, Industry Packs
├── Orbit Flow            — Automation: Workflows, Triggers, MCP Tools
├── Orbit Insight         — Analytics: Reports, Dashboards, KPIs
├── Orbit ID              — Identity: SSO, MFA, Role Management
├── Orbit Notify          — Communications: Push, Email, In-App
│
├── OrbitanOS             — Workforce Operating System (flagship)
├── AquaOrbit             — Aquarist Operating System (future)
├── ChefOrbit             — Kitchen Operating System (future)
└── Future Orbit Products
```

## Future Review Date
- **2027-07-10** — Review after OrbitanOS public launch and first external customer acquisition to validate naming resonance with paying customers.