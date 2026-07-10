# ADR-0015: Find My Solution — AI-Powered Diagnostic Wizard

**Date:** 2026-07-10  
**Status:** Accepted  
**Decider:** Muhammad Firdaus Bin Ismail (Founder & Product Owner)  
**Architect:** Base44 AI (Acting as Product Architect & Solutions Architect)

## Decision

Implement a "Find My Solution" AI-powered diagnostic wizard as the first step of the OrbitanOS onboarding flow. The wizard asks problem-prescription questions across 5 stages — Intent, Compliance, Industry, Scale, and AI Prescription — and uses InvokeLLM (Claude Sonnet 4.6) to generate a `ProvisioningManifest` that pre-fills the existing OnboardingWizard with recommended pack, plan, modules, and compliance templates.

## Context

The existing onboarding flow (Industry → Structure → Plan → Activate) requires users to already know which industry pack, subscription plan, and modules they need. For new users — especially small business owners unfamiliar with SaaS terminology — this creates decision fatigue and friction.

The Product Owner requested:
1. Adding compliance as a diagnostic stage for regulated industries
2. Identifying and adding other critical discovery stages
3. Using AI (Claude) to power the entire prescription process

## Alternatives Considered

1. **Simple form-based wizard (no AI):** Ask the same questions but use heuristic rules to prescribe. Lower cost, but less adaptive and cannot generate natural-language rationale.
2. **Full agentic AI flow:** Use an Orbit Nexus agent with entity access to provision the workspace autonomously. Overkill for MVP; violates "Build less, validate more."
3. **AI-powered diagnostic (chosen):** Single InvokeLLM call with structured JSON schema output. Balances intelligence with simplicity. User reviews and accepts/adjusts the prescription before provisioning.

## Why This Option Was Chosen

- **User-centric:** Problem-prescription approach reduces decision fatigue. Users describe their needs, not pick from technical module lists.
- **Compliance-first:** The compliance stage ensures regulated industries (F&B, healthcare, finance, environmental) are identified early, triggering governance domain binding during provisioning.
- **AI transparency:** The prescription includes a rationale the user can read and understand, keeping humans in control (Golden UI/UX Standard §10).
- **Non-destructive:** The prescription pre-fills the existing wizard — users can still adjust any selection in subsequent steps. The diagnostic is skippable.
- **MVP-appropriate:** Single LLM call per onboarding. No complex agent infrastructure. Uses the existing `InvokeLLM` integration.

## Critical Discovery Stages

| Stage | Purpose | Data Captured |
|-------|---------|---------------|
| 1. Intent | Route: workforce ops vs AI vs scaling vs compliance | `intent` |
| 2. Compliance | Identify regulated industry → trigger governance domain | `regulationType`, `is_regulated` |
| 3. Industry | Select industry pack | `packKey`, `industry` |
| 4. Scale | Determine subscription tier | `employeeCount`, `outletCount` |
| 5. AI Prescription | LLM generates provisioning manifest | `prescription` (pack, plan, modules, compliance, rationale) |

## Implementation Notes

- **Component:** `src/components/onboarding/FindMySolutionWizard.jsx` — self-contained 5-stage wizard with internal state management.
- **Prescription display:** `src/components/onboarding/diagnostic/PrescriptionCard.jsx` — renders loading, error, and success states.
- **Integration:** Added as step 0 ("Diagnose") in `OnboardingWizard.jsx`. When the prescription is accepted, it calls `update()` with `packKey`, `industry`, `planKey`, `selectedModules`, and `prescription` metadata, then calls `onComplete()` to advance to step 1 (Industry).
- **Skip path:** Users can skip the diagnostic entirely via a "Skip — Choose Manually" footer link. The existing Industry step handles manual selection.
- **AI model:** `claude_sonnet_4_6` — good balance of quality and cost for a one-time onboarding call.
- **Validation:** The prescription response is validated client-side: pack_key must exist in `INDUSTRY_PACKS`, plan_key in `SUBSCRIPTION_PLANS`, modules in `MODULES`. Invalid values fall back to the user's selected pack / `orbitan_growth` default.
- **Backend:** No changes to `onboardingService`. The existing provisioning engine resolves industry blueprints from `ActivationRegistry` — the prescription just tells the frontend which pack/plan/modules to pre-select.

## Trade-offs

- **LLM latency:** The prescription generation adds ~5-10 seconds to onboarding. Mitigated by a loading state with animated indicator.
- **Cost:** Each prescription call consumes integration credits (Claude Sonnet 4.6 is a non-default model). Justified by being a one-time per-tenant cost during onboarding.
- **Potential for incorrect prescriptions:** LLM may recommend a suboptimal plan. Mitigated by: (a) strict validation of pack/plan/modules, (b) user can adjust in subsequent steps, (c) user can skip entirely.

## Impacted Modules

- `src/components/onboarding/OnboardingWizard.jsx` — added Diagnose step 0
- `src/components/onboarding/FindMySolutionWizard.jsx` — new
- `src/components/onboarding/diagnostic/PrescriptionCard.jsx` — new
- No entity changes, no backend changes, no routing changes

## Future Review Date

January 2027 — evaluate whether to evolve into a full agentic AI flow (Orbit Nexus agent with entity access) based on pilot feedback and usage analytics.