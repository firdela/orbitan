import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { transitionLabel } from '@/components/tasks/TaskStatusConfig';

export default function TaskTransitionBar({ task, onTransitioned }) {
  const [allowed, setAllowed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTarget, setActiveTarget] = useState(null);
  const [reason, setReason] = useState('');
  const [blockerReason, setBlockerReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!task) return;
    setLoading(true);
    base44.functions.invoke('taskController', { action: 'getAllowedTransitions', task_id: task.id })
      .then(res => setAllowed(res.data?.allowed_transitions || []))
      .catch(() => setAllowed([]))
      .finally(() => setLoading(false));
  }, [task?.id, task?.status, task?.version]);

  const handleTransition = async (target) => {
    setSaving(true); setError(null);
    try {
      const payload = {
        action: 'transition',
        task_id: task.id,
        target_status: target,
        version: task.version,
        idempotency_key: `${task.id}-${target}-${Date.now()}`,
      };
      if (target === 'blocked') payload.blocker_reason = blockerReason;
      if (['cancelled', 'blocked', 'archived'].includes(target)) payload.reason = reason;

      const res = await base44.functions.invoke('taskController', payload);
      setActiveTarget(null); setReason(''); setBlockerReason('');
      onTransitioned?.(res.data.task);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Transition failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-xs text-muted-foreground">Loading actions...</p>;
  if (allowed.length === 0) return <p className="text-xs text-muted-foreground">No actions available for this task state.</p>;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {allowed.map(t => {
          const needsReason = t.requires_reason || t.requires_blocker_reason;
          return (
            <Button
              key={t.target_status}
              size="sm"
              variant={t.target_status === 'cancelled' ? 'outline' : 'default'}
              className={t.target_status === 'cancelled' ? 'text-destructive border-destructive/40 hover:bg-destructive/5' : ''}
              disabled={saving}
              onClick={() => needsReason ? setActiveTarget(t.target_status) : handleTransition(t.target_status)}
            >
              {transitionLabel(task.status, t.target_status)}
            </Button>
          );
        })}
      </div>
      {error && <p role="alert" className="text-sm text-destructive mt-2">{error}</p>}

      <Dialog open={!!activeTarget} onOpenChange={(o) => { if (!o) { setActiveTarget(null); setReason(''); setBlockerReason(''); setError(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{activeTarget ? transitionLabel(task.status, activeTarget) : ''}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {activeTarget === 'blocked' && (
              <div>
                <Label htmlFor="tb-blocker" className="text-xs mb-1 block">Blocker Reason *</Label>
                <Textarea id="tb-blocker" value={blockerReason} onChange={e => setBlockerReason(e.target.value)} rows={2} placeholder="What is blocking this task?" aria-invalid={!blockerReason.trim()} />
              </div>
            )}
            {['cancelled', 'archived'].includes(activeTarget) && (
              <div>
                <Label htmlFor="tb-reason" className="text-xs mb-1 block">Reason *</Label>
                <Textarea id="tb-reason" value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="Reason for this action..." aria-invalid={!reason.trim()} />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setActiveTarget(null); setReason(''); setBlockerReason(''); }}>Cancel</Button>
            <Button
              onClick={() => handleTransition(activeTarget)}
              disabled={saving || (activeTarget === 'blocked' && !blockerReason.trim()) || (['cancelled'].includes(activeTarget) && !reason.trim())}
            >
              {saving ? 'Processing...' : 'Confirm'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}