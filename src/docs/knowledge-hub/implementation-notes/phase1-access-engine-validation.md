# Phase 1 Increment #2 — Access Engine Validation Harness

> **Status:** Implemented — 2026-07-24
> **Phase:** Build Manifest Phase 1 (Foundation Layer)
> **Directive:** Product Authority Implementation Directive (Phase 1 Inc. #2)
> **Predecessors:** RA-0005 (Orbit Identity Model), ADR-0050 (Centralised Access Engine), ADR-0051 (Permission Packs)

## Purpose

Validate that the Orbit Identity Model linkage (Increment #1) is provably
correct through the full authorization chain:

```
Authenticated User → identityLinkage → Employee.user_id
      → MembershipResolver → Access Engine → Tenant/Outlet/Module authorization
```

The harness is split across two execution tiers, each testing the pure
logic that physically resides on that tier (no cross-tier duplication):

| Tier | Module under test | Coverage |
| :--- | :--- | :--- |
| Backend | `base44/shared/identityLinkage.ts` | Linkage classifier: success, idempotency, conflict (point 8), multi-tenant, fail-closed |
| Frontend | `src/lib/access/*` (ADR-0050) | MembershipResolver, AccessEngine, Precedence — points 1-7, 9 + regression |

## Why two tiers

The Access Engine pure logic currently lives in `src/lib/access/` (frontend).
Per the frozen foundations, relocating it to `base44/shared/` would be a
foundational change requiring a governed ADR — out of scope for a
validation increment. The linkage classifier, being NEW logic added in
Increment #1, was placed directly in `base44/shared/` (RA-0004 Platform
service) so it is importable by backend functions without duplication.

This follows the codebase's established pattern (`base44/shared/attendancePolicy.ts`
is the backend canonical; the frontend holds its own copy). For the linkage
classifier there is no frontend copy — the authoritative test runs server-side.

## Deliverables

- `base44/shared/identityLinkage.ts` — pure `classifyLinkage` classifier
  (single source of the linkage decision contract).
- `base44/functions/identityLinkage/entry.ts` — refactored to delegate
  decisions to the shared classifier; applies stamps + per-record audit only
  to records the classifier marks linkable.
- `base44/functions/accessValidationHarness/entry.ts` — backend suite runner
  (server-side, capturable via the dev page / platform test runner).
- `src/lib/access/__tests__/accessEngineValidationHarness.js` — frontend
  pure suite (all 9 directive points + regression).
- `src/pages/dev/AccessEngineValidation.jsx` — dev page running both suites.
- Route `/dev/access-validation` added to `src/App.jsx`.

## Bug found + corrective action

**`Clock.Manage` permission pack was undefined.** The `worker` role
(`PermissionPacks.js`) references `'Clock.Manage'`, but no pack of that
name existed in `PERMISSION_PACKS`. The result: `permissionsForRole('worker')`
silently omitted `clockrecord.manage` — **workers could not clock in or out**
through the Access Engine, despite the RLS and UI assuming they could. The
latent `runMembershipTests.js` assertion would have caught this, but no
runner was wired.

**Corrective action:** added `'Clock.Manage': [PERMISSION_KEYS.CLOCK_MANAGE]`
to `PERMISSION_PACKS`. A regression test (`REGRESSION: worker role grants
clockrecord.manage`) in the frontend suite locks the fix. This is a
behaviour-restoring fix, not a permission expansion — workers were always
intended to manage their own clock records.

## Verification evidence

- Backend `accessValidationHarness`: executed via the platform test runner —
  see the Backend Suite card on `/dev/access-validation`.
- Frontend suite: runs on page mount — see the Frontend Suite card.
- All 9 directive points covered; point 8 (email fallback never overrides a
  conflicting `user_id`) is the classifier conflict guard, tested server-side.

## Out of scope / deferred

- Real-DB linkage idempotency/conflict against seeded Employee records in the
  Orbitan Test Lab (would require temp records; deferred to avoid polluting
  pilot/prod data — the pure classifier is deterministic and authoritative).
- Relocating the Access Engine to `base44/shared/` for unified backend
  authorization (foundational change → requires a governed ADR).