import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, ExternalLink } from 'lucide-react';
import {
  SEVERITY_CONFIG, SHIELD_STYLES, MODULE_LABELS,
  formatAction, formatRelative,
} from '@/components/audit-centre/auditConfig';

// Single row in the Activity Timeline. Keyboard-accessible, role=button.
export default function TimelineItem({ log, isLast, onClick }) {
  const sev = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.info;
  const SevIcon = sev.icon;
  const showShield = log.shield_outcome && log.shield_outcome !== 'not_evaluated';

  return (
    <div className="relative flex gap-3 sm:gap-4 group">
      {/* Connector line */}
      {!isLast && (
        <span
          aria-hidden="true"
          className="absolute left-[18px] sm:left-[22px] top-10 bottom-0 w-px bg-border"
        />
      )}
      {/* Icon dot */}
      <div
        aria-hidden="true"
        className={cn(
          'relative z-10 flex-shrink-0 w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center border-2 border-background',
          sev.iconWrap
        )}
      >
        <SevIcon className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>

      {/* Content */}
      <button
        type="button"
        onClick={onClick}
        aria-label={`Audit event: ${formatAction(log.action_type)} by ${log.actor_name || 'System'} on ${MODULE_LABELS[log.module] || log.module || 'system'}. Open details.`}
        className="flex-1 text-left bg-card border border-border rounded-xl p-3 sm:p-4 transition-all hover:shadow-sm hover:border-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mb-2"
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground capitalize">
                {formatAction(log.action_type)}
              </span>
              <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-medium', sev.badge)}>
                {sev.label}
              </span>
              {showShield && (
                <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-medium', SHIELD_STYLES[log.shield_outcome])}>
                  {log.shield_outcome.replace(/_/g, ' ')}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {log.details || `${formatAction(log.action_type)} on ${log.target_entity || 'record'}`}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground/80">{log.actor_name || 'System'}</span>
              {log.actor_role && log.actor_role !== 'system_event' && (
                <span className="text-muted-foreground/70">· {log.actor_role}</span>
              )}
              <span>· {MODULE_LABELS[log.module] || log.module || 'system'}</span>
              <span>· {formatRelative(log.created_date)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground/40 group-hover:text-primary transition-colors flex-shrink-0">
            {log.link && <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />}
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </div>
        </div>
      </button>
    </div>
  );
}