---
title: Orbit Evolution — Continuous Improvement Loop
category: Architecture
owner: Product Architecture
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - OrbitNexus.md
  - AIPrinciples.md
  - ../Knowledge/ProductIntelligence.md
  - ../Knowledge/DecisionRecords.md
tags:
  - orbit-evolution
  - continuous-improvement
  - self-improving
  - observation
  - recommendations
---

# Orbit Evolution — Continuous Improvement Loop

## Purpose

Defines the continuous improvement loop that makes OrbitanOS a self-improving platform — not just a static tool that reports what happened, but one that actively observes, understands, recommends, implements, and measures operational improvements.

## The Loop

```
Observe → Understand → Recommend → Approve → Implement → Measure → Learn
```

Unlike conventional analytics that only report what happened, Orbit Evolution creates a closed loop that makes the platform smarter and more valuable over time.

## Loop Stages

### 1. Observe
- Capture anonymised product usage analytics (module access, workflow execution, feature adoption)
- Track operational metrics (inventory turnover, procurement cycle time, reconciliation accuracy)
- Collect feedback via `IssueLog` and `WorkerFeedback` entities
- Monitor error patterns and performance metrics

### 2. Understand
- Orbit Nexus AI analyses usage patterns to identify:
  - Frequently used modules and features
  - Unused, confusing, or underutilised functionality
  - Repetitive manual tasks suitable for automation
  - Bottlenecks across departments and business processes
  - Common pain points across tenants and industries

### 3. Recommend
- Generate `EvolutionProposal` records with:
  - Structured recommendation data
  - Expected impact level (low/medium/high/critical)
  - AI confidence score
  - Observed pattern summary
  - Affected modules list
- Recommendation types: workflow_automation, module_configuration, permission_refinement, inventory_optimisation, procurement_improvement, dashboard_layout, industry_pack_upgrade, ai_agent_suggestion, operational_best_practice, ui_ux_improvement

### 4. Approve
- Governance mode determines the approval requirement:
  - `passive_logging` — AI actions logged after execution (operational velocity)
  - `proactive_approval` — AI creates proposal and waits for human approval before high-impact actions (compliance-first)
- High-impact changes ALWAYS require human review and approval before implementation
- `SystemSettings.ai_governance_mode` controls the platform-wide posture

### 5. Implement
- Approved proposals implemented via:
  - Configuration changes (PlatformManifest, ModuleAccessPolicy)
  - Workflow automations (Orbit Flow)
  - Module configuration updates
  - UI/dashboard layout adjustments
- Implementation logged to AuditLog

### 6. Measure
- After implementation, the system measures whether the change actually improved outcomes
- `EvolutionProposal.outcome_measured` captures the result
- `EvolutionProposal.outcome_improvement_pct` quantifies the improvement
- Status transitions: `implemented` → `measuring` → `completed`

### 7. Learn
- Measured outcomes feed back into the AI's understanding
- Successful patterns are reinforced; unsuccessful ones are revised
- The Knowledge Hub indexes outcomes for future RAG retrieval
- Creates institutional memory: "We tried X, it improved Y by Z%"

## 6-R Alignment

- **Renew** — Continuously refresh and improve workflows
- **Relate** — Connect operational patterns across modules
- **Respond** — React to identified pain points and bottlenecks
- **Refine** — Optimise based on measured outcomes
- **Regulate** — Govern changes through human approval gates
- **Reach** — Extend improvements across industries and tenants

## Privacy & Governance

- **Tenant isolation:** Usage data never crosses tenant boundaries
- **Privacy-first:** The objective is to improve the product and operational efficiency, NOT to learn personal behaviour
- **Configurable:** Organisations can configure their analytics preferences
- **Human-in-control:** High-impact changes always require human approval
- **Transparent:** All AI recommendations are explainable and auditable

## Existing Infrastructure

| Component | Status | Purpose |
|-----------|--------|---------|
| `EvolutionProposal` entity | ✅ Active | Stores AI-generated improvement proposals with full lifecycle |
| `evolutionEngine` backend function | ✅ Active | Generates proposals from usage pattern analysis |
| `SystemSettings.orbit_evolution_enabled` | ✅ Active | Platform-wide kill switch for proposal generation |
| `SystemSettings.ai_governance_mode` | ✅ Active | Controls passive_logging vs proactive_approval posture |
| `OrbitUsageTracker` entity | ✅ Active | Captures AI usage metrics for pattern analysis |
| `IssueLog` entity | ✅ Active | Structured feedback with AI analysis fields |
| `nexusFeedbackAnalyst` function | ✅ Active | AI-analyses feedback for sentiment, priority, duplicates |

## MVP Scope

- **Observe:** Usage tracking via OrbitUsageTracker + feedback via IssueLog
- **Understand:** nexusFeedbackAnalyst processes feedback; evolutionEngine generates proposals
- **Recommend:** EvolutionProposal records created with AI confidence scores
- **Approve:** Tenant admins review proposals in the platform console
- **Implement:** Manual implementation guided by proposal recommendations
- **Measure:** Post-implementation outcome tracking (manual entry initially)
- **Learn:** Outcomes recorded in EvolutionProposal for future AI context

Post-MVP: RAG-indexed outcomes, autonomous implementation of low-impact changes, cross-tenant pattern recognition (anonymised).

## Related Documents

- [OrbitNexus.md](./OrbitNexus.md) — Intelligence platform
- [AIPrinciples.md](./AIPrinciples.md) — AI principles
- [../Knowledge/ProductIntelligence.md](../Knowledge/ProductIntelligence.md) — Product intelligence
- [../Knowledge/DecisionRecords.md](../Knowledge/DecisionRecords.md) — ADR-0019