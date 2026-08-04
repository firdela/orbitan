---
title: Orbitan Data Architecture
category: Architecture
owner: Product Architecture
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - DatabaseStandards.md
  - APIStandards.md
  - PlatformArchitecture.md
  - OrbitCore.md
  - EngineeringPrinciples.md
tags:
  - data
  - entities
  - data-models
  - migration
  - platform-independence
  - exit-ready
---

# Orbitan Data Architecture

## Purpose

Defines data ownership, data layer, data models, entity relationships, exports, backups, governance, migration, and platform independence.

## Data Ownership

Orbitan owns its data models, entity schemas, and API contracts. The business logic, data models, and API contracts are owned by Orbitan, not by any hosting provider. All entities are defined as JSON Schema files and are exportable to any database.

## Data Layer

All OrbitanOS data is stored as structured JSON documents, scoped by `tenant_id`. Every entity schema is defined in `/base44/entities/*.jsonc` as a JSON Schema object. This makes migration straightforward — the schemas map directly to database tables or collections in any modern database.

## Data Models

### Core Entities (Immutable — see [OrbitCore.md](./OrbitCore.md))
Tenant, Company, Client, Outlet, Employee, Invitation, AccessRequest, AuditLog, GovernancePolicy, GovernanceOverride, ActivationRegistry, PlatformManifest, SubscriptionPolicy, OrbitanWallet, WalletTransaction, IntegrationCredential, SystemSettings

### Product Module Entities (OrbitanOS-specific)
InventoryItem, PurchaseOrder, GoodsReceipt, Supplier, SalesInvoice, DailyReconciliation, FinanceSyncQueue, FinanceMapping, AccountMapping, ClockRecord, Shift, PayrollSnapshot, ComplianceRecord, FoodSafetyLog, Recipe, ProductCatalog, MaterialCollection, Task, IssueLog, ReplenishmentAlert, Announcement, DashboardLayout, AIDocument, OrbitUsageTracker, ComplianceSnapshot, DeploymentLog, MarketplaceModule, WorkerFeedback, CustomerProfile, EvolutionProposal, ModuleAccessPolicy

## Entity Relationships

```
Tenant
└── Company
└── Outlet
    ├── Employee → ClockRecord → Shift
    ├── InventoryItem → ReplenishmentAlert
    │   └── Supplier → PurchaseOrder → GoodsReceipt
    ├── Recipe (F&B) → InventoryItem
    ├── SalesInvoice → FinanceMapping → Xero
    ├── DailyReconciliation → FinanceMapping → Xero
    ├── FoodSafetyLog
    ├── ComplianceRecord
    ├── Task → Employee
    ├── AccountMapping (Finance)
    ├── MaterialCollection (Recycling Pack)
    ├── ProductCatalog → MaterialCollection (Retail Pack)
    └── CustomerProfile (Retail Pack)
```

## Built-in Fields

Every entity record includes these fields automatically:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique record identifier (UUID) |
| `created_date` | datetime | When the record was created |
| `updated_date` | datetime | When the record was last updated |
| `created_by_id` | string | User ID of the creator |

## Exports

### From Dashboard
1. Navigate to Dashboard → Data → [Entity Name]
2. Export records as JSON or CSV
3. Repeat for every entity

### Data Volume Estimate (Per Tenant, Per Year)

| Entity | Estimated Records/Year |
|--------|------------------------|
| SalesInvoice | ~3,000–10,000 |
| PurchaseOrder | ~500–2,000 |
| ClockRecord | ~5,000–15,000 |
| InventoryItem | ~50–500 |
| Task | ~1,000–5,000 |
| MaterialCollection | ~500–3,000 |
| ProductCatalog | ~200–2,000 |

## Backups

- Platform-managed backups (Base44 infrastructure)
- Entity records exportable as JSON/CSV at any time
- Future: automated backup to external storage (S3, Google Cloud Storage)

## Governance

- RLS on every entity (see [DatabaseStandards.md](./DatabaseStandards.md))
- AuditLog captures all high-value operations
- Shield governance interceptor for sensitive actions
- Data retention policies (future — pre-compliance audit)

## Migration

### Target Database Options

**Option A: PostgreSQL (Recommended for Enterprise)**
- Map each entity to a relational table
- Use JSONB columns for array/object fields
- Replicate RLS policies

**Option B: MongoDB / DocumentDB**
- Each entity maps directly to a collection
- JSON export can be inserted directly using `mongoimport`

**Option C: Supabase (PostgreSQL + Auth)**
- Closest 1:1 replacement for Base44
- PostgreSQL database, RLS, Auth, Edge Functions (Deno-compatible)

### Entity → Target Collection Name

| OrbitanOS Entity | PostgreSQL Table | MongoDB Collection |
|------------------|------------------|-------------------|
| Tenant | `tenants` | `tenants` |
| Employee | `employees` | `employees` |
| InventoryItem | `inventory_items` | `inventory_items` |
| PurchaseOrder | `purchase_orders` | `purchase_orders` |
| SalesInvoice | `sales_invoices` | `sales_invoices` |
| ClockRecord | `clock_records` | `clock_records` |

(Full mapping in `src/docs/entity-migration.md` — preserved as legacy reference)

## Platform Independence

Orbitan must be architected for platform independence. Base44 is the initial development platform, not a permanent dependency. The `OrbitCore` adapter pattern (`src/lib/orbit-core.js`) creates a single migration point — when switching platforms, only `orbit-core.js` changes.

## Auth Migration

Current auth shape (must be preserved):
```javascript
{
  id: "uuid",
  email: "user@example.com",
  full_name: "Jane Doe",
  role: "outlet_manager",
  data: {
    tenant_id: "uuid",
    outlet_id: "uuid"
  }
}
```

## Related Documents

- [DatabaseStandards.md](./DatabaseStandards.md) — Entity and RLS standards
- [APIStandards.md](./APIStandards.md) — API contracts
- [PlatformArchitecture.md](./PlatformArchitecture.md) — Platform architecture
- [OrbitCore.md](./OrbitCore.md) — Core entity list
- [EngineeringPrinciples.md](./EngineeringPrinciples.md) — Engineering standards