# ADR-0066: Orbitan.NET Domain Migration & Integration Hub Navigation Fix

**Date:** 2026-08-03  
**Build:** #28.2F.2  
**Status:** Active  
**Supersedes:** ADR-0060 (domain references), ADR-0061 (callback URI references)

## Decision

Migrate Orbitan's canonical domain from `orbitan.io` to `orbitan.net` across all active runtime, backend, frontend, PWA, and customer-facing surfaces. Simultaneously fix the verified Integration Hub dropdown navigation defect using the proper Radix `asChild` + `Link` composition pattern.

## 1. Canonical Domain Migration

### Previous Domain (Deprecated)
- `https://orbitan.io`

### New Canonical Domain
- `https://orbitan.net`

### Canonical URL Registry

A single configuration source (`CANONICAL_URLS` in `src/lib/orbitan-config.js`) is now the authority for all domain references:

| Key | Value |
|-----|-------|
| `PUBLIC_ORIGIN` | `https://orbitan.net` |
| `XERO_CALLBACK` | `https://orbitan.net/platform/integrations` |
| `SUPPORT_URL` | `/support` |
| `LEGAL_URL` | `/legal` |
| `PRIVACY_URL` | `/legal#privacy` |
| `TERMS_URL` | `/legal#terms` |
| `STATUS_URL` | `/status` |

All backend functions, frontend links, email templates, and metadata must consume these values.

## 2. Public Email Identities

Customer-facing sender and contact addresses are defined in `EMAIL_IDENTITIES` (`src/lib/orbitan-config.js`):

| Purpose | Identity |
|---------|----------|
| General enquiries | `Orbitan <hello@orbitan.net>` |
| News & announcements | `Orbitan News <news@orbitan.net>` |
| Sales & partnerships | `Orbitan Sales <sales@orbitan.net>` |
| Customer support | `Orbitan Support <support@orbitan.net>` |
| Authentication & security | `Orbitan Notifications <notifications@orbitan.net>` |
| Billing & invoices | `Orbitan Billing <billing@orbitan.net>` |
| Finance operations | `Orbitan Finance <finance@orbitan.net>` |

### Private Forwarding Destination Prohibition

Private Gmail forwarding destinations are operator-controlled infrastructure and must NEVER be:
- Stored in frontend code, backend functions, or entity records
- Committed to GitHub
- Rendered in Orbitan UI, diagnostics, or AuditLog metadata
- Used as visible From, Reply-To, or Return-Path identities
- Included in customer-facing email bodies or support pages

Email routing is managed externally through Cloudflare and Resend.

## 3. Xero OAuth Callback Migration

The `ALLOWED_ORIGINS` allowlist in `xeroOAuth/entry.ts` has been updated:

```typescript
const ALLOWED_ORIGINS = [
  'https://orbitan.net',
  'https://www.orbitan.net',
];
```

The `XERO_REDIRECT_URI` secret (managed out-of-band by the founder) must be updated to `https://orbitan.net/platform/integrations` in the Base44 secret manager and the Xero Developer Portal.

### Redirect-Domain Mismatch Detection

If the `XERO_REDIRECT_URI` secret does not start with an allowed origin, `getRedirectUri()` returns an empty string and `configured` becomes `false`. The Integration Hub UI displays a "Temporarily Unavailable" state without exposing any sensitive configuration.

## 4. Integration Hub Dropdown Navigation Fix

### Root Cause

In `UnifiedCommandNav.jsx`, the `integrations` category had `primary: { key: 'integration-hub', type: 'tab' }`. When clicked, `handleItem` called `onTabChange('integration-hub')` (setting `?section=integration-hub` in the URL) instead of navigating to the standalone route `/platform/integrations`.

### Fix

1. Changed `integration-hub` primary from `type: 'tab'` to `type: 'route'`
2. Refactored all dropdown route items to use the proper Radix `asChild` + `Link` composition pattern:

```jsx
<DropdownMenuItem asChild>
  <Link to={item.route}>...</Link>
</DropdownMenuItem>
```

This eliminates the menu-closing-before-navigation race condition without `setTimeout` or full-page reloads. Works correctly for mouse click, touch, Enter, and Space.

### Route Clarity

| Destination | Route | Entry Point |
|-------------|-------|-------------|
| Platform Integration Hub | `/platform/integrations` | Platform Console → Integrations → Integration Hub |
| Tenant Finance Integration | `/workspace/:tenantId/finance-integration` | Workspace manifest navigation |

No third integration route was created.

## 5. Private Address Exposure Remediation

### AccessEngine Bootstrap Email

The hardcoded private Gmail address `coffeeteabreak12@gmail.com` in `AccessEngine.js` (`PLATFORM_OWNER_BOOTSTRAP_EMAIL`) has been removed. Platform ownership is now determined by `platform_role === 'admin'` or `role === 'admin'` only, with no email-based matching.

### Test Fixtures

All test fixture emails in `runTests.js` and `accessEngineValidationHarness.js` have been replaced with `platform-owner@orbitan.net` (a public identity).

## 6. PWA & Metadata

- `index.html`: Added canonical URL, Open Graph, and Twitter Card meta tags pointing to `https://orbitan.net/`
- `public/manifest.json`: No domain references — uses relative paths and Base44 media CDN. No changes required.
- `public/sw.js`: No domain references — only cache name. No changes required.

## 7. Deployment & Redirect Strategy

### orbitan.io (Deprecated)

- No longer treated as the canonical origin
- If the domain remains controlled, configure a permanent redirect (301) to the corresponding `orbitan.net` path
- Do not redirect OAuth callbacks until Xero's registered callback has been migrated and verified

### Founder/Operator Checklist

External actions required (cannot be completed from the repository):

1. **Base44 Custom Domain:** Configure `orbitan.net` as the primary custom domain in Base44 settings
2. **Cloudflare DNS:** Point `orbitan.net` and `www.orbitan.net` to the Base44 deployment
3. **Cloudflare Redirects:** Configure `orbitan.io` → `orbitan.net` permanent redirects (301)
4. **Resend Verified Domain:** Verify `orbitan.net` as a sending domain in Resend
5. **SPF:** Add Resend SPF record for `orbitan.net`
6. **DKIM:** Configure DKIM signing for `orbitan.net`
7. **DMARC:** Set DMARC policy for `orbitan.net`
8. **Xero Developer Portal:** Update redirect URI to `https://orbitan.net/platform/integrations`
9. **Base44 XERO_REDIRECT_URI Secret:** Update to `https://orbitan.net/platform/integrations`
10. **Republish:** Deploy `orbitan.net` after all DNS and secret changes propagate

## Consequences

- All customer-facing URLs and emails now use `orbitan.net`
- Private Gmail addresses are eliminated from source code
- Integration Hub dropdown navigation works reliably across all input methods
- Historical ADRs (0060, 0061, 0062) retain their original domain references for audit trail integrity
- The `orbitan.io` allowlist entries have been replaced with `orbitan.net` in the Xero OAuth function