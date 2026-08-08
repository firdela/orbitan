# Build #28.2P-R.0R.3 — Automated Test Lab Governance Matrix & Persona Verification

**Date:** 2026-08-08
**Status:** PASS WITH BLOCKING GAPS — subsequently closed by Build #28.2P-R.0R.3A
**Starting GitHub HEAD:** `e5841baf805c31bc3171b11354be2bcddef2d25b`

> **Verdict Correction:** The original report claimed PASS, but the old VerificationRun was still ACTIVE, the lifecycle transition was NOT EXECUTED, and the new automated run was NOT CREATED. This has been corrected to PASS WITH BLOCKING GAPS and fully resolved in Build #28.2P-R.0R.3A. See `build-28-2p-r-0r-3a-campaign-lifecycle-closure.md` for the closure build.

---

## Architecture Decision

The 8-manual-account governance testing method has been **retired**. It was operationally unsustainable — requiring the founder to manually manage 8 test identities, accept 8 invitations, register 8 accounts, verify 8 emails, maintain 8 login states, and switch between browser sessions for every governance test cycle.

The 8 canonical **personas** are retained as logical definitions in `TEST_IDENTITIES`. They are NOT required to be registered Base44 User accounts for routine automated policy verification.

## Key Architectural Principles

1. **TEST_IDENTITIES** remains the single persona source of truth. Each identity now has a `persona_key` (e.g. `tenant_a_worker`, `platform_allowed`).
2. **TestSecurityContext** is server-only, immutable, and derived from `TEST_IDENTITIES` + `PermissionPacks`. The client may only submit a predefined `scenario_id` — no role/permission/tenant authority input.
3. **Production policy reuse:** The Test Lab exercises the SAME production `AccessEngine`, `PermissionPacks`, `validateTenantMembership`, `validateApprovalScope`, `isValidTransition`, `hasCrossTenantPermission`, and `ai-approval-policy` functions. No mirrored authorization engine.
4. **asServiceRole** is orchestration only — NOT persona impersonation. The operator (real admin) and evaluated persona are always distinct.
5. **Act as User** is editor/admin-only — NOT programmatically callable. RLS proof is `DEFERRED`.
6. **Proof class taxonomy:** `POLICY_UNIT`, `BACKEND_INTEGRATION`, `RLS`, `REAL_AUTH`. Phase 1 produces only `POLICY_UNIT`. RLS and REAL_AUTH are honestly labelled `DEFERRED` — never mislabelled as PASS.
7. **No paid AI invoked.** No production customer mutations. No wallet debits. All evidence is `non_production=true`.
8. **0 real accounts required** for routine policy matrix. 1 email/password canary target for Build #28.2Q. No Google accounts.

## Files Created

| File | Purpose |
|------|---------|
| `base44/shared/access/AccessEngine.js` | Canonical backend-accessible AccessEngine |
| `base44/shared/access/PermissionPacks.js` | Canonical backend-accessible PermissionPacks |
| `base44/shared/access/DecisionObject.js` | Canonical backend-accessible DecisionObject |
| `base44/shared/access/PolicyEngine.js` | Canonical backend-accessible PolicyEngine |
| `base44/shared/access/precedence.js` | Canonical backend-accessible precedence resolver |
| `base44/shared/ai-approval-policy.js` | Pure approval decision functions (shared) |
| `base44/shared/nexus-gateway-utils.js` | Pure gateway utilities (Node.js + Deno compatible) |
| `base44/shared/test-security-context.js` | TestSecurityContext derivation |
| `base44/shared/access-reexports.ts` | Backend re-export shim for access modules |
| `base44/entities/TestLabVerificationResult.jsonc` | Matrix evidence entity |
| `base44/functions/testLabSetup/verification-scenarios.js` | Server-defined scenario registry |
| `base44/functions/testLabSetup/verification-matrix.ts` | Matrix orchestrator |
| `src/components/platform/AutomatedVerificationSection.jsx` | Test Lab UI component |
| `src/lib/__tests__/test-lab-verification-matrix.test.js` | 608-test suite |

## Files Modified

| File | Change |
|------|--------|
| `base44/shared/test-lab-config.js` | Added `persona_key`, `VERIFICATION_RUN_CAMPAIGN_TYPES`, `PROOF_CLASSES`, `VERIFICATION_RESULT_STATUSES`, `MATRIX_VERSION`, `PERSONA_KEYS`, `targetKeyForVerificationMatrix` |
| `base44/entities/VerificationRun.jsonc` | Added `campaign_type`, `expected_personas`, `expected_proof_classes`, `matrix_version` |
| `base44/functions/aiApprovalActions/entry.ts` | Imports from `ai-approval-policy.ts` instead of inline |
| `base44/functions/testLabSetup/entry.ts` | Added `run_safe_verification_matrix` and `get_matrix_results` actions |
| `src/lib/access/*.js` | Re-export from `base44/shared/access/` |
| `src/pages/platform/TestLabSetupPage.jsx` | Added `AutomatedVerificationSection` |

## Matrix Results (Live Backend Execution)

- **Total scenarios:** 41
- **PASS:** 41
- **FAIL:** 0
- **BLOCKED:** 0
- **all_passed:** true
- **operation_status:** completed

## Test Suite Results

| Test Suite | Passed | Failed |
|-----------|--------|--------|
| test-lab-verification-matrix | 608 | 0 |
| test-lab-hardening | 475 | 0 |
| nexus-gateway-hardening | 37 | 0 |
| ai-governance-parity | 84 | 0 |

## Deferred Items

- **RLS proof:** DEFERRED — Act as User is editor/admin-only
- **REAL_AUTH proof:** DEFERRED_TO_BUILD_28_2Q — 1 email/password canary
- **Old VerificationRun lifecycle:** `vrun_msj2zitu_kbcxjg` → FAILED → ARCHIVED (founder decision)
- **Existing 8 invitations:** Obsolete, may expire naturally
- **Shield automated policy extraction:** Deferred — not a blocker