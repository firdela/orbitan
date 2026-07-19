# ADR-0038: GitHub-First Platform Independence & Engineering Standards

**Date:** 2026-07-19
**Status:** Accepted
**Impacted Modules:** All — Engineering Foundation, Knowledge Hub, Platform Architecture
**Supersedes:** ADR-0035 (GitHub Two-Way Code Sync), ADR-0036 (GitHub-First Platform Independence Strategy)

---

## Context

Orbitan is being developed using Base44 as the primary AI-assisted development environment. While Base44 accelerates product development significantly, relying on it as the sole repository for Orbitan's source code introduces **vendor lock-in risk** — the platform's intellectual property, engineering history, and future evolution must not be constrained by any single development tool.

On 2026-07-19, the Product Owner verified that Base44's official **Two-Way GitHub Code Synchronisation** is active and connected to the private repository `github.com/firdela/orbitan` (organisation: `firdela`, branch: `main`, visibility: private).

This ADR formalises the governance, standards, and architectural principles that treat GitHub as the **authoritative engineering foundation** for the entire Orbit ecosystem — with Base44 as a strategic accelerator, not a permanent dependency.

---

## Alternatives Considered

### Alternative A: Rely Solely on Base44 Internal Versioning
- **Pros:** No external setup required; commits are automatic.
- **Cons:** No external audit trail; no disaster recovery outside Base44; no collaboration with non-Base44 developers; full vendor lock-in; cannot demonstrate engineering history to investors, auditors, or enterprise customers.
- **Rejected:** Violates the Platform Independence Directive.

### Alternative B: Manual Export to GitHub (One-Way)
- **Pros:** Provides external backup.
- **Cons:** No two-way sync; manual export is error-prone and operationally unsustainable; GitHub cannot serve as a collaboration platform; merge workflows broken.
- **Rejected:** Does not meet the "source of truth" requirement.

### Alternative C: Two-Way GitHub Synchronisation (Chosen)
- **Pros:** Bidirectional code flow; GitHub serves as authoritative repository; Base44 remains the primary editing environment during MVP; full commit history preserved; future developers can work directly from GitHub; satisfies SOC 2 / ISO 27001 audit trail requirements; enables GitHub Actions, Issues, and PR workflows.
- **Cons:** Requires careful `.gitignore` governance to prevent secret leakage; sync is dependent on Base44 subscription tier.
- **Accepted:** Best balance of developer velocity, portability, and long-term ownership.

---

## Decision

### 1. GitHub as the Authoritative Engineering Repository

The repository `github.com/firdela/orbitan` is declared the **permanent, authoritative source-code repository** for the Orbit ecosystem. Base44 is the primary AI-assisted development environment during the MVP and Pilot phases.

### 2. Repository Configuration (Verified 2026-07-19)

| Property | Value |
|---|---|
| Organisation | `firdela` |
| Repository | `orbitan` |
| Visibility | Private |
| Default Branch | `main` |
| Sync Mode | Two-Way (Base44 ↔ GitHub) |
| Connection Status | Connected (verified via UI) |

### 3. Distinguished: Code Sync vs. GitHub Connector

| Capability | Type | Purpose |
|---|---|---|
| GitHub Code Synchronisation | Platform Feature | Bidirectional sync of Orbitan source code between Base44 editor and GitHub repository. **This is active.** |
| GitHub Connector | OAuth Integration | Programmatic access to GitHub Issues, PRs, Actions for backend functions. **Not the same as code sync.** |

The Product Owner must not confuse these two capabilities. Connecting a GitHub account for the Connector does not enable code synchronisation.

### 4. Synchronisation Standards

- All application code and supported project files created or modified in Base44 are automatically committed to GitHub.
- Commit history is preserved automatically by the sync engine.
- The GitHub repository functions as:
  - Authoritative source-code repository
  - Version-control history
  - Collaboration platform
  - Engineering audit trail
  - Disaster recovery backup
  - Future migration foundation

### 5. Security & Repository Governance

The following must **never** be committed to GitHub:

- API keys, authentication credentials, secrets
- Environment variables (`.env`, `.env.local`)
- Production configuration files
- Tenant information or customer data
- Personally identifiable information (PII)
- Production database dumps
- Confidential internal documentation marked "Base44-only"

The `.gitignore` file (already present at repository root) must enforce these exclusions. Any new secret-bearing file must be added to `.gitignore` before creation.

### 6. Platform Independence Principles

OrbitanOS must remain architecturally independent of Base44. This is enforced through:

