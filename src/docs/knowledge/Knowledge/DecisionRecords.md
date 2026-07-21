---
title: Orbitan Decision Records Index
category: Knowledge
owner: Product Architecture
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - KnowledgeHub.md
  - ../README.md
tags:
  - decision-records
  - ADR
  - ODR
  - architecture
  - institutional-memory
---

# Orbitan Decision Records Index

## Purpose

Index of all Architecture Decision Records (ADRs) and Orbit Decision Records (ODRs) with summaries. Each decision is documented with: Decision ID, Title, Context, Problem Statement, Alternatives Considered, Decision Made, Rationale, Trade-offs, Impacted Components, Date, Status, and Future Review Date.

Full ADR/ODR content is preserved in the legacy directory `src/docs/knowledge-hub/decision-records/` and `src/docs/decision-records/`. This index provides a searchable summary for RAG retrieval.

## Decision Records

### ADR-0001: Registry-Driven Architecture
- **Date:** 2026-06-01
- **Status:** Accepted
- **Impacted Modules:** ActivationRegistry, PlatformManifest, SubscriptionPolicy, onboardingService, ManifestHydrator
- **Summary:** Adopt registry-driven architecture using three entity registries (ActivationRegistry, PlatformManifest, SubscriptionPolicy). Adding an industry = add a database record, not code changes. Configuration over code.
- **Future Review:** 2026-10-01
- **Legacy Path:** `src/docs/knowledge-hub/decision-records/0001-registry-driven-architecture.md`

### ADR-0002: Wallet-Native Ledger
- **Date:** 2026-06-15
- **Status:** Accepted
- **Impacted Modules:** OrbitanWallet, WalletTransaction, FinanceSyncQueue, walletEngine, financeController
- **Summary:** Adopt wallet-native ledger model — OrbitanOS is master ledger, ERP is downstream via async FinanceSyncQueue. Works for HBBs with no ERP and enterprises with Xero. `ledger_sync_mode` controls ERP push.
- **Future Review:** 2026-09-01
- **Legacy Path:** `src/docs/knowledge-hub/decision-records/0002-wallet-native-ledger.md`

### ADR-0003: Shield Governance Interceptor
- **Date:** 2026-06-20
- **Status:** Accepted
- **Impacted Modules:** GovernancePolicy, GovernanceOverride, AuditLog, shieldInterceptor, ShieldGuard.js
- **Summary:** Adopt policy-as-code interceptor model. Centralised policy registry (GovernancePolicy), backend interceptor function (shieldInterceptor), client-side guard (ShieldGuard.js), and override release valve (GovernanceOverride). Two modes: Auditor (notify) / Guardian (block).
- **Future Review:** 2026-08-15
- **Legacy Path:** `src/docs/knowledge-hub/decision-records/0003-shield-governance-interceptor.md`

### ADR-0004: Dynamic Workspace Routing
- **Date:** 2026-06-05
- **Status:** Accepted
- **Impacted Modules:** App.jsx routes, WorkspaceLayout, RoleGateway
- **Summary:** Adopt dynamic path-parameter routing (`/workspace/:tenantId/*`). Single set of page components reused for all tenants. Tenant ID is a UUID — no pilot tenant leakage. WorkspaceLayout validates user belongs to the requested tenant.
- **Future Review:** 2027-01-01
- **Legacy Path:** `src/docs/knowledge-hub/decision-records/0004-dynamic-workspace-routing.md`

### ADR-0005: Manifest-Driven Navigation
- **Date:** 2026-06-10
- **Status:** Accepted
- **Impacted Modules:** PlatformManifest, ManifestHydrator, ManifestNav, WorkspaceLayout, SubscriptionPolicy
- **Summary:** Navigation is data, not code. PlatformManifest stores navigation tree, SubscriptionPolicy controls visibility, ManifestHydrator intersects at runtime. Graceful Lockout: locked modules visible but greyed out (upsell opportunity).
- **Future Review:** 2026-10-01
- **Legacy Path:** `src/docs/knowledge-hub/decision-records/0005-manifest-driven-navigation.md`

