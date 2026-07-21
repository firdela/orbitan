# ADR-0043: Pilot Tenant Shield Governance Seeding

**Date:** 2026-07-21
**Status:** Accepted — Implementation Complete
**Deciders:** Founder (Muhammad Firdaus Bin Ismail), Base44 AI Architect
**Supersedes:** N/A
**Related:** ADR-0003 (Shield Governance Interceptor), ADR-0029 (Autonomous Governance Thresholds for Agentic AI), ADR-0041 (Shield Forensic Artifact Linkage), ADR-0030 (Contextual Help & Discoverability)

---

## Context

As of 2026-07-21, the OrbitanOS Shield™ governance interceptor was fully implemented (ADR-0003) and the `ShieldStatusBadge` component (ADR-0030) surfaced enforcement posture on the Tenant Command Center. However, only **one** of four pilot tenants had tenant-specific `GovernancePolicy` records registered:

| Tenant | Governance Domain | Plan | Policies (Pre-Seeding) |
|---|---|---|---|
| Taqueria Pte Ltd | `fnb_standard_ops` | Enterprise (Guardian) | 3 ✅ |
| Renewed Resources Pte Ltd | `recycling_standard_ops` | Business (Auditor) | 0 ❌ |
| Renewed Fashion | `retail_standard_ops` | Growth (Auditor) | 0 ❌ |
| Izaliqa Bakes | `hbb_standard_ops` | Growth (Auditor) | 0 ❌ |

Five platform-level policies (`tenant_id: 'orbitan_platform'`) were already enforced universally — including `no_audit_log_deletion` (block) and `compliance_rejection_escalation` (notify). The Shield interceptor fetches **both** tenant-specific and platform-wide policies at evaluation time, with domain-aware filtering. So the gap was tenant-specific operational governance, not platform guardrails.

**The risk:** Three pilot tenants entering operational use without domain-specific procurement thresholds, compliance verification gates, or workforce integrity checks. The ADR-0029 agentic trust model cannot function without policies for agents to be evaluated against.

---

## Decision

Seed **9 tenant-specific GovernancePolicy records** (3 per unprotected tenant) calibrated to each industry pack's `governance_threshold_sgd` from the `ActivationRegistry`, all in **Shadow Audit Mode** for a 14-day calibration window.

### Policy Architecture

Each tenant received one policy per Protection Domain (A/B/C), mirroring Taqueria's structure:

#### Renewed Resources (Recycling — `recycling_standard_ops`, threshold: 300 SGD)
| Policy | Domain | Entity | Effect | Condition |
|---|---|---|---|---|
| `procurement_threshold_gate` | Domain_A | PurchaseOrder | block (shadow) | amount_gt 300 |
| `disposal_cert_verification_gate` | Domain_C | ComplianceRecord | block (shadow) | document_url is null |
| `geofence_clock_enforcement` | Domain_B | ClockRecord | notify | geo_validated false |

#### Renewed Fashion (Retail — `retail_standard_ops`, threshold: 300 SGD)
| Policy | Domain | Entity | Effect | Condition |
|---|---|---|---|---|
| `procurement_threshold_gate` | Domain_A | PurchaseOrder | block (shadow) | amount_gt 300 |
| `high_value_sale_evidence_gate` | Domain_A | SalesInvoice | notify (shadow) | amount_gt 1000 |
| `geofence_clock_enforcement` | Domain_B | ClockRecord | notify (shadow) | geo_validated false |

#### Izaliqa Bakes (HBB — `hbb_standard_ops`, threshold: 50 SGD)
| Policy | Domain | Entity | Effect | Condition |
|---|---|---|---|---|
| `procurement_threshold_gate` | Domain_A | PurchaseOrder | block (shadow) | amount_gt 50 |
| `allergen_disclosure_gate` | Domain_C | SalesInvoice | notify (shadow) | allergen_info is null |
| `daily_hygiene_log_required` | Domain_C | Task | notify (shadow) | hygiene_log_missing true |

### Shadow Audit Mode Configuration

All 9 policies carry:
- `shadow_audit_mode: true`
- `shadow_audit_until: 2026-08-04T23:59:59Z` (14-day window)
- `applies_to: 'both'` (human + agent, per ADR-0029)
- `agent_trust_level`: `medium` (recycling/retail) or `low` (HBB — tightest control)

**How Shadow Audit works:** Block effects are downgraded to notify — the action proceeds but a `shadow_audit: true` AuditLog entry is written and `shadow_audit_hits` is incremented on the policy. This produces a 14-day dataset of "would-have-blocked" events to calibrate thresholds before switching to hard-gate enforcement on 2026-08-05.

---

