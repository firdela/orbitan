// ============================================================
// ORBITAN — Auth Error Alert
//
// Accessible error/warning/success display for auth pages.
// Uses role="alert" + aria-live="assertive" for screen readers.
// Auto-focuses on mount for keyboard users.
// ============================================================

import React, { useEffect, useRef } from 'react';
import { AlertCircle, Info, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const VARIANTS = {
  error: {
    icon: AlertCircle,
    className: 'bg-destructive/10 text-destructive border-destructive/20',
    iconClass: 'text-destructive',
  },
  warning: {
    icon: AlertTriangle,
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    iconClass: 'text-amber-500',
  },
  success: {
    icon: CheckCircle2,
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    iconClass: 'text-emerald-500',
  },
  info: {
    icon: Info,
    className: 'bg-primary/10 text-primary border-primary/20',
    iconClass: 'text-primary',
  },
};

export default function AuthAlert({ variant = 'error', message, className, autoFocus = true }) {
  const ref = useRef(null);
  const config = VARIANTS[variant] || VARIANTS.error;
  const Icon = config.icon;

  useEffect(() => {
    if (autoFocus && ref.current) {
      // Focus the alert container for screen readers after a short delay
      // to ensure the DOM has updated.
      const timer = setTimeout(() => {
        ref.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [message, autoFocus]);

  if (!message) return null;

  return (
    <div
      ref={ref}
      role="alert"
      aria-live="assertive"
      tabIndex={-1}
      className={cn(
        'flex items-start gap-3 mb-4 p-3 rounded-lg border text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
        config.className,
        className
      )}
    >
      <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', config.iconClass)} aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}