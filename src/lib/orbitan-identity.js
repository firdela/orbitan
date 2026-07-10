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
export const LOGO_ASSETS = {
  mark: 'https://media.base44.com/images/public/6a2153efb1a18d0ca28c3a39/10527badf_bluecircularlogoonblac.png',
  mark3D: 'https://media.base44.com/images/public/6a2153efb1a18d0ca28c3a39/7b205f7ab_Orbitan_3d_logo_transparent.png',
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