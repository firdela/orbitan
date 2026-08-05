// ============================================================
// Widget: Today's Tasks
// Shows task counts, progress, and next actionable task.
// ============================================================
import React from 'react';
import { CheckSquare, ChevronRight, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function TodayTasksWidget({ tasks = [], onNavigate }) {
  const now = new Date();
  const active = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'archived');
  const completed = tasks.filter(t => t.status === 'completed');
  const overdue = active.filter(t => t.due_date && new Date(t.due_date) < now);
  const progressPct = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0;

  // Next actionable task (highest priority, earliest due)
  const nextTask = active.sort((a, b) => {
    const pOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    const pDiff = (pOrder[a.priority] || 2) - (pOrder[b.priority] || 2);
    if (pDiff !== 0) return pDiff;
    if (a.due_date && b.due_date) return new Date(a.due_date) - new Date(b.due_date);
    return 0;
  })[0];

  // Empty state: zero assigned tasks
  if (tasks.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4">
        <WidgetHeader count={0} />
        <div className="py-6 text-center">
          <CheckSquare className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm font-semibold text-foreground">No tasks assigned today</p>
          <p className="text-xs text-muted-foreground mt-1">Tasks will appear here when assigned.</p>
        </div>
      </div>
    );
  }

  // Completed state: all tasks done
  if (active.length === 0 && completed.length > 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4">
        <WidgetHeader count={active.length} overdue={0} completed={completed.length} total={tasks.length} pct={progressPct} />
        <div className="py-4 text-center">
          <CheckCircle2 className="w-8 h-8 text-orbitan-green mx-auto mb-2" />
          <p className="text-sm font-semibold text-foreground">All tasks complete!</p>
          <p className="text-xs text-muted-foreground mt-1">{completed.length} of {tasks.length} completed today.</p>
        </div>
        <button onClick={() => onNavigate?.('tasks')} className="w-full text-xs text-primary font-medium py-2 hover:underline">
          View all tasks →
        </button>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <WidgetHeader count={active.length} overdue={overdue.length} completed={completed.length} total={tasks.length} pct={progressPct} onNavigate={onNavigate} />

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
        <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Next task */}
      {nextTask && (
        <button
          onClick={() => onNavigate?.('tasks')}
          className="w-full flex items-center gap-3 py-2.5 px-3 -mx-1 rounded-xl hover:bg-muted/50 transition-colors text-left min-h-[44px]"
        >
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
            nextTask.priority === 'urgent' ? 'border-destructive' : 'border-muted-foreground'
          }`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{nextTask.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {overdue.length > 0 && (
                <span className="text-[10px] font-bold text-destructive flex items-center gap-0.5">
                  <AlertTriangle className="w-2.5 h-2.5" /> {overdue.length} overdue
                </span>
              )}
              {nextTask.due_date && (
                <span className="text-[10px] text-muted-foreground">Due {nextTask.due_date}</span>
              )}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </button>
      )}
    </div>
  );
}

function WidgetHeader({ count, overdue = 0, completed = 0, total = 0, pct = 0, onNavigate }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <CheckSquare className="w-4 h-4 text-orbitan-blue" />
        <span className="text-sm font-semibold">Today's Tasks</span>
        {count > 0 && (
          <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded-full">{count} active</span>
        )}
      </div>
      {onNavigate && total > 0 && (
        <button onClick={() => onNavigate('tasks')} className="text-xs text-primary font-medium hover:underline">
          See all →
        </button>
      )}
    </div>
  );
}