| Principle | Implementation |
|---|---|
| Clean Architecture | Logical layer separation: Presentation, UX, Business Logic, Domain Models, Application Services, APIs, Data Access, Integrations, AI Services, Infrastructure. |
| Technology-Agnostic Engineering | No tight coupling to specific frameworks, databases, cloud providers, or AI providers. |
| Exit-Ready Entities | All entity schemas are pure JSON — portable to PostgreSQL, MongoDB, or any document store without redesign. |
| Exit-Ready Functions | Backend functions use standard Deno/TypeScript — portable to any serverless or Node.js runtime. |
| Abstraction Layers | Base44-specific SDK calls (`base44.entities.*`, `base44.integrations.*`) are isolated behind service modules in `src/lib/` to enable future replacement. |
| Migration Readiness | Migration primarily involves infrastructure replacement, not architectural redesign. |

### 7. Branch & Commit Strategy (MVP Phase)

During the MVP and Pilot phases, we adopt a **trunk-based development** model:

- **`main`** — Production-ready trunk. All Base44 editor commits flow here automatically.
- **Commit messages** — Descriptive, atomic, referencing the feature or ADR where applicable.
- **Pull Requests** — Not required during solo MVP development. Will be introduced when a second developer joins.
- **Releases** — Tagged at major milestones (e.g., `v0.1.0-pilot`, `v1.0.0-public`).

Post-MVP, this will evolve to a feature-branch + PR review model.

### 8. Developer Experience Standards

The repository must be comprehensible to any future developer with **no prior Base44 knowledge**. This is enforced through:

- `README.md` at repository root (to be authored as a separate task)
- `src/docs/knowledge-hub/` — Living Knowledge Hub (this directory)
- `src/docs/knowledge/` — User guides, FAQs, architecture references
- ADRs — Decision records explaining *why* decisions were made
- Inline code documentation — JSDoc comments on exported functions
- `src/docs/migration-guide.md` — Future migration playbook (to be authored)

---

## Trade-offs

### Positive
- **Ownership:** Orbitan's source code is permanently owned and controlled by the founders, independent of Base44.
- **Audit Trail:** Full commit history available for SOC 2 / ISO 27001 compliance evidence.
- **Disaster Recovery:** GitHub serves as an external backup; Base44 outage does not destroy the codebase.
- **Future Migration:** Any future technology stack (Next.js, Node.js, Go, etc.) can be adopted by migrating from GitHub — not by rebuilding architecture.
- **Collaboration:** Future developers can clone the repo and work with standard tools.

### Negative
- **Subscription Dependency:** Two-way sync requires an active Base44 subscription tier that supports it.
- **Secret Risk:** Automated sync increases the risk of accidentally committing secrets if `.gitignore` is not maintained.
- **Sync Latency:** There may be a small delay between Base44 writes and GitHub propagation.

### Mitigations
- Secrets are stored in Base44's secrets vault (never in code).
- `.gitignore` is reviewed whenever a new tool or config file is added.
- Sync is verified periodically using the validation protocol defined below.

---

## Safe Synchronisation Validation Protocol

Whenever configuration changes or integration updates are performed, the following protocol validates sync safely:

1. **Create** a temporary, non-destructive file (e.g., `src/docs/SYNC_TEST.md`).
2. **Verify** the file appears in the GitHub repository within a reasonable time window.
3. **Delete** the temporary file after verification.
4. **Never** modify production data or operational workflows for sync testing.

This protocol was executed on 2026-07-19 and is documented in this ADR.

---

## Future Review Date

- **Post-MVP (after 30 July 2026):** Evaluate introduction of feature branches and PR review workflow.
- **Public Launch:** Evaluate GitHub Actions for automated quality checks, linting, and deployment pipelines.
- **Second Developer Onboarding:** Evaluate migration from trunk-based to feature-branch + PR model.

---

## Cross-References

- [ADR-0035: GitHub Two-Way Code Sync](./0035-github-two-way-code-sync.md) — Original sync decision (superseded by this ADR's expanded scope).
- [ADR-0036: GitHub-First Platform Independence Strategy](./0036-github-first-platform-independence-strategy.md) — Original platform independence strategy (superseded by this ADR's formalised standards).
- [ADR-0001: Registry-Driven Architecture](./0001-registry-driven-architecture.md) — Foundation for exit-ready, portable architecture.
- [ADR-0010: Independent Deployability](./0010-independent-deployability.md) — Independent deployability principle.
- `src/docs/knowledge-hub/master-vision.md` — Platform independence and vendor lock-in prevention.

---

**Product Owner:** Muhammad Firdaus Bin Ismail
**Authored by:** Base44 (acting as Strategic Architect)
**Last Updated:** 2026-07-19