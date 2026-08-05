// ============================================================
// Widget: Next Priority
// Shows the worker's single highest-priority actionable item.
// Uses the canonical priority resolver.
// ============================================================
import React from 'react';
import { ChevronRight, CheckCircle2, AlertTriangle, Shield, Clock, Megaphone, Zap } from 'lucide-react';

const PRIORITY_STYLES = {
  critical: { icon: Zap, bg: 'bg-destructive/5 border-destructive/20', iconBg: 'bg-destructive/10 text-destructive', label: 'Critical' },
  high:     { icon: AlertTriangle, bg: 'bg-amber-500/5 border-amber-500/20', iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', label: 'High' },
  medium:   { icon: Megaphone, bg: 'bg-blue-500/5 border-blue-500/20', iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', label: 'Medium' },
  low:      { icon: Clock, bg: 'bg-muted/30 border-border', iconBg: 'bg-muted text-muted-foreground', label: 'Low' },
  info:     { icon: CheckCircle2, bg: 'bg-emerald-500/5 border-emerald-500/20', iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', label: 'Info' },
};

export default function NextPriorityWidget({ priorityItem, onNavigate }) {
  if (!priorityItem) return null;

  const style = PRIORITY_STYLES[priorityItem.priority] || PRIORITY_STYLES.info;
  const Icon = style.icon;
  const isCaughtUp = priorityItem.type === 'caught_up';

  return (
    <div className={`rounded-2xl border p-4 ${style.bg}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${style.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Next Priority</p>
            {!isCaughtUp && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${style.iconBg}`}>{style.label}</span>
            )}
          </div>
          <p className="text-sm font-semibold text-foreground leading-snug">{priorityItem.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{priorityItem.description}</p>

          {priorityItem.action && (
            <button
              onClick={() => onNavigate?.(priorityItem.action.target)}
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline min-h-[44px] py-2"
            >
              {priorityItem.action.label}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}