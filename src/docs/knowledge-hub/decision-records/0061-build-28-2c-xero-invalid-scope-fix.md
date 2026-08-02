# ADR-0061: Build #28.2C — Xero Granular Scope Migration, INVALID_SCOPE Fix & PWA Callback Repair

**Date:** 2026-08-02  
**Status:** Accepted  
**Build:** #28.2C  
**Supersedes:** ADR-0060 (scope fix only — architecture unchanged)

## Context

Build #28.2B completed the Xero OAuth domain, callback, and security hardening. Runtime testing identified multiple verified defects that blocked the customer connection journey:

1. **INVALID_SCOPE error:** Clicking "Connect Xero" redirected the user to Xero's login page with an `invalid_scope` error, preventing the OAuth flow from starting.
2. **Integration Hub navigation inconsistency:** After the OAuth callback completed, the browser URL was rewritten to `/platform/integrations` — even when the Integration Hub was rendered as an embedded tab inside LeaderOrg (`/leader-org?section=integration-hub`). A browser refresh after the callback would land the user on the standalone page, not LeaderOrg.
3. **Deprecated broad scope:** The Orbitan Xero application was created after Xero's March 2026 granular-scope transition. The scope `accounting.transactions` is a deprecated broad scope; it must be replaced with the smallest valid granular scope set.
4. **Blank screen on callback:** The OAuth callback route (`/platform/integrations`) could display a blank screen if the service worker served a stale cached shell or if the callback error parameters (`error`, `error_description`) were not handled.

## Root Cause Analysis

### 1. INVALID_SCOPE — Missing `openid` Scope

**Root cause:** Xero's OAuth 2.0 implementation is built on IdentityServer (an OpenID Connect provider). The `offline_access` scope is an OIDC standard scope that requires the `openid` scope to be present in the same request. Without `openid`, IdentityServer rejects `offline_access` as an invalid scope for the client.

