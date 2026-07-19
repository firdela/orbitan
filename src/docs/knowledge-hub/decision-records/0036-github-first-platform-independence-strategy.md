# ADR-0036: GitHub-First Platform Independence Strategy

**Status:** Accepted
**Date:** 2026-07-19
**Principle:** Regulate (vendor lock-in prevention) + Renew (migration readiness)
**Supersedes:** —
**Related:** ADR-0023 (Orbit Core Adapter Pattern), ADR-0035 (GitHub Two-Way Code Synchronisation), ADR-0009 (Orbit Core Boundary), ADR-0010 (Independent Deployability)

---

## Context

Orbitan is currently developed on the Base44 platform to accelerate product
delivery toward the MVP pilot deadline (30 May 2026). While Base44 provides
powerful scaffolding — auth, database, hosting, and AI integrations — the
long-term vision requires that Orbitan **never becomes permanently dependent**
on any single vendor, cloud provider, or proprietary technology.

The Product Owner's directive establishes a non-negotiable principle:

> *Base44 is a powerful development accelerator — not the foundation upon
> which Orbitan depends. The long-term objective is to ensure that Orbitan
> can continue evolving, scaling, and being maintained by any competent
> development team using industry-standard tools and practices, without
> requiring Base44 to remain part of its future architecture.*

Two foundational capabilities are already in place:

1. **GitHub as Source of Truth (ADR-0035):** The `firdela/orbitan` private
   repository is connected via Base44's official two-way code synchronisation.
   All application code commits to GitHub automatically, establishing an
   external version-control backbone independent of Base44.

2. **Platform-Agnostic Data Layer (ADR-0023):** `src/lib/orbit-core.js`
   implements an adapter pattern that wraps the Base44 SDK behind a stable
   `OrbitCore` interface. New modules import from `@/lib/orbit-core` rather
   than `@/api/base44Client` directly, so a future backend swap requires
   changing only one file.

This ADR consolidates the two into a unified **GitHub-First Platform
Independence Strategy** and records the architectural, process, and
documentation commitments that protect Orbitan's long-term portability.

---

## Decision

Adopt a **GitHub-first, platform-independent development strategy** governed
by the following commitments:

### 1. GitHub as Authoritative Source of Truth

- The `firdela/orbitan` repository (private, `main` branch) is the canonical
  record of Orbitan's source code.
- All meaningful changes are committed with descriptive messages.
- Documentation (Markdown, ADRs, standards) evolves alongside code and is
  version-controlled in the same repository.
- Future developers can understand the project from the repository alone,
  without requiring Base44 knowledge.

### 2. Abstraction Layer Discipline (ADR-0023)

- **New code** imports from `@/lib/orbit-core`, never from
  `@/api/base44Client` directly.
- **Existing code** that already imports `base44` continues to work —
  migration is incremental (one module per sprint), never a big-bang refactor.
- The `OrbitCore` interface is the single seam where Base44 coupling lives.
  When the platform changes, only `orbit-core.js` changes.

### 3. Clean Architecture Separation

| Layer | Responsibility | Portability |
|-------|---------------|-------------|
| Presentation (UI) | React components, pages, layouts | Framework-agnostic (React → Vue/Next/Flutter swap) |
| Business Logic | Workflows, validation, domain rules | Fully portable — pure functions |
| Domain Models | Entity schemas, contracts | Portable — JSON schema is stack-neutral |
| Application Services | `OrbitCore` adapter, hooks, orchestrators | Single migration point |
| Data Access | `base44.entities.*` (behind `OrbitCore`) | Swappable for SQL/NoSQL/REST |
| Integrations | `OrbitCore.integrations.*` | Swappable for direct API calls |
| AI Services | `OrbitCore.integrations.invokeLLM` | Swappable for OpenAI/Anthropic/local |
| Infrastructure | Base44 hosting, auth, secrets | Replaceable with AWS/GCP/self-hosted |

### 4. Technology-Agnostic Design Rules

Before implementing any feature, the following must hold:

- **No hard-coded vendor assumptions** in business logic (e.g., no
  `base44` references outside `orbit-core.js` and backend functions).
- **No proprietary formats** for data interchange (use JSON, standard
  date formats, ISO currencies).
- **No vendor-specific auth** baked into components (use
  `OrbitCore.auth.*`, which abstracts the provider).
- **No direct database queries** in components (use `OrbitCore.data.*`).

### 5. Migration Readiness Contract

Orbitan must be migratable to any of the following stacks with minimal
architectural change:

- **Frontend:** React → Next.js, Vue, Angular, Flutter, native
- **Backend:** Deno → Node.js, Go, Java, .NET, Python, Rust
- **Database:** Base44 entities → PostgreSQL, MySQL, MongoDB, Supabase
- **Hosting:** Base44 → AWS, GCP, Azure, self-hosted, hybrid
- **Auth:** Base44 Auth → Auth0, Cognito, custom JWT, OIDC
- **AI:** Base44 InvokeLLM → OpenAI, Anthropic, local models

Migration primarily involves **replacing infrastructure components** in
`orbit-core.js` and backend functions — not redesigning the application.

---

## Verification Checklist

