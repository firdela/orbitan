# ODR-0020: Orbit ID — Identity, Access & AI Governance

**Date:** 2026-07-12
**Status:** Accepted
**Product Owner:** Muhammad Firdaus Bin Ismail
**Impacted Modules:** Employee, Invitation, AccessRequest, ModuleAccessPolicy, AuditLog, GovernancePolicy, GovernanceOverride, Orbit Nexus (AI Agent Governance), all future Orbit products

---

## Decision

Expand **Orbit ID** beyond basic RBAC to become the unified identity, access, and AI governance platform for the entire Orbit ecosystem. Orbit ID governs human identities, machine identities, and AI agent identities with consistent governance, auditing, and least-privilege principles.

## Context

As the Orbit ecosystem grows to include Agentic AI (Orbit Nexus) and future products (AquaOrbit, ChefOrbit), identity management must extend beyond human users. Every AI agent, API key, connector, and integration is an identity that needs permissions, ownership, lifecycle management, and an audit trail.

Additionally, OrbitanOS differentiates from traditional identity platforms (Veza, ServiceNow) through **Business Access Intelligence** — linking identity, permissions, business workflows, and AI decisions into a single auditable trail.

## Core Capabilities

### 1. Identity Graph

A unified identity model mapping every actor in the system:

| Identity Type | Examples | Governance |
|---------------|----------|------------|
| **Human** | Employees, Managers, Founders, Admins | RBAC + RLS (tenant/outlet scoped) |
| **Machine** | API Keys, Connectors, Webhooks, MCP Servers | Service accounts with scoped permissions |
| **AI Agent** | Orbit Nexus AI Agents (inventory, procurement, finance) | Agent-specific permission policies + human approval gates |

The identity graph visualises: who/what has access to which resources, modules, data, and workflows.

### 2. Access Governance

- **RBAC (Today):** Role-based access control with 6 roles (admin, tenant_admin, client_manager, outlet_manager, supervisor, worker)
- **ABAC (Future):** Attribute-based access control for fine-grained, policy-based permissions
- **Least-Privilege:** Default deny; permissions are explicitly granted
- **Separation of Duties (SoD):** Ready — roles can be structured to prevent conflicts of interest
- **Just-In-Time (JIT) Access (Future):** Temporary, time-bound access for specific tasks
- **Multi-Tenant Isolation:** Every identity is bound to a `tenant_id`; RLS enforces isolation

### 3. AI Agent Governance

Every Orbit Nexus AI Agent has:
- Its own identity (agent slug + tenant binding)
- Permission policy defining what it can read, create, update, approve, or execute
- Trust level: `low` (approval for all writes), `medium` (autonomous within budget gates), `high` (enterprise only)
- Required governance gates: actions that cannot be taken without human approval
- Complete decision history and execution logs in AuditLog

**Binding:** `ActivationRegistry.ai_governance` defines which agents are enabled per industry pack and their trust boundaries.

### 4. Access Reviews & Certifications (Future)

- Automate periodic access reviews for compliance
- AI-assisted access certification campaigns
- Recommend permission changes based on usage patterns (Orbit Evolution integration)
- Detect excessive, unused, conflicting, or high-risk permissions

### 5. Risk Intelligence (Future)

- Dynamic risk scores for identities, permissions, AI agents, and integrations
- Anomaly detection: unusual access patterns, off-hours activity, privilege escalation
- Security alerts to administrators
- Suspicious access detection

### 6. Business Access Intelligence (Orbit Differentiator)

Unlike traditional identity platforms that only answer "who has access to this system?", Orbit ID also answers:

- Who approved this purchase order?
- Which AI agent reordered inventory?
- Who changed this recipe?
- Who accessed financial reports?
- Which outlet manager approved overtime?
- Why did the AI recommend this procurement action?

This is achieved by linking `AuditLog` records to the identity, permission, business workflow, and AI decision that triggered them. The `AuditLog` entity already captures: `actor_id`, `actor_role`, `action_type`, `target_entity`, `shield_outcome`, `override_id`, `justification`, `policy_name`, and `evidence_urls`.

## Existing Infrastructure

| Component | Status | Purpose |
|-----------|--------|---------|
| `Employee` entity | ✅ Active | Human identity with role, tenant, outlet binding |
| `Invitation` entity | ✅ Active | Governed worker onboarding pipeline |
| `AccessRequest` entity | ✅ Active | Worker access request registry |
| `ModuleAccessPolicy` entity | ✅ Active | Per-tenant, per-role, per-module access matrix |
| `AuditLog` entity | ✅ Active | Immutable audit trail with shield_outcome, override_id, justification |
| `GovernancePolicy` entity | ✅ Active | Shield policy-as-code registry |
| `GovernanceOverride` entity | ✅ Active | Override release valve with approval workflow |
| `ActivationRegistry.ai_governance` | ✅ Active | Per-industry AI agent enablement + trust boundaries |
| `IntegrationCredential` entity | ✅ Active | Per-tenant OAuth credential vault (machine identity) |
| RLS on all entities | ✅ Active | Tenant + outlet isolation enforced at database level |

## MVP Scope

For the MVP pilot, Orbit ID operates with:
- Human identity management (Employee + Invitation + AccessRequest)
- RBAC with ModuleAccessPolicy per-tenant configuration
- AuditLog capturing every high-value action with shield_outcome
- AI governance via ActivationRegistry.ai_governance binding (proactive_approval mode)
- Business Access Intelligence via AuditLog query capabilities

Post-MVP: ABAC, JIT access, access review campaigns, risk intelligence, AI agent self-service permission management.

## Security Posture

- **MFA readiness:** Platform auth supports MFA (via Base44 auth backend)
- **SSO readiness:** Google OAuth implemented; additional providers (Microsoft, Apple) available
- **Session management:** Platform-managed tokens with automatic refresh
- **Encryption:** In transit (HTTPS) and at rest (platform-managed)
- **Audit completeness:** Every create/update/delete on governed entities is logged

## Trade-offs

| Aspect | Impact |
|--------|--------|
| **Compliance readiness** | **Positive** — SOC 2 / ISO 27001 audit requirements are structurally satisfied |
| **Enterprise credibility** | **Positive** — AI Agent Governance is a forward-looking differentiator |
| **Complexity** | **Neutral** — MVP uses existing entities; ABAC/risk intelligence deferred |
| **Auditability** | **Positive** — Business Access Intelligence links identity to business outcomes |

## Future Review Date

**2026-12-01** — Evaluate ABAC implementation, access review automation, and risk intelligence scoring model.

---

**Related ADRs:** ADR-0003 (Shield Governance Interceptor), ADR-0009 (Orbit Core Boundary), ADR-0016 (RLS Tenant Isolation), ADR-0019 (Orbit Evolution)