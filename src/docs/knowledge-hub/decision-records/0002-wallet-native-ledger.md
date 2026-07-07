# ADR-0002: Wallet-Native Ledger

**Date:** 2026-06-15
**Status:** Accepted
**Impacted Modules:** OrbitanWallet, WalletTransaction, FinanceSyncQueue, FinanceMapping, AccountMapping, walletEngine, financeController, procurement (PO receiving), OrbitUsageTracker

## Context

OrbitanOS needed a financial ledger to track:
- AI credit consumption (per-tenant metering)
- Loyalty points (Orbitan Rewards)
- Cashback balances
- Procurement spending (SGD)
- Subscription billing events
- Marketplace purchases

The question was whether to build an external ERP-first model (push everything to Xero/QuickBooks as the master ledger) or an internal wallet-native model (OrbitanOS is the master ledger, ERP is downstream).

## Alternatives Considered

1. **ERP-first model** (Xero/QuickBooks as master ledger)
   - Rejected: Creates hard dependency on an external service being available
   - Rejected: Requires every tenant to have an ERP account before basic operations work
   - Rejected: ERP APIs have rate limits that would throttle platform operations
   - Rejected: Home-based businesses and startups don't have ERPs — would exclude a key market segment

2. **Hybrid model** (dual-write to both internal + ERP simultaneously)
   - Rejected: Eventual consistency issues — what if ERP write fails but internal succeeds?
   - Rejected: Complexity of reconciliation between two masters
   - Rejected: Over-engineered for MVP

3. **Wallet-Native ledger** (OrbitanOS is master, ERP is downstream via async queue)
   - Selected: OrbitanOS owns the source of truth
   - Selected: ERP integration is optional and async (FinanceSyncQueue)
   - Selected: Works for HBBs with no ERP, and enterprises with Xero/QuickBooks
   - Selected: `ledger_sync_mode` field on ActivationRegistry controls whether ERP push is enabled

## Decision

Adopt a **Wallet-Native Ledger** model:

1. **`OrbitanWallet`** — Per-tenant wallet tracking: credit balance, loyalty points, cashback, reward tier, auto-topup config.

2. **`WalletTransaction`** — Immutable transaction ledger. Every financial movement is a record: credit topups, AI debits, procurement SGD spending, points earned/redeemed, cashback, subscription renewals. Linked to `AuditLog` for governance and `FinanceSyncQueue` for ERP bridging.

3. **`FinanceSyncQueue`** — Async broker for ERP integration. Events are queued with `sync_status` (pending → synced → error). `erp_target` enum supports `xero`, `quickbooks`, `myob`, `manual_export`. MVP pilots use `ledger_sync_mode: internal` (no ERP push).

4. **`walletEngine`** backend function — Handles procurement debits (`debit_procurement_sgd`), governance threshold checks, WalletTransaction creation, FinanceSyncQueue entry creation, and AuditLog entry creation — all in one atomic operation.

5. **Dynamic Trust governance** — `governance_threshold_sgd` on ActivationRegistry (HBB=50, F&B=200, Retail=300, Enterprise=configurable). Procurement above threshold requires `GovernanceOverride` before posting.

## Trade-offs

**Positive:**
- Works for all customer segments (HBB → Enterprise)
- No external service dependency for core operations
- ERP integration is opt-in, not blocking
- Immutable ledger provides complete audit trail
- Governance thresholds are industry-specific (registry-driven, not hardcoded)
- FinanceSyncQueue acts as a natural Integration Hub (Hub-and-Spoke pattern)

**Negative:**
- OrbitanOS is now responsible for financial data integrity (not delegating to ERP)
- Reconciliation between internal ledger and ERP is the tenant's responsibility
- Future multi-currency support requires schema extension

## Future Review Date

**2026-09-01** — Evaluate whether multi-currency support is needed for regional/global expansion. Currently SGD-only with `currency` field on Tenant for future extension.

---

**Related ADRs:** ADR-0001 (Registry-Driven Architecture), ADR-0003 (Shield Governance Interceptor), ADR-0006 (Orbit Nexus)