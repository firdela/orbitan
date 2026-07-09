# Decision Record 0011: Orbit Ecosystem Naming Migration

## Status
Confirmed

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