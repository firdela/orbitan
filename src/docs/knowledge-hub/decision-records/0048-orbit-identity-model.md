# ADR-0048: Orbit Identity Model — User vs Employee Membership

**Status:** Accepted
**Date:** 2026-07-22
**Principle:** Regulate (Identity & Access)
**Supersedes/Extends:** ADR-0027 (Staff Directory Governance), ADR-0020 (Orbit ID)

## Context

OrbitanOS scales to many tenants, outlets, and employees. A single person (e.g. Hamka Ariffin) may hold a role in several organisations — Founder at Taqueria Pte Ltd, Director at another company, Manager elsewhere. The original data model conflated *who a person is* (global identity) with *what role they hold in an organisation* (tenant-scoped membership). This produced three failure modes:

1. **Dashboard count mismatch** — `WorkspaceDashboard` called `Employee.list()` unscoped; platform admins bypass tenant RLS and saw cross-tenant counts, while the Workforce Control Room correctly filtered by `tenant_id`. Different query logic → different counts.
2. **Cross-tenant identity fragmentation** — no mechanism for one person to belong to multiple organisations without duplicate accounts, weakening tenant isolation and complicating audit history.
3. **Missing founder memberships** — `onboardingService` stamped the founder's `User` record but never created an `Employee` membership, so founders did not appear in their own Workforce directory.

## Decision

Adopt the **Orbit Identity Model**, the standard multi-tenant SaaS pattern used by Microsoft 365, Atlassian, Slack Enterprise, and Google Workspace:

- **User** = a person's **global identity**, unique across the platform. One account per person, regardless of how many organisations they belong to.
- **Employee** = an **organisation-specific membership**. A User may hold many Employee records — one per tenant — each with its own role, outlet, position, and status. All are isolated by tenant and enforced by RLS.

The link between the two layers is the **`user_id`** field on Employee:
- `user_id` is nullable for directory entries whose owner has not yet registered/claimed a platform account.
- On registration or invitation redemption, the onboarding flow stamps `user_id` on the matching Employee record (resolved by email within the tenant).
- `User.data.tenant_id` remains the **active workspace** pointer (single value); the Employee records are the full membership set.

### Synchronisation architecture

1. **Canonical query layer** (`src/lib/workforceQueries.js`) — `useWorkforceCounts(tenantId)` is the single function every dashboard widget and the Workforce Control Room use to derive total/active/on-leave/pending counts. No widget computes its own interpretation of "active".
2. **Event-driven sync** — the canonical hooks subscribe to realtime entity events (Employee, AccessRequest, Invitation) and invalidate the React Query cache on any change, so every Workforce view refreshes without manual page reloads.
3. **Founder membership on provisioning** — `onboardingService.provisionOrganisation` now creates an Employee membership for the founder at provisioning time.
4. **AccessRequest approval → Employee** — the existing entity automation (`Access Request — Auto-Provision Employee on Approval`) calls `onboardingService.approve_access_request`, which creates/syncs the Employee record idempotently (dedup by `tenant_id` + `email`).

## Consequences

**Positive:**
- One person, one account, many organisations — clean scaling to the Firdela ecosystem and beyond.
- Dashboard and directory counts are guaranteed consistent (single canonical source).
- Tenant isolation preserved: each Employee record is scoped to one tenant; RLS unchanged and still enforces `data.tenant_id == {{user.data.tenant_id}}`.
- Audit history is per-membership (employment_history on the Employee record) plus global AuditLog entries.

**Negative / trade-offs:**
- `user_id` is nullable until registration; identity joins by email in the interim. A registration race could theoretically create two Users with the same email — mitigated by the platform's unique-email constraint on User.
- Cross-tenant identity operations (e.g. "list all orgs for this person") require an email-indexed query across Employee records, not a User-side join. Acceptable for MVP scale.

## Verification (2026-07-22)

All 12 Phase 6 regression criteria passed: dashboard count equals team list; Employee entity is the canonical source; invitation path intact; AccessRequest automation active; founder appears in both assigned tenants; one User identity (Hamka pending registration, `user_id` null); tenant isolation intact; RLS enforced; AuditLog complete; no duplicate Users; no duplicate active memberships per tenant; existing invitation `ORB-CEMCDS` still active.

## Data-integrity repair

The pre-existing Renewed Resources Employee record stored `tenant_id` as the organisation **name** (`"Renewed Resources Pte Ltd"`) instead of the tenant **UUID**. This silently broke tenant-scoped RLS for non-admin users. Corrected to the UUID `6a21598721243d26f81e0154`, with an employment_history entry and AuditLog entry recording the repair.

## Related

- ADR-0027 — Staff Directory Governance (RLS foundation this builds on)
- ADR-0020 — Orbit ID (Identity & Access)
- ADR-0016 — RLS Tenant Isolation Standard