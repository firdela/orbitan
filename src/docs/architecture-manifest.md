# OrbitanOS — Architecture Manifest
> **Product Owner:** Muhammad Firdaus Bin Ismail, Founder — Orbitan  
> **Version:** 1.0.0  
> **Date:** 2026-06-04  
> **Status:** Living Document — update on every major architectural decision

---

## 1. Mission Statement

OrbitanOS is a multi-tenant, modular enterprise operating system built for workforce, inventory, operations, finance, sustainability, and growth. It is designed to be **platform-agnostic at its core** — the business logic, data models, and API contracts are owned by Orbitan, not by any hosting provider.

---

## 2. The Three-Layer Architecture

```
┌─────────────────────────────────────────────────────┐
│  LAYER 1: PRESENTATION (UI)                         │
│  /pages   /components                               │
│  React + Tailwind CSS                               │
│  → Renders data. Contains NO business logic.        │
├─────────────────────────────────────────────────────┤
│  LAYER 2: SERVICE LOGIC (Backend Functions)         │
│  /functions                                         │
│  Standard JavaScript (Deno-compatible)              │
│  → All business rules, calculations, integrations.  │
├─────────────────────────────────────────────────────┤
│  LAYER 3: DATA (Entities / Schema)                  │
│  /entities                                          │
│  JSON Schema definitions                            │
│  → Portable to any document or relational DB.       │
└─────────────────────────────────────────────────────┘
```

### The Golden Rule
> **No business logic in UI files.** Pages and components ask for results. Functions compute them.

---

## 3. Tenant & Industry Pack Architecture

OrbitanOS operates a **multi-tenant, multi-pack** model. Each tenant activates a set of Modules and Industry Packs. The underlying platform code is shared.

```
OrbitanOS Platform
│
├── Tenant 1: Taqueria Pte Ltd
│   ├── Industry: Food & Beverage
│   ├── Pack: F&B Pack
│   ├── Brand/Client: La Birria Tacos
│   └── Outlet: La Birria Tacos (North Bridge Rd)
│
├── Tenant 2: Renewed Resources Pte Ltd
│   ├── Industry: Recycling & Sustainability
│   └── Pack: Recycling & Sustainability Pack
│
└── Tenant 3: [Retail Operations]
    ├── Industry: Retail
    └── Pack: Retail Pack
```

### Tenant Isolation
All entity records are scoped by `tenant_id` and `outlet_id`. Row-Level Security (RLS) is enforced at the entity schema level. No tenant can access another tenant's data.

---

## 4. Module Registry

Modules are reusable platform capabilities shared across all industry packs.

| Module Key          | Description                                      | Current Status |
|---------------------|--------------------------------------------------|----------------|
| `inventory`         | Stock tracking, par levels, alerts               | Active         |
| `procurement`       | Purchase orders, suppliers, goods receipt        | Active         |
| `sales_invoice`     | Sales invoicing, COGS, payment tracking          | Active         |
| `workforce`         | Employees, clock-in/out, scheduling              | Active         |
| `task`              | Task assignment, completion tracking             | Active         |
| `compliance`        | Audit logs, food safety, licensing               | Active         |
| `reporting`         | Financial and operational dashboards             | Active         |
| `finance_xero`      | Xero accounting integration                      | Active         |
| `replenishment`     | AI-driven stock replenishment alerts             | Active         |
| `customer_mgmt`     | Customer profiles, loyalty, purchase history     | Active         |
| `scheduling`        | Shift scheduling and rota management             | Active         |

---

## 5. Industry Pack Registry

Packs configure modules with industry-specific workflows, templates, and UI.

| Pack Key                    | Industry              | Colour    | Tenants Using        |
|-----------------------------|-----------------------|-----------|----------------------|
| `fnb_pack`                  | Food & Beverage       | `#F97316` | Taqueria Pte Ltd     |
| `recycling_sustainability`  | Recycling             | `#16A34A` | Renewed Resources    |
| `retail_pack`               | Retail                | `#22C55E` | Retail Operations    |
| `healthcare_pack`           | Healthcare            | `#06B6D4` | Future              |
| `education_pack`            | Education             | `#8B5CF6` | Future              |
| `logistics_pack`            | Logistics             | `#2563EB` | Future              |

---

## 6. Backend Function Registry

All business logic lives here. These files are portable to any Node.js/Deno-compatible environment.

| Function Name        | Responsibility                                           | Called By              |
|----------------------|----------------------------------------------------------|------------------------|
| `financeController`  | Xero sync, document verification, journal entries        | FnBXero page, automations |
| `replenishmentEngine`| Stock burn rate analysis, alert generation               | Scheduled automation   |
| `clockController`    | Clock-in/out verification, GPS, photo, labour cost calc  | FnBClockIn page        |

> **Migration Note:** To migrate these to a new hosting environment, copy each file to a standard Node.js/Express route handler. Replace `Deno.serve(async (req) =>` with `app.post('/functionName', async (req, res) =>`. The business logic inside requires zero changes.

---

## 7. Entity (Data Model) Registry

All entities are defined as JSON Schema files in `/entities`. They are exportable to any database.

