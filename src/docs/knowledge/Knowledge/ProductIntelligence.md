---
title: Orbitan Product Intelligence
category: Knowledge
owner: Product Owner
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - ../Architecture/OrbitEvolution.md
  - ../Architecture/OrbitNexus.md
  - KnowledgeHub.md
  - ImprovementLog.md
  - LessonsLearned.md
tags:
  - product-intelligence
  - operational-intelligence
  - analytics
  - orbit-evolution
  - product-health
---

# Orbitan Product Intelligence

## Purpose

Defines the product intelligence system — how OrbitanOS captures, analyses, and acts on operational data to continuously improve.

## Product Intelligence

Product intelligence is the capability to understand how the platform is being used, what works, what doesn't, and what to improve next.

### Sources
- `OrbitUsageTracker` — AI request metrics (tenant, service, model, credits, latency, status)
- `IssueLog` — Structured feedback with AI analysis (sentiment, priority, duplicates, tags)
- `WorkerFeedback` — Worker voice (suggestions, issues, praise, escalations)
- `EvolutionProposal` — AI-generated improvement proposals
- `AuditLog` — Operational patterns and governance outcomes
- `DeploymentLog` — Release history and deployment tracking

### Analysis
- `nexusFeedbackAnalyst` — AI analysis of feedback for sentiment, priority, duplicate detection, topic tagging
- `evolutionEngine` — Generates improvement proposals from usage pattern analysis
- `FeedbackIntelligenceDashboard` — Admin/founder view of feedback analytics

## Operational Intelligence

Operational intelligence is the real-time understanding of how tenants are using the platform:

- Module adoption rates (which modules are most/least used)
- Workflow execution patterns (which workflows complete vs. abandon)
- Error patterns (what fails and why)
- Performance metrics (API latency, page load times)
- AI usage patterns (which AI services are most valuable)

## Orbit Evolution

See [../Architecture/OrbitEvolution.md](../Architecture/OrbitEvolution.md) for the complete continuous improvement loop.

```
Observe → Understand → Recommend → Approve → Implement → Measure → Learn
```

## Analytics

- **Privacy-first:** Analytics use anonymised, aggregated data — never personal behaviour tracking
- **Tenant isolation:** Usage data never crosses tenant boundaries
- **Configurable:** Tenants can configure their analytics preferences
- **OrbitUsageTracker** records every AI request with model, latency, credits, status
- **AuditLog** captures every high-value operation with full context

## Product Health

Product health metrics:
- Pilot tenant engagement (are they actively using the platform?)
- Feature adoption (which features are used vs. ignored?)
- Feedback sentiment (are users frustrated or satisfied?)
- Error rates (how often do things break?)
- AI usage (is AI providing value?)

## Feedback Loop

```
Customer Feedback → Orbit Nexus Analysis → Product Backlog →
Development → Release → Customer Validation → Continuous Improvement
```

## Related Documents

- [../Architecture/OrbitEvolution.md](../Architecture/OrbitEvolution.md) — Continuous improvement loop
- [../Architecture/OrbitNexus.md](../Architecture/OrbitNexus.md) — Intelligence platform
- [KnowledgeHub.md](./KnowledgeHub.md) — Knowledge hub structure
- [ImprovementLog.md](./ImprovementLog.md) — Improvement tracking
- [LessonsLearned.md](./LessonsLearned.md) — Lessons learned