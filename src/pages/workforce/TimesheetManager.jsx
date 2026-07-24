// ============================================================
// ORBITAN — TimesheetManager
// Manager-facing: Validate clock records → Lock payroll snapshots.
// The "Regulate" principle enforcement for workforce data.
//
// FLOW: ClockRecord (clocked_out) → Manager Validates → 
//       PayrollSnapshot (draft) → Manager Locks → Payroll Ready
//
// EXIT-READY: Uses OrbitanQuery service exclusively.
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { OrbitanQuery } from '@/lib/services/OrbitanQuery';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks } from 'date-fns';
import TimesheetValidationRow from '@/components/workforce/TimesheetValidationRow';
import PayrollSummaryCard from '@/components/workforce/PayrollSummaryCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard, Package, ShoppingCart, DollarSign,
  Users, Clock, Timer, CheckSquare, Shield, BarChart2,
  Calendar, Download, RefreshCw, Lock, CheckCircle2,
  AlertTriangle, ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PERIOD_OPTIONS = [
  { label: 'This Week', value: 'this_week' },
  { label: 'Last Week', value: 'last_week' },
  { label: 'This Month', value: 'this_month' },
];

function getPeriodDates(period) {
  const now = new Date();
  if (period === 'this_week') return {
    from: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    to: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  };
  if (period === 'last_week') {
    const lw = subWeeks(now, 1);
    return {
      from: format(startOfWeek(lw, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      to: format(endOfWeek(lw, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    };
  }
  return {
    from: format(startOfMonth(now), 'yyyy-MM-dd'),
    to: format(endOfMonth(now), 'yyyy-MM-dd'),
  };
}

export default function TimesheetManager() {
  const [user, setUser] = useState(null);
  const [records, setRecords] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [period, setPeriod] = useState('this_week');
  const [activeTab, setActiveTab] = useState('validate'); // validate | payroll
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [q, setQ] = useState(null);

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (q) loadData();
  }, [q, period]);

  const init = async () => {
    const me = await base44.auth.me();
    setUser(me);
    const query = OrbitanQuery({ user: me, outletFilter: { outlet_id: me.data?.outlet_id } });
    setQ(query);
  };

  const loadData = useCallback(async () => {
    if (!q) return;
    setLoading(true);
    const { from, to } = getPeriodDates(period);
    const [recs, snaps] = await Promise.all([
      q.getTimesheetRecords(from, to),
      q.getPayrollSnapshots(from, to),
    ]);
    setRecords(recs);
    setSnapshots(snaps);
    setLoading(false);
  }, [q, period]);

  // ── Validate Actions ────────────────────────────────────────
  const handleApprove = async (recordId) => {
    setActionLoading(true);
    await q.update('ClockRecord', recordId, {
      validation_status: 'approved',
      verified_by: user.id,
      verified_by_name: user.full_name,
      verified_date: new Date().toISOString(),
    });
    // Write AuditLog
    await base44.functions.invoke('auditEngine', {
      action_type: 'timesheet_approved',
      target_entity: 'ClockRecord',
      target_record_id: recordId,
      details: `Timesheet approved by ${user.full_name}`,
    });
    await loadData();
    setActionLoading(false);
  };

  const handleReject = async (recordId, reason) => {
    setActionLoading(true);
    await q.update('ClockRecord', recordId, {
      validation_status: 'rejected',
      rejection_reason: reason,
      verified_by: user.id,
      verified_by_name: user.full_name,
      verified_date: new Date().toISOString(),
    });
    await base44.functions.invoke('auditEngine', {
      action_type: 'timesheet_rejected',
      target_entity: 'ClockRecord',
      target_record_id: recordId,
      details: `Timesheet rejected by ${user.full_name}: ${reason}`,
    });
    await loadData();
    setActionLoading(false);
  };

  // ── Payroll Computation ─────────────────────────────────────
  const computePayrollForEmployee = (empRecords) => {
    const approved = empRecords.filter(r => r.validation_status === 'approved');
    if (!approved.length) return null;
    const sample = approved[0];
    const payRate = sample.pay_rate ?? 0;
    const otMultiplier = sample.overtime_multiplier ?? 1.5;

    const totalHours = approved.reduce((s, r) => s + (r.total_hours_worked ?? 0), 0);
    const totalOT = approved.reduce((s, r) => s + (r.overtime_hours ?? 0), 0);
    const totalBreakMins = approved.reduce((s, r) => s + (r.break_duration_mins ?? 30), 0);
    const avgProductivity = approved.reduce((s, r) => s + (r.productivity_score ?? 0), 0) / approved.length;

    const regularPay = totalHours * payRate;
    const overtimePay = totalOT * payRate * otMultiplier;
    const grossPay = regularPay + overtimePay;
    const netPay = grossPay; // CPF / deductions can be added later

    const { from, to } = getPeriodDates(period);

    return {
      tenant_id: sample.tenant_id,
      outlet_id: sample.outlet_id,
      employee_id: sample.employee_id,
      employee_name: sample.employee_name,
      employee_role: sample.employee_role,
      pay_type: sample.pay_type ?? 'hourly',
      pay_rate: payRate,
      overtime_multiplier: otMultiplier,
      currency: 'SGD',
      period_start: from,
      period_end: to,
      total_shifts: approved.length,
      total_hours_worked: Math.round(totalHours * 100) / 100,
      total_break_mins: totalBreakMins,
      total_overtime_hours: Math.round(totalOT * 100) / 100,
      regular_pay: Math.round(regularPay * 100) / 100,
      overtime_pay: Math.round(overtimePay * 100) / 100,
      gross_pay: Math.round(grossPay * 100) / 100,
      net_pay: Math.round(netPay * 100) / 100,
      allowances: 0,
      deductions: 0,
      cpf_employee: 0,
      cpf_employer: 0,
      avg_productivity_score: Math.round(avgProductivity * 10) / 10,
      validated_clock_record_ids: approved.map(r => r.id),
      status: 'draft',
    };
  };

  const handleGeneratePayroll = async () => {
    setActionLoading(true);
    // Group records by employee
    const byEmployee = {};
    records.forEach(r => {
      if (!byEmployee[r.employee_id]) byEmployee[r.employee_id] = [];
      byEmployee[r.employee_id].push(r);
    });

    const { from, to } = getPeriodDates(period);

    for (const [empId, empRecords] of Object.entries(byEmployee)) {
      const existing = snapshots.find(s => s.employee_id === empId &&
        s.period_start === from && s.period_end === to);
      if (existing) continue; // Skip if already exists

      const payload = computePayrollForEmployee(empRecords);
      if (payload) {
        await q.create('PayrollSnapshot', payload);
      }
    }
    await loadData();
    setActiveTab('payroll');
    setActionLoading(false);
  };

  const handleLockSnapshot = async (snapshot) => {
    setActionLoading(true);
    await q.update('PayrollSnapshot', snapshot.id, {
      status: 'locked',
      locked_by: user.id,
      locked_by_name: user.full_name,
      locked_date: new Date().toISOString(),
    });
    // Lock all included ClockRecords
    for (const clockId of (snapshot.validated_clock_record_ids || [])) {
      await q.update('ClockRecord', clockId, { payroll_locked: true, payroll_snapshot_id: snapshot.id });
    }
    // Write AuditLog
    await base44.functions.invoke('auditEngine', {
      action_type: 'payroll_locked',
      target_entity: 'PayrollSnapshot',
      target_record_id: snapshot.id,
      details: `Payroll S$${snapshot.gross_pay} locked for ${snapshot.employee_name} by ${user.full_name}`,
    });
    await loadData();
    setActionLoading(false);
  };

  const handleDisputeSnapshot = async (snapshot) => {
    await q.update('PayrollSnapshot', snapshot.id, { status: 'disputed' });
    await loadData();
  };

  // ── Payroll Reopen (Part C): unlock a locked snapshot back to draft, with Audit Log ──
  const handleReopenSnapshot = async (snapshot) => {
    setActionLoading(true);
    await q.update('PayrollSnapshot', snapshot.id, {
      status: 'draft',
      locked_by: '',
      locked_by_name: '',
      locked_date: null,
    });
    // Unlock all included ClockRecords so they can be re-edited / re-validated
    for (const clockId of (snapshot.validated_clock_record_ids || [])) {
      await q.update('ClockRecord', clockId, { payroll_locked: false, payroll_snapshot_id: '' });
    }
    await base44.functions.invoke('auditEngine', {
      action_type: 'payroll_reopened',
      target_entity: 'PayrollSnapshot',
      target_record_id: snapshot.id,
      details: `Payroll (S$${snapshot.gross_pay}) for ${snapshot.employee_name} reopened by ${user.full_name} (was locked)`,
    });
    await loadData();
    setActionLoading(false);
  };

  // ── Derived Stats ───────────────────────────────────────────
  const pendingCount = records.filter(r => !r.verified_by && r.status === 'clocked_out').length;
  const approvedCount = records.filter(r => r.validation_status === 'approved').length;
  const rejectedCount = records.filter(r => r.validation_status === 'rejected').length;
  const totalLabour = records
    .filter(r => r.validation_status === 'approved')
    .reduce((s, r) => s + (r.total_shift_cost ?? r.labour_cost ?? 0), 0);

  const employees = [...new Set(records.map(r => r.employee_id))];
  const filteredRecords = filterEmployee === 'all'
    ? records
    : records.filter(r => r.employee_id === filterEmployee);

  const { from, to } = getPeriodDates(period);
  const periodSnapshots = snapshots.filter(s => s.period_start === from);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-heading font-bold text-foreground">Timesheet & Payroll</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Validate shifts · Generate payroll · Lock for disbursement</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData} className="gap-1.5 text-xs">
              <RefreshCw className="w-3 h-3" /> Refresh
            </Button>
            {activeTab === 'validate' && approvedCount > 0 && (
              <Button
                size="sm"
                className="gap-1.5 text-xs orbitan-gradient text-white"
                onClick={handleGeneratePayroll}
                disabled={actionLoading}
              >
                <ClipboardList className="w-3 h-3" /> Generate Payroll
              </Button>
            )}
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Pending Review', value: pendingCount, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Approved', value: approvedCount, color: 'text-green-700', bg: 'bg-green-50' },
            { label: 'Rejected', value: rejectedCount, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Total Labour Cost', value: `S$${totalLabour.toFixed(2)}`, color: 'text-primary', bg: 'bg-primary/5' },
          ].map(k => (
            <div key={k.label} className={cn('rounded-xl p-4 border border-border', k.bg)}>
              <p className={cn('text-xl font-bold', k.color)}>{k.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Period + Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium transition-colors',
                  period === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Employee Filter */}
          <select
            className="text-xs border border-border rounded-lg px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            value={filterEmployee}
            onChange={e => setFilterEmployee(e.target.value)}
          >
            <option value="all">All Employees</option>
            {records.filter((r, i, a) => a.findIndex(x => x.employee_id === r.employee_id) === i)
              .map(r => (
                <option key={r.employee_id} value={r.employee_id}>{r.employee_name}</option>
              ))}
          </select>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {[
            { id: 'validate', label: 'Validate Records', badge: pendingCount },
            { id: 'payroll', label: 'Payroll Snapshots', badge: periodSnapshots.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
              {tab.badge > 0 && (
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-bold',
                  activeTab === tab.id ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                )}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab: Validate Records ── */}
        {activeTab === 'validate' && (
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No timesheet records for this period</p>
                <p className="text-xs mt-1">Clock-out records will appear here for validation</p>
              </div>
            ) : (
              <>
                {/* Table Header */}
                <div className="hidden md:grid grid-cols-[1fr_96px_128px_64px_80px_112px] gap-3 px-4 py-2.5 border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <span>Employee</span>
                  <span className="text-center">Date</span>
                  <span className="text-center">Clock Times</span>
                  <span className="text-center">Hours</span>
                  <span className="text-center">Cost</span>
                  <span className="text-right">Action</span>
                </div>
                {filteredRecords.map(rec => (
                  <TimesheetValidationRow
                    key={rec.id}
                    record={rec}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    loading={actionLoading}
                  />
                ))}
                {/* Footer Summary */}
                <div className="px-4 py-3 bg-muted/30 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span>{filteredRecords.length} records · {approvedCount} approved</span>
                  <span className="font-semibold text-foreground">Validated Labour: S${totalLabour.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Tab: Payroll Snapshots ── */}
        {activeTab === 'payroll' && (
          <div>
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : periodSnapshots.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No payroll snapshots for this period</p>
                <p className="text-xs mt-1">Approve timesheet records then click "Generate Payroll"</p>
                {approvedCount > 0 && (
                  <Button
                    className="mt-4 orbitan-gradient text-white gap-2"
                    onClick={handleGeneratePayroll}
                    disabled={actionLoading}
                  >
                    <ClipboardList className="w-4 h-4" /> Generate Payroll Now
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {periodSnapshots.map(snap => (
                  <PayrollSummaryCard
                    key={snap.id}
                    snapshot={snap}
                    onLock={handleLockSnapshot}
                    onDispute={handleDisputeSnapshot}
                    onReopen={handleReopenSnapshot}
                    loading={actionLoading}
                  />
                ))}
              </div>
            )}

            {/* Period Total */}
            {periodSnapshots.length > 0 && (
              <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Period Total</p>
                  <p className="text-xs text-muted-foreground">{periodSnapshots.length} employees · {from} to {to}</p>
                </div>
                <div className="flex gap-6">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Gross</p>
                    <p className="text-xl font-bold text-foreground">
                      S${periodSnapshots.reduce((s, x) => s + (x.gross_pay ?? 0), 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Net</p>
                    <p className="text-xl font-bold text-primary">
                      S${periodSnapshots.reduce((s, x) => s + (x.net_pay ?? 0), 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
  );
}