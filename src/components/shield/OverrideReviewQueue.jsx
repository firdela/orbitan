import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Gavel, CheckCircle2, XCircle, FileText, Clock, AlertTriangle,
  ShieldAlert, ChevronRight, Inbox, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const SEVERITY_STYLES = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-50 text-blue-700',
  high: 'bg-amber-50 text-amber-700',
  critical: 'bg-red-50 text-red-700',
};

const TYPE_LABELS = {
  clock_in_compliance: 'Clock-in Compliance',
  stock_limit: 'Stock Limit',
  finance_threshold: 'Finance Threshold',
  schedule_breach: 'Schedule Breach',
  compliance_gate: 'Compliance Gate',
  custom: 'Custom',
};

export default function OverrideReviewQueue() {
  const queryClient = useQueryClient();
  const [reviewTarget, setReviewTarget] = useState(null); // { override, decision }
  const [managerNotes, setManagerNotes] = useState('');

  const { data: overrides = [], isLoading } = useQuery({
    queryKey: ['governance_overrides_pending'],
    queryFn: () => base44.entities.GovernanceOverride.filter({ status: 'pending' }, '-requested_date', 50),
  });

  const reviewOverride = useMutation({
    mutationFn: async ({ override, decision, notes }) => {
      const user = await base44.auth.me();
      const updated = await base44.entities.GovernanceOverride.update(override.id, {
        status: decision, // approved | denied
        reviewed_by_id: user.id,
        reviewed_by_name: user.full_name,
        reviewed_by_role: user.role,
        reviewed_date: new Date().toISOString(),
        manager_notes: notes,
      });

      // Write the immutable audit event capturing the override decision + evidence
      await base44.entities.AuditLog.create({
        tenant_id: override.tenant_id,
        actor_id: user.id,
        actor_name: user.full_name,
        actor_role: user.role,
        action_type: `override_${decision}`,
        module: 'compliance',
        target_entity: 'GovernanceOverride',
        target_record_id: override.id,
        override_id: override.id,
        policy_name: override.policy_name,
        justification: notes,
        evidence_urls: override.evidence_document_url ? [override.evidence_document_url] : [],
        shield_outcome: decision === 'approved' ? 'override_approved' : 'override_denied',
        details: `Manager ${decision} override request [${override.policy_name || override.request_type}] — ${notes}`,
      });

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['governance_overrides_pending']);
      queryClient.invalidateQueries(['shield_audit_logs']);
      setReviewTarget(null);
      setManagerNotes('');
    },
  });

  const openReview = (override, decision) => {
    setReviewTarget({ override, decision });
    setManagerNotes('');
  };

  const submitReview = () => {
    if (!managerNotes.trim()) return;
    reviewOverride.mutate({ ...reviewTarget, notes: managerNotes.trim() });
  };

  return (
    <div className="bg-white rounded-xl border border-border/60 overflow-hidden">
      <div className="px-4 py-3.5 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gavel className="w-4 h-4 text-[#D4AF37]" />
          <h3 className="font-heading font-semibold text-sm text-foreground">Override Review Queue</h3>
          <Badge variant="outline" className="text-[10px] tabular-nums">{overrides.length}</Badge>
        </div>
        {overrides.length > 0 && (
          <span className="text-[10px] text-muted-foreground">Awaiting manager decision</span>
        )}
      </div>

      {isLoading ? (
        <div className="p-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading override requests...
        </div>
      ) : overrides.length === 0 ? (
        <div className="p-8 text-center">
          <Inbox className="w-8 h-8 text-[#2563EB]/30 mx-auto mb-2" />
          <p className="text-sm font-medium text-muted-foreground">No pending overrides</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Manager-approved exceptions will appear here for review</p>
        </div>
      ) : (
        <div className="divide-y divide-border/40 max-h-[520px] overflow-y-auto">
          {overrides.map(ov => (
            <div key={ov.id} className="px-4 py-3.5 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      {TYPE_LABELS[ov.request_type] || ov.request_type}
                    </span>
                    <span className={cn('text-[10px] rounded-full px-1.5 py-0.5 font-bold uppercase', SEVERITY_STYLES[ov.severity] || SEVERITY_STYLES.medium)}>
                      {ov.severity}
                    </span>
                    {ov.shield_mode && (
                      <span className="text-[10px] border border-border rounded-full px-1.5 py-0.5 font-bold uppercase text-muted-foreground">
                        {ov.shield_mode}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">
                    {ov.policy_name || `Override · ${ov.target_entity}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {ov.requester_notes || ov.block_reason || 'No justification provided'}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {ov.requested_date ? format(new Date(ov.requested_date), 'dd MMM HH:mm') : '—'}
                    </span>
                    <span>by {ov.requested_by_name || ov.requested_by_id}</span>
                    {ov.evidence_document_url && (
                      <a href={ov.evidence_document_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[#2563EB] hover:underline">
                        <FileText className="w-2.5 h-2.5" /> Evidence
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-green-200 text-green-700 hover:bg-green-50" onClick={() => openReview(ov, 'approved')}>
                    <CheckCircle2 className="w-3 h-3" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-red-200 text-red-700 hover:bg-red-50" onClick={() => openReview(ov, 'denied')}>
                    <XCircle className="w-3 h-3" /> Deny
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!reviewTarget} onOpenChange={(open) => { if (!open) { setReviewTarget(null); setManagerNotes(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reviewTarget?.decision === 'approved' ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              {reviewTarget?.decision === 'approved' ? 'Approve Override' : 'Deny Override'}
            </DialogTitle>
          </DialogHeader>
          {reviewTarget && (
            <div className="space-y-3 pt-1">
              <div className="rounded-lg bg-muted/40 p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                  <p className="text-xs font-semibold text-foreground">{reviewTarget.override.policy_name || reviewTarget.override.request_type}</p>
                </div>
                <p className="text-[11px] text-muted-foreground">{reviewTarget.override.block_reason}</p>
                {reviewTarget.override.evidence_document_url && (
                  <a href={reviewTarget.override.evidence_document_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-[#2563EB] hover:underline">
                    <FileText className="w-3 h-3" /> View evidence document
                  </a>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Manager Justification <span className="text-red-500">*</span>
                </label>
                <Textarea
                  placeholder="Explain why this override is approved/denied. This note is immutable and audit-logged."
                  value={managerNotes}
                  onChange={(e) => setManagerNotes(e.target.value)}
                  rows={4}
                  className="text-sm"
                />
                <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5" /> This decision and your note are permanently recorded in the Audit Vault.
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => { setReviewTarget(null); setManagerNotes(''); }}>Cancel</Button>
            <Button
              size="sm"
              disabled={!managerNotes.trim() || reviewOverride.isPending}
              onClick={submitReview}
              className={cn(
                reviewTarget?.decision === 'approved'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              )}
            >
              {reviewOverride.isPending ? 'Saving...' : reviewTarget?.decision === 'approved' ? 'Confirm Approval' : 'Confirm Denial'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}