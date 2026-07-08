# ADR-0008: Orbit Naming Standards

**Date:** 2026-07-08
**Status:** Accepted
**Impacted Modules:** All branding, navigation, documentation, future product names, marketing pages

## Context

The Orbitan ecosystem is expanding beyond a single product. With OrbitanOS, Orbit Nexus, AquaOrbit, ChefOrbit, and future products planned, a naming convention must be established NOW to avoid confusion, brand dilution, and costly renaming later.

The core question: Should all services share the "Orbitan" prefix (e.g. Orbitan Shield, Orbitan Wallet, Orbitan Connect), or should there be a distinction between the master brand and platform service names?

## Alternatives Considered

1. **"Orbitan" prefix for everything** (Orbitan Shield, Orbitan Wallet, Orbitan Connect, Orbitan Builder)
   - Rejected: Repetitive. "OrbitanOS by Orbitan uses Orbitan Shield, Orbitan Builder, Orbitan Connect..." — the word "Orbitan" loses impact through overuse.
   - Rejected: Established ecosystems (Microsoft, Google, Apple) do NOT prefix every service with the company name. Microsoft has Defender, Entra, Intune — not "Microsoft Defender 365 Copilot..." as the primary identity.

2. **No prefix** (Shield, Wallet, Connect, Builder)
   - Rejected: Too generic. Loses brand association. "Shield" alone is untrademarkable and indistinguishable from competitors.

3. **"Orbit" prefix for shared platform services** (Orbit Shield, Orbit Wallet, Orbit Connect)
   - Selected: Clean, concise, brand-adjacent without repetition.
   - Selected: Mirrors the pattern used by Microsoft (Microsoft 365 + Defender, Entra, Intune), Google (Google Workspace + Gemini, Drive, Meet), Apple (Apple + iCloud, Wallet, Health).
   - Selected: Scales to dozens of future services without clutter.

## Decision

Adopt a **Layered Naming Hierarchy**:

| Layer | Prefix | Examples |
|-------|--------|----------|
| Company / Master Brand | **Orbitan** | Orbitan (the company), Orbitan Pte Ltd |
| Operating Systems | **Orbitan/Orbit suffix** | OrbitanOS, AquaOrbit, ChefOrbit |
| Shared Platform Services | **Orbit [Service]** | Orbit Nexus, Orbit Shield, Orbit Connect, Orbit Wallet, Orbit Rewards, Orbit Builder, Orbit Marketplace, Orbit Flow, Orbit Insight, Orbit ID, Orbit Notify |
| Foundational Layer | **Orbit Core** | Authentication, Permissions, Tenant Management, Org Structure, Audit Logs, Configuration |

### Full Platform Service Hierarchy

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
├── Orbit Flow           — Automation Engine (Scheduled, entity-triggered, webhook automations)
├── Orbit Insight       — Analytics & Reporting (Dashboards, KPIs, Trends)
├── Orbit ID            — Identity & Access Management (RBAC, Invitations, Access Requests)
├── Orbit Notify        — Notifications & Communications (Announcements, Alerts)
│
├── OrbitanOS           — Workforce Operating System (flagship product)
├── AquaOrbit           — Aquarist Operating System (future)
├── ChefOrbit           — Kitchen Operating System (future)
└── Future Orbit Products
```

### Customer-Facing Branding

```
OrbitanOS by Orbitan
Powered by:
  Orbit Core · Orbit Nexus · Orbit Shield · Orbit Connect · Orbit Builder
```

### Naming Philosophy

- **Orbitan** = The company and master brand. The organisation behind the ecosystem.
- **OrbitanOS** = The flagship SaaS platform. The Workforce Operating System.
- **Orbit** = Reserved for shared platform services. The engines that power the ecosystem.

## Trade-offs

**Positive:**
- Scalable — room for dozens of future "Orbit [Service]" names without clutter
- Professional — mirrors established tech ecosystems (Microsoft, Google, Apple)
- Brand-protective — "Orbitan" retains impact by not being overused
- Clear hierarchy — immediately clear what is a product vs. a platform service

**Negative:**
- Slight learning curve for new team members — mitigated by this ADR
- "Orbit" is a common word — trademark considerations for specific service names

## Future Review Date

**2027-01-01** — Evaluate whether any service names need adjustment based on market reception, trademark status, and product expansion.

---

**Related ADRs:** ADR-0009 (Orbit Core Boundary), ADR-0010 (Independent Deployability), ADR-0006 (Orbit Nexus Intelligence Platform)