### ADR-0006: Orbit Nexus Intelligence Platform
- **Date:** 2026-07-01
- **Status:** Accepted
- **Impacted Modules:** nexus, OrbitUsageTracker, nexusFeedbackAnalyst, all AI-powered features
- **Summary:** Adopt Nexus Gateway Pattern with three responsibilities: Think (AI engines), Connect (Integration Hub), Act (Automation). Central entry point for all intelligence requests. OrbitUsageTracker meters every request. OrbitanWallet debited per request.
- **Future Review:** 2026-09-01
- **Legacy Path:** `src/docs/knowledge-hub/decision-records/0006-orbit-nexus-intelligence-platform.md`

### ADR-0007: Delegated Integration Hub (IntegrationCredential)
- **Date:** 2026-07-07
- **Status:** Accepted
- **Impacted Modules:** IntegrationCredential, financeController, FinanceSyncQueue
- **Summary:** Create IntegrationCredential entity for per-tenant OAuth credential storage. Admin-only create/update/delete. Service type is free-text string — extensible to any future service. PaymentAudit NOT created (WalletTransaction + AuditLog already cover it).
- **Future Review:** When adding Stripe Connect for marketplace
- **Legacy Path:** `src/docs/knowledge-hub/decision-records/0007-delegated-integration-hub.md`

### ADR-0008: Orbit Naming Standards
- **Date:** 2026-07-08
- **Status:** Accepted
- **Impacted Modules:** All branding, navigation, documentation
- **Summary:** Adopt layered naming hierarchy: "Orbitan" for company/master brand, "OrbitanOS" for flagship OS, "Orbit" prefix for shared platform services. Mirrors Microsoft, Google, Apple naming patterns. Scales to dozens of future services without clutter.
- **Future Review:** 2027-01-01
- **Legacy Path:** `src/docs/knowledge-hub/decision-records/0008-orbit-naming-standards.md`

### ADR-0009: Orbit Core Boundary
- **Date:** 2026-07-08
- **Status:** Accepted
- **Impacted Modules:** All entity schemas, all backend functions, all frontend pages
- **Summary:** Establish Orbit Core as an immutable foundational layer. Core entities (Tenant, Company, Outlet, Employee, etc.) are shared and stable. Product modules reference Core via tenant_id/outlet_id/employee_id — they never modify Core entity schemas. Core entity changes require an ADR.
- **Future Review:** 2026-12-01
- **Legacy Path:** `src/docs/knowledge-hub/decision-records/0009-orbit-core-boundary.md`

### ADR-0010: Independent Deployability (Interface-First Constraint)
- **Date:** 2026-07-08
- **Status:** Accepted
- **Impacted Modules:** All frontend pages, all backend functions
- **Summary:** All cross-module communication via `base44.functions.invoke()`. No direct imports of Nexus code into OrbitanOS. OrbitanOS can be exported/deployed independently. Graceful degradation when Nexus is unavailable.
- **Future Review:** 2026-12-01
- **Legacy Path:** `src/docs/knowledge-hub/decision-records/0010-independent-deployability.md`

### ADR-0011: Orbit Naming Migration
- **Date:** 2026-07-09
- **Status:** Confirmed
- **Summary:** Rename shared platform services from "Orbitan [Service]" to "Orbit [Service]". Internal code identifiers (entity keys, CSS tokens) remain unchanged. Only user-facing labels updated.
- **Legacy Path:** `src/docs/decision-records/0011-orbit-naming-migration.md`

### ADR-0012: Knowledge Hub & Decision Records
- **Date:** 2026-07-09
- **Status:** Confirmed
- **Summary:** Initialize structured Knowledge Hub for institutional memory. Markdown documents serve as RAG source for Orbit Nexus. Decision Records document every significant architectural decision.
- **Legacy Path:** `src/docs/decision-records/0012-knowledge-hub-init.md`

### ADR-0013: Orbit Naming Architecture Lock-In & Stripe Product Alignment
- **Date:** 2026-07-09
- **Status:** Accepted
- **Summary:** Lock the three-tier naming hierarchy as permanent brand standard. Stripe products renamed to "OrbitanOS [Plan]". Codebase, Stripe, and UI all aligned. "Orbit" prefix reserved exclusively for platform services.
- **Future Review:** 2027-07-09
- **Legacy Path:** `src/docs/knowledge-hub/decision-records/0013-orbit-naming-architecture-lock-in.md`

