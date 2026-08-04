---
title: Orbitan Compliance Checklist
category: Legal
owner: Product Owner
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - ../architecture/SecurityCompliance.md
  - SecurityPolicy.md
  - IncidentResponse.md
  - ../knowledge/DecisionRecords.md
tags:
  - legal
  - compliance
  - SOC2
  - ISO27001
  - Vanta
  - checklist
---

# Orbitan Compliance Checklist

## Purpose

Checklist for SOC 2, ISO 27001, and Vanta compliance readiness. Tracks implementation status of each control area.

## SOC 2 Controls

### CC1 — Control Environment
- [x] Organisational structure defined (6-role hierarchy)
- [x] Product Owner authority established
- [x] Decision Records document architectural decisions
- [ ] Formal security policy approved (see [SecurityPolicy.md](./SecurityPolicy.md))

### CC2 — Communication and Information
- [x] AuditLog captures all high-value operations
- [x] SystemSettings.status_message for platform status
- [x] MaintenanceView for maintenance communication
- [ ] Formal incident communication plan

### CC3 — Risk Assessment
- [x] Risk Register maintained (see [../knowledge/RiskRegister.md](../knowledge/RiskRegister.md))
- [x] RLS audit conducted (2026-07-11)
- [ ] Formal risk assessment process

### CC4 — Monitoring Activities
- [x] AuditLog immutable audit trail
- [x] OrbitUsageTracker monitors AI usage
- [x] Shield governance outcomes logged
- [ ] Formal security monitoring (SIEM)

### CC5 — Control Activities
- [x] RBAC with 6-role hierarchy
- [x] RLS tenant isolation on every entity
- [x] ModuleAccessPolicy per-tenant access matrix
- [x] Shield governance interceptor
- [x] GovernanceOverride approval workflow

### CC6 — Logical and Physical Access Controls
- [x] RBAC + RLS (logical access)
- [x] Encryption in transit (HTTPS)
- [x] Encryption at rest (platform-managed)
- [x] Secrets in environment variables
- [x] IntegrationCredential for per-tenant OAuth
- [x] MFA readiness (platform supports)
- [ ] MFA enforced for admin users
- [ ] SSO for enterprise (SAML/OIDC — future)

### CC7 — System Operations
- [x] Backend functions independently deployable
- [x] Git-based version control
- [x] DeploymentLog tracks deployments
- [x] PWA service worker for updates
- [ ] Formal change management process
- [ ] Automated deployment pipeline

### CC8 — Change Management
- [x] Decision Records document changes
- [x] Entity schemas are backward-compatible
- [x] `test_backend_function` for function testing
- [ ] Formal change approval process
- [ ] Staging environment

### CC9 — Risk Mitigation
- [x] Risk Register maintained
- [x] AI kill switch for emergency response
- [x] Maintenance mode for platform issues
- [x] Graceful degradation (OS works without AI)
- [ ] Formal business continuity plan (see [BusinessContinuity.md](./BusinessContinuity.md))
- [ ] Formal disaster recovery plan (see [DisasterRecovery.md](./DisasterRecovery.md))

## ISO 27001 Controls

### A.5 — Information Security Policies
- [x] Security architecture documented
- [ ] Formal security policy approved (see [SecurityPolicy.md](./SecurityPolicy.md))
- [ ] Acceptable use policy approved (see [AcceptableUse.md](./AcceptableUse.md))

### A.9 — Access Control
- [x] RBAC with 6-role hierarchy
- [x] RLS tenant isolation
- [x] ModuleAccessPolicy
- [x] Default deny (permissions explicitly granted)
- [x] MFA readiness
- [ ] MFA enforced for admins
- [ ] SSO for enterprise

### A.12 — Operations Security
- [x] AuditLog immutable audit trail
- [x] Shield governance interceptor
- [x] AI kill switch
- [x] Maintenance mode
- [ ] Formal incident response plan (see [IncidentResponse.md](./IncidentResponse.md))
- [ ] Malware protection

### A.14 — System Acquisition, Development and Maintenance
- [x] Platform-agnostic architecture (OrbitCore adapter)
- [x] Exit-ready data models (JSON schemas, portable)
- [x] Independent deployability (interface-first constraint)
- [x] Decision Records for architectural changes
- [ ] Secure development lifecycle (formal)
- [ ] Code review process (formal)

## Vanta Readiness

| Vanta Control Area | Status | Evidence |
|--------------------|--------|----------|
| Access Control | ✅ Implemented | RLS, ModuleAccessPolicy, 6-role hierarchy |
| Audit Logging | ✅ Implemented | AuditLog entity, immutable, comprehensive |
| Encryption | ✅ Platform-managed | HTTPS in transit, encrypted at rest |
| Incident Response | ⚠️ Partial | Kill switches; formal IR runbook needed |
| Data Retention | ⚠️ Partial | created_date/updated_date; automated retention TBD |
| Vendor Management | ⚠️ Partial | IntegrationCredential tracks services; formal inventory needed |
| Change Management | ✅ Partial | Decision Records + DeploymentLog; Git-based |
| Security Training | ❌ Not started | Training modules available; formal programme TBD |
| Background Checks | ❌ N/A | Platform control; HR process for Orbitan staff |

## MVP Compliance Status

For the MVP pilot:
- All "Implemented" controls above are active and enforced
- Security audit performed (2026-07-11)
- RLS tenant isolation validated
- Audit logging active on all high-value operations
- Shield governance interceptor operational

## Post-MVP (Pre-Compliance Audit)

- [ ] Formal incident response runbook
- [ ] Automated data retention policies
- [ ] Vendor management inventory
- [ ] Security training programme for Orbitan staff
- [ ] Vanta integration for continuous compliance monitoring
- [ ] MFA enforced for admin users
- [ ] SSO (SAML/OIDC) for enterprise
- [ ] Formal change management process
- [ ] Staging environment
- [ ] Formal risk assessment process
- [ ] SIEM for security monitoring

## Related Documents

- [../architecture/SecurityCompliance.md](../architecture/SecurityCompliance.md) — Security architecture
- [SecurityPolicy.md](./SecurityPolicy.md) — Security policy
- [IncidentResponse.md](./IncidentResponse.md) — Incident response
- [../knowledge/DecisionRecords.md](../knowledge/DecisionRecords.md) — ADR-0022 (Enterprise Compliance Readiness)