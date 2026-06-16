import React from 'react';
import { cn } from '@/lib/utils';
import { PACK_BRAND } from '@/lib/orbitan-identity';
import { INDUSTRY_PACKS } from '@/lib/orbitan-config';

// ── Capability / Non-Industry Packs ─────────────────────────────────────────
// Using exact brand colours from Orbitan design system
const CAPABILITY_PACKS = {
  core:       { label: 'Core',       color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  finance:    { label: 'Finance',    color: '#0F172A', bg: '#F1F5F9', border: '#CBD5E1' },
  ai:         { label: 'AI Suite',   color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  compliance: { label: 'Compliance', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  governance: { label: 'Governance', color: '#374151', bg: '#F9FAFB', border: '#E5E7EB' },
  xero:       { label: 'Xero',       color: '#00A0D2', bg: '#EFF9FF', border: '#BAE6FD' },
};

// ── Industry Pack colours — resolved from orbitan-identity (single source of truth) ──
function resolvePackColor(key) {
  const entry = PACK_BRAND[key];
  if (entry) return { label: entry.label, color: entry.color, bg: entry.color + '18', border: entry.color + '45' };
  return null;
}

function resolvePackConfig(key) {
  const k = (key || '').toLowerCase().trim();

  // 1. Capability packs
  if (CAPABILITY_PACKS[k]) return CAPABILITY_PACKS[k];

  // 2. Industry pack colour system — sourced from orbitan-identity (authoritative)
  const packColor = resolvePackColor(k);
  if (packColor) return packColor;

  // 3. Resolve from master DNA config as fallback
  const pack = INDUSTRY_PACKS?.[k];
  if (pack) {
    const c = pack.color_hex;
    return { label: pack.badge_label || pack.name || k, color: c, bg: c + '18', border: c + '45' };
  }

  // 4. Legacy aliases
  const ALIASES = {
    food_beverage:           'fnb',
    recycling_sustainability:'recycling',
    sustainability:          'recycling',
    technology_software:     'technology',
    events_activations:      'events',
    facilities_management:   'facilities',
  };
  if (ALIASES[k]) return resolvePackConfig(ALIASES[k]);

  // 5. Fallback
  return { label: key, color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' };
}

// ── Subscription Plan Tier Badges ───────────────────────────────────────────
// Exact gradients from the Subscription Colour Framework
const PLAN_CONFIG = {
  orbitan_starter:    {
    label: 'Starter',
    gradient: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
    color: '#fff',
    border: 'transparent',
  },
  orbitan_growth:     {
    label: 'Growth',
    gradient: 'linear-gradient(135deg, #34D399, #059669)',
    color: '#fff',
    border: 'transparent',
  },
  orbitan_business:   {
    label: 'Business',
    gradient: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
    color: '#fff',
    border: 'transparent',
  },
  orbitan_enterprise: {
    label: 'Enterprise',
    gradient: 'linear-gradient(135deg, #1F2937, #111827)',
    color: '#D4AF37',      // Gold accent for Enterprise
    border: '#D4AF37',
  },
};

// ────────────────────────────────────────────────────────────────────────────

/**
 * PackBadge — renders a single industry / capability pack tag.
 * Colours are always sourced from the Orbitan master brand framework.
 * Usage: <PackBadge pack="fnb" />
 */
export function PackBadge({ pack, label: overrideLabel, size = 'sm', className }) {
  const key = (pack || '').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, '');
  const config = resolvePackConfig(key);
  const label = overrideLabel || config.label;

  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-[2px] tracking-wide',
    sm: 'text-[10px] px-2 py-[3px] tracking-wide',
    md: 'text-[11px] px-2.5 py-1',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-bold rounded-full border leading-none',
        sizeClasses[size] || sizeClasses.sm,
        className
      )}
      style={{ color: config.color, background: config.bg, borderColor: config.border }}
    >
      {label}
    </span>
  );
}

/**
 * PackBadgeGroup — renders a row of pack badges.
 * For Enterprise multi-pack tenants, this is the canonical visual identity.
 * Usage: <PackBadgeGroup packs={['core', 'fnb', 'finance', 'ai', 'compliance']} />
 */
export function PackBadgeGroup({ packs = [], size = 'sm', className }) {
  if (!packs || packs.length === 0) return null;
  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {packs.map((pack) => (
        <PackBadge key={pack} pack={pack} size={size} />
      ))}
    </div>
  );
}

/**
 * PlanBadge — renders the subscription tier badge.
 * Strictly follows the Subscription Colour Framework.
 * Usage: <PlanBadge plan="orbitan_enterprise" />
 */
export function PlanBadge({ plan, className }) {
  const config = PLAN_CONFIG[plan] || PLAN_CONFIG.orbitan_starter;
  return (
    <span
      className={cn(
        'inline-flex items-center text-[9px] font-bold px-2 py-[3px] rounded-full border tracking-wide uppercase leading-none',
        className
      )}
      style={{
        background: config.gradient,
        color: config.color,
        borderColor: config.border,
      }}
    >
      {config.label}
    </span>
  );
}

export default PackBadge;