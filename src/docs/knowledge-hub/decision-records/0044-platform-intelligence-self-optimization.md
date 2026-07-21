# ADR-0044: Platform Intelligence & Self-Optimization (Sovereign Intelligence Model)

**Date:** 2026-07-21
**Status:** Accepted
**Drivers:** Founder, Product Architect, Security Architect
**Related:** ADR-0029 (Autonomous Agentic Trust), ADR-0043 (Pilot Shield Governance Seeding), ADR-0033 (Metrics & Analytics Registry), ADR-0026 (Customer Digital Sovereignty)

---

## Context

OrbitanOS is transitioning from passive tooling to a **Self-Healing Platform** — a closed-loop system that uses operational intelligence to autonomously identify bottlenecks and propose improvements. This requires platform-level observability across tenants.

However, Orbitan's brand promise is built on **Customer Digital Sovereignty** (ADR-0026) and strict tenant isolation (ADR-0016). Traditional "phone-home" telemetry — where raw tenant data streams to a central vendor data lake — fundamentally conflicts with this promise. If we compromise tenant trust to build internal intelligence, we destroy the very differentiator we are trying to protect.

This ADR defines how we resolve that tension: **a Sovereign Intelligence Model** that delivers platform self-optimization *without* ingesting tenant data.

---

## Decision

We adopt the **Sovereign Intelligence Model** — a privacy-by-design, federated architecture for platform observability.

### Four Core Principles

#### 1. Zero-PII Telemetry (The Sanitization Gate)
No raw tenant entity data — including `tenant_id`, `outlet_id`, `actor_id`, entity content, monetary amounts, names, or any field that could identify a specific tenant or individual — will be transmitted to Orbitan's central intelligence hub.

**What IS transmitted:** Abstracted signal patterns (e.g., "industry: fnb | module: procurement | signal: approval_latency_p95 | value: 3400ms").

**Enforcement:** Every telemetry emission must pass through a sanitization gate that strips all identifying context. The `OperationalMetric` registry enforces this at the schema level — `is_privacy_gated` is a required field and must be `true` for every registered metric.

#### 2. Local-First Evaluation (Federated Intelligence)
All pattern matching, anomaly detection, and threshold evaluation occurs **within the tenant-isolated execution context** (the Shield Interceptor, Metrics Engine, or Action Dispatcher running for that tenant). Only the *result* of the evaluation — the abstracted signal — exits the tenant boundary.

We do not stream raw logs centrally and then compute insights. We compute insights locally and stream only the computed signal. This mirrors federated learning: the model (signal) improves, the data (tenant records) never moves.

#### 3. Data Transparency Manifest (Radical Transparency)
Every signal Orbitan's central hub can receive is documented in a **public Data Transparency Manifest** — a tenant-accessible registry that lists:
- The signal key and human-readable description
- What abstraction is applied (what is stripped, what is kept)
- Which module emits it
- How often it is emitted
- Whether it can be disabled by the tenant

Tenants can inspect this manifest at any time. **No signal is emitted that is not documented in the manifest.** This is enforced by the `OperationalMetric` registry — if a metric key is not registered, the emission is dropped.

#### 4. Opt-Out Sovereignty (Tenant Consent)
Operational intelligence is **opt-in by default for Enterprise tenants** (who expect platform improvement) and **opt-out for all others**. A tenant setting — `platform_intelligence_consent` — controls whether signals are emitted. Even with consent enabled, the Zero-PII gate still applies; consent governs whether the *abstracted signal itself* is sent.

