# ODR-0019: Orbit Evolution — Continuous Improvement Loop

**Date:** 2026-07-12
**Status:** Accepted
**Product Owner:** Muhammad Firdaus Bin Ismail
**Impacted Modules:** EvolutionProposal (entity), evolutionEngine (backend function), Orbit Intelligence, Orbit Nexus, all operational modules

---

## Decision

Establish **Orbit Evolution** as a core strategic capability of the Orbit ecosystem — a continuous improvement loop that goes beyond traditional analytics to actively observe, understand, recommend, implement, and measure operational improvements.

Unlike conventional analytics that only report what happened, Orbit Evolution creates a closed loop:

```
Observe → Understand → Recommend → Approve → Implement → Measure → Learn
```

This loop aligns directly with the 6-R philosophy:
- **Renew** — Continuously refresh and improve workflows
- **Relate** — Connect operational patterns across modules
- **Respond** — React to identified pain points and bottlenecks
- **Refine** — Optimise based on measured outcomes
- **Regulate** — Govern changes through human approval gates
- **Reach** — Extend improvements across industries and tenants

## Context

Traditional SaaS analytics are "data graveyards" — they capture metrics but rarely drive action. OrbitanOS must be different. The platform should continuously evolve alongside its customers, becoming smarter and more valuable over time.

The pilot tenant programme (Taqueria, Renewed Resources, Renewed Fashion, HBBs) provides the initial observation surface. Every workflow execution, module usage pattern, and feedback submission feeds the Evolution loop.

## Loop Stages

### 1. Observe
- Capture anonymised product usage analytics (module access, workflow execution, feature adoption)
- Track operational metrics (inventory turnover, procurement cycle time, reconciliation accuracy)
- Collect feedback via IssueLog and WorkerFeedback entities
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
- Recommendations are categorised by type: workflow_automation, module_configuration, permission_refinement, inventory_optimisation, procurement_improvement, dashboard_layout, industry_pack_upgrade, ai_agent_suggestion, operational_best_practice, ui_ux_improvement

### 4. Approve
- Governance mode determines the approval requirement:
  - `passive_logging` — AI actions logged after execution (operational velocity)
  - `proactive_approval` — AI creates proposal and waits for human approval before high-impact actions (compliance-first)
- High-impact changes ALWAYS require human review and approval before implementation
- `SystemSettings.ai_governance_mode` controls the platform-wide posture

### 5. Implement
- Approved proposals are implemented via:
  - Configuration changes (PlatformManifest, ModuleAccessPolicy)
  - Workflow automations (Orbit Flow)
  - Module configuration updates
  - UI/dashboard layout adjustments
- Implementation is logged to AuditLog

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

## Privacy & Governance

- **Tenant isolation:** Usage data never crosses tenant boundaries
- **Privacy-first:** The objective is to improve the product and operational efficiency, NOT to learn personal behaviour
- **Configurable:** Organisations can configure their analytics preferences
- **Human-in-control:** High-impact changes always require human approval
- **Transparent:** All AI recommendations are explainable and auditable

## Existing Infrastructure

The following are already implemented and power Orbit Evolution:

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

For the MVP pilot:
- **Observe:** Usage tracking via OrbitUsageTracker + feedback via IssueLog
- **Understand:** nexusFeedbackAnalyst processes feedback; evolutionEngine generates proposals
- **Recommend:** EvolutionProposal records created with AI confidence scores
- **Approve:** Tenant admins review proposals in the platform console
- **Implement:** Manual implementation guided by proposal recommendations
- **Measure:** Post-implementation outcome tracking (manual entry initially)
- **Learn:** Outcomes recorded in EvolutionProposal for future AI context

Post-MVP: RAG-indexed outcomes, autonomous implementation of low-impact changes, cross-tenant pattern recognition (anonymised).

## Trade-offs

| Aspect | Impact |
|--------|--------|
| **Product differentiation** | **Positive** — OrbitanOS becomes a self-improving platform, not just a static tool |
| **Customer retention** | **Positive** — Tenants see continuous value improvement without manual effort |
| **Complexity** | **Neutral** — Infrastructure already exists; MVP scope is observation + recommendation, not autonomous action |
| **Privacy** | **Positive** — Positioned as Operational Intelligence, not user tracking |
| **AI cost** | **Neutral** — evolutionEngine runs on scheduled automation, not per-user-request; credit cost is controlled |

## Future Review Date

**2026-12-01** — Evaluate whether to implement autonomous implementation of low-impact proposals (governance_gate severity only) and cross-tenant pattern recognition with anonymised aggregation.

---

**Related ADRs:** ADR-0006 (Orbit Nexus), ADR-0009 (Orbit Core Boundary), ADR-0017 (Graceful Degradation), ADR-0018 (AI Kill Switch)