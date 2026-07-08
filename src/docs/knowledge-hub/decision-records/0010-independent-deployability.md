# ADR-0010: Independent Deployability (Interface-First Constraint)

**Date:** 2026-07-08
**Status:** Accepted
**Impacted Modules:** All frontend pages, all backend functions, all inter-module communication patterns

## Context

The Orbitan ecosystem vision requires that each Operating System (OrbitanOS, AquaOrbit, ChefOrbit) can be **independently built, deployed, updated, and exported as a standalone application**. Additionally, Orbit Nexus (the intelligence platform) must be offered as a standalone subscription product.

If OrbitanOS frontend pages directly import Nexus logic, or if backend functions make hardcoded assumptions about Nexus availability, the following risks emerge:

1. **Deployment coupling** — OrbitanOS cannot deploy without Nexus being present and operational.
2. **Export failure** — Exporting OrbitanOS as a standalone app would fail if it imports from a Nexus module that doesn't exist in the export.
3. **Standalone productisation blocked** — Nexus cannot be sold separately if OrbitanOS code is deeply intertwined with it.
4. **Testing complexity** — Cannot test OrbitanOS in isolation without spinning up the full Nexus stack.

## Alternatives Considered

1. **Direct import** (OrbitanOS pages import from `src/lib/nexus/` directly)
   - Rejected: Creates hard coupling. OrbitanOS cannot compile without Nexus modules present.
   - Rejected: Export of OrbitanOS alone would fail on missing imports.

2. **Shared library** (common code extracted to a shared npm package)
   - Rejected: Over-engineered for MVP. Adds build/publish complexity.
   - Deferred: Could be revisited for white-label deployments.

3. **Interface-First constraint** (all cross-module communication via `base44.functions.invoke`)
   - Selected: OrbitanOS and Nexus communicate exclusively through backend function calls.
   - Selected: No direct imports of Nexus code into OrbitanOS frontend or backend.
   - Selected: If Nexus is removed, OrbitanOS code still compiles — the function calls just fail gracefully at runtime (which can be caught and handled).

## Decision

Adopt the **Interface-First Constraint** for all cross-module communication:

### Rule 1: Frontend → Backend Communication
All OrbitanOS frontend pages communicate with Orbit Nexus exclusively via:
```javascript
await base44.functions.invoke('nexus', { service_key, ...params });
```
Never import Nexus logic directly:
```javascript
// FORBIDDEN:
import { processReceipt } from '@/lib/nexus/ocr';
// ALLOWED:
const result = await base44.functions.invoke('nexus', { service_key: 'ocr_receipt', file_url, tenant_id });
```

### Rule 2: Backend → Backend Communication
Backend functions communicate with each other via:
```javascript
await base44.functions.invoke('nexusFeedbackAnalyst', { issue_id });
```
Never via local imports (Deno deploy doesn't support local imports anyway):
```javascript
// FORBIDDEN (also fails at deploy time):
import { analyseFeedback } from './nexusFeedbackAnalyst/entry';
// ALLOWED:
const result = await base44.functions.invoke('nexusFeedbackAnalyst', { issue_id });
```

### Rule 3: Graceful Degradation
OrbitanOS must handle Nexus unavailability gracefully:
```javascript
try {
  const result = await base44.functions.invoke('nexus', { ... });
} catch (error) {
  // Show user: "This AI feature is temporarily unavailable."
  // Do NOT crash the page or block core operations.
}
```

### Rule 4: No Shared Frontend State
OrbitanOS and Nexus must not share frontend state (React context, stores). They communicate through API calls, not shared memory.

### Rule 5: Documentation
Every cross-module function call must document:
- **Function name** (e.g. `nexus`)
- **Service key** (e.g. `ocr_receipt`)
- **Input schema** (what params are expected)
- **Output schema** (what the response looks like)
- **Fallback behaviour** (what happens if the function is unavailable)

## Trade-offs

**Positive:**
- OrbitanOS can be exported/deployed independently — even if Nexus code is removed, the app compiles
- Orbit Nexus can be productised as a standalone subscription
- Clean testing — each module can be tested in isolation
- Clear API contracts between modules
- Aligns with Deno deploy constraints (no local imports anyway)

**Negative:**
- Slight performance overhead — extra function invocation vs. direct call (mitigated: Base44 functions are fast, and the gateway pattern already exists)
- More verbose — must define function interfaces rather than just calling imported code
- Error handling complexity — must catch and handle cross-module failures gracefully

## Existing Compliance

The current codebase already largely follows this pattern:
- `financeController` calls `base44.functions.invoke('shieldInterceptor', ...)` — ✅ compliant
- `integrationSync` calls `base44.asServiceRole.functions.invoke('xeroOAuth', ...)` — ✅ compliant
- Frontend pages call `base44.functions.invoke('financeController', ...)` — ✅ compliant
- `nexus` gateway function routes to individual service functions via `base44.functions.invoke()` — ✅ compliant

**No refactoring needed** — this ADR formalises the existing pattern as a binding architectural constraint for all future development.

## Future Review Date

**2026-12-01** — Evaluate whether the interface-first constraint needs adjustment when AquaOrbit/ChefOrbit development begins. Assess whether a formal API contract schema (OpenAPI-style) is needed for cross-module documentation.

---

**Related ADRs:** ADR-0008 (Orbit Naming Standards), ADR-0009 (Orbit Core Boundary), ADR-0006 (Orbit Nexus Intelligence Platform)