---
title: Orbitan Brand Guidelines
category: Product
owner: Product Owner
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - NamingConventions.md
  - Marketing.md
  - ../design/GoldenUIUX.md
tags:
  - brand
  - logo
  - colours
  - typography
  - tone-of-voice
---

# Orbitan Brand Guidelines

## Purpose

Defines the visual and verbal identity for the Orbitan ecosystem — logo, colours, typography, icons, tone of voice, and marketing principles.

## Brand

**Orbitan** is the master brand. The organisation behind the ecosystem. The company.

**Customer-facing branding:**
> OrbitanOS by Orbitan
> Powered by: Orbit Core · Orbit Nexus · Orbit Shield · Orbit Connect · Orbit Builder

## Logo

- **3D Logo:** `https://media.base44.com/images/public/6a2153efb1a18d0ca28c3a39/7b205f7ab_Orbitan_3d_logo_transparent.png`
- **Mark only:** Use `LOGO_ASSETS.mark3D` from `src/lib/orbitan-identity.js`
- **Wordmark:** `OrbitanWordmark` component with size variants (xs, sm, md, lg, xl)
- **Variant:** `light` (dark backgrounds) or `dark` (light backgrounds)

## Colours

### Primary
- **Orbit Blue:** `#2563EB` (`--primary: 221 83% 53%`)

### Surfaces
- **Titanium White (light bg):** `220 20% 97%`
- **Deep Titanium (dark sidebar):** `222 47% 9%`
- **Marketing Dark:** `222 47% 5%` (#0A0F1A)

### Subscription Plan Colours
| Plan | Colour | Hex |
|------|--------|-----|
| Starter | Orbit Blue | `#2563EB` |
| Growth | Emerald | `#10B981` |
| Business | Violet | `#7C3AED` |
| Enterprise | Titanium + Gold | `#111827` + `#D4AF37` |

### Industry Pack Colours
| Pack | Colour | Hex |
|------|--------|-----|
| F&B | Orange | `#F97316` |
| Retail | Green | `#22C55E` |
| Recycling | Dark Green | `#16A34A` |
| Healthcare | Cyan | `#06B6D4` |
| Education | Violet | `#8B5CF6` |
| Logistics | Blue | `#2563EB` |
| Construction | Yellow | `#EAB308` |
| Technology | Black | `#0F172A` |

## Typography

- **Headings/Display:** Sora (`--font-heading`, `--font-display`)
- **Body:** Inter (`--font-body`)
- **Mono:** `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas`
- **Loaded via:** `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Sora:wght@400;500;600;700;800&display=swap');` in `src/index.css`

## Icons

- **Icon library:** `lucide-react` only
- Only icons that exist in the library — a nonexistent icon breaks the app

## Tone of Voice

- **Direct and practical** — No over-explanation
- **Professional but approachable** — Enterprise-grade without being cold
- **Confident** — The platform speaks with authority
- **Honest** — "Early Access" and "Pilot Programme" are stated openly

## Marketing Principles

See [Marketing.md](./Marketing.md) for full marketing principles.

## Do's

- Use "OrbitanOS" for the product, "Orbitan" for the company
- Use "Orbit" prefix for platform services
- Use Sora for headings, Inter for body
- Use Orbit Blue `#2563EB` as primary accent
- Use real pilot tenant industries in marketing

## Don'ts

- Don't create fictional companies, brands, or metrics
- Don't prefix every service with "Orbitan" (loses impact)
- Don't use hardcoded colour values in JSX — use token classes
- Don't use non-lucide icon libraries

## Related Documents

- [NamingConventions.md](./NamingConventions.md) — Dual-prefix naming standard
- [Marketing.md](./Marketing.md) — Marketing principles
- [../design/GoldenUIUX.md](../design/GoldenUIUX.md) — Golden UI/UX Standard