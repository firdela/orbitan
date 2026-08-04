---
title: Orbitan Design Principles
category: Design
owner: Product Architecture
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - GoldenUIUX.md
  - Accessibility.md
  - ResponsiveStandards.md
  - ../product/BrandGuidelines.md
tags:
  - design
  - philosophy
  - tokens
  - design-system
  - consistency
---

# Orbitan Design Principles

## Purpose

Defines the design philosophy, unified design language, tokens, navigation principles, and component standards.

## Design Philosophy

Orbitan should feel: **Modern · Professional · Premium · Enterprise-grade · Friendly · Clean · Efficient · Intelligent · Scalable · Consistent.**

Every interaction should reduce complexity, not introduce it. Clarity over decoration. Usability over unnecessary visual effects.

## One Unified Design Language

Consistency across: Colors · Typography · Icons · Buttons · Cards · Tables · Forms · Modals · Navigation · Layouts · Animations · Spacing · Shadows · Borders · Empty/Error/Success/Loading states.

Users should immediately recognise that every screen belongs to the Orbitan ecosystem.

## Tokens (Implemented in `src/index.css`)

### Surfaces
- **Titanium White (light bg):** `220 20% 97%`
- **Deep Titanium (dark sidebar):** `222 47% 9%`
- **Card:** `0 0% 100%`
- **Marketing Dark:** `222 47% 5%` (#0A0F1A)

### Primary
- **Orbit Blue:** `#2563EB` (`--primary: 221 83% 53%`)

### Typography
- **Headings/Display:** Sora
- **Body:** Inter
- **Mono:** `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas`

### Industry Pack Colours
- F&B: `#F97316` · Retail: `#22C55E` · Recycling: `#16A34A` · Healthcare: `#06B6D4`
- Education: `#8B5CF6` · Logistics: `#2563EB` · Construction: `#EAB308` · Technology: `#0F172A`

### Plan Colours
- Starter: `#2563EB` · Growth: `#10B981` · Business: `#7C3AED` · Enterprise: `#111827` + Gold `#D4AF37`

### Radius
- `--radius: 0.75rem` (slightly tighter for enterprise feel)

### Shadows
- `--shadow-card`: Subtle elevation
- `--shadow-card-hover`: Hover elevation
- `--shadow-modal`: Modal elevation

## Token Usage Rules

- **No hardcoded values in JSX.** Use token classes (`bg-primary`, `font-heading`, `text-foreground`).
- **No inline styles** for colours or fonts — use Tailwind classes mapped to tokens.
- **New tokens** only when semantic tokens aren't enough and the value is reused.
- **Safelist** in `tailwind.config.js` only for runtime-sourced values, never for classes in source.

## Navigation Principles

- Predictable · Consistent · Discoverable · Logical · Role-aware
- Users should never wonder: "Where am I?" / "What should I do next?" / "How do I go back?"
- Minimise navigation depth
- Manifest-driven navigation (PlatformManifest + ManifestHydrator)
- Graceful Lockout: locked modules visible but greyed out

## Component Standards

- shadcn/ui from `@/components/ui`
- Tailwind CSS for styling
- Lucide icons only (from `lucide-react`)
- Small focused files (50 lines or less per component)
- Every new component/page gets its own file
- Export every page/component as default

## Related Documents

- [GoldenUIUX.md](./GoldenUIUX.md) — Golden UI/UX Standard
- [Accessibility.md](./Accessibility.md) — WCAG compliance
- [ResponsiveStandards.md](./ResponsiveStandards.md) — Responsive breakpoints
- [../product/BrandGuidelines.md](../product/BrandGuidelines.md) — Brand identity