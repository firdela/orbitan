# ADR-0030: Contextual Help & Discoverability Component Standard

**Date:** 2026-07-15
**Status:** Accepted
**Principles:** Relate, Reach
**Related:** ADR-0024 (Universal Taxonomy & Navigation Standard), Golden UI/UX & Accessibility Standard

---

## Context

The Orbitan Master Development Directive mandates that every feature comply with the **Golden UI/UX & Accessibility Standard**, and specifically calls for:

1. **Contextual Help & Information** — an information ("i") icon or help element on widgets, dashboards, forms, modules, and reports that, when activated, explains the purpose, meaning, usage, importance, and tips for the feature.
2. **Interactive & Navigable Interface** — clickable widgets, stats, and dashboard components that drill down into relevant records, reports, or workflows.
3. **Responsive across desktop, tablet, and mobile** — every interaction must work on touch, keyboard, and mouse.

Prior to this ADR, OrbitanOS had no reusable, accessible component for contextual help. Pages relied on static subtitle text or inline descriptions, which led to either **clutter** (too much text on screen) or **discoverability gaps** (users unsure what a metric means or how to act on it).

## Decision

Establish two reusable, backward-compatible components as the single standard for contextual help across the entire Orbit ecosystem:

### 1. `ContextualHelp` (`src/components/shared/ContextualHelp.jsx`)
- **Rich, structured guidance** — supports `title`, `content` (main explanation), and `tips` (best-practice list).
- Renders as a small `Info` icon button that opens a **Popover** on click.
- Use on dashboard widgets, page headers, module cards, and reports where a multi-line explanation with optional tips adds genuine value.

### 2. `HelpHint` (`src/components/shared/HelpHint.jsx`)
- **Lightweight inline hint** — a single short string (1–2 sentences).
- Renders as a smaller `Info` icon that opens a compact Popover on click.
- Use next to form labels, table headers, and inline metrics where a full ContextualHelp block would be excessive.

### Integration Pattern
- `StatCard` and `PageHeader` accept an optional, backward-compatible `help` prop. When omitted, no help icon renders (existing pages are unaffected). When provided, a `ContextualHelp` icon renders inline next to the title.
- The `help` prop accepts either a plain string (rendered as `content`) or a structured object `{ title, content, tips }`.

### Trigger Mechanism: Click-based Popover (not hover Tooltip)
Both components use Radix `Popover` (click-to-open), **not** `Tooltip` (hover-to-open).

## Rationale

| Factor | Popover (click) ✓ | Tooltip (hover) ✗ |
|---|---|---|
| **Touch / Mobile** | Opens on tap, dismissable | Unreliable on touch devices |
| **Keyboard** | Focusable trigger, Opens on Enter/Space | Requires focus but can be fiddly |
| **Content capacity** | Holds structured title + body + tips | Best for ≤ 1 short line |
| **Accessibility** | Clear open/close state, screen-reader friendly | Transient, can be missed by SR users |
| **Discoverability** | Click implies intentionality | Hover can trigger accidentally |

The Golden Standard requires every interaction to work across mobile, tablet, and desktop. Hover-based tooltips fundamentally fail this test on touch-only devices. Click-to-open Popovers provide a single, consistent interaction model that satisfies all three input modalities.

## Alternatives Considered

1. **Hover-only Tooltips** — rejected: unusable on mobile/touch, limited content capacity, poor screen-reader experience.
2. **Inline static text** — rejected: clutters the interface; the directive explicitly warns against this ("avoid adding help indicators to elements that are already self-explanatory to keep the interface clean and uncluttered").
3. **Modal dialogs** — rejected: too heavy for a quick contextual hint; disrupts the user's flow.
4. **A single "Help" sidebar/drawer per page** — rejected: not contextual; loses the "right next to the metric" spatial relationship that makes contextual help effective.

## Trade-offs

- **Pro:** One consistent, accessible pattern across the entire platform; backward-compatible; scales to any future module or industry pack.
- **Pro:** Structured `tips` list gives tenants actionable best practices, reinforcing the Relate/Reach principles.
- **Con:** Click-to-open requires an explicit user action; users who don't click won't see the guidance. **Mitigation:** the Info icon is visually discoverable and placed directly next to the label it explains.
- **Con:** Slightly more DOM nodes per page when many help indicators are present. **Mitigation:** the directive limits help to genuinely beneficial contexts, preventing clutter and overuse.

## Verification

- ✅ `ContextualHelp` renders an accessible `<button>` with `aria-label`.
- ✅ Opens via click/Enter/Space (Radix Popover).
- ✅ Dismissable via Escape, outside-click, or explicit close.
- ✅ `StatCard`/`PageHeader` remain unchanged when `help` is omitted.
- ✅ First integration: Workforce Control Room page (`WorkforcePage.jsx`) — page header + four KPI cards carry structured contextual help.

## Interactive Drill-Down (Update — 2026-07-16)

The Golden Standard also requires dashboard widgets to be **clickable for drill-down** into the relevant records, reports, or workflows. To satisfy this alongside contextual help:

- `StatCard` now accepts an optional `to` (route) or `onClick` (handler) prop.
- When interactive, the card renders with `role="button"`, `tabIndex={0}`, Enter/Space keyboard activation, and visible hover/focus states (ring + border tint) — fully accessible without nested-link HTML.
- The `ContextualHelp` and `HelpHint` triggers call `e.stopPropagation()` + `e.preventDefault()` so clicking the info icon inside a clickable card opens help **without** triggering the card's navigation.
- This avoids invalid nested interactive elements (a button inside a link) while preserving both behaviours.

**First integrations:** Inventory (Low Stock card → filters to low-stock items), Workforce (Pending Requests card → jumps to access requests queue).

## Scalability Check

> *Will this still work when Orbit serves thousands of organisations, millions of users, multiple industries, and operates globally?*

Yes. The components are pure React with zero tenant-specific logic. Any future module, industry pack, or white-label deployment can adopt them by passing a `help` prop — no new component needed. The pattern is framework-agnostic and portable (Exit-Ready).

## Next Steps

- Roll out `help` props to remaining dashboard pages (Inventory, Procurement, Scheduling, Compliance, Reports) in priority order.
- Use `HelpHint` on form labels and table headers across entity-management pages.
- Track adoption in the Improvement Log.