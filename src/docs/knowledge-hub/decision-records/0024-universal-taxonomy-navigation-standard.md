# ADR-0024: Universal Taxonomy Navigation Standard

**Date:** 2026-07-14
**Status:** Accepted
**Supersedes:** Industry-specific navigation labels (ADR-0005)
**Related:** ADR-0005 (Manifest-Driven Navigation), ADR-0004 (Dynamic Workspace Routing), ADR-0001 (Registry-Driven Architecture)

## Context

OrbitanOS initially used industry-specific navigation section labels in its `PlatformManifest` records:
- F&B: "Kitchen & Outlet", "Workforce", "Governance"
- Retail: "Store & Inventory", "Workforce", "Governance"
- Recycling: "Operations", "Workforce", "Governance"
- HBB: "My Business", "Operations", "Insights"
- Core: "Workspace", "Revenue Engine", "Team", "Reports"

This created three problems:

1. **Inconsistent UX:** Users moving between industries (or platform admins managing multiple tenants) encountered different navigation structures for the same functional modules.
2. **Module Key Mismatch:** Manifest child IDs used `tasks` (plural) while `SubscriptionPolicy.allowed_modules` used `task` (singular). This caused `allowedModules.includes(item.id)` to fail for future paying customers — modules would appear locked despite being entitled.
3. **Scaling Friction:** Adding a new industry required designing a unique navigation taxonomy from scratch instead of reusing a proven structure.

## Decision

Standardize ALL `PlatformManifest` navigation blueprints to a **Universal Taxonomy** with four fixed sections:

| Section | Modules |
|---|---|
| **Operations** | Dashboard, Inventory, Purchase Orders, Tasks |
| **Finance** | Sales & Invoicing, Expenses |
| **Staffing** | Workforce, Shift Schedule, Shift Trades, Access Requests |
| **Insights & Compliance** | Reports, Compliance, Sustainability |

### Industry Customization Layer

Industries may customize **labels** within modules (e.g., F&B uses "Stock Manager" while Recycling uses "Materials Inventory") but MUST NOT change the section structure or module keys.

### Module Key Canonicalization

All manifest child IDs MUST use the canonical module key (singular form):
- `task` (not `tasks`)
- `sales_invoice` (not `sales`)
- `finance_integration` (not `finance_xero`)

This ensures `SubscriptionPolicy.allowed_modules` intersection works correctly.

## HBB Migration-less Upgrade Path

The Home-Based Business (HBB) pack is designed as a **flexible seed** — when an HBB tenant grows to a physical storefront, simply swap their `Tenant.manifest_key` from `hbb_ops_v1` to `fnb_ops_v1` or `retail_ops_v1`. No data migration is required because:
- All underlying entities (`InventoryItem`, `SalesInvoice`, `Task`, etc.) are shared platform-wide
- The `tenant_id` and `outlet_id` scoping remains identical
- Only the navigation labels change (e.g., "Ingredients & Stock" → "Stock Manager")

## Consequences

- **Positive:** Consistent UX across industries, simplified onboarding for new industries, correct entitlement gating for paying customers.
- **Positive:** HBB-to-SME transition requires only a database field update — zero downtime, zero data migration.
- **Neutral:** Industry-specific labels are now a UI concern (manifest data) rather than a structural concern (code).