# ODR-0022: Enterprise Compliance Readiness — SOC 2, ISO 27001, Vanta

**Date:** 2026-07-12
**Status:** Accepted
**Product Owner:** Muhammad Firdaus Bin Ismail
**Impacted Modules:** Orbit Shield, Orbit ID, AuditLog, SystemSettings, IntegrationCredential, all RLS-governed entities

---

## Decision

Architect OrbitanOS and Orbit Nexus from day one to be enterprise-ready and capable of supporting future compliance programmes such as SOC 2, ISO 27001, and other common security standards. Design the platform so it can be efficiently audited and managed using compliance platforms such as Vanta.

## Context

Retrofitting compliance into a platform that wasn't designed for it is expensive, time-consuming, and risky. By building security and governance best practices into the architecture from day one, OrbitanOS can pursue compliance certification efficiently when the business is ready.

The pilot tenant programme provides the initial test surface for validating these controls in real-world conditions.

## Compliance Controls Built Into Architecture

### 1. Secure Authentication & MFA Readiness
- Platform auth backend manages tokens, sessions, email verification
- Google OAuth implemented; additional SSO providers available (Microsoft, Apple, Facebook)
- MFA readiness: platform supports MFA enrollment (to be activated pre-compliance audit)
- Password reset flow with token-based verification

### 2. Role-Based Access Control (RBAC) with Least-Privilege
- 6-role hierarchy: admin → tenant_admin → client_manager → outlet_manager → supervisor → worker
- `ModuleAccessPolicy` entity provides per-tenant, per-role, per-module access matrix
- Default deny: permissions are explicitly granted, not assumed
- RLS enforces tenant + outlet isolation at the database level (every entity carries `tenant_id`)

### 3. Tenant Data Isolation
- Every operational entity carries `tenant_id` and (where applicable) `outlet_id`
- RLS policies enforce `data.tenant_id === {{user.data.tenant_id}}` for all non-admin roles
- `tenant_admin` role has cross-outlet visibility within their tenant only
- No cross-tenant data access is possible through the standard SDK

### 4. Encryption
- **In transit:** All API calls over HTTPS
- **At rest:** Platform-managed encryption for database and file storage
- **Secrets:** API keys and OAuth secrets stored as environment secrets, never in code

### 5. Comprehensive Audit Logs
- `AuditLog` entity captures: actor, role, action, target entity, target record, previous state, new state, details, IP address, shield outcome, override reference, justification, evidence URLs
- AuditLog is **immutable** — update and delete are admin-only (for correction, not routine modification)
- Every high-value operation (document verification, stock adjustment, status change, override approval) is logged

### 6. Secure API Architecture
- All backend functions authenticate via `base44.auth.me()` before executing
- Admin-only functions verify `user.role === 'admin'` and return 403 otherwise
- Webhook endpoints validate request authenticity (Stripe signature verification, shared secrets)
- No local imports between backend functions — each deploys independently

### 7. Secrets & Key Management
- Environment secrets managed via platform dashboard (never committed to code)
- OAuth credentials stored per-tenant in `IntegrationCredential` entity (encrypted by platform)
- Stripe keys, Xero secrets, and other API keys are environment variables

### 8. Security Event Logging & Monitoring
- `SystemSettings` entity controls platform-wide security posture (maintenance mode, shield level, AI kill switch)
- `shieldInterceptor` evaluates governance policies before high-risk actions
- Shield outcomes logged to AuditLog: pass, blocked, override_requested, override_approved, override_denied
- `GovernanceOverride` entity tracks approval workflows for policy exceptions

### 9. Data Retention & Deletion Readiness
- Entity records carry `created_date` and `updated_date` for lifecycle tracking
- Data deletion is governed by RLS (only admins/tenant_admins can delete)
- Future: automated data retention policies per entity type (to be implemented pre-compliance audit)

### 10. Privacy-by-Design
- User data (email, full_name) is only visible to the user themselves or admins/managers within their tenant
- `Employee` RLS allows workers to see only their own record
- Analytics (Orbit Evolution) uses anonymised, aggregated data — never personal behaviour tracking
- Tenants can configure their analytics preferences

### 11. Compliance-Friendly Documentation
- Knowledge Hub (this directory) serves as the single source of truth for architecture decisions
- Decision Records (ADRs/ODRs) document every significant architectural choice with rationale
- `src/docs/knowledge-hub/security-audit-2026-07-11.md` contains the initial security audit
- Vanta can reference these documents as evidence of control implementation

## Vanta Readiness Assessment

| Vanta Control Area | OrbitanOS Status | Evidence |
|--------------------|------------------|----------|
| Access Control | ✅ Implemented | RLS, ModuleAccessPolicy, 6-role hierarchy |
| Audit Logging | ✅ Implemented | AuditLog entity, immutable, comprehensive |
| Encryption | ✅ Platform-managed | HTTPS in transit, encrypted at rest |
| Incident Response | ⚠️ Partial | SystemSettings kill switches; formal IR runbook needed |
| Data Retention | ⚠️ Partial | created_date/updated_date tracked; automated retention TBD |
| Vendor Management | ⚠️ Partial | IntegrationCredential tracks connected services; formal vendor inventory needed |
| Change Management | ✅ Partial | Decision Records + DeploymentLog entity; Git-based deployment |
| Security Training | ❌ Not started | Training modules available via Orbit Nexus; formal security training TBD |
| Background Checks | ❌ Not applicable | Platform control; HR process for Orbitan staff |

## MVP Scope

For the MVP pilot:
- All "Implemented" controls above are active and enforced
- Security audit performed (see security-audit-2026-07-11.md)
- RLS tenant isolation validated
- Audit logging active on all high-value operations
- Shield governance interceptor operational

Post-MVP (pre-compliance audit):
- Formal incident response runbook
- Automated data retention policies
- Vendor management inventory
- Security training programme for Orbitan staff
- Vanta integration for continuous compliance monitoring

## Trade-offs

| Aspect | Impact |
|--------|--------|
| **Enterprise credibility** | **Positive** — Compliance-ready architecture attracts enterprise customers |
| **Audit efficiency** | **Positive** — Vanta can automate evidence collection from existing controls |
| **Development velocity** | **Neutral** — Controls are built in, not bolted on; minimal ongoing overhead |
| **Pilot complexity** | **Neutral** — Controls don't add friction for pilot tenants (RLS is transparent) |

## Future Review Date

**2026-10-01** — Begin formal SOC 2 Type I preparation if pilot validation is successful and enterprise customer pipeline warrants it. Engage Vanta for continuous compliance monitoring setup.

---

**Related ADRs:** ADR-0003 (Shield Governance Interceptor), ADR-0016 (RLS Tenant Isolation), ADR-0020 (Orbit ID), ADR-0018 (AI Kill Switch)