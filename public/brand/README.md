# Orbitan Brand Asset Repository

> **Brand Identity v1.0 rev.2 — LOCKED (2026-08-04)**
> This document and `asset-manifest.json` are the single source of truth for all
> Orbitan and Orbit Nexus brand assets — what exists, where it is registered,
> and its canonical status.
>
> **Revision note (2026-08-04 rev.2):** Both packs rebuilt from source with genuine
> alpha transparency. The original v1 pack had embedded checkerboard pixels (flat
> grey/white in the alpha region) and was not genuinely transparent. All v1 URLs
> are archived in the `superseded` section of `asset-manifest.json` for
> traceability only — they are NOT active.

## LOCK STATUS

| Asset Set | Status |
|-----------|--------|
| Orbitan logo (mark) | **LOCKED** |
| Orbit Nexus logo (mark) | **LOCKED** |
| Favicons | **LOCKED** |
| PWA icons (any purpose) | **LOCKED** |
| Apple Touch Icon | **LOCKED** |
| Social banner (1200×630) | **LOCKED** |
| Brand colours | **LOCKED** |
| Identity architecture | **LOCKED** |

Do not replace, recolour, redraw, regenerate, AI-enhance, crop, distort, or
reinterpret any approved asset. If a new asset is required, record it in
`pending_assets` and obtain founder approval before integration.

## Asset Storage Architecture

All approved brand assets are registered on the **Base44 CDN** via their
canonical URLs. The Base44 platform does not support writing binary files
directly into the repository, so assets are served from CDN and all URLs are
registered in `orbitan-identity.js` as the single canonical source.

**CDN prefix:** `https://media.base44.com/images/public/6a2153efb1a18d0ca28c3a39`

**Identity config:** `src/lib/orbitan-identity.js` (all components must resolve
assets through `LOGO_ASSETS` — never hardcode CDN URLs in components).

## Transparency Verification (rev.2)

Both master PNGs were verified for genuine alpha transparency after the rebuild:

| Master | Dimensions | Transparent px | Anti-aliased px | Opaque px |
|--------|-----------|----------------|-----------------|-----------|
| Orbitan master | 1254×1254 | 1,064,826 | 20,327 | 487,363 |
| Orbit Nexus master | 1254×1254 | 970,605 | 37,447 | 564,464 |

No checkerboard pixels remain. Alpha channel ranges from 0 (fully transparent)
to 255 (fully opaque) as expected for a genuine transparent PNG.

## Orbitan Assets (rev.2 — 27 assets)

### Verified Master

| Asset ID | File | Dimensions | Status |
|----------|------|-----------|--------|
| `orbitan-master` | `5b691cc7e_orbitan-master-transparent.png` | 1254×1254 | approved |

### Mark Series (19 sizes)

| Asset ID | File | Dimensions | Status |
|----------|------|-----------|--------|
| `orbitan-mark-16` | `3a3a41088_orbitan-mark-16.png` | 16×16 | approved |
| `orbitan-mark-24` | `cbb4e5d8f_orbitan-mark-24.png` | 24×24 | approved |
| `orbitan-mark-32` | `388a276e0_orbitan-mark-32.png` | 32×32 | approved |
| `orbitan-mark-48` | `07e20034a_orbitan-mark-48.png` | 48×48 | approved |
| `orbitan-mark-64` | `3f8bb5549_orbitan-mark-64.png` | 64×64 | approved |
| `orbitan-mark-72` | `8b9bc48d2_orbitan-mark-72.png` | 72×72 | approved |
| `orbitan-mark-96` | `f3f966a35_orbitan-mark-96.png` | 96×96 | approved |
| `orbitan-mark-128` | `695a587ca_orbitan-mark-128.png` | 128×128 | approved |
| `orbitan-mark-144` | `0fe847dd0_orbitan-mark-144.png` | 144×144 | approved |
| `orbitan-mark-152` | `362507a64_orbitan-mark-152.png` | 152×152 | approved |
| `orbitan-mark-167` | `1cfccded9_orbitan-mark-167.png` | 167×167 | approved |
| `orbitan-mark-180` | `07eb467e7_orbitan-mark-180.png` | 180×180 | approved |
| `orbitan-mark-192` | `8aa45682c_orbitan-mark-192.png` | 192×192 | approved |
| `orbitan-mark-256` | `ab30dda12_orbitan-mark-256.png` | 256×256 | approved |
| `orbitan-mark-384` | `9651c783b_orbitan-mark-384.png` | 384×384 | approved |
| `orbitan-mark-512` | `3f8478f3b_orbitan-mark-512.png` | 512×512 | approved |
| `orbitan-mark-1024` | `cf12f0b98_orbitan-mark-1024.png` | 1024×1024 | approved |
| `orbitan-mark-2048` | `488b4be03_orbitan-mark-2048.png` | 2048×2048 | approved |
| `orbitan-mark-4096` | `534d5632a_orbitan-mark-4096.png` | 4096×4096 | approved |

