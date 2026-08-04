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
  // Mark series — corrected transparent pack (2026-08-04), genuine alpha channel, no checkerboard
  mark4096:       `${CDN}/534d5632a_orbitan-mark-4096.png`,
  mark2048:       `${CDN}/488b4be03_orbitan-mark-2048.png`,
  mark1024:       `${CDN}/cf12f0b98_orbitan-mark-1024.png`,
  mark512:        `${CDN}/3f8478f3b_orbitan-mark-512.png`,
  mark384:        `${CDN}/9651c783b_orbitan-mark-384.png`,
  mark256:        `${CDN}/ab30dda12_orbitan-mark-256.png`,
  mark192:        `${CDN}/8aa45682c_orbitan-mark-192.png`,
  mark180:        `${CDN}/07eb467e7_orbitan-mark-180.png`,
  mark167:        `${CDN}/1cfccded9_orbitan-mark-167.png`,
  mark152:        `${CDN}/362507a64_orbitan-mark-152.png`,
  mark144:        `${CDN}/0fe847dd0_orbitan-mark-144.png`,
  mark128:        `${CDN}/695a587ca_orbitan-mark-128.png`,
  mark96:         `${CDN}/f3f966a35_orbitan-mark-96.png`,
  mark72:         `${CDN}/8b9bc48d2_orbitan-mark-72.png`,
  mark64:         `${CDN}/3f8bb5549_orbitan-mark-64.png`,
  mark48:         `${CDN}/07e20034a_orbitan-mark-48.png`,
  mark32:         `${CDN}/388a276e0_orbitan-mark-32.png`,
  mark24:         `${CDN}/cbb4e5d8f_orbitan-mark-24.png`,
  mark16:         `${CDN}/3a3a41088_orbitan-mark-16.png`,
  master:         `${CDN}/5b691cc7e_orbitan-master-transparent.png`, // 1254×1254 verified master
  // App icons — transparent 'any' purpose only (not maskable-certified)
  appIcon192:     `${CDN}/a5427bd5a_orbitan-android-chrome-192x192.png`,
  appIcon512:     `${CDN}/6ae468ddc_orbitan-android-chrome-512x512.png`,
  appleTouchIcon: `${CDN}/6d567efff_orbitan-apple-touch-icon.png`,
  // Favicon series
  favicon16:      `${CDN}/5d0083b5f_orbitan-favicon-16x16.png`,
  favicon32:      `${CDN}/bc8ac0b61_orbitan-favicon-32x32.png`,
  favicon48:      `${CDN}/ce1e8dc82_orbitan-favicon-48x48.png`,
  faviconIco:     `${CDN}/c4450dc86_orbitan-favicon.ico`,
  socialBanner:   `${CDN}/348a29f76_Orbitanbanner.png`, // Founder-approved social banner (1200×630)
};

