---
title: Orbitan Pilot Programme
category: Development
owner: Product Owner
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - MVPRoadmap.md
  - ../Product/NorthStar.md
  - ../Product/MasterVision.md
tags:
  - pilot
  - pilot-tenants
  - taqueria
  - renewed-resources
  - renewed-fashion
  - izaliqa-bakes
  - data-integrity
---

# Orbitan Pilot Programme

## Purpose

Contains all pilot tenants, their validation areas, data integrity requirements, and rules for using pilot data.

> Pilot tenants are validation environments, NOT the product's purpose.
> Future paying customers are the primary market.
> Never hardcode pilot tenant names, IDs, or industry logic into platform code.

## Taqueria Pte Ltd

- **Industry:** Food & Beverage
- **Brand:** La Birria Tacos
- **Website:** https://www.labirriatacos.com
- **Outlet:** La Birria Tacos, 730 North Bridge Road, Floor 1, Singapore 198698
- **Hierarchy:** Taqueria Pte Ltd → La Birria Tacos → North Bridge Road Outlet
- **Manifest:** `fnb_ops_v1`
- **Primary validation areas:** Inventory, Procurement, Sales & Invoicing, Daily Reconciliation, Xero Integration, Workforce Operations, Reporting, Outlet-level operations

## Renewed Resources Pte Ltd

- **Industry:** Recycling & Sustainability
- **Website:** https://renewedresources.sg
- **Purpose:** Recycling operations, sustainability workflows, material recovery management, compliance testing, workforce validation
- **Manifest:** `recycling_ops_v1`

## Renewed Fashion

- **Industry:** Retail
- **Status:** Planning & Development Stage
- **Purpose:** Reuse, repurpose, and redistribute clothing and materials recovered through sustainability initiatives
- **Current State:** Not yet incorporated. No confirmed brand/outlet structure.
- **Placeholder states:** "Pending Setup" / "Coming Soon" / "Future Expansion" / "Not Yet Configured"
- **Rule:** Do NOT create fictional brands, stores, outlets, or locations unless explicitly instructed.

## Izaliqa Bakes (Home-Based Business)

- **Industry:** Home-Based Business (business model, not industry)
- **Status:** Planning & Growth Stage
- **Description:** Home-based baking business operated by family members. Focuses on festive and seasonal baked goods (Hari Raya cookies, Christmas products, etc.).
- **Current State:** No confirmed tenant/company structure. No legal entity. No outlet. Operates from home.
- **Purpose:** Validate lightweight HBB workflows. Support order planning, inventory, production preparation, simple operations. Explore future transition to formal F&B.
- **Manifest:** `hbb_ops_v1` (transition-ready to `fnb_ops_v1` or `retail_ops_v1` when HBB scales to physical premises)
- **Rule:** Treat as a future planning entity until formally configured.

## Pilot Tenant Summary

| Tenant | Industry | Status | Validation Focus |
|--------|----------|--------|-----------------|
| Taqueria Pte Ltd (La Birria Tacos) | F&B | Active pilot | Inventory, Procurement, Sales, Reconciliation, Xero, Workforce |
| Renewed Resources Pte Ltd | Recycling & Sustainability | Active pilot | Recycling ops, Material recovery, Compliance |
| Renewed Fashion | Retail | Planning stage | Reuse/repurpose workflows |
| Izaliqa Bakes | HBB | Planning stage | Lightweight HBB workflows, seasonal orders |

## Data Integrity Requirements

Orbitan must prioritise genuine operational data.

Do NOT automatically create fictional:
- Companies, Brands, Outlets, Warehouses, Departments, Teams, Employees, Locations
- Operational Records, Transactions, Analytics, Reports

Unless explicitly requested for testing or approved by the Product Owner.

Where information is not yet confirmed, use status indicators:
- "Pending Setup"
- "Coming Soon"
- "Future Expansion"
- "Not Yet Configured"

This ensures that permissions, reporting, subscriptions, AI recommendations, workforce management, analytics, and operational workflows are built on real-world structures.

## Founder & Product Ownership

- **Founder & Product Owner:** Muhammad Firdaus Bin Ismail
- **Co-founder:** Hamka Ariffin (pilot tenant association)
- Pilot tenants are associated with the founders and are used to validate Orbitan's architecture, workflows, modules, subscription model, AI capabilities, operational design, industry pack structure, and real-world usability.
- They must not be treated as the entire purpose of Orbitan. Future customers are the primary target market.

## Related Documents

- [MVPRoadmap.md](./MVPRoadmap.md) — MVP sprint plan
- [../Product/NorthStar.md](../Product/NorthStar.md) — Mission and vision
- [../Product/MasterVision.md](../Product/MasterVision.md) — Ecosystem vision