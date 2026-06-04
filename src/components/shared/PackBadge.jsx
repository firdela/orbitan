import React from 'react';
import { cn } from '@/lib/utils';

// Orbitan Industry Pack colour registry
const PACK_CONFIG = {
  // Industry Packs
  fnb:              { label: 'F&B',            color: '#F97316', bg: '#FFF7ED', border: '#FED7AA' },
  food_beverage:    { label: 'F&B',            color: '#F97316', bg: '#FFF7ED', border: '#FED7AA' },
  retail:           { label: 'Retail',         color: '#22C55E', bg: '#F0FDF4', border: '#BBF7D0' },
  recycling:        { label: 'Sustainability', color: '#16A34A', bg: '#F0FDF4', border: '#86EFAC' },
  sustainability:   { label: 'Sustainability', color: '#16A34A', bg: '#F0FDF4', border: '#86EFAC' },
  healthcare:       { label: 'Healthcare',     color: '#06B6D4', bg: '#ECFEFF', border: '#A5F3FC' },
  education:        { label: 'Education',      color: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE' },
  logistics:        { label: 'Logistics',      color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  construction:     { label: 'Construction',   color: '#EAB308', bg: '#FEFCE8', border: '#FEF08A' },
  technology:       { label: 'Technology',     color: '#0F172A', bg: '#F8FAFC', border: '#E2E8F0' },
  // Capability Packs
  core:             { label: 'Core',           color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  finance:          { label: 'Finance',        color: '#0F172A', bg: '#F8FAFC', border: '#CBD5E1' },
  ai:               { label: 'AI Suite',       color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  compliance:       { label: 'Compliance',     color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  governance:       { label: 'Governance',     color: '#111827', bg: '#F9FAFB', border: '#E5E7EB' },
  xero:             { label: 'Xero',           color: '#00A0D2', bg: '#EFF9FF', border: '#BAE6FD' },
};

// Subscription plan tier badge
const PLAN_CONFIG = {
  orbitan_starter:    { label: 'Starter',    gradient: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' },
  orbitan_growth:     { label: 'Growth',     gradient: 'linear-gradient(135deg, #34D399, #059669)' },
  orbitan_business:   { label: 'Business',   gradient: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' },
  orbitan_enterprise: { label: 'Enterprise', gradient: 'linear-gradient(135deg, #374151, #111827)', accent: '#D4AF37' },
};

/**
 * PackBadge — renders a single industry/capability pack tag
 * Usage: <PackBadge pack="fnb" />
 */
export function PackBadge({ pack, label: overrideLabel, size = 'sm', className }) {
  const key = (pack || '').toLowerCase().replace(/[^a-z_]/g, '');
  const config = PACK_CONFIG[key] || { label: pack || 'Pack', color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' };
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
  return (
    <span
      className={cn('inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full text-white', className)}
      style={{ background: config.gradient }}
    >
      {config.label}
    </span>
  );
}

export default PackBadge;