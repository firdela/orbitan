# Build #28.2F — CHANGELOG

## Date: 2026-08-02

### Summary

Improved the customer-facing Xero connection journey with an organisation confirmation step, name-mismatch warnings, cross-tenant conflict detection, and complete audit governance for the connection lifecycle.

### Customer Journey

```
Leader Dashboard → Integrations → Integration Hub → Xero Accounting → Connect Xero
→ Xero hosted sign-in → customer selects organisation → Allow Access
→ Xero redirects back to Orbitan → Orbitan shows confirmation dialog
→ customer confirms → connection becomes active for the current Orbitan tenant
```

### Changes

#### Backend (`base44/functions/xeroOAuth/entry.ts`)

- **`exchange_code` unified:** Single-org and multi-org paths now both return `requires_org_selection: true` with the full organisation list. The single-org auto-connect path was removed — every connection now passes through customer confirmation.
- **`select_organisation` enhanced:**
  - Cross-tenant conflict check: if the selected Xero organisation is already bound to another Orbitan tenant, returns `has_conflict: true` without finalising. Customer must acknowledge and send `force_confirm: true` to override.
  - Organisation-change detection: if the credential previously had a different `external_tenant_id`, audits as `XERO_ORG_CHANGED` instead of `XERO_ORG_CONFIRMED`.
- **`cancel_connection` action added:** Marks the OAuth transaction as consumed, deletes orphaned credentials (never bound to an org), and audits the cancellation.
- **`get_auth_url` audit:** Now creates a `XERO_CONNECTION_INITIATED` audit record when the customer initiates a connection.
- **`exchange_code` audit:** Now creates a `XERO_ORGS_RETURNED` audit record when organisations are returned for selection.

#### Frontend (`src/pages/platform/IntegrationHubPage.jsx`)

- **Confirmation dialog integration:** After org selection (or automatically for single-org), the `XeroConfirmDialog` appears comparing the Xero organisation with the current Orbitan workspace.
- **Single-org auto-confirmation:** When Xero returns a single organisation, the confirmation dialog opens directly (skips the org selector).
- **Cancel handler:** Cleans up the pending OAuth transaction via `cancel_connection` action.
- **Conflict handling:** If the backend reports a cross-tenant conflict, the dialog shows a red warning with a mandatory checkbox before the "Connect Anyway" button is enabled.

#### New Component (`src/components/platform/XeroConfirmDialog.jsx`)

- Organisation comparison card (Xero org ↔ Orbitan workspace)
- Name-similarity heuristic with legal-suffix stripping
- Two variants: concise confirmation (similar names) and stronger warning (different names)
- Cross-tenant conflict warning with mandatory acknowledgement
- Actions: Confirm Connection / Connect Anyway, Choose Another, Cancel
- WCAG 2.2 AA: keyboard navigable, focus management via Dialog primitive, ARIA descriptions

### Audit Events

| Event | Action Type | Trigger |
|-------|------------|---------|
| Connection initiated | `XERO_CONNECTION_INITIATED` | Customer clicks "Connect Xero" |
| Organisations returned | `XERO_ORGS_RETURNED` | Xero returns org list after callback |
| Organisation confirmed | `XERO_ORG_CONFIRMED` | Customer confirms org binding |
| Organisation changed | `XERO_ORG_CHANGED` | Customer switches to a different org |
| Connection cancelled | `XERO_CONNECTION_CANCELLED` | Customer cancels during confirmation |
| Connection disconnected | `XERO_DISCONNECTED` | Customer disconnects |
| Test connection OK | `XERO_TEST_CONNECTION_OK` | Health probe succeeds |

### Privacy

No changes to token-storage architecture. Tokens remain AES-GCM encrypted. No passwords, plaintext tokens, or secrets are stored. No UI path exists to read customer OAuth tokens.