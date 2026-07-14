import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import EmptyState from '@/components/shared/EmptyState';
import { Activity, Loader2, Users, CheckCircle2 } from 'lucide-react';

const HEAT_COLORS = [
  { threshold: 90, bg: 'bg-orbitan-green', text: 'text-white', label: 'Excellent' },
  { threshold: 75, bg: 'bg-orbitan-green-light', text: 'text-orbitan-green', label: 'Good' },
  { threshold: 60, bg: 'bg-orbitan-amber-light', text: 'text-orbitan-amber', label: 'Fair' },
  { threshold: 40, bg: 'bg-orbitan-amber', text: 'text-white', label: 'Below Average' },
  { threshold: 0, bg: 'bg-orbitan-red-light', text: 'text-orbitan-red', label: 'Needs Attention' },
];

function getHeatColor(score) {
  return HEAT_COLORS.find(h => score >= h.threshold) || HEAT_COLORS[HEAT_COLORS.length - 1];
}

export default function PerformanceHeatmap() {
  const { user } = useAuth();
  const tenantId = user?.data?.tenant_id || user?.tenant_id;

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['heatmap-employees', tenantId],
    queryFn: () => base44.entities.Employee.list('-created_date', 100),
    enabled: !!tenantId,
  });

  const { data: clockRecords = [] } = useQuery({
    queryKey: ['heatmap-clock-records', tenantId],
    queryFn: () => base44.entities.ClockRecord.list('-created_date', 200),
    enabled: !!tenantId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['heatmap-tasks', tenantId],
    queryFn: () => base44.entities.Task.list('-created_date', 200),
    enabled: !!tenantId,
  });

  const performanceData = useMemo(() => {
    return employees.map(emp => {
      const empClocks = clockRecords.filter(c => c.employee_id === emp.id);
      const empTasks = tasks.filter(t => t.assigned_to === emp.id);

      const punctualCount = empClocks.filter(c => (c.late_mins || 0) === 0).length;
      const punctualityPct = empClocks.length > 0 ? Math.round((punctualCount / empClocks.length) * 100) : null;

      const completedTasks = empTasks.filter(t => t.status === 'completed').length;
      const onTimeTasks = empTasks.filter(t => t.status === 'completed' && t.due_date && t.completed_date && new Date(t.completed_date) <= new Date(t.due_date + 'T23:59:59')).length;
      const taskCompletionPct = empTasks.length > 0 ? Math.round((completedTasks / empTasks.length) * 100) : null;
      const onTimePct = completedTasks > 0 ? Math.round((onTimeTasks / completedTasks) * 100) : null;

      const avgLateMins = empClocks.length > 0
        ? Math.round(empClocks.reduce((s, c) => s + (c.late_mins || 0), 0) / empClocks.length)
        : 0;

      const overallScore = punctualityPct !== null && taskCompletionPct !== null
        ? Math.round((punctualityPct + taskCompletionPct) / 2)
        : punctualityPct ?? taskCompletionPct ?? null;

      return {
        ...emp,
        punctualityPct,
        taskCompletionPct,
        onTimePct,
        avgLateMins,
        overallScore,
        totalShifts: empClocks.length,
        totalTasks: empTasks.length,
      };
    }).filter(e => e.overallScore !== null);
  }, [employees, clockRecords, tasks]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (performanceData.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No performance data yet"
        description="Clock-in records and task completions will populate this heatmap for all staff."
        color="blue"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-xs font-semibold text-muted-foreground">Legend:</span>
        {HEAT_COLORS.map(h => (
          <span key={h.label} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${h.bg} ${h.text}`}>
            {h.label}
          </span>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden card-elevated">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Employee</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Punctuality</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Task Completion</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">On-Time Rate</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Avg Late (min)</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Overall Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {performanceData
                .sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0))
                .map(emp => {
                  const pColor = getHeatColor(emp.punctualityPct || 0);
                  const tColor = getHeatColor(emp.taskCompletionPct || 0);
                  const oColor = getHeatColor(emp.onTimePct || 0);
                  const overallColor = getHeatColor(emp.overallScore || 0);
                  return (
                    <tr key={emp.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full orbitan-gradient flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                            {emp.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{emp.full_name}</p>
                            <p className="text-[10px] text-muted-foreground">{emp.position || 'Staff'} · {emp.totalShifts} shifts · {emp.totalTasks} tasks</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center justify-center w-14 h-8 rounded-lg text-sm font-bold ${pColor.bg} ${pColor.text}`}>
                          {emp.punctualityPct !== null ? `${emp.punctualityPct}%` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center justify-center w-14 h-8 rounded-lg text-sm font-bold ${tColor.bg} ${tColor.text}`}>
                          {emp.taskCompletionPct !== null ? `${emp.taskCompletionPct}%` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center justify-center w-14 h-8 rounded-lg text-sm font-bold ${oColor.bg} ${oColor.text}`}>
                          {emp.onTimePct !== null ? `${emp.onTimePct}%` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-semibold ${emp.avgLateMins > 5 ? 'text-orbitan-red' : emp.avgLateMins > 0 ? 'text-orbitan-amber' : 'text-orbitan-green'}`}>
                          {emp.avgLateMins}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center justify-center w-16 h-9 rounded-lg text-base font-bold ${overallColor.bg} ${overallColor.text}`}>
                          {emp.overallScore !== null ? `${emp.overallScore}` : '—'}
                        </span>
                      </td>
                    </tr>
                  );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orbitan-green-light flex items-center justify-center">
            <Users className="w-4 h-4 text-orbitan-green" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tracked Staff</p>
            <p className="text-lg font-bold">{performanceData.length}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orbitan-blue-light flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-orbitan-blue" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Avg Score</p>
            <p className="text-lg font-bold">{Math.round(performanceData.reduce((s, e) => s + (e.overallScore || 0), 0) / performanceData.length)}%</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orbitan-amber-light flex items-center justify-center">
            <Activity className="w-4 h-4 text-orbitan-amber" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Needs Attention</p>
            <p className="text-lg font-bold">{performanceData.filter(e => (e.overallScore || 0) < 60).length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}