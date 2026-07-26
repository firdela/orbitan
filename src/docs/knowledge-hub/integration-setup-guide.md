# Integration Setup & Troubleshooting Guide

**Build:** #26A
**Last updated:** 2026-07-26

This guide covers Xero setup, the required redirect URI and scopes, platform secret-readiness, and troubleshooting for the OrbitanOS Integration Hub. Tenant Stripe Connect is architecture-locked (ADR-0055) and deferred to Build #26B — see the deferred section.

---

## 1. Xero Setup Instructions

### Prerequisites (Platform Owner action — external)

1. Register a Xero OAuth 2.0 app at https://developer.xero.com (My Apps → New App).
2. Set the **Redirect URI** to your deployed app origin + `/platform/integrations`:
   - Production: `https://{your-app-domain}/platform/integrations`
3. Grant the required scopes (see §2).
4. Copy the **Client ID** and **Client Secret**.
5. In Base44, go to **Settings → Environment Variables** and add:
   - `XERO_CLIENT_ID` = your Client ID
   - `XERO_CLIENT_SECRET` = your Client Secret
   These values are stored securely out-of-band and never exposed in the UI or API responses.

Once both secrets are set, the **Connect Xero** button on the Integration Hub enables automatically and the full OAuth flow works end-to-end.

### Tenant action (Finance user)

1. Open **Integration Hub** (`/platform/integrations`).
2. In the Xero card, click **Connect Xero**.
3. Authorise the Xero organisation you want to sync to.
4. You are redirected back to the Integration Hub; the connection is stored and audit-logged.
5. Click **Test Connection** to verify, and **Sync Now** to process pending finance records.

---

## 2. Required Redirect URI and Scopes

| Item | Value |
|---|---|
| Redirect URI | `{app-origin}/platform/integrations` |
| Callback URL | same as Redirect URI (OAuth code exchange happens in-page) |

Required scopes (configured in the `xeroOAuth` function):

- `offline_access` — enables refresh tokens
- `accounting.transactions` — read/write invoices, bills, manual journals
- `accounting.settings.read` — read the connected organisation
- `accounting.contacts` — contact resolution for invoices/bills

---

## 3. Platform Secret-Readiness Guide

The Integration Hub's **Platform Integration Settings** section (admin-only) shows boolean readiness — it never exposes secret values. To add or rotate credentials, use Base44 Settings → Environment Variables.

| Secret | Purpose | Set by |
|---|---|---|
| `XERO_CLIENT_ID` | Xero OAuth client | Platform Owner |
| `XERO_CLIENT_SECRET` | Xero OAuth secret | Platform Owner |
| `STRIPE_SECRET_KEY` | Platform Billing API | Platform Owner (already set) |
| `STRIPE_PUBLISHABLE_KEY` | Platform Billing frontend | Platform Owner (already set) |
| `STRIPE_WEBHOOK_SECRET` | Platform Billing webhook | Platform Owner (already set) |
| `STRIPE_CONNECT_CLIENT_ID` | Tenant Stripe Connect (deferred) | Platform Owner (Build #26B) |

---

## 4. Troubleshooting

| Symptom | Likely cause | Recommended fix |
|---|---|---|
| Connect Xero button disabled | `XERO_CLIENT_ID` / `XERO_CLIENT_SECRET` not set | Platform Owner adds the secrets in Base44 Settings |
| "Token expired" / Reconnection Required | Access token expired and refresh failed | Click **Reconnect Xero** |
| "Connection revoked" after Test Connection | Tenant revoked access in their Xero dashboard | Reconnect Xero; the connection auto-marks `expired` |
| Sync Now disabled | Xero not connected | Connect Xero first |
| Repeated sync failures | Underlying record rejected by Xero (bad payload, missing contact) | Open Sync Queue, read `last_error` per entry, fix the source record, re-run Sync Now |
| Pending sync backlog growing | Syncs not being run | Run Sync Now; consider scheduling the `integrationSync` automation for end-of-day |
| "Platform Setup Required" banner | Xero not configured | See §1 |

### Deterministic health checks

The Integration Health panel runs deterministic checks (no AI). Conditions it detects and recommends fixes for:

- Missing platform configuration
- Disconnected account
- Expired token
- Revoked access
- Failed API test
- Repeated sync failures
- Pending sync backlog
- Healthy connection

---

## 5. Deferred — Tenant Stripe Connect (Build #26B)

Architecture locked in ADR-0055. **Not implemented in Build #26A.**

Prerequisites for Build #26B:
1. Register a Stripe Connect platform application and obtain `STRIPE_CONNECT_CLIENT_ID`.
2. Set `STRIPE_CONNECT_CLIENT_ID` in Base44 secret management.
3. Confirm the onboarding mechanism to use (must follow Stripe's officially supported approach at implementation time — do not hard-code a deprecated onboarding method).

Build #26B will implement: `stripeConnect` function (connect/reconnect/disconnect/status/sync_payments/sync_payouts/sync_refunds/sync_customers/test_connection), `stripeConnectWebhook` handler with signature verification + idempotency, and tenant-isolated `IntegrationCredential` records with `service_type: 'stripe_connect'`. Platform Billing remains untouched.

---

## 6. Status Summary

- **Built and ready:** Xero diagnostics (Test Connection, enriched status, sync health), Integration Dashboard, Integration Health, Platform Integration Settings, Stripe architecture lock (ADR-0055), Xero setup/troubleshooting docs.
- **Configuration required:** `XERO_CLIENT_ID` and `XERO_CLIENT_SECRET` (Platform Owner, external). Xero Connect goes live the moment these are set — the flow is fully wired.
- **Deferred pending external setup:** `STRIPE_CONNECT_CLIENT_ID` + Build #26B implementation.