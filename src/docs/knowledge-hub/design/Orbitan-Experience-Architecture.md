---
title: Orbitan Experience Architecture
category: Design
owner: Product Architecture
status: Active
version: 1.0
last_updated: 2026-08-04
related:
  - ../golden-ui-ux-standard.md
  - DesignPrinciples.md
  - Accessibility.md
  - ResponsiveStandards.md
  - ../product/BrandGuidelines.md
  - ../product/NamingConventions.md
tags:
  - experience-architecture
  - design-system
  - brand
  - logo
  - iconography
  - tokens
  - accessibility
  - WCAG-2.2
---

# Orbitan Experience Architecture v1.0

> **Canonical document.** This is the single source of truth for the Orbitan
> experience — visual identity, interaction, accessibility, motion, and asset
> standards. Older design documents (Golden UI/UX Standard, Design Principles,
> Accessibility, Responsive Standards, Brand Guidelines) remain as focused
> supplements and are cross-referenced below. Where any conflict arises, this
> document prevails.

---

## 1. Experience Purpose

Orbitan exists to **reduce operational complexity for modern organisations**.

Every screen, interaction, and asset must serve one of three goals:

| Goal | Description |
|------|-------------|
| **Clarity** | The user instantly understands what they are looking at, what they can do, and what happens next. |
| **Confidence** | The user trusts the platform — data is accurate, actions are reversible or confirmed, security is visible. |
| **Momentum** | The user moves through workflows with minimal friction — the platform gets out of the way. |

When a design decision serves none of these goals, it should not exist.

---

## 2. Engineered Simplicity

Orbitan's design philosophy is **Engineered Simplicity** — the discipline of making complex, multi-tenant, multi-industry workforce operations feel effortless.

**Principles:**

1. **Reduce, don't add.** Every element on screen must earn its place. If a user can complete a task without a visual element, remove it.
2. **Progressive disclosure.** Show what is needed now. Reveal complexity on demand — never all at once.
3. **Consistent over novel.** A pattern the user has seen before is faster to use than a new one, even if the new one is technically better.
4. **System over improvisation.** Every colour, spacing, radius, shadow, and animation comes from a token — never improvised.
5. **Accessible by default.** Accessibility is not a checklist item; it is a design constraint that shapes every decision from the start.

---

## 3. Orbitan Visual DNA

The Orbitan visual identity is built on four pillars:

