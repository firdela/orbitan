---
title: Orbitan Product Roadmap
category: Product
owner: Product Owner
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - ../development/MVPRoadmap.md
  - ProductStrategy.md
  - GoToMarket.md
tags:
  - roadmap
  - mvp
  - pilot
  - enterprise
  - phases
---

# Orbitan Product Roadmap

## Purpose

Defines the phased delivery plan from MVP through enterprise launch and future expansion.

## Roadmap Phases

### Phase 1 — MVP (Current)
**Timeline:** 30 May 2026 → ~30 July 2026 (Day 60)

**Goal:** Deliver an MVP that allows pilot tenants to genuinely run parts of their daily operations through OrbitanOS, gather feedback, validate assumptions, and establish the foundation for future growth.

**Build Philosophy:** Build less. Validate more.

**Modules:**
1. Employee Management — Directory, roles, invitations, profiles, permissions
2. Attendance & Shifts — Clock in/out, breaks, shift planning, timesheets
3. Inventory Management — Stock, replenishment, counts, low-stock alerts
4. Procurement — Suppliers, POs, receiving, cost calculations
5. Sales & Invoicing — Invoice creation, receipt upload, daily reconciliation
6. Finance Integration — Xero integration, export functions
7. Home-Based Business Pack — Customer orders, inventory, production planning
8. AIReceipts (MVP) — Upload, OCR extraction, auto-categorisation, supplier detection

**Status:** Sprints 1–4 complete. Sprint 5 (Pilot Preparation) in progress.

### Phase 2 — Public Launch
**Timeline:** Post-MVP (Q3–Q4 2026)

**Goal:** Open OrbitanOS for self-serve external customer onboarding.

**Key Deliverables:**
- Self-serve organisation creation wizard
- Stripe checkout for paid plans (live)
- Public marketing landing page
- Onboarding diagnostics (Find My Solution wizard)
- Subscription policy enforcement
- Documentation and help centre

### Phase 3 — Enterprise
**Timeline:** 2027

**Goal:** Enterprise compliance certification and enterprise sales motion.

**Key Deliverables:**
- SOC 2 Type I certification
- ISO 27001 certification
- Vanta continuous compliance monitoring
- White-label deployment capability
- Enterprise SLA and dedicated support
- Advanced AI agents (scheduling, procurement, financial)
- MCP Server for external AI tool integration

### Future Releases (Post-Enterprise)
- Orbit Marketplace (apps & extensions)
- AquaOrbit (Aquarist OS)
- ChefOrbit (Kitchen OS)
- Multi-currency / multi-region
- Per-tenant Stripe Connect (marketplace revenue splitting)
- Advanced ABAC (Attribute-Based Access Control)

## Explicitly OUT of MVP Scope

- Marketplace
- Advanced Automations
- Complex AI Agents
- White Labelling
- Enterprise Features
- Excessive Customisation

These can come after validation.

## Product Feedback & Continuous Improvement System

```
Customer Feedback → Orbit Nexus Analysis → Product Backlog →
Development → Release → Customer Validation → Continuous Improvement
```

**Components:**
- `IssueLog` entity — structured feedback intake with lifecycle
- `ReportIssueModal` — submission UI with categories, severity, attachments
- `nexusFeedbackAnalyst` — AI analysis: sentiment, priority, duplicate detection
- `FeedbackIntelligenceDashboard` — admin/founder view of feedback analytics

## Related Documents

- [../development/MVPRoadmap.md](../development/MVPRoadmap.md) — Detailed sprint plan
- [ProductStrategy.md](./ProductStrategy.md) — Product positioning
- [GoToMarket.md](./GoToMarket.md) — Market entry strategy