# Orbitan Brand Asset Repository

> **Canonical asset registry.** This document and `asset-manifest.json` are the
> single source of truth for all Orbitan brand assets — what exists, where it
> is stored, and what is pending.

## Current State (2026-08-04)

All approved Orbitan brand assets are currently hosted on the **Base44 CDN**.
No local vector (SVG) masters exist. The `public/brand/` directory is the
target architecture for local asset storage — it is documented here and will
be populated as vector masters become available.

## Approved Assets (CDN-Hosted)

| Asset ID | Type | URL | Usage |
|----------|------|-----|-------|
| `orbitan_symbol_3d_transparent` | PNG | `…/7b205f7ab_Orbitan_3d_logo_transparent.png` | Primary mark (LOGO_ASSETS.mark / mark3D) |
| `orbitan_symbol_blue_circular_on_black` | PNG | `…/10527badf_bluecircularlogoonblac.png` | Loader centre |
| `orbitan_3d_logo_opaque` | PNG | `…/86d84f31e_Orbitan3dlogo.png` | Favicon, apple-touch-icon, PWA icon |
| `orbitan_3d_logo_transparent_copy` | PNG | `…/16aaf935a_Orbitan3dlogotransparentcopy.png` | Alternate favicon |
| `orbit_nexus_logo` | PNG | `…/563ef4f42_OrbitNexusLogo.png` | Orbit Nexus product mark |
| `orbit_ring_favicon` | SVG | `/favicon.svg` | SVG favicon (original Orbit Ring brand element) |

**CDN prefix:** `https://media.base44.com/images/public/6a2153efb1a18d0ca28c3a39`

## Identity Configuration

All brand assets are resolved through `src/lib/orbitan-identity.js`:

```javascript
export const LOGO_ASSETS = {
  mark:       '…/7b205f7ab_Orbitan_3d_logo_transparent.png',
  mark3D:     '…/7b205f7ab_Orbitan_3d_logo_transparent.png',
  nexusLogo:  '…/563ef4f42_OrbitNexusLogo.png',
};
```

Components must NEVER hardcode CDN URLs. Always resolve through `LOGO_ASSETS`.

**Exception:** `OrbitanLoader.jsx` hardcodes the blue-circular logo URL. This
should be migrated to `LOGO_ASSETS` in a future cleanup.

## SVG Favicon

The `favicon.svg` at `public/favicon.svg` is an **original Orbit Ring brand
element** — not a redraw of the Orbitan 3D logo. It uses the six 6-R principle
colours as arcs around a dark centre. This element is already established in
the `OrbitanLoader` component and is a legitimate, independent brand symbol.

## Pending Assets

The following assets are documented as pending. They cannot be created without
a vector (SVG) master of the Orbitan mark. Do not create SVG approximations
from raster images.

- `orbitan-symbol.svg` — Primary logo vector master
- `orbitan-wordmark.svg` — Wordmark vector (requires font outline export)
- `orbitan-lockup-horizontal.svg` — Symbol + wordmark lockup
- `orbitan-symbol-black.svg` / `orbitan-symbol-white.svg` — Monochrome variants
- `favicon.ico` — Multi-size favicon (16/32/48)
- `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png` — PNG favicons
- `maskable-icon-192.png`, `maskable-icon-512.png` — PWA maskable icons
- `apple-touch-icon.png` (180×180) — Properly sized Apple touch icon
- `orbitan-app-icon-1024.png` — iOS app icon master
- `orbitan-social-1200x630.png` — Social share banner (approved master)
- `orbit-nexus-symbol.svg` — Orbit Nexus vector master

## Directory Structure (Target)

```
public/
├── brand/
│   ├── README.md                    ← You are here
│   ├── asset-manifest.json          ← Machine-readable registry
│   ├── orbitan/                     ← Orbitan SVG masters and variants
│   ├── orbit-nexus/                 ← Orbit Nexus SVG masters and variants
│   ├── favicons/                    ← Favicon set (ico, png)
│   ├── app-icons/                   ← PWA and native app icons
│   ├── social/                      ← Social share banners (1200×630)
│   ├── email/                       ← Email template assets
│   └── product-icons/               ← Product-specific icons
├── favicon.svg                      ← SVG favicon (orbit ring)
├── manifest.json                    ← PWA manifest
└── sw.js                             ← Service worker
```

## Rules

1. **Never hardcode CDN URLs in components.** Resolve through `LOGO_ASSETS` in `orbitan-identity.js`.
2. **Never create fake SVG masters from raster images.** Document the limitation instead.
3. **Never redraw the approved logo.** Its geometry is immutable.
4. **Never insert the Orbit Nexus brain into the Orbitan master logo.**
5. **Always document generated vs. approved assets.** AI-generated images are placeholders, not masters.

## Related Documents

- [Orbitan Experience Architecture](../../src/docs/knowledge-hub/design/Orbitan-Experience-Architecture.md) — Canonical design and brand standard
- [Brand Guidelines](../../src/docs/knowledge-hub/product/BrandGuidelines.md) — Visual brand standards
- [Naming Conventions](../../src/docs/knowledge-hub/product/NamingConventions.md) — Dual-prefix naming standard
