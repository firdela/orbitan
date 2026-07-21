# ADR-0042: Public Access Security & Intellectual Property Protection

**Date:** 2026-07-21
**Status:** Accepted
**Principle:** Regulate (access control) + Relate (public trust boundary)
**Impacted Modules:** All — Routing, Auth, RLS, Landing, Knowledge Hub, Client-Side Code

---

## Context

As OrbitanOS progresses toward its public MVP Pilot, the platform must enforce a hard architectural boundary between its **public-facing marketing surface** and its **authenticated operational core**. The public should interact with Orbitan exclusively through approved entry points (landing, pricing, pilot registration, waitlists, contact forms, public help centre). Everything else — internal workspaces, tenant environments, dashboards, APIs, databases, AI knowledge, documentation — must remain accessible only to authenticated, authorised users with appropriate roles and organisational membership.

This directive is a foundational security principle, not a feature. It must be enforced at every layer: routing, authentication, authorisation, tenant isolation (RLS), role-based access control, client-side code, and API surface.

---

## Decision

### 1. Public Surface Boundary

The public surface is limited to **approved entry points only**:

| Entry Point | Route | Auth Required |
|---|---|---|
| Landing / Marketing | `/` | No |
| Login | `/login` | No |
| Register | `/register` | No |
| Forgot / Reset Password | `/forgot-password`, `/reset-password` | No |
| Auth Gateway | `/auth/gateway` | No |
| Join (Invitation) | `/join` | No |
| Checkout (Stripe) | `/checkout`, `/checkout/success`, `/checkout/cancelled` | No |
| Request Access | `/request-access` | No |
| Onboarding (Self-Serve) | `/onboarding` | Yes (authenticated) |

All other routes are **authenticated** and gated by `ProtectedRoute` or `RoleGateway`.

### 2. Principle of Least Privilege

Every internal page, route, module, API endpoint, file, and service must enforce:
- **Authentication** — valid session required.
- **Authorisation** — role-based access control (admin, tenant_admin, outlet_manager, supervisor, worker, client_manager).
- **Tenant isolation** — Row-Level Security (RLS) on every tenant-scoped entity (ADR-0016).
- **Organisational membership** — users can only access resources within their assigned tenant.

### 3. Intellectual Property Protection

Orbitan's proprietary architecture, business logic, workflows, product strategies, AI capabilities, implementation details, and documentation must never be exposed through:
- **Public-facing pages** — no internal architecture, entity schemas, or ADRs on public routes.
- **Client-side code** — business logic lives in backend functions (Deno) or behind `OrbitCore` abstraction (ADR-0023); the frontend receives only rendered results, not raw proprietary logic.
- **APIs** — all internal API endpoints require authentication; no unauthenticated data endpoints expose internal entities.
- **Knowledge Hub** — `src/docs/` is internal documentation, version-controlled on GitHub (private repo, ADR-0038) but never served to the public.

**Acknowledged limitation:** No software can guarantee absolute protection against reverse engineering of client-side code. Orbitan implements industry best practices to minimise unnecessary exposure: business logic server-side, abstraction layers, no proprietary algorithms in frontend bundles.

### 4. Customer Communications Routing

All enquiries, support requests, bug reports, feature suggestions, partnership enquiries, and general feedback from public visitors are routed through Orbitan's **centralised Customer Communications & Support system** (ADR-0039). These communications are:
- Accessible only to authorised founders, administrators, leaders, and designated support personnel.
- Enforced by role-based permissions.
- Audit-logged for secure handling.

### 5. Routing Enforcement

`src/App.jsx` enforces the boundary:

```
Public Routes (no auth)         → Landing, Login, Register, ForgotPassword, ResetPassword,
                                   AuthGateway, JoinGateway, Checkout, RequestAccess
Authenticated Routes            → Wrapped in ProtectedRoute / RoleGateway / WorkspaceLayout
Wildcard (404)                  → PageNotFound (no internal content leaked)
```

`ProtectedRoute` (`src/components/ProtectedRoute.jsx`) redirects unauthenticated users to `/login`. All workspace routes are nested under it.

---

## Alternatives Considered

### Alternative A: Separate Public App vs Authenticated App
- **Pros:** Physical isolation; public app has zero access to internal code.
- **Cons:** Two deployments, two codebases, duplicated branding; operationally complex for MVP.
- **Rejected:** Premature for MVP. Route-level enforcement within a single app is sufficient and simpler.

### Alternative B: Single App with Route Guards (Chosen)
- **Pros:** Single codebase, single deployment, shared branding; `ProtectedRoute` + RLS enforce the boundary.
- **Cons:** Public bundle includes internal page code (lazy-loaded but still bundled).
- **Accepted:** Best balance for MVP. Lazy-loading + server-side business logic minimise exposure. Post-MVP, can split into public marketing site + authenticated app if needed.

---

## Verification Checklist

- [x] All internal routes gated by `ProtectedRoute` or `RoleGateway`.
- [x] Public routes limited to approved entry points (landing, auth, checkout, join, request-access).
- [x] RLS enforced on all tenant-scoped entities (ADR-0016).
- [x] Business logic in backend functions, not frontend bundles.
- [x] `OrbitCore` abstraction layer isolates Base44 SDK (ADR-0023).
- [x] Knowledge Hub (`src/docs/`) served internally only, not on public routes.
- [x] GitHub repository private (ADR-0038).
- [x] Customer communications routed through centralised system (ADR-0039).
- [ ] Periodic audit of client bundle for accidental proprietary logic exposure (post-MVP).

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| **Client-side reverse engineering** | Business logic server-side; frontend receives rendered results only. Acknowledged limitation. |
| **Accidental public route exposure** | Route table reviewed on every new page addition; `ProtectedRoute` default. |
| **RLS misconfiguration** | Every tenant-scoped entity has RLS (ADR-0016); service-role bypass is documented. |
| **Secret leakage to GitHub** | `.gitignore` + Base44 secrets vault (ADR-0038). |
| **Public API endpoint exposing internal data** | No unauthenticated entity endpoints; all backend functions check `base44.auth.me()`. |

---

## Cross-References

- [ADR-0016: RLS Tenant Isolation Standard](./0016-rls-tenant-isolation-standard.md) — Tenant isolation enforcement.
- [ADR-0023: Orbit Core Adapter Pattern](./0023-orbit-core-adapter-pattern.md) — Abstraction layer for platform independence.
- [ADR-0038: GitHub-First Platform Independence](./0038-github-first-platform-independence-engineering-standards.md) — Private repo governance.
- [ADR-0039: Customer Communications Governance Policy](./0039-customer-communications-governance-policy.md) — Centralised communications routing.
- [ADR-0003: Shield Governance Interceptor](./0003-shield-governance-interceptor.md) — Policy-as-code enforcement.
- `src/components/ProtectedRoute.jsx` — Route guard implementation.
- `src/App.jsx` — Route table.

---

**Directive Source:** Product Owner (Muhammad Firdaus Bin Ismail)
**Authored by:** Base44 (acting as Security Architect)
**Last Updated:** 2026-07-21