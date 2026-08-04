---
title: Orbitan Risk Register
category: Knowledge
owner: Product Owner
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - ../architecture/SecurityCompliance.md
  - ../architecture/DatabaseStandards.md
  - ImprovementLog.md
tags:
  - risk
  - risk-register
  - mitigation
  - security
  - compliance
---

# Orbitan Risk Register

## Purpose

Tracks identified risks, their likelihood, impact, mitigation strategy, and owner.

## Risk Entries

### R-001: RLS `$in` Operator Not Supported
- **Risk:** Multiple entities use `$in` in RLS role checks. The Base44 engine does not support this.
- **Likelihood:** High (affects existing entities)
- **Impact:** Medium (security rules may not evaluate correctly)
- **Mitigation:** Refactor to explicit `$or` blocks. Affected: InventoryItem, PurchaseOrder, Employee, Company, Client, Invitation, FinanceSyncQueue, OrbitanWallet.
- **Owner:** Product Architecture
- **Status:** Identified — refactor needed

### R-002: Task Self-Reference Uses `full_name` (A-001)
- **Risk:** Task entity uses `data.assigned_to_name === {{user.full_name}}` for self-reference. `full_name` is mutable and non-unique.
- **Likelihood:** Medium
- **Impact:** Medium (edge case: two users with same name could see each other's tasks; name change loses access)
- **Mitigation:** Change to `data.assigned_to === {{user.id}}`. Verify frontend stores `user.id`.
- **Owner:** Product Architecture
- **Status:** Flagged — pending frontend verification

### R-003: Duplicate Routes
- **Risk:** Both `/outlet/*` and `/workspace/:tenantId/*` serve the same pages.
- **Likelihood:** Low
- **Impact:** Low (maintenance burden, potential confusion)
- **Mitigation:** Deprecate `/outlet/*` routes; redirect to `/workspace/:tenantId/*`.
- **Owner:** Product Architecture
- **Status:** Identified — migration plan needed

### R-004: Manifest Fallback
- **Risk:** If PlatformManifest lookup fails, ManifestHydrator falls back to hardcoded nav. This is intentional but not monitored.
- **Likelihood:** Low
- **Impact:** Low (fallback works, but indicates a problem if triggered frequently)
- **Mitigation:** Add logging/monitoring when fallback is triggered.
- **Owner:** Product Architecture
- **Status:** Identified

### R-005: Platform Dependency (Base44)
- **Risk:** OrbitanOS is built on Base44. If the platform becomes unavailable or unsuitable, migration is needed.
- **Likelihood:** Low (short-term) / Medium (long-term)
- **Impact:** High (would require significant migration effort)
- **Mitigation:** OrbitCore adapter pattern (`src/lib/orbit-core.js`) creates single migration point. Exit strategy documented in [../architecture/DataArchitecture.md](../architecture/DataArchitecture.md). All data exportable as JSON/CSV.
- **Owner:** Product Owner
- **Status:** Mitigated (adapter pattern in place)

### R-006: AI Cost Overrun
- **Risk:** AI requests could consume excessive credits, leading to unexpected costs.
- **Likelihood:** Medium
- **Impact:** Medium (financial)
- **Mitigation:** AI kill switch (`SystemSettings.nexus_ai_enabled`). OrbitUsageTracker meters every request. OrbitanWallet gates usage. Credit quota per tenant.
- **Owner:** Product Owner
- **Status:** Mitigated

### R-007: Compliance Certification Not Yet Achieved
- **Risk:** SOC 2 / ISO 27001 certification not yet obtained. Enterprise customers may require it.
- **Likelihood:** High (for enterprise sales)
- **Impact:** Medium (blocks enterprise customer acquisition)
- **Mitigation:** Architecture is compliance-ready (ADR-0022). Formal certification is post-MVP. Vanta can reference Decision Records as evidence.
- **Owner:** Product Owner
- **Status:** Deferred to post-MVP

### R-008: Pilot Tenant Data Leakage
- **Risk:** Pilot tenant names, IDs, or industry logic could leak into platform code.
- **Likelihood:** Low (mitigated by dynamic routing and registry-driven architecture)
- **Impact:** High (would violate "tenants don't define Orbitan" principle)
- **Mitigation:** Dynamic routing (`/workspace/:tenantId/*`), registry-driven architecture, no hardcoded tenant names.
- **Owner:** Product Architecture
- **Status:** Mitigated

## How to Add Entries

```markdown
### R-XXX: [Risk Title]
- **Risk:** [Description]
- **Likelihood:** Low | Medium | High
- **Impact:** Low | Medium | High
- **Mitigation:** [How the risk is addressed]
- **Owner:** [Responsible role]
- **Status:** Identified | Mitigated | Monitored | Resolved
```

## Related Documents

- [../architecture/SecurityCompliance.md](../architecture/SecurityCompliance.md) — Security and compliance
- [../architecture/DatabaseStandards.md](../architecture/DatabaseStandards.md) — RLS standards
- [ImprovementLog.md](./ImprovementLog.md) — Improvement tracking