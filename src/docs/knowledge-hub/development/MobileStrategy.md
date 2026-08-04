---
title: Orbitan Mobile Strategy
category: Development
owner: Product Architecture
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - ../design/ResponsiveStandards.md
  - ../architecture/PerformanceStandards.md
  - ReleaseProcess.md
tags:
  - mobile
  - PWA
  - iOS
  - Android
  - service-worker
  - installable
---

# Orbitan Mobile Strategy

## Purpose

Defines the complete PWA (Progressive Web App) strategy for OrbitanOS — installable on iOS and Android from the same codebase.

## PWA Architecture

OrbitanOS is a **Progressive Web App** — a single codebase that installs on iOS and Android like a native app, without the overhead of maintaining separate native apps.

### Components

- **`public/sw.js`** — Service worker for offline caching and background updates
- **`public/manifest.json`** — PWA manifest defining app name, icons, colors, and display mode
- **`PWAUpdateListener` component** — Detects new service worker versions and prompts users to update
- **Responsive design** — All screens work on mobile, tablet, and desktop (see [ResponsiveStandards.md](../design/ResponsiveStandards.md))

## Installation

- **iOS:** Safari → Add to Home Screen
- **Android:** Chrome → Install App
- **Desktop:** Chrome/Edge → Install
- No App Store / Google Play submission required
- App-like experience: no browser chrome, full screen, splash screen

## Offline Capabilities

- Service worker caches app shell (HTML, CSS, JS)
- TanStack Query caches entity data for offline viewing
- Write operations require connectivity (online-first)
- Full offline mode is not a current goal — the platform is online-first

## Safe Area Insets

The PWA respects device safe areas (notches, home indicators):
```css
padding: env(safe-area-inset-top) env(safe-area-inset-right)
         env(safe-area-inset-bottom) env(safe-area-inset-left);
```

## Mobile-First Principles

1. **Design for the smallest screen first** — enhance upward
2. **Touch targets minimum 44×44px**
3. **Bottom-anchored actions** for thumb reach
4. **Collapsible navigation** (hamburger menu)
5. **Full-width forms** on mobile
6. **Swipe gestures** where appropriate
7. **No hover-dependent interactions** — everything must work with touch

## Performance

- Service worker enables instant app shell loading on repeat visits
- Lazy loading for heavy components
- Responsive images
- Minimal JavaScript bundle (Vite tree-shaking)

## Future: Native Apps (Post-MVP)

If pilot feedback indicates a need for native features (push notifications, biometric auth, background processing), native apps (React Native / Expo) can be considered. The PWA architecture does not block this path.

## Related Documents

- [../design/ResponsiveStandards.md](../design/ResponsiveStandards.md) — Responsive breakpoints
- [../architecture/PerformanceStandards.md](../architecture/PerformanceStandards.md) — Performance standards
- [ReleaseProcess.md](./ReleaseProcess.md) — Release process