// ============================================================
// ORBITAN IDENTITY MAPPING — STRICT BRAND ENFORCEMENT
// This file is the single authority for all Orbitan brand rules.
// Every UI component MUST resolve brand values through this file.
//
// DO NOT hardcode colours, labels, or gradients elsewhere.
// ============================================================

import { OPERATING_CYCLE, SUBSCRIPTION_PLANS, INDUSTRY_PACKS, PLATFORM_IDENTITY } from '@/lib/orbitan-config';

// ─────────────────────────────────────────────────────────────
// LOGO ASSETS
// ─────────────────────────────────────────────────────────────
// ── CDN base (all approved brand assets are Base44-CDN-hosted) ──
const CDN = 'https://media.base44.com/images/public/6a2153efb1a18d0ca28c3a39';

// ── Approved Orbitan mark — founder-supplied asset pack (2026-08-04) ──
// Primary mark: orbitan-mark-* series, transparent background, square, all sizes
// App icons: orbitan-android-chrome-*, orbitan-apple-touch-icon — purpose-built compositions
// Favicons: orbitan-favicon-* — dedicated favicon compositions at correct sizes
const ORBITAN = {
  mark512:        `${CDN}/98099aa9f_orbitan-mark-512.png`,
  mark256:        `${CDN}/dace21675_orbitan-mark-256.png`,
  mark192:        `${CDN}/5d8c3405b_orbitan-mark-192.png`,
  mark180:        `${CDN}/5514bbeb2_orbitan-mark-180.png`,
  mark128:        `${CDN}/e2627a2e9_orbitan-mark-128.png`,
  mark96:         `${CDN}/18b794d67_orbitan-mark-96.png`,
  mark72:         `${CDN}/f64e3e0ff_orbitan-mark-72.png`,
  mark64:         `${CDN}/c409a041b_orbitan-mark-64.png`,
  mark48:         `${CDN}/26072f988_orbitan-mark-48.png`,
  mark32:         `${CDN}/9b29cd972_orbitan-mark-32.png`,
  mark24:         `${CDN}/749caab5a_orbitan-mark-24.png`,
  mark16:         `${CDN}/7b3567715_orbitan-mark-16.png`,
  appIcon192:     `${CDN}/015a99453_orbitan-android-chrome-192x192.png`,
  appIcon512:     `${CDN}/354dae876_orbitan-android-chrome-512x512.png`,
  appleTouchIcon: `${CDN}/42c8f6db0_orbitan-apple-touch-icon.png`,
  favicon16:      `${CDN}/ac0d857d8_orbitan-favicon-16x16.png`,
  favicon32:      `${CDN}/1f68c12af_orbitan-favicon-32x32.png`,
  favicon48:      `${CDN}/19697a43a_orbitan-favicon-48x48.png`,
};

// ── Approved Orbit Nexus mark — founder-supplied asset pack (2026-08-04) ──
const ORBIT_NEXUS = {
  mark512:        `${CDN}/e7027b0eb_orbit-nexus-mark-512.png`,
  mark256:        `${CDN}/e24ff8876_orbit-nexus-mark-256.png`,
  mark192:        `${CDN}/c75b637ad_orbit-nexus-mark-192.png`,
  mark180:        `${CDN}/6ab7c6733_orbit-nexus-mark-180.png`,
  mark128:        `${CDN}/f7c33cc8a_orbit-nexus-mark-128.png`,
  mark96:         `${CDN}/5501f5075_orbit-nexus-mark-96.png`,
  mark64:         `${CDN}/d2d9fabc4_orbit-nexus-mark-64.png`,
  mark48:         `${CDN}/69aa09c2a_orbit-nexus-mark-48.png`,
  mark32:         `${CDN}/555127992_orbit-nexus-mark-32.png`,
  mark24:         `${CDN}/409be8571_orbit-nexus-mark-24.png`,
  mark16:         `${CDN}/22cf4d1ca_orbit-nexus-mark-16.png`,
  appIcon192:     `${CDN}/baceae7f8_orbit-nexus-android-chrome-192x192.png`,
  appIcon512:     `${CDN}/12c3857db_orbit-nexus-android-chrome-512x512.png`,
  appleTouchIcon: `${CDN}/2b2f5cdb5_orbit-nexus-apple-touch-icon.png`,
  favicon16:      `${CDN}/40f56492d_orbit-nexus-favicon-16x16.png`,
  favicon32:      `${CDN}/020b2b639_orbit-nexus-favicon-32x32.png`,
  favicon48:      `${CDN}/f44c715a9_orbit-nexus-favicon-48x48.png`,
};