### ODR-0014: Orbit Naming Architecture — "Orbitan" vs "Orbit" Prefix
- **Date:** 2026-07-10
- **Status:** Accepted
- **Summary:** Formalize dual-prefix naming convention. "Orbitan" for company/master brand/OS products. "Orbit" for shared platform services. Customer-facing hierarchy: "OrbitanOS by Orbitan — powered by Orbit Nexus, Orbit Shield, and Orbit Connect."
- **Future Review:** 2027-07-10
- **Legacy Path:** `src/docs/knowledge-hub/decision-records/0014-orbit-naming-architecture-dual-prefix.md`

### ADR-0015: Find My Solution — AI-Powered Diagnostic Wizard
- **Date:** 2026-07-10
- **Status:** Accepted
- **Summary:** Implement AI-powered diagnostic wizard as step 0 of onboarding. 5 stages: Intent, Compliance, Industry, Scale, AI Prescription. Uses InvokeLLM (Claude Sonnet 4.6) to generate ProvisioningManifest. Non-destructive — user can adjust. Skippable.
- **Future Review:** January 2027
- **Legacy Path:** `src/docs/knowledge-hub/decision-records/0015-find-my-solution-diagnostic-wizard.md`

### ADR-0016: RLS Tenant Isolation Standard
- **Date:** 2026-07-11
- **Status:** Accepted
- **Summary:** Formalize RLS patterns every entity must follow: mandatory tenant scoping, outlet sub-scoping, role hierarchy enforcement, self-reference pattern using `{{user.id}}` (not `{{user.full_name}}`), admin-only financial entities, immutable audit entities. Aligns with SOC 2 CC6.1 and ISO 27001 A.9.
- **Future Review:** 2026-10-11
- **Legacy Path:** `src/docs/knowledge-hub/decision-records/0016-rls-tenant-isolation-standard.md`

### ADR-0017: OrbitanOS Graceful Degradation — OS Works Without AI
- **Date:** 2026-07-11
- **Status:** Accepted
- **Summary:** OrbitanOS modules are AI-optional by design. No module page imports or calls nexus during core workflow execution. AI features are additive, not blocking. All AI calls go through `useNexusAI` hook which returns `ai_available: false` instead of throwing.
- **Future Review:** 2026-09-01
- **Legacy Path:** `src/docs/knowledge-hub/decision-records/0017-orbitanos-graceful-degradation-no-ai-dependency.md`

### ADR-0018: Orbit Nexus AI Kill Switch Pattern
- **Date:** 2026-07-11
- **Status:** Accepted
- **Summary:** Global AI kill switch via `SystemSettings.nexus_ai_enabled`. When false, nexus gateway returns `ai_disabled: true` for every request. Checked BEFORE Shield and BEFORE wallet — highest-priority gate. Instant, no redeployment. Controlled from Shield Command Center.
- **Future Review:** 2026-09-01
- **Legacy Path:** `src/docs/knowledge-hub/decision-records/0018-ai-kill-switch-pattern.md`

### ODR-0019: Orbit Evolution — Continuous Improvement Loop
- **Date:** 2026-07-12
- **Status:** Accepted
- **Summary:** Establish Orbit Evolution as core strategic capability. Closed loop: Observe → Understand → Recommend → Approve → Implement → Measure → Learn. EvolutionProposal entity, evolutionEngine function, proactive_approval governance mode. Privacy-first, human-in-control.
- **Future Review:** 2026-12-01
- **Legacy Path:** `src/docs/knowledge-hub/decision-records/0019-orbit-evolution-continuous-improvement-loop.md`

### ODR-0020: Orbit ID — Identity, Access & AI Governance
- **Date:** 2026-07-12
- **Status:** Accepted
- **Summary:** Expand Orbit ID beyond RBAC to govern human, machine, and AI agent identities. Business Access Intelligence as differentiator — links identity, permissions, business workflows, and AI decisions into single auditable trail. AI agent governance via ActivationRegistry.ai_governance.
- **Future Review:** 2026-12-01
- **Legacy Path:** `src/docs/knowledge-hub/decision-records/0020-orbit-id-identity-access-ai-governance.md`

