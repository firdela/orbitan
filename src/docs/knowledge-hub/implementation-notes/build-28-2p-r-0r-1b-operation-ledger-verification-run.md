# Build #28.2P-R.0R.1B — Correlated Test Lab Operation Ledger, Verification-Run Readiness & Future-Tenant Architecture Boundary

**Date:** 2026-08-07
**Build:** #28.2P-R.0R.1B
**Status:** IMPLEMENTED — all tests pass, lint clean, build passes, backend verified
**Prerequisite for:** Build #28.2P-R.0R.2 (live identity verification)
**Baseline:** `399a83d42da9f329a0991f1f986c8d871e3b44c1`

---

## Purpose

Build #28.2P-R.0R.1B is a narrow blocking repair that introduces a stable Test Lab Operation ledger, verification-run-scoped readiness, and a strict architecture boundary between internal Test Lab infrastructure and future production customer tenants.

---

## Architecture Boundary — Test Lab vs Future Production Tenants

### Core Orbitan Platform Architecture (Reusable)
- Tenant isolation (RLS)
- Canonical tenant provisioning (Tenant/Company/Outlet creation)
- Lifecycle/state-transition patterns
- Operation correlation concept
- Idempotency
- Fail-closed privileged operations
- Audit reliability
- Permission evaluation
- Authentication boundaries
- Production/test data classification
- Analytics exclusion (`isProductionRecord()`)
- Normal Tenant/Company/Outlet relationships
- Normal Employee membership architecture

### Internal Test Lab Infrastructure (Sandbox-Only)
- Orbitan Test Lab (Tenant A) and Orbitan Test Lab B (Tenant B)
- Eight fixed test aliases (`test.*@orbitan.net`)
- `platform.test_lab.manage` permission
- `TestLabOperation` entity (operation ledger)
- `VerificationRun` entity (verification campaign)
- `verification_run_id` on TestRun
- Short sandbox approval TTL (1-10 minutes)
- TestRun controls with CAS + consumption_token
- Test-data reset
- Test delivery attestations
- Test-operation reconciliation
- Test Lab readiness dashboard

### Future Customer Tenants
Future real customer tenants:
- Use canonical production onboarding/provisioning
- Use normal production authentication
- Use normal tenant membership
- Use normal RBAC/RLS
- Use normal production approval TTL (24 hours)
- Use production billing/integrations according to their plan
- Have NO knowledge of Test Lab aliases
- Have NO Test Lab controls
- Have NO sandbox shortcuts
- Have NO test-only permissions
- Have NO verification-run UI
- Have NO test-data-reset capability

Future production tenants do NOT inherit: `is_sandbox`, `test_lab_key`, `platform.test_lab.manage`, short TTL, TestRun authorisation, `test_run_id`, `verification_run_id`, test aliases, test attestations, reconciliation tools, test-data reset, or non-production analytics suppression.

---

## P0 Gap Closures

### 1. Operation-State Lookup Fails Closed
`checkOperationState` returns three explicit states:
- **CLEAR** — ledger queried successfully, no blocking operation
- **BLOCKED** — INCOMPLETE or MUTATION_COMPLETED operation exists
- **UNAVAILABLE** — ledger could not be queried

UNAVAILABLE returns `503 operation_state_unavailable` — the mutation does NOT proceed. A lookup error NEVER means "no incomplete operation exists."

### 2. Stable TestLabOperation Ledger
One server-generated immutable `operation_id` correlates the entire lifecycle: PENDING → INTENT_PERSISTED → MUTATION_COMPLETED → COMPLETED (or FAILED / INCOMPLETE). Replaces fragile AuditLog.target_record_id correlation.

### 3. Real Persisted State Machine
Transitions are actually persisted in TestLabOperation records — not merely declared in constants. `success:true` ONLY for COMPLETED.

### 4. Canonical Target Keys
Deterministic server-side target correlation prevents logical-key/database-ID mismatch from hiding incomplete operations.

| Target Type | Target Key Format |
|---|---|
| sandbox_tenant | `TEST_LAB_B` |
| test_membership | `<tenant-id>:<allowlisted-alias>` |
| test_permission | `<target-user-id>:platform.ai.cross_tenant_operate` |
| test_attestation | `<alias>:<attestation-check>` |
| test_run | `<verification-run-id>:<sandbox-tenant>:<requester>:<service>:<scenario>` |
| test_reset | `<tenant-id>:<test-run-id>` |