// ─────────────────────────────────────────────────────────────
// LOGO ASSETS — Canonical public API for all components
// Brand Identity v1.0 — LOCKED (2026-08-04)
// ─────────────────────────────────────────────────────────────
export const LOGO_ASSETS = {
  // ── Orbitan primary mark (transparent, for UI components) ──
  mark:       ORBITAN.mark512,   // Primary mark — navigation, headers, lockups (largest available)
  mark3D:     ORBITAN.mark512,   // Alias for mark — retained for backward compat
  loaderMark: ORBITAN.mark192,   // OrbitanLoader centre — approved mark at loader size
  markSm:     ORBITAN.mark48,    // Small mark (nav icons, list items)
  markXs:     ORBITAN.mark32,    // Extra-small mark (badges, chips)

  // ── Orbitan PWA / device icons ──
  appIcon192:     ORBITAN.appIcon192,     // PWA icon 192×192 (any)
  appIcon512:     ORBITAN.appIcon512,     // PWA icon 512×512 (any)
  appleTouchIcon: ORBITAN.appleTouchIcon, // iOS apple-touch-icon 180×180
  favicon16:      ORBITAN.favicon16,      // Favicon 16×16
  favicon32:      ORBITAN.favicon32,      // Favicon 32×32
  favicon48:      ORBITAN.favicon48,      // Favicon 48×48

  // ── Orbit Nexus product identity ──
  nexusLogo:      ORBIT_NEXUS.mark512,        // Nexus primary mark
  nexusMarkSm:    ORBIT_NEXUS.mark48,          // Nexus small mark
  nexusAppIcon192: ORBIT_NEXUS.appIcon192,     // Nexus PWA icon 192×192
  nexusAppIcon512: ORBIT_NEXUS.appIcon512,     // Nexus PWA icon 512×512

  // ── Wordmark / lockup — text-based (no separate image asset needed) ──
  // wordmark and lockupHorizontal are composed in OrbitanWordmark.jsx
  // using the mark image + Sora Bold typography — no separate image file required.
};

// ─────────────────────────────────────────────────────────────
// 6R PRINCIPLE COLOURS — Canonical order
// ─────────────────────────────────────────────────────────────
export const SIX_R_PRINCIPLES = [
  { key: 'renew',    label: 'Renew',    color: '#16A34A', description: 'Continuous learning, growth & sustainability' },
  { key: 'relate',   label: 'Relate',   color: '#2563EB', description: 'People, teams, communication & relationships' },
  { key: 'respond',  label: 'Respond',  color: '#F97316', description: 'Tasks, operations, execution & service delivery' },
  { key: 'refine',   label: 'Refine',   color: '#7C3AED', description: 'Analytics, optimisation, AI & intelligence' },
  { key: 'regulate', label: 'Regulate', color: '#DC2626', description: 'Governance, security, compliance & audit' },
  { key: 'reach',    label: 'Reach',    color: '#D4AF37', description: 'Growth, expansion, multi-outlet & scaling' },
];

