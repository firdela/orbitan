# Pilot Tenant Registry

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

## Data Integrity Requirements

Do NOT automatically create fictional:
- Companies, Brands, Outlets, Warehouses, Departments, Teams, Employees, Locations
- Operational Records, Transactions, Analytics, Reports

Unless explicitly requested for testing or approved by the Product Owner.

Where information is not yet confirmed, use status indicators:
- "Pending Setup"
- "Coming Soon"
- "Future Expansion"
- "Not Yet Configured"

---

**Last Updated:** 2026-07-07