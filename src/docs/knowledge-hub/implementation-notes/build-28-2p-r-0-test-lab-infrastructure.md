# Build #28.2P-R.0 — Orbitan Test Lab Infrastructure

**Date:** 2026-08-06
**Build:** #28.2P-R.0
**Status:** IMPLEMENTED WITH BLOCKING SECURITY AND OPERATIONAL DEFECTS — REPAIR IN PROGRESS (Build #28.2P-R.0R)
**Prerequisite for:** Build #28.2P-R.1 (live governance verification)

## Purpose

Build #28.2P-R.0 creates one secure, reusable internal capability — **Orbitan Test Lab Setup** — that unblocks the later live governance verification build (#28.2P-R.1) by providing the test infrastructure needed to provision sandbox tenants, prepare test identities, manage the cross-tenant AI permission, and verify readiness.

This is **not** a temporary developer tool. It is permanent internal test infrastructure, guarded by platform-admin authentication and an explicit `platform.test_lab.manage` permission.

## What Was Built

### 1. Canonical Shared Configuration (`base44/shared/test-lab-config.ts`)
- Fixed test-identity allowlist (8 aliases) with canonical role mapping
- Test-run tagging standard (`environment=test`, `test_run_id`, `test_tag`, `created_by_test`, `non_production`)
- Sandbox-only short TTL constants (1–10 minutes, default 2; production always 24h)
- Cross-tenant permission constant: `platform.ai.cross_tenant_operate`
- Test-lab management permission: `platform.test_lab.manage`
- Email delivery attestation check list (7 checks)

### 2. Protected Backend Function (`base44/functions/testLabSetup/entry.ts`)
Actions:
- `provision_tenant_b` — idempotent sandbox tenant creation with server-enforced `is_sandbox=true`
- `audit_tenant_a` — read-only readiness audit of existing Test Tenant A
- `prepare_membership` — Employee membership preparation for allowlisted aliases only
- `grant_permission` — grants `platform.ai.cross_tenant_operate` to the allowed test identity only
- `revoke_permission` — revokes the same
- `attest_delivery` — records founder email delivery attestation
- `readiness_status` — dashboard data (tenants, identities, capabilities)
- `reset_test_data` — resets mutable tagged test records (sandbox only, immutable audits retained)

**Security:**
- Platform-admin authentication required
- `platform.test_lab.manage` permission required
- Fixed allowlist — no arbitrary user IDs or aliases
- No generic permission editor (one fixed permission only)
- No generic tenant creator (predefined Test Tenant B only)
- No approval-record editing
- No forced approval or execution
- All operations audited via AuditLog

### 3. Frontend Page (`src/pages/platform/TestLabSetupPage.jsx`)
- Route: `/platform/test-lab`
- Readiness dashboard: Tenant A/B state, 8 identity lifecycle states, test capability readiness
- Provision Test Tenant B button (with confirmation dialog)
- Prepare Membership, Grant Permission, Revoke Permission buttons
- Email delivery attestation table (7 checks × 8 aliases)
- Mutable test data reset (with confirmation dialog)
- Responsive, WCAG 2.2 AA, Orbitan design tokens

### 4. Nexus Gateway Sandbox TTL (`base44/functions/nexus/entry.ts`)
- Added sandbox-only short TTL at the AIApproval creation point
- Only applies when `Tenant.is_sandbox=true` AND request has `test_run_id` + `test_tag`
- Server-controlled TTL range (1–10 minutes, default 2)
- Client cannot supply arbitrary timestamps
- Production tenants always use normal 24-hour TTL
- Test tagging metadata applied to AIApproval and AIAuditEvent records

### 5. Parity Test Repair (`src/lib/__tests__/ai-governance-parity.test.js`)
- Fixed broken import: `'../ai-policy-evaluator.js'` → `'../ai/ai-policy-evaluator.js'`
- The canonical module exists at `src/lib/ai/ai-policy-evaluator.js`

### 6. Tests (`src/lib/__tests__/test-lab-hardening.test.js`)
- Test identity allowlist validation
- Canonical role mapping verification
- Sandbox TTL validation (valid + invalid ranges)
- Test-run tagging standard verification
- Cross-tenant permission constants
- Email attestation check list
- Security: no generic editor, founder/production emails rejected

## Architecture Decisions

### Permission Storage
**Decision:** `User.data.permissions` array is the authoritative permission source.
**Rationale:** The existing `hasCrossTenantPermission()` in `nexus-gateway-utils.ts` already reads from this source. The `aiApprovalActions` function also reads `user.data?.permissions`. Creating a conflicting permission entity would introduce dual-source-of-truth risk.

### Test TTL at Creation Point
**Decision:** TTL is set at the AIApproval creation point in the nexus gateway, not in `aiApprovalActions`.
**Rationale:** The nexus gateway is where `expires_at` is originally computed. Adding it here means the short TTL is established at creation time, and the existing expiry check in `aiApprovalActions` (line 290) automatically enforces it during approve/reject/execute. No changes to the decision-processing logic are needed.

### No Direct User Creation
**Decision:** The Test Lab does not create User records.
**Rationale:** Base44 Auth owns the User lifecycle. The Test Lab prepares Employee memberships and tracks registration state. Users join through the canonical `/join` flow and `identityLinkage` links them to Employee records by email matching.

## Reused Existing Systems
- Base44 Auth (authentication, registration, email verification)
- `/join` flow (invitation acceptance)
- `identityLinkage` function (User-to-Employee linking)
- Tenant entity and RLS
- Employee entity and RLS
- AccessEngine and RBAC
- AuditLog entity (for audit events)
- OrbitanLoader, EmptyState, PageHeader, BackBar components
- Orbitan design tokens and shadcn/ui components

## Files Created
- `base44/shared/test-lab-config.ts`
- `base44/functions/testLabSetup/entry.ts`
- `src/pages/platform/TestLabSetupPage.jsx`
- `src/lib/__tests__/test-lab-hardening.test.js`
- `src/docs/knowledge-hub/implementation-notes/build-28-2p-r-0-test-lab-infrastructure.md`

## Files Modified
- `src/App.jsx` — added `/platform/test-lab` route
- `base44/functions/nexus/entry.ts` — sandbox TTL + test tagging at approval creation
- `src/lib/__tests__/ai-governance-parity.test.js` — fixed broken import path

## What Was NOT Built
- No generic developer console
- No generic tenant creator
- No generic permission editor
- No AIApproval record editor
- No forced approval or execution button
- No generic mock clock
- No new AuthContext or auth provider
- No Enterprise Authentication Hardening
- No role-aware navigation restructuring
- No Orbit Nexus dashboard widgets
- No external AI-provider configuration

## Founder Actions Still Required
1. Grant `platform.test_lab.manage` permission to the founder account (via User.data.permissions update in Base44 console)
2. Navigate to `/platform/test-lab` and provision Test Tenant B
3. Prepare Employee memberships for the 8 test identities
4. Invite each test identity through the canonical `/join` flow
5. Attest email delivery for each alias
6. Grant `platform.ai.cross_tenant_operate` to `test.platform.allowed@orbitan.net`
7. Verify all 8 identities reach `IDENTITY_LINKED` or `READY` state
8. Set up 8 isolated browser sessions

## Build #28.2P-R.1 Readiness
Build #28.2P-R.1 (live governance verification) may begin only after:
- Test Tenant B is provisioned and sandbox-verified
- All 8 test identities are registered, email-verified, and identity-linked
- Cross-tenant permission distinction is confirmed
- All 8 isolated sessions authenticate successfully
- No production identity was repurposed
- No production tenant is used for testing