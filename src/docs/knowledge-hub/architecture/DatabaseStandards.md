---
title: Orbitan Database Standards
category: Architecture
owner: Product Architecture
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - DataArchitecture.md
  - SecurityCompliance.md
  - OrbitCore.md
  - ../knowledge/DecisionRecords.md
tags:
  - database
  - entity-standards
  - RLS
  - tenant-isolation
  - naming
  - auditing
---

# Orbitan Database Standards

## Purpose

Defines entity standards, naming conventions, relationships, indexes, auditing, soft delete, versioning, and tenant isolation for all OrbitanOS data.

## Entity Standards

Every entity is defined as a JSON Schema (`.jsonc`) file in `/base44/entities/`. The schema includes:
- `name` — Entity name (PascalCase)
- `type` — Always `"object"`
- `properties` — Field definitions with type, description, default, enum
- `required` — Array of required field names
- `rls` — Row-Level Security rules for create, read, update, delete

### Built-in Fields (Auto-generated, never declared)
`id`, `created_date`, `updated_date`, `created_by_id`

## Naming

- **Entity names:** PascalCase (e.g., `InventoryItem`, `SalesInvoice`)
- **Field names:** snake_case (e.g., `tenant_id`, `outlet_id`, `created_date`)
- **Entity files:** `{EntityName}.jsonc` in `/base44/entities/`
- **Table names (migration):** snake_case plural (e.g., `inventory_items`, `sales_invoices`)

## Relationships

Entities reference each other via ID fields:
- `tenant_id` → Tenant
- `outlet_id` → Outlet
- `employee_id` → Employee
- `supplier_id` → Supplier
- `purchase_order_id` → PurchaseOrder
- `clock_record_id` → ClockRecord

No foreign key constraints at the schema level (platform limitation). Referential integrity is enforced by application logic and RLS.

## Indexes

At enterprise scale, compound indexes must exist on:
- `(tenant_id, outlet_id)` for all high-volume entities
- `(tenant_id, status)` for status-filtered queries
- `(employee_id, created_date)` for ClockRecord

## Auditing

### AuditLog Entity
- Captures: actor, role, action, target entity, target record, previous state, new state, details, IP address, shield outcome, override reference, justification, evidence URLs
- **Immutable** — update and delete are admin-only
- Every high-value operation (document verification, stock adjustment, status change, override approval) is logged

### Audit Trail on Entities
Some entities (PurchaseOrder, SalesInvoice) carry an `audit_trail` array — an immutable log of all state changes with action, user, timestamp, and details.

## Soft Delete

Entities use a `status` field (e.g., `active`, `inactive`, `discontinued`, `terminated`) rather than hard deletion. This preserves referential integrity and audit history.

## Versioning

- Entity schemas can be versioned via the `manifest_version` field (on registry entities)
- Schema changes are backward-compatible (new fields have defaults)
- Core entity schema changes require an ADR (see [OrbitCore.md](./OrbitCore.md))

## Tenant Isolation (RLS)

### 1. Mandatory Tenant Scoping
Every operational entity MUST include `tenant_id` as a required field and MUST scope ALL RLS operations by:
```
"data.tenant_id": "{{user.data.tenant_id}}"
```

### 2. Outlet Sub-Scoping (Where Applicable)
Entities tied to a physical location MUST additionally scope by:
```
"data.outlet_id": "{{user.data.outlet_id}}"
```

### 3. Role Hierarchy Enforcement

| Role | Scope | Typical Access |
|------|-------|----------------|
| `admin` | Platform | All tenants, all entities, all operations |
| `tenant_admin` | Tenant | All outlets within their tenant |
| `client_manager` | Tenant | Read-only across outlets in their tenant |
| `outlet_manager` | Outlet | Full CRUD within their assigned outlet |
| `supervisor` | Outlet | Read + limited update within their outlet |
| `worker` | Outlet | Read + self-scoped data only |

### 4. Self-Reference Pattern
Use `{{user.id}}` (immutable), never `{{user.full_name}}` (mutable, non-unique):
```
"data.<field>": "{{user.id}}"
```

### 5. Admin-Only Financial Entities
`OrbitanWallet`, `WalletTransaction`, `FinanceSyncQueue`, `IntegrationCredential`, `SubscriptionPolicy` — create/update/delete restricted to `admin` role only.

### 6. `$in` Operator Not Supported
The Base44 RLS engine does NOT support `$in` in user_condition role checks. Use explicit `$or` blocks instead.

## Known Issues

- **Finding A-001:** Task entity uses `full_name` for self-reference instead of `user.id` (medium risk, flagged for fix)
- **Duplicate routes:** Both `/outlet/*` and `/workspace/:tenantId/*` serve the same pages (migration plan needed)
- **Manifest fallback:** If PlatformManifest lookup fails, ManifestHydrator falls back to hardcoded nav (intentional safety net)

## Related Documents

- [DataArchitecture.md](./DataArchitecture.md) — Data models and migration
- [SecurityCompliance.md](./SecurityCompliance.md) — Security and compliance
- [OrbitCore.md](./OrbitCore.md) — Core entity list
- [../knowledge/DecisionRecords.md](../knowledge/DecisionRecords.md) — ADR-0016 (RLS Tenant Isolation)