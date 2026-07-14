import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import EmptyState from '@/components/shared/EmptyState';
import { Activity, Loader2, Users, CheckCircle2, TrendingUp } from 'lucide-react';

const HEAT_COLORS = [
  { threshold: 90, bg: 'bg-orbitan-green', text: 'text-white', label: 'Excellent (90+)' },
  { threshold: 75, bg: 'bg-green-300', text: 'text-green-900', label: 'Good (75–89)' },
  { threshold: 60, bg: 'bg-orbitan-amber-light', text: 'text-orbitan-amber', label: 'Fair (60–74)' },
  { threshold: 40, bg: 'bg-amber-300', text: 'text-amber-900', label: 'Below Avg (40–59)' },
  { threshold: 0, bg: 'bg-orbitan-red-light', text: 'text-orbitan-red', label: 'At Risk (<40)' },
];

function getHeatColor(score) {
  if (score === null || score === undefined) return null;
  return HEAT_COLORS.find(h => score >= h.threshold) || HEAT_COLORS[HEAT_COLORS.length - 1];
}

function getWeekKey(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function getWeekLabel(weekKey) {
  const [year, wk] = weekKey.split('-W');
  const onejan = new Date(parseInt(year), 0, 1);
  const dayOffset = (parseInt(wk) - 1) * 7 - onejan.getDay();
  const monday = new Date(parseInt(year), 0, 1 + dayOffset + 1);
  return monday.toLocaleDateString('en-SG', { day: '2-digit', month: 'short' });
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
    queryFn: () => base44.entities.ClockRecord.list('-date', 300),
    enabled: !!tenantId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['heatmap-tasks', tenantId],
    queryFn: () => base44.entities.Task.list('-created_date', 300),
    enabled: !!tenantId,
  });

  // Build last 4 weeks keys
  const weekKeys = useMemo(() => {
    const weeks = [];
    const now = new Date();
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      weeks.push(getWeekKey(d.toISOString()));
    }
    return weeks;
  }, []);

  // Per-employee × per-week aggregation
  const performanceMatrix = useMemo(() => {
    // Group clock records by employee + week
    const clockMap = {}; // { empId: { weekKey: { total, punctual, lateMins } } }
    for (const c of clockRecords) {
      if (!c.employee_id || !c.date) continue;
      const wk = getWeekKey(c.date);
      if (!wk) continue;
      if (!clockMap[c.employee_id]) clockMap[c.employee_id] = {};
      if (!clockMap[c.employee_id][wk]) clockMap[c.employee_id][wk] = { total: 0, punctual: 0, lateMinsSum: 0 };
      clockMap[c.employee_id][wk].total++;
      if ((c.late_mins || 0) === 0) clockMap[c.employee_id][wk].punctual++;
      clockMap[c.employee_id][wk].lateMinsSum += (c.late_mins || 0);
    }

    // Group tasks by employee + week
    const taskMap = {};
    for (const t of tasks) {
      if (!t.assigned_to) continue;
      const dateRef = t.completed_date || t.due_date;
      if (!dateRef) continue;
      const wk = getWeekKey(dateRef);
      if (!wk) continue;
      if (!taskMap[t.assigned_to]) taskMap[t.assigned_to] = {};
      if (!taskMap[t.assigned_to][wk]) taskMap[t.assigned_to][wk] = { total: 0, completed: 0 };
      taskMap[t.assigned_to][wk].total++;
      if (t.status === 'completed') taskMap[t.assigned_to][wk].completed++;
    }

    return employees.map(emp => {
      const empClock = clockMap[emp.id] || {};
      const empTasks = taskMap[emp.id] || {};

      // Per-week scores
      const weeklyData = weekKeys.map(wk => {
        const clock = empClock[wk];
        const tasks = empTasks[wk];

        const punctuality = clock && clock.total > 0
          ? Math.round((clock.punctual / clock.total) * 100)
          : null;

        const taskCompletion = tasks && tasks.total > 0
          ? Math.round((tasks.completed / tasks.total) * 100)
          : null;

        // Overall: average of available scores
        const scores = [punctuality, taskCompletion].filter(s => s !== null);
        const overall = scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : null;

        const avgLate = clock && clock.total > 0
          ? Math.round(clock.lateMinsSum / clock.total)
          : 0;

        return { weekKey: wk, punctuality, taskCompletion, overall, avgLate, shifts: clock?.total || 0, tasks: tasks?.total || 0 };
      });

      // Aggregate scores across all weeks
      const allPunctuality = weeklyData.map(w => w.punctuality).filter(s => s !== null);
      const allCompletion = weeklyData.map(w => w.taskCompletion).filter(s => s !== null);
      const allOverall = weeklyData.map(w => w.overall).filter(s => s !== null);

      const avgPunctuality = allPunctuality.length > 0 ? Math.round(allPunctuality.reduce((a, b) => a + b, 0) / allPunctuality.length) : null;
      const avgCompletion = allCompletion.length > 0 ? Math.round(allCompletion.reduce((a, b) => a + b, 0) / allCompletion.length) : null;
      const avgOverall = allOverall.length > 0 ? Math.round(allOverall.reduce((a, b) => a + b, 0) / allOverall.length) : null;
      const totalShifts = weeklyData.reduce((s, w) => s + w.shifts, 0);
      const totalTasks = weeklyData.reduce((s, w) => s + w.tasks, 0);

      return {
        ...emp,
        weeklyData,
        avgPunctuality,
        avgCompletion,
        avgOverall,
        totalShifts,
        totalTasks,
      };
    }).filter(e => e.avgOverall !== null);
  }, [employees, clockRecords, tasks, weekKeys]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (performanceMatrix.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No performance data yet"
        description="Clock-in records and task completions will populate this heatmap once staff start using the scheduling and task modules."
        color="blue"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground">Legend:</span>
        {HEAT_COLORS.map(h => (
          <span key={h.label} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${h.bg} ${h.text}`}>
            {h.label}
          </span>
        ))}
      </div>

      {/* Heatmap Grid */}
      <div className="bg-card border border-border rounded-xl overflow-hidden card-elevated">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground sticky left-0 bg-muted/50 z-10 min-w-[180px]">Employee</th>
                {weekKeys.map(wk => (
                  <th key={wk} className="text-center px-2 py-3 text-xs font-semibold text-muted-foreground min-w-[80px]">
                    {getWeekLabel(wk)}
                  </th>
                ))}
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground border-l border-border">Avg Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {performanceMatrix
                .sort((a, b) => (b.avgOverall || 0) - (a.avgOverall || 0))
                .map(emp => {
                  const overallColor = getHeatColor(emp.avgOverall);
                  return (
                    <tr key={emp.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 sticky left-0 bg-card z-10">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full orbitan-gradient flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                            {emp.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{emp.full_name}</p>
                            <p className="text-[10px] text-muted-foreground">{emp.position || 'Staff'} · {emp.totalShifts} shifts</p>
                          </div>
                        </div>
                      </td>
                      {emp.weeklyData.map(wd => {
                        const cellColor = getHeatColor(wd.overall);
                        const hasData = wd.overall !== null;
                        return (
                          <td key={wd.weekKey} className="px-2 py-3 text-center" title={hasData ? `Punctuality: ${wd.punctuality ?? '—'}% | Tasks: ${wd.taskCompletion ?? '—'}% | Late avg: ${wd.avgLate}m | Shifts: ${wd.shifts}` : 'No data'}>
                            {hasData ? (
                              <div className={`inline-flex flex-col items-center justify-center w-16 h-12 rounded-lg ${cellColor.bg} ${cellColor.text} cursor-default transition-transform hover:scale-105`}>
                                <span className="text-sm font-bold leading-none">{wd.overall}</span>
                                <span className="text-[9px] opacity-80 mt-0.5">{wd.shifts}s · {wd.tasks}t</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center justify-center w-16 h-12 rounded-lg bg-muted text-muted-foreground/40 text-xs">
                                —
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center border-l border-border">
                        <span className={`inline-flex items-center justify-center w-16 h-10 rounded-lg text-lg font-bold ${overallColor?.bg || 'bg-muted'} ${overallColor?.text || 'text-muted-foreground'}`}>
                          {emp.avgOverall ?? '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orbitan-green-light flex items-center justify-center">
            <Users className="w-4 h-4 text-orbitan-green" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tracked Staff</p>
            <p className="text-lg font-bold">{performanceMatrix.length}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orbitan-blue-light flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-orbitan-blue" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Avg Score</p>
            <p className="text-lg font-bold">{Math.round(performanceMatrix.reduce((s, e) => s + (e.avgOverall || 0), 0) / performanceMatrix.length)}%</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orbitan-amber-light flex items-center justify-center">
            <Activity className="w-4 h-4 text-orbitan-amber" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Needs Attention</p>
            <p className="text-lg font-bold">{performanceMatrix.filter(e => (e.avgOverall || 0) < 60).length}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orbitan-green-light flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-orbitan-green" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Top Performer</p>
            <p className="text-sm font-bold truncate max-w-[100px]">{performanceMatrix[0]?.full_name?.split(' ')[0] || '—'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}