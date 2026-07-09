# ADR-0013: Orbit Naming Architecture Lock-In & Stripe Product Alignment

**Date:** 2026-07-09 (Day 40 of 60-day MVP window)
**Status:** ACCEPTED
**Decision Maker:** Muhammad Firdaus Bin Ismail (Founder & Product Owner)
**Impacted Modules:** All customer-facing surfaces, Stripe billing, subscription framework, brand identity

---

## Decision

The Orbit naming architecture is hereby **locked as the permanent brand standard** for the entire Orbitan ecosystem. This ADR formalises the three-tier naming hierarchy and confirms alignment between Stripe product catalogue, codebase configuration, and all UI surfaces.

### Three-Tier Naming Hierarchy

| Tier | Prefix | Purpose | Examples |
|------|--------|---------|----------|
| **Company / Master Brand** | Orbitan | The organisation behind the ecosystem | "Orbitan" |
| **Operating Systems** | OrbitanOS, AquaOrbit, ChefOrbit | Flagship SaaS products | "OrbitanOS Starter" |
| **Shared Platform Services** | Orbit | The engines that power everything | Orbit Nexus, Orbit Shield, Orbit Wallet, Orbit Connect, Orbit Core, Orbit Builder, Orbit Rewards, Orbit Marketplace, Orbit Flow, Orbit Insight, Orbit ID, Orbit Notify |

### Stripe Product Alignment (Confirmed)

Stripe products are renamed to match the `OrbitanOS` prefix:

| Stripe Product | Product ID | Price | Codebase Key |
|---------------|-----------|-------|-------------|
| OrbitanOS Starter | `prod_UqxyqWSPqzbmUU` | S$49/month | `orbitan_starter` |
| OrbitanOS Growth | `prod_UqCTflVC5RIRyA` | S$149/month | `orbitan_growth` |
| OrbitanOS Business | `prod_UqCTbi0NRW3noE` | S$399/month | `orbitan_business` |
| OrbitanOS Enterprise | N/A (contact sales) | Custom | `orbitan_enterprise` |

**Note:** Starter is free (no Stripe checkout). Enterprise is custom (contact sales). Only Growth and Business go through Stripe Checkout.

---

## Context

The naming architecture was initially discussed in ADR-0008 (Orbit Naming Standards). This ADR-0013 **locks** the decision after real-world validation with:

1. **Stripe product catalogue** — all three paid products renamed to "OrbitanOS [Plan Name]" in the Stripe dashboard.
2. **Codebase configuration** — `src/lib/orbitan-config.js` `SUBSCRIPTION_PLANS` all use "OrbitanOS" prefix.
3. **Landing page** — pricing section renders dynamically from config; shows all 4 plans with "OrbitanOS" prefix.
4. **Checkout page** — plan cards updated to "OrbitanOS Growth" / "OrbitanOS Business" with correct Stripe-matched pricing.
5. **Service names** — all platform services migrated from "Orbitan [Service]" to "Orbit [Service]" across LeaderOrg, ShieldCommandCenter, WalletPage, MarketplacePage, AuthGateway, SubscriptionPlansAccordion, and orbitan-identity.js.

---

## Alternatives Considered

### Alternative 1: "Orbitan" prefix for all services
- **Rejected** — creates repetitive branding: "OrbitanOS by Orbitan uses Orbitan Shield, Orbitan Wallet, Orbitan Connect..."
- The word "Orbitan" loses impact through repetition.
- Contradicts established ecosystem patterns (Microsoft, Google, Apple all use distinct service names under a master brand).

### Alternative 2: Mixed prefixes (keep some "Orbitan" services)
- **Rejected** — inconsistent. Half the services would say "Orbitan" and half would say "Orbit".
- Creates confusion about what is a product vs. a platform service.
- Violates the "One Unified Design Language" principle from the Golden UI/UX Standard.

### Alternative 3: "OrbitanOS" prefix for services (e.g., "OrbitanOS Shield")
- **Rejected** — couples shared services to a single product.
- When AquaOrbit or ChefOrbit launch, they would need their own shield, which doesn't make sense.
- Shared services must be product-agnostic.

---

## Why This Option Was Chosen

1. **Scalability:** New services can be added without name collisions. "Orbit [NewService]" is always available.
2. **Ecosystem clarity:** Customers see "OrbitanOS by Orbitan, powered by Orbit Core, Orbit Nexus, Orbit Shield, Orbit Connect." Clean, professional, non-repetitive.
3. **Precedent:** Mirrors Microsoft (365 + Defender/Entra/Intune), Google (Workspace + Gemini/Drive/Meet), Apple (Apple + iCloud/Wallet/Health).
4. **Future-proof:** When AquaOrbit and ChefOrbit launch, they inherit the same Orbit service family without renaming.
5. **Stripe alignment:** Product names in Stripe now match codebase config, ensuring checkout metadata consistency.

