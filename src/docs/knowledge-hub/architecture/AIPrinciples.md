---
title: Orbitan AI Principles
category: Architecture
owner: Product Architecture
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - OrbitNexus.md
  - OrbitEvolution.md
  - SecurityCompliance.md
  - ../knowledge/DecisionRecords.md
tags:
  - AI
  - responsible-AI
  - human-review
  - transparency
  - RAG
  - agentic-ai
  - AI-safety
---

# Orbitan AI Principles

## Purpose

Defines the principles governing all AI capabilities in the Orbitan ecosystem — responsible AI, human review, transparency, explainability, RAG, agentic AI, and AI safety.

## Responsible AI

1. **AI enhances human decision-making — never replaces it.**
2. **AI is optional, not a dependency.** OrbitanOS works fully without AI (ADR-0017).
3. **Human-in-control:** High-impact AI actions require human approval (proactive_approval governance mode).
4. **Privacy-first:** Analytics improve the product and operational efficiency, not personal behaviour tracking.
5. **Tenant isolation:** Usage data never crosses tenant boundaries.

## Human Review

- AI-generated content is always reviewable and editable by users
- High-impact changes require human approval before implementation
- `EvolutionProposal` records with `governance_mode: proactive_approval` wait for human review
- No unexpected automated actions — AI recommendations surface to users for decision

## Transparency

- Clearly indicate when content is AI-assisted
- Explain recommendations where appropriate
- AI confidence scores visible on proposals
- All AI actions logged to `AuditLog` with `shield_outcome`
- `OrbitUsageTracker` records every AI request with model, latency, credits, status

## Explainability

- AI recommendations include rationale
- `EvolutionProposal.observed_pattern` explains why the AI made the recommendation
- Decision Records (ADRs) document why architectural decisions were made — RAG-indexed for "Why was X designed this way?" queries

## RAG (Retrieval-Augmented Generation)

- This Knowledge Hub is the RAG source for Orbit Nexus
- Every `.md` file is indexed for semantic search
- Enables context-aware AI recommendations based on historical decisions
- Cross-links between documents enable AI to traverse related concepts

## Agentic AI

- Future: Workflow agents with `tool_configs` for entity + function access
- Trust levels: `low` (approval for all writes), `medium` (autonomous within budget gates), `high` (enterprise only)
- Governance gates: actions that cannot be taken without human approval
- Binding: `ActivationRegistry.ai_governance` defines which agents are enabled per industry pack

## AI Safety

- **Kill Switch:** `SystemSettings.nexus_ai_enabled` — instant global AI shutdown
- **Shield governance:** `shieldInterceptor` evaluates policies before AI actions involving writes
- **Credit metering:** `OrbitanWallet.balance_credits` gates AI usage — prevents runaway costs
- **Graceful degradation:** If AI is unavailable, `useNexusAI` hook returns `ai_available: false` instead of throwing
- **No AI for core data validation:** Human-in-the-loop is a governance principle

## AI Kill Switch Evaluation Order

```
1. Authenticate user
2. CHECK KILL SWITCH → if disabled, return { ai_disabled: true } immediately
3. Shield governance gate
4. Wallet/credit check
5. Route to service function
6. Track usage + debit
```

The Kill Switch is checked BEFORE Shield and BEFORE wallet — it's the absolute highest-priority gate.

## Future Models

- RAG Engine for Knowledge Hub indexing
- Agent Engine for autonomous workflow execution
- MCP Server for external AI tool integration
- Cross-tenant pattern recognition (anonymised)
- Autonomous implementation of low-impact proposals (governance_gate severity only)

## Related Documents

- [OrbitNexus.md](./OrbitNexus.md) — Intelligence platform architecture
- [OrbitEvolution.md](./OrbitEvolution.md) — Continuous improvement loop
- [SecurityCompliance.md](./SecurityCompliance.md) — Security and compliance
- [../knowledge/DecisionRecords.md](../knowledge/DecisionRecords.md) — ADR-0006, ADR-0017, ADR-0018