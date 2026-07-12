# ODR-0023: Orbit Core Adapter Pattern

**Date:** 2026-07-12
**Status:** Approved
**Author:** Product Architect (AI)
**Approved By:** Muhammad Firdaus Bin Ismail (Product Owner)

## Decision

Implement a platform-agnostic data access layer (`src/lib/orbit-core.js`) that sits between OrbitanOS business logic and the Base44 SDK. All new modules import from `@/lib/orbit-core` instead of `@/api/base44Client` directly.

## Context

Orbitan must be architected for platform independence. Base44 is the initial development platform, not a permanent dependency. If Orbitan migrates to AWS, Supabase, or a custom backend in the future, all customer data, application logic, and business operations must be migratable with minimal disruption.

Currently, UI components and business logic import `base44` directly from `@/api/base44Client`. This creates tight coupling — switching platforms would require touching hundreds of files across the codebase.

## Alternatives Considered

1. **Full SDK replacement (big-bang refactor):** Rewrite every import from `base44` to a new adapter in one pass. Rejected — high risk of breaking working pilot features, violates the "preserve working functionality" principle, and the MVP deadline (30 July 2026) doesn't allow for a full refactor.

2. **Repository pattern with generic interfaces:** Build abstract `Repository<T>` classes with dependency injection. Rejected — over-engineered for the current stage. Adds complexity without immediate value. The adapter pattern achieves the same decoupling with less abstraction.

3. **Do nothing (keep direct SDK calls):** Rejected — every new feature deepens the vendor lock-in. The longer we wait, the harder the migration becomes.

## Why This Option Was Chosen

- **Additive, not destructive:** `orbit-core.js` is a new file. It doesn't touch any existing code. Working features continue to import `base44` directly. New code uses `OrbitCore`. No breaking changes.
- **Single migration point:** When we switch platforms, only `orbit-core.js` changes. Every consumer automatically gets the new backend.
- **Standardised contracts:** `mapUser()` normalises the user shape. `OrbitError` standardises error handling. UI layers don't need to know whether they're talking to Base44 or something else.
- **Exit-ready:** Aligns with the Master Vision's "Future-Proof Principle" and the Orbit Data Layer concept.

## Trade-offs

- **Two import paths exist temporarily:** New code uses `OrbitCore`, existing code uses `base44`. This is intentional — it allows incremental adoption without a risky big-bang refactor. Over time, existing modules can migrate one at a time.
- **Thin wrapper overhead:** An extra function call layer. Negligible performance impact; the wrapper delegates directly to the SDK.
- **No TypeScript generics yet:** The adapter is JS, not TS. This is consistent with the current codebase. Can be upgraded to TS when the codebase migrates.

## Interface Contract

```javascript
OrbitCore.auth.me()                                    → OrbitUser | null
OrbitCore.auth.isAuthenticated()                       → Promise<boolean>
OrbitCore.auth.updateMe(data)                          → OrbitUser
OrbitCore.auth.logout(redirectUrl?)                    → void
OrbitCore.auth.redirectToLogin(nextUrl?)               → void

OrbitCore.data.list(entity, sort?, limit?)            → Promise<Record[]>
OrbitCore.data.filter(entity, filter, sort?, limit?)  → Promise<Record[]>
OrbitCore.data.get(entity, id)                        → Promise<Record>
OrbitCore.data.create(entity, data)                   → Promise<Record>
OrbitCore.data.update(entity, id, data)                → Promise<Record>
OrbitCore.data.delete(entity, id)                      → Promise<void>
OrbitCore.data.bulkCreate(entity, items[])             → Promise<Record[]>
OrbitCore.data.bulkUpdate(entity, items[])             → Promise<Record[]>
OrbitCore.data.subscribe(entity, callback)             → unsubscribe()
OrbitCore.data.schema(entity)                          → Promise<JSONSchema>

OrbitCore.services.invoke(functionName, payload)       → Promise<any>
OrbitCore.integrations.invokeLLM(params)               → Promise<any>
OrbitCore.integrations.uploadFile(file)                → Promise<string>
OrbitCore.integrations.sendEmail(params)               → Promise<any>
OrbitCore.integrations.generateImage(prompt, refs?)    → Promise<any>

OrbitCore.users.inviteUser(email, role)                → Promise<any>
OrbitCore.analytics.track(event)                      → void
```

## Impacted Modules

- **New:** `src/lib/orbit-core.js` (the adapter)
- **Existing (unchanged):** All current pages, components, and backend functions continue to work as-is.
- **Future:** All new Sprint 3/4/5 modules (Executive Analytics, HBB Pack, Finance reconciliation) will import from `OrbitCore`.

## Migration Path (Post-MVP)

1. New modules adopt `OrbitCore` from Day 1 (starting now).
2. Existing modules migrate incrementally — one module per sprint — by replacing `base44` imports with `OrbitCore`.
3. When 100% of imports go through `OrbitCore`, the `base44` import in `orbit-core.js` is swapped for the new platform's client. Zero changes elsewhere.

## Future Review Date

**2026-09-30** — After MVP pilot validation, assess whether to begin incremental migration of existing modules.