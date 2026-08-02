# ADR-0064: Build #28.2F — Xero Organisation Confirmation & Customer Connection UX

**Date:** 2026-08-02
**Status:** Accepted
**Build:** #28.2F
**Supersedes:** None (extends ADR-0060, ADR-0061, ADR-0063)

## Context

Build #28.2E stabilised workspace context resolution for the Integration Hub. However, the customer-facing Xero connection journey had two gaps:

1. **No organisation confirmation step.** When Xero returned a single organisation after OAuth consent, Orbitan auto-finalised the connection without giving the customer a chance to verify the binding. When multiple organisations were returned, the customer selected one and it was immediately connected — again without a confirmation step comparing the Xero organisation name against the Orbitan workspace name.

2. **No cross-tenant conflict detection.** A Xero organisation could be connected to multiple Orbitan tenants without warning, creating potential data-isolation confusion.

3. **Incomplete audit trail.** Connection lifecycle events (initiated, cancelled, organisation changed) were not all audited.

## Decision

### 1. Unified confirmation flow (single-org + multi-org)

**Change:** `exchange_code` now always returns `requires_org_selection: true` with the full organisation list — regardless of whether Xero returned one or multiple organisations. The single-org auto-connect path was removed.

**Rationale:** Every customer connection should pass through a confirmation step where they can verify the organisation binding. This prevents accidental connections to the wrong Xero organisation, which could route financial syncs to the wrong ERP entity.

**How it works:**
- `exchange_code` stores the encrypted tokens in `IntegrationCredential` (status: `connected`) but does NOT set `external_tenant_id`.
- It returns the list of accessible Xero organisations to the frontend.
- The frontend shows a confirmation dialog (`XeroConfirmDialog`) comparing the selected organisation with the current Orbitan workspace.
- Only when the customer confirms does `select_organisation` finalise the binding (sets `external_tenant_id`, fetches org name, marks transaction consumed).

### 2. Name-mismatch handling

The confirmation dialog uses a normalised string-similarity heuristic:
- Strips common legal suffixes (Pte Ltd, Ltd, LLC, Inc, etc.)
- Compares normalised names for containment and prefix overlap
- **Similar (≥0.6 similarity):** Shows a concise confirmation — "Confirm Connection"
- **Different (<0.6):** Shows a stronger warning explaining that legal and trading names may differ — "Connect Anyway"

The mismatch warning never blocks legitimate connections; it only provides additional context.

### 3. Cross-tenant conflict detection

`select_organisation` now checks whether the selected Xero organisation (`external_tenant_id`) is already bound to another Orbitan tenant with `status: 'connected'`.

- If a conflict is found and `force_confirm` is not set: returns `{ has_conflict: true, conflict_message }` without finalising.
- The frontend shows a red warning with a mandatory checkbox acknowledgement.
- The customer must check "I understand and want to connect this organisation anyway" and click "Connect Anyway" (which sends `force_confirm: true`).

This ensures customers can never accidentally bind the same Xero org to multiple Orbitan tenants without explicit, informed consent.

### 4. Cancel connection

A new `cancel_connection` action was added:
- Marks the `OAuthTransaction` as `consumed` (prevents replay)
- Deletes the orphaned `IntegrationCredential` if it was created in this flow but never bound to an organisation (no `external_tenant_id`)
- Creates an audit record (`XERO_CONNECTION_CANCELLED`)

### 5. Audit governance

The following audit events are now created throughout the connection lifecycle:

| Event | Action Type | When |
|-------|------------|------|
| Connection initiated | `XERO_CONNECTION_INITIATED` | `get_auth_url` — customer clicks "Connect Xero" |
| Organisations returned | `XERO_ORGS_RETURNED` | `exchange_code` — Xero returns org list |
| Organisation confirmed | `XERO_ORG_CONFIRMED` | `select_organisation` — customer confirms org |
| Organisation changed | `XERO_ORG_CHANGED` | `select_organisation` — customer switches to a different org |
| Connection cancelled | `XERO_CONNECTION_CANCELLED` | `cancel_connection` — customer cancels during confirmation |
| Connection disconnected | `XERO_DISCONNECTED` | `disconnect` — customer disconnects |
| Test connection OK | `XERO_TEST_CONNECTION_OK` | `test_connection` — health probe succeeds |

No audit record includes: access tokens, refresh tokens, authorisation codes, secrets, or raw provider payloads.

### 6. Privacy preservation

No changes to the token-storage architecture:
- Tokens remain AES-GCM encrypted at rest (`INTEGRATION_ENCRYPTION_KEY`)
- Only the SHA-256 hash of the OAuth state nonce is persisted
- No Xero passwords, login credentials, or plaintext tokens are stored
- No UI path exists for Orbitan staff to read customer OAuth tokens

## Files Modified

| File | Change |
|------|--------|
| `base44/functions/xeroOAuth/entry.ts` | Unified exchange_code, added conflict check, cancel_connection action, audit logging |
| `src/pages/platform/IntegrationHubPage.jsx` | Confirmation dialog integration, cancel/confirm handlers |
| `src/components/platform/XeroConfirmDialog.jsx` | **NEW** — Organisation confirmation dialog with name-mismatch and conflict warnings |

## Consequences

**Positive:**
- Every Xero connection now requires explicit customer confirmation
- Cross-tenant org conflicts are detected and require informed consent
- Full audit trail for connection lifecycle
- Name-mismatch warnings prevent accidental wrong-org connections

**Negative:**
- One additional click for single-org connections (confirmation dialog)
- Slightly more complex frontend state management

**Risks:**
- If `select_organisation` fails after `exchange_code` stored tokens, an orphaned credential may remain. Mitigated by `cancel_connection` cleanup and the `external_tenant_id` check in `get_status`.

## Runtime Validation

See BUILD #28.2F final report for runtime test evidence with Xero Demo Company.