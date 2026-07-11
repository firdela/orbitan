# ADR-0016: RLS Tenant Isolation Standard

**Date:** 2026-07-11
**Status:** Accepted
**Principle:** Regulate (Security & Governance)
**Impact:** All entities, all modules, all future Orbit products

---

## Context

OrbitanOS is a multi-tenant SaaS platform. The pilot phase (Taqueria, Renewed Resources, Renewed Fashion, HBBs) is the hardening ground for a platform that must eventually serve thousands of organisations. If tenant data isolation fails during the pilot, the platform cannot scale to external paying customers without a full re-engineering effort.

This ADR formalises the Row-Level Security (RLS) patterns that every entity must follow. It is derived from a full audit of all core entities conducted on 2026-07-11.

---

## Decision

### 1. Mandatory Tenant Scoping

Every operational entity MUST include `tenant_id` as a required field and MUST scope ALL RLS operations (create, read, update, delete) by:

```
"data.tenant_id": "{{user.data.tenant_id}}"
```

No entity that stores tenant-specific business data may have an empty `{}` read rule. Only global registry entities (ActivationRegistry, PlatformManifest, SubscriptionPolicy) may have public read — and only because their data is non-tenant-specific configuration.

### 2. Outlet Sub-Scoping (Where Applicable)

Entities tied to a physical location (outlet) MUST additionally scope by:

```
"data.outlet_id": "{{user.data.outlet_id}}"
```

This applies to: InventoryItem, PurchaseOrder, SalesInvoice, Shift, ClockRecord, ComplianceRecord, GoodsReceipt, DailyReconciliation, Task, and all future outlet-scoped entities.

Tenant-wide entities (Supplier, Company, Client, Employee) do NOT require outlet scoping — they are intentionally tenant-level shared resources.

### 3. Role Hierarchy Enforcement

The standard role hierarchy for RLS is:

| Role | Scope | Typical Access |
|------|-------|----------------|
| `admin` | Platform | All tenants, all entities, all operations |
| `tenant_admin` | Tenant | All outlets within their tenant |
| `client_manager` | Tenant | Read-only across outlets in their tenant |
| `outlet_manager` | Outlet | Full CRUD within their assigned outlet |
| `supervisor` | Outlet | Read + limited update within their outlet |
| `worker` | Outlet | Read + self-scoped data only |

### 4. Self-Reference Pattern

When an entity tracks individual ownership (e.g., `assigned_to`, `employee_id`, `reported_by_id`), the RLS read rule MUST allow users to see their own records via:

```
"data.<field>": "{{user.id}}"
```

**Critical:** Use `{{user.id}}` (the immutable user ID), never `{{user.full_name}}` (mutable, non-unique). See Audit Finding A-001 below.

### 5. Admin-Only Financial Entities

Entities governing platform economics (OrbitanWallet, WalletTransaction, FinanceSyncQueue, IntegrationCredential, SubscriptionPolicy) MUST restrict create/update/delete to `admin` role only. Read access may be extended to `tenant_admin` for transparency, but never to outlet-level roles.

### 6. Immutable Audit Entities

AuditLog records MUST be create-only for authorised roles. Update and delete MUST be admin-only to preserve audit integrity.

---

## Alternatives Considered

### Application-Level Filtering (Rejected)
Filtering tenant data in frontend or backend function code rather than RLS. Rejected because a single missed filter in any query path results in a cross-tenant data breach. RLS is enforced at the database engine level — it cannot be bypassed by application bugs.

### Attribute-Based Access Control (ABAC) (Deferred)
A full ABAC policy engine with dynamic attributes (time-based, location-based, risk-score-based). Deferred to post-MVP. Current RBAC + tenant/outlet scoping is sufficient for pilot validation and SOC 2 baseline.

---

## Trade-offs

- **Performance:** RLS adds a filter to every query. For the pilot scale (4 tenants, <10K records per entity), this is negligible. At enterprise scale, indexes on `tenant_id` + `outlet_id` will be required.
- **Flexibility:** RLS rules are defined in the entity schema, not in application code. This means changing access patterns requires a schema update. This is intentional — security changes should be deliberate and reviewed.
- **Complexity:** The `$and` + `$or` composition can be verbose. This is acceptable — readability of security rules is more important than brevity.

---

## Audit Findings (2026-07-11)

### Entities Audited
| Entity | Tenant Scope | Outlet Scope | Role Checks | Status |
|--------|-------------|-------------|-------------|--------|
| Tenant | ✅ | N/A | ✅ | PASS |
| Employee | ✅ | ✅ | ✅ | PASS |
| PurchaseOrder | ✅ | ✅ | ✅ | PASS |
| SalesInvoice | ✅ | ✅ | ✅ | PASS |
| InventoryItem | ✅ | ✅ | ✅ | PASS |
| ClockRecord | ✅ | ✅ | ✅ | PASS |
| ComplianceRecord | ✅ | ✅ | ✅ | PASS |
| Supplier | ✅ | N/A (tenant-wide) | ✅ | PASS |
| GoodsReceipt | ✅ | ✅ | ✅ | PASS |
| DailyReconciliation | ✅ | ✅ | ✅ | PASS |
| Task | ✅ | ✅ | ⚠️ | SEE A-001 |
| IssueLog | ✅ | ✅ | ✅ | PASS |
| AuditLog | ✅ | ✅ | ✅ | PASS |
| OrbitanWallet | ✅ | N/A | ✅ admin-only | PASS |
| WalletTransaction | ✅ | ✅ | ✅ admin-only | PASS |
| FinanceSyncQueue | ✅ | ✅ | ✅ admin-only | PASS |
| IntegrationCredential | ✅ | N/A | ✅ admin-only | PASS |

### Finding A-001: Task entity uses `full_name` for self-reference (Medium Risk)

**Entity:** Task
**Field:** `assigned_to_name` matched against `{{user.full_name}}`

**Risk:** If two users share the same full name, they can see each other's tasks. If a user changes their name, they lose access to their assigned tasks.

**Root Cause:** The `assigned_to` field exists and stores a user/employee ID, but the RLS read/update rules match on `assigned_to_name` (a display string) instead of the immutable ID.

**Recommended Fix:** Change RLS read and update rules from:
```
"data.assigned_to_name": "{{user.full_name}}"
```
to:
```
"data.assigned_to": "{{user.id}}"
```

**Prerequisite:** Verify that the frontend stores `user.id` (not Employee ID) in the `assigned_to` field when creating tasks. If the frontend stores Employee ID, an intermediary lookup or a denormalised `assigned_to_user_id` field is needed.

**Status:** Flagged for Product Owner decision. Not fixed in this sprint pending frontend verification.

---

## Compliance Notes

This standard aligns with:
- SOC 2 CC6.1 (Logical Access Controls)
- ISO 27001 A.9 (Access Control)
- Enterprise-readiness requirement for future Vanta-compatible audit evidence

---

## Review Date
**2026-10-11** (3 months post-pilot launch) — re-evaluate whether ABAC upgrade is needed based on enterprise customer requirements.