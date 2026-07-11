# ADR-0018: Orbit Nexus AI Kill Switch Pattern

**Date:** 2026-07-11
**Status:** Accepted
**Impacted Modules:** SystemSettings (entity), nexus (backend function), useNexusAI (frontend hook), Shield Command Center (admin UI)

## Context

OrbitanOS needs the ability to instantly disable all AI intelligence across the platform — for emergency cost control, compliance investigations, model provider outages, or customer-requested AI opt-out. This is the "Kill Switch" pattern, similar to ServiceNow's ability to disable Now Assist globally.

The Kill Switch must:
1. Be instant — no redeployment required
2. Be global — affects all tenants (platform-level) or per-tenant (subscription-level)
3. Be graceful — OrbitanOS continues operating; only AI features disappear
4. Be auditable — who disabled AI, when, and why

## Decision

### 1. Global Kill Switch (Platform-Level)

**Field:** `SystemSettings.nexus_ai_enabled` (boolean, default: true)

When `false`:
- The nexus gateway returns `{ ai_disabled: true, message: "..." }` for every request
- No shield evaluation, no wallet debit, no service execution
- OrbitUsageTracker still logs the request with `status: 'ai_disabled'`
- All module pages using `useNexusAI` receive `ai_available: false`
- AI-augmented UI elements hide or show "AI disabled" notice

### 2. Per-Tenant Kill Switch (Subscription-Level)

**Field:** `OrbitanWallet.subscription_plan` + `SubscriptionPolicy.features.ai_suite_enabled`

- Orbitan Free plan: AI is disabled by subscription policy (not Kill Switch)
- Paid plans: AI enabled by subscription, but can be overridden by global Kill Switch
- Enterprise: AI enabled, but tenant admin can request AI opt-out (future: per-tenant `nexus_ai_enabled` override)

### 3. Kill Switch Evaluation Order (Nexus Gateway)

```
1. Authenticate user
2. CHECK KILL SWITCH → if disabled, return { ai_disabled: true } immediately
3. Shield governance gate
4. Wallet/credit check
5. Route to service function
6. Track usage + debit
```

The Kill Switch is checked BEFORE Shield and BEFORE wallet — it's the absolute highest-priority gate. This ensures:
- No credits are consumed when AI is disabled
- No shield policies are evaluated (avoids unnecessary processing)
- Instant response (no downstream calls)

### 4. Admin Interface

The Kill Switch is controlled from the **Shield Command Center** (`/platform/shield`):
- Toggle `nexus_ai_enabled` on/off
- Set `nexus_ai_disabled_reason` (internal, admin-only)
- Set `nexus_ai_disabled_message` (user-facing)
- All changes are logged to `AuditLog` with `action_type: 'ai_kill_switch_toggled'`

## Alternatives Considered

1. **Per-service kill switches** (disable individual AI services)
   - Rejected for MVP: Over-complicated. One global switch is sufficient.
   - Future: Individual service toggles can be added to the SERVICE_REGISTRY.

2. **Environment variable** (Deno.env for AI toggle)
   - Rejected: Requires redeployment. Kill Switch must be instant via database.

3. **Feature flag in code**
   - Rejected: Not dynamic. Admin needs to toggle from the UI without code changes.

## Trade-offs

**Positive:**
- Instant AI shutdown across the entire platform
- No redeployment, no code changes
- Fully auditable (SystemSettings is an entity with RLS + AuditLog)
- Graceful — OS continues working, only AI features hide
- Aligns with enterprise compliance requirements (SOC 2, ISO 27001)

**Negative:**
- Singleton entity read on every nexus request (mitigated: SystemSettings is small, cached by platform)
- No granular control per-tenant yet (future: add `nexus_ai_enabled` to Tenant entity)

## Future Roadmap

1. **Per-tenant AI toggle** — Add `nexus_ai_enabled` to Tenant entity for individual customer opt-out
2. **Per-service kill switches** — Individual toggles for AIReceipts, SOP Generator, etc.
3. **Scheduled AI windows** — Disable AI during off-hours for cost savings
4. **Kill Switch history** — Dedicated audit view showing all toggle events with reasons

## Future Review Date

**2026-09-01** — Evaluate whether per-tenant kill switch is needed for enterprise customers who want AI opt-out while the platform remains AI-enabled for others.

---

**Related ADRs:** ADR-0006 (Orbit Nexus Intelligence Platform), ADR-0017 (Graceful Degradation), ADR-0003 (Shield Governance Interceptor)