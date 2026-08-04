---
title: Orbitan Engineering Principles
category: Architecture
owner: Product Architecture
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - PlatformArchitecture.md
  - APIStandards.md
  - DatabaseStandards.md
  - ../development/DevelopmentRules.md
tags:
  - engineering
  - principles
  - modularity
  - scalability
  - maintainability
  - reusability
  - observability
---

# Orbitan Engineering Principles

## Purpose

Defines the core engineering principles that guide all development in the Orbitan ecosystem.

## Principles

### 1. Configuration Over Code
Adding an industry, module, or configuration should be a database record, not a code change. Registry-driven architecture (ActivationRegistry, PlatformManifest, SubscriptionPolicy) ensures scalability without deployment.

### 2. Modularity
Each module (Inventory, Procurement, Sales, Workforce, etc.) is independent. Modules can be enabled/disabled per tenant via PlatformManifest + SubscriptionPolicy. Cross-module communication uses `base44.functions.invoke()`.

### 3. Maintainability
- Small focused files (components of 50 lines or less)
- Every new component/page gets its own file
- shadcn/ui components from `@/components/ui`
- Tailwind CSS for styling
- Lucide icons only

### 4. Scalability
> Before implementing any feature, ask: **Will this still work when Orbit serves thousands of organisations, millions of users, multiple industries, and operates across multiple countries?**

### 5. Reusability
- Shared UI components (`PageHeader`, `StatCard`, `EmptyState`, `StatusBadge`)
- Shared hooks (`useNexusAI`, `useModuleAccess`, `useAdvisoryConfig`)
- Shared libraries (`orbitan-config.js`, `orbitan-identity.js`, `orbit-core.js`)
- Shared services (`OrbitanQuery.js`)

### 6. Observability
- AuditLog captures every high-value operation
- OrbitUsageTracker meters every AI request
- SystemSettings controls platform-wide posture
- Shield outcomes logged for governance traceability

### 7. No Business Logic in UI
Pages and components ask for results. Functions compute them. The Presentation layer renders data; the Service layer computes it.

### 8. Independent Deployability
Each Orbit product can be independently built, deployed, updated, and exported. Cross-module communication is exclusively via `base44.functions.invoke()`.

### 9. Graceful Degradation
OrbitanOS works without AI. If Orbit Nexus is unavailable, every core module continues to function. AI features are additive, not blocking.

### 10. Exit-Ready
All data models, API contracts, and business logic are owned by Orbitan, not the hosting provider. The `OrbitCore` adapter pattern creates a single migration point.

## Stack

- **UI Framework:** React + Tailwind CSS
- **Component Library:** shadcn/ui (`@/components/ui`)
- **Routing:** React Router (`react-router-dom`)
- **State & Data:** TanStack Query (`@tanstack/react-query`)
- **Backend Interface:** Base44 SDK (`@/api/base44Client`)
- **Icons:** `lucide-react`
- **Charts:** `recharts`
- **Forms:** `react-hook-form`
- **Dates:** `date-fns`, `moment`
- **Animations:** `framer-motion`

## Import Conventions

- Use `@/` alias for all imports (never relative `src/` paths)
- `cn` comes from `@/lib/utils`
- `createPageUrl` comes from `@/utils`
- Each shadcn component imported from its own file
- Lucide icons: alias if colliding with page/component names

## Related Documents

- [PlatformArchitecture.md](./PlatformArchitecture.md) — Platform architecture
- [APIStandards.md](./APIStandards.md) — API standards
- [DatabaseStandards.md](./DatabaseStandards.md) — Database standards
- [../development/DevelopmentRules.md](../development/DevelopmentRules.md) — Detailed development rules