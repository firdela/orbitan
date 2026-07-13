---
title: Orbitan Data Processing Agreement Framework
category: Legal
owner: Product Owner
status: Draft
version: 0.1
last_updated: 2026-07-13
related:
  - PrivacyPolicy.md
  - SecurityPolicy.md
  - ../Architecture/SecurityCompliance.md
tags:
  - legal
  - DPA
  - data-processing
  - GDPR
  - controller
  - processor
---

# Orbitan Data Processing Agreement Framework

## Purpose

Framework for the Data Processing Agreement (DPA) between Orbitan (Processor) and tenant organisations (Controllers). Must be reviewed by legal counsel.

## Roles

- **Data Controller:** The tenant organisation (determines purposes and means of processing)
- **Data Processor:** Orbitan (processes data on behalf of the Controller)
- **Sub-processors:** Base44 (hosting), Stripe (payments), Xero (accounting, when authorised)

## Data Processing Terms

### 1. Scope of Processing
- Orbitan processes tenant data solely to provide the OrbitanOS platform
- Processing includes: storage, retrieval, computation, audit logging, analytics (anonymised)
- AI processing is optional and governed by kill switch

### 2. Data Categories
- **Personal data:** Email, full name, role, phone (Employee entity)
- **Organisational data:** Tenant, company, outlet, department, team structure
- **Operational data:** Inventory, procurement, sales, workforce, compliance records
- **Financial data:** Invoices, reconciliations, wallet transactions
- **Authentication data:** Login timestamps, IP addresses (for audit)

### 3. Data Subject Rights
- Tenants are responsible for handling data subject requests
- Orbitan assists by providing data export (JSON/CSV) capabilities
- Data deletion via tenant admin (RLS-governed)

### 4. Security Measures
- See [SecurityPolicy.md](./SecurityPolicy.md) and [../Architecture/SecurityCompliance.md](../Architecture/SecurityCompliance.md)
- Encryption in transit and at rest
- RLS tenant isolation
- RBAC with 6-role hierarchy
- Immutable audit logs
- Shield governance interceptor

### 5. Sub-processors
- **Base44** — Cloud hosting platform
- **Stripe** — Payment processing
- **Xero** — Accounting integration (when authorised by tenant)
- Tenants notified of new sub-processors

### 6. Data Location
- Data stored on Base44 cloud infrastructure
- Future: multi-region data residency

### 7. Data Return and Deletion
- Tenants can export all data as JSON/CSV at any time
- On termination, data retained for 30 days for export, then deleted
- `created_date` and `updated_date` tracked for lifecycle

### 8. Audit and Compliance
- AuditLog entity provides immutable audit trail
- Vanta can reference Decision Records as evidence
- SOC 2 / ISO 27001 compliance (post-MVP)

## Status

This is a framework, not a published DPA. Legal counsel must review and finalise.

## Related Documents

- [PrivacyPolicy.md](./PrivacyPolicy.md) — Privacy policy
- [SecurityPolicy.md](./SecurityPolicy.md) — Security policy
- [../Architecture/SecurityCompliance.md](../Architecture/SecurityCompliance.md) — Security architecture