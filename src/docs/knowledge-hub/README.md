# Orbitan Knowledge Hub

> **The single source of truth for the Orbit ecosystem.**
> This directory is the "brain" behind Orbitan's evolution.

---

## 🧊 Frozen Foundations v1.0 — 2026-07-23

The three foundational Reference Architectures are **FROZEN**. Build Mode is **ON**.
Git baseline tag: `v1.0-foundation-freeze`.

| Pillar | ID | Status | Document |
| :--- | :--- | :--- | :--- |
| Architecture Governance | RA-0000 | Frozen | [RA-0000.md](./decision-records/RA-0000.md) |
| Platform Services | RA-0004 | Frozen | [RA-0004.md](./decision-records/RA-0004.md) |
| Identity Architecture | RA-0005 | Frozen | [RA-0005.md](./decision-records/RA-0005.md) |

**Foundation documents:**
- [Orbitan Frozen Foundations v1.0](./foundations/Orbitan-Frozen-Foundations-v1.md)
- [Orbitan MVP Charter](./foundations/MVP-Charter.md)
- [Orbitan Build Manifest v1.0](./foundations/Build-Manifest.md)

> **Build Mode rules:** No silent redesign. Implementation-first. AFR compliance per
> merge. Docs updated alongside code. New architecture requires governed ADRs.
> Discussion Mode returns only for foundational changes.

---

## Purpose

The Knowledge Hub stores architecture decisions, master vision, product principles,
roadmap, industry packs, modules, standards, research, legal frameworks, and
improvement logs in AI-friendly Markdown format. Orbit Nexus RAG ingestion indexes
these documents so AI conversations can retrieve historical context, explain design
decisions, and recommend improvements.

## Directory Structure

```
knowledge-hub/
├── README.md                    ← you are here (index)
├── CHANGELOG.md                 ← build changelog
├── master-vision.md             ← ecosystem vision, product distinction, org architecture
├── golden-ui-ux-standard.md     ← non-negotiable design & accessibility standards
├── mvp-roadmap.md               ← sprint plan, scope, build philosophy
├── pilot-tenants.md             ← pilot tenant registry (validation only, not the product)
├── defect-register.md           ← classified defect registry
├── known-limitations.md         ← platform limitations
├── security-audit-2026-07-11.md ← security audit report
├── foundations/                 ← 🧊 Frozen Foundations v1.0
│   ├── Orbitan-Frozen-Foundations-v1.md
│   ├── MVP-Charter.md
│   └── Build-Manifest.md
├── decision-records/            ← ADRs + Reference Architectures (RA-0000/0004/0005)
│   ├── RA-0000.md               ← Architecture Governance Framework (FROZEN)
│   ├── RA-0004.md               ← Platform Services Architecture (FROZEN)
│   ├── RA-0005.md               ← Identity Architecture (FROZEN)
│   └── 0001–0066 ADRs
├── implementation-notes/         ← Build package implementation reports
├── product/                     ← Product strategy, branding, subscriptions, marketing
│   ├── NorthStar.md
│   ├── MasterVision.md
│   ├── BrandGuidelines.md
│   ├── SubscriptionFramework.md
│   ├── NamingConventions.md
│   ├── BusinessModel.md
│   ├── GoToMarket.md
│   ├── Marketing.md
│   ├── CompetitorResearch.md
│   ├── ProductRoadmap.md
│   └── ProductStrategy.md
├── architecture/                ← Technical architecture, security, data, API standards
│   ├── PlatformArchitecture.md
│   ├── OrbitCore.md
│   ├── OrbitNexus.md
│   ├── OrbitServices.md
│   ├── DataArchitecture.md
│   ├── DatabaseStandards.md
│   ├── APIStandards.md
│   ├── EngineeringPrinciples.md
│   ├── SecurityCompliance.md
│   ├── PerformanceStandards.md
│   ├── AIPrinciples.md
│   └── OrbitEvolution.md
├── design/                      ← Design standards, accessibility, responsive
│   ├── Accessibility.md
│   ├── DesignPrinciples.md
│   └── ResponsiveStandards.md
├── development/                 ← Engineering rules, testing, release, mobile, MVP roadmap
│   ├── DevelopmentRules.md
│   ├── TestingStandards.md
│   ├── ReleaseProcess.md
│   ├── MobileStrategy.md
│   ├── MVPRoadmap.md
│   ├── PilotProgramme.md
│   └── BuildChecklist.md
├── knowledge/                   ← Product intelligence, glossary, risk register, improvement log
│   ├── RiskRegister.md
│   ├── ProductGlossary.md
│   ├── ImprovementLog.md
│   ├── LessonsLearned.md
│   ├── FutureIdeas.md
│   ├── FounderNotes.md
│   ├── ProductIntelligence.md
│   ├── KnowledgeHub.md
│   └── DecisionRecords.md
├── research/                    ← Competitor analysis
│   ├── ServiceNow.md
│   ├── Workday.md
│   ├── WorkOS.md
│   ├── Rippling.md
│   ├── Odoo.md
│   ├── Monday.md
│   ├── Shopify.md
│   ├── Apple.md
│   ├── Google.md
│   ├── Microsoft.md
│   └── FutureResearch.md
├── legal/                       ← Legal frameworks (drafts — require legal counsel review)
│   ├── PrivacyPolicy.md
│   ├── TermsOfService.md
│   ├── DataProcessing.md
│   ├── SecurityPolicy.md
│   ├── IncidentResponse.md
│   ├── BusinessContinuity.md
│   ├── DisasterRecovery.md
│   ├── AcceptableUse.md
│   ├── CookiePolicy.md
│   └── ComplianceChecklist.md
└── *.md                         ← Operational runbooks and checklists
```

