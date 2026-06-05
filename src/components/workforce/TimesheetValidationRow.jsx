// ============================================================
// ORBITAN — TimesheetValidationRow
// Single clock record row for manager validation UI.
// EXIT-READY: Pure React component, zero platform deps.
// ============================================================
import React, { useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, Clock, MapPin, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function TimesheetValidationRow({ record, onApprove, onReject, loading }) {
  const [expanded, setExpanded] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const isApproved = record.validation_status === 'approved';
  const isRejected = record.validation_status === 'rejected';
  const isLocked = record.payroll_locked;

  const hoursWorked = record.total_hours_worked?.toFixed(2) ?? '—';
  const labourCost = record.total_shift_cost != null
    ? `S$${record.total_shift_cost.toFixed(2)}`
    : record.labour_cost != null ? `S$${record.labour_cost.toFixed(2)}` : '—';

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    onReject(record.id, rejectReason);
    setShowRejectInput(false);
    setRejectReason('');
  };

  return (
    <div className={cn(
      'border-b border-border last:border-0 transition-colors',
      isApproved && 'bg-green-50/40',
      isRejected && 'bg-red-50/40',
      isLocked && 'opacity-70'
    )}>
      {/* Main Row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Employee */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{record.employee_name}</p>
          <p className="text-xs text-muted-foreground capitalize">{record.employee_role || 'Worker'}</p>
        </div>

        {/* Date */}
        <div className="hidden sm:block text-center w-24">
          <p className="text-xs font-medium text-foreground">{format(new Date(record.date), 'dd MMM')}</p>
          <p className="text-[10px] text-muted-foreground">{format(new Date(record.date), 'EEE')}</p>
        </div>

        {/* Times */}
        <div className="hidden md:block text-center w-32">
          <p className="text-xs text-foreground">
            {record.clock_in_time ? format(new Date(record.clock_in_time), 'h:mm a') : '—'}
            {' → '}
            {record.clock_out_time ? format(new Date(record.clock_out_time), 'h:mm a') : '—'}
          </p>
          <div className="flex items-center justify-center gap-1 mt-0.5">
            {record.clock_in_geo_verified && <MapPin className="w-2.5 h-2.5 text-green-500" />}
            {record.late_mins > 0 && <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />}
          </div>
        </div>

        {/* Hours */}
        <div className="text-center w-16">
          <p className="text-sm font-bold text-foreground">{hoursWorked}h</p>
          {record.overtime_hours > 0 && (
            <p className="text-[10px] text-amber-600">+{record.overtime_hours}h OT</p>
          )}
        </div>

        {/* Cost */}
        <div className="hidden sm:block text-center w-20">
          <p className="text-sm font-semibold text-foreground">{labourCost}</p>
        </div>

        {/* Status / Actions */}
        <div className="flex items-center gap-2 w-28 justify-end">
          {isLocked ? (
            <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">Locked</span>
          ) : isApproved ? (
            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Approved
            </span>
          ) : isRejected ? (
            <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <XCircle className="w-3 h-3" /> Rejected
            </span>
          ) : (
            <>
              <Button
                size="sm"
                className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700 text-white"
                onClick={() => onApprove(record.id)}
                disabled={loading}
              >
                <CheckCircle2 className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => setShowRejectInput(!showRejectInput)}
                disabled={loading}
              >
                <XCircle className="w-3 h-3" />
              </Button>
            </>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Reject Reason Input */}
      {showRejectInput && !isLocked && (
        <div className="px-4 pb-3 flex gap-2">
          <input
            className="flex-1 text-xs border border-border rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Reason for rejection..."
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
          />
          <Button size="sm" className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white" onClick={handleReject}>
            Confirm
          </Button>
        </div>
      )}

      {/* Expanded Detail */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 bg-muted/30 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <p className="text-muted-foreground mb-0.5">Break</p>
            <p className="font-medium">{record.break_duration_mins ?? 30} mins</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-0.5">Late Arrival</p>
            <p className={cn('font-medium', record.late_mins > 0 ? 'text-amber-600' : '')}>
              {record.late_mins > 0 ? `${record.late_mins} mins late` : 'On time'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground mb-0.5">Productivity</p>
            <p className="font-medium">{record.productivity_score ?? '—'}%</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-0.5">Pay Rate</p>
            <p className="font-medium">S${record.pay_rate ?? '—'}/{record.pay_type === 'hourly' ? 'hr' : record.pay_type}</p>
          </div>
          {record.verified_by_name && (
            <div className="col-span-2">
              <p className="text-muted-foreground mb-0.5">Validated by</p>
              <p className="font-medium">{record.verified_by_name}</p>
            </div>
          )}
          {record.rejection_reason && (
            <div className="col-span-2">
              <p className="text-muted-foreground mb-0.5">Rejection Reason</p>
              <p className="font-medium text-red-600">{record.rejection_reason}</p>
            </div>
          )}
          {record.notes && (
            <div className="col-span-4">
              <p className="text-muted-foreground mb-0.5">Notes</p>
              <p className="font-medium">{record.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}