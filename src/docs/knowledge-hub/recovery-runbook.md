# OrbitanOS — Recovery Runbook

> For pilot support. Procedures for common operational corrections. Only
> documents implemented behaviour.

## Data export (before any destructive correction)
- Use the `exportData` backend function (Tenant, Employee, Attendance,
  Timesheet, Inventory, Supplier, Recipe, Production, Sales, FinanceSyncQueue,
  Audit, Reports). Export first, correct second.

## Procedure: Incorrect inventory adjustment
1. Export inventory.
2. Open Inventory → Stock Count / Reconciliation.
3. Reconcile to actuals (creates an audit-logged adjustment).
4. Verify AuditLog entry written.

## Procedure: Failed production deduction
1. The `productionEngine` rolls back on failure (no partial deduction).
2. If a batch shows `cancelled`, restock was rolled back automatically.
3. If stock looks wrong, run a Stock Count reconciliation.

## Procedure: Duplicate sale
1. Open Sales & Reconciliation.
2. Cancel the duplicate invoice (controlled reversal — finished goods
   restocked only if the restock decision is set).
3. Verify FinanceSyncQueue entry for the cancellation.

## Procedure: Incorrect refund
1. Refunds are a controlled accounting reversal. Verify the explicit restock
   decision (restock vs. write-off) was chosen correctly.
2. If wrong, contact the finance administrator — refunds are audited.

## Procedure: Failed finance queue
1. Open Finance Integration → Review Queue.
2. Inspect the failure reason (mapping missing / Xero expired).
3. Retry (gated by finance permission). Up to retry limit; then escalate.

## Procedure: Xero disconnection
1. Finance Integration shows connection state (disconnected/expired).
2. Re-authorise (requires Xero credentials — currently pending Orbitan config).
3. Pending credentials, finance records remain queued; no data loss.

## Procedure: User lockout
1. Platform admin: use `resetPasswordRequest` flow or re-invite.
2. If suspended, the tenant admin reactivates the Employee record.

## Procedure: Accidental membership removal
1. The Employee record can be re-created and re-linked to the User via the
   identity linkage flow (email match).
2. Verify RBAC restored.

## Disaster recovery boundary (honest)
- Application source: GitHub (authoritative repo, two-way sync with Base44).
- Tenant data: platform-managed database. **Automated backup is the
  platform's responsibility** — no custom DR site is claimed.
- Recovery from data corruption: export + manual correction via the
  procedures above. No point-in-time recovery claimed.

## Pilot exit & data cleanup
1. Export all tenant data (exportData).
2. Tenant admin requests suspension via platform admin.
3. Platform admin sets tenant status (suspended) — disables access.
4. Data retained per the pilot agreement; cleanup coordinated with Orbitan.