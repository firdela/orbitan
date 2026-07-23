# OrbitanOS

> The commercial, scalable, multi-tenant SaaS **Workforce Operating System** for the Orbit ecosystem.

[![Status: Product Delivery Mode ON](https://img.shields.io/badge/status-Product%20Delivery%20Mode%20ON-blue)]()
[![Foundation: Frozen v1.0](https://img.shields.io/badge/foundation-frozen%20v1.0-111827)]()
[![Foundation Discussion: OFF](https://img.shields.io/badge/foundation%20discussion-OFF-111827)]()

---

## What Orbitan Is

OrbitanOS is the flagship product of **Orbitan** — a multi-tenant workforce, compliance,
and operations platform for SMEs, multi-brand organisations, and enterprises. It powers
daily operations (attendance, scheduling, tasks, compliance, procurement) under a
governed, privacy-by-design architecture with the **Orbit Nexus** AI layer as its
intelligence operating system.

Pilot tenants (Taqueria, Renewed Resources, Renewed Fashion, HBBs) are validation
environments. The primary market is future commercial customers.

## Vision & Mission

- **Vision:** Build the operating system for frontline work — where governance, identity,
  and AI converge so organisations run with trust and velocity.
- **Mission:** Deliver a production-quality MVP by 30 July 2026 that lets pilot tenants
  run real daily operations, validating business workflows and establishing a strong
  foundation for the wider Orbit ecosystem.

## Architecture Overview

Orbitan follows a **Registry-Driven, Manifest-Driven, Wallet-Native** architecture
governed by three frozen Reference Architectures:

| Pillar | ID | Domain |
| :--- | :--- | :--- |
| Architecture Governance | RA-0000 | How Orbitan is governed |
| Platform Services | RA-0004 | How the platform is constructed |
| Identity Architecture | RA-0005 | Who can do what, where |

**Layering rule (RA-0004):** `Platform → Domain → Feature → UI`. Reverse dependencies
are prohibited. **Identity rule (RA-0005):** the global `User` is identity; the
tenant-scoped `Employee` is membership.

## Frozen Foundations v1.0 — 2026-07-23

The foundational architecture is **frozen**. **Foundation Discussion Mode is OFF;
Architecture Locked; Product Delivery Mode ON.** Git milestones:
`v1.0-foundation-freeze` (last architectural baseline) → `v1.0-build-start` (first
engineering baseline). See [CHANGELOG](src/docs/knowledge-hub/CHANGELOG.md).

- 🧊 [Orbitan Frozen Foundations v1.0](src/docs/knowledge-hub/foundations/Orbitan-Frozen-Foundations-v1.md)
- 🎯 [Orbitan MVP Charter](src/docs/knowledge-hub/foundations/MVP-Charter.md)
- 🛠️ [Orbitan Build Manifest v1.0](src/docs/knowledge-hub/foundations/Build-Manifest.md)

## MVP Scope

**In-scope:** Identity & onboarding, workforce operations (attendance, shifts, tasks,
timesheets), compliance (food safety, attendance exceptions, governance-gated completion).
**Post-MVP:** Native payroll, full CRM, complex multi-brand inventory, Orbit Nexus
standalone subscription, white-labelling, formal SOC2/Vanta certification.

See [MVP Charter](src/docs/knowledge-hub/foundations/MVP-Charter.md) for full scope.

## Repository Structure

```
/
├── README.md                       ← you are here (front door)
├── base44/
│   ├── entities/                    ← JSON schemas (data model)
│   ├── functions/                   ← backend handlers (deno)
│   ├── shared/                      ← cross-function shared logic
│   └── agents/                      ← in-app AI agent configs
└── src/
    ├── pages/                       ← routed React pages
    ├── components/                  ← reusable UI components
    ├── lib/                         ← SDK, access engine, hooks, utils
    └── docs/
        └── knowledge-hub/           ← 📚 Living Knowledge Hub (single source of truth)
            ├── README.md            ← index
            ├── master-vision.md
            ├── mvp-roadmap.md
            ├── pilot-tenants.md
            ├── golden-ui-ux-standard.md
            ├── foundations/          ← 🧊 Frozen Foundations v1.0
            └── decision-records/    ← ADRs + Reference Architectures (RA-0000/0004/0005)
```

## Development Workflow

1. **Clone & install**
   ```bash
   git clone <repo-url> orbitan && cd orbitan
   npm install
   ```
2. **Environment:** create `.env.local`
   ```env
   VITE_BASE44_APP_ID=your_app_id
   VITE_BASE44_APP_BASE_URL=your_backend_url
   ```
3. **Run:** `npm run dev`
4. **Publish:** open [Base44.com](https://Base44.com) and click Publish.

## Build Instructions

Orbitan is developed in [Base44](https://Base44.com) with two-way GitHub synchronisation.
The `main` branch is the source of truth; every supported change syncs to the private
GitHub repository. Do not commit secrets — keep `.env`, `.env.local`, and credentials
out of version control (enforced via `.gitignore`).

## Governance

- **Product Owner:** Muhammad Firdaus Bin Ismail
- **Co-founder:** Hamka Ariffin
- **Decision records:** `src/docs/knowledge-hub/decision-records/`
- **Build rules (Build Mode):** no silent redesign; implementation-first; AFR compliance
  per merge; docs updated alongside code; new architecture requires governed ADRs.
- **Discussion Mode** returns only for foundational changes (new RA, security redesign,
  identity model change, platform-wide strategy shift, Product Authority decision).

## Contribution Workflow

1. Read the relevant ADR/RA before changing anything.
2. Branch from `main`; implement; update docs alongside code.
3. Ensure AFR validation + `taskControllerTestSuite` pass.
4. Merge to `main` — sync propagates to GitHub.

## Release Process

Releases are tagged in Git. The frozen-foundation baseline is `v1.0-foundation-freeze`.
See [Build Manifest](src/docs/knowledge-hub/foundations/Build-Manifest.md) for the
quality gates and critical path.

## Documentation Index

| Topic | Location |
| :--- | :--- |
| Knowledge Hub (index) | `src/docs/knowledge-hub/README.md` |
| Master Vision | `src/docs/knowledge-hub/master-vision.md` |
| Frozen Foundations v1.0 | `src/docs/knowledge-hub/foundations/` |
| Reference Architectures | `src/docs/knowledge-hub/decision-records/RA-*.md` |
| ADRs (0001–0052) | `src/docs/knowledge-hub/decision-records/` |
| MVP Charter | `src/docs/knowledge-hub/foundations/MVP-Charter.md` |
| Build Manifest | `src/docs/knowledge-hub/foundations/Build-Manifest.md` |
| Golden UI/UX Standard | `src/docs/knowledge-hub/golden-ui-ux-standard.md` |
| Pilot Tenants | `src/docs/knowledge-hub/pilot-tenants.md` |
| Project Memory | `src/docs/PROJECT_MEMORY.md` |

## License

Proprietary — © Orbitan. All rights reserved. This repository is private and contains
Orbitan's proprietary intellectual property. Do not distribute.

---

**Docs & Support (platform):** [Base44 Docs](https://docs.base44.com) · [Base44 Support](https://app.base44.com/support)