// ============================================================
// Widget: Weekly Attendance
// Shows a simple worker-level attendance summary for the
// current week. Uses existing clock records.
// ============================================================
import React from 'react';
import { isWithinInterval, startOfWeek, endOfWeek } from 'date-fns';
import { Calendar, Clock } from 'lucide-react';

export default function WeeklyAttendanceWidget({ clockRecords = [], shifts = [] }) {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const weekRecords = (clockRecords || []).filter(r => {
    try { return isWithinInterval(new Date(r.date), { start: weekStart, end: weekEnd }); }
    catch { return false; }
  });

  const weekShifts = (shifts || []).filter(s => {
    try { return isWithinInterval(new Date(s.date), { start: weekStart, end: weekEnd }); }
    catch { return false; }
  });

  // Empty state
  if (weekRecords.length === 0 && weekShifts.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4">
        <WidgetHeader />
        <div className="py-4 text-center">
          <Clock className="w-7 h-7 text-muted-foreground/40 mx-auto mb-1.5" />
          <p className="text-xs font-semibold text-foreground">No attendance data yet</p>
        </div>
      </div>
    );
  }

  const completedDays = weekRecords.filter(r => r.status === 'clocked_out').length;
  const scheduledDays = weekShifts.length;
  const completedHours = weekRecords
    .filter(r => r.total_hours_worked)
    .reduce((sum, r) => sum + (r.total_hours_worked || 0), 0);

  // Punctuality: on-time clock-ins (not late)
  const onTime = weekRecords.filter(r => (r.late_mins || 0) === 0 && r.status === 'clocked_out').length;
  const punctualityPct = completedDays > 0 ? Math.round((onTime / completedDays) * 100) : 0;

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <WidgetHeader />
      <div className="flex items-center gap-3 mt-2">
        <div className="flex flex-col items-center flex-1">
          <span className="text-lg font-bold font-display text-foreground">{completedHours.toFixed(1)}h</span>
          <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Completed</span>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="flex flex-col items-center flex-1">
          <span className="text-lg font-bold font-display text-foreground">{completedDays}/{scheduledDays}</span>
          <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Days</span>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="flex flex-col items-center flex-1">
          <span className={`text-lg font-bold font-display ${punctualityPct >= 80 ? 'text-orbitan-green' : punctualityPct >= 50 ? 'text-orbitan-amber' : 'text-destructive'}`}>
            {punctualityPct}%
          </span>
          <span className="text-[9px] text-muted-foreground uppercase tracking-wide">On-time</span>
        </div>
      </div>
    </div>
  );
}

function WidgetHeader() {
  return (
    <div className="flex items-center gap-1.5">
      <Calendar className="w-3.5 h-3.5 text-orbitan-green" />
      <span className="text-xs font-semibold">This Week</span>
    </div>
  );
}