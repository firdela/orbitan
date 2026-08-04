---
title: Orbit Core
category: Architecture
owner: Product Architecture
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - PlatformArchitecture.md
  - OrbitServices.md
  - DataArchitecture.md
  - DatabaseStandards.md
  - SecurityCompliance.md
  - ../knowledge/DecisionRecords.md
tags:
  - orbit-core
  - authentication
  - tenancy
  - permissions
  - audit
  - immutable
---

# Orbit Core

## Purpose

Defines the foundational platform services (Orbit Core) that are shared across all Orbit products. Orbit Core entities are **immutable** — product modules must never add fields to them.

## Responsibilities

Orbit Core provides the foundational services every Orbit product depends on:

1. **Authentication** — User identity, login, sessions, MFA readiness, SSO
2. **Organisations** — Tenant, Company, Client hierarchy
3. **Tenants** — Multi-tenant isolation, subscription, status
4. **Brands** — Client/brand within a company
5. **Outlets** — Physical or virtual locations
6. **Departments** — Sub-outlet organisational units
7. **Teams** — Sub-department groupings
8. **Employees** — Worker identity, role, assignment
9. **Permissions** — RBAC with 6-role hierarchy, ModuleAccessPolicy
10. **Audit Logs** — Immutable global audit trail

## Orbit Core Entities (Immutable)

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

## Orbit Core Boundary Rules

1. **No product-specific fields on Core entities.** If ChefOrbit needs `kitchen_station_assignment`, it creates a `ChefOrbitStation` entity that references `employee_id` — it does NOT add a `kitchen_station_id` field to `Employee`.

2. **Core entities define the organisational hierarchy.** All products reference `tenant_id`, `outlet_id`, `employee_id` — they do not redefine organisational structure.

3. **Core entities are RLS-governed.** Row-level security policies on Core entities protect tenant isolation. Product modules inherit this by filtering on `tenant_id`.

4. **Core entity schema changes require an ADR.** Adding a field to a Core entity is a significant decision that must be documented and justified.

5. **Product modules are independently deployable.** Inventory, Procurement, Sales, Workforce modules can be enabled/disabled per tenant via `PlatformManifest` + `SubscriptionPolicy` without affecting Core.

## Authentication

- Platform auth backend manages tokens, sessions, email verification
- Google OAuth implemented; additional SSO providers available (Microsoft, Apple)
- MFA readiness: platform supports MFA enrollment
- Password reset flow with token-based verification
- Auth SDK: `base44.auth.me()`, `base44.auth.isAuthenticated()`, `base44.auth.updateMe()`, `base44.auth.logout()`, `base44.auth.redirectToLogin()`

## Role Hierarchy

```
admin                   → Platform Owner (Orbitan team only)
  └── tenant_admin      → Manages one Tenant (e.g., Taqueria CEO)
        └── client_manager   → Manages brands/clients within a Tenant
              └── outlet_manager  → Manages one Outlet
                    └── supervisor     → Senior staff, limited management
                          └── worker         → Frontline staff
```

## Tenant Isolation

Every operational entity carries `tenant_id`. RLS enforces `data.tenant_id === {{user.data.tenant_id}}` for all non-admin roles. The `tenant_admin` role has cross-outlet visibility within their tenant only.

## Audit Logs

- `AuditLog` entity captures: actor, role, action, target entity, target record, previous state, new state, details, IP address, shield outcome, override reference, justification, evidence URLs
- AuditLog is **immutable** — update and delete are admin-only
- Every high-value operation is logged

## Orbit Core Adapter Pattern

`src/lib/orbit-core.js` provides a platform-agnostic data access layer. All new modules import from `@/lib/orbit-core` instead of `@/api/base44Client` directly. This creates a single migration point when switching platforms.

## Related Documents

- [PlatformArchitecture.md](./PlatformArchitecture.md) — Three-layer architecture
- [OrbitServices.md](./OrbitServices.md) — Platform service registry
- [DataArchitecture.md](./DataArchitecture.md) — Data models and migration
- [DatabaseStandards.md](./DatabaseStandards.md) — Entity and RLS standards
- [SecurityCompliance.md](./SecurityCompliance.md) — Security and compliance
- [../knowledge/DecisionRecords.md](../knowledge/DecisionRecords.md) — ADR-0009 (Orbit Core Boundary), ADR-0023 (Adapter Pattern)