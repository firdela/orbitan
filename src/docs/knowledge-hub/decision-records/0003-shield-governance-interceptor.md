# ADR-0003: Shield Governance Interceptor

**Date:** 2026-06-20
**Status:** Accepted
**Impacted Modules:** GovernancePolicy, GovernanceOverride, AuditLog, shieldInterceptor, ShieldGuard.js, all entity create/update operations, procurement (PO creation/approval), AccessRequestQueue

## Context

OrbitanOS needed a governance framework that could:
1. Block or monitor sensitive actions (log deletion, finance threshold breaches, compliance violations)
2. Provide a "release valve" for legitimate exceptions (manager override with justification + evidence)
3. Operate in two modes: passive monitoring (notify) and active enforcement (block)
4. Be tenant-scoped and domain-aware (different industries have different governance rules)
5. Create an immutable audit trail for every governance decision

## Alternatives Considered

1. **Per-endpoint validation** (validation logic inside each backend function)
   - Rejected: Scattered, inconsistent, easy to forget on new endpoints
   - Rejected: No central policy registry — rules are invisible to admins

2. **Middleware-only approach** (a single middleware function that inspects all requests)
   - Rejected: Base44 backend functions don't support global middleware
   - Rejected: Can't distinguish between "read" and "write" at the middleware level without parsing the body

3. **Policy-as-Code interceptor** (centralised policy registry + interceptor function + client-side guard)
   - Selected: Policies are stored as entity records (`GovernancePolicy`) — admins can view/edit without code changes
   - Selected: `shieldInterceptor` backend function evaluates policies before sensitive writes
   - Selected: `ShieldGuard.js` client-side wrapper calls the interceptor and surfaces blocks to the UI
   - Selected: `GovernanceOverride` entity provides the release valve with mandatory manager justification

## Decision

Adopt a **Policy-as-Code Interceptor** model:

### Three Protection Domains
- **Domain A — Financial Integrity:** Governance thresholds, procurement spending, wallet transactions
- **Domain B — Access & Identity:** Role-based access, invitation limits, subscription limits
- **Domain C — Operational Trust:** Compliance gates, clock-in requirements, stock limits

### Policy Structure (`GovernancePolicy`)
- `domain_id`: Which protection domain (A/B/C)
- `target_entity`: Which entity this policy governs
- `trigger_action`: create / update / delete / all
- `condition_json`: Rule conditions (e.g. `{amount_gt: 500}`, `{role_not: 'admin'}`)
- `effect`: block (Guardian) / notify (Auditor) / auto_remediate
- `shield_mode`: auditor (Starter/Growth plans) / guardian (Enterprise only)
- `principle`: Which 6-R principle this enforces (regulate / refine / respond / renew / relate / reach)

### Execution Flow
```
Frontend action → ShieldGuard.check() → shieldInterceptor backend function
  → Evaluates GovernancePolicy records matching domain + entity
  → Returns: { allowed: true } or { allowed: false, reason, override_context }
  → If blocked: GovernanceOverrideModal surfaces to user
  → If override requested: GovernanceOverride record created (status: pending)
  → Manager reviews → approves/denies with mandatory notes + evidence
  → Approved override → original action proceeds → AuditLog captures outcome
```

### ShieldGuard.js (Client-Side Guard)
```javascript
const result = await ShieldGuard.check(base44, {
  entity_name: 'PurchaseOrder',
  action: 'create',
  data: { ...poData, total_amount: subtotal },
  tenant_id: tenantId,
});
if (!result.allowed) {
  setOverrideContext(result.override_context); // triggers GovernanceOverrideModal
  return;
}
// proceed with action
```

## Trade-offs

**Positive:**
- Centralised policy registry — admins see all rules, can toggle without code changes
- Two modes (Auditor/Guardian) enable plan-tiered governance (upsell to Enterprise for blocking mode)
- GovernanceOverride with mandatory justification + evidence = accountability
- Every outcome (pass/blocked/override) captured in AuditLog = complete audit trail
- Domain-aware: different industries can have different governance domains

**Negative:**
- Extra network call on every sensitive write (mitigated: only fires on create/update/delete, not reads)
- Client-side guard can be bypassed by direct SDK calls (mitigated: backend functions also call `shieldInterceptor` for server-side enforcement on critical paths like `walletEngine`)
- Policy complexity can grow — admins need clear tooling to create conditions safely

## Future Review Date

**2026-08-15** — Evaluate whether auto-remediation actions are needed for MVP (currently only block/notify are implemented). Assess whether Guardian mode should be available to Growth plan (currently Enterprise only).

---

**Related ADRs:** ADR-0001 (Registry-Driven Architecture), ADR-0002 (Wallet-Native Ledger)