# ADR-0035: GitHub Two-Way Code Synchronisation

**Status:** Accepted
**Date:** 2026-07-19
**Principle:** Regulate (version control governance) + Refine (reuse existing platform capability)
**Supersedes:** —
**Related:** ADR-0001 (Registry-Driven Architecture), ADR-0025 (Artifact Registry)

---

## Context

Orbitan's source code, architecture, workflows, and business logic represent
the **foundational intellectual property** of the Orbit ecosystem. Until now,
the codebase has lived exclusively inside the Base44 platform — a managed
environment that does not expose a standard Git history, branching model, or
external collaboration surface.

As Orbitan approaches MVP production readiness (North Star: 30 May 2026), the
absence of external version control creates several risks:

1. **No external backup.** A platform-level incident could compromise the
   only copy of the codebase.
2. **No collaboration surface.** Future engineers, contractors, or AI agents
   cannot review diffs, open pull requests, or branch safely.
3. **No audit trail.** SOC 2 / ISO 27001 evidence requires a tamper-evident
   commit history with authorship attribution — something Base44's internal
   version history alone does not fully satisfy.
4. **No CI/CD foundation.** Future automated testing, linting, and security
   scanning pipelines require a Git repository as their trigger source.

Base44 provides a **GitHub two-way synchronisation** capability that keeps the
Base44 app code and a connected GitHub repository in lockstep. This is
distinct from the **GitHub Connector** (integration_type: `github`), which is
an in-app data integration for reading repositories, issues, and pull requests
from within the running application.

---

## Decision

Adopt **Base44's official GitHub two-way code synchronisation** as Orbitan's
external source-control backbone, configured under the following
non-negotiable parameters:

### Repository Configuration

| Parameter            | Value                              | Rationale                                                          |
|---------------------|------------------------------------|-------------------------------------------------------------------|
| Repository name      | `orbitan` (or `orbitan-platform`)  | Clear, professional, brand-aligned.                              |
| Visibility           | **Private**                       | Orbitan contains proprietary architecture, workflows, and logic. |
| Primary branch       | `main`                            | Required by Base44 sync — `master` or custom names are unsupported. |
| Owner                | Product Owner's GitHub account     | Single-owner accountability until holding-company structure is finalised. |
| `.gitignore` scope   | `.env`, `.env.*`, `*.local`, `node_modules`, `dist`, `.vite`, `base44/.app.jsonc` | Already configured — prevents secret/credential leakage. |

### Synchronisation Behaviour

1. **Base44 → GitHub (automatic):** Every save/publish action in the Base44
   app editor commits to the `main` branch of the connected repository.
2. **GitHub → Base44 (automatic on merge):** Any commit merged to `main` on
   GitHub is pulled back into Base44 and reflected in the app editor. A
   subsequent **Publish** action in Base44 deploys the change to users.

### Branch Strategy (Initial)

During the MVP pilot phase, Orbitan uses a **single-branch (`main`) trunk-based
model**. This is the simplest workflow Base44 supports and avoids premature
process overhead while the team is small.

When the team grows or CI/CD is introduced, the strategy will evolve to:
- `main` — production-ready, always deployable.
- `feature/*` — short-lived branches for non-trivial changes, merged via PR.

---

## Verification Checklist (Pre-Connection)

Before completing the irreversible connection, the following must be confirmed:

- [x] `.gitignore` excludes `.env`, `.env.local`, `*.local` (verified — lines 1–3, 30).
- [x] `.gitignore` excludes `node_modules`, `dist`, `.vite` (verified — lines 14–15, 31).
- [x] `.gitignore` excludes `base44/.app.jsonc` (verified — line 32).
- [x] Product Owner confirms they are the **app owner** in Base44 (required for initial connection).
- [x] Product Owner's Base44 subscription supports GitHub sync (connection succeeded).
- [x] GitHub account `firdela` is the connected owner — repository `orbitan` created and synced.

---

## Manual Configuration Steps (Platform UI)

> **These steps must be performed by the Product Owner in the Base44 app editor.
> They cannot be executed programmatically.**

1. Open the **Orbitan app editor** in Base44.
2. Click the **GitHub icon** (top-right of the editor toolbar).
3. Click **Connect to GitHub** → **Connect GitHub**.
4. Click **Authorize Base44 Builder** (grants the platform scoped access).
5. Select the **correct GitHub account/organization** and approve repository
   access.
6. Click **Install**.
7. Create a new repository:
   - Account/Organization: the Product Owner's dedicated GitHub account.
   - Repository name: `orbitan`.
   - Visibility: **Private**.
   - Primary branch: `main` (Base44 enforces this).
8. Confirm the initial sync completes (all files appear in GitHub).

