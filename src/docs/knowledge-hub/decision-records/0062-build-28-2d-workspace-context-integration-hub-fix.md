# ADR-0062: Build #28.2D — Workspace Context Resolution & Integration Hub Stabilisation

**Date:** 2026-08-02
**Status:** Accepted
**Build:** #28.2D
**Supersedes:** None (extends ADR-0050, ADR-0058, ADR-0061)

## Context

The Testing Agent confirmed that navigating from the Leader Dashboard to the Integration Hub produced a "Workspace not found" symptom. The page loaded but could not resolve a tenant context, making Xero Connect non-functional.

## Root Cause

Platform admins (`role: 'admin'`) are platform-level identities — they do **not** have Employee records in any tenant. The `WorkspaceProvider` resolves memberships via Employee records linked to the user's identity. When no Employee records exist, `memberships` is empty and `activeTenantId` is null.

IntegrationHubPage resolved its tenant context as:
```js
const tenantId = activeTenantId || user?.data?.tenant_id || user?.tenant_id;
```

For a platform admin, all three values are null:
1. `activeTenantId` — null (no Employee memberships → WorkspaceProvider can't resolve)
2. `user?.data?.tenant_id` — null (platform admins are not tenant-scoped)
3. `user?.tenant_id` — null (same reason)

With `tenantId` null, `fetchXeroStatus()` and `fetchSyncQueue()` returned early, the page rendered in a non-functional state, and clicking "Connect Xero" showed "No Workspace Selected". The Testing Agent reported this as "Workspace not found".

## Decision

### Admin Tenant Selection (Priority 1–3)

Add an explicit tenant selector to IntegrationHubPage for platform admins when no workspace tenant is resolved. This preserves the privacy-first architecture: the admin chooses the tenant context, and all Xero operations are scoped to that `tenant_id`.

**Resolution chain (updated):**
```
workspaceTenantId = activeTenantId || user?.data?.tenant_id || user?.tenant_id
tenantId = workspaceTenantId || selectedTenantId
```

- **Tenant users** (tenant_admin, outlet_manager, etc.): `workspaceTenantId` is resolved automatically by WorkspaceProvider via Employee memberships. No selector shown.
- **Platform admins**: `workspaceTenantId` is null. The page fetches all tenants from the DB and shows a selector. Once selected, `selectedTenantId` drives all Xero operations.
- **Admin with selected tenant**: A workspace context bar shows which tenant is being managed, with a "Switch Workspace" button.
- **OAuth callback survival**: `selectedTenantId` is persisted in `sessionStorage` so it survives the full-page redirect to Xero and back. Without this, the admin would return from Xero with no tenant context and be unable to see the connection result.

### Graceful Recovery (Priority 4)

When workspace truly can't be resolved (non-admin with no tenant), never show a blank page. Instead display:
- "Workspace unavailable" heading
- "Reload Workspace" button
- "Go to Workspace Switcher" button
- Link to Orbitan Support

### Navigation Consistency (Priority 2)

All navigation paths now converge on the same IntegrationHubPage component:
- LeaderOrg tab (`integration-hub`, type='tab') → renders IntegrationHubPage
- Standalone route `/platform/integrations` → renders IntegrationHubPage
- QuickAccess link → routes to `/platform/integrations`
- UserMenu → routes to `/platform/integrations`
- Deep links → `/platform/integrations`

All paths benefit from the same tenant resolution logic. No blank screen, no "Workspace not found".

## Alternatives Considered

1. **Auto-select first tenant for admins** — Rejected: platform admins manage multiple tenants; auto-selecting could cause accidental Xero connections to the wrong tenant. Explicit selection is safer and more transparent.

2. **Pass tenant_id from LeaderOrg** — Rejected: LeaderOrg embeds IntegrationHubPage as a tab without passing props. Adding props would couple the components and break the standalone route. The tenant selector is self-contained in IntegrationHubPage.

3. **Create a platform-level Xero connection** — Rejected: Xero connections are tenant-scoped by design (IntegrationCredential has `tenant_id` as a required field). Platform-level connections would violate tenant isolation and the privacy-first architecture.

## RLS / RBAC Preservation

- No RLS changes. IntegrationCredential RLS already restricts create/update/delete to platform admins and read to admin + tenant_admin (matching tenant).
- No RBAC changes. The `canManage` check (`['admin', 'tenant_admin']`) is preserved.
- The `xeroOAuth` backend function already validates `user.role` for `get_auth_url` and `exchange_code` — no backend changes needed.

## Runtime Evidence

### Backend (test_backend_function)

**`get_platform_config`** → HTTP 200:
```
oauth_ready: true
redirect_uri: "https://orbitan.io/platform/integrations"
required_scopes: ["openid", "offline_access", "accounting.invoices", "accounting.contacts", "accounting.settings.read"]
token_encryption_enabled: true
```

**`get_status` (tenant_id=6a215987...)** → HTTP 200:
```
connected: false
configured: true
status: "not_connected"
message: "Xero is ready to connect."
```

### Frontend (code-verified)

- `workspaceTenantId` resolves from WorkspaceProvider for tenant users ✅
- `selectedTenantId` state drives admin tenant selection ✅
- Tenant list fetched from `base44.entities.Tenant.list()` when admin + no workspace ✅
- Graceful recovery UI shown when workspace unresolvable ✅
- Workspace context bar shown when admin has selected a tenant ✅
- All existing Xero operations use `tenantId` (now `workspaceTenantId || selectedTenantId`) ✅

## Files Modified

1. `src/pages/platform/IntegrationHubPage.jsx` — Added admin tenant selection, workspace context bar, graceful recovery UI, tenant list fetch for admins
2. `src/docs/knowledge-hub/decision-records/0062-build-28-2d-workspace-context-integration-hub-fix.md` — This ADR
3. `src/docs/knowledge-hub/CHANGELOG.md` — Build #28.2D changelog entry

## Remaining Defects

- Live end-to-end Xero Demo Company test not yet performed (requires manual incognito verification on orbitan.io)
- OAuth callback survival across browser refresh depends on service worker cache state (addressed in Build #28.2C)