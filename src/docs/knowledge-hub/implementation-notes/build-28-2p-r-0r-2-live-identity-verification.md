# Build #28.2P-R.0R.2 — Live Identity, Tenant Isolation & Approve→Execute Verification

**Date:** 2026-08-07
**Status:** PASS WITH BLOCKING GAPS — Human authentication checkpoint required
**Starting GitHub SHA:** 09ede8168cee2fa096c4eef950eef8fce91c83b6

---

## Overview

This build attempts to close the remaining LIVE identity, authorization, tenant-isolation and requester→approval→execution verification gates. It is blocked on human authentication: all 8 test identities have been invited but none have registered, verified email, or established authenticated sessions.

---

## 1. Preflight RLS Denial — PASS

All 5 Test Lab entities deny direct client (non-service-role) write operations:

| Entity | Create | Update | Delete |
|--------|:------:|:------:|:------:|
| TestLabOperation | DENIED ✅ | — | — |
| TestLabLockRegistry | — | DENIED ✅ | — |
| VerificationRun | DENIED ✅ | — | — |
| TestRun | DENIED ✅ | — | — |
| TestLabAttestation | DENIED ✅ | — | — |

Service-role operations continue to work correctly.

---

## 2. Test Identity State

### Registration State (before human action)
All 8 test identities were UNREGISTERED at the start of this build. Invitations have been sent to all 8:

| Identity | Tenant | Invited | Registered | Verified | Employee | Linked |
|----------|--------|:-------:|:----------:|:--------:|:--------:|:------:|
| test.requester.a@orbitan.net | A | ✅ | ❌ | ❌ | ✅ | ❌ |
| test.approver.a@orbitan.net | A | ✅ | ❌ | ❌ | ✅ | ❌ |
| test.leader.a@orbitan.net | A | ✅ | ❌ | ❌ | ✅ | ❌ |
| test.worker.a@orbitan.net | A | ✅ | ❌ | ❌ | ✅ | ❌ |
| test.admin.b@orbitan.net | B | ✅ | ❌ | ❌ | ✅ | ❌ |
| test.worker.b@orbitan.net | B | ✅ | ❌ | ❌ | ✅ | ❌ |
| test.platform.allowed@orbitan.net | Platform | ✅ | ❌ | ❌ | N/A | N/A |
| test.platform.denied@orbitan.net | Platform | ✅ | ❌ | ❌ | N/A | N/A |

### Employee Memberships (prepared via canonical testLabSetup)
All 6 tenant test identities have Employee records created with full TestLabOperation audit trail:

| Identity | Employee ID | Tenant | Outlet | Role |
|----------|-------------|--------|--------|------|
| test.requester.a | 6a75f54b9ad00fdd9bf98cfe | A | 6a4eeb692e8382bd9ce85611 | worker |
| test.approver.a | 6a75f54ace3648f264759d09 | A | 6a4eeb692e8382bd9ce85611 | tenant_admin |
| test.leader.a | 6a75f54a5c9bb3900db54614 | A | 6a4eeb692e8382bd9ce85611 | outlet_manager |
| test.worker.a | 6a75f54add2fb25bf30652c8 | A | 6a4eeb692e8382bd9ce85611 | worker |
| test.admin.b | 6a75f54a4249ada7ab1bde7a | B | 6a75ac83accaef60bb56a319 | tenant_admin |
| test.worker.b | 6a75f54be740a31ff054b3c8 | B | 6a75ac83accaef60bb56a319 | worker |

### VerificationRun
- **ID:** vrun_msj2zitu_kbcxjg
- **Status:** active
- **Started:** 2026-08-07T15:09:55.612Z
- **Purpose:** Build 28.2P-R.0R.2 — Live identity, tenant isolation and approve-to-execute verification campaign

---

## 3. Production-Tenant Isolation Regression — PASS

| Tenant | is_sandbox | test_lab_key | Production? |
|--------|:----------:|:-----------:|:-----------:|
| Orbitan Test Lab | true | null | No (sandbox) |
| Orbitan Test Lab B | true | TEST_LAB_B | No (sandbox) |
| Taqueria Pte Ltd | false | null | ✅ Yes |
| Renewed Resources Pte Ltd | false | null | ✅ Yes |
| Renewed Fashion | false | null | ✅ Yes |
| Izaliqa Bakes | false | null | ✅ Yes |

- Production tenants with sandbox flag: 0 ✅
- Production tenants with test_lab_key: 0 ✅
- Only 1 user has `platform.test_lab.manage` permission (platform admin) ✅

---

## 4. Test Lab Data Analytics Exclusion — PASS

| Entity | Total Records | All non_production=true? |
|--------|:-------------:|:-----------------------:|
| TestLabOperation | 9 | ✅ Yes |
| TestRun | 1 | ✅ Yes |
| TestLabAttestation | 2 | ✅ Yes |

---

## 5. Human Authentication Checkpoint — BLOCKED

### What the Founder Must Do

For each of the 8 test identities, the following human actions are required:

1. **Open the invitation email** sent to the @orbitan.net alias (Cloudflare Email Routing forwards to Gmail)
2. **Click the invitation link** to accept
3. **Register with a password** (or use Google SSO)
4. **Verify the email address** if a separate verification email is sent
5. **Sign in** to establish an authenticated session

Once all 8 identities are registered and verified, the following verification gates can proceed:

- Step 6: Identity / membership linkage verification
- Step 7: Worker security boundary (Worker A)
- Step 8: Approver security boundary (Approver A)
- Step 9: Requester → approval → requester execution
- Step 10: Payload integrity
- Step 11: TestRun single-use / concurrency
- Step 12: Expiry (real elapsed time)
- Step 13: Rejection
- Step 14: Cancellation
- Step 15: Execution_failed
- Step 16: Tenant A / Tenant B isolation
- Step 17: Platform cross-tenant permission (allowed vs denied)
- Step 19: Exact side-effect accounting

---

## 6. Regression Test Results

| Suite | Passed | Failed | Exit Code |
|-------|--------|--------|-----------|
| test-lab-hardening | 475 | 0 | 0 |
| nexus-gateway-hardening | 37 | 0 | 0 |
| ai-governance-parity | 84 | 0 | 0 |
| Lint | 0 errors | 2 warnings | 0 |
| Production build | — | — | 0 |

---

## 7. Defects Deferred to Build #28.2Q

- Auth UX repair (invitation acceptance flow, registration, email verification, session handling)
- OTP authentication system limitation (agent-side email read failure)
- Worker session denial live testing (blocked on human auth)
- Approver boundary live testing (blocked on human auth)
- Requester-owned execution live testing (blocked on human auth)