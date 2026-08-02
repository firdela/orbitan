# ADR-0060: Build #28.2B — Xero OAuth Domain, Callback & Security Hardening

**Date:** 2026-08-02  
**Status:** Accepted  
**Supersedes:** ADR-0059 (partially — OAuth state mechanism upgraded from HMAC-signed to persisted single-use)  
**Build:** #28.2B

## Context

Build #28.2A established the privacy-first Xero integration architecture but contained three critical defects that prevented the integration from functioning in production:

1. **Secret-name mismatch:** The secrets manager stored credentials as `XERO_Orbitan_ClientID` / `XERO_Orbitan_ClientSecret`, but the backend code read `XERO_CLIENT_ID` / `XERO_CLIENT_SECRET`. The `configured` boolean was always `false`, locking the Connect Xero button.

2. **Hardcoded domain fallback:** The `xeroOAuth` function derived the redirect URI from the `Origin` or `Referer` HTTP header, falling back to `https://app.orbitan.com/platform/integrations`. This conflicted with the canonical production domain `https://orbitan.io` and would cause Xero to reject the callback (redirect URI mismatch between authorization and token exchange).

3. **Token storage security gap:** Access and refresh tokens were stored as plaintext in the `IntegrationCredential` entity, protected only by RLS. This violated the Privacy-by-Design principle — a database compromise would expose all tenant OAuth tokens.

## Decision

### 1. Canonical Domain & Redirect URI

The official Orbitan production domain is **`https://orbitan.io`**. This supersedes all previous assumptions referencing `app.orbitan.com`, `app.orbitan.io`, or `orbitan.com`.

The redirect URI is now read exclusively from the backend-only environment variable `XERO_REDIRECT_URI`. It is **never** derived from:
- HTTP `Origin` or `Referer` headers
- Frontend input
- Tenant data
- Query parameters

The URI is validated against an allowlist of approved Orbitan origins:
```
https://orbitan.io
https://www.orbitan.io
```

The same canonical URI is used identically during authorization and token exchange, as required by OAuth 2.0.

**Exact callback URI:** `https://orbitan.io/platform/integrations`

### 2. Required Secret Names

The backend reads exactly these environment variables (no fallbacks, no aliases):

| Secret Name | Purpose |
|---|---|
| `XERO_CLIENT_ID` | Xero OAuth application client ID |
| `XERO_CLIENT_SECRET` | Xero OAuth application client secret |
| `XERO_REDIRECT_URI` | Canonical callback URI (`https://orbitan.io/platform/integrations`) |
| `INTEGRATION_ENCRYPTION_KEY` | AES-256 master key for token encryption at rest |

None of these values are ever returned by APIs, logged, stored in entity records, or sent to the browser. The configuration-health endpoint returns only boolean metadata (`client_id_configured`, `client_secret_configured`, `redirect_uri_configured`, `token_encryption_enabled`).

### 3. OAuth Transaction (Single-Use State)