### 3.1 Titanium Architecture
- **Light surfaces:** "Titanium White" (`220 20% 97%`) — warm, premium, non-clinical.
- **Dark surfaces:** "Deep Titanium" (`222 47% 9%`) — confident, focused, enterprise-grade.
- **Marketing dark:** `222 47% 5%` (#0A0F1A) — immersive, cinematic, for public-facing pages.

### 3.2 Orbit Geometry
- The **Orbit Ring** — six colour-segmented arcs representing the 6-R Operating Cycle (Renew · Relate · Respond · Refine · Regulate · Reach).
- The ring is the only original vector brand element. It appears in the `OrbitanLoader` component and the SVG favicon.
- The **Orbitan 3D mark** (approved raster master) is the primary logo. Its geometry is immutable — it must never be redrawn, traced, or approximated.

### 3.3 Engineering Drafting Language
- Subtle grid overlays on marketing surfaces (1px lines at 6-8% opacity).
- Monospace labels for technical metadata (IDs, dates, reference numbers).
- Precision in spacing — 4px/8px/12px/16px/24px/32px rhythm.

### 3.4 Premium Restraint
- Shadows are subtle, not theatrical (`--shadow-card` / `--shadow-card-hover`).
- Borders are light, not heavy (`220 18% 89%`).
- Colour is purposeful — Orbit Blue is the action colour; everything else is neutral or semantic.

---

## 4. Interaction Principles

| Principle | Rule |
|-----------|------|
| **Immediate feedback** | Every user action receives a visual response within 100ms (optimistic UI, loading spinners, button states). |
| **Reversible by default** | Destructive actions require confirmation. Non-destructive actions are immediate. |
| **Keyboard-first** | Every interactive element is operable by keyboard. Tab order follows visual order. |
| **Touch-friendly** | Minimum 44×44px touch targets on all devices. |
| **Context-preserving** | Navigation never loses the user's context — filters, scroll position, and form data are preserved. |
| **Error-preventing** | Forms validate in real-time. Invalid states are prevented before submission, not after. |
| **Motion-purposeful** | Animation guides attention or indicates state change. Never decorative. Respects `prefers-reduced-motion`. |

---

## 5. Product-Family Inheritance

All products in the Orbit ecosystem inherit the Orbitan visual DNA:

| Product | Inherits | Distinguishes |
|---------|----------|----------------|
| **OrbitanOS** | Full design system | Orbit Blue primary, 6-R ring, Sora/Inter typography |
| **Orbit Nexus** | Geometry, typography, tokens | Intelligence-blue accent, brain/network motif (approved raster only) |
| **Orbit Shield** | Geometry, typography | Regulate-red accent, shield motif |
| **Orbit Connect** | Geometry, typography | Integration-blue accent, connector motif |
| **Orbit Wallet** | Geometry, typography | Enterprise-gold accent, ledger motif |
| **Future products** | Must inherit tokens, typography, spacing, radius, shadow, and motion. Differ only by accent colour and motif. |

**Rule:** No product may introduce a new font, border radius, shadow system, or spacing scale. Product identity is expressed through accent colour and motif only.

---

## 6. Logo System

### 6.1 Approved Masters

| Asset | URL | Usage |
|-------|-----|-------|
| **Orbitan 3D Mark (transparent)** | `https://media.base44.com/images/public/6a2153efb1a18d0ca28c3a39/7b205f7ab_Orbitan_3d_logo_transparent.png` | Primary mark — `LOGO_ASSETS.mark` / `mark3D` in `orbitan-identity.js` |
| **Blue Circular Mark (on black)** | `https://media.base44.com/images/public/6a2153efb1a18d0ca28c3a39/10527badf_bluecircularlogoonblac.png` | Loader centre — `OrbitanLoader.jsx` |
| **3D Logo (opaque)** | `https://media.base44.com/images/public/6a2153efb1a18d0ca28c3a39/86d84f31e_Orbitan3dlogo.png` | Favicon, apple-touch-icon, PWA icon |
| **3D Logo transparent (copy)** | `https://media.base44.com/images/public/6a2153efb1a18d0ca28c3a39/16aaf935a_Orbitan3dlogotransparentcopy.png` | Alternate favicon |

> **Limitation:** No vector (SVG) master of the Orbitan 3D mark exists. All approved masters are raster PNGs hosted on the Base44 CDN. Vector reconstruction is pending. Do not create SVG approximations of the 3D mark.

### 6.2 Logo Variants

| Variant | Source | Status |
|---------|--------|--------|
| Primary symbol (3D, transparent) | CDN master | ✅ Approved |
| Wordmark | `OrbitanWordmark` component (typographic, Sora Bold) | ✅ Approved |
| Horizontal lockup | `OrbitanLogo` component (symbol + wordmark side-by-side) | ✅ Approved |
| Monochrome dark | Not available — use wordmark with `variant="dark"` on light backgrounds | ⚠️ Pending |
| Monochrome light | Not available — use wordmark with `variant="light"` on dark backgrounds | ⚠️ Pending |
| Transparent background | CDN master is transparent PNG | ✅ Approved |

### 6.3 Clear Space

- Minimum clear space = the height of the symbol's "O" on all sides.
- No element (text, image, edge) may enter the clear space.

### 6.4 Minimum Digital Size

| Context | Minimum |
|---------|---------|
| Favicon | 16×16px (use raster master) |
| Navigation bar | 24×24px symbol |
| Full lockup | 120px wide |
| Marketing hero | 200px+ symbol |

### 6.5 Small-Size Optical Guidance

- Below 32px, use the symbol only (no wordmark).
- Below 24px, the 3D mark may lose detail — the Orbit Ring SVG favicon is the preferred brand element at favicon sizes.
- Below 16px, use the Orbit Ring SVG (6 colour segments become a single recognizable ring).

### 6.6 Incorrect Use

- ❌ Do not redraw, trace, or recreate the 3D mark as SVG.
- ❌ Do not change the mark's colour, proportions, or orientation.
- ❌ Do not add drop shadows, glows, or filters beyond the approved `drop-shadow-sm`.
- ❌ Do not stretch, compress, or distort the mark.
- ❌ Do not place the mark on busy backgrounds without a solid or blurred container.
- ❌ Do not insert the Orbit Nexus brain into the Orbitan master logo.

---

## 7. Product Logo System

### 7.1 OrbitanOS

- **Lockup:** Orbitan symbol + "Orbitan**OS**" wordmark (Sora Bold, "OS" in Sora Light at 35% opacity).
- **Component:** `OrbitanLogo` with `showOS={true}`.
- **Tagline:** "Operating System" (Sora, uppercase, `tracking-[0.1em]`, muted-foreground).

### 7.2 Orbit Nexus

- **Approved master:** `https://media.base44.com/images/public/6a2153efb1a18d0ca28c3a39/563ef4f42_OrbitNexusLogo.png` (referenced as `LOGO_ASSETS.nexusLogo`).
- **Design requirement:** The central brain/network must feel designed with the Orbitan symbol, not pasted on top. No unattractive physical joints connecting the brain to the surrounding R elements. Use visual alignment, negative space, weight, rhythm, and geometry to create unity.
- **Limitation:** The approved Orbit Nexus master is a raster PNG. No SVG vector master exists. Do not silently redesign it.

### 7.3 Product Lockup Rules

- Product logos always pair the Orbitan symbol with the product wordmark.
- The Orbitan symbol is never replaced by a product-specific icon in the lockup.
- Product accent colours apply only to the wordmark suffix, not the symbol.

---

## 8. App-Icon System

### 8.1 Current State

| Size | Source | Status |
|------|--------|--------|
| 192×192 | CDN raster (`86d84f31e_Orbitan3dlogo.png`) | ✅ Wired in manifest.json |
| 512×512 | CDN raster (same URL) | ✅ Wired in manifest.json |
| Maskable 192 | — | ❌ Missing |
| Maskable 512 | — | ❌ Missing |
| Apple Touch (180×180) | CDN raster (same URL, not sized) | ⚠️ Using non-sized CDN PNG |
| iOS Master (1024×1024) | — | ❌ Missing |

### 8.2 Requirements (Pending Vector Master)

- **Maskable icons** require a safe-zone design (80% inner circle) that cannot be derived from the 3D mark without a vector source.
- **iOS 1024×1024** requires a square-optimized composition.
- **Android adaptive icons** require foreground/background separation.
- **Status:** All derivative app icons are pending the availability of a vector master. The existing CDN raster is used as-is for PWA installability. This is a documented limitation, not a defect.

---

## 9. Favicon System

### 9.1 Current Implementation

| Asset | Location | Status |
|-------|----------|--------|
| `favicon.svg` | `public/favicon.svg` | ✅ Orbit Ring brand element (original vector, not a logo redraw) |
| `favicon.ico` | — | ❌ Pending (requires multi-size raster export from vector master) |
| `favicon-16x16.png` | — | ❌ Pending |
| `favicon-32x32.png` | — | ❌ Pending |
| `favicon-48x48.png` | — | ❌ Pending |
| CDN fallback | `16aaf935a_Orbitan3dlogotransparentcopy.png` | ✅ Wired as PNG fallback in index.html |

### 9.2 SVG Favicon Design

The `favicon.svg` is an original Orbitan brand element — the **Orbit Ring** — not a redraw of the 3D logo. It uses the 6-R principle colours as six arcs around a transparent centre. This element is already established in the `OrbitanLoader` component and is a legitimate, independent brand symbol.

### 9.3 Priority Order

Browsers request favicons in this priority:
1. `favicon.svg` (modern browsers — crisp at all sizes)
2. `favicon.ico` (legacy — IE, older Safari)
3. `favicon-32x32.png` (Android Chrome, older browsers)
4. CDN PNG fallback (current)

---

## 10. Iconography System

### 10.1 Library

- **Primary and only library:** `lucide-react` (v0.475.0).
- Only icons that exist in the library may be used — a nonexistent icon breaks the entire app.
- No other icon libraries are permitted.

### 10.2 Usage Rules

| Category | Style | Guidance |
|----------|-------|----------|
| **Action icons** | Outlined (default) | Save, Delete, Edit, Create — outlined lucide icons |
| **Navigation icons** | Outlined | Home, Settings, Users, Calendar — consistent stroke weight |
| **Status icons** | Filled where available | CheckCircle, XCircle, AlertTriangle, Info — use filled variants for emphasis |
| **AI icons** | Outlined | Sparkles, Brain, Bot — lucide provides these |
| **Security icons** | Outlined | Shield, Lock, Key — consistent with Orbit Shield branding |
| **Product icons** | Custom (raster) | Orbitan mark, Orbit Nexus mark — from CDN masters only |

### 10.3 Consistency Rules

- **Master grid:** 24×24 viewBox (lucide default).
- **Stroke weight:** 2px (lucide default) — do not override.
- **Corner radius:** 2px (lucide default).
- **Optical alignment:** Lucide icons are pre-aligned; do not adjust.
- **Size:** Use `w-4 h-4` (16px) for inline, `w-5 h-5` (20px) for buttons, `w-6 h-6` (24px) for navigation.
- **Accessible labels:** Every icon-only button must have an `aria-label`. Decorative icons use `aria-hidden="true"`.

### 10.4 External Icons

- Free IconScout may be used only when: (a) licensing permits commercial use, (b) attribution is documented, (c) style is compatible, (d) Base44 supports the asset safely.
- Do not mix inconsistent icon families.
- No speculative 300-icon build for the MVP. Build icons as required.

---

## 11. Typography System

### 11.1 Font Families

| Role | Font | Token | Weights |
|------|------|-------|---------|
| **Headings / Display** | Sora | `--font-heading` / `--font-display` | 400, 500, 600, 700, 800 |
| **Body** | Inter | `--font-body` | 300, 400, 500, 600, 700 |
| **Mono** | System mono stack | `--font-mono` | — |

### 11.2 Loading

Fonts are loaded via Google Fonts `@import` at the top of `src/index.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Sora:wght@400;500;600;700;800&display=swap');
```

### 11.3 Scale

| Token | Size | Usage |
|-------|------|-------|
| `text-xs` | 12px | Labels, metadata, timestamps |
| `text-sm` | 14px | Secondary text, table cells, button labels |
| `text-base` | 16px | Body text (minimum for readable content) |
| `text-lg` | 18px | Section subheadings |
| `text-xl` | 20px | Card titles |
| `text-2xl` | 24px | Page section headings |
| `text-3xl` | 30px | Page titles |
| `text-4xl` | 36px | Hero headings |
| `text-5xl` | 48px | Marketing hero |

### 11.4 Rules

- Minimum body text size: 16px (`text-base`). No text smaller than 12px (`text-xs`).
- Line height: 1.5 for body text, 1.2 for headings (`tracking-tight`).
- Headings always use Sora; body always uses Inter. Never mix.
- Wordmarks use Sora Bold with `tracking-tight`.

---

## 12. Colour System

### 12.1 Semantic Tokens (Implemented in `src/index.css`)

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--background` | `220 20% 97%` | `222 47% 7%` | App background |
| `--foreground` | `220 25% 9%` | `220 15% 94%` | Primary text |
| `--card` | `0 0% 100%` | `222 40% 10%` | Card surfaces |
| `--card-foreground` | `220 25% 9%` | `220 15% 94%` | Card text |
| `--popover` | `0 0% 100%` | `222 40% 10%` | Popover/dropdown surfaces |
| `--primary` | `221 83% 53%` | `221 83% 62%` | Orbit Blue — action colour |
| `--primary-foreground` | `0 0% 100%` | `0 0% 100%` | Text on primary |
| `--secondary` | `220 16% 93%` | `222 30% 15%` | Secondary surfaces |
| `--muted` | `220 16% 94%` | `222 30% 14%` | Muted backgrounds |
| `--muted-foreground` | `220 10% 50%` | `220 10% 55%` | Muted text |
| `--accent` | `220 16% 92%` | `222 30% 17%` | Accent backgrounds |
| `--destructive` | `0 72% 51%` | `0 65% 55%` | Danger/error |
| `--border` | `220 18% 89%` | `222 30% 17%` | Borders |
| `--input` | `220 18% 89%` | `222 30% 17%` | Input borders |
| `--ring` | `221 83% 53%` | `221 83% 62%` | Focus ring |

### 12.2 Brand Colour Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| `--orbitan-blue` | `#2563EB` | Primary brand |
| `--orbitan-green` | `#16A34A` | Renew, success |
| `--orbitan-amber` | `#D97706` | Warning |
| `--orbitan-red` | `#DC2626` | Danger, Regulate |
| `--orbitan-purple` | `#7C3AED` | Refine, Business plan |
| `--orbitan-slate` | `#1E293B` | Dark surfaces |

### 12.3 Plan Colours

| Plan | Hex | Gradient |
|------|-----|----------|
| Starter | `#2563EB` | `linear-gradient(135deg, #3B82F6, #1D4ED8)` |
| Growth | `#10B981` | `linear-gradient(135deg, #34D399, #059669)` |
| Business | `#7C3AED` | `linear-gradient(135deg, #8B5CF6, #6D28D9)` |
| Enterprise | `#111827` | `linear-gradient(135deg, #1F2937, #111827)` |
| Enterprise Gold | `#D4AF37` | Accent on Enterprise |

### 12.4 Industry Pack Colours

| Pack | Hex |
|------|-----|
| F&B | `#F97316` |
| Retail | `#22C55E` |
| Recycling | `#16A34A` |
| Healthcare | `#06B6D4` |
| Education | `#8B5CF6` |
| Logistics | `#2563EB` |
| Construction | `#EAB308` |
| Technology | `#0F172A` |

### 12.5 Marketing Surfaces

| Token | Hex | Usage |
|-------|-----|-------|
| `--marketing-bg` | `#0A0F1A` | Landing page, auth pages |
| `--marketing-surface` | `#0F172A` | Card surfaces on dark |
| `--marketing-blue` | `#3B82F6` | Marketing accent |
| `--marketing-gold` | `#D4AF37` | Premium accent |

### 12.6 Rules

- **No hardcoded colour values in JSX.** Use Tailwind classes mapped to tokens (`bg-primary`, `text-foreground`, `text-orbitan-blue`).
- **No inline styles** for colours — use Tailwind classes.
- **New tokens** only when semantic tokens are insufficient and the value is reused.
- The existing token system is the only token system. Do not create a second one.

---

## 13. Blueprint Language

The Blueprint visual language is used in onboarding wizards, module configuration, and architectural diagrams.

### 13.1 Visual Characteristics

- **Grid background:** 1px lines at 6-8% opacity, 64px spacing (already in `AuthLayout.jsx`).
- **Connector lines:** 1px dashed borders in muted-foreground at 30% opacity.
- **Node cards:** Rounded rectangles with subtle borders, `glass-card` style on dark backgrounds.
- **Labels:** Sora Bold for node titles, Inter for descriptions, mono for IDs.

### 13.2 Usage

- Blueprint Studio (`src/components/blueprint/BlueprintStudio.jsx`)
- Onboarding wizard preview step
- Module dependency diagrams
- Access flow visualisations

---

## 14. Illustration Language

Orbitan does not use custom illustrations for the MVP. Visual interest comes from:

1. **The Orbit Ring** — animated or static, the 6-R colour ring is the primary visual motif.
2. **Geometric gradients** — subtle `linear-gradient(135deg, ...)` in plan colours.
3. **Glassmorphism** — `glass-card` class for premium card surfaces.
4. **Grid overlays** — engineering drafting aesthetic on marketing pages.
5. **Stock photography** — Unsplash photos for marketing contexts only (valid URLs only).

No AI-generated illustrations are used in-product. AI-generated images are permitted only for marketing/social assets and are documented as generated, not approved masters.

---

## 15. Motion Language

### 15.1 Principles

1. **Purposeful** — Motion guides attention or indicates state change. Never decorative.
2. **Fast** — Transitions are 150-300ms. Users should not wait for animations.
3. **Eased** — `ease-out` for entrances, `ease-in` for exits. Never linear (except for continuous loops).
4. **Reduced** — `prefers-reduced-motion` is respected globally (implemented in `src/index.css`).

### 15.2 Implemented Animations

| Animation | Duration | Easing | Usage |
|-----------|----------|--------|-------|
| `fade-in` | 300ms | ease-out | Page sections, modal content |
| `slide-in` | 250ms | ease-out | Side panels, drawers |
| `accordion-down` | 200ms | ease-out | Collapsible sections |
| `accordion-up` | 200ms | ease-out | Collapsible sections |
| `spin` (Orbit Ring) | 2000ms | linear | Loader ring rotation |
| `spin` (pulse ring) | 3000ms | linear reverse | Loader inner pulse |
| `pulse` | — | — | Loading text, skeleton shimmer |

### 15.3 Reduced Motion

Implemented in `src/index.css`:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
```

Additionally, the `.reduce-motion` class (applied via Accessibility settings) and `.high-contrast` class provide user-controlled overrides.

---

## 16. Photography Direction

### 16.1 Usage

- Stock photography (Unsplash) is used **only** for marketing contexts (Landing page, auth gateway backgrounds).
- No stock photography in-product — the app uses data visualisation, icons, and brand elements.

### 16.2 Direction

- **Real operational settings** — kitchens, warehouses, retail floors, recycling facilities.
- **Warm, natural lighting** — no clinical stock photos.
- **Diverse people** — representing all user types.
- **Authentic** — not posed or generic.

### 16.3 Rules

- Only use valid Unsplash URLs you know exist.
- Link images via `<img>` tags — do not download.
- Always include `alt` text.
- Images are responsive: `max-width: 100%` and lazy loading.

---

## 17. Responsive Behaviour

> See also: [ResponsiveStandards.md](./ResponsiveStandards.md)

### 17.1 Breakpoints

| Device | Prefix | Min Width | Layout |
|--------|--------|-----------|--------|
| Mobile | (none) | 0px | Single column, bottom-anchored actions, collapsible nav |
| Tablet | `sm:` | 640px | Two-column where appropriate, side nav visible |
| Laptop | `md:` | 768px | Multi-column, persistent sidebar |
| Desktop | `lg:` | 1024px | Dense data tables, hover states, keyboard shortcuts |
| Large | `xl:` | 1280px | Max-width containers, multi-panel |
| XL | `2xl:` | 1536px | Dashboard grids |

### 17.2 PWA

- `public/sw.js` — Service worker for offline caching.
- `public/manifest.json` — PWA manifest for installability.
- `PWAUpdateListener` component prompts users to update.
- Installable on iOS/Android from browser.
- Safe area insets respected via `env(safe-area-inset-*)`.

### 17.3 Principles

1. Mobile-first — design for the smallest screen, enhance upward.
2. Touch targets minimum 44×44px.
3. Navigation adapts — collapsible on mobile, persistent on desktop.
4. Tables scroll horizontally on mobile.
5. Images are responsive with lazy loading.

---

## 18. WCAG 2.2 AA Requirements

> See also: [Accessibility.md](./Accessibility.md)

Orbitan targets **WCAG 2.2 AA** compliance as a minimum. The platform already implements WCAG 2.1 AA; the upgrade to 2.2 adds:

### 18.1 New in 2.2 (Must Implement)

| Criterion | Status | Implementation |
|-----------|--------|----------------|
| 2.4.11 Focus Not Obscured (Minimum) | ✅ | Focus rings use `--ring` token; sticky headers do not obscure focused elements |
| 2.4.12 Focus Not Obscured (Enhanced) | ⚠️ AAA | Not required for AA |
| 2.5.7 Dragging Movements | ✅ | Alternative keyboard/tap actions provided for all drag operations (DnD has keyboard fallback) |
| 2.5.8 Target Size (Minimum) | ✅ | 24×24px minimum for non-essential targets; 44×44px for primary actions |
| 3.2.6 Consistent Help | ✅ | Help links are in consistent locations (UserMenu, Support Portal) |
| 3.3.7 Redundant Entry | ✅ | Information previously entered is auto-populated or available for selection |
| 3.3.8 Accessible Authentication (Minimum) | ✅ | No cognitive function test for login; SSO + email/password |

### 18.2 Ongoing Requirements (WCAG 2.1 AA — Already Implemented)

- **Perceivable:** Alt text, semantic HTML, captions, contrast ratios (4.5:1 normal text, 3:1 large text).
- **Operable:** Keyboard navigation, focus management, no keyboard traps, `prefers-reduced-motion`.
- **Understandable:** Clear error messages, form labels, predictable navigation.
- **Robust:** Valid HTML, ARIA where needed, compatible with assistive technologies.

### 18.3 Accessibility Features

- `.reduce-motion` class — user-controlled animation disable.
- `.large-text` class — 18px base font size.
- `.high-contrast` class — darker muted-foreground and borders.
- Skip links for keyboard users.
- Focus trapping in modals/dialogs.
- `Esc` key closes modals.

---

## 19. AI Experience Behaviour

> See also: ADR-0017 (Graceful Degradation), ADR-0018 (AI Kill Switch), ADR-0044 (Platform Intelligence)

### 19.1 Principles

1. **AI enhances — never replaces human decisions.**
2. **Transparent** — Users always know when content is AI-assisted.
3. **Reversible** — Users can review, edit, and reject AI-generated content.
4. **Graceful degradation** — The platform works fully without AI (ADR-0017).
5. **Human-in-control** — No unexpected automated actions.

### 19.2 Visual Indicators

- AI-generated content displays a "AI-assisted" badge with a Sparkles icon.
- AI suggestions are visually distinct (dashed border, subtle background tint).
- AI confidence scores are shown where relevant.
- Kill switch status is visible in Shield Command Center.

### 19.3 Interaction

- AI suggestions require explicit user action to accept (no auto-apply).
- AI-generated documents enter `in_review` state and require manager approval (Regulate principle).
- AI insights carry evidence, source records, and data sufficiency flags.

---

## 20. Feedback, Loading, Empty and Error States

### 20.1 Loading States

| Pattern | Component | Usage |
|---------|-----------|-------|
| Fullscreen loader | `OrbitanLoader` with `size="fullscreen"` | App boot, auth transitions |
| Inline spinner | `OrbitanLoader` with `size="sm"` | Button loading, inline actions |
| Skeleton | `Skeleton` component | Content area loading |
| Progress bar | `Progress` component | File uploads, long operations |
| Pulse text | `animate-pulse` class | Status messages |

### 20.2 Empty States

Every list/table/view must have a purposeful empty state:
- **Icon** — relevant lucide icon at 48px, muted colour.
- **Title** — Sora Bold, explaining what is empty.
- **Description** — Inter, explaining why and what to do next.
- **Action** — Primary button to create/add the first item.

### 20.3 Error States

- **Inline errors** — Red text below form fields (`text-destructive`).
- **Toast errors** — `useToast` hook, destructive variant.
- **Full-page errors** — `PageNotFound` component for 404s.
- **Auth errors** — Inline error messages with user-friendly text (no technical details leaked).

### 20.4 Success States

- **Toast** — Green checkmark, brief message.
- **Inline confirmation** — Green text or badge.
- **Confetti** — `canvas-confetti` for major milestones (checkout success, onboarding completion).

---

## 21. Asset Naming and Export Rules

### 21.1 File Naming

| Asset Type | Pattern | Example |
|------------|---------|---------|
| Logo symbol | `{brand}-symbol.svg` | `orbitan-symbol.svg` |
| Logo wordmark | `{brand}-wordmark.svg` | `orbitan-wordmark.svg` |
| Logo lockup | `{brand}-lockup-horizontal.svg` | `orbitan-lockup-horizontal.svg` |
| App icon | `{brand}-app-icon-{size}.png` | `orbitan-app-icon-512.png` |
| Social banner | `{brand}-social-1200x630.png` | `orbitan-social-1200x630.png` |
| Favicon | `favicon-{size}.png` | `favicon-32x32.png` |
| Monochrome | `{brand}-symbol-{variant}.svg` | `orbitan-symbol-white.svg` |

### 21.2 Export Rules

- SVGs: optimised, no editor metadata, `viewBox` set, no fixed width/height.
- PNGs: transparent background (unless social banner), appropriate DPI for target.
- Favicons: `.ico` contains 16, 32, 48 sizes.
- Social banners: exactly 1200×630px.
- App icons: exact square dimensions (192, 512, 1024).

### 21.3 Asset Storage

```
public/
├── brand/
│   ├── README.md                    # Asset registry and documentation
│   ├── asset-manifest.json          # Machine-readable asset registry
│   ├── orbitan/                     # Orbitan brand assets
│   ├── orbit-nexus/                 # Orbit Nexus brand assets
│   ├── favicons/                    # Favicon set
│   ├── app-icons/                   # PWA and native app icons
│   ├── social/                      # Social share banners
│   ├── email/                       # Email template assets
│   └── product-icons/              # Product-specific icons
├── favicon.svg                      # SVG favicon (orbit ring)
├── manifest.json                    # PWA manifest
└── sw.js                             # Service worker
```

> **Note:** Local brand assets in `public/brand/` are pending the availability of vector masters. Currently, all approved brand assets are hosted on the Base44 CDN and referenced via `src/lib/orbitan-identity.js`. The `public/brand/` directory structure is documented here as the target architecture.

---

## 22. Quality Gates

Every feature or screen is considered complete only when ALL of the following pass:

### 22.1 Visual Quality
- [ ] Uses semantic tokens only (no hardcoded colours, fonts, or spacing)
- [ ] Consistent with Orbitan design system (Sora headings, Inter body, Orbit Blue primary)
- [ ] Light and dark themes both verified
- [ ] Responsive across mobile, tablet, desktop

### 22.2 Accessibility
- [ ] WCAG 2.2 AA compliance verified
- [ ] Keyboard navigation works for all interactive elements
- [ ] Screen reader tested (VoiceOver/NVDA)
- [ ] Colour contrast meets AA (4.5:1 normal, 3:1 large text)
- [ ] Touch targets minimum 44×44px
- [ ] `prefers-reduced-motion` respected
- [ ] Focus order is logical and visible

### 22.3 Interaction
- [ ] Loading states present for all async operations
- [ ] Empty states present for all lists/tables
- [ ] Error states are clear and actionable
- [ ] Success feedback is provided
- [ ] Forms validate in real-time

### 22.4 Technical
- [ ] No broken imports or asset URLs
- [ ] No console errors
- [ ] Component files ≤50 lines
- [ ] Every component exported as default
- [ ] lucide-react icons only
- [ ] No `require()` or `module.exports` (ESM only)

---

## 23. Misuse Rules

### 23.1 Logo Misuse

- ❌ Do not redraw, trace, or recreate the approved 3D mark as SVG.
- ❌ Do not change the mark's colour, proportions, or orientation.
- ❌ Do not add drop shadows, glows, or filters beyond `drop-shadow-sm`.
- ❌ Do not stretch, compress, or distort the mark.
- ❌ Do not insert the Orbit Nexus brain into the Orbitan master logo.
- ❌ Do not create fake SVG masters from raster images.

### 23.2 Colour Misuse

- ❌ Do not use hardcoded hex values in JSX.
- ❌ Do not use `bg-white`, `bg-black`, or `text-[#...]` — use token classes.
- ❌ Do not use colour alone to convey information.
- ❌ Do not use non-Orbit Blue as the primary action colour.

### 23.3 Typography Misuse

- ❌ Do not use Inter for headings or Sora for body.
- ❌ Do not use text smaller than 12px.
- ❌ Do not use system fonts when Sora/Inter are available.
- ❌ Do not use non-approved font weights.

### 23.4 Icon Misuse

- ❌ Do not use non-lucide icon libraries.
- ❌ Do not use nonexistent lucide icons.
- ❌ Do not mix outlined and filled icons inconsistently.
- ❌ Do not use icon-only buttons without `aria-label`.

### 23.5 Component Misuse

- ❌ Do not import from `@/utils` for `cn` — use `@/lib/utils`.
- ❌ Do not use `require()` — use ESM `import`.
- ❌ Do not write JSX in `.js` files.
- ❌ Do not create components over 50 lines without extracting sub-components.

---

## 24. Governance and ADR Requirements

### 24.1 When an ADR is Required

A new Architecture Decision Record (ADR) is required when:
- A new token system or colour system is introduced.
- The icon library is changed.
- The typography system is changed (new font, new weights).
- A new product identity is created (e.g., a future Orbit product).
- The logo system is changed (new master, new variant, new clear-space rule).
- A new accessibility standard is adopted (e.g., WCAG AAA).

### 24.2 When an ADR is NOT Required

An ADR is not required for:
- Routine asset organisation or migration.
- Derivative asset exports (favicon sizes, app icon sizes).
- Documentation consolidation.
- Token value updates within the existing system.
- Adding new semantic tokens that extend (not replace) the existing system.

### 24.3 Document Maintenance

- This document is maintained by Product Architecture.
- Updates require a changelog entry in `src/docs/knowledge-hub/CHANGELOG.md`.
- Significant changes (new sections, changed principles) require a new ADR.
- Cross-references to related ADRs must be kept current.

### 24.4 Related ADRs

| ADR | Title | Relevance |
|-----|-------|-----------|
| ADR-0008 | Orbit Naming Standards | Brand naming hierarchy |
| ADR-0011 | Orbit Naming Migration | Service name changes |
| ADR-0013 | Naming Architecture Lock-In | Permanent naming standard |
| ADR-0014 | Dual-Prefix Naming | Orbitan vs Orbit |
| ADR-0016 | RLS Tenant Isolation | Data isolation in UI |
| ADR-0017 | Graceful Degradation | AI-optional design |
| ADR-0018 | AI Kill Switch | AI experience behaviour |
| ADR-0027 | Staff Directory Governance | RBAC in UI |
| ADR-0044 | Platform Intelligence | AI self-optimisation |

### 24.5 Related Documents (Supplements)

This document is the canonical Experience Architecture. The following focused supplements remain useful and are cross-referenced:

| Document | Path | Scope |
|----------|------|-------|
| Golden UI/UX Standard | `src/docs/knowledge-hub/golden-ui-ux-standard.md` | Non-negotiable quality checklist |
| Design Principles | `src/docs/knowledge-hub/design/DesignPrinciples.md` | Token usage rules, component standards |
| Accessibility Standard | `src/docs/knowledge-hub/design/Accessibility.md` | WCAG compliance, keyboard, screen readers |
| Responsive Standards | `src/docs/knowledge-hub/design/ResponsiveStandards.md` | Breakpoints, PWA, device support |
| Brand Guidelines | `src/docs/knowledge-hub/product/BrandGuidelines.md` | Logo, colours, typography, tone of voice |
| Naming Conventions | `src/docs/knowledge-hub/product/NamingConventions.md` | Dual-prefix naming standard |
| Brand Asset Registry | `public/brand/README.md` | Approved asset inventory and storage |

---

**Last Updated:** 2026-08-04 (Build: Experience Architecture & Brand Asset Repository v1.0)