### App Icons (purpose: any — NOT maskable-certified)

| Asset ID | File | Dimensions | Purpose | Status |
|----------|------|-----------|---------|--------|
| `orbitan-android-chrome-192` | `a5427bd5a_orbitan-android-chrome-192x192.png` | 192×192 | any | approved |
| `orbitan-android-chrome-512` | `6ae468ddc_orbitan-android-chrome-512x512.png` | 512×512 | any | approved |
| `orbitan-apple-touch-icon` | `6d567efff_orbitan-apple-touch-icon.png` | 180×180 | apple-touch-icon | approved |

### Favicons

| Asset ID | File | Dimensions | Status |
|----------|------|-----------|--------|
| `orbitan-favicon-16` | `5d0083b5f_orbitan-favicon-16x16.png` | 16×16 | approved |
| `orbitan-favicon-32` | `bc8ac0b61_orbitan-favicon-32x32.png` | 32×32 | approved |
| `orbitan-favicon-48` | `ce1e8dc82_orbitan-favicon-48x48.png` | 48×48 | approved |
| `orbitan-favicon-ico` | `c4450dc86_orbitan-favicon.ico` | multi-size | approved |

## Orbit Nexus Assets (rev.2 — 27 assets)

### Verified Master

| Asset ID | File | Dimensions | Status |
|----------|------|-----------|--------|
| `orbit-nexus-master` | `63aa1eb45_orbit-nexus-mark-master-transparent.png` | 1254×1254 | approved |

### Mark Series (19 sizes)

| Asset ID | File | Dimensions | Status |
|----------|------|-----------|--------|
| `orbit-nexus-mark-16` | `d7ac31a63_orbit-nexus-mark-16.png` | 16×16 | approved |
| `orbit-nexus-mark-24` | `489295e6d_orbit-nexus-mark-24.png` | 24×24 | approved |
| `orbit-nexus-mark-32` | `9b4b24815_orbit-nexus-mark-32.png` | 32×32 | approved |
| `orbit-nexus-mark-48` | `f68d615be_orbit-nexus-mark-48.png` | 48×48 | approved |
| `orbit-nexus-mark-64` | `65bda1c7b_orbit-nexus-mark-64.png` | 64×64 | approved |
| `orbit-nexus-mark-72` | `2109c2e6a_orbit-nexus-mark-72.png` | 72×72 | approved |
| `orbit-nexus-mark-96` | `8d5f40e9f_orbit-nexus-mark-96.png` | 96×96 | approved |
| `orbit-nexus-mark-128` | `0825fe36b_orbit-nexus-mark-128.png` | 128×128 | approved |
| `orbit-nexus-mark-144` | `96076e0bb_orbit-nexus-mark-144.png` | 144×144 | approved |
| `orbit-nexus-mark-152` | `d4ef7af75_orbit-nexus-mark-152.png` | 152×152 | approved |
| `orbit-nexus-mark-167` | `5e2b4db58_orbit-nexus-mark-167.png` | 167×167 | approved |
| `orbit-nexus-mark-180` | `1704ceb9f_orbit-nexus-mark-180.png` | 180×180 | approved |
| `orbit-nexus-mark-192` | `5f7cb74c1_orbit-nexus-mark-192.png` | 192×192 | approved |
| `orbit-nexus-mark-256` | `4d3027f67_orbit-nexus-mark-256.png` | 256×256 | approved |
| `orbit-nexus-mark-384` | `0bedbb6ab_orbit-nexus-mark-384.png` | 384×384 | approved |
| `orbit-nexus-mark-512` | `66cefa242_orbit-nexus-mark-512.png` | 512×512 | approved |
| `orbit-nexus-mark-1024` | `e43172987_orbit-nexus-mark-1024.png` | 1024×1024 | approved |
| `orbit-nexus-mark-2048` | `92dba4696_orbit-nexus-mark-2048.png` | 2048×2048 | approved |
| `orbit-nexus-mark-4096` | `0b4ce01b1_orbit-nexus-mark-4096.png` | 4096×4096 | approved |

### App Icons (purpose: any — NOT maskable-certified)