**Before (Build #28.2A):** OAuth state was an HMAC-SHA256-signed token containing tenant_id, user_id, nonce, and expiry. While cryptographically sound, it was **stateless** — consumed state could be replayed because there was no server-side record of consumption.

**After (Build #28.2B):** OAuth state is a random 32-byte nonce. Only its **SHA-256 hash** is persisted in a new `OAuthTransaction` entity. The raw nonce is sent to Xero as the `state` parameter and is never stored.

**Transaction lifecycle:**
```
pending → processing → consumed
                 ↘ expired
                 ↘ failed
```

**Security guarantees:**
- **Cryptographically unpredictable:** 32-byte random nonce via `crypto.getRandomValues`
- **Bound to user:** `user_id` stored on transaction; verified on callback
- **Bound to tenant:** `tenant_id` stored on transaction; resolved from state (never from browser)
- **Expiry:** 10-minute TTL (`expires_at`)
- **Single-use:** `status` transitions `pending → processing → consumed`; already-consumed state is rejected
- **Nonce not persisted:** Only the SHA-256 hash is stored — a database compromise cannot reveal valid state tokens
- **Duplicate-click prevention:** Existing pending transactions for the same tenant+user are expired before creating a new one

### 4. Token Encryption (AES-GCM)

Tokens are encrypted at rest using AES-GCM via the Web Crypto API:

- **Algorithm:** AES-GCM (authenticated encryption with built-in integrity tag)
- **Key:** `INTEGRATION_ENCRYPTION_KEY` (server-side only, never exposed)
- **IV:** Unique 12-byte random IV per encrypted value
- **AAD (Additional Authenticated Data):** Provider+tenant context (e.g., `xero:tenantId`) — binds ciphertext to its tenant
- **Versioned format:** JSON payload `{ v, k, iv, data }` for forward compatibility and key rotation
- **Backward compatibility:** Legacy plaintext tokens are handled gracefully during decryption

**What is NOT used:**
- Reversible encoding or Base64 as encryption
- Hardcoded keys
- Tenant IDs as keys
- The Xero Client Secret as the encryption key

The encryption adapter is isolated in `getEncryptionKey()` within `base44/shared/cryptoUtils.ts` for future migration to AWS KMS / Google KMS / HashiCorp Vault.

### 5. Invoice Idempotency

A persistent deterministic idempotency mechanism prevents duplicate Xero invoice creation:

**Idempotency key format:** `{tenant_id}:{source_entity}:{source_record_id}:{queue_type}:{erp_target}`

**Protection layers:**
1. **Pre-API check:** If the queue entry already has an `erp_reference_id` (Xero succeeded but status update failed), it is marked as synced without re-calling the Xero API.
2. **Cross-entry check:** If another queue entry with the same idempotency key is already synced, the current entry is skipped with `skip_reason: 'duplicate_idempotency_key'` and the existing `erp_reference_id` is reused.
3. **Frontend button disabling** is still present but is no longer the sole protection — double-clicks, page refreshes, retries, and job replays are all safe.

### 6. Callback Architecture

The callback is a **frontend handoff** (not a backend callback endpoint):
1. Xero redirects the browser to `https://orbitan.io/platform/integrations?code=...&state=...`
2. The Integration Hub page detects `code` and `state` in the URL
3. It immediately invokes the backend `xeroOAuth` function with `action: 'exchange_code'`
4. The backend validates the state, exchanges the code server-side, encrypts and stores tokens
5. The frontend removes sensitive callback parameters from the browser URL via `window.history.replaceState`
6. The Integration Hub refreshes its status

The browser **never** receives:
- The Client Secret
- The resulting access or refresh token
- Any internal configuration details

### 7. Customer Connection Experience

**Disconnected state:**
- "Connect your Xero organisation to securely sync approved financial records."
- Privacy copy: "You will sign in directly with Xero. Orbitan never receives your Xero password. You choose the organisation to connect. You can disconnect at any time."
- Primary action: "Connect Xero"

**Connected state:**
- Organisation name, connected by, connected date, authorised scopes, token-health status, last successful sync
- Actions: Test Connection, Sync Now, Manage Mapping, Disconnect, Reconnect

**Platform unconfigured:**
- Customers: "Xero integration is temporarily unavailable. Please try again later or contact Orbitan Support."
- Platform Admins: Boolean configuration health (no secret values)

### 8. Structured Error Codes

All backend error responses now include an `error_code` field for programmatic frontend classification:

| Code | Customer Message |
|---|---|
| `CONFIGURATION_UNAVAILABLE` | Xero is temporarily unavailable |
| `WORKSPACE_REQUIRED` | No workspace selected |
| `PERMISSION_DENIED` | Only administrators can manage connections |
| `INVALID_STATE` | Authorisation state was invalid |
| `STATE_EXPIRED` | Authorisation has expired |
| `STATE_ALREADY_USED` | Authorisation already processed |
| `CALLBACK_FAILED` | Request was invalid |
| `TOKEN_EXCHANGE_FAILED` | Failed to complete authorisation |
| `RECONNECT_REQUIRED` | Connection expired or revoked |
| `UNKNOWN_ERROR` | Unexpected error |

## Files Changed

### Created
- `base44/shared/cryptoUtils.ts` — AES-GCM encryption utilities
- `base44/entities/OAuthTransaction.jsonc` — Single-use OAuth state entity
- `src/docs/knowledge-hub/decision-records/0060-build-28-2b-xero-oauth-domain-security-hardening.md` — This ADR

### Modified
- `base44/functions/xeroOAuth/entry.ts` — Complete rewrite (v3.0)
- `base44/functions/financeSyncProcessor/entry.ts` — Token decryption + idempotency
- `base44/entities/IntegrationCredential.jsonc` — Added `token_encryption_version`
- `base44/entities/FinanceSyncQueue.jsonc` — Added `idempotency_key`
- `src/lib/integration-errors.js` — Structured error code mapping
- `src/pages/platform/IntegrationHubPage.jsx` — Diagnostics + org selection state
- `src/pages/workspace/FinanceIntegrationPage.jsx` — Org selection message

### Secrets
- `INTEGRATION_ENCRYPTION_KEY` — Declared and set

## RBAC/RLS Impact

- `OAuthTransaction` — Admin-only CRUD (service role bypasses RLS for backend operations)
- `IntegrationCredential` — Unchanged (admin create/update/delete, tenant_admin read)
- `FinanceSyncQueue` — Unchanged (tenant-scoped, admin/tenant_admin/outlet_manager)

No new roles or capabilities introduced. Canonical roles: `admin`, `tenant_admin`.

## Portability

- Crypto utilities use Web Crypto API — portable to Deno, Node.js (with webcrypto), and browsers
- Encryption adapter is isolated in `getEncryptionKey()` for KMS migration
- OAuth state uses standard SHA-256 and random nonces — no platform-specific APIs
- Entity schemas are pure JSON — portable to any database
- The `xeroOAuth` function imports from `../../shared/cryptoUtils.ts` — same pattern as existing `serviceUtils.ts` imports

## Xero Developer Portal Configuration

The following redirect URI must be registered in the Xero Developer Portal:

```
https://orbitan.io/platform/integrations
```

No wildcard matching. No separate preview URI (preview testing should use a separately configured allowlisted URI if needed in future).

## Remaining Manual Founder Steps

1. **Xero Developer Portal:** Register `https://orbitan.io/platform/integrations` as the redirect URI (if not already done).
2. **INTEGRATION_ENCRYPTION_KEY:** Ensure a strong 32+ character random string is set in the secrets manager.
3. **Live test:** Run the minimum-credit live test plan using a Xero Demo Company.

## Related Documents
- ADR-0059 — Build #28.2A (User Profile & Xero Privacy) — superseded by this ADR for OAuth state mechanism
- ADR-0055 — Stripe Connect Architecture Lock
- `src/docs/knowledge-hub/implementation-notes/build-package-28-2b-xero-oauth-hardening.md` — Implementation notes (if created)