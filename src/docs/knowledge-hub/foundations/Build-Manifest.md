# Orbitan Build Manifest v1.0

> **Status:** Accepted — 2026-07-23
> **Mode:** BUILD MODE ON (Discussion Mode OFF)
> **Predecessors:** RA-0000 (frozen), RA-0004 (frozen), RA-0005 (frozen)

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

## Build Mode Operating Rules

1. **No silent redesign.** Do not redesign frozen architecture unless Product Authority
   explicitly reopens it.
2. **Implementation-first.** Every feature starts with implementation, not discussion.
3. **AFR compliance.** Every merge must satisfy the agreed Architecture Fitness Rules.
4. **Docs with code.** Documentation is updated alongside code — never afterward.
5. **Governed change.** New architectural concepts require ADRs and, if necessary, new
   Reference Architectures (RA-0006+) — never silent changes.

## When Discussion Mode Turns Back On

Discussion Mode is re-activated ONLY for matters that genuinely affect the platform's
foundation:
- A new Reference Architecture
- A major security redesign
- A significant identity model change
- A platform-wide product strategy shift
- A Product Authority decision

Routine engineering questions stay in Build Mode.

## Git Baseline

- **Tag:** `v1.0-foundation-freeze` — permanent reference for the frozen foundation.
- **Repository:** Private GitHub repo, `main` branch, two-way Base44 synchronisation enabled.