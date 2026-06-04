import React from 'react';
import { cn } from '@/lib/utils';
import { INDUSTRY_PACKS } from '@/lib/orbitan-config';

// Build pack config dynamically from the master DNA file
// Capability packs (non-industry) are defined here as static overrides
const CAPABILITY_PACKS = {
  core:       { label: 'Core',       color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  finance:    { label: 'Finance',    color: '#0F172A', bg: '#F8FAFC', border: '#CBD5E1' },
  ai:         { label: 'AI Suite',   color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  compliance: { label: 'Compliance', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  governance: { label: 'Governance', color: '#111827', bg: '#F9FAFB', border: '#E5E7EB' },
  xero:       { label: 'Xero',       color: '#00A0D2', bg: '#EFF9FF', border: '#BAE6FD' },
};

function resolvePackConfig(key) {
  // Check capability packs first
  if (CAPABILITY_PACKS[key]) return CAPABILITY_PACKS[key];
  // Then resolve from master DNA
  const pack = INDUSTRY_PACKS[key];
  if (pack) {
    const c = pack.color_hex;
    return { label: pack.badge_label, color: c, bg: c + '15', border: c + '40' };
  }
  // Legacy aliases
  const ALIASES = {
    food_beverage: 'fnb',
    recycling_sustainability: 'recycling',
    sustainability: 'recycling',
    technology_software: 'technology',
    events_activations: 'events',
  };
  if (ALIASES[key]) return resolvePackConfig(ALIASES[key]);
  return { label: key, color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' };
}

// Subscription plan tier badge
const PLAN_CONFIG = {
  orbitan_starter:    { label: 'Starter',    gradient: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', border: 'transparent' },
  orbitan_growth:     { label: 'Growth',     gradient: 'linear-gradient(135deg, #34D399, #059669)', border: 'transparent' },
  orbitan_business:   { label: 'Business',   gradient: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', border: 'transparent' },
  orbitan_enterprise: { label: 'Enterprise', gradient: 'linear-gradient(135deg, #111827, #1F2937)', border: '#D4AF37' },
};

/**
 * PackBadge — renders a single industry/capability pack tag
 * Usage: <PackBadge pack="fnb" />
 */
export function PackBadge({ pack, label: overrideLabel, size = 'sm', className }) {
  const key = (pack || '').toLowerCase().replace(/[^a-z_]/g, '');
  const config = resolvePackConfig(key);
  const label = overrideLabel || config.label;

  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      className={cn('inline-flex items-center font-semibold rounded-full border', sizeClasses[size] || sizeClasses.sm, className)}
      style={{ color: config.color, background: config.bg, borderColor: config.border }}
    >
      {label}
    </span>
  );
}

/**
 * PackBadgeGroup — renders a row of pack badges for a tenant
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
 * PlanBadge — renders the subscription tier badge (Starter / Growth / Business / Enterprise)
 * Usage: <PlanBadge plan="orbitan_enterprise" />
 */
export function PlanBadge({ plan, className }) {
  const config = PLAN_CONFIG[plan] || PLAN_CONFIG.orbitan_starter;
  const isEnterprise = plan === 'orbitan_enterprise';
  return (
    <span
      className={cn('inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border', className)}
      style={{
        background: config.gradient,
        color: isEnterprise ? '#D4AF37' : '#fff',
        borderColor: config.border,
      }}
    >
      {config.label}
    </span>
  );
}

export default PackBadge;