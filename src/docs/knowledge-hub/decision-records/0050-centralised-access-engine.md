# ADR-0050: Centralised Contextual Access Engine

**Status:** Accepted (Architecture Version 1.0 — Frozen)
**Date:** 2026-07-22
**Deciders:** Founder (Firdela Holdings), Base44 Architecture
**Supersedes:** Scattered `user.role` checks, ad-hoc `ShieldGuard` gating
**Related:** ADR-0051 (Permission Packs & Hierarchical Inheritance), ADR-0052 (Open Integration Framework), ADR-0048 (Orbit Identity Model), ADR-0049 (Explicit Tenant Context for Platform Admins)

---

## 1. Purpose

Establish a single, authoritative **Access Engine** as the mandatory authorization authority for the entire Orbit ecosystem — frontend, backend, APIs, AI, integrations, service accounts, and scheduled jobs. Authorization logic must never be scattered across modules.

The engine enforces a **Platform Identity + Tenant Membership** model: *what an identity may do* (authorization) is evaluated jointly with *where the identity is currently operating* (context/workspace).

## 2. Design Principles

1. **Fail-closed (Default-Deny).** Unless explicitly permitted, every action is denied.
2. **Context-Aware.** Authorization = f(Identity, Membership, Workspace). A role alone never determines visible data; the active workspace scopes the operational data.
3. **Hierarchical.** Permissions inherit downwards through Org → Business Unit → Brand → Outlet → Department, but never cross tenant boundaries.
4. **Immutable Audit.** Every decision (allow or deny) produces a standard `DecisionObject` and is written to `AuditLog`.
5. **Policy-Driven.** Business rules live in a pluggable `PolicyEngine`; permissions live in `Permission Packs`; neither is hardcoded in modules.
6. **Integration-First.** The same engine governs humans, AI agents, service accounts, and third-party connectors.

## 3. Evaluation Pipeline

```
Request (Identity + Context + Action)
  ↓  Identity Resolution        (validate authenticated / service identity)
  ↓  Context Resolution         (validate membership + workspace)
  ↓  Membership Status           (active / suspended / revoked → deny)
  ↓  Permission Resolution      (load Permission Packs for the role(s))
  ↓  Hierarchical Precedence    (explicit deny > allow > inherited > role default)
  ↓  Subscription Entitlement   (plan gates modules/capabilities)
  ↓  Feature Flag Check         (dynamic enable/disable)
  ↓  Policy Engine              (business rules; can hard-block)
  ↓  Platform-Owner Context Rule (allow within selected tenant, not a blind bypass)
  ↓  Final Decision             (DecisionObject)
  ↓  Audit Logging              (immutable record)
  ↓  Response → Consumer
```

## 4. Request Lifecycle

A `Request` carries: `identity`, `workspace` (tenant/outlet context), `resource` (type, id, tenant_id, outlet_id, owner_id), `action` (capability key, e.g. `inventory.read`), optional `membership`, `permissions`, `subscription`, `featureFlags`, `request_id`, and `is_platform_op` flag for platform-administration operations.

## 5. Decision Lifecycle

The engine returns a frozen `DecisionObject` (schema `orbitan/access-decision/v1`, version `1.0.0`) containing: `decision` (`ALLOWED`/`DENIED`), `denial_reason`, `request_id`, `evaluated_at`, `audit_log_id`, and `metadata` (identity, membership, workspace, resource, action, matched_permissions, evaluated_policies, subscription, feature_flags).

## 6. Authorization vs Context

- **Authorization** = the identity's platform role + membership-level permission packs.
- **Context** = the currently selected workspace (Tenant/Org/Brand/Outlet/Dept).
- Data access is always scoped to context. Platform Owner may *select* any tenant, but operations are scoped to the selected tenant.

## 7. Default-Deny Cases

Unauthenticated; no membership; membership suspended/expired/revoked; missing workspace context for a tenant operation; action not covered by any permission pack; subscription restriction; disabled feature flag; policy hard-block; evaluation error.

## 8. Permission Precedence

