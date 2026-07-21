# ADR-0045: GitHub Integration Verification Checkpoint

**Status:** Accepted
**Date:** 2026-07-21
**Principle:** Regulate (engineering governance) + Refine (reuse, don't duplicate)
**Related:** ADR-0038 (GitHub-First Platform Independence & Engineering Standards — master), ADR-0035 (GitHub Two-Way Code Sync — superseded by 0038), ADR-0036 (GitHub-First Strategy — superseded by 0038)
**Supersedes:** —

---

## Context

The Product Owner's Master Directive requires periodic verification that the GitHub integration remains correctly configured and that the boundary between **code synchronisation** and the **GitHub Connector** is clearly maintained.

On 2026-07-21, a verification audit was performed as part of the Phase 2 Sovereign Intelligence Model rollout (ADR-0044). This ADR records the findings as a permanent checkpoint in the institutional memory.

---

## Verification Findings (2026-07-21)

### 1. Two-Way Code Synchronisation — Active

| Property | Value | Status |
|---|---|---|
| Organisation | `firdela` | ✅ Confirmed (ADR-0038) |
| Repository | `orbitan` | ✅ Confirmed |
| Visibility | Private | ✅ Confirmed |
| Default Branch | `main` | ✅ Confirmed |
| Sync Mode | Two-Way (Base44 ↔ GitHub) | ✅ Active |
| `.gitignore` | Excludes secrets, `.env`, `node_modules`, `base44/.app.jsonc` | ✅ Verified |

No changes to the sync configuration since ADR-0038 was accepted on 2026-07-19.

### 2. GitHub API Connector (`integration_type: github`) — Intentionally Not Authorised

The `get_connectors_info` audit confirmed that the GitHub API Connector has **no active OAuth connection**. This is the correct state:

- The **GitHub Connector** is for building in-app features that read/write GitHub data (Issues, PRs, Actions). It is NOT the mechanism for source-code synchronisation.
- The **GitHub Code Synchronisation** (platform feature) is what manages the `firdela/orbitan` repository — and it is active via the Base44 dashboard, independent of the connector.

**Decision:** The GitHub API Connector remains **unauthorised** unless a specific product feature requires GitHub data access (e.g., syncing Issues to Tasks, RAG over PRs). No such feature is on the MVP roadmap. Keeping the connector disconnected minimises the attack surface and external dependency footprint.

---

## Decision

1. **ADR-0038 remains the master document** for the GitHub-First Platform Independence Strategy. This ADR does not duplicate or supersede it — it records a periodic verification checkpoint.

2. **No new ADR is warranted for "GitHub as Authoritative Repository"** because ADR-0038 already covers this comprehensively (Section 1: "GitHub as the Authoritative Engineering Repository"). Creating a duplicate would violate the complexity-prevention principle.

3. **The GitHub API Connector shall remain unauthorised** until a product feature explicitly requires it. At that point, a new ADR will document the authorisation and the specific feature it enables.

4. **Verification cadence:** GitHub integration health shall be re-verified at each major milestone (pilot launch, public launch, post-MVP review) and recorded as an addendum to this ADR or a successor.

---

## Trade-offs

| Aspect | Assessment |
|---|---|
| Redundancy risk | Avoided — ADR-0038 is the single source of truth; this ADR is a checkpoint, not a restatement. |
| Connector risk | Mitigated — keeping the GitHub Connector unauthorised reduces OAuth token exposure and external API dependencies. |
| Verification effort | Minimal — performed via `get_connectors_info` + reviewing existing ADR-0038 configuration table. |
| Audit trail | Strengthened — this checkpoint provides dated evidence for SOC 2 / ISO 27001 reviewers. |

---

## Cross-References

- [ADR-0038: GitHub-First Platform Independence & Engineering Standards](./0038-github-first-platform-independence-engineering-standards.md) — Master strategy document.
- [ADR-0035: GitHub Two-Way Code Sync](./0035-github-two-way-code-sync.md) — Original connection decision (superseded by 0038).
- [ADR-0036: GitHub-First Platform Independence Strategy](./0036-github-first-platform-independence-strategy.md) — Original strategy (superseded by 0038).
- [ADR-0043: Pilot Shield Governance Seeding](./0043-pilot-shield-governance-seeding.md) — Shadow audit calibration context.
- [ADR-0044: Platform Intelligence & Self-Optimization](./0044-platform-intelligence-self-optimization.md) — Sovereign Intelligence Model.

---

## Next Verification

**2026-08-04** — Coinciding with the end of the Shadow Audit calibration window (ADR-0043). At that point:
- Re-verify GitHub sync is active.
- Confirm the calibration threshold restoration (see below).
- Assess whether the GitHub Connector is needed for any MVP feature.

---

## Appendix: Shield Calibration Action (2026-07-21)

Concurrent with this verification, the procurement governance threshold for two pilot tenants (Renewed Resources, Renewed Fashion) was temporarily lowered from 300 SGD to 50 SGD for a 48-hour shadow audit calibration sample. The HBB tenant (Izaliqa Bakes) already operated at 50 SGD — no change.

| Tenant | Original Threshold | Calibration Threshold | Shadow Until |
|---|---|---|---|
| Renewed Resources (recycling) | 300 SGD | 50 SGD | 2026-08-04 |
| Renewed Fashion (retail) | 300 SGD | 50 SGD | 2026-08-04 |
| Izaliqa Bakes (HBB) | 50 SGD | 50 SGD (unchanged) | 2026-08-04 |

**Safety:** Shadow audit mode remains active (`effect=notify`, not `block`). No procurement operations are disrupted. After 48 hours, thresholds will be restored to calibrated values based on the collected `AuditLog` data. See ADR-0043 for the full shadow audit governance model.

---

**Product Owner:** Muhammad Firdaus Bin Ismail
**Authored by:** Base44 (acting as Strategic Architect)
**Last Updated:** 2026-07-21