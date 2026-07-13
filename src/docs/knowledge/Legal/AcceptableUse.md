---
title: Orbitan Acceptable Use Policy
category: Legal
owner: Product Owner
status: Draft
version: 0.1
last_updated: 2026-07-13
related:
  - TermsOfService.md
  - SecurityPolicy.md
tags:
  - legal
  - acceptable-use
  - AUP
  - policy
---

# Orbitan Acceptable Use Policy

## Purpose

Defines acceptable use of the OrbitanOS platform and Orbit Nexus services.

## Acceptable Use

Users may use OrbitanOS for:
- Managing their organisation's workforce, operations, finance, and compliance
- Creating, editing, and managing entity records within their tenant
- Using AI features (when subscribed) for business intelligence and automation
- Integrating with authorised third-party services (Xero, Stripe)
- Exporting their own data as JSON/CSV

## Prohibited Use

Users may NOT:

### 1. Access or Attempt to Access Other Tenants' Data
- No cross-tenant data access attempts
- No exploitation of RLS vulnerabilities
- No sharing of credentials between tenants

### 2. Abuse the Platform
- No denial of service attacks
- No excessive API calls beyond fair use
- No automated scraping or crawling
- No reverse engineering of the platform

### 3. Use AI for Harmful Purposes
- No generating malicious content
- No using AI to deceive or defraud
- No using AI to process personal data without consent
- AI usage is metered — no attempts to bypass credit system

### 4. Illegal Activities
- No illegal activities on the platform
- No storage of illegal content
- No money laundering or financial crimes
- No violations of applicable laws (Singapore PDPA, GDPR, etc.)

### 5. Intellectual Property Violations
- No uploading copyrighted material without permission
- No trademark violations
- No distribution of pirated software

### 6. Security Violations
- No sharing of credentials
- No attempts to bypass authentication
- No introduction of malware or malicious code
- No unauthorised access attempts

### 7. Misuse of Governance
- No fraudulent override requests
- No abuse of GovernanceOverride workflow
- No falsifying audit evidence

## Enforcement

### Automated
- RLS prevents cross-tenant data access
- Shield governance interceptor blocks high-risk actions
- OrbitUsageTracker monitors AI usage
- AuditLog captures all actions for review

### Manual
- Product Owner can suspend tenants for violations
- `Tenant.status` can be set to `suspended`
- Access revoked for violating users

## Reporting Violations

- Report security incidents via the platform
- Report acceptable use violations to the Product Owner
- All reports investigated and acted upon

## Consequences

### For Users
- Warning for first minor violation
- Account suspension for repeated or serious violations
- Access revocation for severe violations

### For Tenants
- Warning for first minor violation
- Tenant suspension for repeated or serious violations
- Data retained for 30 days after suspension for export
- Permanent termination for severe violations

## Status

This is a framework. Legal counsel must review and finalise before publication.

## Related Documents

- [TermsOfService.md](./TermsOfService.md) — Terms of service
- [SecurityPolicy.md](./SecurityPolicy.md) — Security policy