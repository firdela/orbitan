// ============================================================
// Widget: Quick Actions
// Compact grid of 3-4 highest-value navigation actions.
// ============================================================
import React from 'react';
import { ListChecks, Calendar, Shield, AlertTriangle } from 'lucide-react';

export default function QuickActionsWidget({ onNavigate, onReportIssue }) {
  const actions = [
    { id: 'tasks', icon: ListChecks, label: 'My Tasks', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    { id: 'shifts', icon: Calendar, label: 'My Shifts', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
    { id: 'safety', icon: Shield, label: 'Safety', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
    { id: 'report', icon: AlertTriangle, label: 'Report Issue', color: 'bg-red-500/10 text-red-600 dark:text-red-400', onClick: onReportIssue },
  ];

  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        {actions.map(({ id, icon: Icon, label, color, onClick }) => (
          <button
            key={id}
            onClick={() => onClick ? onClick() : onNavigate?.(id)}
            className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-card border border-border hover:border-primary/30 transition-all active:scale-[0.97] min-h-[44px] justify-center"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-semibold text-foreground text-center leading-tight">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}