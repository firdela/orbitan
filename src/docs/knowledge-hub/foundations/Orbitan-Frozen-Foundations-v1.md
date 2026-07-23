# Orbitan Frozen Foundations v1.0

> **Status:** FROZEN — 2026-07-23
> **Git Tag:** `v1.0-foundation-freeze`
> **Authority:** Product Authority (Muhammad Firdaus Bin Ismail)

## Purpose

Orbitan Frozen Foundations v1.0 is the constitutional baseline for OrbitanOS. It binds
the three foundational Reference Architectures into a single, immutable governance
state. From this point forward, implementation MUST conform to these foundations.
Any change to a frozen RA requires a governed exception (ADR + Product Authority approval).

## The Three Foundational Pillars

| Pillar | ID | Domain | Status |
| :--- | :--- | :--- | :--- |
| **Architecture Governance** | RA-0000 | How Orbitan is governed | Frozen |
| **Platform Services** | RA-0004 | How the platform is constructed | Frozen |
| **Identity Architecture** | RA-0005 | Who can do what, where | Frozen |

## Binding Commitments

1. **RA-0000 — Governance Framework:** Every architectural change follows the
   Architecture Decision Lifecycle (ADL). Constitutional amendments require GDP-006.
   Implementation Covenant (IC) prevents undocumented code drift.

2. **RA-0004 — Platform Services Architecture:** Platform Services are separated from
   Domain Services by a strict dependency rule: Platform → Domain → Feature → UI.
   Reverse dependencies are prohibited. Platform Capability Principles (PCP-001..005)
   are architectural guarantees, not guidelines.

3. **RA-0005 — Identity Architecture:** The global `User` is identity; the tenant-scoped
   `Employee` is membership. One User holds many Employee records. Non-human principals
   (AI agents, service accounts) are governed identities under the same framework.
   Default access state is "none" (least privilege).

## Cross-References

- RA-0000: [`decision-records/RA-0000.md`](./decision-records/RA-0000.md)
- RA-0004: [`decision-records/RA-0004.md`](./decision-records/RA-0004.md)
- RA-0005: [`decision-records/RA-0005.md`](./decision-records/RA-0005.md)
- MVP Charter: [`foundations/MVP-Charter.md`](./MVP-Charter.md)
- Build Manifest: [`foundations/Build-Manifest.md`](./Build-Manifest.md)

## Amendment Rule

Frozen Foundations v1.0 may only be superseded by:
- A formal Product Authority decision to unfreeze, OR
- A new Reference Architecture (RA-0006+) accepted through the RA-0000 ADL process.

Until then, this is the single source of truth for Orbitan's architecture.