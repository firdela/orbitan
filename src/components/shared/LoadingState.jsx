import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * LoadingState — Standardized inline loading indicator (Build #19B-3).
 *
 * Use for page sections, table bodies, and content areas while data fetches.
 * For fullscreen app loading, use OrbitanLoader size="fullscreen".
 *
 * Accessibility: role="status" + aria-live="polite" announces to screen readers
 * when loading begins and ends.
 *
 * Props:
 *   message  — optional text shown beside the spinner
 *   size     — 'sm' | 'md' (default) | 'lg'
 *   className — additional classes on the container
 */
export default function LoadingState({ message, size = 'md', className }) {
  const sizeMap = {
    sm: { icon: 'w-4 h-4', py: 'py-8' },
    md: { icon: 'w-6 h-6', py: 'py-16' },
    lg: { icon: 'w-8 h-8', py: 'py-20' },
  };
  const s = sizeMap[size] || sizeMap.md;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={message || 'Loading'}
      className={cn('flex items-center justify-center gap-2.5 text-muted-foreground', s.py, className)}
    >
      <Loader2 className={cn(s.icon, 'animate-spin')} />
      {message && <span className="text-sm">{message}</span>}
    </div>
  );
}