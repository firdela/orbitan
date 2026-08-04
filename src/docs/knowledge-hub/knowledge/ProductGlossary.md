---
title: Orbitan Product Glossary
category: Knowledge
owner: Product Architecture
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - ../product/NamingConventions.md
  - ../README.md
tags:
  - glossary
  - terminology
  - definitions
  - orbit
  - orbitan
---

# Orbitan Product Glossary

## Purpose

Defines every Orbit terminology used across the ecosystem. Ensures consistent language in documentation, code, and communication.

## Terms

### A

**ActivationRegistry** — Entity storing industry blueprints: compliance templates, provisioning pipelines, governance thresholds, trust pillars, AI governance config. Keyed by `pack_key` (e.g., `fnb`, `retail`, `recycling`, `hbb`).

**ADR (Architecture Decision Record)** — Document recording a significant architectural decision with context, alternatives, decision, trade-offs, and future review date.

**AIReceipts** — Orbit Nexus AI service for OCR extraction, auto-categorisation, and supplier detection from uploaded receipts and invoices.

**AuditLog** — Immutable entity capturing all high-value events across OrbitanOS. Includes actor, action, target, previous/new state, shield outcome, and evidence.

### B

**Blueprint Studio** — Visual configuration tool for industry packs (future). Part of Orbit Builder.

### C

**Core Entities** — Immutable foundational entities (Tenant, Company, Client, Outlet, Employee, etc.) that all Orbit products share. Product modules must never add fields to Core entities.

**Customer Profile** — Entity for retail pack customer profiles, purchase history, and loyalty.

### D

**DashboardLayout** — Entity for customizable widget layouts per user/role.

**Dynamic Trust Threshold** — Industry-specific governance threshold for procurement transactions (HBB=S$50, F&B=S$200, Retail=S$300, Enterprise=configurable). Procurement above threshold requires GovernanceOverride.

### E

**EvolutionProposal** — Entity storing AI-generated improvement proposals with full lifecycle (pending_review → approved → implemented → measuring → completed).

### F

**FinanceSyncQueue** — Async broker for ERP integration. Events queued with sync_status (pending → synced → error). Supports Xero, QuickBooks, MYOB, manual_export.

**Find My Solution** — AI-powered diagnostic wizard (ADR-0015) that asks problem-prescription questions and generates a ProvisioningManifest for onboarding.

### G

**Graceful Degradation** — Principle that OrbitanOS works fully without AI (ADR-0017). AI features are additive, not blocking.

**Graceful Lockout** — UI pattern where locked modules (not in subscription plan) are visible but greyed out, creating upsell visibility.

**GovernancePolicy** — Shield policy-as-code registry entity. Defines rules for blocking, monitoring, or remediating sensitive actions.

**GovernanceOverride** — Entity providing the release valve for Shield policy exceptions. Requires manager justification + evidence.

### I

**Industry Pack** — Configuration bundle for a specific industry (F&B, Retail, Recycling, etc.) that activates relevant modules, workflows, and compliance templates. Stored in ActivationRegistry.

**IntegrationCredential** — Entity for per-tenant OAuth credential storage. Admin-only. Service type is free-text string (extensible to any service).

**Interface-First Constraint** — Rule that all cross-module communication uses `base44.functions.invoke()`. No direct imports between modules (ADR-0010).

### K

**Kill Switch** — Global AI shutdown mechanism via `SystemSettings.nexus_ai_enabled`. Instant, no redeployment (ADR-0018).

### M

**ManifestHydrator** — Runtime component that fetches PlatformManifest + SubscriptionPolicy, intersects via allowed_modules, and renders navigation.

**ModuleAccessPolicy** — Entity providing per-tenant, per-role, per-module access matrix. Default deny — permissions explicitly granted.

### O

**Orbit** — Prefix reserved for shared platform services. The engines that power the ecosystem. (e.g., Orbit Shield, Orbit Nexus, Orbit Wallet).

**Orbitan** — The company and master brand. The organisation behind the ecosystem.

**OrbitanOS** — The flagship SaaS platform. The Workforce Operating System.

**Orbit Core** — Foundational platform services (Auth, Tenancy, Identity, Audit, Config). Immutable entities shared across all Orbit products.

**Orbit Nexus** — Intelligence Platform (AI, RAG, AIReceipts, Integration Hub). Marketed as standalone subscription product.

**Orbit Shield** — Security & Governance service. Policy-as-code, override workflow, compliance.

**Orbit Connect** — Integrations & Connectors service. Xero, QuickBooks, Google, Slack, Shopify.

**Orbit Wallet** — Payments & Credits service. Orbitan Credits, cashback, procurement debit.

**Orbit Evolution** — Continuous improvement loop: Observe → Understand → Recommend → Approve → Implement → Measure → Learn (ADR-0019).

**Orbit ID** — Identity & Access Management. Human, machine, and AI agent governance (ADR-0020).

**OrbitCore (adapter)** — Platform-agnostic data access layer (`src/lib/orbit-core.js`). Single migration point when switching platforms (ADR-0023).

**OrbitUsageTracker** — Entity capturing AI usage metrics (tenant, service, model, credits, latency, status) for metering and pattern analysis.

### P

**Pilot Tenants** — Current organisations (Taqueria, Renewed Resources, Renewed Fashion, Izaliqa Bakes) used for real-world validation. NOT the product's purpose.

**PlatformManifest** — Entity storing UI/navigation blueprints. Navigation tree, widget layout, module routing. Keyed by `manifest_key`.

### R

**RAG (Retrieval-Augmented Generation)** — AI technique where the Knowledge Hub is indexed for semantic search, enabling context-aware AI responses.

**Registry-Driven Architecture** — Pattern where industry logic lives in database records (ActivationRegistry), not hardcoded (ADR-0001).

**RLS (Row-Level Security)** — Database-level security enforcing tenant + outlet isolation on every entity.

### S

**Shield** — See Orbit Shield.

**SubscriptionPolicy** — Entity defining commercial entitlement per plan. Allowed modules, packs, limits, features, pricing. Keyed by `plan_key`.

### T

**6-R Principles** — Renew, Relate, Respond, Refine, Regulate, Reach. The guiding philosophy for the Orbitan ecosystem.

**Tenant** — An organisation on the platform. Every entity is scoped by `tenant_id`.

### W

**Wallet-Native Ledger** — Model where OrbitanOS is the master financial ledger, and ERP (Xero) is downstream via async FinanceSyncQueue (ADR-0002).

## Related Documents

- [../product/NamingConventions.md](../product/NamingConventions.md) — Naming standard
- [../README.md](../README.md) — Orbit Knowledge Library