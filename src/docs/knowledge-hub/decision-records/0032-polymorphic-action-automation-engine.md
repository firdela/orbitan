# ADR-0032: Polymorphic Action & Automation Engine

**Status:** Accepted
**Date:** 2026-07-17
**Principle:** Refine (automation, decoupling) + Regulate (governance-gated actions)
**Supersedes:** —
**Related:** ADR-0003 (Shield), ADR-0001 (Registry-Driven Architecture), ADR-0031 (Notification Pipeline)

---

## Context

As OrbitanOS grows beyond pilot tenants, the dominant source of technical
debt is **hardcoded event coupling** — one backend function directly calling
another (`procurement` → `walletEngine`, `shiftReminder` → inline email,
`stockLow` → inline PO creation). Every new automation requires bespoke code,
a redeploy, and risks breaking unrelated modules.

This does not scale when Orbitan serves thousands of organisations across
dozens of industries: each tenant may want a slightly different reaction to
the same business event (e.g. a retail tenant wants low-stock to *notify*,
an F&B tenant wants it to *auto-order*, an enterprise tenant wants it to
*route for approval*).

---

## Decision

Introduce a **Polymorphic Action Engine** with two registry entities:

1. **`AutomationRule`** — a tenant-scoped, JSON-defined rule that maps a
   *trigger event* (e.g. `inventory.threshold_breached`) to one or more
   *actions* (e.g. `create_purchase_order`, `send_notification`, `create_task`).
   Rules support conditions, cooldown windows, and are bound to a module +
   governance domain.

2. **An `actionDispatcher` backend function** that subscribes to entity-change
   events (via entity automations), evaluates matching `AutomationRule`
   records, runs them through the existing `shieldInterceptor` for governance
   checks, and executes the configured actions.

### Why a registry over inline coupling

- **Tenant-configurable:** a tenant admin adds an automation by creating an
  `AutomationRule` record — no code, no redeploy, no engineering ticket.
- **Decoupled:** modules emit events; they do not know what (if anything)
  listens. Adding a new subscriber never risks breaking the emitter.
- **Governance-gated by default:** every automated action passes through
  `shieldInterceptor`, so agentic / automated writes honour the same RBAC +
  threshold gates as human writes (ADR-0029).

### Alternatives considered

- *Refactor inline calls into a shared JS `actions` module:* reduces
  duplication but stays code-bound — still requires a redeploy for every new
  automation. **Rejected** — fails the "thousands of tenants" scalability test.
- *Full workflow engine (Temporal / Temporal-like):* maximum flexibility but
  over-built for the two-month MVP and adds operational complexity the
  platform does not yet need. **Deferred** — the `AutomationRule` contract is
  workflow-engine-compatible; we can swap the dispatcher internals later
  without touching emitters or rule definitions.

---

## Scope for MVP (Phase 1)

1. Create the `AutomationRule` entity (this ADR).
2. Wire the **Procurement → Wallet** flow as the reference integration:
   `PurchaseOrder` status change to `received` emits a `po.received` event;
   an `AutomationRule` debits the `OrbitanWallet` via `actionDispatcher`
   instead of the current inline `walletEngine` call.
3. The `actionDispatcher` function is created but only the `po.received` +
   `debit_wallet` action type is implemented initially. Additional action
  types (`create_task`, `send_notification`, `create_purchase_order`) are
  layered in subsequent phases.

This keeps the MVP surface small while proving the decoupled pattern end-to-end.

---

## Consequences

- **Positive:** New automations are data, not code. Tenant admins (and the
  Marketplace) can ship workflows without engineering cycles.
- **Positive:** Shield governance is enforced uniformly for human *and*
  automated actors — no backdoor.
- **Cost:** One new entity (`AutomationRule`), one new backend function
  (`actionDispatcher`), plus an entity automation on `PurchaseOrder`.
- **Risk:** Async dispatch adds a small latency vs. inline calls. Acceptable
  — financial integrity (Shield gating) outweighs sub-second latency.

---

## Verification

- An `AutomationRule` record with `trigger_event: "po.received"` and
  `action_type: "debit_wallet"` causes wallet debit when a PO is marked
  received — with no inline `walletEngine` call in the procurement code path.
- Disabling the rule stops the debit (proving decoupling).
- Shield `block` effect prevents the automated debit if governance policy
  is violated.