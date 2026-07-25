import React from 'react';
import { cn } from '@/lib/utils';

// 5-tier health badge — reused across all CS sections
const TIER_CONFIG = {
  excellent: { label: 'Excellent', classes: 'bg-green-50 text-orbitan-green-700 border-green-200', dot: 'bg-orbitan-green' },
  healthy:   { label: 'Healthy',   classes: 'bg-emerald-50 text-orbitan-green-700 border-emerald-200', dot: 'bg-emerald-500' },
  monitor:   { label: 'Monitor',  classes: 'bg-orbitan-amber-light text-orbitan-amber-700 border-amber-100', dot: 'bg-orbitan-amber' },
  at_risk:   { label: 'At Risk',  classes: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  critical:  { label: 'Critical', classes: 'bg-orbitan-red-light text-orbitan-red-700 border-red-100', dot: 'bg-orbitan-red' },
};

export const HEALTH_TIERS = TIER_CONFIG;

export default function CSHealthBadge({ tier, score, size = 'sm' }) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.monitor;
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border font-medium', config.classes, sizeClass)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
      {config.label}{score != null && <span className="opacity-70">· {score}</span>}
    </span>
  );
}