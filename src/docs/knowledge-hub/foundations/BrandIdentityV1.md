# Brand Identity v1.0 — LOCKED

**Lock Date:** 2026-08-04
**Authority:** Muhammad Firdaus Bin Ismail (Founder & Product Owner)
**Status:** FROZEN — No modifications without explicit founder approval

---

## LOCK DECLARATION

The following brand elements are **locked** as of 2026-08-04. They must not be
replaced, recoloured, redrawn, regenerated, AI-enhanced, vectorised differently,
cropped, distorted, or reinterpreted without explicit founder approval.

| Element | Status | Authority |
|---------|--------|-----------|
| Orbitan logo (mark) | **LOCKED** | Founder-approved, 2026-08-04 |
| Orbit Nexus logo (mark) | **LOCKED** | Founder-approved, 2026-08-04 |
| Favicons | **LOCKED** | Founder-approved, 2026-08-04 |
| PWA icons (any + maskable) | **LOCKED** | Founder-approved, 2026-08-04 |
| Apple Touch Icon | **LOCKED** | Founder-approved, 2026-08-04 |
| Brand colours | **LOCKED** | src/index.css design token system |
| Identity architecture | **LOCKED** | src/lib/orbitan-identity.js |

---

## Asset Inventory

### Orbitan (26 assets)

All approved Orbitan assets are registered on the Base44 CDN and referenced
canonically through `LOGO_ASSETS` in `src/lib/orbitan-identity.js`.

**Mark series (19 sizes):** 16, 24, 32, 48, 64, 72, 96, 128, 144, 152, 167, 180,
192, 256, 384, 512, 1024, 2048, 4096 px (all transparent background, square).

**App icon series (3):**
- `orbitan-android-chrome-192x192.png` (192×192, any + maskable)
- `orbitan-android-chrome-512x512.png` (512×512, any + maskable)
- `orbitan-apple-touch-icon.png` (180×180, iOS)

**Favicon series (4):**
- `orbitan-favicon.ico` (multi-size)
- `orbitan-favicon-16x16.png` (16×16)
- `orbitan-favicon-32x32.png` (32×32)
- `orbitan-favicon-48x48.png` (48×48)

### Orbit Nexus (26 assets)

**Mark series (19 sizes):** 16, 24, 32, 48, 64, 72, 96, 128, 144, 152, 167, 180,
192, 256, 384, 512, 1024, 2048, 4096 px.

**App icon series (3):**
- `orbit-nexus-android-chrome-192x192.png` (192×192)
- `orbit-nexus-android-chrome-512x512.png` (512×512)
- `orbit-nexus-apple-touch-icon.png` (180×180)

**Favicon series (4):**
- `orbit-nexus-favicon.ico`
- `orbit-nexus-favicon-16x16.png`
- `orbit-nexus-favicon-32x32.png`
- `orbit-nexus-favicon-48x48.png`

---

## Canonical References

| Reference | Location |
|-----------|----------|
| Asset registry | `public/brand/asset-manifest.json` |
| Asset documentation | `public/brand/README.md` |
| Identity configuration | `src/lib/orbitan-identity.js → LOGO_ASSETS` |
| PWA manifest | `public/manifest.json` |
| HTML metadata | `index.html` |
| Experience Architecture | `src/docs/knowledge-hub/design/Orbitan-Experience-Architecture.md` |

---

## Brand Separation Rules (Hard Constraints)

1. Orbitan assets must **only** appear on OrbitanOS product surfaces.
2. Orbit Nexus assets must **only** appear on Orbit Nexus product surfaces.
3. Cross-product contamination is a hard defect — not a style preference.
4. No CDN URL may be hardcoded in any component. All references must resolve through `LOGO_ASSETS`.

---

## Modification Process

Any change to locked brand elements requires:
1. Explicit written approval from the founder.
2. A new asset uploaded to the CDN and registered in `asset-manifest.json`.
3. `LOGO_ASSETS` updated in `orbitan-identity.js`.
4. This document updated with the new lock date.
5. A new ADR created if the change affects the identity architecture.

---

## Pending (Not Locked — Require New Assets)

| Asset | Status |
|-------|--------|
| Approved social banner (1200×630) | Pending founder design |
| Orbit Nexus favicon integration in Nexus pages | Deferred to Nexus standalone product launch |

---

*This document is part of the Orbitan Frozen Foundations. It lives alongside:*
- *RA-0000 (Architecture Governance)*
- *RA-0004 (Platform Services)*
- *RA-0005 (Identity Architecture)*
- *Orbitan Frozen Foundations v1.0*
- *Orbitan MVP Charter*
- *Orbitan Build Manifest v1.0*