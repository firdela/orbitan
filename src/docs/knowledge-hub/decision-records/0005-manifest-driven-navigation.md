# ADR-0005: Manifest-Driven Navigation

**Date:** 2026-06-10
**Status:** Accepted
**Impacted Modules:** PlatformManifest, ManifestHydrator, ManifestNav, WorkspaceLayout, SubscriptionPolicy, AppShell

## Context

Navigation in OrbitanOS needed to be:
1. Industry-specific (F&B sees "Recipes & Menu", Recycling sees "Material Collection")
2. Plan-tiered (Starter plan sees fewer modules than Enterprise)
3. Tenant-specific (each tenant's enabled modules + packs)
4. Not hardcoded in component files (to avoid code changes for new industries)

The initial approach hardcoded navigation arrays inside each page component (`NAV = [...]`), which caused:
1. Every page wrapped itself in `AppShell` with its own nav array — duplicate sidebars
2. Industry-specific items were conditionally rendered with `if/else` — unmaintainable
3. Plan-tiered visibility required separate nav arrays per plan
4. Adding a module required editing multiple component files

## Alternatives Considered

1. **Per-page hardcoded navigation** (status quo before this ADR)
   - Rejected: Duplicate sidebars, unmaintainable, no central registry
   - Rejected: Adding a module = edit multiple files

2. **Single global navigation array with conditionals**
   - Rejected: Still hardcoded — can't add industries without code changes
   - Rejected: Doesn't support plan-tiered visibility cleanly

3. **Manifest-driven navigation** (navigation tree stored as entity records)
   - Selected: Navigation is data, not code
   - Selected: `PlatformManifest.ui_config.navigation_blueprint` stores the tree
   - Selected: `SubscriptionPolicy.allowed_modules` controls visibility
   - Selected: `ManifestHydrator` intersects manifest + policy at runtime

## Decision

Adopt **Manifest-Driven Navigation**:

### Data Model
- `PlatformManifest.ui_config.navigation_blueprint` — recursive tree of sections → modules, each with `id`, `label`, `icon`, `route`
- `SubscriptionPolicy.allowed_modules` — list of module keys entitled for a plan
- `Tenant.manifest_key` — which manifest this tenant uses (e.g. `fnb_ops_v1`)

### Runtime Resolution (ManifestHydrator)
1. Fetch `PlatformManifest` by `manifest_key` (from the resolved tenant)
2. Fetch `SubscriptionPolicy` by the tenant's `subscription_plan`
3. Intersect: for each module in the navigation blueprint, check if its `id` is in `allowed_modules`
4. If allowed → render as active link
5. If not allowed → render as locked (greyed out, "Graceful Lockout" — upsell opportunity)
6. Return the hydrated navigation tree to `ManifestNav` for rendering

### Graceful Lockout
Locked modules are NOT hidden — they are displayed but greyed out with an upgrade badge. This creates upsell visibility: users see what they're missing and can upgrade to unlock.

### Component Architecture
```
WorkspaceLayout
  → useManifestHydration() hook
    → hydrateManifest() (from ManifestHydrator.js)
      → fetches PlatformManifest + SubscriptionPolicy in parallel
      → returns { sections, source: 'manifest' | 'fallback' }
  → <AppShell manifestNav={<ManifestNav sections={sections} />} />
    → renders ManifestNav (manifest-driven) OR fallback nav (safety net)
```

### Fallback Safety Net
`ManifestHydrator.js` contains a `FALLBACK_NAV` array as the last resort if the database is unreachable. This ensures the workspace never renders with a blank sidebar.

## Trade-offs

**Positive:**
- Adding a module = add it to the `PlatformManifest` navigation_blueprint (database record)
- Adding an industry = create a new `PlatformManifest` record (zero code changes)
- Plan-tiered visibility is automatic (intersection with `SubscriptionPolicy`)
- Graceful Lockout creates organic upsell moments
- Industry-specific labels (F&B "Recipes" vs Retail "Products") are data, not conditionals

**Negative:**
- `ManifestHydrator` adds an async fetch on workspace load (mitigated: cached in context)
- Bad manifest data (missing icon name, invalid route) causes rendering issues (mitigated: `ManifestNav` has icon resolver with default fallback)
- `FALLBACK_NAV` must be maintained as a safety net — though it should rarely be used

## Migration

All per-page hardcoded `NAV` arrays and `<AppShell>` wrappers were removed from module pages (ProcurementPage, InventoryPage, etc.). Pages now render as bare fragments inside `WorkspaceLayout`'s `<Outlet />`, using the manifest-driven sidebar exclusively.

## Future Review Date

**2026-10-01** — Evaluate whether tenant-specific navigation overrides are needed (e.g. a tenant wants to rename "Inventory" to "Stock Room"). Could be supported via a `DashboardLayout`-style override record.

---

**Related ADRs:** ADR-0001 (Registry-Driven Architecture), ADR-0004 (Dynamic Workspace Routing)