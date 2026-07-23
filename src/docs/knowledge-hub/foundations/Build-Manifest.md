# Orbitan Build Manifest v1.0

> **Status:** Accepted — 2026-07-23
> **Mode:** PRODUCT DELIVERY MODE ON
> **Foundation Discussion Mode:** OFF (Architecture Locked)
> **Predecessors:** RA-0000 (frozen), RA-0004 (frozen), RA-0005 (frozen)
>
> **Operating model:** Foundation Discussion Mode OFF → Architecture Locked →
> Product Delivery Mode ON. Foundational architecture is frozen; normal product
> management (discovery, UX, prioritisation, roadmap, industry packs) continues.

## Purpose

The Build Manifest defines the technical execution order, critical path, and quality
gates for delivering the Workforce MVP. Once Build Mode is ON, engineering follows this
manifest; architectural changes require governed ADRs, not ad-hoc discussion.

## Build Order (Layered)

### Phase 1 — Foundation Layer
| Capability | Owner | Status |
| :--- | :--- | :--- |
| Orbit Identity Model (User ↔ Employee link) | Identity Engine | Implement |
| Audit Engine (immutable AuditLog) | Platform | Harden |
| Shield Interceptor (policy evaluation) | Compliance | Harden |
| MembershipResolver + Access Engine | Platform | Implement |

### Phase 2 — Capability Layer
| Capability | Owner | Status |
| :--- | :--- | :--- |
| Nexus Gateway (AI capability dispatcher) | AI Platform | Wire |
| Attendance Controller (clock-in/out + breaks) | Workforce | Implement |
| Attendance Reconciliation (exception detection) | Workforce | Implement |
| Task Controller (governed state machine) | Workforce | Harden |

### Phase 3 — Feature Layer
| Capability | Owner | Status |
| :--- | :--- | :--- |
| Onboarding Wizard (org creation) | Onboarding | Harden |
| Worker Portal (attendance + tasks + feedback) | Workforce | Harden |
| Manager Dashboard (timesheets + exceptions + tasks) | Workforce | Implement |

## Critical Path

```
Identity Resolver
      ↓
Shield Policy Engine
      ↓
Attendance Reconciliation Engine
      ↓
Timesheet Validation → Payroll Readiness
```

Each stage is a hard dependency. Do not start the next stage until the prior stage
passes its quality gate.

## Quality Gates

### Definition of Done (per feature)
1. 100% unit test coverage for handler/controller functions.
2. Passing Architecture Fitness Rules (AFR) validation.
3. ADR linkage documented for any deviation from the frozen foundations.
4. Documentation updated alongside code (not afterward).
5. No PII leakage — Zero-PII sanitization gate enforced on every AI boundary.

### Automated Validation (per merge to `main`)
1. `taskControllerTestSuite` passes.
2. Shield domain integrity checks pass.
3. RLS tenant-isolation tests pass (no `$in` operator in user_condition).
4. Build compiles with zero unresolved imports.

## Build Mode Operating Rules (Formalised)

Foundations are treated as **contracts**. These rules are permanent:

1. **Frozen foundations are treated as contracts.** No foundational architecture redesign.
2. **Every feature ships with tests.**
3. **Every feature updates documentation** — architecture refs (only when required),
   product docs, user docs, developer docs, and changelog. Docs evolve with
   implementation, never trail behind.
4. **No silent architectural changes.**
5. **Every architectural deviation requires an ADR.**
6. **Every release must satisfy Architecture Fitness Rules.**
7. **Evidence before governance.** Every production issue that reveals an architectural
   weakness results in evidence first, then governance — not immediate redesign.

New architectural concepts require ADRs and, if necessary, new Reference Architectures
(RA-0006+) — never silent changes.

## Foundation Discussion Mode vs Product Delivery Mode

- **Foundation Discussion Mode:** OFF. Architecture is locked. No foundational redesign.
- **Product Delivery Mode:** ON. Normal product management continues — product
  discovery, UX refinements, feature prioritisation, roadmap decisions, and future
  industry packs flow through normal product governance, not foundational review.
- **Routine engineering questions** stay in Build Mode.
- **Foundation Discussion Mode returns only for:** a new Reference Architecture, a major
  security redesign, a significant identity model change, a platform-wide product
  strategy shift, or a Product Authority decision.

## Success Metrics (Shifted to Delivered Capability)

From this point, Orbitan's progress is measured by **delivered capability**, not by the
number of governance documents:

- Working features
- Stable architecture
- User adoption
- Performance
- Security
- Reliability
- Accessibility
- Pilot tenant feedback
- Engineering velocity

## Git Baseline & Milestones

- **`v1.0-foundation-freeze`** — last architectural baseline (frozen foundations).
- **`v1.0-build-start`** — first engineering baseline (Build Mode start).

Two consecutive milestones make future regression analysis clearer: the foundation
freeze is the architectural anchor; the build start is the engineering anchor.

- **Repository:** Private GitHub repo, `main` branch, two-way Base44 synchronisation enabled.