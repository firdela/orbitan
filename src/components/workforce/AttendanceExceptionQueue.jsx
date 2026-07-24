import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Clock, AlertTriangle, CheckCircle2, XCircle, Loader2,
  Calendar, FileText, User
} from 'lucide-react';

const EXCEPTION_LABELS = {
  late_clock_in: 'Late Clock In',
  early_clock_out: 'Early Clock Out',
  missed_clock_out: 'Missed Clock Out',
  missed_break: 'Missed Break',
  extended_break: 'Extended Break',
  overtime: 'Overtime',
  off_day_attendance: 'Off-Day Attendance',
  outside_geofence: 'Outside Geofence',
  duplicate_clock: 'Duplicate Clock',
  manual_entry: 'Manual Entry',
};

const SEVERITY_COLORS = {
  low: 'bg-blue-50 text-blue-600 border-blue-200',
  medium: 'bg-amber-50 text-amber-600 border-amber-200',
  high: 'bg-red-50 text-red-600 border-red-200',
};

export default function AttendanceExceptionQueue({ tenantId }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [decision, setDecision] = useState('');
  const [managerNotes, setManagerNotes] = useState('');

  const { data: allExceptions = [], isLoading } = useQuery({
    queryKey: ['attendance-exceptions', tenantId],
    queryFn: () => base44.entities.AttendanceException.filter(
      { tenant_id: tenantId },
      '-detected_at',
      200
    ),
    enabled: !!tenantId,
  });

  const REVIEWABLE = ['pending_review', 'employee_justified', 'manager_review'];
  const exceptions = allExceptions.filter(e => REVIEWABLE.includes(e.status));

  const resolveMutation = useMutation({
    mutationFn: async ({ exceptionId, decision: mgrDecision, notes }) => {
      const response = await base44.functions.invoke('attendanceReview', {
        exception_id: exceptionId,
        decision: mgrDecision,
        manager_notes: notes,
      });
      const res = response.data;
      if (res?.error) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['worker-clockrecords'] });
      setSelected(null);
      setDecision('');
      setManagerNotes('');
    },
  });

  const handleResolve = () => {
    if (!selected || !decision) return;
    resolveMutation.mutate({
      exceptionId: selected.id,
      decision,
      notes: managerNotes,
    });
  };

  const pendingCount = exceptions.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading attendance exceptions...
      </div>
    );
  }

  if (exceptions.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="No attendance exceptions"
        description="All clock records are within policy. Exceptions will appear here when employees are late, leave early, work overtime, or miss breaks."
        color="green"
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <p className="text-sm font-semibold text-foreground">{pendingCount} exception{pendingCount > 1 ? 's' : ''} awaiting review</p>
      </div>

      {exceptions.map((exc) => (
        <div
          key={exc.id}
          className="bg-card border border-border rounded-xl p-4 hover:border-primary/20 transition-all cursor-pointer"
          onClick={() => { setSelected(exc); setManagerNotes(''); setDecision(''); }}
        >
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${SEVERITY_COLORS[exc.severity] || SEVERITY_COLORS.medium}`}>
              <Clock className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-foreground">
                  {EXCEPTION_LABELS[exc.exception_type] || exc.exception_type}
                </p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SEVERITY_COLORS[exc.severity] || SEVERITY_COLORS.medium} border`}>
                  {exc.severity}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{exc.employee_name}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{exc.details}</p>
              {exc.employee_justification && (
                <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Employee Justification</p>
                  <p className="text-xs text-amber-800 mt-0.5">{exc.employee_justification}</p>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-2">
                Detected {exc.detected_at ? format(new Date(exc.detected_at), 'd MMM, HH:mm') : '—'}
              </p>
            </div>
            <StatusBadge status={exc.status} size="sm" />
          </div>
        </div>
      ))}

      {/* Review Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Attendance Exception</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-sm font-semibold">{selected.employee_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <p className="text-sm">{EXCEPTION_LABELS[selected.exception_type]}</p>
                </div>
                <div className="flex items-start gap-2">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                  <p className="text-xs text-muted-foreground">{selected.details}</p>
                </div>
                {selected.employee_justification && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Employee Reason</p>
                    <p className="text-xs text-amber-800 mt-1">{selected.employee_justification}</p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    Detected {selected.detected_at ? format(new Date(selected.detected_at), 'd MMM yyyy, HH:mm') : '—'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold mb-1.5">Manager Notes</p>
                <Textarea
                  placeholder="Add notes for this decision..."
                  value={managerNotes}
                  onChange={(e) => setManagerNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelected(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDecision('request_clarification')}
                  className={decision === 'request_clarification' ? 'ring-2 ring-amber-400' : ''}
                >
                  <FileText className="w-4 h-4" /> Request Clarification
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setDecision('rejected')}
                  className={decision === 'rejected' ? 'ring-2 ring-destructive' : ''}
                >
                  <XCircle className="w-4 h-4" /> Reject
                </Button>
                <Button
                  onClick={() => setDecision('approved')}
                  className={decision === 'approved' ? 'ring-2 ring-primary' : ''}
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve
                </Button>
              </DialogFooter>

              {decision && (
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Confirm: {decision === 'approved' ? 'Approve' : decision === 'rejected' ? 'Reject' : 'Request clarification for'} this exception?
                  </p>
                  <Button
                    size="sm"
                    variant={decision === 'approved' ? 'default' : 'destructive'}
                    onClick={handleResolve}
                    disabled={resolveMutation.isPending}
                  >
                    {resolveMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      'Confirm'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}