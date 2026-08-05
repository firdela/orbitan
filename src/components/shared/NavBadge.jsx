// ============================================================
// ORBITANOS — Sidebar Navigation Badge (Build #28.2I)
// Reusable action-count badge for sidebar items.
// Hides at zero, shows 1–99, shows 99+ above 99.
// Includes accessible aria-label for screen readers.
// ============================================================

import React from 'react';
import { cn } from '@/lib/utils';

export default function NavBadge({ count, ariaLabel, variant = 'default', className }) {
  if (count == null || count === 0) return null;

  const display = count > 99 ? '99+' : String(count);

  const variantClasses = {
    default: 'bg-primary text-primary-foreground',
    warning: 'bg-amber-500 text-white',
    error: 'bg-destructive text-destructive-foreground',
  };

  return (
    <span
      aria-label={ariaLabel}
      role="status"
      className={cn(
        'inline-flex items-center justify-center min-w-[18px] h-[18px] text-[9px] font-bold rounded-full px-1 tabular-nums flex-shrink-0',
        variantClasses[variant] || variantClasses.default,
        className
      )}
    >
      {display}
    </span>
  );
}