### ODR-0021: Orbit Nexus — Standalone Subscription Framework
- **Date:** 2026-07-12
- **Status:** Accepted
- **Summary:** Establish Orbit Nexus as standalone AI & Intelligence subscription product. Plans: Free (S$0), Pro (S$39), Team (S$149), Enterprise (Custom). Customers can subscribe without OrbitanOS. MVP bundles AI within OrbitanOS plans; standalone is post-MVP.
- **Future Review:** 2026-09-01
- **Legacy Path:** `src/docs/knowledge-hub/decision-records/0021-orbit-nexus-standalone-subscription-framework.md`

### ODR-0022: Enterprise Compliance Readiness — SOC 2, ISO 27001, Vanta
- **Date:** 2026-07-12
- **Status:** Accepted
- **Summary:** Architect OrbitanOS and Orbit Nexus from day one for SOC 2, ISO 27001, and Vanta-readiness. 11 compliance controls built into architecture: secure auth, RBAC, tenant isolation, encryption, audit logs, secure APIs, secrets management, security event logging, data retention, privacy-by-design, compliance documentation.
- **Future Review:** 2026-10-01
- **Legacy Path:** `src/docs/knowledge-hub/decision-records/0022-enterprise-compliance-readiness.md`

### ODR-0023: Orbit Core Adapter Pattern
- **Date:** 2026-07-12
- **Status:** Approved
- **Summary:** Implement platform-agnostic data access layer (`src/lib/orbit-core.js`). All new modules import from `@/lib/orbit-core` instead of `@/api/base44Client` directly. Single migration point when switching platforms. Additive — existing code unchanged.
- **Future Review:** 2026-09-30
- **Legacy Path:** `src/docs/knowledge-hub/decision-records/0023-orbit-core-adapter-pattern.md`

### ADR-0045: GitHub Integration Verification Checkpoint
- **Date:** 2026-07-21
- **Status:** Accepted
- **Impacted Modules:** GitHub sync, platform governance, audit trail
- **Summary:** Periodic verification checkpoint confirming two-way GitHub code sync remains active (repo `firdela/orbitan`, private, `main` branch) and the GitHub API Connector is intentionally NOT authorised to minimise external dependency. ADR-0038 remains the master strategy document — this ADR avoids duplication and records a dated audit snapshot. Also documents the concurrent Shield procurement threshold calibration (300→50 SGD for 48h) per ADR-0043.
- **Future Review:** 2026-08-04
- **Legacy Path:** `src/docs/knowledge-hub/decision-records/0045-github-integration-verification-checkpoint.md`

### ADR-0046: Capability-Tiered Orchestrator (Registry-Driven Intelligence)
- **Date:** 2026-07-21
- **Status:** Accepted
- **Impacted Modules:** NexusCapabilityRegistry, nexus, all AI capabilities, OrbitanWallet, OrbitUsageTracker, sanitizationGate
- **Summary:** Transition the `nexus` gateway from a hardcoded `SERVICE_REGISTRY` constant to a registry-driven dispatcher backed by the new `NexusCapabilityRegistry` entity. Capabilities are tiered: Tier 1 (Deterministic Regulator, stateless), Tier 2 (Assistant Synthesizer, Shield-gated LLM), Tier 3 (Autonomous Delegate, enterprise + high trust). Every capability declares its sanitization mode (ADR-0044 Zero-PII), governance domain binding, plan tier requirement, and fallback capability. The legacy static constant is preserved as an in-memory `LEGACY_FALLBACK_REGISTRY` for zero-downtime migration and outage resilience. Adding/swapping an AI capability = one database row, not a code deploy.
- **Future Review:** 2026-10-01
- **Legacy Path:** `src/docs/knowledge-hub/decision-records/0046-capability-tiered-orchestrator.md`

## ADR Template

```markdown
# ADR-XXXX: [Decision Title]

**Date:** YYYY-MM-DD
**Status:** Accepted | Superseded | Deprecated
**Impacted Modules:** [list]

## Context
[Why is this decision needed? What problem does it solve?]

## Alternatives Considered
[What other approaches were evaluated? Why were they rejected?]

## Decision
[What was chosen and why.]

## Trade-offs
[What are the consequences — positive and negative?]

## Future Review Date
[When should this decision be revisited?]
```

## Related Documents

- [KnowledgeHub.md](./KnowledgeHub.md) — Knowledge hub structure
- [../README.md](../README.md) — Orbit Knowledge Library