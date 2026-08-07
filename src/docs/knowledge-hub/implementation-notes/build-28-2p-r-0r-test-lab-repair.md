# Build #28.2P-R.0R — Orbitan Test Lab Security and Operational Repair

**Date:** 2026-08-07
**Build:** #28.2P-R.0R
**Status:** IMPLEMENTED — live backend verified for bootstrap, readiness, provisioning, and attestation
**Prerequisite for:** Build #28.2P-R.1 (live governance verification)

## Purpose

Build #28.2P-R.0R is a blocking repair of Build #28.2P-R.0. It corrects 12 security and operational defects in the Test Lab infrastructure that would have prevented safe live governance verification.

## Defects Repaired

### 1. User Role Mapping (P0 Security)
**Before:** All 8 test identities had `User.role='admin'`, causing RoleGateway to route tenant test users to `/leader-org` (Platform Owner workspace).
**After:** 6 tenant identities use `User.role='user'`. Only 2 platform identities use `User.role='admin'`. Tenant operational authority comes only from Employee membership.

### 2. Route Guard (P0 Security)
**Before:** `/platform/test-lab` was an unguarded ordinary Route. Any authenticated user could access it.
**After:** Wrapped by `TestLabGuard` component — requires authenticated session, `User.role='admin'`, and effective `platform.test_lab.manage` permission. Loading state, permission-denied state, and redirect for unauthorised direct URLs.

### 3. Permission Bootstrap (P0 Operational)
**Before:** No mechanism to grant the first `platform.test_lab.manage` permission. Founder was instructed to manually edit `User.data`.
**After:** One-time `bootstrap_permission` action in `testLabSetup` — works only when no existing holder exists, targets the authenticated founder (no arbitrary target), grants only the one permission, requires a reason, creates mandatory audit evidence before mutation, permanently unavailable after first use. Live-verified: first bootstrap succeeded, second denied with 403.

### 4. Fail-Closed Audit (P0 Security)
**Before:** `auditTestLabAction` caught failures and continued with `console.log`.
**After:** Throws on failure. All callers handle the throw by returning an `audit_failure` error response. Operations do not proceed without durable evidence.

### 5. Audit Tenant Context (P1 Correctness)
**Before:** All audit events were assigned to Tenant A regardless of actual target.
**After:** Audit context uses the actual target tenant ID — platform for platform operations, Tenant A for Tenant A operations, Tenant B for Tenant B operations.

### 6. Tenant B Provisioning (P0 Operational)
**Before:** Handcrafted Tenant and Outlet records with non-existent fields (`outlet_type`, `address_line_1`, `is_active`, `is_sandbox`). Missing Company. Outlet errors swallowed.
**After:** Creates full schema-valid hierarchy (Tenant → Company → Outlet) using correct fields (`type`, `address`, `company_id`). Uses `test_lab_key` for idempotent identification. Company and Outlet errors are not swallowed — full error returned with partial state. Live-verified: tenant_id, company_id, outlet_id all created.

### 7. Protected Test Run (P0 Security)
**Before:** Client could activate short TTL by supplying `body.test_run_id`, `body.test_tag`, `body.test_ttl_minutes`, `body.test_purpose`. An ordinary sandbox requester could control their own TTL.
**After:** Created `TestRun` entity with server-derived TTL. Nexus gateway validates the TestRun record server-side: exists, active, not expired, tenant matches, requester matches, service matches, autonomy matches, usage limit. Client TTL values ignored. Only `platform.test_lab.manage` operators can create Test Runs.

### 8. Schema-Supported Test Tagging (P0 Data Integrity)
**Before:** Test metadata was written to AIApproval's undeclared `metadata` field. Not queryable.
**After:** Added `is_test`, `test_run_id`, `test_tag`, `test_purpose`, `non_production` fields to AIApproval schema. Nexus writes these schema-supported fields. Reset logic queries `test_run_id` field directly.

### 9. Persisted Email Attestation (P1 Operational)
**Before:** Attestation only created an AuditLog entry. No persisted state per alias per check.
**After:** Created `TestLabAttestation` entity — stores per-alias, per-check attestation state. Supports update and revocation. Readiness queries persisted state. Live-verified: attestation created and read back.

### 10. Truthful Readiness (P1 Correctness)
**Before:** `independent_approver_ready: true`, `worker_isolation_ready: true`, `platform_permission_distinction_ready: true` were hard-coded.
**After:** All computed from persisted evidence. `independent_approver_ready` requires distinct registered requester and approver with verified emails and linked memberships. `worker_isolation_ready` requires Worker with `User.role='user'` and `Employee.role='worker'`. `tenant_b_isolation_ready` requires complete hierarchy with linked identities. `platform_permission_distinction_ready` requires both platform users with correct permission state.

