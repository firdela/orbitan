---
title: Orbitan Incident Response Plan
category: Legal
owner: Product Owner
status: Draft
version: 0.1
last_updated: 2026-07-13
related:
  - SecurityPolicy.md
  - BusinessContinuity.md
  - DisasterRecovery.md
  - ../Architecture/SecurityCompliance.md
tags:
  - legal
  - incident-response
  - security
  - runbook
  - emergency
---

# Orbitan Incident Response Plan

## Purpose

Defines the incident response process for security incidents, platform outages, and data breaches.

## Incident Classification

### Severity Levels
| Severity | Description | Response Time |
|----------|-------------|---------------|
| Critical | Data breach, platform-wide outage, security vulnerability exploited | Immediate |
| High | Partial outage, governance breach, major bug affecting multiple tenants | < 1 hour |
| Medium | Single-tenant issue, non-critical bug, minor security finding | < 4 hours |
| Low | Cosmetic issue, minor bug, non-urgent improvement | < 24 hours |

## Response Process

### 1. Detection
- **Automated:** AuditLog alerts, Shield governance blocks, error monitoring
- **Manual:** User reports via IssueLog, security research, admin observation
- **AI kill switch:** `SystemSettings.nexus_ai_enabled` for AI-related incidents

### 2. Triage
- Assess severity level
- Identify affected tenants/entities
- Determine if data is compromised
- Assign incident owner (Product Owner or delegate)

### 3. Containment
- **AI incidents:** Toggle `SystemSettings.nexus_ai_enabled` to false (instant global AI shutdown)
- **Platform incidents:** Toggle `SystemSettings.maintenance_mode` to true (platform-wide maintenance)
- **Security incidents:** Revoke suspicious sessions, rotate secrets, disable affected integrations
- **Data incidents:** Freeze affected entity operations, preserve AuditLog evidence

### 4. Eradication
- Identify root cause
- Apply fix (code change, configuration update, secret rotation)
- Verify fix resolves the issue
- Deploy fix to production

### 5. Recovery
- Verify all systems operational
- Re-enable AI (if disabled) — toggle `nexus_ai_enabled` back to true
- Exit maintenance mode (if enabled) — toggle `maintenance_mode` back to false
- Monitor for recurrence

### 6. Post-Incident Review
- Document incident in AuditLog
- Create IssueLog entry with `issue_type: bug` or `compliance_query`
- Update Risk Register ([../Knowledge/RiskRegister.md](../Knowledge/RiskRegister.md))
- Create Decision Record if architectural change is needed
- Update this incident response plan with lessons learned

## Emergency Controls

### AI Kill Switch
- **Field:** `SystemSettings.nexus_ai_enabled` (boolean)
- **Effect:** When false, all AI requests return `ai_disabled: true`
- **Admin UI:** Shield Command Center (`/platform/shield`)
- **Audit:** Changes logged to AuditLog with `action_type: 'ai_kill_switch_toggled'`

### Maintenance Mode
- **Field:** `SystemSettings.maintenance_mode` (boolean)
- **Effect:** When true, all tenant app users see MaintenanceView
- **Admin bypass:** `SystemSettings.allow_admin_access_during_maintenance` (default: true)
- **Admin UI:** Platform settings

### Secret Rotation
- Stripe keys, Xero secrets, OAuth secrets in environment variables
- Rotate via dashboard settings
- IntegrationCredential entity for per-tenant OAuth credentials

## Communication

### Internal
- Product Owner notified immediately for Critical/High incidents
- All incidents documented in AuditLog

### External (Tenants)
- Maintenance mode message via MaintenanceView
- Post-incident notification for data breaches (if required by law)
- Status updates via `SystemSettings.status_message`

## Status

This is a framework. Must be reviewed and tested before formal adoption.

## Related Documents

- [SecurityPolicy.md](./SecurityPolicy.md) — Security policy
- [BusinessContinuity.md](./BusinessContinuity.md) — Business continuity
- [DisasterRecovery.md](./DisasterRecovery.md) — Disaster recovery
- [../Architecture/SecurityCompliance.md](../Architecture/SecurityCompliance.md) — Security architecture