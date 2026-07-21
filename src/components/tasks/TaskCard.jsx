import React from 'react';
import { cn } from '@/lib/utils';
import { PRIORITY_COLORS } from '@/components/tasks/TaskStatusConfig';

export default function TaskCard({ task, onClick }) {
  const priorityClass = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;
  const isDone = ['completed', 'verified', 'archived', 'cancelled'].includes(task.status);

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card border border-border rounded-xl px-5 py-4 flex items-center gap-4 hover:shadow-sm hover:border-primary/30 transition-all"
    >
      <div className={cn(
        'w-2 h-10 rounded-full flex-shrink-0',
        task.status === 'blocked' ? 'bg-orbitan-red' :
        task.status === 'submitted_for_review' ? 'bg-orbitan-amber' :
        task.status === 'verified' || task.status === 'completed' ? 'bg-orbitan-green' :
        task.status === 'in_progress' ? 'bg-orbitan-purple' :
        task.status === 'draft' ? 'bg-muted' :
        'bg-orbitan-blue'
      )} />
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-medium truncate',
          isDone ? 'line-through text-muted-foreground' : 'text-foreground'
        )}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {task.responsible_agent_name && (
            <span className="text-xs text-muted-foreground">{task.responsible_agent_name}</span>
          )}
          {task.accountable_agent_id && task.accountable_agent_id !== task.responsible_agent_id && (
            <>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">Acct: {task.accountable_agent_name}</span>
            </>
          )}
          {task.due_date && (
            <>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{task.due_date}</span>
            </>
          )}
          {task.module_context && (
            <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">{task.module_context}</span>
          )}
          {task.status === 'blocked' && task.blocker_reason && (
            <span className="text-[10px] bg-orbitan-red-light text-orbitan-red px-1.5 py-0.5 rounded-full truncate max-w-[12rem]">⛔ {task.blocker_reason}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', priorityClass)}>{task.priority}</span>
      </div>
    </button>
  );
}