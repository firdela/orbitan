---
title: Orbitan Platform Architecture
category: Architecture
owner: Product Architecture
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - OrbitCore.md
  - OrbitNexus.md
  - OrbitServices.md
  - DataArchitecture.md
  - EngineeringPrinciples.md
  - ../product/MasterVision.md
tags:
  - architecture
  - three-layer
  - multi-tenant
  - scalability
  - platform
---

# Orbitan Platform Architecture

## Purpose

Defines the three-layer architecture, platform services, data flow, tenant isolation, and scalability principles for OrbitanOS.

## Architecture Overview

OrbitanOS is a multi-tenant, modular enterprise operating system built for workforce, inventory, operations, finance, sustainability, and growth. It is designed to be **platform-agnostic at its core** — the business logic, data models, and API contracts are owned by Orbitan, not by any hosting provider.

## Three-Layer Architecture

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

## Platform Layers

### Layer 1: Presentation (UI)
- React + Tailwind CSS + shadcn/ui components
- Pages render data from backend functions/entities
- No business logic, no calculations, no direct API calls (except via `base44` SDK)
- Routing: React Router with dynamic `/workspace/:tenantId/*` paths

### Layer 2: Service Logic (Backend Functions)
- Deno-compatible JavaScript
- All business rules, calculations, integrations, AI routing
- Auth verification via `base44.auth.me()` on every function
- Cross-module communication via `base44.functions.invoke()`
- Independent deployment — each function deploys separately

### Layer 3: Data (Entities)
- JSON Schema definitions (`.jsonc` files)
- Row-Level Security (RLS) on every entity
- Portable to any database (PostgreSQL, MongoDB, Supabase)
- Built-in fields: `id`, `created_date`, `updated_date`, `created_by_id`

## Tenant & Industry Pack Architecture

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
└── Tenant N: [Future Customer]
    ├── Industry: [Any]
    └── Pack: [Selected Pack]
```

### Tenant Isolation
All entity records are scoped by `tenant_id` and `outlet_id`. Row-Level Security (RLS) is enforced at the entity schema level. No tenant can access another tenant's data.

## Data Flow

```
User Action (UI)
  → base44.entities.X.create/update/delete() (SDK)
    → RLS checks (tenant_id + outlet_id + role)
    → Entity record created/updated
    → AuditLog entry (if high-value action)
    → Shield interceptor (if governance-gated)
    → FinanceSyncQueue (if financial event)
      → financeController (payload builder)
        → External API (Xero/Stripe)
```

## Integrations

- **Xero** — Finance integration via OAuth + `IntegrationCredential` entity
- **Stripe** — Subscription billing (live mode)
- **Google** — OAuth SSO
- **Future:** QuickBooks, Slack, Shopify, Google Workspace connectors

## Scalability

> Before implementing any feature, ask: **Will this still work when Orbit serves thousands of organisations, millions of users, multiple industries, and operates across multiple countries?**

- Registry-driven: adding an industry = a database record
- Dynamic routing: `/workspace/:tenantId/*` serves all tenants with one codebase
- Manifest-driven navigation: adding a module = a manifest record
- Wallet-native ledger: no ERP dependency for core operations
- Independent deployability: each product deploys independently

## Exit Strategy — Migration Checklist

If OrbitanOS is ever migrated away from Base44:

### Step 1 — Export Data
- Export all entity records as JSON/CSV
- Map each entity to a target database table (PostgreSQL recommended)

### Step 2 — Port Backend Functions
- Copy `/functions` to Node.js/Express or AWS Lambda
- Replace `Deno.serve()` with Express route handlers
- Replace `createClientFromRequest(req)` with new auth middleware
- Replace `base44.entities.X.list()` with ORM queries (Prisma, Sequelize)

### Step 3 — Port the UI
- Copy `/src` to a new Vite + React project
- Replace `import { base44 } from "@/api/base44Client"` with `axios`/`fetch` wrapper
- Routing, styling, and component logic require zero changes

### Step 4 — Validate API Contracts
- Refer to [APIStandards.md](./APIStandards.md) for function endpoint contracts

### Step 5 — Auth Migration
- Replace `base44.auth.me()` with new JWT/session-based auth
- Update `ProtectedRoute` and `AuthContext`

## Related Documents

- [OrbitCore.md](./OrbitCore.md) — Foundational layer and core entities
- [OrbitNexus.md](./OrbitNexus.md) — Intelligence platform architecture
- [OrbitServices.md](./OrbitServices.md) — Platform service registry
- [DataArchitecture.md](./DataArchitecture.md) — Data models and migration
- [EngineeringPrinciples.md](./EngineeringPrinciples.md) — Engineering standards
- [../product/MasterVision.md](../product/MasterVision.md) — Ecosystem vision