---
title: Orbitan Responsive Standards
category: Design
owner: Product Architecture
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - GoldenUIUX.md
  - DesignPrinciples.md
  - ../architecture/PerformanceStandards.md
tags:
  - responsive
  - mobile
  - tablet
  - desktop
  - PWA
  - breakpoints
---

# Orbitan Responsive Standards

## Purpose

Defines responsive breakpoints, mobile-first principles, PWA strategy, and device-specific standards.

## Mobile-First

OrbitanOS is designed mobile-first. Every screen must work seamlessly on mobile before desktop enhancement. The platform is a PWA — installable on iOS/Android from the same codebase.

## Breakpoints

| Device | Tailwind Prefix | Min Width |
|--------|----------------|-----------|
| Mobile (default) | (none) | 0px |
| Tablet | `sm:` | 640px |
| Laptop | `md:` | 768px |
| Desktop | `lg:` | 1024px |
| Large | `xl:` | 1280px |
| Extra Large | `2xl:` | 1536px |

## Device Support

### Mobile
- Single column layouts
- Bottom-anchored actions
- Touch-friendly targets (min 44×44px)
- Collapsible navigation (hamburger menu)
- Swipe gestures where appropriate
- Full-width forms and cards

### Tablet
- Two-column layouts where appropriate
- Larger touch targets
- Side navigation visible
- Modal dialogs centered

### Desktop
- Multi-column layouts
- Sidebar navigation persistent
- Hover states
- Keyboard shortcuts
- Dense data tables with horizontal scroll

### Large Screens
- Max-width containers for readability
- Multi-panel layouts
- Dashboard grids

### Foldables
- Responsive layouts adapt naturally
- No special handling required (CSS handles reflow)

## PWA (Progressive Web App)

- `public/sw.js` — Service worker for offline caching
- `public/manifest.json` — PWA manifest for installability
- `PWAUpdateListener` component prompts users to update
- Installable on iOS/Android from browser
- App-like experience: no browser chrome, full screen, splash screen

## Responsive Principles

1. **Design for the smallest screen first** — enhance upward
2. **Touch targets minimum 44×44px** on all devices
3. **Text must be readable** at all breakpoints
4. **Navigation adapts** — collapsible on mobile, persistent on desktop
5. **Forms stack vertically** on mobile, can be inline on desktop
6. **Tables scroll horizontally** on mobile, expand on desktop
7. **Images are responsive** — use `max-width: 100%` and lazy loading
8. **Safe area insets** respected (notches, home indicators) via `env(safe-area-inset-*)`

## Testing

- Test on real devices (iOS Safari, Android Chrome)
- Use Chrome DevTools device emulation for rapid iteration
- Test landscape and portrait orientations
- Verify touch interactions work without hover
- Test keyboard navigation on desktop

## Related Documents

- [GoldenUIUX.md](./GoldenUIUX.md) — Golden UI/UX Standard
- [DesignPrinciples.md](./DesignPrinciples.md) — Design philosophy
- [../architecture/PerformanceStandards.md](../architecture/PerformanceStandards.md) — PWA performance