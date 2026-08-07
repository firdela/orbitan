# Build #28.2P-R.0R.1C-F — Test Lab Final Closure

**Date:** 2026-08-07
**Status:** COMPLETE
**Starting GitHub SHA:** c0875123a08e22a6d714a2738b889ef7fbdfdf40

---

## Overview

This build closes the Test Lab infrastructure hardening by:
1. Proving CAS concurrency at runtime (live, not simulated)
2. Permanently closing the lock-registry initialization route
3. Removing the temporary lock_probe endpoint
4. Fixing lock release failure consistency
5. Fixing lock leak when operation creation throws
6. Making intent transition truly fail-closed
7. Finalising service-only RLS with live verification

---

## 1. Singleton Lock Registry

- **registry_key:** `test_lab_global`
- **registry_id:** `6a75e87c2dce26c94dee0b3c`
- **registry_count:** 1
- **active_lock_count:** 0
- **Normal runtime:** LOOKUP-ONLY (0 → 503, 1 → use, >1 → conflict)
- **initialize_lock_registry route:** REMOVED from normal testLabSetup action router
- **Disaster recovery:** `initializeLockRegistry` function remains in `runtime.ts` but is inaccessible through deployed API routing

---

## 2. Live CAS Concurrency Evidence

### Same-Target Test
Two parallel `lock_probe` requests with probe_key `probe:test_a`:

| Request | Result |
|---------|--------|
| Request A | `acquired: true, released: true, verified: true` (winner) |
| Request B | `acquired: false, error: operation_in_progress` (loser, 409) |

**Result:** Exactly one winner, exactly one 409 loser.

### Different-Target Test
Two parallel `lock_probe` requests with different probe keys:

| Request | Probe Key | Result |
|---------|-----------|--------|
| Request A | `probe:test_a` | `acquired: true, released: true, verified: true` |
| Request B | `probe:test_b` | `acquired: true, released: true, verified: true` |

**Result:** Both acquired independently — different targets do not block each other.

### CAS Pattern
```
filter: { id: registryId, 'active_locks.lock_key': { $ne: lockKey } }
update: { $push: { active_locks: { lock_key, operation_id, acquired_at, target_type, target_key } } }
```
MongoDB atomic single-document `updateMany` — only ONE concurrent request can match the filter and push.

---

## 3. Lock Release Read-Back Verification

`releaseOperationLock` performs:
1. `$pull` by `operation_id` (ownership-based)
2. Read-back: `get(registryId)` and check lock is absent
3. Returns `{ released: true, verified: true }` or `{ released: false, verified: false, error }`

---

## 4. Completion Lock-Release Failure Behaviour

`persistOperationCompletion` now:
1. Creates completion audit
2. Transitions operation to COMPLETED (verified)
3. Releases lock with read-back verification
4. If release fails → transitions to INCOMPLETE, returns `persisted: false`

**Clean COMPLETED requires ALL of:**
- Audit evidence persisted
- Operation state transitioned
- Lock release attempted
- Lock absence read-back verified

---

## 5. Failure Lock-Release Behaviour

`persistOperationFailure` no longer uses `.catch(() => {})`:
1. Creates failure audit
2. Transitions operation to FAILED
3. Releases lock with read-back verification
4. If release fails → records degraded audit, returns `{ lock_release_degraded: true, lock_release_error }`

---

## 6. Operation-Create Exception Lock Release

`createOperation` tracks `acquiredRegistryId` and `acquiredOperationId`.
If `TestLabOperation.create()` throws:
1. Catch block attempts ownership-safe release
2. If release succeeds → returns error with lock released
3. If release also fails → returns error with "Manual lock recovery may be required"

No orphan lock without an operation record.

---

## 7. Intent Transition Fail-Closed

`persistOperationIntent` now:
1. Creates AuditLog intent evidence
2. Calls `transitionOperation(... INTENT_PERSISTED)`
3. **Verifies** `transition.persisted` before returning `intent_id`
4. If transition fails → returns `intent_id: ''` (mutation MUST NOT proceed)

Durable intent requires BOTH:
- A. AuditLog intent exists with non-empty ID
- B. TestLabOperation successfully transitioned to INTENT_PERSISTED

---

## 8. create_test_run Verification Run State Handling

| State | Response |
|-------|----------|
| NONE | 409 `no_active_verification_run` |
| UNAVAILABLE | 503 `verification_run_unavailable` |
| CONFLICT | 409 `verification_run_conflict` (fail closed) |
| ACTIVE | Proceeds to subsequent validation |

---

## 9. Final RLS Live Results

All 5 Test Lab entities use `{ user_condition: { role: '___service_only___' } }` for create/update/delete.

| Entity | Client Create | Client Update | Client Delete |
|--------|:---:|:---:|:---:|
| TestLabOperation | 403 | 403 | 403 |
| TestLabLockRegistry | 403 | 403 | 404 |
| VerificationRun | 403 | 403 | 403 |
| TestRun | 403 | 403 | 403 |
| TestLabAttestation | 403 | 403 | 403 |

Service-role writes (via backend functions) still work correctly.

---

## 10. Temporary Routes Removed

| Route | Status |
|-------|--------|
| `initialize_lock_registry` | REMOVED from normal testLabSetup action router |
| `lock_probe` | REMOVED from normal testLabSetup action router |
| `probeLock` function | REMOVED from runtime.ts |
| `PROBE_LOCK_KEYS` constant | REMOVED from runtime.ts |
| `initializeLockRegistry` function | RETAINED in runtime.ts for disaster recovery only (inaccessible through deployed API) |

---

## 11. Test Results

| Suite | Passed | Failed | Exit Code |
|-------|--------|--------|-----------|
| test-lab-hardening | 475 | 0 | 0 |
| nexus-gateway-hardening | 37 | 0 | 0 |
| ai-governance-parity | 84 | 0 | 0 |
| Deliberate failure (broken) | 474 | 1 | 1 |
| Deliberate failure (restored) | 475 | 0 | 0 |
| Lint | 0 errors | 2 warnings | 0 |
| Production build | — | — | 0 |

---

## 12. What Remains for Build #28.2P-R.0R.2

- Live identity verification with registered test identities
- Worker session denial live testing
- Production-tenant isolation regression testing