---

## Post-Connection Validation

After the connection is live, validate both directions safely:

1. **Base44 → GitHub:** Make a small, harmless change (e.g., a comment in
   `src/index.css`) in Base44. Confirm the commit appears on GitHub `main`.
2. **GitHub → Base44:** Make a controlled change (e.g., a README typo fix) via
   a GitHub commit to `main`. Confirm it appears in the Base44 app editor.
3. **Cleanup:** Revert the test comment in `src/index.css` and the README typo.
4. **Publish:** Click Publish in Base44 to confirm the production app is
   unchanged and healthy.

---

## Risks & Permanent Consequences

| Risk | Mitigation |
|------|-----------|
| **GitHub sync is permanent.** Once connected, you cannot revert to Base44-only version history. | This ADR documents the decision. The connection can be disconnected from a *specific repo* but Base44 won't restore pre-sync version history. |
| **Version History changes.** Base44 Version History will only show GitHub-tracked versions — pre-sync versions become inaccessible. | Acceptable: the initial sync captures the full current codebase as the baseline. |
| **Secret leakage.** If `.gitignore` were misconfigured, secrets could commit to GitHub. | `.gitignore` verified (see checklist). Additionally, `base44/.app.jsonc` (which may contain app-level config) is excluded. |
| **Tenant data exposure.** Entity data lives in Base44's database, not in the repo — so no tenant records sync to GitHub. | By design: only source code and configuration files sync. |
| **Accidental `main` pushes.** Direct commits to `main` bypass review. | Acceptable during MVP single-founder phase. Will enforce PR-based flow when team grows. |

---

## Known Limitations of Base44–GitHub Integration

1. **Branch name is fixed to `main`.** No custom default branch.
2. **Only the app owner** can perform the initial connection. Subsequent
   reconnections require the owner or the original connector.
3. **No selective sync.** All supported application files sync; you cannot
   exclude individual source files (only via `.gitignore` patterns).
4. **Publish is still manual.** GitHub→Base44 sync updates the editor, but
   production deployment requires an explicit **Publish** click.

---

## Access Controls

- **Repository admin:** Product Owner (Muhammad Firdaus Bin Ismail).
- **Collaborators:** None at MVP. When added, they are invited via GitHub
  directly from the Base44 GitHub panel.
- **Base44 access:** Remains governed by Base44's own RBAC and app-owner model.

---

## Secret Management Requirements

- All secrets (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, etc.) are stored
  as Base44 app secrets and are **never** present in the synced codebase.
- Local `.env.local` (used for local dev) is gitignored and must never be
  committed manually.
- If a secret is ever accidentally committed, it must be **rotated
  immediately** in the Base44 Secrets panel — Git history is immutable even
  after a force-push to GitHub.

---

## Backup & Recovery Implications

- **Code:** GitHub provides a full off-platform backup of the Orbitan codebase.
  In a Base44 platform outage, the code can be cloned and redeployed to any
  Vite-compatible host.
- **Data:** Entity data is **not** in GitHub. It remains in Base44's database.
  A separate data-export/backup strategy (via the `exportData` backend
  function) is required for full disaster recovery.
- **Secrets:** Not in GitHub. Must be re-provisioned in any recovery
  environment.

---

## Development & Deployment Workflow (Post-Sync)

```
Vibe-code in Base44 editor
        │
        ├─ Save  → auto-commit to GitHub main
        ├─ Publish → deploy to production + commit to GitHub main
        │
GitHub main (external)
        │
        ├─ Direct commit / PR merge → sync back to Base44 editor
        │
        └─ Pull request review (future, when team grows)
```

---

## Conclusion

Connecting Orbitan to a private GitHub repository via Base44's two-way sync
establishes the project's external source-control backbone, enables future
collaboration, and satisfies enterprise audit requirements — all without
ejecting from the Base44 platform or disrupting existing functionality. The
connection is **irreversible** but the decision is sound: the codebase is
already production-grade, the `.gitignore` is verified, and the branch
strategy aligns with Base44's constraints.

**Connection Status:** ✅ Confirmed — GitHub account `firdela` connected, repository `orbitan` (private) created and actively syncing on `main` branch. All pre-connection checklist items verified. `.gitignore` re-verified on 2026-07-20: secrets (`.env`, `.env.*`), build artifacts (`node_modules`, `dist`, `.vite`), local configs (`*.local`), and app config (`base44/.app.jsonc`) all excluded. No secrets, credentials, or tenant data are present in the synced codebase.

**Ongoing verification:** The `.gitignore` is audited on every significant change to ensure no new secret-bearing files are introduced. Secret rotation remains the immediate remediation if any credential is ever accidentally committed — Git history is immutable even after force-push.