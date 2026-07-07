# ADR 0007: Delegated Integration Hub (IntegrationCredential)

## Date
2026-07-07

## Context
OrbitanOS needs per-tenant OAuth credential storage for external services (Xero, QuickBooks). Xero is an MVP must-have (escalated by Product Owner), and Xero is NOT a supported Base44 connector — it requires per-tenant OAuth via backend function + secret storage.

Previously, the Xero integration was simulated (`financeController` has `buildXeroInvoicePayload()` with a TODO for live API swap). To activate live Xero for pilot tenants, we need a secure, tenant-isolated vault for OAuth tokens.

Without a dedicated credential entity, the only alternatives are:
1. Store tokens on the Tenant entity — clutters identity schema with integration state, doesn't scale to multiple services per tenant.
2. Store tokens in FinanceMapping — FinanceMapping tracks sync state, not credentials. Mixing concerns.

## Decision
Create an `IntegrationCredential` entity that stores per-tenant OAuth credentials with strict RLS isolation.

- **Create/Update/Delete:** Admin-only (backend functions use service role for OAuth callback writes)
- **Read:** Admin + tenant_admin (own tenant only)
- **Service type:** Free-text string (`service_type`) — extensible to any future service without schema changes
- **Token storage:** `access_token`, `refresh_token`, `token_expires_at` — standard OAuth fields
- **External tenant binding:** `external_tenant_id` / `external_tenant_name` for service-specific org context (e.g. Xero tenant ID)

## Alternatives Considered
1. **Store tokens on Tenant entity** — Rejected: clutters Tenant schema, doesn't scale to multiple services, mixes identity with integration state, violates single-responsibility.
2. **Store tokens in FinanceMapping** — Rejected: FinanceMapping tracks sync state between systems, not credentials. Mixing concerns makes both harder to maintain.
3. **Per-tenant Stripe Connect accounts** — Deferred to post-MVP marketplace. Platform-level Stripe (single account) is sufficient for MVP subscription billing.

## Trade-offs
- **Pros:** Clean separation of concerns, scales to any service, strict tenant isolation, audit-ready, no schema changes needed to add new services.
- **Cons:** One more entity to maintain. Acceptable given the security and scalability benefit.

## Impacted Modules
- `financeController` — will read IntegrationCredential tokens for live Xero API calls (replacing simulated sync)
- `FinanceSyncQueue` — async sync entries will reference the credential used
- `Wallet-Native Ledger` — finance operations gated by Shield, which checks credential validity
- `shieldInterceptor` — governance on credential disconnection events

## PaymentAudit — NOT Created (Decision)
A `PaymentAudit` entity was considered for tracking Stripe payment events. **Decision: Do NOT create.** `WalletTransaction` is already an immutable financial ledger tracking every credit/debit/procurement spend with balance snapshots. `AuditLog` already captures governance events, Shield outcomes, and state changes. A `PaymentAudit` entity would duplicate both, violating the "no duplicate systems" principle.

## Billing Router — Deferred
The Billing Router concept (test vs live credential routing) was considered. **Decision: Defer to post-MVP.** Current Stripe setup is platform-level (single account, live mode). A formal router becomes relevant only for per-tenant Stripe Connect (marketplace revenue splitting) — which is explicitly post-MVP per the build philosophy ("Build less. Validate more."). The existing `stripeCheckout` function already uses `STRIPE_SECRET_KEY` (live key) correctly.

## Future Review
When adding Stripe Connect for marketplace revenue splitting, revisit whether `IntegrationCredential` needs a `stripe_connect` service type with expanded fields (Connect account ID, capabilities, payouts).