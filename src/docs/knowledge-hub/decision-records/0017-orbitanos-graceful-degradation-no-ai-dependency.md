# ADR-0017: OrbitanOS Graceful Degradation — OS Works Without AI

**Date:** 2026-07-11
**Status:** Accepted
**Impacted Modules:** All OrbitanOS modules (Inventory, Procurement, Tasks, Workforce, Sales, Compliance, Scheduling), nexus gateway, SystemSettings, useNexusAI hook

## Context

OrbitanOS is a Workforce Operating System — like Workday, Monday.com, and Odoo. These platforms are fully functional business tools that do NOT require AI to operate. AI is an enhancement layer, not a dependency.

Orbit Nexus is a separate Intelligence Platform that can optionally power OrbitanOS. But OrbitanOS must never become reliant on it. If Orbit Nexus is down, disabled, or unsubscribed, every core module must continue to function:

- Employees can be managed
- Shifts can be scheduled
- Inventory can be tracked
- Purchase orders can be created
- Sales invoices can be recorded
- Tasks can be assigned and completed
- Compliance records can be maintained
- Reports can be generated

## Decision

**OrbitanOS modules are AI-optional by design.**

### Architectural Rules

1. **No module page imports or calls `nexus` during core workflow execution.**
   - Inventory list loads from `base44.entities.InventoryItem.list()` — never from AI.
   - Task creation saves to `base44.entities.Task.create()` — never via AI.
   - AI features (suggestions, auto-categorisation, SOP generation) are separate, optional actions triggered explicitly by the user (e.g., "Ask AI" button) or by a separate automation.

2. **AI features are additive, not blocking.**
   - If AI is unavailable, the feature simply doesn't appear or shows "AI disabled."
   - No page shows a loading spinner indefinitely because AI failed.
   - No form submission is blocked because AI didn't return a suggestion.

3. **All AI calls go through the `useNexusAI` hook.**
   - The hook returns `{ ai_available: false }` instead of throwing when AI is disabled.
   - Calling components check `ai_available` and gracefully hide/skip the AI feature.

4. **ServiceNow-style contextual AI (future).**
   - AI appears contextually within workflows: "AI-suggest priority," "AI-generate SOP for this module," "AI-analyse this shift pattern."
   - These are always optional actions — the user can do the task manually without AI.

## Implementation

- **`useNexusAI` hook** (`src/lib/hooks/useNexusAI.js`): Reusable hook for all modules. Handles graceful degradation, shield blocks, insufficient credits, and network errors — always returns a structured result, never throws.
- **Nexus gateway** (`base44/functions/nexus/entry.ts`): Checks Kill Switch (SystemSettings.nexus_ai_enabled) before any processing. Returns `{ ai_disabled: true, message }` instead of executing.
- **Module pages**: AI features are rendered conditionally based on `ai_available` from the hook response.

## Trade-offs

**Positive:**
- OrbitanOS is sellable to customers who don't want AI (regulatory, cost, or preference reasons)
- AI outages don't take down the platform
- Clear separation: OS = business operations, Nexus = intelligence enhancement
- Aligns with Workday/Monday/Odoo model — proven market expectation
- Aligns with Orbitan Free plan (No AI restriction is architecturally enforced, not just feature-gated)

**Negative:**
- Slightly more conditional rendering in module pages (mitigated: `useNexusAI` hook centralises the logic)
- Can't use AI for core data validation (mitigated: that's intentional — human-in-the-loop is a governance principle)

## Future Review Date

**2026-09-01** — Evaluate whether any module has accidentally created an AI dependency (audit all page imports for direct nexus calls that should use the hook instead).

---

**Related ADRs:** ADR-0006 (Orbit Nexus Intelligence Platform), ADR-0018 (AI Kill Switch Pattern)