### 5. Dependent Operations Block Correctly
Before every privileged operation, `checkOperationState` queries the TestLabOperation ledger by `target_type` + `target_key`. If BLOCKED → `409 incomplete_operation`. If UNAVAILABLE → `503 operation_state_unavailable`.

### 6. Narrow Reconciliation
`reconcile_operation` action resolves INCOMPLETE states. Requires admin + `platform.test_lab.manage` + meaningful reason (min 10 chars). Can only inspect, compare, create audit, and resolve to COMPLETED or FAILED. Cannot arbitrarily edit records.

### 7. VerificationRun Model
`verification_run_id` server-generated, immutable. Statuses: PREPARING → ACTIVE → COMPLETED/FAILED/ARCHIVED. Only `platform.test_lab.manage` may create or activate.

### 8. TestRun Linked to VerificationRun
Every TestRun created for a governance verification campaign contains `verification_run_id`. Nexus validation preserves traceability.

### 9. Current-Run Readiness Only
Readiness calculated against the currently active verification_run_id. Historical TestRuns/AIApprovals from other runs cannot satisfy current readiness. No active run → readiness false.

### 10. Exact Scenario Readiness
`test_tagging_ready` and `short_ttl_ready` require evidence matching the current verification_run_id, expected sandbox tenant, requester, scenario, service, action, autonomy level, server-selected TTL, and successful consumption.

---

## Entities Added

### TestLabOperation
Stable operation ledger with: `operation_id`, `action`, `target_type`, `target_key`, `tenant_id`, `actor_id`, `actor_name`, `status`, `intent_audit_id`, `mutation_resource_ids`, `completion_audit_id`, `failure_code`, `failure_summary`, `reconciliation_state`, `reconciled_by_id`, `reconciliation_reason`, `reconciliation_audit_id`, `verification_run_id`, `non_production`.

Admin-only RLS. `non_production=true`. Never exposed to customer tenants.

### VerificationRun
Verification campaign with: `verification_run_id`, `created_by`, `created_by_name`, `created_at`, `started_at`, `completed_at`, `status`, `tenant_a_id`, `tenant_b_id`, `expected_identity_matrix`, `expected_scenarios`, `test_purpose`, `non_production`.

Admin-only RLS. `non_production=true`. Never exposed to customer tenants.

## Entities Modified

### TestRun
Added `verification_run_id` field linking to the active VerificationRun.

---

## Files Modified

- `base44/shared/test-lab-config.js` — OPERATION_LIFECYCLE_STATES (with PENDING), OPERATION_LOOKUP_STATES, VERIFICATION_RUN_STATUSES, TARGET_TYPES, target key generators, generateOperationId, generateVerificationRunId
- `base44/functions/testLabSetup/entry.ts` — TestLabOperation ledger, fail-closed checkOperationState, canonical target keys, verification run management, reconciliation, current-run-scoped readiness
- `src/lib/__tests__/test-lab-hardening.test.js` — 20 new test sections (27-46), 318 total assertions

## Files Added
- `base44/entities/TestLabOperation.jsonc`
- `base44/entities/VerificationRun.jsonc`
- `src/docs/knowledge-hub/implementation-notes/build-28-2p-r-0r-1b-operation-ledger-verification-run.md` — this note

---

## Test Results

| Test Suite | Passed | Failed | Exit Code |
|---|---|---|---|
| Test lab hardening | 318 | 0 | 0 |
| Nexus gateway hardening | 37 | 0 | 0 |
| AI governance parity | 84 | 0 | 0 |
| **Total** | **439** | **0** | **0** |

- Focused lint: 0 errors
- Production build: exit code 0

---

## Live Backend Verification

- `readiness_status`: `active_verification_run: null`, `test_tagging_ready: false`, `short_ttl_ready: false`, `readiness_scope: 'no_active_run'`
- TestLabOperation entity: accessible, 0 records
- VerificationRun entity: accessible, 0 records
- TestRun entity: accessible, 0 records, `verification_run_id` field in schema
- Tenants A and B both exist as sandbox tenants

---

## CAS Classification

**CAS IMPLEMENTED — LIVE CONCURRENCY NOT VERIFIED**

No JavaScript/in-memory concurrency simulation is used as proof. The CAS pattern is verified structurally. Real parallel request verification belongs to Build #28.2P-R.0R.2.

---

## Remaining P0 Blockers

1. Test Run live verification (requires registered test identities + active verification run)
2. Worker route/API denial live test (requires Worker session)
3. Full approve-to-execute lifecycle with short TTL (requires registered identities + TestRun + verification run)

---

## Completion Gate Status

All 35 criteria met. GitHub sync pending platform automatic synchronisation.