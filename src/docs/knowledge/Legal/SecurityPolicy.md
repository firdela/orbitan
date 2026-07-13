---
title: Orbitan Security Policy Framework
category: Legal
owner: Product Owner
status: Draft
version: 0.1
last_updated: 2026-07-13
related:
  - PrivacyPolicy.md
  - IncidentResponse.md
  - ../Architecture/SecurityCompliance.md
  - ../Legal/ComplianceChecklist.md
tags:
  - legal
  - security
  - policy
  - encryption
  - access-control
  - audit
---

# Orbitan Security Policy Framework

## Purpose

Framework for the Orbitan security policy. Outlines the security controls, practices, and commitments. Must be reviewed by legal counsel.

## Security Controls

### 1. Access Control
- **RBAC:** 6-role hierarchy (admin, tenant_admin, client_manager, outlet_manager, supervisor, worker)
- **RLS:** Tenant + outlet isolation on every entity
- **ModuleAccessPolicy:** Per-tenant, per-role, per-module access matrix
- **Default deny:** Permissions explicitly granted
- **MFA readiness:** Platform supports MFA enrollment
- **SSO:** Google OAuth; additional providers available

### 2. Encryption
- **In transit:** All API calls over HTTPS (TLS 1.2+)
- **At rest:** Platform-managed encryption for database and file storage
- **Secrets:** API keys and OAuth secrets stored as environment secrets, never in code
- **OAuth credentials:** Per-tenant in IntegrationCredential entity (encrypted by platform)

### 3. Audit Logging
- **AuditLog entity:** Immutable audit trail
- Captures: actor, role, action, target entity, target record, previous/new state, IP, shield outcome, override reference, justification, evidence URLs
- **Immutable:** Update and delete are admin-only
- Every high-value operation logged

### 4. Governance
- **Orbit Shield:** Policy-as-code governance interceptor
- **GovernancePolicy:** Centralised policy registry
- **GovernanceOverride:** Release valve with mandatory justification + evidence
- Two modes: Auditor (notify) / Guardian (block)

### 5. Secure API Architecture
- All backend functions authenticate via `base44.auth.me()`
- Admin-only functions verify `user.role === 'admin'` and return 403
- Webhook endpoints validate request authenticity (Stripe signature, shared secrets)
- No local imports between backend functions

### 6. Secrets Management
- Environment secrets managed via platform dashboard
- Never committed to code
- OAuth credentials stored per-tenant in IntegrationCredential entity

### 7. Security Event Monitoring
- **SystemSettings:** Platform-wide security posture (maintenance mode, shield level, AI kill switch)
- **shieldInterceptor:** Evaluates governance policies before high-risk actions
- Shield outcomes logged: pass, blocked, override_requested, override_approved, override_denied

### 8. Data Privacy
- User data visible only to user or admins/managers within tenant
- Analytics anonymised and aggregated
- Tenants configure analytics preferences
- AI is optional (ADR-0017)

### 9. Incident Response
- See [IncidentResponse.md](./IncidentResponse.md)
- AI kill switch for emergency response
- Maintenance mode for platform-wide issues

### 10. Data Retention
- `created_date` and `updated_date` on all records
- Data deletion governed by RLS
- Future: automated retention policies per entity type

## Compliance Alignment

- **SOC 2:** CC6.1 (Logical Access Controls), CC7.2 (System Operations), CC8.1 (Change Management)
- **ISO 27001:** A.9 (Access Control), A.12 (Operations Security), A.14 (System Acquisition)
- **Vanta:** Automated compliance evidence collection

## Status

This is a framework. Legal counsel and security team must review and finalise.

## Related Documents

- [PrivacyPolicy.md](./PrivacyPolicy.md) — Privacy policy
- [IncidentResponse.md](./IncidentResponse.md) — Incident response
- [../Architecture/SecurityCompliance.md](../Architecture/SecurityCompliance.md) — Security architecture
- [ComplianceChecklist.md](./ComplianceChecklist.md) — Compliance checklist