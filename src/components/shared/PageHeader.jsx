import React from 'react';
import { cn } from '@/lib/utils';
import ContextualHelp from '@/components/shared/ContextualHelp';

export default function PageHeader({ title, subtitle, actions, className, help }) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6", className)}>
      <div>
        <div className="flex items-center gap-1.5">
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-foreground">{title}</h2>
          {help && <ContextualHelp {...(typeof help === 'string' ? { content: help } : help)} />}
        </div>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}