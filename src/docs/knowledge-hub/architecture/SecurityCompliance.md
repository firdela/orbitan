---
title: Orbitan Security & Compliance
category: Architecture
owner: Product Architecture
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - DatabaseStandards.md
  - OrbitCore.md
  - OrbitServices.md
  - ../legal/ComplianceChecklist.md
  - ../knowledge/DecisionRecords.md
tags:
  - security
  - SOC2
  - ISO27001
  - Vanta
  - RBAC
  - ABAC
  - encryption
  - audit-logs
  - disaster-recovery
---

# Orbitan Security & Compliance

## Purpose

Defines the security architecture, compliance controls, and audit readiness for OrbitanOS and Orbit Nexus.

## Compliance Standards

OrbitanOS and Orbit Nexus are architected from day one for:
- **SOC 2** (Service Organization Control 2)
- **ISO 27001** (Information Security Management)
- **Vanta** (continuous compliance monitoring)

Formal certification is post-MVP. The architecture is designed so compliance can be achieved efficiently when the business is ready.

## RBAC (Role-Based Access Control)

6-role hierarchy with least-privilege:

| Role | Scope | Access |
|------|-------|--------|
| `admin` | Platform | All tenants, all entities, all operations |
| `tenant_admin` | Tenant | All outlets within their tenant |
| `client_manager` | Tenant | Read-only across outlets |
| `outlet_manager` | Outlet | Full CRUD within their assigned outlet |
| `supervisor` | Outlet | Read + limited update |
| `worker` | Outlet | Read + self-scoped data only |

`ModuleAccessPolicy` entity provides per-tenant, per-role, per-module access matrix. Default deny — permissions are explicitly granted.

## ABAC (Attribute-Based Access Control) — Future

Full ABAC policy engine with dynamic attributes (time-based, location-based, risk-score-based). Deferred to post-MVP. Current RBAC + tenant/outlet scoping is sufficient for pilot validation and SOC 2 baseline.

## Encryption

- **In transit:** All API calls over HTTPS
- **At rest:** Platform-managed encryption for database and file storage
- **Secrets:** API keys and OAuth secrets stored as environment secrets, never in code
- **OAuth credentials:** Per-tenant in `IntegrationCredential` entity (encrypted by platform)

## Audit Logs

`AuditLog` entity captures:
- `actor_id`, `actor_name`, `actor_role`
- `action_type` (standardised action key)
- `module` (which OrbitanOS module generated this event)
- `target_entity`, `target_record_id`
- `previous_state`, `new_state` (snapshots)
- `details` (human-readable description)
- `ip_address`, `outlet_id`
- `evidence_urls` (linked artifacts)
- `override_id` (links to GovernanceOverride if applicable)
- `justification` (mandatory for overrides)
- `policy_name` (if Shield policy evaluated)
- `shield_outcome` (pass, blocked, override_requested, override_approved, override_denied, not_evaluated)

AuditLog is **immutable** — update and delete are admin-only.

## Backups

- Platform-managed backups (Base44 infrastructure)
- Entity records exportable as JSON/CSV at any time
- Future: automated backup to external storage

## Disaster Recovery

- Platform-managed infrastructure redundancy
- Entity data exportable for off-platform backup
- `DeploymentLog` entity tracks deployment history
- Future: formal disaster recovery runbook (see [../legal/DisasterRecovery.md](../legal/DisasterRecovery.md))

## Data Privacy

- User data (email, full_name) visible only to the user themselves or admins/managers within their tenant
- Employee RLS allows workers to see only their own record
- Analytics (Orbit Evolution) uses anonymised, aggregated data — never personal behaviour tracking
- Tenants can configure their analytics preferences

## Vanta Readiness Assessment

| Vanta Control Area | Status | Evidence |
|--------------------|--------|----------|
| Access Control | ✅ Implemented | RLS, ModuleAccessPolicy, 6-role hierarchy |
| Audit Logging | ✅ Implemented | AuditLog entity, immutable, comprehensive |
| Encryption | ✅ Platform-managed | HTTPS in transit, encrypted at rest |
| Incident Response | ⚠️ Partial | SystemSettings kill switches; formal IR runbook needed |
| Data Retention | ⚠️ Partial | created_date/updated_date tracked; automated retention TBD |
| Vendor Management | ⚠️ Partial | IntegrationCredential tracks services; formal vendor inventory needed |
| Change Management | ✅ Partial | Decision Records + DeploymentLog; Git-based deployment |
| Security Training | ❌ Not started | Training modules available; formal programme TBD |

## Security Audit (2026-07-11)

Full RLS audit conducted on 17 core entities. 16 of 17 passed. One medium-risk finding (A-001: Task entity uses `full_name` for self-reference instead of `user.id`). Not blocking pilot launch; must fix before enterprise customers.

## Related Documents

- [DatabaseStandards.md](./DatabaseStandards.md) — RLS standards
- [OrbitCore.md](./OrbitCore.md) — Core entities
- [OrbitServices.md](./OrbitServices.md) — Orbit Shield
- [../legal/ComplianceChecklist.md](../legal/ComplianceChecklist.md) — Compliance checklist
- [../knowledge/DecisionRecords.md](../knowledge/DecisionRecords.md) — ADR-0016, ADR-0022