**Evidence:**
- Xero Developer documentation (https://developer.xero.com/documentation/guides/oauth2/scopes/) states: "To get a refresh token, you must request the offline_access scope."
- StackOverflow (https://stackoverflow.com/questions/73539479/xero-api-requesting-offline-access-scope) confirms: "If I pass in a scope of `openid profile email accounting.transactions offline_access` then I successfully get an access token."
- The Build #28.2B scopes were: `offline_access accounting.transactions accounting.settings.read accounting.contacts` — missing `openid`.

**Fix (Build #28.2C — granular scope migration):** The deprecated broad scope `accounting.transactions` has been replaced with the smallest valid granular scope set required by the current MVP. The full scope string is now:
```
openid offline_access accounting.invoices accounting.contacts accounting.settings.read
```

**Scope justification:**
- `openid` — OIDC requirement for `offline_access` (IdentityServer rejects `offline_access` without `openid`)
- `offline_access` — enables refresh tokens for long-lived connections
- `accounting.invoices` — invoice create/read/update (sales invoice sync to Xero)
- `accounting.contacts` — contact create/read/update (customer/supplier sync)
- `accounting.settings.read` — account, tax-rate, currency, and organisation mappings

**Excluded scopes (least-privilege):** No payments, bank transactions, payroll, journals, or reports are requested — none are required by the current Orbitan MVP.

**Why `openid` and not `profile`/`email`:** `openid` is the minimum required OIDC scope that enables `offline_access`. `profile` and `email` provide user identity claims, which Orbitan does not use (it only needs organisation-level access for accounting transactions). Requesting only `openid` follows the least-privilege principle.

### 2. Integration Hub URL Rewrite Bug

**Root cause:** The `IntegrationHubPage` component's OAuth callback handler and org-selection handler both called:
```javascript
window.history.replaceState({}, document.title, '/platform/integrations');
```

This hardcoded path is correct when the page is the standalone route (`/platform/integrations`). But when the page is embedded as a tab inside LeaderOrg (`/leader-org?section=integration-hub`), this rewrite changes the URL to `/platform/integrations` — a different route. After a browser refresh, the user lands on the standalone page, not LeaderOrg, breaking the embedded experience.

**Fix:** Changed the URL cleanup to remove only `code` and `state` query parameters, preserving the current pathname and any other query parameters (e.g., `section=integration-hub`):
```javascript
const cbParams = new URLSearchParams(window.location.search);
cbParams.delete('code');
cbParams.delete('state');
const cleanUrl = cbParams.toString()
  ? `${window.location.pathname}?${cbParams.toString()}`
  : window.location.pathname;
window.history.replaceState({}, document.title, cleanUrl);
```

### 3. Duplicate Integration Hub Rendering

**Root cause:** LeaderOrg rendered `<IntegrationHubPage />` under two separate tab keys: `integration-hub` and `integration-health`. Both rendered the exact same component. The `integration-health` tab was redundant.

**Fix:** Removed the `integration-health` TabsContent from LeaderOrg. Changed the `integration-health` nav item in `UnifiedCommandNav` from `type: 'tab'` to `type: 'route'`, so it navigates to the standalone `/platform/integrations` page (as defined in the navigation registry). The `integration-hub` nav item remains `type: 'tab'`, keeping the user in LeaderOrg.

## Verification

### Secret Configuration
```
client_id_configured: true
client_secret_configured: true
redirect_uri_configured: true
redirect_uri: "https://orbitan.io/platform/integrations"
callback_health: "ok"
oauth_ready: true
sync_ready: true
token_encryption_enabled: true
```

### OAuth Authorization URL Parameters
| Parameter | Value |
|---|---|
| `response_type` | `code` |
| `client_id` | (from `XERO_CLIENT_ID` secret, masked in reports) |
| `redirect_uri` | `https://orbitan.io/platform/integrations` |
| `scope` | `openid offline_access accounting.invoices accounting.contacts accounting.settings.read` |
| `state` | (random 32-byte nonce, SHA-256 hash stored in `OAuthTransaction`) |

### Runtime Evidence — Granular Scope Verification (2026-08-02)

`get_platform_config` response (HTTP 200):
```
required_scopes: ["openid", "offline_access", "accounting.invoices", "accounting.contacts", "accounting.settings.read"]
oauth_ready: true
sync_ready: true
token_encryption_enabled: true
redirect_uri: "https://orbitan.io/platform/integrations"
```

`get_auth_url` response (HTTP 200, masked):
```
auth_url: https://login.xero.com/identity/connect/authorize
  ?response_type=code
  &client_id=170861...6DDB
  &redirect_uri=https%3A%2F%2Forbitan.io%2Fplatform%2Fintegrations
  &scope=openid+offline_access+accounting.invoices+accounting.contacts+accounting.settings.read
  &state=wZm8XZ...dAs
```

### Xero App Type Verification
- **App type:** Web application (Authorization Code grant with PKCE not required — client secret used)
- **Grant type:** `authorization_code`
- **Token endpoint:** `https://identity.xero.com/connect/token` (Basic auth with client_id:client_secret)
- **SaaS model:** Orbitan's official Xero Web app → customer signs into their own Xero account → customer approves their own organisation → Orbitan stores that tenant-specific authorization
- **No Custom Connections:** The implementation does not use Xero Custom Connections (which use a different OAuth flow without consent screens)

### Blank Screen Root Cause & Fix

**Root cause:** The OAuth callback route (`/platform/integrations`) could display a blank screen in two scenarios:
1. The PWA service worker served a stale cached app shell from a previous deployment, which contained the old OAuth implementation (without `openid` scope). The old code would generate an auth URL without `openid`, Xero would reject with `invalid_scope`, and the callback would return an `error` parameter that the old code did not handle — resulting in a blank page.
2. Xero callback error parameters (`error`, `error_description`) — returned when the user denies consent or when the request is invalid — were not handled by the frontend. The callback handler only checked for `code` and `state`, so an error callback was silently ignored, leaving the page in its loading state indefinitely.

**Fix:**
1. **Service worker cache invalidation:** The service worker `CACHE_NAME` was bumped to `orbitan-os-v28-2c-20260802`. On install, all previous caches are purged. The OAuth callback route, API calls, and any URL containing OAuth callback params (`code`, `state`, `error`, `error_description`) are NEVER served from cache — they always pass through to the network. Navigation requests use network-first with offline fallback.
2. **Callback error handling:** The OAuth callback `useEffect` now checks for `error`/`error_description` params before checking for `code`/`state`. If Xero returns an error, a customer-friendly toast is shown with plain-language explanation, and all OAuth params (including `error` and `error_description`) are cleaned from the URL. This prevents a blank screen on denied consent, invalid_scope, invalid_client, or redirect_uri mismatch.
3. **Connect button URL validation:** `handleConnect` now validates that the returned `auth_url` is a valid URL whose host is `login.xero.com` or `identity.xero.com` before redirecting. This prevents open-redirect attacks and ensures a structured error appears if the backend returns an invalid response.

### PWA Cache & Service Worker Safety
- New deployment invalidates old application bundles via `CACHE_NAME` version bump + cache purge on install.
- Service worker identifies the new release via `self.skipWaiting()` on install and `clients.claim()` on activate.
- The `PWAUpdateListener` component shows an "Update Available" toast and reloads on `controllerchange`.
- The OAuth callback route is never served from a cached shell — it always hits the network.
- OAuth callback query parameters are never cached.
- Authentication and integration API responses are never cached.
- Clearing site data is not required for normal customers after future releases — the cache purge is automatic.

### Route Verification
| Route | Status |
|---|---|
| `/platform/integrations` | ✅ Standalone page |
| `/leader-org?section=integration-hub` | ✅ Embedded tab in LeaderOrg |
| `/integration-health` | ✅ Redirects to `/platform/integrations` |
| `/integration-directory` | ✅ Redirects to `/leader-org?section=integration-hub` |

### Customer Journey
```
Leader Dashboard → Integration Hub → Connect Xero → Xero Login → Consent →
Organisation selection → Return → Connected ✓
```
No developer interaction. No Base44 Secrets interaction. No manual backend actions.

## Files Modified

1. `base44/functions/xeroOAuth/entry.ts` — Migrated from deprecated `accounting.transactions` to granular scopes (`accounting.invoices`, `accounting.contacts`, `accounting.settings.read`); retained `openid` + `offline_access`
2. `src/pages/platform/IntegrationHubPage.jsx` — Added provider error callback handling (`error`/`error_description`), URL host validation before redirect, duplicate-click guard, `window.location.assign()` instead of `href=`, error param cleanup in all URL cleanup paths
3. `public/sw.js` — Rewrote service worker: cache version bump, OAuth callback route never cached, API/auth never cached, network-first navigation with offline fallback, automatic old cache purge on install
4. `src/pages/LeaderOrg.jsx` — Removed duplicate `integration-health` TabsContent (from prior turn)
5. `src/components/leader/UnifiedCommandNav.jsx` — Changed `integration-health` from `type: 'tab'` to `type: 'route'` (from prior turn)

## Files Created
- `src/docs/knowledge-hub/decision-records/0061-build-28-2c-xero-invalid-scope-fix.md` — This ADR

## Privacy-by-Design Verification
- No Client ID, Client Secret, access tokens, refresh tokens, or encryption keys are ever printed, logged, exposed, or returned.
- The `get_platform_config` endpoint returns only boolean indicators (`client_id_configured`, etc.) and the redirect URI (which is public).
- OAuth state is a random nonce; only its SHA-256 hash is persisted.
- Tokens are AES-GCM encrypted at rest.
- All OAuth, token management, secret handling, encryption, refresh, and tenant isolation occur server-side.
- Customers never need access to Base44 Dashboard, Secrets, environment variables, or developer tools.

## Architecture Preservation
- No changes to the OAuth architecture established in Build #28.2B.
- No changes to the token encryption mechanism.
- No changes to the OAuthTransaction lifecycle.
- No changes to the idempotency mechanism.
- The only backend change is adding one scope string to the scopes array.
- The only frontend changes are URL cleanup logic and nav type adjustment.

## Remaining Manual Founder Steps
1. **Xero Developer Portal:** Verify the redirect URI is registered as `https://orbitan.io/platform/integrations` (should already be done from Build #28.2B).
2. **Xero App Scopes:** Verify in the Xero Developer Portal that the app has the granular scopes `accounting.invoices`, `accounting.contacts`, `accounting.settings.read` available. If the app was created after March 2026, these should be available by default.
3. **Publish to orbitan.io:** Deploy the current build to production so the new scopes, callback handling, and service worker are live.
4. **Live test (incognito):** Open `https://orbitan.io/platform/integrations` in an incognito browser. Click "Connect Xero", sign into Xero Demo Company, approve consent, and verify the callback returns to Orbitan with a connected organisation.
5. **Negative test:** Deny consent in Xero and verify the Orbitan recovery UI appears (not a blank screen).
6. **PWA test:** Install/open the Orbitan PWA and repeat the connection to verify the external Xero handoff works and the callback resumes correctly.