- [x] GitHub repository `firdela/orbitan` connected and syncing (ADR-0035).
- [x] `.gitignore` excludes secrets, `.env`, `node_modules`, `base44/.app.jsonc`.
- [x] `src/lib/orbit-core.js` implements the adapter pattern (ADR-0023).
- [x] `OrbitCore` interface covers auth, data, services, integrations, users, analytics.
- [x] No business logic depends on Base44-specific response shapes (standardised by `mapUser`, `OrbitError`).
- [x] New modules (Sprint 3+) import from `@/lib/orbit-core`.
- [x] Existing modules continue to work (additive, not destructive).
- [x] Documentation cross-references ADR-0023 and ADR-0035.

---

## Vendor Lock-in Prevention Protocol

Before implementing any new feature, evaluate:

1. **Does this introduce a new Base44 dependency?**
   - If yes → route it through `OrbitCore`. If `OrbitCore` doesn't support it,
     extend the adapter first, then use it.
2. **Does this use a proprietary format or API?**
   - If yes → wrap it in a standard interface. Document the exit strategy.
3. **Can this be replaced with an open standard?**
   - If yes → prefer the open standard (e.g., JWT over proprietary session,
     REST/GraphQL over SDK-specific calls).
4. **Is the dependency documented with an exit strategy?**
   - Every Base44-specific capability in `orbit-core.js` must have a comment
     describing how it would be replaced (see existing file comments).

---

## Known Dependencies on Base44 (and Exit Strategies)

| Capability | Base44 Dependency | Exit Strategy |
|-----------|-------------------|---------------|
| Entity CRUD | `base44.entities.*` | Swap for Prisma/Drizzle/Supabase client in `OrbitCore.data.*` |
| Authentication | `base44.auth.*` | Swap for Auth0/Cognito/custom JWT in `OrbitCore.auth.*` |
| Backend Functions | `base44.functions.invoke` | Swap for REST/GraphQL endpoints in `OrbitCore.services.invoke` |
| File Upload | `base44.integrations.Core.UploadFile` | Swap for S3/GCS direct upload in `OrbitCore.integrations.uploadFile` |
| LLM Invocation | `base44.integrations.Core.InvokeLLM` | Swap for OpenAI/Anthropic SDK in `OrbitCore.integrations.invokeLLM` |
| Email | `base44.integrations.Core.SendEmail` | Swap for Resend/SendGrid/SES in `OrbitCore.integrations.sendEmail` |
| Realtime | `base44.entities.*.subscribe` | Swap for WebSockets/SSE/Supabase realtime in `OrbitCore.data.subscribe` |
| Hosting | Base44 deploy | Export Vite build → deploy to Vercel/Netlify/AWS |
| Secrets | Base44 Secrets panel | Swap for AWS Secrets Manager/HashiCorp Vault |
| User Invites | `base44.users.inviteUser` | Swap for custom invite flow in `OrbitCore.users.inviteUser` |

---

## Development Workflow (Post-Strategy)

```
Developer vibes in Base44 editor
        │
        ├─ Save  → auto-commit to GitHub main (ADR-0035)
        ├─ Publish → deploy to production + commit to GitHub main
        │
GitHub main (external source of truth)
        │
        ├─ Direct commit / PR merge → sync back to Base44 editor
        │
        ├─ Future: GitHub Actions CI/CD (lint, test, security scan)
        │
        └─ Future: PR-based review when team grows
                │
                └─ All new code imports OrbitCore, not base44 (ADR-0023)
```

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| **Two import paths (base44 + OrbitCore) create inconsistency.** | Documented in ADR-0023 as intentional. Incremental migration per sprint. |
| **Backend functions (Deno) are Base44-specific.** | Functions are HTTP handlers — portable to any serverless runtime. Payload contracts are JSON. |
| **Entity schemas are Base44-specific (jsonc).** | Schemas are pure JSON Schema objects — portable to any database. The RLS rules are Base44-specific but documented for reimplementation. |
| **Realtime subscriptions use Base44's API.** | `OrbitCore.data.subscribe` abstracts it. Swap for WebSocket/SSE when migrating. |
| **Migration effort underestimated.** | Adapter limits blast radius to `orbit-core.js` + backend functions. UI/business logic untouched. |

---

## Long-Term Vision

Orbitan must remain a product that its owners fully control. By maintaining
GitHub as the source of truth and `OrbitCore` as the single abstraction seam,
the platform can:

1. **Continue vibe-coding in Base44** during the MVP phase for velocity.
2. **Migrate incrementally** post-MVP as the team and requirements grow.
3. **Survive a Base44 outage or deprecation** — the code is backed up on
   GitHub and the adapter is the only file that needs rewriting.
4. **Onboard future developers** who have never used Base44 — they read the
   repository, understand the architecture from ADRs, and work with
   `OrbitCore` as if it were any standard data layer.

---

## Future Review Date

**2026-09-30** — After MVP pilot validation, assess:
- Whether to begin incremental migration of existing modules to `OrbitCore`.
- Whether to introduce GitHub Actions CI/CD.
- Whether to evaluate alternative hosting for pilot tenants.

---

## Conclusion

The GitHub-first platform independence strategy is now fully operational:
the repository is connected, the adapter is implemented, and the
documentation is complete. Orbitan is building fast on Base44 while
architecting for the day it leaves Base44 — preserving velocity today
without sacrificing sovereignty tomorrow.