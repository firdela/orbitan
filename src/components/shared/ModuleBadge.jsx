import React from 'react';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';

export default function ModuleBadge({ moduleKey, name, enabled = true, size = 'sm' }) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  };

  if (!enabled) {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-muted text-muted-foreground font-medium",
        sizeClasses[size]
      )}>
        <Lock className="w-2.5 h-2.5" />
        {name}
      </span>
    );
  }

  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full bg-orbitan-blue-light text-orbitan-blue font-medium border border-blue-100",
      sizeClasses[size]
    )}>
      <span className="w-1.5 h-1.5 rounded-full bg-orbitan-blue" />
      {name}
    </span>
  );
}