// ── Approved Orbit Nexus mark — founder-supplied asset pack (2026-08-04) ──
const ORBIT_NEXUS = {
  // Mark series — corrected transparent pack (2026-08-04), genuine alpha channel, no checkerboard
  mark4096:       `${CDN}/0b4ce01b1_orbit-nexus-mark-4096.png`,
  mark2048:       `${CDN}/92dba4696_orbit-nexus-mark-2048.png`,
  mark1024:       `${CDN}/e43172987_orbit-nexus-mark-1024.png`,
  mark512:        `${CDN}/66cefa242_orbit-nexus-mark-512.png`,
  mark384:        `${CDN}/0bedbb6ab_orbit-nexus-mark-384.png`,
  mark256:        `${CDN}/4d3027f67_orbit-nexus-mark-256.png`,
  mark192:        `${CDN}/5f7cb74c1_orbit-nexus-mark-192.png`,
  mark180:        `${CDN}/1704ceb9f_orbit-nexus-mark-180.png`,
  mark167:        `${CDN}/5e2b4db58_orbit-nexus-mark-167.png`,
  mark152:        `${CDN}/d4ef7af75_orbit-nexus-mark-152.png`,
  mark144:        `${CDN}/96076e0bb_orbit-nexus-mark-144.png`,
  mark128:        `${CDN}/0825fe36b_orbit-nexus-mark-128.png`,
  mark96:         `${CDN}/8d5f40e9f_orbit-nexus-mark-96.png`,
  mark72:         `${CDN}/2109c2e6a_orbit-nexus-mark-72.png`,
  mark64:         `${CDN}/65bda1c7b_orbit-nexus-mark-64.png`,
  mark48:         `${CDN}/f68d615be_orbit-nexus-mark-48.png`,
  mark32:         `${CDN}/9b4b24815_orbit-nexus-mark-32.png`,
  mark24:         `${CDN}/489295e6d_orbit-nexus-mark-24.png`,
  mark16:         `${CDN}/d7ac31a63_orbit-nexus-mark-16.png`,
  master:         `${CDN}/63aa1eb45_orbit-nexus-mark-master-transparent.png`, // 1254×1254 verified master
  // App icons — transparent 'any' purpose only (not maskable-certified)
  appIcon192:     `${CDN}/1d9f64267_orbit-nexus-android-chrome-192x192.png`,
  appIcon512:     `${CDN}/dbe17a146_orbit-nexus-android-chrome-512x512.png`,
  appleTouchIcon: `${CDN}/6966d2e45_orbit-nexus-apple-touch-icon.png`,
  // Favicon series
  favicon16:      `${CDN}/42ec9ac89_orbit-nexus-favicon-16x16.png`,
  favicon32:      `${CDN}/7ee6e306f_orbit-nexus-favicon-32x32.png`,
  favicon48:      `${CDN}/a41c02143_orbit-nexus-favicon-48x48.png`,
  faviconIco:     `${CDN}/69fb1d6f4_orbit-nexus-favicon.ico`,
};

// ─────────────────────────────────────────────────────────────
// LOGO ASSETS — Canonical public API for all components
// Brand Identity v1.0 — LOCKED (2026-08-04)
// ─────────────────────────────────────────────────────────────
export const LOGO_ASSETS = {
  // ── Orbitan primary mark (corrected transparent pack, genuine alpha) ──
  mark:       ORBITAN.mark512,   // Primary mark — navigation, headers, lockups
  mark3D:     ORBITAN.mark512,   // Alias retained for backward compat
  loaderMark: ORBITAN.mark192,   // OrbitanLoader centre
  markSm:     ORBITAN.mark48,    // Small mark (nav icons, list items)
  markXs:     ORBITAN.mark32,    // Extra-small mark (badges, chips)
  master:     ORBITAN.master,    // 1254×1254 verified transparent master

  // ── Orbitan PWA / device icons (transparent 'any' — not maskable-certified) ──
  appIcon192:     ORBITAN.appIcon192,     // PWA icon 192×192 (any)
  appIcon512:     ORBITAN.appIcon512,     // PWA icon 512×512 (any)
  appleTouchIcon: ORBITAN.appleTouchIcon, // iOS apple-touch-icon 180×180
  favicon16:      ORBITAN.favicon16,      // Favicon 16×16
  favicon32:      ORBITAN.favicon32,      // Favicon 32×32
  favicon48:      ORBITAN.favicon48,      // Favicon 48×48

  // ── Orbit Nexus product identity (corrected transparent pack) ──
  nexusLogo:       ORBIT_NEXUS.mark512,    // Nexus primary mark
  nexusMarkSm:     ORBIT_NEXUS.mark48,     // Nexus small mark
  nexusMaster:     ORBIT_NEXUS.master,     // 1254×1254 verified transparent master
  nexusAppIcon192: ORBIT_NEXUS.appIcon192, // Nexus PWA icon 192×192 (any)
  nexusAppIcon512: ORBIT_NEXUS.appIcon512, // Nexus PWA icon 512×512 (any)

  // ── Social / marketing banner ──
  socialBanner: ORBITAN.socialBanner, // Founder-approved 1200×630 social banner (og:image / twitter:image)

  // ── Wordmark / lockup — text-based (no separate image asset needed) ──
  // Composed in OrbitanWordmark.jsx using mark + Sora Bold typography.
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