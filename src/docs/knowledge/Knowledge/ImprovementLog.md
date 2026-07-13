---
title: Orbitan Improvement Log
category: Knowledge
owner: Product Architecture
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - LessonsLearned.md
  - FutureIdeas.md
  - ../Architecture/OrbitEvolution.md
tags:
  - improvement
  - log
  - tracking
  - backlog
---

# Orbitan Improvement Log

## Purpose

Tracks identified improvements, their priority, status, and release. Each entry captures: date, problem, current state, proposal, reason, priority, status, and release.

## Improvement Entries

### IL-001: Task RLS Self-Reference (A-001)
- **Date:** 2026-07-11
- **Problem:** Task entity uses `full_name` for self-reference instead of `user.id`
- **Current:** `data.assigned_to_name === {{user.full_name}}`
- **Proposal:** Change to `data.assigned_to === {{user.id}}`
- **Reason:** `full_name` is mutable and non-unique; risk of cross-user task visibility
- **Priority:** Medium (not blocking pilot launch; must fix before enterprise)
- **Status:** Flagged — pending frontend verification
- **Release:** Target Sprint 5 or post-MVP

### IL-002: Duplicate Routes
- **Date:** 2026-07-11
- **Problem:** Both `/outlet/*` and `/workspace/:tenantId/*` serve the same pages
- **Current:** Both route sets active for backward compatibility
- **Proposal:** Deprecate `/outlet/*` routes; redirect to `/workspace/:tenantId/*`
- **Reason:** Duplicate routes cause confusion and maintenance burden
- **Priority:** Low (not blocking; cleanup task)
- **Status:** Identified — migration plan needed
- **Release:** Post-MVP

### IL-003: Manifest Fallback Monitoring
- **Date:** 2026-07-11
- **Problem:** ManifestHydrator falls back to hardcoded nav when PlatformManifest lookup fails
- **Current:** Intentional safety net, but not monitored
- **Proposal:** Add logging/monitoring when fallback is triggered
- **Reason:** Fallback should be rare; frequent fallback indicates a problem
- **Priority:** Low
- **Status:** Identified
- **Release:** Post-MVP

## How to Add Entries

```markdown
### IL-XXX: [Title]
- **Date:** YYYY-MM-DD
- **Problem:** [What's wrong or could be better]
- **Current:** [How it works now]
- **Proposal:** [What should change]
- **Reason:** [Why this matters]
- **Priority:** low | medium | high | critical
- **Status:** identified | in-progress | implemented | deferred
- **Release:** [Target release/sprint]
```

## Related Documents

- [LessonsLearned.md](./LessonsLearned.md) — Lessons learned
- [FutureIdeas.md](./FutureIdeas.md) — Future ideas
- [../Architecture/OrbitEvolution.md](../Architecture/OrbitEvolution.md) — Continuous improvement loop