1. Explicit Deny (any level) — highest
2. Explicit Allow (most specific scope)
3. Inherited Allow (ancestor scope)
4. Role Default Allow (permission pack)
5. Subscription Entitlement
6. Feature Flag
7. Default Deny — lowest

Permissions never cross tenant boundaries. A permission scoped to Tenant A cannot grant access to a resource in Tenant B.

## 9. Membership Status Handling

Only `active` (and `invited`/`pending` during onboarding) memberships grant access. `suspended`, `expired`, or `revoked` memberships deny immediately, regardless of other permissions.

## 10. Platform Owner Handling

The Platform Owner (`coffeeteabreak12@gmail.com`, bootstrap) holds platform-wide authority **but is not an unrestricted bypass**. There is no `if (platformOwner) return ALLOWED` shortcut. Platform authority:
- Grants access to *any* tenant — but only within an **explicitly selected** tenant workspace.
- Platform-level operations (Tenant Management, Billing, etc.) use `is_platform_op` and do not require a tenant workspace.
- Every action passes through structured evaluation and produces a full audit record.
- This bootstrap is isolated, documented, and designed to evolve into a configurable platform-level entitlement.

## 11. Tenant and Outlet Boundary Rules

- A user cannot access data outside their membership scope.
- Outlet-scoped permissions do not cover a different outlet (even same tenant).
- Cross-tenant permissions are rejected by the precedence resolver (`permission_out_of_scope`).

## 12. Backend Enforcement

Authorization is enforced server-side. The `shieldInterceptor` wraps backend function entry points. RLS remains a defense-in-depth layer, not the primary enforcement. Hidden UI is never considered security.

## 13. Audit Failure Behaviour

Every decision is logged to `AuditLog` with the full `DecisionObject` metadata, including identity, context, resource, action, matched permissions, evaluated policies, subscription status, and denial reason. Audit write failure never alters the authorization outcome (fire-and-forget).

## 14. Cache Invalidation Rules

Permission/decision caches are keyed by `tenantId`, `userId`, and `permissionSet`. Invalidation triggers: membership change (role update, suspension, revocation), permission pack update, subscription plan change, and explicit cache-clear events.

## 15. Direct URL and API Protection

All direct API calls and URL accesses are intercepted and validated by the Access Engine before resource access. UI hiding does not protect a resource.

## 16. Rollback and Compatibility Strategy

- **Compatibility Layer:** During migration, the engine's pluggable resolvers read from the existing `Employee` entity (M2), with the engine's decision taking precedence over legacy checks.
- **Non-Destructive Migration:** Modules migrate one at a time (pilot: Procurement). Existing functionality is preserved until fully covered.
- **Reconciliation Reporting:** Automated regression tests compare engine decisions against legacy expectations during migration.
- **Rollback:** Each milestone is independently reversible; the engine runs alongside legacy checks until a milestone is validated.

## 17. Enforcement Boundary

The Access Engine is the **sole** enforcement point for: frontend navigation/controls, backend functions, mutations, RLS, exports, file access, API endpoints, integrations, webhooks, service accounts, Orbit Nexus tool calls, and scheduled jobs.

## 18. AI Governance

AI agents (Orbit Nexus) operate under `ServiceAccounts` with a delegated identity. An agent inherits the requesting user's membership scope and **cannot exceed the user's authority**. Every AI tool call is authorized by the Access Engine and audited as an `AI_ACTION`.

## 19. Security Considerations

- Security takes precedence over convenience and performance.
- No hardcoded tenant IDs, role names, or outlet IDs in modules (bootstrap platform owner is isolated and documented).
- Fail-closed on resolver errors and policy evaluation errors.

## 20. Extensibility Strategy

- Pluggable resolvers (identity/context/membership/permission/subscription/featureFlag/auditSink).
- Registry-driven `PolicyEngine` — industry packs register their own policies.
- `Permission Packs` are versioned; new capabilities register without core changes.
- The pipeline supports adding hierarchy levels (Region/Country/Business Unit) without redesign.

## 21. Consequences

- Positive: single source of truth, auditable, tenant-safe, integration-ready, future-proof.
- Negative: every consumer must route through the engine; migration effort per module.
- Mitigation: phased pilot (Procurement first), compatibility layer, regression tests.