## How to Use

1. **Before making changes:** Read the relevant ADR to understand *why* something
   was built a certain way. Do not contradict decisions recorded here unless the
   Product Owner explicitly asks for a revision.

2. **When making a significant decision:** Create a new ADR using the template
   at the bottom of this file. Number it sequentially (0007, 0008, ...).

3. **When discovering improvements:** Add to the relevant document or create a
   new one. Cross-link related documents.

## Canonical Documents

| Topic | Location |
| :--- | :--- |
| Master Vision | [master-vision.md](./master-vision.md) |
| Golden UI/UX Standard | [golden-ui-ux-standard.md](./golden-ui-ux-standard.md) |
| MVP Roadmap | [mvp-roadmap.md](./mvp-roadmap.md) |
| Pilot Tenants | [pilot-tenants.md](./pilot-tenants.md) |
| Naming Conventions | [product/NamingConventions.md](./product/NamingConventions.md) |
| Subscription Framework | [product/SubscriptionFramework.md](./product/SubscriptionFramework.md) |
| Brand Guidelines | [product/BrandGuidelines.md](./product/BrandGuidelines.md) |
| Security & Compliance | [architecture/SecurityCompliance.md](./architecture/SecurityCompliance.md) |
| Risk Register | [knowledge/RiskRegister.md](./knowledge/RiskRegister.md) |
| Product Glossary | [knowledge/ProductGlossary.md](./knowledge/ProductGlossary.md) |
| Improvement Log | [knowledge/ImprovementLog.md](./knowledge/ImprovementLog.md) |

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

## AI Memory Protocol

When Orbit Nexus RAG is operational, it will:
1. Index all `.md` files in this directory
2. Enable queries like "Why was AIReceipts designed this way?"
3. Cross-link related decisions
4. Recommend improvements based on historical context

Until then, these documents serve as human-readable institutional memory.

---

**Product Owner:** Muhammad Firdaus Bin Ismail
**Last Updated:** 2026-08-04 (Build #28.2G.1 — Post-Validation Cleanup: jsconfig fix + legacy ADR migration)