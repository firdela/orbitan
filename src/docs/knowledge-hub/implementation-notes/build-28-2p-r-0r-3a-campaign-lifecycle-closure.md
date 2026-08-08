# Build #28.2P-R.0R.3A — Automated Campaign Lifecycle, Schema & Readiness Truthfulness Closure

**Date:** 2026-08-08
**Status:** PASS — All 45 automated policy matrix scenarios pass. Evidence-derived readiness = true.
**Starting GitHub HEAD:** `53d19568a2e292b35697e0fa8e67b4af3ba5f5a7`
**0R.3A Code SHA (before this continuation):** `b63af0f519fcabf4d9bb832d52633d861bd990e8`

---

## Previous 0R.3 Verdict Correction

The previous Build #28.2P-R.0R.3 report claimed VERDICT = PASS while simultaneously reporting:
- Old VerificationRun `vrun_msj2zitu_kbcxjg` status = ACTIVE
- Old run lifecycle transition = NOT EXECUTED
- New automated VerificationRun = NOT CREATED

That did not satisfy the original completion gate. The previous 0R.3 verdict is corrected to: **PASS WITH BLOCKING GAPS**. This 0R.3A closure build resolves all blocking gaps.

## Issues Fixed

### 1. Campaign-Type Fail-Closed Validation
**Before:** `if (activeRun.campaign_type && activeRun.campaign_type !== AUTOMATED_POLICY_MATRIX)` — allowed null/undefined.
**After:** `if (activeRun.campaign_type !== AUTOMATED_POLICY_MATRIX)` — rejects null, undefined, manual_live_identity, auth_canary, and any unknown value.

### 2. TestLabOperation Schema Parity
Added `run_safe_verification_matrix` to the `action` enum and `verification_matrix` to the `target_type` enum in `TestLabOperation.jsonc`. The matrix operation now creates a valid TestLabOperation using the canonical schema.

### 3. Evidence-Derived Readiness
Removed hardcoded `ready: true`. Added `computeAutomatedReadiness()` helper that computes readiness from persisted evidence. Ready is TRUE only when:
1. A COMPLETED `automated_policy_matrix` VerificationRun exists with current `MATRIX_VERSION` AND `non_production === true`
2. All 45 required scenarios have PASS `TestLabVerificationResult` records
3. `fail_count = 0` and `blocked_count = 0`
4. All results have `non_production = true`
5. All 8 canonical personas are covered
6. No unresolved `TestLabOperation` for that campaign
7. Evidence belongs to that exact `verification_run_id`

States: `NO_CAMPAIGN`, `IN_PROGRESS`, `FAILED`, `UNAVAILABLE`, `COMPLETED`, `EVIDENCE_INCOMPLETE`.

### 4. Non-Production Guards (This Continuation)
- **Matrix result selector:** `get_matrix_results` selector mode now requires `campaign_type === automated_policy_matrix` AND `non_production === true`. Production records return `production_record_forbidden` (403).
- **Default completed lookup:** Default fallback requires `campaign_type === automated_policy_matrix` AND `status === completed` AND `non_production === true` AND `matrix_version === current MATRIX_VERSION`. Never falls back to manual, auth_canary, old versions, or production records.
- **Readiness candidate filter:** `computeAutomatedReadiness` filters candidate runs by `matrix_version === current` AND `non_production === true`. A production or untagged campaign can NEVER make `ready = true`.

### 5. Server-Derived expected_scenarios (This Continuation)
`create_verification_run` now server-derives `expected_scenarios` from `ALL_SCENARIOS.map(s => s.scenario_id)` for `automated_policy_matrix` campaigns. The browser/client cannot define the canonical automated scenario matrix. Client-provided `expected_scenarios` preserved for other campaign types only.

### 6. get_matrix_results Supports COMPLETED Runs
**Before:** Only served results when a run was ACTIVE.
**After:** Defaults to (1) current ACTIVE `automated_policy_matrix` run, or (2) latest COMPLETED `automated_policy_matrix` run with current `MATRIX_VERSION` and `non_production=true`. Never selects `manual_live_identity` or `auth_canary` runs. Optional `verification_run_id` selector (lookup only, no authority).

### 7. Proof Class Truthfulness
All 45 scenarios are `POLICY_UNIT` only. Corrected `expected_proof_classes` from `[POLICY_UNIT, BACKEND_INTEGRATION]` to `[POLICY_UNIT]`. Campaign-level backend evidence is reported separately, not relabelled as per-scenario proof.

### 8. Full 8-Persona Coverage
Added 4 tenant isolation scenarios for `tenant_a_leader` and `tenant_b_admin`. Total: 45 scenarios (41 + 4). All 8 canonical personas now have scenario results.

### 9. Old Manual Run Legally Retired
`vrun_msj2zitu_kbcxjg`: ACTIVE → FAILED (reason: `testing_methodology_superseded`) → ARCHIVED. Full TestLabOperation audit trail. Historical evidence preserved.

### 10. Fresh Automated Campaign
`vrun_msk2pwoe_9y016l`: PREPARING → ACTIVE → COMPLETED. 45/45 PASS. Not archived — remains the latest durable evidence-bearing campaign.

### 11. Unused Import Cleanup (This Continuation)
`getScenarioCount` removed from `entry.ts` imports (was introduced by 0R.3 but never used).

## Matrix Results (Live Backend Execution)

- **VerificationRun ID:** `vrun_msk2pwoe_9y016l`
- **Matrix Version:** `0R.3.1`
- **Campaign Type:** `automated_policy_matrix`
- **Non-Production:** `true`
- **Total scenarios:** 45
- **PASS:** 45
- **FAIL:** 0
- **BLOCKED:** 0
- **UNVERIFIED:** 0

## Matrix TestLabOperation Lifecycle

- **operation_id:** `tlop_msk2q5mo_23q3e5`
- **action:** `run_safe_verification_matrix`
- **target_type:** `verification_matrix`
- **status:** `completed`
- **intent_audit_id:** exists
- **completion_audit_id:** exists
- **mutation_resource_ids:** 45
- **non_production:** true

## Readiness Evidence

- **ready:** true (evidence-derived)
- **state:** COMPLETED
- **verification_run_id:** `vrun_msk2pwoe_9y016l`
- **total_required_scenarios:** 45
- **total_results:** 45
- **pass_count:** 45
- **fail_count:** 0
- **blocked_count:** 0
- **all_non_production:** true
- **persona_coverage:** 8/8
- **missing_personas:** none
- **has_unresolved_operations:** false

## Test Suite Results

| Test Suite | Passed | Failed |
|-----------|--------|--------|
| test-lab-0r3a-closure | 48 | 0 |
| test-lab-verification-matrix | 648 | 0 |
| test-lab-hardening | 475 | 0 |
| nexus-gateway-hardening | 37 | 0 |
| ai-governance-parity | 84 | 0 |
| **Total** | **1,292** | **0** |

## Deferred Items

- **RLS proof:** DEFERRED — Act as User is editor/admin-only, not programmatically callable. Manual spot-check deferred.
- **REAL_AUTH proof:** DEFERRED_TO_BUILD_28_2Q — 1 email/password canary target. No Google accounts.
- **Eight manual accounts:** Remain retired. Existing invitations obsolete. No new invitations sent.