---
title: Orbitan Terms of Service Framework
category: Legal
owner: Product Owner
status: Draft
version: 0.1
last_updated: 2026-07-13
related:
  - PrivacyPolicy.md
  - SubscriptionFramework.md
  - AcceptableUse.md
tags:
  - legal
  - terms
  - service
  - subscription
  - SLA
---

# Orbitan Terms of Service Framework

## Purpose

Framework for the Orbitan terms of service. Must be reviewed by legal counsel before publication.

## Key Sections

### 1. Acceptance of Terms
- By using OrbitanOS, user agrees to these terms
- Organisation admin accepts on behalf of all users

### 2. Description of Service
- OrbitanOS: Workforce Operating System
- Orbit Nexus: AI & Intelligence Platform (separate subscription)
- Subscription plans defined in [SubscriptionFramework.md](../Product/SubscriptionFramework.md)

### 3. Account Registration
- Organisation admin creates tenant
- Users invited via Invitation entity
- Users must be real persons associated with the organisation

### 4. Subscription and Billing
- Plans: Free, Starter (S$49), Growth (S$149), Business (S$399), Enterprise (custom)
- Billed monthly via Stripe (live mode)
- Pilot mode: `SystemSettings.billing_paused` — pilot tenants bypass billing
- Upgrades: proration handled by Stripe
- Downgrades: Graceful Lockout (modules visible but greyed out)

### 5. Acceptable Use
- See [AcceptableUse.md](./AcceptableUse.md)
- No illegal activities
- No abuse, harassment, or unauthorised access
- No reverse engineering or scraping

### 6. Data and Privacy
- See [PrivacyPolicy.md](./PrivacyPolicy.md)
- Tenant owns their data
- Orbitan processes data on behalf of tenants
- Data exportable as JSON/CSV

### 7. AI Usage
- AI features are optional (ADR-0017)
- AI kill switch can disable AI globally (ADR-0018)
- AI usage metered via OrbitanWallet credits
- AI does not replace human decision-making

### 8. Intellectual Property
- Orbitan owns the platform, software, and brand
- Tenant owns their data
- No licence to reverse engineer

### 9. Service Availability
- Best-effort availability during pilot phase
- Maintenance mode via `SystemSettings.maintenance_mode`
- Enterprise SLA (post-MVP)

### 10. Limitation of Liability
- Service provided "as is"
- No liability for indirect, consequential damages
- Liability capped at subscription fees paid

### 11. Termination
- Tenant can cancel subscription at any time
- Orbitan can terminate for violation of terms
- Data retained for 30 days after termination for export

### 12. Changes to Terms
- Users notified of material changes
- Terms version tracked

## Status

This is a framework, not published terms of service. Legal counsel must review and finalise before publication.

## Related Documents

- [PrivacyPolicy.md](./PrivacyPolicy.md) — Privacy policy
- [../Product/SubscriptionFramework.md](../Product/SubscriptionFramework.md) — Subscription plans
- [AcceptableUse.md](./AcceptableUse.md) — Acceptable use policy