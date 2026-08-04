---
title: Orbitan Cookie Policy Framework
category: Legal
owner: Product Owner
status: Draft
version: 0.1
last_updated: 2026-07-13
related:
  - PrivacyPolicy.md
tags:
  - legal
  - cookies
  - tracking
  - consent
---

# Orbitan Cookie Policy Framework

## Purpose

Framework for the Orbitan cookie policy. Must be reviewed by legal counsel.

## Cookie Usage

OrbitanOS uses cookies and local storage for:

### Essential Cookies (Required)
- **Authentication session** — Maintains user login session
- **CSRF protection** — Prevents cross-site request forgery
- **Security tokens** — Platform-managed auth tokens

### Functional Cookies
- **User preferences** — Theme (dark/light), language, currency
- **Workspace context** — Last visited tenant/outlet

### Analytics (Anonymised, Configurable)
- **Usage patterns** — Module access, feature adoption (anonymised, aggregated)
- **Performance metrics** — Page load times, API latency

### No Advertising Cookies
Orbitan does not use advertising cookies or third-party ad trackers.

## Cookie Management

### Session Storage
- Auth tokens stored in secure, HTTP-only cookies (platform-managed)
- User preferences in localStorage

### Expiration
- Session cookies expire on logout or after platform-managed timeout
- Preference cookies persist until cleared by user

## User Consent

### Authenticated Users
- Consent implied by using the platform (B2B SaaS)
- Users can configure analytics preferences in Account Settings
- Users can opt out of non-essential analytics

### Public Pages (Landing, Auth Gateway)
- Minimal cookies (session only)
- No third-party trackers
- No advertising cookies

## Third-Party Services

### Stripe
- Stripe uses cookies on checkout pages
- See Stripe's privacy policy for details

### Google (OAuth)
- Google OAuth uses cookies for authentication
- See Google's privacy policy for details

### Xero (When authorised)
- Xero uses cookies when integration is active
- See Xero's privacy policy for details

## PWA Considerations

- PWA service worker (`public/sw.js`) caches app shell
- Cached data is non-personal (HTML, CSS, JS)
- Users can clear cache via browser settings

## Status

This is a framework. Legal counsel must review and finalise before publication.

## Related Documents

- [PrivacyPolicy.md](./PrivacyPolicy.md) — Privacy policy