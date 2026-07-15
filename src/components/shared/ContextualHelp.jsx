import React from 'react';
import { Info } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/**
 * ContextualHelp — accessible, click-to-open guidance popover.
 *
 * Golden UI/UX Standard: Contextual Help & Information.
 * Uses a Popover (not hover tooltip) so it works on touch, keyboard, and mouse.
 *
 * Props:
 *  - content:  string|node  — the main explanation
 *  - title:    string       — optional heading
 *  - tips:     string[]     — optional best-practice tips
 *  - icon:     lucide icon  — defaults to Info
 *  - side/align: popover placement
 *
 * Only render where additional context genuinely improves UX.
 */
export default function ContextualHelp({
  content,
  title,
  tips,
  icon: Icon = Info,
  side = 'top',
  align = 'center',
  className,
  iconClassName,
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={title ? `More info: ${title}` : 'More information'}
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
          className={cn(
            'inline-flex items-center justify-center rounded-full text-muted-foreground/70 hover:text-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 transition-colors w-5 h-5 shrink-0',
            className
          )}
        >
          <Icon className={cn('w-4 h-4', iconClassName)} />
        </button>
      </PopoverTrigger>
      <PopoverContent side={side} align={align} className="w-72 p-4">
        {title && (
          <p className="text-sm font-heading font-semibold text-foreground mb-1.5">{title}</p>
        )}
        {content && (
          <p className="text-xs text-muted-foreground leading-relaxed">{content}</p>
        )}
        {tips && tips.length > 0 && (
          <div className="mt-2.5 pt-2.5 border-t border-border/60">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/70 mb-1.5">Tips</p>
            <ul className="space-y-1.5">
              {tips.map((tip, i) => (
                <li key={i} className="text-xs text-muted-foreground leading-relaxed flex gap-1.5">
                  <span className="text-primary mt-px shrink-0">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}