---
title: Orbitan Disaster Recovery Plan
category: Legal
owner: Product Owner
status: Draft
version: 0.1
last_updated: 2026-07-13
related:
  - BusinessContinuity.md
  - IncidentResponse.md
  - ../Architecture/DataArchitecture.md
tags:
  - legal
  - disaster-recovery
  - DR
  - backup
  - migration
  - exit-ready
---

# Orbitan Disaster Recovery Plan

## Purpose

Defines the disaster recovery plan for catastrophic events — platform failure, data centre loss, or complete infrastructure unavailability.

## Recovery Objectives

| Metric | Target | Notes |
|--------|--------|-------|
| **RTO** (Recovery Time Objective) | < 4 hours | Time to restore service |
| **RPO** (Recovery Point Objective) | < 1 hour | Maximum data loss tolerance |

## Disaster Scenarios

### 1. Complete Platform Loss (Base44 unavailable permanently)
- **Trigger:** Base44 platform shut down or permanently unavailable
- **Response:** Execute full migration to alternative platform
- **Recovery:** See [../Architecture/DataArchitecture.md](../Architecture/DataArchitecture.md) — Exit Strategy
- **Steps:**
  1. Export all entity records as JSON/CSV
  2. Port backend functions to Node.js/Express or AWS Lambda
  3. Port UI to new Vite + React project
  4. Replace `@/api/base44Client` with `OrbitCore` adapter (single migration point)
  5. Validate API contracts
  6. Migrate auth to new provider

### 2. Data Centre Loss
- **Trigger:** Cloud infrastructure data centre failure
- **Response:** Platform-managed failover (Base44 infrastructure)
- **Recovery:** Automatic failover to healthy infrastructure
- **Mitigation:** Platform-managed redundancy

### 3. Data Corruption
- **Trigger:** Accidental or malicious data corruption
- **Response:** Restore from backups
- **Recovery:** Platform-managed backup restoration
- **Mitigation:** AuditLog captures all changes (previous_state + new_state)

### 4. Ransomware or Malware
- **Trigger:** Malicious software encrypts or destroys data
- **Response:** Isolate affected systems, restore from backups
- **Recovery:** Platform-managed backup restoration
- **Mitigation:** RLS prevents cross-tenant data access; AuditLog tracks all changes

## Backup Strategy

### Platform-Managed
- Base44 infrastructure provides automated backups
- Entity records exportable as JSON/CSV at any time via dashboard

### Application-Level
- AuditLog provides immutable record of all operations (previous_state + new_state)
- Decision Records preserve architectural decisions
- Knowledge Hub preserves institutional memory

### Future
- Automated backup to external storage (S3, Google Cloud Storage)
- Cross-region backup replication
- Point-in-time recovery

## Migration Readiness

The OrbitCore adapter pattern (`src/lib/orbit-core.js`) ensures platform independence:
- All new modules import from `@/lib/orbit-core` instead of `@/api/base44Client`
- Single migration point — only `orbit-core.js` changes when switching platforms
- Entity schemas are JSON, portable to any database
- Backend functions are Deno-compatible, portable to Node.js/Express
- UI is standard Vite + React, portable to any hosting

## Testing

- **Pilot phase:** No formal DR testing (platform-managed)
- **Pre-enterprise:** Quarterly backup restoration tests
- **Enterprise:** Annual full DR drill with RTO/RPO measurement

## Status

This is a framework. Must be reviewed and tested before formal adoption.

## Related Documents

- [BusinessContinuity.md](./BusinessContinuity.md) — Business continuity
- [IncidentResponse.md](./IncidentResponse.md) — Incident response
- [../Architecture/DataArchitecture.md](../Architecture/DataArchitecture.md) — Data architecture and exit strategy