# OrbitanOS MVP Roadmap

> **North Star:** Within two months from 30 May 2026, deliver an MVP that allows
> pilot tenants to genuinely run parts of their daily operations through OrbitanOS,
> gather feedback, validate assumptions, and establish the foundation for future
> growth of the Orbitan ecosystem.

> **Build Philosophy:** Build less. Validate more.

## Timeline

- **Start:** 30 May 2026
- **Target end:** ~30 July 2026 (Day 60)
- **Today:** 7 July 2026 (Day 38)
- **Remaining:** ~3 weeks

## Pilot Tenants (Validation Only)

| Tenant | Industry | Status | Validation Focus |
|--------|----------|--------|-----------------|
| Taqueria Pte Ltd (La Birria Tacos) | F&B | Active pilot | Inventory, Procurement, Sales, Reconciliation, Xero, Workforce |
| Renewed Resources Pte Ltd | Recycling & Sustainability | Active pilot | Recycling ops, Material recovery, Compliance |
| Renewed Fashion | Retail | Planning stage | Reuse/repurpose workflows |
| Home-Based Businesses (Izaliqa Bakes) | HBB | Planning stage | Lightweight HBB workflows, seasonal orders |

## MVP Success Criteria

The MVP should prove that OrbitanOS can:
- Manage workforce operations
- Manage inventory and procurement
- Manage financial workflows
- Support multi-industry operations
- Generate meaningful operational data
- Collect real-world feedback
- Validate the architecture

## Required MVP Modules

1. **Employee Management** — Directory, roles, invitations, profiles, permissions, org/brand/outlet assignment
2. **Attendance & Shifts** — Clock in/out, breaks, lunch, shift planning, timesheets, reports
3. **Inventory Management** — Stock, replenishment, counts, low-stock alerts, transfers, adjustments, reports
4. **Procurement** — Suppliers, POs, receiving, cost calculations, stock costing, reports
5. **Sales & Invoicing** — Invoice creation, receipt upload, daily reconciliation, expense tracking, payment tracking
6. **Finance Integration** — Xero integration, export functions, reconciliation support, reports
7. **Home-Based Business Pack** — Customer orders, inventory, procurement, production planning, expense tracking, sales invoicing
8. **AIReceipts (MVP)** — Upload, OCR extraction, auto-categorisation, supplier detection, daily reconciliation support, Xero preparation

## Sprint Progress

| Sprint | Focus | Status |
|--------|-------|--------|
| Sprint 1 | Foundation (auth, multi-tenancy, roles, org structure) | ✅ Complete |
| Sprint 2 | Workforce (employees, attendance, clock, shifts) | ✅ Complete |
| Sprint 3 | Operations (inventory, procurement, suppliers, POs) | ✅ Complete |
| Sprint 4 | Financial Workflows (sales, AIReceipts, reconciliation, Xero) | ✅ Complete |
| Sprint 5 | Pilot Preparation (dashboards, reports, bug fixes, permissions, mobile, test data, export) | 🔄 In Progress |

## Explicitly OUT of MVP Scope

- Marketplace
- Advanced Automations
- Complex AI Agents
- White Labelling
- Enterprise Features
- Excessive Customisation

These can come after validation.

## AIReceipts MVP Scope (Keep V1 Simple)

- Upload receipts / invoices / screenshots
- OCR extraction
- Auto-categorisation
- Supplier detection
- Daily reconciliation support
- Xero preparation (payload builder ready, live API when connector authorised)

## Product Feedback & Continuous Improvement System

The feedback system creates a continuous improvement loop:

```
Customer Feedback → Orbit Nexus Analysis → Product Backlog →
Development → Release → Customer Validation → Continuous Improvement
```

**Components:**
- `IssueLog` entity — structured feedback intake with lifecycle (New → Under Review → Accepted → Planned → In Development → Testing → Released → Closed)
- `ReportIssueModal` — submission UI with categories, severity, attachments, auto-captured session context
- `nexusFeedbackAnalyst` — AI analysis: sentiment, priority, duplicate detection, topic tagging
- `FeedbackIntelligenceDashboard` — admin/founder view of feedback analytics

---

**Last Updated:** 2026-07-07