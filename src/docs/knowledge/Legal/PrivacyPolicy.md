---
title: Orbitan Privacy Policy Framework
category: Legal
owner: Product Owner
status: Draft
version: 0.1
last_updated: 2026-07-13
related:
  - TermsOfService.md
  - DataProcessing.md
  - SecurityPolicy.md
  - CookiePolicy.md
  - ../Architecture/SecurityCompliance.md
tags:
  - legal
  - privacy
  - GDPR
  - PDPA
  - data-protection
---

# Orbitan Privacy Policy Framework

## Purpose

Framework for the Orbitan privacy policy. Must be reviewed by legal counsel before publication. This document outlines the key sections and principles that the privacy policy must cover.

## Key Principles

1. **Privacy-by-design** — User data is only visible to the user themselves or admins/managers within their tenant
2. **Tenant isolation** — Data never crosses tenant boundaries
3. **Anonymised analytics** — Orbit Evolution uses anonymised, aggregated data, never personal behaviour tracking
4. **Configurable** — Tenants can configure their analytics preferences
5. **Encryption** — Data encrypted in transit (HTTPS) and at rest (platform-managed)

## Required Sections

### 1. Information We Collect
- Account information (email, full name, role)
- Organisation information (tenant, company, outlet, employee data)
- Usage data (anonymised, aggregated)
- Authentication data (login timestamps, IP addresses for audit)

### 2. How We Use Information
- Providing the OrbitanOS platform
- Authentication and access control
- Analytics and product improvement (anonymised)
- Audit logging and compliance
- Communication (notifications, announcements)

### 3. How We Share Information
- Not sold to third parties
- Shared with tenants (their own data)
- Shared with integration providers (Xero, Stripe) only when authorised by tenant
- Shared with law enforcement when legally required

### 4. Data Retention
- Entity records retained while tenant is active
- `created_date` and `updated_date` tracked on all records
- Data deletion governed by RLS (only admins/tenant_admins can delete)
- Future: automated data retention policies per entity type

### 5. Data Security
- Encryption in transit (HTTPS) and at rest (platform-managed)
- RLS tenant isolation on every entity
- RBAC with 6-role hierarchy
- Shield governance interceptor for sensitive actions
- Immutable audit logs
- Secrets management (environment variables, never in code)

### 6. User Rights
- Access their own data
- Request data export (JSON/CSV)
- Request data deletion (via tenant admin)
- Configure analytics preferences

### 7. AI and Data
- AI features are optional (ADR-0017)
- AI kill switch can disable all AI globally (ADR-0018)
- AI usage metered via OrbitUsageTracker
- AI does not process personal behaviour data — only operational data

### 8. International Data Transfers
- Data stored on Base44 infrastructure (cloud)
- Future: multi-region data residency

### 9. Children's Privacy
- Orbitan is a B2B platform; not intended for use by children under 16

### 10. Changes to This Policy
- Users notified of material changes
- Policy version tracked

## Compliance References

- **Singapore PDPA** (Personal Data Protection Act)
- **GDPR** (General Data Protection Regulation) — for EU customers (future)
- **SOC 2** — Privacy principle
- **ISO 27001** — Information security management

## Status

This is a framework, not a published privacy policy. Legal counsel must review and finalise before publication.

## Related Documents

- [TermsOfService.md](./TermsOfService.md) — Terms of service
- [DataProcessing.md](./DataProcessing.md) — Data processing agreement
- [SecurityPolicy.md](./SecurityPolicy.md) — Security policy
- [CookiePolicy.md](./CookiePolicy.md) — Cookie policy
- [../Architecture/SecurityCompliance.md](../Architecture/SecurityCompliance.md) — Security architecture