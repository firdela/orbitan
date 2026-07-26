# ADR-0055 — Stripe Connect Architecture Lock

**Date:** 2026-07-26
**Status:** Accepted (Architecture Locked)
**Build:** #26A
**Decision Owner:** Founder
**Supersedes:** Build #25 Stripe Connect discussion note

## Context

OrbitanOS has two distinct Stripe surfaces:

1. **Platform Billing** — subscription billing for OrbitanOS plans (Free, Starter, Growth, Business, Enterprise). Already live and accepting real payments in Stripe Live Mode. Managed by the platform owner. Secrets: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`.
2. **Tenant Stripe Connect** — per-tenant payment processing (payments, payouts, refunds, customers). Not yet implemented.

Build #25 raised the Stripe Connect model as an open architectural decision. Build #26A locks the architecture so that implementation (Build #26B) has a fixed, agreed foundation. The OAuth/onboarding flow is **not** implemented in Build #26A — only the architecture and readiness checks are prepared.

## Decision

1. **Platform Billing remains separate and unchanged.** It uses its own secrets, function (`stripeCheckout` + `stripeWebhook`), and webhook. It must never be mixed with tenant payment processing.
2. **Tenant Stripe Connect uses Standard connected accounts.** Each tenant connects and owns their own Stripe account. Stripe handles tenant identity verification (KYC) and payout configuration. OrbitanOS carries no payout or KYC liability.
3. **OrbitanOS synchronises authorised operational data only** — payments, payouts, refunds, customers — via scoped API access, never touching the money flow itself.
4. **One Stripe connected account per tenant for the MVP.** Simplicity over multi-account flexibility for pilot.
5. **Tenant isolation is mandatory.** Credentials stored in `IntegrationCredential` with `service_type: 'stripe_connect'`, filtered by `tenant_id`, written via service role, gated to Tenant Admin / Platform Admin. Mirrors the Xero pattern.
6. **Webhook idempotency and signature verification are mandatory.** Processed event IDs are stored to prevent duplicate handling; webhook signatures are verified against the configured signing secret.
7. **The onboarding mechanism must follow Stripe's officially supported approach at implementation time.** Stripe is steering integrations toward the Account Links / Dashboard-based onboarding. The implementation must adopt the officially supported mechanism current at Build #26B time — **do not hard-code a deprecated onboarding method** (e.g. the legacy classic OAuth `connect.stripe.com/oauth/authorize` flow) merely because it was previously suggested. Re-evaluate before implementation.
8. **RBAC.** Tenant actions permitted for Platform Admin, Tenant Owner / Tenant Admin, and authorised finance-capable leaders (represented by the Tenant Admin role in the existing Access Engine). No second role or permission system is created.

## Rationale

**Why Standard connected accounts (not Express / Custom):**
- Standard: the tenant owns their Stripe account and payout relationship; OrbitanOS gets scoped read/sync access. Lowest legal/compliance burden for OrbitanOS, fastest to pilot, commercially viable. Recommended for MVP.
- Express: lighter onboarding but adds platform-fee plumbing and dashboard responsibility surface — unnecessary complexity for the MVP.
- Custom: OrbitanOS would own full KYC and payouts — heavy legal/compliance burden, not viable for a two-month MVP.

**Why not hard-code classic OAuth:** Stripe is deprecating the classic OAuth flow in favour of Account Links / Dashboard-based onboarding. Hard-coding a deprecated flow now would create rework and risk. Locking "use the officially supported approach at implementation time" preserves future-proofing without committing to a flow that may change before Build #26B ships.

**Why separate from Platform Billing:** Platform Billing is revenue-critical and already live. Mixing tenant payment processing into it would violate separation of concerns, complicate reconciliation, and risk tenant money. Architectural separation is non-negotiable.

## Alternatives Considered

| Option | Verdict |
|---|---|
| Express connected accounts | Rejected for MVP — added complexity, no MVP benefit |
| Custom connected accounts | Rejected — KYC/payout liability too heavy for MVP |
| Classic OAuth (hard-coded) | Rejected — deprecated path; defer to officially supported mechanism |
| Merge with Platform Billing | Rejected — violates separation, money-flow risk |
| Defer all Stripe Connect to post-pilot | Rejected — pilot tenants need to accept payments |

## Consequences

- **Build #26B prerequisites:** register a Stripe Connect platform application and set `STRIPE_CONNECT_CLIENT_ID` in Base44 secret management. Then implement the `stripeConnect` function, `stripeConnectWebhook` handler, and sync actions.
- **No entity changes required** — `IntegrationCredential.service_type` already supports `'stripe_connect'`; RLS already tenant-isolates by `tenant_id`.
- **No Platform Billing changes.**
- **The Integration Hub already surfaces the architecture lock** (Build #26A) as a "Architecture Locked — Deferred" card, and the Platform Settings view shows `STRIPE_CONNECT_CLIENT_ID` readiness as a boolean.

## Security & Privacy

- Tenant isolation via `tenant_id`-bound `IntegrationCredential` records (RLS enforced).
- Service-role writes only (mirrors Xero).
- No secret values exposed in responses — readiness is boolean-only.
- Webhook signature verification + idempotency mandatory at implementation.
- AuditLog coverage for connect/reconnect/disconnect/sync events.

## Cross-References

- `src/docs/knowledge-hub/integration-setup-guide.md` — Xero setup, redirect URI, scopes, troubleshooting, secret-readiness
- `src/docs/knowledge-hub/implementation-notes/build-package-26a-production-integration-readiness.md` — Build #26A note + deferred #26B scope
- ADR-0053 (Orbit Inbox), ADR-0050 (Workspace Context), ADR-0054 (Activity Timeline) — related operational context
- `base44/functions/xeroOAuth/entry.ts` — reference implementation pattern for Connect integrations