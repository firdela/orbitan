# OrbitanOS — Pilot Support Runbook

> For the pilot owner / customer administrator. Reuse existing systems
> (Tasks, Feedback Centre) — no separate ticketing system.

## Roles
- **Pilot owner:** Orbitan-side, tracks daily/weekly review.
- **Customer administrator:** tenant admin on the pilot tenant.
- **Support contact:** confirmed in the onboarding checklist.

## Issue intake
- In-app: Feedback Centre (`/workspace/:tenantId/feedback`).
- Worker issues: Worker Portal issue log.
- Critical: escalate to pilot owner directly.

## Severity levels
| Severity | Definition | Response |
| :--- | :--- | :--- |
| S1 Critical | Blocker preventing core ops (sale/clock/sync) | Same day |
| S2 High | Major feature broken, workaround exists | 1 business day |
| S3 Medium | Minor defect or UX issue | 3 business days |
| S4 Low | Cosmetic / enhancement | Next release |

## Triage
1. Reproduce in the diagnostics view (`/platform/diagnostics`) using the
   correlation ID from the failure record.
2. Log a Task in the pilot tenant or Feedback Centre with severity + module.
3. Assign to the responsible squad.

## Data issue handling
- Inventory miscount → Stock Count reconciliation (reconcile to actuals).
- Duplicate sale → cancel the duplicate (controlled reversal).
- Failed finance queue → Finance Integration → Retry (gated by permission).

## Security escalation
- Suspected cross-tenant leak → immediately notify platform admin; run
  `accessValidationHarness`. Do NOT attempt to read another tenant's data.

## Finance-sync escalation
- Repeated sync failures → check Xero connection state in Finance Integration.
- If expired/disconnected → re-authorise (requires Xero credentials — pending).
- Escalate to finance administrator if mapping is incomplete.

## Rollback decision
- Code: platform admin can disable a module via ModuleAccessPolicy /
  SystemSettings (maintenance mode) for controlled rollback.
- Data: transactional engines rollback on failure; for manual corrections
  see `recovery-runbook.md`.

## Feature requests
- Log via Feedback Centre (tag "enhancement"). Triage weekly. Not actioned
  during pilot unless S1/S2.

## Daily pilot review
- Pilot owner reviews: diagnostics failures, Feedback Centre, readiness %.

## Weekly pilot review
- Review readiness dashboard, open defects, recurring failures, feedback themes.

## Pilot completion criteria
- All S1/S2 defects resolved.
- Readiness dashboard = Ready for Controlled Pilot sustained.
- Customer administrator sign-off.

## Pilot exit & data cleanup
- See `recovery-runbook.md` for data export + cleanup procedures.