| Asset ID | File | Dimensions | Purpose | Status |
|----------|------|-----------|---------|--------|
| `orbit-nexus-android-chrome-192` | `1d9f64267_orbit-nexus-android-chrome-192x192.png` | 192×192 | any | approved |
| `orbit-nexus-android-chrome-512` | `dbe17a146_orbit-nexus-android-chrome-512x512.png` | 512×512 | any | approved |
| `orbit-nexus-apple-touch-icon` | `6966d2e45_orbit-nexus-apple-touch-icon.png` | 180×180 | apple-touch-icon | approved |

### Favicons

| Asset ID | File | Dimensions | Status |
|----------|------|-----------|--------|
| `orbit-nexus-favicon-16` | `42ec9ac89_orbit-nexus-favicon-16x16.png` | 16×16 | approved |
| `orbit-nexus-favicon-32` | `7ee6e306f_orbit-nexus-favicon-32x32.png` | 32×32 | approved |
| `orbit-nexus-favicon-48` | `a41c02143_orbit-nexus-favicon-48x48.png` | 48×48 | approved |
| `orbit-nexus-favicon-ico` | `69fb1d6f4_orbit-nexus-favicon.ico` | multi-size | approved |

## Social Assets

| Asset ID | File | Dimensions | Status |
|----------|------|-----------|--------|
| `orbitan-social-banner` | `348a29f76_Orbitanbanner.png` | 1200×630 | approved |

Wired into `index.html` as `og:image` and `twitter:image` with descriptive alt text.

## PWA Icon Declaration

The `orbitan-android-chrome-192x192` and `orbitan-android-chrome-512x512` assets
are declared as `purpose: "any"` only in `public/manifest.json`. They are
transparent PNGs — NOT maskable-certified compositions. Declaring them as
maskable would cause Android adaptive icon shells to clip the artwork outside
the safe zone.

**Maskable icons are a pending manual requirement** — they require separate
purpose-built compositions with safe-zone-compliant artwork.

## PWA Favicon Set (index.html)

| Element | Asset | Dimensions |
|---------|-------|-----------|
| `<link rel="icon" type="image/svg+xml">` | `/favicon.svg` (Orbit Ring) | any |
| `<link rel="icon" type="image/x-icon">` | `orbitan-favicon.ico` | multi-size |
| `<link rel="icon" sizes="16x16">` | `orbitan-favicon-16x16.png` | 16×16 |
| `<link rel="icon" sizes="32x32">` | `orbitan-favicon-32x32.png` | 32×32 |
| `<link rel="icon" sizes="48x48">` | `orbitan-favicon-48x48.png` | 48×48 |
| `<link rel="apple-touch-icon">` | `orbitan-apple-touch-icon.png` | 180×180 |

## Identity Configuration

All assets resolve through `src/lib/orbitan-identity.js → LOGO_ASSETS`.
Components must never hardcode CDN URLs. Canonical keys:

- `LOGO_ASSETS.mark` — primary mark (512)
- `LOGO_ASSETS.mark3D` — backward-compat alias (512)
- `LOGO_ASSETS.loaderMark` — loader centre (192)
- `LOGO_ASSETS.markSm` — small mark (48)
- `LOGO_ASSETS.markXs` — extra-small mark (32)
- `LOGO_ASSETS.master` — verified master (1254)
- `LOGO_ASSETS.socialBanner` — social banner (1200×630)
- `LOGO_ASSETS.nexusLogo` — Nexus primary mark (512)
- `LOGO_ASSETS.nexusMarkSm` — Nexus small mark (48)
- `LOGO_ASSETS.nexusMaster` — Nexus verified master (1254)

## Orbit Brand Separation (Hard Constraints)

- **Orbitan assets** (`orbitan-mark-*`, `orbitan-android-*`, `orbitan-favicon-*`,
  `orbitan-apple-touch-icon`) must only be used for OrbitanOS product surfaces.
- **Orbit Nexus assets** (`orbit-nexus-mark-*`, etc.) must only be used for Orbit
  Nexus product surfaces.
- Cross-product brand contamination is a hard defect — not a style preference.

## Pending (Requires New Assets)

| Asset | Status |
|-------|--------|
| Maskable-safe PWA icons (both products) | Requires separate safe-zone-compliant compositions — do not declare existing icons as maskable |
| Orbit Nexus favicon integration in Nexus pages | Deferred to Nexus standalone product launch |

## Remaining Limitations

- No vector (SVG) master of the Orbitan 3D mark exists. All approved masters are
  raster PNGs on the Base44 CDN. No fake SVG masters created from raster images.
- No standalone wordmark SVG file (wordmark is composed in `OrbitanWordmark.jsx`
  using Sora Bold typography + mark image).
- Orbit Nexus product pages do not yet use the dedicated Nexus favicon set —
  deferred to when the Orbit Nexus standalone product ships.
