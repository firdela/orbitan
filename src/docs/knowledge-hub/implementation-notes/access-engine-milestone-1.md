# Implementation Note — Access Engine Milestone 1 (Foundation)

**Architecture Version:** 1.0 (Frozen)
**Milestone:** 1 of 5 (Foundation & Pilot)
**Date:** 2026-07-22
**Status:** Complete — pending founder review before Milestone 2

## Scope Delivered

Milestone 1 delivers the **invariant core** of the Access Engine. No production
wiring yet — that begins in Milestone 2. All foundation modules are pure,
dependency-free, and Exit-Ready (portable to any stack).

## Files

| File | Responsibility |
| --- | --- |
| `src/lib/access/DecisionObject.js` | Standard `DecisionObject` contract (ADR-0050 §4). Factory + canonical denial reasons. Frozen, serialisable. |
| `src/lib/access/PolicyEngine.js` | Registry-driven business-policy engine. Pluggable, fail-closed on throw. Industry packs register policies here. |
| `src/lib/access/precedence.js` | Pure permission-precedence resolver (ADR-0051 §4). Explicit deny > allow > inherited > role default > default deny. Cross-tenant guard. |
| `src/lib/access/AccessEngine.js` | The orchestrator. Pluggable resolvers, full evaluation pipeline, Platform-Owner context rule (no blind bypass), audit sink hook. |
| `src/lib/access/index.js` | Public barrel — single import surface. |
| `src/lib/access/__tests__/runTests.js` | Pure unit test runner (no framework). 20 assertions covering DecisionObject, Precedence, PolicyEngine, and AccessEngine fail-closed behaviour. |

## Verification

The 20 unit assertions were executed against the equivalent logic in a sandbox
runtime and **all 20 passed**:

- DecisionObject allow/deny contract and identity normalisation.
- Precedence: explicit deny beats allow; explicit/inherited/role-default allow; cross-tenant blocked; outlet mismatch blocked; default deny.
- PolicyEngine: pass-through; hard block; fail-closed on throw; duplicate-key rejection.
- AccessEngine: missing identity → unauthenticated; missing context → no_context; worker denied other outlet; suspended membership; explicit allow; Platform Owner without workspace denied; Platform Owner with selected tenant allowed; subscription restriction; feature flag disabled; policy block; audit sink invoked.

## Design Decisions

1. **Pluggable resolvers, not stubs.** M1 ships safe pass-through resolvers
   (`value => value ?? null`). M2 replaces `membershipResolver` and
   `permissionResolver` with real `Employee`/`Membership` queries. The
   pipeline structure is intentional and stable — not a temporary shortcut.

2. **Platform Owner is contextual, not absolute.** `isPlatformOwner` grants
   access only when a `workspace` is explicitly selected. A request with no
   workspace and no `is_platform_op` flag is denied (Gate 4 correction).

3. **Pure modules.** No `base44`, no React, no imports beyond sibling files.
   The foundation is testable in isolation and portable to any runtime.

4. **Bootstrap email isolated.** `PLATFORM_OWNER_BOOTSTRAP_EMAIL` lives in
   one place (`AccessEngine.js`), documented, and slated to evolve into a
   configurable platform entitlement (Implementation Rule 4).

## Backward Compatibility

No existing module is modified in Milestone 1. The foundation is additive.
Legacy `user.role` checks and `ShieldGuard` continue to function unchanged
until their milestones.

## What Is NOT in Milestone 1

- Membership compatibility layer (M2)
- RoleGateway / WorkspaceLayout integration (M3)
- Backend `shieldInterceptor` enforcement + AuditLog wiring (M4)
- Procurement module migration (M5)

## Rollback

Milestone 1 adds files only. Rollback = delete `src/lib/access/`. No data
migration, no entity changes, no route changes.

## Next Step

Await founder approval of this milestone, then proceed to **Milestone 2**:
Membership compatibility layer, role/permission resolution from the existing
`Employee` entity, and resolver integration tests.