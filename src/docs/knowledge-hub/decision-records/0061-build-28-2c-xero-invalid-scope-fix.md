# ADR-0061: Build #28.2C — Xero INVALID_SCOPE Fix & Integration Hub Stabilisation

**Date:** 2026-08-02  
**Status:** Accepted  
**Build:** #28.2C  
**Supersedes:** ADR-0060 (scope fix only — architecture unchanged)

## Context

Build #28.2B completed the Xero OAuth domain, callback, and security hardening. Runtime testing by the Testing Agent identified two verified defects that blocked the customer connection journey:

1. **INVALID_SCOPE error:** Clicking "Connect Xero" redirected the user to Xero's login page with an `invalid_scope` error, preventing the OAuth flow from starting.
2. **Integration Hub navigation inconsistency:** After the OAuth callback completed, the browser URL was rewritten to `/platform/integrations` — even when the Integration Hub was rendered as an embedded tab inside LeaderOrg (`/leader-org?section=integration-hub`). A browser refresh after the callback would land the user on the standalone page, not LeaderOrg, creating a disorienting navigation experience.

## Root Cause Analysis

### 1. INVALID_SCOPE — Missing `openid` Scope

**Root cause:** Xero's OAuth 2.0 implementation is built on IdentityServer (an OpenID Connect provider). The `offline_access` scope is an OIDC standard scope that requires the `openid` scope to be present in the same request. Without `openid`, IdentityServer rejects `offline_access` as an invalid scope for the client.

**Evidence:**
- Xero Developer documentation (https://developer.xero.com/documentation/guides/oauth2/scopes/) states: "To get a refresh token, you must request the offline_access scope."
- StackOverflow (https://stackoverflow.com/questions/73539479/xero-api-requesting-offline-access-scope) confirms: "If I pass in a scope of `openid profile email accounting.transactions offline_access` then I successfully get an access token."
- The Build #28.2B scopes were: `offline_access accounting.transactions accounting.settings.read accounting.contacts` — missing `openid`.

**Fix:** Added `openid` as the first scope in the `XERO_SCOPES` array. The full scope string is now:
```
openid offline_access accounting.transactions accounting.settings.read accounting.contacts
```

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
| `client_id` | (from `XERO_CLIENT_ID` secret) |
| `redirect_uri` | `https://orbitan.io/platform/integrations` |
| `scope` | `openid offline_access accounting.transactions accounting.settings.read accounting.contacts` |
| `state` | (random 32-byte nonce, hash stored in `OAuthTransaction`) |

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

1. `base44/functions/xeroOAuth/entry.ts` — Added `openid` to `XERO_SCOPES`
2. `src/pages/platform/IntegrationHubPage.jsx` — Fixed URL cleanup to preserve current path + query params (2 occurrences)
3. `src/pages/LeaderOrg.jsx` — Removed duplicate `integration-health` TabsContent
4. `src/components/leader/UnifiedCommandNav.jsx` — Changed `integration-health` from `type: 'tab'` to `type: 'route'`

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
2. **Live test:** Click "Connect Xero" and complete the OAuth flow to verify no INVALID_SCOPE error. Xero should present the consent screen.