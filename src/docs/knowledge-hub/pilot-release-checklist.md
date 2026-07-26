# OrbitanOS — Pilot Release Checklist

**Version:** MVP Release Candidate (Build #24)
**Date:** 2026-07-26
**Owner:** Muhammad Firdaus Bin Ismail (Founder)
**Repository:** https://github.com/firdela/orbitan (private, branch `main`)

This is the controlled-pilot deployment gate. Every item must be ✓ before a pilot tenant is activated. Items marked **[Automated]** are verified by the platform; items marked **[Manual]** require human confirmation.

---

## A. Environment & Infrastructure

- [ ] **[Automated]** Production database is on the Production environment (not Test).
- [ ] **[Automated]** Stripe is in **Live Mode** (confirmed: 5 products provisioned, webhook registered).
- [ ] **[Automated]** All 7 Stripe secrets are set (live + test keys, webhook secrets).
- [ ] **[Manual]** Custom domain configured and SSL active (if applicable).
- [ ] **[Manual]** GitHub two-way sync verified — latest `main` matches Base44 production build.

## B. Tenant Activation

- [ ] **[Manual]** Pilot tenant created in Tenant registry (Taqueria Pte Ltd / Renewed Resources / Renewed Fashion / HBB).
- [ ] **[Manual]** Tenant status set to `active` (or activated via Pilot Activation Centre).
- [ ] **[Manual]** Tenant currency confirmed (SGD default).
- [ ] **[Manual]** Tenant default Industry Pack assigned (fnb / recycling / retail).

## C. Organisation, Brand & Outlet

- [ ] **[Manual]** Company/Organisation record linked to tenant.
- [ ] **[Manual]** At least one Outlet created with operating hours and contact location.
- [ ] **[Manual]** Outlet ID recorded (drives RLS outlet-scoping).

## D. Administrator Accounts

- [ ] **[Manual]** Tenant Owner / Tenant Admin user invited via `base44.users.inviteUser(email, 'tenant_admin')` or role assigned.
- [ ] **[Manual]** Admin has completed registration + email verification (OTP flow).
- [ ] **[Manual]** Admin `role` and `tenant_id` set on User entity (via `auth.updateMe` or onboarding).

## E. Worker Accounts

- [ ] **[Manual]** Employees onboarded (Employee records created — manually or via Access Request approval auto-provision).
- [ ] **[Manual]** Each worker invited as app user with `role: 'worker'`.
- [ ] **[Manual]** Worker `tenant_id` + `outlet_id` set (drives RLS self-scope + outlet-scope).
- [ ] **[Manual]** Worker can sign in and reach `/worker` portal.

## F. Roles & RBAC

- [ ] **[Automated]** RLS rules match frontend RBAC (validated across entities in Build #24).
- [ ] **[Manual]** Verify: worker cannot reach `/leader-org` or `/platform/*` (direct URL returns redirect/forbidden).
- [ ] **[Manual]** Verify: tenant user cannot see another tenant's data (switch tenant → empty).
- [ ] **[Manual]** Verify: outlet-scoped manager sees only their outlet's inventory/shifts/clock records.

## G. Modules & Industry Packs

- [ ] **[Manual]** Required modules enabled for tenant (Inventory, Procurement, Workforce, Compliance, etc.).
- [ ] **[Manual]** Industry Pack modules visible (F&B → Recipes/Production; Recycling → MaterialCollection; Retail → ProductCatalog/POS).
- [ ] **[Manual]** Module access policies configured (ModuleAccessPolicy) if restricting by role.

## H. Automations (Health Check)

- [ ] **[Automated]** All 23 active automations have `consecutive_failures: 0` (verified Build #24).
- [ ] **[Automated]** No duplicate active triggers (verified Build #24).
- [ ] **[Manual]** Confirm scheduled jobs ran on schedule (Attendance Reconciliation 15m, Finance Sync 15m, Daily Compliance Snapshot, Shift Reminder, Replenishment Engine).
- [ ] **[Manual]** Trigger one entity-create test (in Test Lab tenant) and confirm AuditLog + Orbit Inbox generated.

## I. PWA

- [ ] **[Manual]** Install prompt appears on Android Chrome / iOS Safari.
- [ ] **[Manual]** App opens in standalone mode (no browser chrome).
- [ ] **[Manual]** Theme color, icon, and splash correct.
- [ ] **[Manual]** Offline: cached shell loads; live-write actions show connectivity message.

## J. Pilot Data Seed (Optional — per tenant)

- [ ] **[Manual]** Inventory items seeded (or imported via Data Migration).
- [ ] **[Manual]** Suppliers seeded (preferred flag set for autopilot-eligible suppliers).
- [ ] **[Manual]** Recipes/Products seeded (F&B / Retail).
- [ ] **[Manual]** Compliance records created for upcoming deadlines.
- [ ] **[Manual]** Initial shift schedule published.

## K. Backup & Recovery

- [ ] **[Manual]** GitHub repo is the authoritative code backup (verified current).
- [ ] **[Manual]** Data recovery runbook reviewed (src/docs/knowledge-hub/recovery-runbook.md).
- [ ] **[Manual]** Rollback procedure understood (see §P below).

## L. Support & Escalation

- [ ] **[Manual]** Support contact configured on OnboardingChecklist (support_contact_name/email/phone).
- [ ] **[Manual]** Pilot owner confirmed (pilot_owner_name).
- [ ] **[Manual]** Issue escalation path communicated to tenant admin (Support Diagnostics page → report issue).
- [ ] **[Manual]** Feedback channel confirmed (Worker Feedback → Feedback Intelligence).

## M. Monitoring

- [ ] **[Automated]** Operational Health Dashboard reachable (/platform/operational-health).
- [ ] **[Automated]** Exception Centre reachable (/platform/exception-centre).
- [ ] **[Automated]** Support Diagnostics reachable (/platform/diagnostics).
- [ ] **[Manual]** Founder checks Leader Workspace daily during pilot week 1.

## N. Audit Review

- [ ] **[Automated]** Audit Centre reachable (/audit-centre).
- [ ] **[Manual]** Verify first real operational events appear in timeline with correct severity/category.
- [ ] **[Manual]** Verify worker can see only their own activity (self-visibility RLS).
- [ ] **[Manual]** Generate one Audit Bundle PDF as a dry-run of the SOC 2 export.

## O. Pilot Feedback Capture

- [ ] **[Manual]** Worker feedback widget accessible in Worker Portal.
- [ ] **[Manual]** Tenant admin knows where to submit feedback (Feedback Centre).
- [ ] **[Manual]** Nexus Feedback Analyst auto-analysis confirmed on new IssueLog (automation active).

## P. Rollback Procedure

- [ ] **[Manual]** If a pilot-blocking defect is found:
  1. Document in Defect Register (src/docs/knowledge-hub/defect-register.md).
  2. Fix in Base44 → sync to GitHub `main`.
  3. Republish app.
  4. Re-run affected journey validation.
- [ ] **[Manual]** If data corruption: pause affected automations, restore from last known-good, re-onboard tenant.
- [ ] **[Manual]** If tenant needs to revert to manual ops: export data via Data Migration page (CSV), hand off.

## Q. Go-Live Approval

- [ ] **[Manual]** All items above ✓.
- [ ] **[Manual]** Pilot readiness % ≥ 80 (via Pilot Readiness Dashboard, tenant_admin_signoff = true).
- [ ] **[Manual]** Founder signs off pilot launch.
- [ ] **[Manual]** Tenant admin acknowledges go-live.

---

**Sign-off:**

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Founder / Pilot Owner | Muhammad Firdaus Bin Ismail | ____ | ____ |
| Tenant Admin | ____ | ____ | ____ |