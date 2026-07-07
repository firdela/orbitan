# ADR-0001: Registry-Driven Architecture

**Date:** 2026-06-01
**Status:** Accepted
**Impacted Modules:** ActivationRegistry, PlatformManifest, SubscriptionPolicy, onboardingService, ManifestHydrator, all industry-specific behaviour

## Context

OrbitanOS must support multiple industries (F&B, Retail, Recycling, Healthcare, Education, Logistics, Construction, etc.) without requiring code changes for each new industry. The initial concern was that hardcoding industry-specific logic (navigation trees, compliance templates, governance thresholds, provisioning steps) would create:

1. A maintenance nightmare — every new industry requires code changes + deployment
2. Tenant-specific coupling — pilot tenant logic embedded in platform code
3. No self-service onboarding — new industries can't be added by configuration alone
4. Scalability ceiling — thousands of industries would require thousands of code branches

## Alternatives Considered

1. **Hardcoded industry blueprints** (per-industry switch statements in `onboardingService`)
   - Rejected: Violates the scalability principle. Every new industry = code change + deploy.
   - Rejected: Pilot tenant logic would leak into platform code.

2. **Industry packs as npm packages** (separate packages per industry)
   - Rejected: Over-engineered for MVP. Creates deployment complexity.
   - Deferred: Could be revisited for white-label/enterprise deployments post-MVP.

3. **Registry-driven architecture** (JSON manifests stored as entity records)
   - Selected: Configuration over code. Adding an industry = add a database record, not code.
   - Selected: Self-service capable — future admins can create new industry packs from the dashboard.
   - Selected: Versioned — manifests carry `version` field for safe rollbacks.

## Decision

Adopt a **Registry-Driven Architecture** using three entity registries:

1. **`ActivationRegistry`** — Industry blueprints: compliance templates, provisioning pipelines, governance thresholds, trust pillars, AI governance config. Keyed by `pack_key` (e.g. `fnb`, `retail`, `recycling`, `hbb`).

2. **`PlatformManifest`** — UI/navigation blueprints: navigation tree, widget layout, module routing. Keyed by `manifest_key` (e.g. `core_ops_v1`, `fnb_ops_v1`).

3. **`SubscriptionPolicy`** — Commercial entitlement: allowed modules, allowed packs, limits (employees, outlets, credits), feature flags. Keyed by `plan_key` (e.g. `orbitan_starter`, `orbitan_growth`).

**Runtime resolution:** `ManifestHydrator` fetches the tenant's `PlatformManifest` + their `SubscriptionPolicy` in parallel, intersects via `allowed_modules`, and renders navigation. Locked modules are displayed but greyed out ("Graceful Lockout" — upsell opportunity, not hidden).

**Provisioning:** `onboardingService` reads `ActivationRegistry` to execute the `seeder_pipeline` (ordered provisioning steps) + `blueprint` (compliance templates, tasks) + `ai_documents` (SOPs, training modules).

## Trade-offs

**Positive:**
- Adding an industry = add a registry record, zero code changes
- Versioned manifests enable safe rollbacks
- Self-service onboarding is architecturally possible
- Pilot tenant logic never leaks into platform code
- `trust_pillars` config makes the compliance scoreboard fully dynamic (zero hardcoded industry logic)

**Negative:**
- Registry records are complex JSON — bad data causes runtime issues
- Requires admin tooling to create/edit registries safely (future: Blueprint Studio)
- More indirection = harder to trace for new developers (mitigated by this ADR)

## Future Review Date

**2026-10-01** — Evaluate whether the registry schema needs extension for white-label deployments or marketplace-contributed industry packs.

---

**Related ADRs:** ADR-0004 (Dynamic Workspace Routing), ADR-0005 (Manifest-Driven Navigation)