---
title: Orbitan Business Continuity Plan
category: Legal
owner: Product Owner
status: Draft
version: 0.1
last_updated: 2026-07-13
related:
  - IncidentResponse.md
  - DisasterRecovery.md
  - SecurityPolicy.md
tags:
  - legal
  - business-continuity
  - BCP
  - resilience
  - operations
---

# Orbitan Business Continuity Plan

## Purpose

Defines the business continuity plan to ensure OrbitanOS can continue operating during disruptions.

## Business Continuity Objectives

1. **Maintain critical operations** during disruptions
2. **Minimise downtime** for pilot tenants and future customers
3. **Preserve data integrity** — no data loss during incidents
4. **Communicate clearly** with tenants during disruptions
5. **Recover quickly** to full operational status

## Critical Services

| Service | Criticality | Recovery Priority |
|---------|------------|-------------------|
| Authentication (Orbit Core) | Critical | P1 — immediate |
| Entity data (tenant isolation) | Critical | P1 — immediate |
| Backend functions | Critical | P1 — immediate |
| Frontend (UI) | High | P2 — < 1 hour |
| AI services (Orbit Nexus) | Medium | P3 — < 4 hours (AI is optional) |
| Integrations (Xero, Stripe) | Medium | P3 — < 4 hours |
| Analytics & reporting | Low | P4 — < 24 hours |

## Disruption Scenarios

### 1. Platform Infrastructure Outage
- **Trigger:** Base44 platform unavailable
- **Response:** Enable maintenance mode, communicate with tenants
- **Recovery:** Monitor Base44 status, restore when platform is back
- **Mitigation:** PWA service worker caches app shell for limited offline access

### 2. AI Service Outage
- **Trigger:** Orbit Nexus unavailable or AI provider outage
- **Response:** Graceful degradation — OrbitanOS continues without AI (ADR-0017)
- **Recovery:** AI features return automatically when service is restored
- **Mitigation:** AI kill switch can proactively disable AI during provider issues

### 3. Integration Outage (Xero/Stripe)
- **Trigger:** Xero or Stripe API unavailable
- **Response:** FinanceSyncQueue buffers events (pending status)
- **Recovery:** Queued events sync when API is restored
- **Mitigation:** Wallet-native ledger — core operations don't depend on external ERP

### 4. Data Breach
- **Trigger:** Unauthorised access to tenant data
- **Response:** See [IncidentResponse.md](./IncidentResponse.md)
- **Recovery:** Contain, eradicate, recover, post-incident review
- **Mitigation:** RLS, RBAC, encryption, audit logs

### 5. Key Personnel Unavailable
- **Trigger:** Product Owner or key developer unavailable
- **Response:** Knowledge Hub provides institutional memory
- **Recovery:** Decision Records document all architectural decisions
- **Mitigation:** Documentation-first approach ensures continuity

## Communication Plan

### Internal
- Product Owner notified for all disruptions
- AuditLog captures all response actions

### External (Tenants)
- `SystemSettings.status_message` for non-critical status updates
- `SystemSettings.maintenance_mode` for platform-wide maintenance
- MaintenanceView for maintenance mode
- Post-incident notification for data breaches (if required by law)

## Backup Strategy

- Platform-managed backups (Base44 infrastructure)
- Entity records exportable as JSON/CSV at any time
- AuditLog provides immutable record of all operations
- Decision Records preserve architectural decisions
- Future: automated backup to external storage (S3, Google Cloud Storage)

## Status

This is a framework. Must be reviewed and tested before formal adoption.

## Related Documents

- [IncidentResponse.md](./IncidentResponse.md) — Incident response
- [DisasterRecovery.md](./DisasterRecovery.md) — Disaster recovery
- [SecurityPolicy.md](./SecurityPolicy.md) — Security policy