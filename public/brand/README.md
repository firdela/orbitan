# Orbitan Brand Asset Repository

> **Brand Identity v1.0 — LOCKED (2026-08-04)**
> This document and `asset-manifest.json` are the single source of truth for all
> Orbitan and Orbit Nexus brand assets — what exists, where it is registered,
> and its canonical status.

## LOCK STATUS

| Asset Set | Status |
|-----------|--------|
| Orbitan logo (mark) | **LOCKED** |
| Orbit Nexus logo (mark) | **LOCKED** |
| Favicons | **LOCKED** |
| PWA icons | **LOCKED** |
| Apple Touch Icon | **LOCKED** |
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

## Founder-Approved Asset Pack (2026-08-04)

52 assets imported in this build: 26 Orbitan + 26 Orbit Nexus.

### Orbitan Assets

| Asset ID | File | Dimensions | Purpose | Status |
|----------|------|-----------|---------|--------|
| `orbitan-mark-16` | `7b3567715_orbitan-mark-16.png` | 16×16 | Mark (tiny) | approved |
| `orbitan-mark-24` | `749caab5a_orbitan-mark-24.png` | 24×24 | Mark (xs) | approved |
| `orbitan-mark-32` | `9b29cd972_orbitan-mark-32.png` | 32×32 | Mark (sm) | approved |
| `orbitan-mark-48` | `26072f988_orbitan-mark-48.png` | 48×48 | Mark (md) | approved |
| `orbitan-mark-64` | `c409a041b_orbitan-mark-64.png` | 64×64 | Mark (lg) | approved |
| `orbitan-mark-72` | `f64e3e0ff_orbitan-mark-72.png` | 72×72 | Mark | approved |
| `orbitan-mark-96` | `18b794d67_orbitan-mark-96.png` | 96×96 | Mark | approved |
| `orbitan-mark-128` | `e2627a2e9_orbitan-mark-128.png` | 128×128 | Mark | approved |
| `orbitan-mark-144` | `e660f6b59_orbitan-mark-144.png` | 144×144 | Mark | approved |
| `orbitan-mark-152` | `2d2df8364_orbitan-mark-152.png` | 152×152 | Mark | approved |
| `orbitan-mark-167` | `58d3a248a_orbitan-mark-167.png` | 167×167 | Mark | approved |
| `orbitan-mark-180` | `5514bbeb2_orbitan-mark-180.png` | 180×180 | Mark | approved |
| `orbitan-mark-192` | `5d8c3405b_orbitan-mark-192.png` | 192×192 | Mark / loaderMark | approved |
| `orbitan-mark-256` | `dace21675_orbitan-mark-256.png` | 256×256 | Mark | approved |
| `orbitan-mark-384` | `9bb554b7e_orbitan-mark-384.png` | 384×384 | Mark | approved |
| `orbitan-mark-512` | `98099aa9f_orbitan-mark-512.png` | 512×512 | Primary mark (LOGO_ASSETS.mark) | approved |
| `orbitan-mark-1024` | `cf84c9c19_orbitan-mark-1024.png` | 1024×1024 | Master (high-res) | approved |
| `orbitan-mark-2048` | `95e1d638f_orbitan-mark-2048.png` | 2048×2048 | Master (ultra-high-res) | approved |
| `orbitan-mark-4096` | `388bce822_orbitan-mark-4096.png` | 4096×4096 | Master (print/source) | approved |
| `orbitan-android-chrome-192x192` | `015a99453_orbitan-android-chrome-192x192.png` | 192×192 | PWA icon any + maskable | approved |
| `orbitan-android-chrome-512x512` | `354dae876_orbitan-android-chrome-512x512.png` | 512×512 | PWA icon any + maskable | approved |
| `orbitan-apple-touch-icon` | `42c8f6db0_orbitan-apple-touch-icon.png` | 180×180 | iOS apple-touch-icon | approved |
| `orbitan-favicon-16x16` | `ac0d857d8_orbitan-favicon-16x16.png` | 16×16 | Favicon PNG | approved |
| `orbitan-favicon-32x32` | `1f68c12af_orbitan-favicon-32x32.png` | 32×32 | Favicon PNG | approved |
| `orbitan-favicon-48x48` | `19697a43a_orbitan-favicon-48x48.png` | 48×48 | Favicon PNG | approved |
| `orbitan-favicon-ico` | `3ecafbc42_orbitan-favicon.ico` | multi-size | Favicon .ico | approved |

### Orbit Nexus Assets

