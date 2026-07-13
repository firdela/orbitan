---
title: Orbitan North Star
category: Product
owner: Product Owner
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - MasterVision.md
  - ProductStrategy.md
  - ProductRoadmap.md
tags:
  - vision
  - mission
  - north-star
  - philosophy
---

# Orbitan North Star

## Purpose

Defines the fundamental mission, vision, and guiding philosophy for the Orbitan ecosystem.

## Mission

Build a commercial, scalable, multi-tenant SaaS Workforce Operating System that empowers any organisation — from a single-person home-based business to a multi-brand global enterprise — to manage their workforce, operations, finance, compliance, and growth through a single, intelligent platform.

## Vision

To build an ecosystem of specialised Operating Systems powered by shared platform capabilities and intelligence, where every product is intuitive, reliable, inclusive, trustworthy, and thoughtfully designed.

## North Star

> **Orbitan = Product · OrbitanOS = Platform · Pilot Tenants = Validation · Future Customers = Primary Market**

Every architectural, operational, commercial, and product decision must reinforce this distinction.

## Motto

> **Run Your Business. Connect Everything.**

## Philosophy

- **Build less. Validate more.** — MVP discipline over feature bloat.
- **Configuration over code.** — Adding an industry = a database record, not a deployment.
- **Will this still work when Orbit serves thousands of organisations, millions of records, multiple industries, multiple countries, and future marketplace ecosystems?** If the answer is no, redesign the solution.
- **Tenants consume Orbitan. Tenants do not define Orbitan.** — The platform vision, governance, and strategic direction remain under Product Owner authority.
- **No fictional data.** — Never create fake companies, brands, outlets, or employees. Use "Pending Setup" / "Coming Soon" / "Not Yet Configured" placeholders.

## Target Market

| Segment | Description |
|---------|-------------|
| Home-Based Businesses | Single-person operations, seasonal businesses, pre-incorporation |
| Startups & SMEs | Growing organisations with 1–50 employees |
| Multi-Outlet Businesses | Organisations with multiple physical locations |
| Multi-Brand Organisations | Holding companies managing multiple brands |
| Enterprise Organisations | Large-scale operations, regional/global, 250+ employees |

## Supported Industries

Food & Beverage · Retail · Recycling & Sustainability · Education · Logistics · Construction · Healthcare · Manufacturing · Facilities Management · Events & Activations · Professional Services · Technology · Future Industries

## Long-Term Goals

1. Any future customer can discover Orbitan, create an account, select a plan, configure their organisation, activate relevant Industry Packs and Modules, and operate their business through OrbitanOS.
2. Orbit Nexus is marketed and subscribed separately from OrbitanOS.
3. The ecosystem expands to include AquaOrbit, ChefOrbit, and future specialised Operating Systems.
4. Enterprise compliance certifications (SOC 2, ISO 27001) are achieved.

## Platform Strategy

Orbitan must always be treated as a platform business, not a tenant-specific internal tool. The current pilot tenants (Taqueria, Renewed Resources, Renewed Fashion, Izaliqa Bakes) are validation environments, not the final limitation of the platform.

## Success Metrics

- Pilot tenants genuinely running parts of their daily operations through OrbitanOS
- Real-world feedback collected and actioned
- Architecture validated for multi-tenant, multi-industry scalability
- Revenue from external paying customers (post-MVP)
- Enterprise compliance readiness achieved

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

This structure must work across: Free Plans · Paid Subscriptions · Industry Packs · Enterprise Deployments · White Label Deployments · Future Marketplace Integrations. Every customer — from a single-person HBB to a multi-brand enterprise — operates within the same OrbitanOS framework.

## Related Documents

- [MasterVision.md](./MasterVision.md) — Ecosystem vision and product distinction
- [ProductStrategy.md](./ProductStrategy.md) — Product positioning and competitive advantage
- [ProductRoadmap.md](./ProductRoadmap.md) — Phased delivery plan