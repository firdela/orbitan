# ADR-0011: Orbit Ecosystem Naming Migration

**Date:** 2026-07-08
**Status:** Confirmed (Historical — migrated from `src/docs/decision-records/` on 2026-08-04)
**Impacted Modules:** All branding, navigation, subscriptions, wallet, shield, marketplace
**Related ADRs:** ADR-0008 (Orbit Naming Standards), ADR-0013 (Orbit Naming Architecture Lock-In), ADR-0014 (Orbit Naming Architecture Dual Prefix)

> **Migration Note:** This ADR was originally created at `src/docs/decision-records/0011-orbit-naming-migration.md`.
> It has been migrated to the canonical Knowledge Hub decision-records directory as part of Build #28.2G.1
> repository consolidation. The broader naming standards are codified in ADR-0008; the architectural lock-in
> is recorded in ADR-0013; the dual-prefix hierarchy is documented in ADR-0014. This record is preserved
> for its unique historical detail — the specific files changed and the intentionally-unchanged items.

## Context

To create a clean, scalable brand architecture, we are distinguishing between the Master Brand (Orbitan), the Operating System (OrbitanOS), and shared platform services (Orbit).

## Decision

- Rename shared platform services to use the `Orbit` prefix.
- Retain `Orbitan` for the master brand and the flagship Workforce OS.
- Subscription plan display names use `OrbitanOS` prefix (e.g. "OrbitanOS Starter").
- Internal code identifiers (entity keys, CSS tokens, function names) remain unchanged to avoid breaking systemic dependencies.

## Implementation

- Orbitan Wallet → Orbit Wallet
- Orbitan Marketplace → Orbit Marketplace
- Orbitan Shield™ → Orbit Shield™
- "Orbitan Starter" → "OrbitanOS Starter"
- "Orbitan Growth" → "OrbitanOS Growth"
- "Orbitan Business" → "OrbitanOS Business"
- "Orbitan Enterprise" → "OrbitanOS Enterprise"

## Files Changed

- src/lib/orbitan-config.js (plan display names)
- src/pages/LeaderOrg.jsx (service card labels)
- src/pages/platform/ShieldCommandCenter.jsx (Shield header)
- src/components/subscriptions/SubscriptionPlansAccordion.jsx (locked feature labels)
- src/pages/Checkout.jsx (plan card names)
- src/pages/platform/WalletPage.jsx (comment)
- src/pages/platform/MarketplacePage.jsx (comment)
- src/components/wallet/WalletCreditBar.jsx (comment)

## Not Changed (Intentional)

- Entity keys (orbitan_starter, etc.) — internal identifiers
- CSS tokens (--orbitan-blue, etc.) — design system layer
- "Orbitan Elite" loyalty tier — pending founder decision
- "Orbitan" company/brand references — correct per naming standard