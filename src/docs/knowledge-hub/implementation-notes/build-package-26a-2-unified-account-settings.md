# Build Package #26A.2 — Unified Account Settings & Personal Security Hub

**Date:** 2026-07-26
**Build:** #26A.2
**Status:** Production-complete (account hub + truthfulness)
**MVP Completion:** ~99% (incremental — personal settings hub now production-ready)

## 1. Executive Summary

Transformed the `/settings` destination into the single canonical Account Settings hub. All personal profile, account, security, preference, privacy, session, and connected-account settings are organised into a responsive, sectioned experience. The Profile dropdown (Build #26A.1) remains a concise navigation menu that deep-links into this hub via `#section` anchors. Duplicate notification-preference logic was removed; the canonical `NotificationPreference` entity (ADR-0053) is now the sole preference store. Theme and accessibility preferences are genuinely applied app-wide (no placebo controls). Provider-limited capabilities (MFA, sessions, devices, API keys) are shown as truthful "Coming Soon"/"Planned" states — no fake controls.

## 2. Existing Implementations Audited

- `src/pages/workspace/AccountSettings.jsx` — old single-page settings (profile, notifications, org/role, activity, language/accessibility, platform console, security "Coming Soon").
- `src/components/profile/ProfilePhotoUploader.jsx` — uploads via `Core.UploadFile`, persists `user.data.photo_url`. **Genuine, reused.**
- `src/components/profile/PreferencesSection.jsx` — stored `user.data.preferences` (language, region, high_contrast, reduce_motion, large_text) but **applied nothing visually**. Replaced.
- `src/components/profile/OrgRoleCard.jsx` — read-only org/role/plan/wallet. **Genuine, reused.**
- `src/components/profile/RecentActivityFeed.jsx` — audit log feed. **Genuine, reused.**
- `src/components/orbit-inbox/InboxPreferences.jsx` — edits `NotificationPreference` entity per category (in-app/email/mute/min-priority). **Genuine, reused.**
- `src/lib/CurrencyContext.jsx` — display currency with `switchCurrency`. **Genuine, reused.**
- `src/lib/AuthContext.jsx` — `base44.auth.me/updateMe/logout`; no change-password/MFA/session APIs in the SDK.

## 3. Duplicate Implementations Found

1. **Notification preferences DUPLICATED.** Old AccountSettings stored 4 boolean toggles in `user.data.notifications`; `InboxPreferences` uses the canonical `NotificationPreference` entity (ADR-0053). Two competing systems.
2. **`full_name` editing** exposed as an editable field but `updateMe` cannot override the built-in `full_name` (provider-managed) — silently non-functional.
3. **Accessibility & language preferences** stored but never applied — placebo controls.
4. **Region currency** in `PreferencesSection` conflicted with `CurrencyContext` (two currency concepts).

## 4. Implementations Merged

- Removed `user.data.notifications` toggles; `NotificationPreference` entity is now the sole notification preference store, surfaced via the Notifications section + `InboxPreferences` dialog.
- Currency consolidated into `CurrencyContext` (personal display currency) with an explicit note distinguishing it from the tenant accounting currency.
- Theme + accessibility preferences unified under `user.data.preferences` and applied via `applyPreferences()` (app-wide, persisted).

## 5. Profile Section (completed)

- Profile photo upload (reused `ProfilePhotoUploader`).
- **Display Name** (`user.data.preferred_name`) — genuinely editable + persisted; shown in the profile header in place of the legal name.
- **Phone** (`user.data.phone`) — editable + persisted.
- **Full Legal Name** — read-only (provider-managed); no fake edit.
- **Email** — read-only.
- **Active Workspace** + **Timezone** — read-only (detected via `Intl.DateTimeFormat`).

## 6. Security Section (completed)

- Password & MFA — truthful "Coming Soon" (no SDK change-password/MFA).
- Active Sessions / Trusted Devices — truthful "Coming Soon" (no session API).
- Recent Security Activity — reuses `RecentActivityFeed`.
- Sign-out guidance — no token exposure; "Sign Out" in Account clears the session.

## 7. Sessions and Devices Validation

No session/device listing or revocation API exists in the Base44 SDK. Controls are **not** fabricated; truthful planned states shown. Sign-out (Account section) clears the local session. Documented as a provider limitation.

## 8. Notification Preferences Reused

The canonical `NotificationPreference` entity (ADR-0053) is reused via `InboxPreferences`. No second preference entity or competing logic. The Notifications section shows a live summary (in-app/email/mute state per category) and opens the full management dialog.

## 9. Theme and Display Validation

- **Theme** (System/Light/Dark) — genuinely applied via `applyPreferences()` toggling the `dark` class on `<html>`. Instant, persisted to `user.data.preferences` + localStorage.
- **Display Currency** — genuinely applied via `CurrencyContext.switchCurrency`; used across sales/finance views. Persists to `user.data.preferences.display_currency`.
- No placebo theme controls.

## 10. Language and Locale Validation

- **Language** — English only today; shown read-only with "additional languages planned" (Bahasa Melayu, 中文, தமிழ்). No placebo selector (no i18n engine).
- **Timezone** — detected read-only (`Intl.DateTimeFormat`).
- **Date & Time Format** — truthful "Planned" (no central formatter yet). No placebo control.
- Personal display currency is explicitly distinguished from tenant accounting currency.

## 11. Accessibility Settings Validation

- **Reduced Motion** — applies `.reduce-motion` (disables animations/transitions app-wide). Genuine.
- **Large Text** — applies `.large-text` (bumps root font-size to 18px, scaling rem-based UI). Genuine.
- **High Contrast** — applies `.high-contrast` (darkens muted text + borders in light and dark). Genuine.
- WCAG AA remains the default regardless of these toggles.
- Applied app-wide via `applyPreferences()` called in `AuthContext.checkUserAuth` (on auth resolve) and on every change in the hub.

## 12. Privacy and Data Validation

- **Marketing consent** + **Profile visibility** — genuine toggles persisted to `user.data.privacy`.
- **Export Your Data** — links to Data Explorer (no fabricated export).
- **Account Deletion Request** — truthful request/review workflow: flags `deletion_requested_at`, audit-logs the request, informs the user an admin will contact them. Does **not** destroy tenant-owned business records.

## 13. Connected-Account Consolidation

- **Xero** — links to the tenant-level Integration Hub (Configuration Required).
- **Stripe — Tenant Connect** — truthful "Coming Soon" (Build #26B).
- **Stripe — Platform Billing** — marked "Platform", not a personal connection.
- Ownership boundary (personal / tenant / platform) is explicit. No platform secrets exposed.

## 14. Developer / API-Key Validation

Admin-only section. API Keys, Webhooks, Integration Credentials — truthful "Planned" (no backend). No fake keys; secret-after-creation guarantee documented.

## 15. Access-Control Validation

- Developer section renders only for `user.role === 'admin'`.
- Personal preferences editable by the user themselves.
- Tenant integration connection guidance notes Tenant Admin / Platform Admin requirement.
- Reuses existing Access Engine + RLS; no new permission system.

## 16. Security Validation

- No secret exposure (no API keys shown; none exist).
- No protected-field editing (`full_name`, `email`, `role`, `tenant_id` read-only).
- Safe file upload (5 MB image-only, via `Core.UploadFile`).
- Backend authorisation via `updateMe` (user-scoped) + RLS on `NotificationPreference`.
- Audit coverage via `auditFrontend` for profile + deletion-request changes.

## 17. Accessibility Validation (WCAG AA)

Semantic section headings, associated labels, keyboard-navigable nav + forms, visible focus rings, `aria-label` on toggles, `aria-current` on active nav, status not colour-only (text labels + dashed borders), reduced-motion respected.

## 18. Responsive Validation

- Nav: horizontal scroll on mobile, vertical on `lg`. Works at 320px/375px/tablet/laptop/desktop/ultrawide/PWA.
- Forms use responsive grids; no overflow; buttons reachable; no clipped modals.
- Hub fits within viewport; no internal scrollbar on desktop.

## 19. Components Reused

`ProfilePhotoUploader`, `OrgRoleCard`, `RecentActivityFeed`, `InboxPreferences` (+ `inboxConfig`), `CurrencyContext`, shadcn `Button/Input/Label/Switch/Select/Avatar`, `useToast`, `useAuth`, `useWorkspace`, `auditFrontend`, `LOGO_ASSETS`, lucide icons.

## 20. Backend Functions Reused

None new. Reuses `base44.auth.updateMe` / `me` / `logout`, `Core.UploadFile`, and the `NotificationPreference` entity SDK.

## 21. New Entities Created

None.

## 22. Files Modified

1. `src/pages/workspace/AccountSettings.jsx` — rewritten as the sectioned hub.
2. `src/lib/AuthContext.jsx` — applies user preferences on auth resolve.
3. `src/index.css` — accessibility preference classes (`.reduce-motion`, `.large-text`, `.high-contrast`).

## 23. Files Created

1. `src/lib/preferences.js` — `applyPreferences` / `getStoredPrefs` / `DEFAULT_PREFS`.
2. `src/components/account-settings/sections/ProfileSection.jsx`
3. `src/components/account-settings/sections/AccountSection.jsx`
4. `src/components/account-settings/sections/SecuritySection.jsx`
5. `src/components/account-settings/sections/PreferencesSection.jsx`
6. `src/components/account-settings/sections/AccessibilitySection.jsx`
7. `src/components/account-settings/sections/PrivacySection.jsx`
8. `src/components/account-settings/sections/NotificationsSection.jsx`
9. `src/components/account-settings/sections/ConnectedAccountsSection.jsx`
10. `src/components/account-settings/sections/DeveloperSection.jsx`
11. This implementation note.

## 24. Files Deleted

1. `src/components/profile/PreferencesSection.jsx` — replaced by the new focused `account-settings/sections/PreferencesSection.jsx` + `AccessibilitySection.jsx` with genuine application; was only imported by the old AccountSettings.

## 25. GitHub Commit Summary

```
Build #26A.2: Unified Account Settings & Personal Security Hub

- /settings → sectioned hub (Profile, Account, Security, Preferences,
  Accessibility, Notifications, Privacy, Connected Accounts, Developer)
- Removed duplicate user.data.notifications; canonical NotificationPreference
  entity (ADR-0053) is the sole preference store
- Theme (light/dark/system) + accessibility (reduced motion, large text,
  high contrast) genuinely applied app-wide via applyPreferences()
- Display currency wired to CurrencyContext; personal vs tenant boundary clear
- full_name/email read-only (provider-managed); preferred_name editable
- MFA, sessions, devices, API keys → truthful Coming Soon/Planned (no fake)
- Account deletion = request/review (no tenant data destruction)
- WCAG AA, responsive 320→ultrawide, no placebo controls
- Removed: components/profile/PreferencesSection.jsx (replaced)
```

## 26. Updated MVP Completion Percentage

~99% (incremental). The personal settings surface is now production-ready and truthful.

## 27. Remaining Known Limitations

- **MFA / sessions / devices** — provider-limited (no Base44 SDK); truthful "Coming Soon".
- **API keys / webhooks** — no backend; truthful "Planned".
- **Language (full i18n)** + **date/time format selector** — no engine/formatter; truthful planned.
- **Account Settings in-page sections** for Security/Theme/etc. are reached via the hub; deeper sub-page routing is not added (single-page hub is sufficient for MVP).
- **Xero activation** still requires external `XERO_CLIENT_ID`/`XERO_CLIENT_SECRET`.
- **Tenant Stripe Connect** deferred to Build #26B.

## Conclusion

UNIFIED ACCOUNT SETTINGS COMPLETE