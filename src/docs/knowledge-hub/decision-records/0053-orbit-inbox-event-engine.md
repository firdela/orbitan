# ADR-0053: Orbit Inbox & Event Engine

**Date:** 2026-07-26
**Status:** Accepted
**Supersedes:** Extends ADR-0031 (Unified Notification Pipeline)
**Decider:** Muhammad Firdaus Bin Ismail (Founder)
**Related:** ADR-0031, ADR-0047 (OSF), ADR-0044 (Platform Intelligence), MVP Charter

## Context

OrbitanOS is evolving into a multi-domain AI-native Workforce OS spanning Workforce, Inventory, Finance, Procurement, CRM, Customer Success, Compliance, AI, Marketplace, and Industry Packs. A traditional "Notification Centre" would become cluttered as the platform grows and would conflate three distinct concerns:

1. **What happened** (the platform event)
2. **Who should see it and what state it's in** (the user's inbox)
3. **How it reaches them** (the delivery channel)

The existing `NotificationTemplate` + `notificationDispatcher` infrastructure (ADR-0031) decoupled trigger from email delivery, but had two gaps:
- No persisted per-recipient inbox state (read/unread/pin/archive)
- The `in_app` channel was reserved but not implemented (no inbox record was created)

## Decision

Adopt a **four-layer event-first architecture** with clean separation:

```
Platform Events (source engines + entity automations)
        ↓
Orbit Notification Engine (extended notificationDispatcher)
        ↓
   ┌────────┴────────┐
Orbit Inbox        Delivery Channels
(persisted,        (email now · push/sms/teams/
 per-recipient)     slack/whatsapp/webhook/marketplace later)
        ↓
Orbit Nexus (prioritisation + AI summary)
```

### 1. Orbit Inbox — Two New Entities

**`OrbitInbox`** — one record per recipient per platform event. Carries:
- `recipient_user_id`, `category`, `event_type`, `title`, `body`
- `priority` (deterministic, from template) + `ai_priority` (reserved for Orbit Nexus batch re-prioritisation)
- `is_actionable` + `action_type` + `action_state` (pending/completed/dismissed)
- `read_at`, `pinned`, `archived_at`
- `source_entity`, `source_id`, `link` (provenance — no source business data duplicated)
- `metadata` (event context), `channels_delivered`, `template_key`

**`NotificationPreference`** — per-user per-category delivery preferences: `email_enabled`, `push_enabled`, `in_app_enabled`, `muted`, `digest_mode`, `min_priority`.

### 2. Orbit Notification Engine — Extended notificationDispatcher

The dispatcher (not a new function) gains:
- **Event adapters** — a map from `entity_name` → `{ template_key, resolver, context }`. The adapter only reads fields already on the source record (no business logic duplicated).
- **Recipient resolution** — `{ type: 'outlet_managers' | 'tenant_admins' | 'assignee' | 'explicit' }` queries the User entity.
- **`in_app` delivery** — creates an `OrbitInbox` record per recipient.
- **Preference gating** — checks `NotificationPreference` (muted, min_priority) before creating inbox items.
- **Future channels** (push/sms/slack/teams/whatsapp/webhook) are reserved stubs — the trigger contract does not change when adapters arrive.

### 3. Actionable vs Informational — Three Inbox Sections

| Section | Membership rule |
|---------|----------------|
| **Needs My Action** | `is_actionable && action_state==='pending' && !archived_at` |
| **Activity** | `!is_actionable && !archived_at` |
| **Archived** | `archived_at != null` OR `action_state !== 'pending'` |

Completing or dismissing an action auto-archives it.

### 4. AI Prioritisation — Cost-Controlled

- **Deterministic brief** (always-on, zero credits): counts of actionable items by category.
- **On-demand Orbit Nexus summary** (user-initiated `InvokeLLM`): synthesises pending action items in 2-3 sentences. Credits spent only when the user requests it.
- **`ai_priority` + noise filter** fields reserved for future batch re-prioritisation job (deferred until data volume justifies LLM credits).

### 5. Event Wiring — Entity Automations

Three entity automations route platform events to the engine (decoupled, reliable):
- `ReplenishmentAlert` create → engine (resolver: `outlet_managers`, category: `inventory`, actionable)
- `Task` create → engine (resolver: `assignee`, category: `assignment`, actionable)
- `ComplianceRecord` update→overdue → engine (resolver: `outlet_managers`, category: `compliance`, actionable)

Existing engines are untouched — no risk to validated business logic.

## Alternatives Considered

| Alternative | Why not |
|-----------|---------|
| Keep aggregating from source entities (Announcement, ReplenishmentAlert, Task) | Cannot mark-as-read without mutating source data; cannot mute by category; mentions/approvals have no source entity; does not scale |
| Separate `PlatformEvent` ledger entity for MVP | Over-engineering — AuditLog + OrbitInbox provenance cover audit. Re-evaluate at Build #5 (Activity Timeline). Reversible. |
| Per-notification LLM prioritisation | Credit cost × every event = expensive and slow. Deterministic mapping is explainable and instant. Reserved for future batch job. |
| New `orbitEventRouter` function + keep dispatcher for delivery | Adds inter-function invocation complexity. Single extended dispatcher is simpler and equally clean. |
| Build all delivery channels now (Slack/Teams/WhatsApp) | Premature — each requires its own integration + OAuth. Architecture is ready; adapters deferred to per-integration builds. |

## Consequences

**Positive:**
- Orbit Inbox scales to every future domain without redesign (events, not notifications).
- Adding a delivery channel = a new adapter, not an inbox redesign.
- Per-recipient state enables read/unread/pin/archive/preferences.
- Deterministic priority is explainable; AI is opt-in and cost-controlled.
- Provenance stored on inbox records enables future Activity Timeline.

**Negative / Trade-offs:**
- Two new entities (acceptable — both pure schema, exit-ready).
- Inbox records are per-recipient (one per user per event) — storage grows with user count. Acceptable for MVP scale; archive + periodic purge mitigate.
- Event automations fire the function on every matching event — the adapter quickly returns `null` for non-notifiable events, but there is invocation overhead. Acceptable for MVP volume.

## Security & Privacy

- **RLS:** OrbitInbox is recipient-scoped (`recipient_user_id === user.id`) + tenant-scoped; only admins see all. NotificationPreference is user-scoped.
- **No source data duplication:** the inbox stores a resolved human-readable summary + provenance, not raw source records.
- **Preference privacy:** preferences are per-user; no admin can read another user's preferences (only their own + admin override).

## Future Evolution

- **Build #5 (Activity Timeline & Audit Centre):** may introduce a dedicated `PlatformEvent` ledger if analytics demand it — OrbitInbox provenance already seeds this.
- **Delivery adapters:** Slack, Teams, WhatsApp, SMS, push (PWA) — each a future build; engine contract unchanged.
- **Digest scheduling:** scheduled automation for `digest_mode` (daily/weekly email bundles).
- **Batch AI re-prioritisation:** scheduled `nexusIntelligence` job to classify `ai_priority` + `is_noise` across historical items.