### 11. Reset and Retention (P1 Operational)
**Before:** Used undeclared `metadata.test_run_id`. Caught deletion errors and reported success. Reset dialog trigger didn't open.
**After:** Uses schema-supported `test_run_id` field. Returns attempted/deleted/retained/failed counts. Reset dialog trigger fixed with controlled `open` state. Immutable AIAuditEvent records retained. Fail-closed audit.

### 12. Analytics Exclusion (P0 Blocker — Partially Addressed)
**Before:** Tagged records claimed excluded but no actual exclusion logic existed.
**After:** Created `productionExclusionFilter()` and `isProductionRecord()` helpers in canonical config. Applied to AIApproval queries. Comprehensive exclusion across ALL production aggregations remains a P0 blocker — documented.

### 13. Mirrored Tests Replaced
**Before:** Test file copied constants and logic from the production module. Did not test the canonical code.
**After:** Test file imports from `base44/shared/test-lab-config.js` — the same module used in production. 96 tests (up from 76). Added tests for role mapping security fix, route resolution, analytics exclusion, schema-supported tagging detection.

## Files Created
- `base44/shared/test-lab-config.js` — canonical JS ESM module (importable by Deno + Node)
- `base44/entities/TestRun.jsonc` — protected Test Run entity
- `base44/entities/TestLabAttestation.jsonc` — persisted attestation entity
- `src/components/platform/TestLabGuard.jsx` — route guard with bootstrap button
- `src/docs/knowledge-hub/implementation-notes/build-28-2p-r-0r-test-lab-repair.md` — this note

## Files Modified
- `base44/shared/test-lab-config.ts` — re-exports from .js module
- `base44/entities/AIApproval.jsonc` — added test fields (is_test, test_run_id, test_tag, test_purpose, non_production)
- `base44/entities/Tenant.jsonc` — added test_lab_key field
- `base44/functions/testLabSetup/entry.ts` — complete rewrite with all fixes
- `base44/functions/nexus/entry.ts` — replaced client TTL with Test Run validation
- `src/pages/platform/TestLabSetupPage.jsx` — fixed reset dialog trigger
- `src/App.jsx` — wrapped route with TestLabGuard
- `src/lib/__tests__/test-lab-hardening.test.js` — imports from canonical module, 96 tests
- `src/docs/knowledge-hub/CHANGELOG.md` — added repair entry
- `src/docs/knowledge-hub/implementation-notes/build-28-2p-r-0-test-lab-infrastructure.md` — corrected status

## Remaining P0 Blockers
1. Comprehensive analytics exclusion across ALL production aggregations
2. Test Run live verification (requires registered test identities)
3. Worker route/API denial live test (requires Worker session)
4. Full approve-to-execute lifecycle with short TTL (requires registered identities + Test Run)

## Completion Gate Status
1. ✅ Tenant test identities use User.role=user
2. ✅ Only platform test identities use User.role=admin
3. ✅ Test Lab route is guarded before rendering
4. ✅ Backend guard remains active
5. ✅ Secure bootstrap works once and then disables itself
6. ✅ No manual User.data edit is required
7. ✅ Mandatory audits fail closed
8. ✅ Audit tenant context is accurate
9. ✅ Tenant B hierarchy is schema valid
10. ✅ Tenant B provisioning is idempotent
11. ✅ Outlet includes required company_id
12. ✅ No provisioning error is swallowed
13. ✅ Test TTL uses a protected Test Run
14. ✅ Client cannot choose TTL
15. ⏳ Worker cannot activate test TTL (requires Worker session — logic implemented, not live-tested)
16. ⏳ Production tenant cannot activate test TTL (logic implemented, not live-tested)
17. ✅ AIApproval test fields persist in its schema
18. ✅ Attestation state persists
19. ✅ Readiness contains no hard-coded passes
20. ✅ Reset uses real persisted test fields
21. ✅ Immutable audits remain
22. ⏳ Production analytics genuinely excludes test data (helper created, not applied to all aggregations)
23. ✅ Tests import canonical production logic
24. ✅ Successful backend operations are live-tested
25. ⏳ Worker route/API denial is tested (requires Worker session)
26. ✅ Focused lint passes
27. ✅ Gateway tests pass
28. ✅ Governance parity tests pass
29. ✅ Production build passes
30. ⏳ GitHub commit evidence exists (requires platform sync)