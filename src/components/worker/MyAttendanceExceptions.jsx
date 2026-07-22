import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertTriangle, Loader2, MessageSquare, CheckCircle2, Clock,
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

export default function MyAttendanceExceptions({ tenantId, employeeId, employeeName }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [justifyingId, setJustifyingId] = useState(null);
  const [justification, setJustification] = useState('');

  const { data: allExceptions = [], isLoading } = useQuery({
    queryKey: ['my-attendance-exceptions', tenantId, employeeId],
    queryFn: () => base44.entities.AttendanceException.filter(
      { tenant_id: tenantId, employee_id: employeeId },
      '-detected_at',
      50,
    ),
    enabled: !!tenantId && !!employeeId,
  });

  // Only show exceptions the employee can still act on (pending_review)
  const actionable = allExceptions.filter(e => e.status === 'pending_review');

  const justifyMutation = useMutation({
    mutationFn: async ({ exceptionId, text }) => {
      const response = await base44.functions.invoke('employeeJustify', {
        exception_id: exceptionId,
        justification: text,
      });
      const res = response.data;
      if (res?.error) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-attendance-exceptions'] });
      setJustifyingId(null);
      setJustification('');
      toast({ title: '✓ Justification submitted', description: 'Your manager will review it shortly.' });
    },
    onError: (err) => {
      toast({ title: 'Submission failed', description: err.message, variant: 'destructive' });
    },
  });

  const handleSubmit = (exceptionId) => {
    if (!justification.trim()) return;
    justifyMutation.mutate({ exceptionId, text: justification });
  };

  if (isLoading || actionable.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <p className="text-sm font-semibold">Attendance Exceptions Needing Your Response</p>
        <span className="text-xs text-muted-foreground">({actionable.length})</span>
      </div>

      {actionable.map((exc) => (
        <div key={exc.id} className="bg-card border border-amber-200 rounded-2xl p-4">
          <div className="flex items-start gap-3 mb-2">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${SEVERITY_COLORS[exc.severity] || SEVERITY_COLORS.medium}`}>
              <Clock className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">{EXCEPTION_LABELS[exc.exception_type] || exc.exception_type}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${SEVERITY_COLORS[exc.severity] || SEVERITY_COLORS.medium}`}>
                  {exc.severity}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{exc.details}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Detected {exc.detected_at ? format(new Date(exc.detected_at), 'd MMM, HH:mm') : '—'}
              </p>
            </div>
          </div>

          {justifyingId === exc.id ? (
            <div className="space-y-2">
              <Textarea
                placeholder="Explain why this happened (e.g. bus was delayed, emergency at home)..."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setJustifyingId(null); setJustification(''); }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSubmit(exc.id)}
                  disabled={!justification.trim() || justifyMutation.isPending}
                >
                  {justifyMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Submit Justification
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => { setJustifyingId(exc.id); setJustification(''); }}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Add Justification
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}