---
title: Orbitan Lessons Learned
category: Knowledge
owner: Product Owner
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - ImprovementLog.md
  - FutureIdeas.md
  - FounderNotes.md
tags:
  - lessons
  - continuous-learning
  - pilot
  - development
---

# Orbitan Lessons Learned

## Purpose

Captures continuous lessons from development and pilot operations. Each lesson is a takeaway that should inform future decisions.

## Architecture Lessons

### 1. Registry-Driven Architecture Works
Adding an industry should be a database record, not a code change. This has proven correct — the `ActivationRegistry` pattern allows new industry packs without deployments. (ADR-0001)

### 2. Wallet-Native Ledger Enables All Market Segments
By making OrbitanOS the master ledger (not Xero/QuickBooks), the platform works for HBBs with no ERP and enterprises with Xero. This was the right decision. (ADR-0002)

### 3. Interface-First Constraint Prevents Coupling
All cross-module communication via `base44.functions.invoke()` has kept OrbitanOS and Orbit Nexus independently deployable. No direct imports between modules. (ADR-0010)

### 4. Dynamic Routing Eliminates Tenant Duplication
Moving from hardcoded per-tenant routes to `/workspace/:tenantId/*` eliminated 28 duplicate page files. Adding a tenant = zero code changes. (ADR-0004)

### 5. Manifest-Driven Navigation Scales
Navigation as data (PlatformManifest) not code has proven scalable — adding a module is a manifest record, not a code change. (ADR-0005)

## Security Lessons

### 6. RLS Must Use Immutable IDs
The Task entity uses `full_name` for self-reference, which is mutable and non-unique. Always use `{{user.id}}` (immutable, unique) for self-reference patterns. (ADR-0016, Finding A-001)

### 7. `$in` Operator Not Supported in Base44 RLS
Multiple entities used `$in` in RLS role checks, which the Base44 engine doesn't support. Must use explicit `$or` blocks. (ADR-0016)

## AI Lessons

### 8. AI Must Be Optional
OrbitanOS works fully without AI. AI is an enhancement layer, not a dependency. This is the right architecture — it makes the platform sellable to customers who don't want AI. (ADR-0017)

### 9. Kill Switch Is Essential
The AI kill switch (`SystemSettings.nexus_ai_enabled`) provides instant global AI shutdown without redeployment. This is critical for cost control, compliance, and emergency response. (ADR-0018)

## Product Lessons

### 10. Build Less, Validate More
The MVP discipline of "Build less. Validate more." has kept the team focused. Features explicitly out of MVP scope (marketplace, advanced AI agents, white-labelling) are deferred correctly.

### 11. No Fictional Data
Never create fake companies, brands, outlets, or employees. Use "Pending Setup" / "Coming Soon" placeholders. This ensures the platform is built on real-world structures. (Pilot Programme rules)

### 12. Naming Matters Early
Establishing the dual-prefix naming convention ("Orbitan" for brand, "Orbit" for services) early prevented brand dilution. Locking this with ADR-0013 ensured Stripe products, codebase, and UI all aligned.

## Pilot Lessons

### 13. Pilot Tenants Are Not the Product
The pilot tenants (Taqueria, Renewed Resources, Renewed Fashion, Izaliqa Bakes) are validation environments. Future paying customers are the primary market. Never hardcode pilot tenant logic into platform code.

### 14. Real-World Feedback Drives Prioritisation
The `IssueLog` → `nexusFeedbackAnalyst` → product backlog loop has proven effective. AI-analysed feedback (sentiment, priority, duplicates) helps prioritise the right work.

## Development Lessons

### 15. ESM Only
Vite is an ESM project. Never use `require()` or `module.exports` — they break the build. (Development Rules)

### 16. Tailwind Purges Dynamic Classes
Tailwind purges anything not found as a literal substring. `bg-${color}-500` silently disappears. Always write full class names. (Development Rules)

### 17. shadcn/ui Imports Are Per-File
Each shadcn file exports only its own primitives. Import each from its own file. One ui file never re-exports another. (Development Rules)

## Related Documents

- [ImprovementLog.md](./ImprovementLog.md) — Tracked improvements
- [FutureIdeas.md](./FutureIdeas.md) — Future ideas
- [FounderNotes.md](./FounderNotes.md) — Founder strategic thinking