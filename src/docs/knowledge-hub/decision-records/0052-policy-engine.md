# ADR-0052: Policy Engine — Business Logic Externalisation

**Status:** Accepted  
**Date:** 2026-07-22  
**Supersedes:** None  
**Related:** ADR-0001 (Registry-Driven Architecture), ADR-0003 (Shield Governance Interceptor), ADR-0029 (Autonomous Governance Thresholds for Agentic AI), ADR-0032 (Polymorphic Action Automation Engine)

---

## Context

OrbitanOS is converging toward its MVP pilot launch. As vertical workflows are built (Procurement, Inventory, Workforce Operations), a recurring anti-pattern has been identified: **business rules are being embedded directly into components and backend functions**.

Examples observed:
- Procurement governance thresholds hardcoded in `ShieldGuard.js`.
- Attendance grace periods, late thresholds, and overtime rules embedded in `clockController/entry.ts`.
- Leave accrual rates, break rules, and approval matrices at risk of being hardcoded as they are built.

This creates three long-term problems:

1. **Industry rigidity.** F&B pilot tenants (La Birria), recycling tenants (Renewed Resources), retail tenants (Renewed Fashion), and HBB tenants (Izaliqa Bakes) all have different operational policies. Hardcoded rules force either (a) code forks per tenant or (b) a single compromise policy that fits no one.

2. **Maintenance debt.** When a policy changes (e.g., Singapore MOM updates overtime rules), the engineering team must locate and modify business logic buried inside functional code, test it, and redeploy. This is slow, error-prone, and breaks the audit trail.

3. **Agentic AI incompatibility.** The Orbit Nexus intelligence layer and autonomous agents (ADR-0029) cannot reason about policies they cannot read. If rules are implicit in code, the intelligence layer is blind to them. If rules are explicit data, agents can interpret, evaluate, and even recommend policy adjustments.

---

## Decision

Introduce a **Policy Engine** pattern as a first-class architectural citizen:

```text
Business Logic (the rule)
        ↓
Policy Engine (evaluates the rule against an event)
        ↓
Workflows (execute the outcome)
```

Every operational domain — Attendance, Leave, Procurement, Inventory, Approvals, Training, Certification — must **read policies from a policy registry** rather than embedding business rules into components or backend functions.

### Architecture

```text
┌─────────────────────────────────────────────────┐
│  Policy Registry (data, not code)               │
│  ─────────────────────────────────────────────  │
│  { policy_key, domain, rules, effect, version } │
└──────────────────┬──────────────────────────────┘
                   │ reads
                   ▼
┌─────────────────────────────────────────────────┐
│  Policy Engine (pure evaluation function)       │
│  ─────────────────────────────────────────────  │
│  evaluate(policy, event) → { outcomes[] }       │
└──────────────────┬──────────────────────────────┘
                   │ emits outcomes
                   ▼
┌─────────────────────────────────────────────────┐
│  Workflow Layer (components + backend functions) │
│  ─────────────────────────────────────────────  │
│  Consumes outcomes, persists records, audits    │
└─────────────────────────────────────────────────┘
```

### Implementation Phases

**Phase 1 (MVP — Now):** Ship with **Orbitan Default Policy** — a versioned, exported configuration object per domain (e.g., `ORBITAN_DEFAULT_ATTENDANCE_POLICY`). The Policy Engine is a pure function (`evaluateClockRecord(record, policy)`) that returns outcomes. Components and backend functions call the engine, never read raw thresholds.

**Phase 2 (Growth):** Persist per-tenant policy overrides in a `TenantPolicyOverride` entity. The engine resolves `(tenant_id, policy_key)` with fallback to the system default. Tenant admins configure policies via a UI without engineering involvement.

**Phase 3 (Enterprise):** Bind policies to the Shield Governance Interceptor (ADR-0003). Policies become governance-gated — changes require approval, are audit-logged, and can trigger Shadow Audit Mode (ADR-0029) for safe threshold calibration.

### Design Rules

1. **Policies are data, not code.** A policy is a serialisable object (`{ grace_period_mins: 5, late_threshold_mins: 10 }`), not a function with embedded constants.

2. **The engine is pure.** `evaluate(policy, event)` returns outcomes with no side effects. Side effects (creating exception records, sending notifications) are the workflow layer's responsibility.

3. **Components never read thresholds.** A component calls `evaluateClockRecord(record, policy)` and acts on the outcomes. It never reads `policy.late_threshold_mins` directly.

4. **Backend functions delegate.** `clockController` calls the policy engine module (from `base44/shared/`) rather than hardcoding `8` as the overtime threshold.

5. **Versioning is mandatory.** Every policy object carries a `version` field. When a policy changes, the version bumps. Historical records reference the policy version under which they were evaluated — preserving audit traceability.

6. **Graceful degradation.** If no policy is found for a tenant, the Orbitan Default Policy is used. The system never fails because a policy is missing.

---

## Consequences

**Positive:**
- **Industry extensibility.** Adding a new industry pack = ship a new default policy, not a code fork.
- **Tenant configurability.** Phase 2 unlocks self-serve policy configuration for tenant admins.
- **Agentic AI readiness.** The intelligence layer can read, evaluate, and recommend policy adjustments because policies are data.
- **Audit traceability.** Policy versions are recorded alongside evaluated outcomes.
- **Testability.** The pure evaluation function is trivially unit-testable without database or UI.

**Negative:**
- **Indirection.** Developers must learn the policy engine pattern instead of hardcoding a constant. This is a one-time learning cost.
- **Phase 1 limitations.** The MVP default policy is a shared module, not yet a per-tenant database record. This is acceptable for pilot tenants but must reach Phase 2 before public launch.

**Risks:**
- **Policy sprawl.** Without governance, the registry could accumulate dozens of overlapping policies. Mitigated by domain-keyed namespacing and Phase 3 Shield governance binding.
- **Engine complexity.** As policies grow, the evaluation function could become complex. Mitigated by keeping the engine pure and domain-scoped (one evaluator per domain, not a universal rule engine).

---

## First Application

**Attendance Policy (this milestone):**
- `src/lib/policies/attendancePolicy.js` exports `ORBITAN_DEFAULT_ATTENDANCE_POLICY` and `evaluateClockRecord(record, policy)`.
- `WorkerPortal.jsx` calls the engine after clock-out to detect exceptions.
- `clockController/entry.ts` will be refactored to import the shared policy module in a subsequent pass (currently the thresholds are embedded; this is logged as technical debt).

**Future domains:**
- Leave Policy (accrual rates, carry-forward, notice periods)
- Procurement Policy (approval thresholds, vendor gating) — partially already in Shield
- Inventory Policy (reorder thresholds, wastage limits)
- Training Policy (certification expiry, mandatory modules)