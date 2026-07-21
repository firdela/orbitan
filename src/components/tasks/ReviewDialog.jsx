import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function ReviewDialog({ open, onOpenChange, task, onReviewed }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    review_result: 'approved',
    comments: '',
    feedback: '',
    approval_reason: '',
    rejection_reason: '',
  });

  const update = (patch) => setForm(p => ({ ...p, ...patch }));

  const handleSubmit = async () => {
    if (form.review_result === 'rejected' && !form.rejection_reason.trim()) {
      setError('Rejection reason is required'); return;
    }
    if (form.review_result === 'approved' && task?.verification_mode === 'approval_gated' && !form.approval_reason.trim()) {
      setError('Approval reason is required for governed verification'); return;
    }
    setSaving(true); setError(null);
    try {
      const res = await base44.functions.invoke('taskController', {
        action: 'submitReview',
        task_id: task.id,
        ...form,
      });
      onReviewed?.(res.data.task, res.data.review);
      onOpenChange(false);
      setForm({ review_result: 'approved', comments: '', feedback: '', approval_reason: '', rejection_reason: '' });
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Review failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Review Task</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="rd-result" className="text-xs mb-1 block">Review Decision</Label>
            <Select value={form.review_result} onValueChange={v => update({ review_result: v })}>
              <SelectTrigger id="rd-result"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="approved">Approve (Verify)</SelectItem>
                <SelectItem value="changes_required">Request Changes</SelectItem>
                <SelectItem value="rejected">Reject</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="rd-comments" className="text-xs mb-1 block">Comments</Label>
            <Textarea id="rd-comments" value={form.comments} onChange={e => update({ comments: e.target.value })} rows={2} placeholder="General review comments..." />
          </div>
          <div>
            <Label htmlFor="rd-feedback" className="text-xs mb-1 block">Detailed Feedback</Label>
            <Textarea id="rd-feedback" value={form.feedback} onChange={e => update({ feedback: e.target.value })} rows={3} placeholder="Specific feedback for the assignee..." />
          </div>
          {form.review_result === 'approved' && (
            <div>
              <Label htmlFor="rd-approval" className="text-xs mb-1 block">{task?.verification_mode === 'approval_gated' ? 'Approval Reason *' : 'Approval Reason'}</Label>
              <Textarea id="rd-approval" value={form.approval_reason} onChange={e => update({ approval_reason: e.target.value })} rows={2} placeholder="Why is this approved?" />
            </div>
          )}
          {form.review_result === 'rejected' && (
            <div>
              <Label htmlFor="rd-rejection" className="text-xs mb-1 block">Rejection Reason *</Label>
              <Textarea id="rd-rejection" value={form.rejection_reason} onChange={e => update({ rejection_reason: e.target.value })} rows={2} placeholder="Why is this rejected?" aria-invalid={!form.rejection_reason.trim()} />
            </div>
          )}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Submitting...' : 'Submit Review'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}