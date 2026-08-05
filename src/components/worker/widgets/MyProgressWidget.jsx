// ============================================================
// Widget: My Progress
// Shows one concise progress indicator: today's task completion.
// Does NOT combine unrelated metrics into one misleading score.
// ============================================================
import React from 'react';
import { Trophy } from 'lucide-react';

export default function MyProgressWidget({ tasks = [] }) {
  const completed = (tasks || []).filter(t => t.status === 'completed').length;
  const total = (tasks || []).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (total === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-semibold">My Progress</span>
        </div>
        <div className="py-3 text-center">
          <p className="text-xs text-muted-foreground">No tasks assigned today.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-semibold">My Progress</span>
        </div>
        <span className="text-sm font-bold font-display">{pct}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-2 rounded-full bg-gradient-to-r from-amber-400 to-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] text-muted-foreground mt-1.5">{completed} of {total} tasks completed</p>
    </div>
  );
}