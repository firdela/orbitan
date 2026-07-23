# Orbitan MVP Charter

> **Status:** Accepted — 2026-07-23
> **North Star:** Production-quality MVP enabling pilot tenants to run real daily operations.
> **MVP Deadline:** 30 July 2026 (2 months from 30 May 2026 start).

## Product Goal

Deliver a production-quality Workforce Operating System that lets the initial pilot
tenants manage real daily operations on OrbitanOS, validating business workflows and
establishing a strong foundation for the wider Orbit ecosystem.

## Pilot Tenants (Validation Only — Not the Product)

- **Taqueria Pte Ltd (La Birria Tacos)** — Food & Beverage
- **Renewed Resources Pte Ltd** — Recycling / Sustainability
- **Renewed Fashion** — Retail
- **Home-Based Businesses (e.g. Izaliqa Bakes)** — HBB

## In-Scope (Workforce MVP)

### Identity & Onboarding
- Global `User` account (platform-owned identity)
- Tenant-scoped `Employee` membership via Orbit Identity Model (RA-0005)
- Invitation-led worker onboarding (Invitation + AccessRequest)
- Self-serve organisation creation wizard (Onboarding)

### Workforce Operations
- Attendance: Clock-In / Clock-Out with GPS + photo verification
- Break tracking (real events, not inferred)
- Timesheet validation (manager approval gates payroll inclusion)
- Shift management (schedule, confirm, trade)
- Task lifecycle governed by OSF RESPONSIBLE_FOR / ACCOUNTABLE_FOR (ADR-0047)
- Governed state transitions via taskController

### Compliance
- Food safety logs + hygiene checklists
- Attendance exception detection + manager review (ADR-0052 Policy Engine)
- Governance-gated task completion (verification_mode)

## Excluded (Post-MVP)

- Native payroll processing (integration-led only)
- Full CRM suite
- Complex multi-brand inventory optimisation
- Orbit Nexus standalone subscription product
- White-labelling
- Vanta/SOC2 formal certification
- Marketplace

## MVP Success Criteria

1. 100% of pilot tenant daily operations performed on OrbitanOS for 30 consecutive days.
2. Zero P0 data-integrity incidents (tenant isolation holds).
3. All governed workflows produce complete AuditLog evidence.
4. Workforce module passes the taskControllerTestSuite with 100% coverage.

## Build Order

See [Build Manifest](./Build-Manifest.md) for the technical execution roadmap.

## Guiding Principles

- **Deliver-Only mode:** No speculative features. Every change ships working software.
- **Registry-driven:** Industry logic lives in ActivationRegistry, never hardcoded.
- **Privacy-by-Design:** Zero-PII sanitization enforced at every AI boundary.
- **Working software over extensive planning:** Implementation evidence drives refinement.