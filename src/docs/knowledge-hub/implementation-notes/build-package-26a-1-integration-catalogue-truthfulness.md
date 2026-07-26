# Build Package #26A.1 — Integration Catalogue Truthfulness & Account Menu Consolidation

**Date:** 2026-07-26
**Build:** #26A.1
**Status:** Production-complete (corrective UI/IA)
**MVP Completion:** ~98.5% (incremental — truthfulness + IA correction, no new scope)

## Executive Summary

A corrective UI/UX and information-architecture pass. The Integration Catalogue previously labelled every listed connector as "Available" regardless of whether a backend implementation existed — misleading for a production pilot. Build #26A.1 audits every connector against the actual implementation and assigns one of seven truthful statuses. The Profile dropdown was too tall (internal scrollbar, duplicated Account Settings with Security/Theme/Language/etc.); it is consolidated into a concise account-navigation menu that fits the viewport, with sub-settings reached via Account Settings rather than duplicated in the dropdown.

No new integration backend development. No new pages. No duplicate settings pages. No fake OAuth/setup flows.

## 1. Integration Status Definitions

| Status | Meaning |
|---|---|
| Connected | The tenant or platform has a working authenticated connection |
| Ready to Connect | Complete backend + OAuth + UI exist; only the user's connect action remains |
| Configuration Required | Implemented but mandatory platform configuration/secrets are missing |
| Beta | Genuinely functional but undergoing controlled testing |
| Planned | On the product roadmap; not implemented |
| Coming Soon | Actively planned for an upcoming release; not usable today |
| Unavailable | Cannot currently be used for this tenant/role/plan/region/config |

"Available" is never used merely because a connector is listed.

## 2. Misleading Statuses Found

The previous `IntegrationCatalog` rendered a static list where most connectors showed "Available" (light-blue badge) and a few showed "Coming Soon". Verified against actual implementation:

- Xero — labelled "Available"; reality: backend exists but `XERO_CLIENT_ID`/`XERO_CLIENT_SECRET` are not set → **Configuration Required**.
- Stripe — single generic card labelled "Active"; reality: only **Platform Billing** is live; **Tenant Stripe Connect** is not implemented.
- QuickBooks — "Available"; no backend → **Planned**.
- All Microsoft connectors (365, Outlook, Teams, SharePoint, Word, Excel, PowerPoint, OneNote) — "Available"; no backend → **Planned**.
- All Google connectors (Workspace, Calendar, Drive, Meet) — "Available"; no backend → **Planned**.
- WhatsApp — "Coming Soon" (correct).
- Slack — "Available"; no app-level backend → **Planned**.
- DocuSign, Dropbox, Box — "Available"; no backend → **Planned**.
- Todoist, Wrike — "Available"; no backend → **Planned**.
- Salesforce, Meta Ads — "Available"; no backend → **Planned**.
- Shopify — "Coming Soon" (correct).

## 3. Connector Classifications Corrected

| Connector | Previous | Corrected | Evidence |
|---|---|---|---|
| Stripe Platform Billing | Active (generic Stripe) | **Connected** (platform-managed, live) | Stripe Live Mode, `stripeCheckout`/`stripeWebhook` live |
| Xero | Available | **Configuration Required** | `xeroOAuth` exists; secrets not set |
| Tenant Stripe Connect | (implicit "post-MVP") | **Coming Soon** | ADR-0055 locked, deferred to #26B |
| QuickBooks | Available | **Planned** | no backend |
| Microsoft ×8 | Available | **Planned** | no backend |
| Google ×4 | Available | **Planned** | no backend |
| WhatsApp | Coming Soon | **Coming Soon** | correct |
| Slack | Available | **Planned** | no app backend |
| DocuSign/Dropbox/Box | Available | **Planned** | no backend |
| Todoist/Wrike | Available | **Planned** | no backend |
| Salesforce/Meta Ads | Available | **Planned** | no backend |
| Shopify | Coming Soon | **Coming Soon** | correct |

## 4. Working Integrations

- **Stripe — Platform Billing**: Connected (platform level). Live Mode, accepting real payments for OrbitanOS subscriptions. Managed in the dedicated card on the Integration Hub.

## 5. Configuration-Required Integrations

- **Xero**: Configuration Required until `XERO_CLIENT_ID` and `XERO_CLIENT_SECRET` are set. The dedicated card shows the missing-prerequisite summary, redirect URI, required scopes, and a "View Platform Settings" path for platform admins. Connect Xero stays disabled until configured.

## 6. Planned Integrations

All third-party connectors in the catalogue (QuickBooks, Microsoft family, Google family, Slack, DocuSign, Dropbox, Box, Todoist, Wrike, Salesforce, Meta Ads) are **Planned**. WhatsApp and Shopify are **Coming Soon**. Tenant Stripe Connect is **Coming Soon**. Planned connectors use a muted, dashed-border treatment with a "Request" action linking to Send Feedback — no fake OAuth or setup flow.

## 7. Profile-Menu Duplications Found

