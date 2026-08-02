# ADR-0059: Build #28.2A — User Profile Workspace Identity & Privacy-First Xero Integration

**Date:** 2026-08-02
**Status:** Accepted
**Supersedes:** None
**Build:** #28.2A

## Context

Two issues required correction:

1. **User Profile Dropdown Workspace Names:** The previous workspace-name correction (Build #28.2) fixed `TenantSwitcher` but the actual User Profile dropdown (`UserMenu`) still displayed "Firdaus (Founder)" for every workspace entry. The root cause was the same: `membership.display_name` (set to Employee `full_name` by `MembershipResolver.translateEmployee`) was used as the primary workspace label.

2. **Developer-Facing Xero Setup:** The Integration Hub exposed developer-facing content to customers: "Add XERO_CLIENT_ID and XERO_CLIENT_SECRET in Base44 Settings → Environment Variables", "Register a Xero OAuth 2.0 app at developer.xero.com", redirect URI instructions, and raw provider errors. This violates Orbitan's privacy principle: "Privacy is a Human Fundamental Right." Business users are not developers and must never be instructed to enter backend credentials.

## Decision

### 1. Shared Tenant Name Resolver

Extracted a single canonical `useTenantNames` hook (`src/lib/hooks/useTenantNames.js`) that both `TenantSwitcher` and `UserMenu` consume. This ensures:
- One resolution logic, one cache, one fallback behaviour
- No competing workspace resolution
- Canonical `Tenant.name` as the primary label everywhere
- Role badge + industry as secondary text
- User identity header retains the user's personal name (not reused as workspace name)

**Why not a provider?** A provider would introduce framework debt for a simple presentation-layer concern. A hook is lightweight, composable, and sufficient.

**Why not modify `MembershipResolver`?** The `display_name` field serves a legitimate purpose for cases where the Tenant record is unavailable. The display-layer correction is more appropriate — it hydrates the canonical name when available and falls back to `display_name` only when the Tenant record cannot be resolved.

### 2. Customer-Facing Xero Connection Experience

Replaced all developer-facing content with a polished, privacy-first connection experience:

- **Disconnected state:** "Connect Xero" button with privacy reassurance ("Orbitan never receives your Xero password. You may disconnect at any time.")
- **Connected state:** Organisation name, connected date, token health, sync metadata, authorised scopes summary. Actions: Test Connection, Sync Now, Disconnect.
- **Temporarily Unavailable:** When platform credentials are missing, customers see a neutral message + Contact Support. No "Critical" status for internal deployment configuration. No mention of Client ID, Client Secret, Base44, or developer portals.
- **Platform admin diagnostics:** A separate collapsible panel (admin only) shows configuration health (Yes/No booleans, redirect URI, scopes) without exposing secret values.

### 3. Secure OAuth State (HMAC-Signed Token)

**Before:** `state = tenant_id` (raw, predictable, no replay protection, no user binding, no expiry).

**After:** `state = base64url(payload).base64url(hmac)` where payload contains:
- `n`: cryptographic nonce (32 random bytes)
- `t`: tenant_id
- `u`: user_id
- `r`: return route
- `c`: created_at timestamp
- `e`: expires_at (10-minute TTL)

The HMAC is signed with `XERO_CLIENT_SECRET` (server-side only). The token is opaque to Xero and the browser.

**Validation on callback:**
1. Verify HMAC signature (rejects tampered state)
2. Decode payload
3. Check expiry (rejects expired state)
4. Resolve tenant_id from the state (frontend no longer sends tenant_id)
5. Exchange authorization code

**Why HMAC-signed token instead of a database entity?**
- OAuth authorization codes are one-time use by nature (Xero invalidates them after exchange)
- A stateless approach is simpler, portable, and doesn't require schema changes
- Web Crypto API (HMAC-SHA256) is available in any runtime
- Future enhancement: persistent `OAuthTransaction` entity for consumed-state tracking (replay protection at the state level)

### 4. Portable Secrets Adapter

Isolated all secret retrieval behind a `getSecret()` adapter function. Application code never imports Base44 environment configuration directly. The adapter currently reads from Deno environment variables but can be replaced with AWS Secrets Manager / Google Secret Manager / Azure Key Vault / HashiCorp Vault by changing only the adapter function.

### 5. Multi-Organisation Selection

When a user authorises multiple Xero organisations during the OAuth flow, the backend returns `requires_org_selection: true` with the list of available organisations. The frontend presents a selection list. A new `select_organisation` action persists the user's choice with full audit logging.

## Consequences

### Positive
- Customers never see developer-facing content
- OAuth state is cryptographically secure and tamper-proof
- Workspace names are consistent across all UI surfaces
- Secret retrieval is portable — no Base44 lock-in
- Multi-org support provides a better customer experience
- Token material is cleared on disconnect

### Negative / Limitations
- HMAC-signed state is stateless — consumed-state tracking (replay protection at the state level) requires a future database entity
- Token encryption at rest requires infrastructure-level changes (envelope encryption) not yet implemented — tokens are stored in the database with RLS protection (admin-only writes, no frontend reads) but not encrypted
- No "Reveal Secret" or "View Token" control exists (by design — privacy-preserving)

## Alternatives Considered

1. **Modify `MembershipResolver.translateEmployee`** — Rejected. The `display_name` field serves a legitimate fallback purpose. The display-layer correction is more appropriate.

2. **Create a new `OAuthTransaction` entity for state tracking** — Deferred. The HMAC-signed token provides sufficient security for the current flow. OAuth authorization codes are one-time use. A database entity adds complexity for marginal replay protection benefit.

3. **Sonner migration for toast notifications** — Not needed. The existing `useToast` abstraction was corrected in Build #28.2.

4. **Envelope encryption for token storage** — Deferred to a future infrastructure build. The current RLS-based protection (admin-only writes, tenant_admin read for own tenant, no frontend token access) provides reasonable security for the MVP/pilot phase. Envelope encryption requires a key management service (AWS KMS, etc.) which is not yet provisioned.

## Files

- **Created:** `src/lib/hooks/useTenantNames.js`
- **Modified:** `src/components/shared/UserMenu.jsx`, `src/components/shared/TenantSwitcher.jsx`, `src/pages/platform/IntegrationHubPage.jsx`, `src/pages/workspace/FinanceIntegrationPage.jsx`, `src/lib/integration-errors.js`, `base44/functions/xeroOAuth/entry.ts`, `src/docs/knowledge-hub/CHANGELOG.md`

## Related ADRs

- ADR-0058 (Build #28.2 — Workspace Identity, Xero Recovery, Leader Console IA)
- ADR-0050 (Centralised Access Engine)
- ADR-0048 (Orbit Identity Model)
- ADR-0042 (Public Access Security & IP Protection)