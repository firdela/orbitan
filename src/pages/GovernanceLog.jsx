import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import OrbitanLogo from '@/components/layout/OrbitanLogo';
import UserMenu from '@/components/shared/UserMenu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import EmptyState from '@/components/shared/EmptyState';
import { Shield, CheckCircle2, XCircle, Clock, AlertTriangle, FileText, Gavel } from 'lucide-react';

const STATUS_CONFIG = {
  pending:   { label: 'Pending Review',   icon: Clock,           color: 'text-orbitan-amber',    bg: 'bg-orbitan-amber-light',    border: 'border-amber-200' },
  approved: { label: 'Approved',          icon: CheckCircle2,     color: 'text-orbitan-green',   bg: 'bg-orbitan-green-light',   border: 'border-green-200' },
  denied:   { label: 'Denied',            icon: XCircle,          color: 'text-orbitan-red',     bg: 'bg-orbitan-red-light',     border: 'border-red-200' },
  expired:  { label: 'Expired',           icon: AlertTriangle,   color: 'text-muted-foreground', bg: 'bg-muted',                 border: 'border-border' },
};

const SEVERITY_CONFIG = {
  low:      { label: 'Low',      color: 'text-orbitan-blue' },
  medium:   { label: 'Medium',   color: 'text-orbitan-amber' },
  high:     { label: 'High',     color: 'text-orbitan-red' },
  critical: { label: 'Critical', color: 'text-destructive' },
};

const TYPE_LABELS = {
  clock_in_compliance: 'Clock-In Compliance',
  stock_limit: 'Stock Limit',
  finance_threshold: 'Finance Threshold',
  schedule_breach: 'Schedule Breach',
  compliance_gate: 'Compliance Gate',
  custom: 'Custom',
};

export default function GovernanceLog() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('pending');
  const [reviewItem, setReviewItem] = useState(null);
  const [managerNotes, setManagerNotes] = useState('');

  const { data: overrides = [], isLoading } = useQuery({
    queryKey: ['governance-overrides', filter],
    queryFn: async () => {
      const query = filter === 'all' ? {} : { status: filter };
      return base44.entities.GovernanceOverride.filter(query, '-created_date', 100);
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, decision }) => {
      const user = await base44.auth.me();
      return base44.entities.GovernanceOverride.update(id, {
        status: decision,
        reviewed_by_id: user.id,
        reviewed_by_name: user.full_name || user.email,
        reviewed_by_role: user.role,
        reviewed_date: new Date().toISOString(),
        manager_notes: managerNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance-overrides'] });
      setReviewItem(null);
      setManagerNotes('');
    },
  });

  const pendingCount = overrides.filter(o => o.status === 'pending').length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-background sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <OrbitanLogo size="sm" showOS />
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground">
              <Gavel className="w-3.5 h-3.5" />
              Governance Log
            </div>
            <div className="w-28"><UserMenu variant="light" /></div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 bg-orbitan-blue-light text-orbitan-blue px-3 py-1.5 rounded-full text-xs font-semibold mb-3">
            <Shield className="w-3.5 h-3.5" />
            Orbitan Shield™ — Governance Override Registry
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-1">Governance Log</h1>
          <p className="text-sm text-muted-foreground">Review and approve financial events flagged by the governance system that exceed threshold limits.</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-orbitan-amber" />
              <p className="text-xs text-muted-foreground">Pending Review</p>
            </div>
            <p className="text-2xl font-display font-bold">{pendingCount}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-orbitan-green" />
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
            <p className="text-2xl font-display font-bold">{overrides.filter(o => o.status === 'approved').length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-orbitan-red" />
              <p className="text-xs text-muted-foreground">Denied</p>
            </div>
            <p className="text-2xl font-display font-bold">{overrides.filter(o => o.status === 'denied').length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <p className="text-xs text-muted-foreground">Critical Severity</p>
            </div>
            <p className="text-2xl font-display font-bold">{overrides.filter(o => o.severity === 'critical').length}</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-4">
          {['pending', 'approved', 'denied', 'all'].map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${filter === tab ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Override List */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading governance overrides…</div>
          ) : overrides.length === 0 ? (
            <EmptyState icon={Shield} title="No governance overrides" description="When the Shield blocks an action above a threshold, override requests will appear here for review." />
          ) : (
            <div className="divide-y divide-border">
              {overrides.map(item => {
                const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
                const StatusIcon = status.icon;
                const severity = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.medium;
                return (
                  <div key={item.id} className="px-5 py-4 flex items-center gap-4 hover:bg-accent/30 transition-colors">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${status.bg}`}>
                      <StatusIcon className={`w-5 h-5 ${status.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {TYPE_LABELS[item.request_type] || item.request_type}
                        </p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${severity.color}`}>
                          {severity.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {item.block_reason || 'No block reason recorded'}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Requested by {item.requested_by_name || 'Unknown'} · {item.target_entity}
                        {item.policy_name && ` · ${item.policy_name}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className={`text-[10px] ${status.color} ${status.border}`}>
                        {status.label}
                      </Badge>
                      {item.status === 'pending' && (
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setReviewItem(item); setManagerNotes(''); }}>
                          <FileText className="w-3.5 h-3.5 mr-1" /> Review
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Review Dialog */}
      <Dialog open={!!reviewItem} onOpenChange={(open) => { if (!open) { setReviewItem(null); setManagerNotes(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gavel className="w-5 h-5 text-orbitan-blue" />
              Review Override Request
            </DialogTitle>
            <DialogDescription>
              Your decision and justification will be permanently recorded in the audit trail.
            </DialogDescription>
          </DialogHeader>

          {reviewItem && (
            <div className="space-y-3 py-2">
              <div className="bg-muted rounded-lg p-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Request Type</span>
                  <span className="font-medium">{TYPE_LABELS[reviewItem.request_type] || reviewItem.request_type}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Target Entity</span>
                  <span className="font-medium">{reviewItem.target_entity}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Requested By</span>
                  <span className="font-medium">{reviewItem.requested_by_name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Severity</span>
                  <span className={`font-medium ${SEVERITY_CONFIG[reviewItem.severity]?.color}`}>
                    {SEVERITY_CONFIG[reviewItem.severity]?.label || 'Medium'}
                  </span>
                </div>
              </div>

              {reviewItem.block_reason && (
                <div className="bg-orbitan-red-light rounded-lg p-3">
                  <p className="text-xs text-orbitan-red font-medium mb-0.5">Shield Block Reason</p>
                  <p className="text-xs text-foreground">{reviewItem.block_reason}</p>
                </div>
              )}

              {reviewItem.requester_notes && (
                <div className="bg-orbitan-blue-light rounded-lg p-3">
                  <p className="text-xs text-orbitan-blue font-medium mb-0.5">Requester Justification</p>
                  <p className="text-xs text-foreground">{reviewItem.requester_notes}</p>
                </div>
              )}

              <div>
                <Label className="text-xs mb-1 block">Manager Justification (required)</Label>
                <Textarea
                  value={managerNotes}
                  onChange={e => setManagerNotes(e.target.value)}
                  placeholder="Explain why you are approving or denying this override…"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setReviewItem(null); setManagerNotes(''); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!managerNotes.trim() || reviewMutation.isPending}
              onClick={() => reviewMutation.mutate({ id: reviewItem.id, decision: 'denied' })}
              className="gap-1.5"
            >
              <XCircle className="w-4 h-4" /> Deny
            </Button>
            <Button
              disabled={!managerNotes.trim() || reviewMutation.isPending}
              onClick={() => reviewMutation.mutate({ id: reviewItem.id, decision: 'approved' })}
              className="gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}