## Rationale

### Why Shadow Audit Mode instead of direct enforcement?

1. **Plan-tier safety net:** All three tenants are on Business/Growth plans (Auditor mode), so `block` effects are already downgraded to `notify` by the subscription tier. Shadow audit adds `shadow_audit: true` flagging and hit counting on top of this, giving us calibration data without any risk of blocking operational actions during pilot go-live.

2. **Threshold calibration:** The pack thresholds (50/300 SGD) are registry-derived but untested against real operational patterns. Shadow audit lets us observe how many transactions would breach each threshold before committing to hard gates. If 80% of HBB purchase orders exceed 50 SGD, we raise the threshold before enforcement.

3. **Exit strategy:** On 2026-08-05, `shadow_audit_until` expires and policies resume their native `block` effect. For tenants still on Auditor plans, the plan downgrade still applies. For tenants that upgrade to Enterprise by then, hard enforcement begins automatically.

### Why 3 policies per tenant (not more)?

Taqueria's 3-policy set (finance threshold, invoice evidence, clock-in training) provided the template. Adding more policies before pilot operations generate real data risks over-governance — blocking legitimate actions with rules that haven't been calibrated. The Shadow Audit window will reveal which additional policies are needed based on actual violation patterns.

### Why `applies_to: 'both'` on procurement gates?

ADR-0029 mandates that agentic AI actions (e.g. `inventory_agent` auto-generating purchase orders) must be governed by the same policies as human actions. The `agent_trust_level` field on each procurement policy ensures the Shield interceptor can distinguish trust tiers when an agent initiates the action.

---

## Alternatives Considered

### Alternative 1: Seed guardian (block) policies directly, no shadow audit
- **Rejected:** Risked blocking legitimate pilot operations before thresholds were validated. The HBB 50 SGD threshold in particular could block routine ingredient purchases. No calibration data would be collected.

### Alternative 2: Seed only notify (auditor) policies
- **Rejected:** Loses the ability to track "would-have-blocked" events. When these tenants upgrade to Enterprise, we'd have no data to inform threshold tuning. Shadow audit mode captures this data now while the plan tier keeps operations safe.

### Alternative 3: Wait for tenants to start operations, then seed
- **Rejected:** Policies must exist BEFORE operations begin to ensure the Shield interceptor evaluates every action from day one. Post-hoc seeding misses the initial transaction stream.

---

## Implementation

- **Date executed:** 2026-07-21 13:54 SGT
- **Records created:** 9 GovernancePolicy records (bulk create)
- **Verification:** All 9 records confirmed active with `shadow_audit_mode: true` and `shadow_audit_until: 2026-08-04T23:59:59Z`
- **Shield Status Badge:** The `ShieldStatusBadge` component (ADR-0030) on each Tenant Command Card will now display green "Protected" status with the correct policy count for all 4 pilot tenants

### Post-Shadow-Audit Actions (2026-08-05)

1. Review `shadow_audit_hits` on each policy to assess threshold accuracy
2. If thresholds need adjustment, update `condition_json.amount_gt` before hard enforcement
3. Set `shadow_audit_mode: false` on policies ready for hard-gate enforcement
4. For tenants that remain on Auditor plans, block effects continue to downgrade to notify — hard enforcement only activates upon Enterprise upgrade

---

## Consequences

### Positive
- **All 4 pilot tenants now have operational trust coverage** — the Shield evaluates procurement, compliance, and workforce actions from day one
- **ADR-0029 agentic governance foundation** — agents (inventory_agent, finance_agent) can now be evaluated against domain-specific thresholds
- **SOC 2 audit readiness** — every would-be-blocked action is logged with `shadow_audit: true` for auditor review
- **Data-driven threshold tuning** — 14-day window produces calibration data before hard enforcement

### Negative
- **Shadow audit expiry requires action on 2026-08-05** — if no one reviews the data, policies either remain in shadow mode (soft) or switch to block (potentially disruptive)
- **Additional maintenance surface** — 9 more policies to manage as tenant needs evolve

### Neutral
- **Platform-level policies continue to apply universally** — the 5 `orbitan_platform` policies (no_audit_log_deletion, payroll_lock, etc.) were already enforced and remain unchanged

---

## Verification

```
Pre-seeding:  Taqueria=3, Renewed Resources=0, Renewed Fashion=0, Izaliqa=0
Post-seeding: Taqueria=3, Renewed Resources=3, Renewed Fashion=3, Izaliqa=3
Total active GovernancePolicy records: 17 (8 pre-existing + 9 new)
```

All policies verified via `read_entities` with `is_active: true` filter. Shadow audit configuration confirmed on all 9 records.