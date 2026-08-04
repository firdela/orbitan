---
title: Orbitan Accessibility Standard
category: Design
owner: Product Architecture
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - GoldenUIUX.md
  - DesignPrinciples.md
  - ResponsiveStandards.md
tags:
  - accessibility
  - WCAG
  - keyboard
  - screen-readers
  - ARIA
  - inclusive
---

# Orbitan Accessibility Standard

> **Supplement to:** [Orbitan-Experience-Architecture.md](./Orbitan-Experience-Architecture.md) — the canonical experience document. This document provides focused detail on WCAG compliance, keyboard, and screen reader standards.

## Purpose

Defines WCAG compliance requirements, keyboard navigation, screen reader support, colour contrast, typography, and the accessibility checklist.

## WCAG Compliance

Orbitan targets **WCAG 2.2 AA** compliance as a minimum (upgraded from 2.1 AA in Build: Experience Architecture v1.0). Accessibility is mandatory — never optional.

### WCAG 2.2 Additional Criteria (Implemented)

| Criterion | Description | Status |
|-----------|-------------|--------|
| 2.4.11 Focus Not Obscured (Minimum) | Focused elements are not hidden by sticky content | ✅ |
| 2.5.7 Dragging Movements | All drag operations have keyboard/tap alternatives | ✅ |
| 2.5.8 Target Size (Minimum) | Non-essential targets ≥ 24×24px; primary actions ≥ 44×44px | ✅ |
| 3.2.6 Consistent Help | Help mechanisms in consistent locations | ✅ |
| 3.3.7 Redundant Entry | Previously entered info auto-populated or selectable | ✅ |
| 3.3.8 Accessible Authentication | No cognitive function test for login | ✅ |

## Keyboard Navigation

- Full keyboard navigation for all interactive elements
- Logical focus order (DOM order)
- Visible keyboard focus indicators
- Focus trapping in modals/dialogs
- `Esc` key closes modals
- Tab/Shift+Tab navigates between elements
- Enter/Space activates buttons

## Screen Readers

- Semantic HTML (`<nav>`, `<main>`, `<section>`, `<button>`, `<label>`)
- ARIA labels where semantic HTML is insufficient
- `aria-label` on icon-only buttons
- `aria-describedby` for form help text
- `role` attributes for custom components
- Alt text for all images
- Live regions for dynamic content updates

## Colour

- High contrast ratios (minimum 4.5:1 for normal text, 3:1 for large text)
- Color-blind friendly: never rely on colour alone to convey information
- Use icons + text + colour together for status indicators
- Dark mode support with maintained contrast

## Typography

- Readable font sizes (minimum 16px for body text)
- Responsive text scaling
- Sufficient line height (1.5 for body text)
- Sora for headings, Inter for body
- No text smaller than 12px

## Accessibility Checklist

- [ ] Keyboard navigation works for all interactive elements
- [ ] Focus order is logical and visible
- [ ] Screen reader tested (VoiceOver/NVDA)
- [ ] All images have alt text
- [ ] Form labels are associated with inputs
- [ ] Error messages are announced to screen readers
- [ ] Colour contrast meets WCAG AA (4.5:1)
- [ ] Information is not conveyed by colour alone
- [ ] Touch targets are minimum 44×44px
- [ ] `prefers-reduced-motion` is respected
- [ ] Content is readable when zoomed to 200%
- [ ] Page has a logical heading structure (h1 → h2 → h3)
- [ ] Skip link is present for keyboard users
- [ ] ARIA attributes are used correctly (not redundantly)

## Design for Everyone

**Wheelchair users** · **PMD users** · **Elderly** · **Low vision** · **Blind** · **Hearing-impaired** · **Neurodivergent** · **Temporary injuries** · **First-time technology users**

## Related Documents

- [GoldenUIUX.md](./GoldenUIUX.md) — Golden UI/UX Standard
- [DesignPrinciples.md](./DesignPrinciples.md) — Design philosophy
- [ResponsiveStandards.md](./ResponsiveStandards.md) — Responsive design