| Asset ID | File | Dimensions | Purpose | Status |
|----------|------|-----------|---------|--------|
| `orbit-nexus-mark-16` | `22cf4d1ca_orbit-nexus-mark-16.png` | 16×16 | Nexus mark (tiny) | approved |
| `orbit-nexus-mark-24` | `409be8571_orbit-nexus-mark-24.png` | 24×24 | Nexus mark (xs) | approved |
| `orbit-nexus-mark-32` | `555127992_orbit-nexus-mark-32.png` | 32×32 | Nexus mark (sm) | approved |
| `orbit-nexus-mark-48` | `69aa09c2a_orbit-nexus-mark-48.png` | 48×48 | Nexus mark (md) | approved |
| `orbit-nexus-mark-64` | `d2d9fabc4_orbit-nexus-mark-64.png` | 64×64 | Nexus mark (lg) | approved |
| `orbit-nexus-mark-72` | `7bf161c99_orbit-nexus-mark-72.png` | 72×72 | Nexus mark | approved |
| `orbit-nexus-mark-96` | `5501f5075_orbit-nexus-mark-96.png` | 96×96 | Nexus mark | approved |
| `orbit-nexus-mark-128` | `f7c33cc8a_orbit-nexus-mark-128.png` | 128×128 | Nexus mark | approved |
| `orbit-nexus-mark-144` | `98ec7b674_orbit-nexus-mark-144.png` | 144×144 | Nexus mark | approved |
| `orbit-nexus-mark-152` | `c5e7436ed_orbit-nexus-mark-152.png` | 152×152 | Nexus mark | approved |
| `orbit-nexus-mark-167` | `2ccdd75ec_orbit-nexus-mark-167.png` | 167×167 | Nexus mark | approved |
| `orbit-nexus-mark-180` | `6ab7c6733_orbit-nexus-mark-180.png` | 180×180 | Nexus mark | approved |
| `orbit-nexus-mark-192` | `c75b637ad_orbit-nexus-mark-192.png` | 192×192 | Nexus mark | approved |
| `orbit-nexus-mark-256` | `e24ff8876_orbit-nexus-mark-256.png` | 256×256 | Nexus mark | approved |
| `orbit-nexus-mark-384` | `3d92feba2_orbit-nexus-mark-384.png` | 384×384 | Nexus mark | approved |
| `orbit-nexus-mark-512` | `e7027b0eb_orbit-nexus-mark-512.png` | 512×512 | Nexus primary mark | approved |
| `orbit-nexus-mark-1024` | `72724b3ed_orbit-nexus-mark-1024.png` | 1024×1024 | Nexus master | approved |
| `orbit-nexus-mark-2048` | `c846687c6_orbit-nexus-mark-2048.png` | 2048×2048 | Nexus master | approved |
| `orbit-nexus-mark-4096` | `e51a64794_orbit-nexus-mark-4096.png` | 4096×4096 | Nexus master (print) | approved |
| `orbit-nexus-android-chrome-192x192` | `baceae7f8_orbit-nexus-android-chrome-192x192.png` | 192×192 | Nexus PWA icon | approved |
| `orbit-nexus-android-chrome-512x512` | `12c3857db_orbit-nexus-android-chrome-512x512.png` | 512×512 | Nexus PWA icon | approved |
| `orbit-nexus-apple-touch-icon` | `2b2f5cdb5_orbit-nexus-apple-touch-icon.png` | 180×180 | Nexus iOS icon | approved |
| `orbit-nexus-favicon-16x16` | `40f56492d_orbit-nexus-favicon-16x16.png` | 16×16 | Nexus favicon | approved |
| `orbit-nexus-favicon-32x32` | `020b2b639_orbit-nexus-favicon-32x32.png` | 32×32 | Nexus favicon | approved |
| `orbit-nexus-favicon-48x48` | `f44c715a9_orbit-nexus-favicon-48x48.png` | 48×48 | Nexus favicon | approved |
| `orbit-nexus-favicon-ico` | `4b06e0a19_orbit-nexus-favicon.ico` | multi-size | Nexus favicon .ico | approved |

## Maskable Icon Declaration

The `orbitan-android-chrome-192x192` and `orbitan-android-chrome-512x512` assets
are declared as `purpose: "maskable"` in `public/manifest.json`. These are
founder-approved purpose-built Android app icon compositions — they are the
correct assets for maskable usage, distinct from the standard transparency-background
`orbitan-mark-*` series which are **not** maskable-safe.

## PWA Favicon Set (index.html)

| Element | Asset | Dimensions |
|---------|-------|-----------|
| `<link rel="icon" type="image/svg+xml">` | `/favicon.svg` (Orbit Ring) | any |
| `<link rel="icon" type="image/x-icon">` | `orbitan-favicon.ico` | multi-size |
| `<link rel="icon" sizes="16x16">` | `orbitan-favicon-16x16.png` | 16×16 |
| `<link rel="icon" sizes="32x32">` | `orbitan-favicon-32x32.png` | 32×32 |
| `<link rel="icon" sizes="48x48">` | `orbitan-favicon-48x48.png` | 48×48 |
| `<link rel="apple-touch-icon">` | `orbitan-apple-touch-icon.png` | 180×180 |

## Social Banner

No approved social banner exists. `og:image` and `twitter:image` are
intentionally omitted from `index.html`. A 1200×630 social banner is pending
founder design and approval.

## Identity Configuration

All assets resolve through `src/lib/orbitan-identity.js → LOGO_ASSETS`.
Components must never hardcode CDN URLs. See `LOGO_ASSETS` for canonical keys.

## Orbit Brand Separation

- **Orbitan assets** (`orbitan-mark-*`, `orbitan-android-*`, `orbitan-favicon-*`,
  `orbitan-apple-touch-icon`) must only be used for OrbitanOS product surfaces.
- **Orbit Nexus assets** (`orbit-nexus-mark-*`, etc.) must only be used for Orbit
  Nexus product surfaces.
- Cross-product brand contamination is a hard constraint — never use Orbitan assets
  where Orbit Nexus branding is required, and vice versa.

## Remaining Limitations

- No approved social banner (1200×630). `og:image` intentionally omitted.
- No standalone wordmark SVG file (wordmark is composed in `OrbitanWordmark.jsx`
  using Sora Bold typography + mark image).
- Orbit Nexus product pages do not yet use the dedicated Nexus favicon set —
  deferred to when the Orbit Nexus standalone product ships.
