# ADR-0009: Orbit Core Boundary

**Date:** 2026-07-08
**Status:** Accepted
**Impacted Modules:** All entity schemas, all backend functions, all frontend pages — this is a cross-cutting architectural constraint

## Context

The Orbitan ecosystem will eventually host multiple specialised Operating Systems (OrbitanOS, AquaOrbit, ChefOrbit). Each product needs to operate independently while sharing common foundational services: Authentication, Permissions, Tenant Management, Organisational Structure, Audit Logs, Notifications, and Configuration.

Without a strict boundary between foundational services and product-specific modules, the following risks emerge:

1. **Schema contamination** — Product-specific fields leak into foundational entities (e.g. adding `kitchen_station_id` to the Employee entity for ChefOrbit, or `aquarium_zone` for AquaOrbit).
2. **Coupling** — Products become dependent on each other's modules, preventing independent deployment.
3. **Migration nightmares** — Changing one product's requirements forces schema changes that affect all other products.
4. **Scalability ceiling** — Each new product adds complexity to shared entities, eventually making them unmaintainable.

## Alternatives Considered

1. **Single shared schema** — All products share all entities, adding product-specific fields as needed
   - Rejected: Leads to schema contamination. Employee entity would accumulate fields from every product.
   - Rejected: Violates the "Will this still work for thousands of organisations?" scalability principle.

2. **Completely separate databases per product** — Each Orbit product has its own database
   - Rejected: Over-engineered for MVP. Base44 uses a single app instance.
   - Rejected: Duplicate authentication, tenant management, and audit infrastructure.
   - Deferred: Could be revisited for white-label/enterprise deployments.

3. **Orbit Core boundary with side-car entities** — Foundational entities are immutable; product-specific data lives in separate entities linked by ID
   - Selected: Clean separation. Orbit Core entities (Tenant, Company, Outlet, Employee, AuditLog) are shared and stable.
   - Selected: Product modules (InventoryItem, SalesInvoice, PurchaseOrder, etc.) are independent and reference Core entities via `tenant_id` / `outlet_id` / `employee_id` — they never modify Core entity schemas.
   - Selected: Future products (AquaOrbit, ChefOrbit) add their own module entities without touching Core.

## Decision

Establish **Orbit Core** as an immutable foundational layer with strict boundary rules:

### Orbit Core Entities (Immutable — do not add product-specific fields)

| Entity | Purpose |
|--------|---------|
| `Tenant` | Tenant/company registration, subscription, status |
| `Company` | Legal entity / brand holder |
| `Client` | Brand/client within a company |
| `Outlet` | Physical or virtual location |
| `Employee` | Worker identity, role, assignment |
| `Invitation` | Governed onboarding pipeline |
| `AccessRequest` | Worker access request registry |
| `AuditLog` | Immutable global audit trail |
| `GovernancePolicy` | Shield policy-as-code registry |
| `GovernanceOverride` | Override release valve |
| `ActivationRegistry` | Industry pack blueprints |
| `PlatformManifest` | UI/navigation manifests |
| `SubscriptionPolicy` | Commercial entitlement |
| `OrbitanWallet` | Tenant wallet (credits, points, cashback) |
| `WalletTransaction` | Immutable transaction ledger |
| `IntegrationCredential` | Per-tenant OAuth credential vault |
| `SystemSettings` | Platform-level configuration |

### Orbit Core Boundary Rules

1. **No product-specific fields on Core entities.** If ChefOrbit needs `kitchen_station_assignment`, it creates a `ChefOrbitStation` entity that references `employee_id` — it does NOT add a `kitchen_station_id` field to `Employee`.

2. **Core entities define the organisational hierarchy.** All products reference `tenant_id`, `outlet_id`, `employee_id` — they do not redefine organisational structure.

3. **Core entities are RLS-governed.** Row-level security policies on Core entities protect tenant isolation. Product modules inherit this by filtering on `tenant_id`.

4. **Core entity schema changes require an ADR.** Adding a field to a Core entity is a significant decision that must be documented and justified.

5. **Product modules are independently deployable.** Inventory, Procurement, Sales, Workforce modules can be enabled/disabled per tenant via `PlatformManifest` + `SubscriptionPolicy` without affecting Core.

### Product Module Entities (OrbitanOS-specific — not shared with future products)

| Entity | Module |
|--------|--------|
| `InventoryItem` | Operations |
| `PurchaseOrder` | Procurement |
| `GoodsReceipt` | Procurement |
| `Supplier` | Procurement |
| `SalesInvoice` | Finance |
| `DailyReconciliation` | Finance |
| `FinanceSyncQueue` | Finance / Orbit Connect |
| `FinanceMapping` | Finance / Orbit Connect |
| `AccountMapping` | Finance / Orbit Connect |
| `ClockRecord` | Workforce |
| `Shift` | Workforce |
| `PayrollSnapshot` | Workforce |
| `ComplianceRecord` | Compliance |
| `FoodSafetyLog` | Compliance |
| `Recipe` | Operations |
| `ProductCatalog` | Operations |
| `MaterialCollection` | Operations |
| `Task` | Productivity |
| `IssueLog` | Feedback |
| `ReplenishmentAlert` | Operations |
| `Announcement` | Communications |
| `DashboardLayout` | UI Configuration |
| `AIDocument` | Orbit Nexus |
| `OrbitUsageTracker` | Orbit Nexus |
| `ComplianceSnapshot` | Compliance |
| `DeploymentLog` | Platform Ops |
| `MarketplaceModule` | Orbit Marketplace (post-MVP) |
| `WorkerFeedback` | Workforce |
| `CustomerProfile` | Sales |

## Trade-offs

**Positive:**
- Future products (AquaOrbit, ChefOrbit) can be added without schema contamination
- Core entities remain stable and well-understood
- Clean separation of concerns
- Each product is independently deployable

**Negative:**
- More entities to manage — product-specific data lives in side-car entities, not on Core
- Cross-entity queries require joins or multiple SDK calls — mitigated by efficient filtering

## Future Review Date

**2026-12-01** — Evaluate whether any OrbitanOS module entities should be promoted to Core (e.g. if AquaOrbit and ChefOrbit both need `Recipe`-like functionality, it may warrant promotion to Core).

---

**Related ADRs:** ADR-0008 (Orbit Naming Standards), ADR-0010 (Independent Deployability), ADR-0001 (Registry-Driven Architecture)