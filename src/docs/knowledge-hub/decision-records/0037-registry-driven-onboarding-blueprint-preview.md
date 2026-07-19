# ADR-0037: Registry-Driven Onboarding Blueprint Preview

**Date:** 2026-07-19
**Status:** Accepted
**Impacted Modules:** Onboarding, ActivationRegistry, OnboardingWizard, BlueprintPreviewStep

## Context

During the MVP pilot phase, tenant onboarding via `onboardingService` provisions a full workspace
(Tenant → Company → Brand → Outlet → Wallet) plus an industry blueprint (ComplianceRecords, Tasks,
AI Documents) resolved from the `ActivationRegistry` entity.

However, the original `OnboardingWizard` presented a static, generic summary at the final
"Activation Gate" step. The founder could not see *what specific records* would be created for
their industry before committing to provisioning. This created a transparency gap:

- Founders activated workspaces without knowing which compliance templates or tasks would appear.
- Pilot tenants (Taqueria, Renewed Resources, Izaliqa Bakes) could not validate that their
  industry-specific requirements were correctly mapped before activation.
- The "black box" provisioning reduced trust and made pilot feedback harder to gather.

This conflicts with the **Regulate principle** (transparency before commitment) and the
**Golden UI/UX Standard** (discoverability and clear navigation paths).

## Alternatives Considered

### A. Static text in the Activation Gate (status quo)
Keep the generic "We'll provision automatically…" summary and remove transparency.
- **Rejected:** Does not scale to multiple industries. Fails the Platform Scalability Principle —
  a new industry pack would need new hardcoded text.

### B. Hardcoded industry preview maps in the frontend
Maintain a JS object mapping each industry to its preview content.
- **Rejected:** Violates the Registry-Driven Architecture (ADR-0001). Duplicates data already
  stored in `ActivationRegistry`. Creates drift risk between the preview and actual provisioning.

### C. Registry-driven live preview (chosen)
Fetch the `ActivationRegistry` record for the selected industry at runtime and render the actual
blueprint contents (compliance templates, tasks, AI documents, governance domain).

## Decision

Insert a new **Blueprint Preview** step in the `OnboardingWizard` between "Plan & Modules"
(step 3) and "Activate" (step 4). The new `BlueprintPreviewStep` component:

1. Queries `base44.entities.ActivationRegistry.filter({ industry, is_active: true })`.
2. Prefers the record matching the selected `packKey`, falls back to the first active pack.
3. Renders three cards: Compliance Records, Setup Tasks, AI Documents — each listing the actual
   titles that will be provisioned.
4. Displays the `governance_domain` binding banner (Shield™ policy domain).
5. Shows a total count and a fallback state if no registry record exists.

The step is registry-driven: adding a new industry = one `ActivationRegistry` record. The preview
adapts automatically with zero frontend code changes.

## Trade-offs

**Positive:**
- Transparency: founders see exactly what gets provisioned before committing.
- Trust: pilot tenants can validate industry-specific requirements pre-activation.
- Scalability: works for any future industry pack without code changes.
- Consistency: the preview reads from the same registry the backend uses for provisioning.

**Negative:**
- Extra network call during onboarding (one `ActivationRegistry` query).
- If the registry is unreachable, the preview shows a fallback state rather than blocking
  provisioning — acceptable per the fail-open principle already used in `resolveIndustryBlueprint`.

## Verification Notes

- The backend `resolveIndustryBlueprint` in `onboardingService` already resolves the same
  `ActivationRegistry` record during provisioning, ensuring preview-to-provision consistency.
- The `useAdvisoryConfig` hook already demonstrates the registry-first, static-fallback pattern.
- The preview does not mutate any data — it is read-only and purely informational.

## Future Review Date

2026-09-30 — review whether the preview should also surface the `trust_pillars` manifest and
`ai_governance` agent configuration for advanced pilot tenants.