No tenant is ever forced to contribute to platform intelligence to use OrbitanOS. This is the Sovereign Intelligence guarantee.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Tenant Container (Isolated Execution Context)          │
│                                                          │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐ │
│  │  Shield       │   │  Metrics     │   │  Action      │ │
│  │  Interceptor  │   │  Engine      │   │  Dispatcher  │ │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘ │
│         │                  │                   │         │
│         ▼                  ▼                   ▼         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  Local Pattern Evaluator (ADR-0044)                ││
│  │  • Computes signal locally from tenant data         ││
│  │  • Strips all PII via Sanitization Gate             ││
│  │  • Emits only: { signal_key, abstract_value }      ││
│  └────────────────────┬────────────────────────────────┘│
│                       │                                  │
│  ┌────────────────────▼────────────────────────────────┐│
│  │  OperationalMetric Registry (local copy)           ││
│  │  • Validates emission against manifest             ││
│  │  • Checks tenant consent flag                      ││
│  │  • Drops unregistered or non-consented signals     ││
│  └────────────────────┬────────────────────────────────┘│
└───────────────────────┼──────────────────────────────────┘
                        │  (Zero-PII signal only)
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Orbitan Central Intelligence Hub (Orbit Nexus Internal)│
│                                                          │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐ │
│  │  Signal      │   │  Pattern     │   │  Evolution   │ │
│  │  Aggregator  │──▶│  Analyzer    │──▶│  Proposals   │ │
│  └──────────────┘   └──────────────┘   └──────────────┘ │
│                                                          │
│  • Aggregates across tenants by industry/pack (never     │
│    by tenant identity)                                   │
│  • Proposes threshold updates, governance calibrations    │
│  • Outputs EvolutionProposal records (ADR-0019)          │
└─────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Role | New/Existing |
|-----------|------|-------------|
| `OperationalMetric` Registry | Schema-level enforcement of Zero-PII and Transparency Manifest | **New (this ADR)** |
| Local Pattern Evaluator | Computes signals within tenant execution context | **New (this ADR)** |
| Sanitization Gate | Strips PII before any emission leaves tenant boundary | **New (this ADR)** |
| `shieldInterceptor` | Tags evaluations with product context (industry, pack, shield_mode) — no PII | **Extended** |
| `metricsEngine` | Emits threshold-breach signals (already ADR-0033) | **Extended** |
| `evolutionEngine` | Consumes aggregated signals to propose governance/threshold updates | **Extended** |
| Data Transparency Manifest UI | Tenant-accessible view of all emittable signals | **New (Phase 2)** |

---

## Rationale

### Why Sovereign Intelligence over Centralized Telemetry?

| Dimension | Centralized Telemetry (Traditional) | Sovereign Intelligence (Chosen) |
|-----------|--------------------------------------|---------------------------------|
| **Privacy risk** | High — raw data leaves tenant boundary | Near-zero — only abstracted signals leave |
| **Compliance surface** | GDPR/data-residency complexity grows with every new field | Bounded — no PII means minimal regulatory exposure |
| **Storage cost** | Scales with raw log volume (expensive) | Scales with signal volume (orders of magnitude smaller) |
| **Tenant trust** | Eroded — tenants fear data extraction | Strengthened — tenants see transparency manifest |
| **Competitive moat** | None — every SaaS does this | Strong — "Zero-Knowledge Operating System" differentiator |
| **Enterprise sales** | Friction — security reviews flag data extraction | Accelerated — aligns with enterprise zero-trust procurement |
| **Implementation effort** | Lower (just stream everything) | Higher (sanitization gate + registry validation) |
| **Signal quality** | Higher (raw data access) | Slightly lower (abstracted), but sufficient for optimization |

### Trade-offs Accepted
1. **We lose drill-down capability by default.** We cannot trace a signal back to a specific tenant without the Forensic Access exception (below). This is intentional — it is the privacy guarantee.
2. **Signal quality is slightly reduced.** Abstraction loses granularity. We compensate by emitting more signal types (breadth over depth).
3. **Implementation complexity is higher.** The sanitization gate and registry validation are extra engineering work. This is the cost of privacy.

### Forensic Access Exception ("Break Glass")
If a pilot tenant reports an issue and support needs tenant-specific logs to debug:
1. The tenant (or tenant_admin) must **grant explicit, time-limited forensic access** via a UI toggle.
2. The access grant is **logged in the tenant's AuditLog** — the tenant knows we looked.
3. The access **auto-expires** (default: 24 hours).
4. The access is **scoped** to a specific module/incident, not blanket read.

This ensures forensic debugging is possible without compromising the default privacy posture.

---

## Consequences

