---
title: Orbitan Performance Standards
category: Architecture
owner: Product Architecture
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - PlatformArchitecture.md
  - EngineeringPrinciples.md
  - ../Design/GoldenUIUX.md
tags:
  - performance
  - caching
  - database
  - lazy-loading
  - PWA
  - offline
  - monitoring
---

# Orbitan Performance Standards

## Purpose

Defines performance goals, caching strategy, database optimization, lazy loading, PWA support, offline capabilities, and monitoring.

## Performance Goals

- **Page load:** < 2 seconds on 4G mobile
- **API response:** < 500ms for standard entity operations
- **AI requests:** < 10 seconds (with loading indicators)
- **Navigation:** Instant (client-side routing)
- **Data rendering:** Smooth with loading states

## Caching

- TanStack Query manages client-side caching with stale-while-revalidate
- `queryClientInstance` configured with sensible defaults
- Entity data cached by query key (entity name + filters)
- Tenant record cached in context (`TenantProvider`)

## Database

- RLS adds a filter to every query — negligible at pilot scale
- At enterprise scale: compound indexes on `(tenant_id, outlet_id)` required
- Paginate entity queries (use `limit` and `skip`)
- Use `filter()` with specific queries, not `list()` for large datasets
- Bulk operations (`bulkCreate`, `bulkUpdate`, `updateMany`, `deleteMany`) for batch work

## Lazy Loading

- Route-level code splitting (React Router)
- Components loaded on demand
- Images use lazy loading where appropriate
- Heavy libraries (recharts, three.js) loaded only when needed

## PWA (Progressive Web App)

- `public/sw.js` — Service worker for offline caching
- `public/manifest.json` — PWA manifest for installability
- `PWAUpdateListener` component — prompts users to update
- Installable on iOS/Android from the same codebase
- Responsive design for all screen sizes

## Offline

- Service worker caches app shell for offline access
- Entity data cached by TanStack Query for offline viewing
- Write operations queue when offline (future enhancement)
- Full offline mode is not a current goal — the platform is online-first

## Monitoring

- `OrbitUsageTracker` tracks AI request latency and status
- `AuditLog` captures operation outcomes
- `DeploymentLog` tracks deployment history
- Error handling: uncaught errors surface to the user and are visible for debugging
- Future: formal application performance monitoring (APM)

## Rendering Optimization

- `React.memo` for expensive components
- Virtualization for large lists (pagination)
- Debounced search inputs
- Skeleton loaders during data fetching
- Framer Motion animations are GPU-accelerated

## Related Documents

- [PlatformArchitecture.md](./PlatformArchitecture.md) — Platform architecture
- [EngineeringPrinciples.md](./EngineeringPrinciples.md) — Engineering standards
- [../Design/GoldenUIUX.md](../Design/GoldenUIUX.md) — UI performance standards