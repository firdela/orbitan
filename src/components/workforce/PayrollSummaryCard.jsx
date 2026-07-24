// ============================================================
// ORBITAN — PayrollSummaryCard
// Per-employee payroll computation preview before lock.
// EXIT-READY: Pure presentational component.
// ============================================================
import React from 'react';
import { CheckCircle2, Lock, Unlock, AlertCircle, User, Clock, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function PayrollSummaryCard({ snapshot, onLock, onDispute, onReopen, loading }) {
  const isLocked = snapshot.status === 'locked';
  const isPaid = snapshot.status === 'paid';
  const isDisputed = snapshot.status === 'disputed';

  const statusConfig = {
    draft:    { label: 'Draft', color: 'bg-muted text-muted-foreground' },
    locked:   { label: 'Locked', color: 'bg-blue-100 text-blue-700' },
    paid:     { label: 'Paid', color: 'bg-green-100 text-green-700' },
    disputed: { label: 'Disputed', color: 'bg-amber-100 text-amber-700' },
  };
  const sc = statusConfig[snapshot.status] || statusConfig.draft;

  return (
    <div className={cn(
      'rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm',
      isPaid && 'border-green-200',
      isDisputed && 'border-amber-300'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">{snapshot.employee_name}</p>
            <p className="text-xs text-muted-foreground capitalize">{snapshot.employee_role}</p>
          </div>
        </div>
        <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold', sc.color)}>
          {sc.label}
        </span>
      </div>

      {/* Period */}
      <div className="text-xs text-muted-foreground">
        {format(new Date(snapshot.period_start), 'd MMM')} – {format(new Date(snapshot.period_end), 'd MMM yyyy')}
        {' · '}{snapshot.total_shifts} shifts
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-muted rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-foreground">{snapshot.total_hours_worked?.toFixed(1)}h</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Regular Hours</p>
        </div>
        <div className="bg-muted rounded-lg p-3 text-center">
          <p className={cn('text-lg font-bold', snapshot.total_overtime_hours > 0 ? 'text-amber-600' : 'text-foreground')}>
            {snapshot.total_overtime_hours?.toFixed(1)}h
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Overtime</p>
        </div>
        <div className="bg-muted rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-foreground">S${snapshot.regular_pay?.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Regular Pay</p>
        </div>
        <div className="bg-muted rounded-lg p-3 text-center">
          <p className={cn('text-lg font-bold', snapshot.overtime_pay > 0 ? 'text-amber-600' : 'text-foreground')}>
            S${(snapshot.overtime_pay ?? 0).toFixed(2)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">OT Pay</p>
        </div>
      </div>

      {/* Gross / Net */}
      <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Gross Pay</p>
          <p className="text-xl font-bold text-foreground">S${snapshot.gross_pay?.toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Net Pay</p>
          <p className="text-xl font-bold text-primary">S${snapshot.net_pay?.toFixed(2)}</p>
        </div>
      </div>

      {/* CPF row (Singapore) */}
      {(snapshot.cpf_employee > 0 || snapshot.cpf_employer > 0) && (
        <div className="text-xs text-muted-foreground flex justify-between">
          <span>CPF Employee: S${snapshot.cpf_employee?.toFixed(2)}</span>
          <span>CPF Employer: S${snapshot.cpf_employer?.toFixed(2)}</span>
        </div>
      )}

      {/* Productivity */}
      {snapshot.avg_productivity_score != null && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>Avg Productivity: <strong className="text-foreground">{snapshot.avg_productivity_score?.toFixed(0)}%</strong></span>
        </div>
      )}

      {/* Actions */}
      {!isLocked && !isPaid && (
        <div className="flex gap-2 pt-1">
          <Button
            className="flex-1 h-8 text-xs orbitan-gradient text-white gap-1.5"
            onClick={() => onLock(snapshot)}
            disabled={loading}
          >
            <Lock className="w-3 h-3" /> Lock & Approve
          </Button>
          <Button
            variant="outline"
            className="h-8 text-xs border-amber-300 text-amber-600 hover:bg-amber-50 gap-1.5"
            onClick={() => onDispute(snapshot)}
            disabled={loading}
          >
            <AlertCircle className="w-3 h-3" /> Dispute
          </Button>
        </div>
      )}

      {isLocked && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 rounded-lg p-2">
            <Lock className="w-3 h-3" />
            <span>Locked by <strong>{snapshot.locked_by_name}</strong> · {snapshot.locked_date ? format(new Date(snapshot.locked_date), 'd MMM, h:mm a') : ''}</span>
          </div>
          {onReopen && (
            <Button
              variant="outline"
              className="w-full h-8 text-xs gap-1.5"
              onClick={() => onReopen(snapshot)}
              disabled={loading}
            >
              <Unlock className="w-3 h-3" /> Reopen for Editing
            </Button>
          )}
        </div>
      )}
    </div>
  );
}