### Positive
- **Brand alignment:** Reinforces Orbitan's Digital Sovereignty promise (ADR-0026) with concrete technical enforcement.
- **Enterprise readiness:** Zero-PII telemetry is a procurement accelerator for compliance-sensitive industries (healthcare, legal, finance).
- **Regulatory simplicity:** No PII ingestion means minimal GDPR/PDPA data-controller obligations for the intelligence pipeline.
- **Scalability:** Signal aggregation is computationally cheap; no raw-data pipeline to scale.
- **Future-proofing:** The architecture is portable — it does not depend on Base44's central database for tenant data access.

### Negative
- **No central drill-down by default.** Debugging platform-wide issues requires aggregate pattern analysis, not individual tenant inspection.
- **Slower calibration.** Threshold tuning relies on aggregated signals, not raw distributions. Mitigated by the Shadow Audit Mode (ADR-0043) which provides calibration data per-tenant locally.
- **Extra schema governance.** The `OperationalMetric` registry must be maintained — every new signal requires registration before emission.

### Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Signal abstraction loses too much context | Define abstraction rules per metric in the registry; review quarterly |
| Tenant disables consent, we lose coverage | Accept this — it is the sovereignty guarantee. Coverage is a privilege, not a right |
| Future feature needs PII-level data | Reject at ADR review. If truly necessary, propose a new ADR with explicit consent flow |
| Registry becomes stale / unused signals accumulate | Add `is_active` flag; quarterly cleanup automation in `evolutionEngine` |

---

## Implementation Guidance

### Phase 1 (Now — MVP Alignment)
1. ✅ Create `OperationalMetric` entity schema (this ADR).
2. ✅ Extend `shieldInterceptor` with product-context tagging (industry, pack, shield_mode — no PII).
3. Define sanitization gate as a shared module in `base44/shared/` for reuse across functions.
4. Seed initial system-level `OperationalMetric` definitions (shield evaluation latency, policy hit rate, shadow audit ratio).

### Phase 2 (Post-MVP — Enterprise Hardening)
5. Build Data Transparency Manifest UI in tenant settings.
6. Implement tenant consent toggle (`platform_intelligence_consent`) in `SystemSettings` or `Tenant`.
7. Implement Forensic Access grant flow with AuditLog recording.
8. Connect `evolutionEngine` to consume aggregated signals and auto-propose threshold updates.

### Phase 3 (Future — Autonomous Calibration)
9. `evolutionEngine` autonomously proposes `GovernancePolicy` threshold updates based on aggregated signal patterns.
10. Proposals enter the existing override-approval workflow (ADR-0030) — humans still approve before enforcement.

---

## Assumptions
1. Aggregate signals (by industry + pack + module) provide sufficient signal-to-noise for platform optimization.
2. Tenants in compliance-sensitive industries will value the Zero-PII guarantee more than the small loss of "personalized platform recommendations."
3. The existing `AuditLog` and `MetricDefinition` (ADR-0033) infrastructure is sufficient as the local computation substrate — no new data store is needed inside the tenant boundary.
4. Base44's execution model (serverless functions per-request) satisfies the "isolated execution context" requirement for local-first evaluation.

---

## Verification Notes
- **Schema enforcement:** Every `OperationalMetric` record must have `is_privacy_gated: true`. A future validation function should reject any record with `is_privacy_gated: false`.
- **Emission validation:** The sanitization gate must check the registry before emitting. Unregistered keys are silently dropped (logged, not errored — errors could leak signal existence).
- **Transparency:** The Data Transparency Manifest is generated from the `OperationalMetric` registry at query time — no separate manual documentation to drift out of sync.
- **No backdoors:** The Sanitization Gate is a single shared module. Any code path that bypasses it is an architecture violation and must be caught in code review.

---

## Cross-References
- **ADR-0026** — Customer Digital Sovereignty (foundational principle this ADR enforces technically)
- **ADR-0029** — Autonomous Agentic Trust (agents operate under the same privacy constraints)
- **ADR-0033** — Metrics & Analytics Registry (local computation substrate)
- **ADR-0043** — Pilot Shield Governance Seeding (provides per-tenant calibration without central data)
- **ADR-0019** — Orbit Evolution (evolutionEngine consumes aggregated signals)
- **ADR-0016** — RLS Tenant Isolation Standard (enforced at the database layer)