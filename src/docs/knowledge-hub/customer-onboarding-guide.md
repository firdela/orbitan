# OrbitanOS — Customer Onboarding Guide

> For new Orbitan customers (tenant administrators). Only documents actual
> implemented behaviour.

## 1. Create your organisation
- Visit `/onboarding` and complete the self-serve installation wizard.
- You become the tenant administrator for your organisation.

## 2. Create a Brand / Company
- In the workspace, go to the Company view. Create your company/brand record.

## 3. Create an Outlet
- Create at least one outlet (your operating location). All operational data
  is scoped to an outlet.

## 4. Invite leaders & workers
- Use the Staff Directory → Invitation panel to invite an outlet manager,
  supervisor, and workers. Each invitee redeems via `/join`.

## 5. Review permissions
- Roles: tenant admin, outlet manager, supervisor, worker.
- Workers see only their own tasks/attendance; supervisors see their team;
  outlet managers manage their outlet; tenant admins see the whole company.

## 6. Configure operations
- **Attendance:** staff clock in/out via `/worker` (PIN/QR/geo).
- **Scheduling:** create shifts in Scheduling.
- **Inventory:** add inventory items + opening stock + par levels.
- **Suppliers:** add preferred suppliers (used by replenishment).
- **Recipes:** add recipes with ingredients + selling price + cost.
- **Procurement:** raise purchase orders; receive via Goods Receipt
  (auto-increments inventory).
- **Sales:** record sales in Sales & Reconciliation (auto-consumes
  finished goods, computes revenue/COGS/margin).
- **Production:** run production batches (auto-deducts ingredients, creates
  finished goods).
- **Finance:** configure Xero connection + account mappings in Finance
  Integration. Sales/production/purchases queue to FinanceSyncQueue.

## 7. Test core workflows
- Complete one sale, one production batch, one daily reconciliation.
- Verify the Orbit Nexus Intelligence dashboard shows a health score +
  daily briefing.

## 8. Readiness check
- Have a platform admin open `/platform/pilot-readiness`.
- Review the checklist; attest the manual flags (permissions reviewed,
  security review complete, pilot owner, support contact, Xero status).
- Target: **Ready for Controlled Pilot** (≥90%, no critical blockers).

## 9. Go live
- Once the readiness dashboard says "Ready for Controlled Pilot", you may go
  live. Contact Orbitan support for the go-live checkpoint.

## Notes
- Xero live sync requires credentials configured by Orbitan (pending).
- Orbit Nexus never executes actions automatically — you confirm everything.
- Demo data is clearly marked and excluded from reporting.