---

## Trade-Offs

| Advantage | Cost |
|-----------|------|
| Clean brand hierarchy | Internal identifiers (CSS tokens, entity names) remain unchanged — some cognitive overhead for developers |
| Stripe ↔ codebase alignment | No automated mechanism to sync Stripe product names with codebase — requires manual vigilance |
| Scalable for future products | "Orbit" prefix must be reserved strictly for platform services, never for tenant-facing features |
| Non-repetitive messaging | Documentation must clearly distinguish "Orbitan" (company) from "Orbit" (services) |

---

## Impacted Modules

- **Billing:** `stripeCheckout` backend function `PLAN_NAMES` map; `Checkout.jsx` plan cards and pricing.
- **Configuration:** `src/lib/orbitan-config.js` `SUBSCRIPTION_PLANS` names.
- **Identity:** `src/lib/orbitan-identity.js` `SHIELD_BRAND` label.
- **Landing page:** `src/pages/Landing.jsx` pricing section (dynamic from config) + Orbit Shield section.
- **Platform pages:** LeaderOrg, ShieldCommandCenter, WalletPage, MarketplacePage, IntegrationHubPage.
- **Auth:** AuthGateway badge, SubscriptionPlansAccordion.
- **Onboarding:** PlanStep prefix-stripping logic.

---

## Constraints (Binding)

1. **Internal identifiers are immutable.** CSS tokens (`--orbitan-blue`), entity names (`OrbitanWallet`), and codebase keys (`orbitan_starter`) remain unchanged to prevent breaking changes. Only user-facing labels are updated.
2. **"Orbit" prefix is reserved** exclusively for shared platform services. It must never be used for tenant-facing features, modules, or industry packs.
3. **"OrbitanOS" prefix is reserved** for the flagship OS product and its subscription tiers only.
4. **Stripe product names must match** `SUBSCRIPTION_PLANS[key].name` in `orbitan-config.js`. Any Stripe product rename requires a corresponding codebase update in the same session.
5. **New service additions** follow the pattern: `Orbit [ServiceName]` (e.g., future "Orbit Forms", "Orbit Scheduler").

---

## Future Review Date

**2027-07-09** (1 year) — or when the first non-OrbitanOS product (AquaOrbit / ChefOrbit) enters active development, whichever comes first. At review, confirm:
- The naming hierarchy still serves all products without collision.
- No "Orbitan [Service]" references have crept back into user-facing surfaces.
- Stripe product catalogue remains in sync with codebase configuration.

---

## Verification (2026-07-09)

| Surface | Status |
|---------|--------|
| Stripe Dashboard — Product names | ✅ "OrbitanOS Starter", "OrbitanOS Growth", "OrbitanOS Business" |
| `orbitan-config.js` — Plan names | ✅ "OrbitanOS Starter/Growth/Business/Enterprise" |
| `stripeCheckout` — `PLAN_NAMES` | ✅ "OrbitanOS Growth", "OrbitanOS Business" |
| `Checkout.jsx` — Plan card names | ✅ "OrbitanOS Growth", "OrbitanOS Business" |
| `Checkout.jsx` — Pricing | ✅ S$149 (Growth), S$399 (Business) — matches Stripe |
| `Landing.jsx` — Pricing section | ✅ Dynamic from config, shows all 4 "OrbitanOS" plans |
| `Landing.jsx` — Shield section | ✅ "Orbit Shield™" |
| `orbitan-identity.js` — `SHIELD_BRAND` | ✅ "Orbit Shield™" |
| LeaderOrg — Service cards | ✅ "Orbit Wallet", "Orbit Marketplace", "Orbit Shield™" |
| AuthGateway — Badge | ✅ "Orbit Shield™ Verified" |
| SubscriptionPlansAccordion | ✅ "Orbit Shield™" references |
| PlanStep — Prefix strip | ✅ `.replace('OrbitanOS ', '')` |

---

## Related ADRs

- **ADR-0008:** Orbit Naming Standards (initial framework)
- **ADR-0009:** Orbit Core Boundary (Core entity immutability)
- **ADR-0010:** Independent Deployability (interface-first constraint)
- **ADR-0011:** Orbit Naming Migration (codebase-wide implementation)
- **ADR-0012:** Knowledge Hub Init (RAG-ready documentation)