| Entity               | Pack/Module             | Key Relationships                          |
|----------------------|-------------------------|--------------------------------------------|
| `Tenant`             | Core Platform           | Parent of all records                      |
| `Company`            | Core Platform           | Belongs to Tenant                          |
| `Outlet`             | Core Platform           | Belongs to Tenant/Company                  |
| `Employee`           | Workforce Module        | Belongs to Tenant/Outlet                   |
| `ClockRecord`        | Workforce Module        | Belongs to Employee/Shift                  |
| `Shift`              | Workforce Module        | Belongs to Outlet                          |
| `InventoryItem`      | Inventory Module        | Belongs to Outlet                          |
| `Supplier`           | Procurement Module      | Belongs to Tenant                          |
| `PurchaseOrder`      | Procurement Module      | Links Supplier → InventoryItems            |
| `GoodsReceipt`       | Procurement Module      | Links PurchaseOrder                        |
| `ReplenishmentAlert` | Replenishment Module    | Links InventoryItem                        |
| `Recipe`             | F&B Pack                | Links MenuItem → InventoryItems (BOM)      |
| `SalesInvoice`       | Sales Module            | Belongs to Outlet, links to Xero           |
| `DailyReconciliation`| Sales Module            | Belongs to Outlet, links to Xero           |
| `FoodSafetyLog`      | Compliance Module       | Belongs to Outlet/Shift                    |
| `ComplianceRecord`   | Compliance Module       | Belongs to Outlet                          |
| `Task`               | Task Module             | Belongs to Outlet, assignable to Employee  |
| `AccountMapping`     | Finance Module          | Maps Orbitan categories → Xero COA codes  |
| `FinanceMapping`     | Finance Module          | Orbitan record ↔ Xero GUID registry       |
| `MaterialCollection` | Recycling Pack          | Belongs to Tenant (Renewed Resources)      |
| `ProductCatalog`     | Retail Pack             | Belongs to Tenant (Retail Operations)      |
| `CustomerProfile`    | Retail Pack             | Belongs to Tenant/Outlet                   |

---

## 8. Role Hierarchy

```
admin                   → Platform Owner (Orbitan team only)
  └── tenant_admin      → Manages one Tenant (e.g., Taqueria CEO)
        └── client_manager   → Manages brands/clients within a Tenant
              └── outlet_manager  → Manages one Outlet
                    └── supervisor     → Senior staff, limited management
                          └── worker         → Frontline staff
```

---

## 9. OrbitanOS Operating Cycle (The 6 R's)

The platform is designed around six interconnected principles:

| Principle  | Represents                                   | Platform Capability             |
|------------|----------------------------------------------|---------------------------------|
| **Renew**  | Continuous learning, growth, sustainability  | Reporting, AI recommendations   |
| **Relate** | People, teams, communication                 | Workforce, Scheduling, Tasks    |
| **Respond**| Operations, execution, service delivery      | Tasks, Clock-in, Compliance     |
| **Refine** | Process improvement, analytics, AI           | Replenishment Engine, Reporting |
| **Regulate**| Compliance, governance, audit               | Compliance Module, Audit Trails |
| **Reach**  | Expansion, multi-outlet, multi-country       | Multi-Tenant, Multi-Pack arch   |

---

## 10. Subscription Plan Reference

| Plan                  | Price         | Max Employees | Packs       | AI    |
|-----------------------|---------------|---------------|-------------|-------|
| Orbitan Starter       | S$49/month    | 10            | None        | No    |
| Orbitan Growth        | S$149/month   | 50            | 1 Pack      | Basic |
| Orbitan Business      | S$399/month   | 250           | Multi-Pack  | Full  |
| Orbitan Enterprise    | Custom (from S$1,999/month) | Unlimited | All Packs | Full AI Suite |

---

## 11. Exit Strategy — Migration Checklist

If OrbitanOS is ever migrated away from Base44, follow these steps:

### Step 1 — Export Data
- Export all entity records as JSON/CSV from the Base44 dashboard.
- Map each entity to a target database table (PostgreSQL recommended for relational integrity).

### Step 2 — Port Backend Functions
- Copy all files from `/functions` to a new Node.js/Express or AWS Lambda project.
- Replace `Deno.serve(async (req) =>` with standard Express route handlers.
- Replace `createClientFromRequest(req)` with your new auth middleware.
- Replace `base44.entities.X.list()` with standard ORM queries (e.g., Prisma, Sequelize).

### Step 3 — Port the UI
- Copy `/src` (pages, components, lib) to a new Vite + React project.
- Replace `import { base44 } from "@/api/base44Client"` with a standard `axios` or `fetch` wrapper pointing to your new API endpoints.
- All routing, styling (Tailwind), and component logic requires zero changes.

### Step 4 — Validate API Contracts
- Refer to `docs/api-contracts.md` to ensure all function endpoints accept and return the same JSON shapes as documented.

### Step 5 — Auth Migration
- Replace Base44 auth (`base44.auth.me()`) with your new JWT/session-based auth system.
- Update `ProtectedRoute` and `AuthContext` to use the new auth provider.

---

*This document is the property of Orbitan. Maintained by the Platform Owner.*