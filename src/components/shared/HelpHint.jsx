import React from 'react';
import { Info } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/**
 * HelpHint — lightweight inline info popover for short one-line hints.
 *
 * Use next to form labels, table headers, and inline metrics where a full
 * ContextualHelp block would be overkill. Click-to-open (not hover) so it is
 * usable on touch devices and with keyboard navigation.
 *
 * Props:
 *  - text:  string|node — short hint (1-2 sentences)
 *  - side:  popover placement
 */
export default function HelpHint({ text, side = 'top', align = 'center', className, iconClassName }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="More information"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
          className={cn(
            'inline-flex items-center justify-center text-muted-foreground/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full transition-colors align-middle',
            className
          )}
        >
          <Info className={cn('w-3.5 h-3.5', iconClassName)} />
        </button>
      </PopoverTrigger>
      <PopoverContent side={side} align={align} className="w-64 p-3 text-xs text-muted-foreground leading-relaxed">
        {text}
      </PopoverContent>
    </Popover>
  );
}