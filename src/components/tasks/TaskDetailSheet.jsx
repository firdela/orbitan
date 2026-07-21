import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { CheckSquare, Clock, AlertCircle, CheckCircle2, FileCheck, History, UserCog } from 'lucide-react';
import { cn } from '@/lib/utils';
import { statusLabel, TASK_STATUS_COLORS, VERIFICATION_MODE_LABELS } from '@/components/tasks/TaskStatusConfig';
import TaskTransitionBar from '@/components/tasks/TaskTransitionBar';
import ReviewDialog from '@/components/tasks/ReviewDialog';

export default function TaskDetailSheet({ task, open, onOpenChange, onTransitioned }) {
  const [assignments, setAssignments] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => {
    if (!task?.id || !open) return;
    setLoading(true);
    Promise.all([
      base44.entities.TaskAssignment.filter({ task_id: task.id }).catch(() => []),
      base44.entities.WorkReview.filter({ target_record_id: task.id }).catch(() => []),
      base44.entities.AuditLog.filter({ target_record_id: task.id }).catch(() => []),
    ]).then(([a, r, t]) => {
      setAssignments((a || []).sort((x, y) => (y.assigned_at || '').localeCompare(x.assigned_at || '')));
      setReviews((r || []).sort((x, y) => (y.review_date || '').localeCompare(x.review_date || '')));
      setTimeline((t || []).sort((x, y) => (y.created_date || '').localeCompare(x.created_date || '')));
    }).finally(() => setLoading(false));
  }, [task?.id, open, task?.version]);

  if (!task) return null;

  const canReview = task.status === 'submitted_for_review';
  const sectionLabel = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b border-border flex-shrink-0">
          <SheetTitle className="text-lg">{task.title}</SheetTitle>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', TASK_STATUS_COLORS[task.status])}>
              {statusLabel(task.status)}
            </span>
            {task.priority && <span className="text-xs text-muted-foreground capitalize">{task.priority} priority</span>}
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">v{task.version}</span>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-5 space-y-6">
            {task.description && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Description</h3>
                <p className="text-sm text-foreground whitespace-pre-wrap">{task.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <DetailItem label="Responsible" value={task.responsible_agent_name || 'Unassigned'} />
              <DetailItem label="Accountable" value={task.accountable_agent_name || '—'} />
              <DetailItem label="Due" value={[task.due_date, task.due_time].filter(Boolean).join(' ') || '—'} />
              <DetailItem label="Verification" value={VERIFICATION_MODE_LABELS[task.verification_mode] || '—'} />
              {task.module_context && <DetailItem label="Module" value={task.module_context} />}
              {task.completion_requirements && (
                <div className="col-span-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Completion Requirements</h3>
                  <p className="text-sm text-foreground">{task.completion_requirements}</p>
                </div>
              )}
              {task.blocker_reason && (
                <div className="col-span-2">
                  <h3 className="text-xs font-semibold text-orbitan-red uppercase tracking-wide mb-1">Current Blocker</h3>
                  <p className="text-sm text-foreground bg-orbitan-red-light/40 rounded-lg px-3 py-2">{task.blocker_reason}</p>
                </div>
              )}
            </div>

            <div>
              <h3 className={sectionLabel}><CheckSquare className="w-3.5 h-3.5" />Actions</h3>
              <TaskTransitionBar task={task} onTransitioned={onTransitioned} />
              {canReview && (
                <Button size="sm" variant="default" className="mt-2 gap-1.5" onClick={() => setReviewOpen(true)}>
                  <FileCheck className="w-4 h-4" /> Submit Review
                </Button>
              )}
            </div>

            <div>
              <h3 className={sectionLabel}><UserCog className="w-3.5 h-3.5" />Assignment History</h3>
              {loading ? <p className="text-xs text-muted-foreground">Loading...</p> : assignments.length === 0 ? (
                <p className="text-xs text-muted-foreground">No assignments yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {assignments.map(a => (
                    <div key={a.id} className="flex items-center justify-between text-xs border border-border rounded-lg px-3 py-2">
                      <div>
                        <span className="font-medium">{a.assignee_name || 'Organisational unit'}</span>
                        <span className="text-muted-foreground ml-1.5">· {a.assignment_role}</span>
                        {!a.is_active && <span className="text-muted-foreground ml-1.5">(removed: {a.removal_reason})</span>}
                      </div>
                      <div className="text-muted-foreground">
                        {a.acknowledgement_status === 'acknowledged' && <CheckCircle2 className="w-3.5 h-3.5 text-orbitan-green inline mr-1" />}
                        {a.acknowledgement_status === 'pending' && <Clock className="w-3.5 h-3.5 text-orbitan-amber inline mr-1" />}
                        {a.acknowledgement_status === 'declined' && <AlertCircle className="w-3.5 h-3.5 text-orbitan-red inline mr-1" />}
                        {a.assigned_at ? new Date(a.assigned_at).toLocaleDateString() : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {reviews.length > 0 && (
              <div>
                <h3 className={sectionLabel}><FileCheck className="w-3.5 h-3.5" />Reviews</h3>
                <div className="space-y-1.5">
                  {reviews.map(r => (
                    <div key={r.id} className="text-xs border border-border rounded-lg px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium capitalize">{r.review_result.replace('_', ' ')}</span>
                        <span className="text-muted-foreground">{r.reviewer_name} · {r.review_date ? new Date(r.review_date).toLocaleDateString() : ''}</span>
                      </div>
                      {r.comments && <p className="text-muted-foreground mt-1">{r.comments}</p>}
                      {r.feedback && <p className="text-muted-foreground mt-1 italic">{r.feedback}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className={sectionLabel}><History className="w-3.5 h-3.5" />Activity Timeline</h3>
              {loading ? <p className="text-xs text-muted-foreground">Loading...</p> : timeline.length === 0 ? (
                <p className="text-xs text-muted-foreground">No activity recorded.</p>
              ) : (
                <div className="space-y-2 border-l-2 border-border pl-4">
                  {timeline.map(t => (
                    <div key={t.id} className="relative">
                      <div className="absolute -left-[1.32rem] top-1 w-2.5 h-2.5 rounded-full bg-primary/60 border-2 border-card" />
                      <p className="text-xs font-medium text-foreground">{t.details || t.action_type}</p>
                      <p className="text-[11px] text-muted-foreground">{t.actor_name} · {t.created_date ? new Date(t.created_date).toLocaleString() : ''}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>

      <ReviewDialog open={reviewOpen} onOpenChange={setReviewOpen} task={task} onReviewed={onTransitioned} />
    </Sheet>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}