// ─────────────────────────────────────────────────────────────
// SUBSCRIPTION PLAN BRANDING
// ─────────────────────────────────────────────────────────────
export const PLAN_BRAND = {
  orbitan_starter:    { gradient: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', color: '#2563EB', accent: '#FFFFFF',   label: 'Starter' },
  orbitan_growth:     { gradient: 'linear-gradient(135deg, #34D399, #059669)', color: '#10B981', accent: '#FFFFFF',   label: 'Growth' },
  orbitan_business:   { gradient: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', color: '#7C3AED', accent: '#FFFFFF',   label: 'Business' },
  orbitan_enterprise: { gradient: 'linear-gradient(135deg, #1F2937, #111827)', color: '#111827', accent: '#D4AF37',   label: 'Enterprise' },
};

// ─────────────────────────────────────────────────────────────
// INDUSTRY PACK BRANDING — Strict colour map
// ─────────────────────────────────────────────────────────────
export const PACK_BRAND = {
  fnb:          { color: '#F97316', label: 'F&B',            description: 'Food & Beverage operations' },
  retail:       { color: '#EC4899', label: 'Retail',          description: 'Retail & commerce operations' },
  recycling:    { color: '#16A34A', label: 'Sustainability',  description: 'Recycling & sustainability' },
  healthcare:   { color: '#06B6D4', label: 'Healthcare',      description: 'Healthcare operations' },
  logistics:    { color: '#2563EB', label: 'Logistics',       description: 'Logistics & supply chain' },
  construction: { color: '#EAB308', label: 'Construction',    description: 'Construction operations' },
  technology:   { color: '#6366F1', label: 'Technology',      description: 'Tech & software operations' },
  events:       { color: '#A855F7', label: 'Events',          description: 'Events & activations' },
  facilities:   { color: '#64748B', label: 'Facilities',      description: 'Facilities management' },
  education:    { color: '#14B8A6', label: 'Education',       description: 'Education & campus operations' },
};

// ─────────────────────────────────────────────────────────────
// CANONICAL TENANT CONTEXT — Fast identity resolution
// ─────────────────────────────────────────────────────────────
export const TENANT_CONTEXT = {
  taqueria_pte_ltd:        { brand: 'Taqueria Pte Ltd',    pack: 'fnb',       plan: 'orbitan_enterprise', accent: '#F97316', sub_brand: 'La Birria Tacos' },
  renewed_resources_pte_ltd:{ brand: 'Renewed Resources',   pack: 'recycling', plan: 'orbitan_business',    accent: '#16A34A', sub_brand: null },
  renewed_fashion:         { brand: 'Renewed Fashion',      pack: 'retail',    plan: 'orbitan_business',    accent: '#22C55E', sub_brand: null },
  izaliqa_bakes:           { brand: 'Izaliqa Bakes',        pack: 'fnb',       plan: 'orbitan_starter',     accent: '#F97316', sub_brand: null },
};

// ─────────────────────────────────────────────────────────────
// RESOLVERS — Pure functions for brand enforcement
// ─────────────────────────────────────────────────────────────

/**
 * Resolve tenant context from a tenant reference key.
 * Returns brand accent colour, pack, and plan for UI tinting.
 */
export function resolveTenantBrand(tenantRef) {
  const context = TENANT_CONTEXT[tenantRef];
  if (!context) return null;
  const pack = PACK_BRAND[context.pack];
  const plan = PLAN_BRAND[context.plan];
  return { ...context, packColor: pack?.color || '#2563EB', planGradient: plan?.gradient, planColor: plan?.color };
}

/**
 * Get the background tint for a given tenant context.
 * Used to dynamically style the AuthGateway background.
 */
export function getTenantBackgroundTint(tenantRef) {
  const brand = resolveTenantBrand(tenantRef);
  if (!brand) return { bg: '#0A0F1A', orb: 'rgba(37,99,235,0.03)', accent: '#3B82F6' };
  return {
    bg: '#0A0F1A',
    orb: `${brand.packColor}0D`,
    accent: brand.packColor,
  };
}

// ─────────────────────────────────────────────────────────────
// ORBITAN SHIELD BRANDING
// ─────────────────────────────────────────────────────────────
export const SHIELD_BRAND = {
  color: '#DC2626',
  label: 'Orbit Shield™',
  poweredBy: 'Regulate',
  description: 'Enterprise-grade security, governance, and compliance. Every record, every action, auditable.',
};

// ─────────────────────────────────────────────────────────────
// PLATFORM TAGLINES
// ─────────────────────────────────────────────────────────────
export const TAGLINES = {
  primary: 'Run Your Business. Connect Everything.',
  secondary: 'One Operating System for Workforce, Inventory, Operations, Finance, Sustainability, and Growth.',
};