The previous UserMenu (Build #25) listed: My Profile, Account Settings, Notifications, Security & Sessions, Switch Workspace, Connected Accounts, Theme, Language, Accessibility, Keyboard Shortcuts, Orbit Wallet, Audit Logs, Help Centre, Feedback — 14 items + sign out, with an internal `max-h-60vh` scrollbar. Security, Sessions, Theme, Language, Accessibility, Keyboard Shortcuts duplicated destinations that belong in Account Settings, making the menu too tall and redundant.

## 8. Profile-Menu Items Consolidated

Consolidated to a concise set that fits the viewport with no internal scroll:

- **Account**: My Profile, Account Settings, Notifications
- **Workspace**: Switch Workspace, Connected Accounts
- **Platform** (admin only): Orbit Wallet, Audit Logs, Platform Settings
- **Support**: Help Centre, Send Feedback
- **Sign Out**

10 navigation items + sign out. Removed from the dropdown: Security & Sessions, Theme, Language, Accessibility, Keyboard Shortcuts.

## 9. Account Settings Items Reused

The removed items (Security, Sessions, Devices, Theme, Language, Accessibility, Keyboard Shortcuts, Privacy, Notification Preferences, MFA, Connected Integrations, API Keys) are reached via the single **Account Settings** destination (`/settings`). No duplicate pages were created; Account Settings remains the single hub for these preferences. (Building the individual sections within Account Settings is a separate, deferred build — not in scope here.)

## 10. Workspace Selector Validation

Workspace switching remains primarily in the dedicated Select Workspace component (`TenantSwitcher`). The Profile dropdown contains only one "Switch Workspace" shortcut (`/workspace`) — the full switching UI is not duplicated. The guided empty state ("You haven't joined any workspaces yet…") with Request Access / Create Workspace / Platform Console actions is retained in `TenantSwitcher` (unchanged from Build #25).

## 11. RBAC Validation

- Profile menu Platform section renders only for `user.role === 'admin'`.
- "Platform Settings" links to `/platform/integrations`, whose admin-only Platform Integration Settings section is gated to Platform Admin (Build #26A).
- Catalogue "Request" actions link to `/feedback` (accessible to all authenticated users) — no privileged surface.
- No fake admin actions surfaced to non-eligible roles.

## 12. Accessibility Validation (WCAG AA)

- Catalogue cards carry `aria-label="{name} — {status}"`; planned icons `aria-hidden`.
- Profile menu items are semantic Links/Buttons with text labels (no icon-only actions).
- Status is never colour-only: every badge includes a text label; planned cards use dashed borders + opacity + "Planned"/"Coming Soon" text.
- Focus-visible rings on all interactive elements.
- Keyboard navigation preserved (Radix Popover manages focus; items are focusable Links; menu closes on selection).
- Touch targets meet 44px guidance on the "Request" link and menu items.

## 13. Responsive Validation

- Catalogue grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` — no horizontal overflow 320px → ultrawide.
- Profile menu: `w-64` (256px), no internal scroll, fits viewport on laptop/desktop; Popover flips/clamps to viewport; on narrow screens it remains usable (Radix positioning avoids clipping behind sticky headers).
- No clipped profile menu, no unusable internal scrolling at 320px/375px/tablet/laptop/desktop/ultrawide/PWA standalone.

## 14. Components Reused

Badge, Avatar, Popover, lucide-react icons, cn, Link (react-router), useAuth, useWorkspace. No new components created.

## 15. Files Modified

1. `src/components/platform/IntegrationCatalog.jsx` — truthful statuses, muted planned treatment, "Request" action, honest intro.
2. `src/components/shared/UserMenu.jsx` — consolidated concise menu (10 items + sign out + compact footer), no internal scrollbar, honest environment label.

## 16. Files Created

1. This implementation note.

## 17. Files Deleted

None.

## 18. GitHub Commit Summary

```
Build #26A.1: Integration Catalogue Truthfulness & Account Menu Consolidation

- IntegrationCatalog: truthful statuses (Planned/Coming Soon) for all
  third-party connectors; no connector labelled Available without a backend;
  muted dashed treatment for planned; "Request Integration" → feedback
- Xero and Stripe managed by dedicated cards above (not duplicated)
- UserMenu: consolidated to concise account nav (Account/Workspace/Platform/Support)
  + Sign Out; removed Security/Theme/Language/Accessibility/Keyboard Shortcuts
  (reached via Account Settings); fits viewport, no internal scrollbar
- Compact footer: version + honest runtime environment (Production/Preview)
  + workspace + role, one-line
- WCAG AA, responsive 320px→ultrawide, no fake OAuth flows
```

## 19. Updated MVP Completion Percentage

~98.5% (incremental). Catalogue and account-menu IA now production-ready and truthful.

## 20. Remaining Known Limitations

- **Account Settings sections** (Security, Sessions, Devices, Theme, Language, Accessibility, Keyboard Shortcuts, Privacy, Notification Preferences, MFA, Connected Integrations, API Keys) are not yet built as in-page sections — they are reached via the Account Settings destination but the sections themselves are a deferred build.
- **Xero activation** still requires external `XERO_CLIENT_ID`/`XERO_CLIENT_SECRET` (Platform Owner action).
- **Tenant Stripe Connect** deferred to Build #26B (pending `STRIPE_CONNECT_CLIENT_ID`).
- **Connector readiness matrix** lives in this note; a live "Request Integration" queue (tracking requests in an entity) is a future enhancement — currently requests route to Send Feedback.

## Conclusion

INTEGRATION CATALOGUE AND ACCOUNT MENU COMPLETE