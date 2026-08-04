# Orbitan Brand Asset Repository

> **Canonical asset registry.** This document and `asset-manifest.json` are the
> single source of truth for all Orbitan brand assets — what exists, where it
> is stored, what is interim, and what is pending.

## Current State (2026-08-04)

All approved Orbitan brand assets are currently hosted on the **Base44 CDN**.
No local vector (SVG) masters exist. The `public/brand/` directory is the
target architecture for local asset storage — it is documented here and will
be populated as vector masters become available.

**GitHub repository:** `https://github.com/firdela/orbitan` (public)

## Approved CDN Assets

| Asset ID | Type | URL | Usage | Status |
|----------|------|-----|-------|--------|
| `orbitan_symbol_3d_transparent` | PNG | `…/7b205f7ab_Orbitan_3d_logo_transparent.png` | Primary mark (`LOGO_ASSETS.mark` / `mark3D`) | approved |
| `orbitan_symbol_blue_circular_on_black` | PNG | `…/10527badf_bluecircularlogoonblac.png` | Loader centre (`LOGO_ASSETS.loaderMark`) | approved |
| `orbitan_3d_logo_opaque` | PNG | `…/86d84f31e_Orbitan3dlogo.png` | PWA icon (any), apple-touch-icon | approved_interim |
| `orbitan_3d_logo_transparent_copy` | PNG | `…/16aaf935a_Orbitan3dlogotransparentcopy.png` | Favicon PNG fallback | approved_interim |
| `orbit_nexus_logo` | PNG | `…/563ef4f42_OrbitNexusLogo.png` | Orbit Nexus product mark (`LOGO_ASSETS.nexusLogo`) | approved |
| `orbit_ring_favicon` | SVG | `/favicon.svg` | SVG favicon (original Orbit Ring brand element) | approved |

**CDN prefix:** `https://media.base44.com/images/public/6a2153efb1a18d0ca28c3a39`

### Status Definitions

- **approved** — Production-ready master. Suitable for its intended usage.
- **approved_interim** — Approved source asset used as a fallback where a
  properly composed derivative does not yet exist. Not production-optimal for
  the role it fills.
- **generated_placeholder** — AI-generated or auto-created. Not an approved
  master. Must not be used in production metadata.
- **pending_source** — Requires original source artwork from the founder or a
  designer. Cannot be derived from existing raster assets.
- **missing** — Not yet created.

## Identity Configuration

All brand assets are resolved through `src/lib/orbitan-identity.js`:

```javascript
export const LOGO_ASSETS = {
  mark:       '…/7b205f7ab_Orbitan_3d_logo_transparent.png',
  mark3D:     '…/7b205f7ab_Orbitan_3d_logo_transparent.png',
  loaderMark: '…/10527badf_bluecircularlogoonblac.png',
  nexusLogo:  '…/563ef4f42_OrbitNexusLogo.png',
};
```

Components must NEVER hardcode CDN URLs. Always resolve through `LOGO_ASSETS`.

## SVG Favicon

The `favicon.svg` at `public/favicon.svg` is an **original Orbit Ring brand
element** — not a redraw of the Orbitan 3D logo. It uses the six 6-R principle
colours as arcs around a dark centre. This element is already established in
the `OrbitanLoader` component and is a legitimate, independent brand symbol.

## Social Banner

**No approved social banner exists.** A previous AI-generated placeholder was
removed from production metadata (`og:image`, `twitter:image`) because its
symbol geometry and typography did not meet brand standards. Social share
image metadata is intentionally omitted until an approved 1200×630 banner is
designed and approved by the founder.

## Apple Touch Icon

The `apple-touch-icon` in `index.html` references the opaque 3D logo PNG from
the CDN. This is an **approved_interim** fallback — the raster is not
specifically composed or sized for the 180×180 iOS requirement. A properly
sized and composed Apple touch icon is pending source artwork.

## PWA Maskable Icons

**No maskable icons exist.** The previous `manifest.json` incorrectly declared
ordinary CDN raster PNGs as `purpose: "maskable"`. This was a defect — the
artwork does not respect the maskable safe zone (80% inner circle) and would
be clipped by Android adaptive icon shells. The incorrect maskable declarations
have been removed. Proper 192×192 and 512×512 maskable icons are pending
authoritative source artwork with a safe-zone composition.

## Pending Assets

The following assets require original source artwork. They cannot be created
without a vector (SVG) master of the Orbitan mark. Do not create SVG
approximations from raster images.

- `orbitan-symbol.svg` — Primary logo vector master
- `orbitan-wordmark.svg` — Wordmark vector (requires font outline export)
- `orbitan-lockup-horizontal.svg` — Symbol + wordmark lockup
- `orbitan-symbol-black.svg` / `orbitan-symbol-white.svg` — Monochrome variants
- `favicon.ico` — Multi-size favicon (16/32/48)
- `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png` — PNG favicons
- `maskable-icon-192.png`, `maskable-icon-512.png` — PWA maskable icons (safe-zone composition)
- `apple-touch-icon.png` (180×180) — Properly sized Apple touch icon
- `orbitan-app-icon-1024.png` — iOS app icon master
- `orbitan-social-1200x630.png` — Social share banner (approved master)
- `orbit-nexus-symbol.svg` — Orbit Nexus vector master
- `orbitan-email-avatar.png` — Email template avatar
- `orbitan-notification-icon.png` — Push notification icon

## Directory Structure (Target)

```
public/
├── brand/
│   ├── README.md                    # This file
│   ├── asset-manifest.json          # Machine-readable registry
│   ├── orbitan/                     # Orbitan brand assets (pending)
│   ├── orbit-nexus/                 # Orbit Nexus brand assets (pending)
│   ├── favicons/                    # Favicon set (pending)
│   ├── app-icons/                   # PWA and native app icons (pending)
│   ├── social/                      # Social share banners (pending)
│   ├── email/                       # Email template assets (pending)
│   └── product-icons/               # Product-specific icons (pending)
├── favicon.svg                      # SVG favicon (orbit ring) — exists
├── manifest.json                     # PWA manifest — exists
└── sw.js                             # Service worker — exists
```

> **Note:** The `public/brand/` subdirectories are documented as the target
> architecture. They are NOT populated. All approved brand assets remain on the
> Base44 CDN. Do not create empty speculative asset files.
