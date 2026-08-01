import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import BackBar from '@/components/shared/BackBar';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import EmptyState from '@/components/shared/EmptyState';
import LoadingState from '@/components/shared/LoadingState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Download, CheckCircle2, AlertCircle, ListChecks, TrendingUp,
  Clock, Filter, X, ExternalLink, RefreshCw, Users, Layers, MapPin,
} from 'lucide-react';

const STATUS_LABELS = {
  draft: 'Draft', assigned: 'Assigned', acknowledged: 'Acknowledged',
  in_progress: 'In Progress', blocked: 'Blocked', submitted_for_review: 'Submitted',
  changes_required: 'Changes Required', completed: 'Completed', verified: 'Verified',
  cancelled: 'Cancelled', archived: 'Archived',
};
const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };
const PRIORITY_COLORS = { low: '#94a3b8', medium: '#3b82f6', high: '#f59e0b', urgent: '#ef4444' };
const STATUS_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#a3a3a3',
];

function NotMeasured() {
  return <span className="text-xs italic text-muted-foreground">Not Yet Measurable</span>;
}

export default function TaskAnalyticsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const backTo = isAdmin ? '/leader-org' : '/workspace';

  const [filters, setFilters] = useState({
    priority: 'all', status: 'all', outlet: 'all',
    employee: 'all', module: 'all', dateFrom: '',
  });

  const queryFilter = useMemo(() => {
    const f = {};
    if (filters.priority !== 'all') f.priority = filters.priority;
    if (filters.status !== 'all') f.status = filters.status;
    if (filters.outlet !== 'all') f.outlet_id = filters.outlet;
    if (filters.employee !== 'all') f.responsible_agent_id = filters.employee;
    if (filters.module !== 'all') f.module_context = filters.module;
    return f;
  }, [filters]);

  const { data: tasks, isLoading, isError, refetch } = useQuery({
    queryKey: ['task-analytics', queryFilter, filters.dateFrom],
    queryFn: async () => {
      const result = await base44.entities.Task.filter(queryFilter, '-created_date', 500);
      let rows = result || [];
      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom);
        rows = rows.filter((t) => t.created_date && new Date(t.created_date) >= from);
      }
      return rows;
    },
  });

  // Fetch outlets and employees for filter dropdowns
  const { data: outlets } = useQuery({
    queryKey: ['outlets-for-filter'],
    queryFn: async () => base44.entities.Outlet.list('-name', 100) || [],
  });
  const { data: employees } = useQuery({
    queryKey: ['employees-for-filter'],
    queryFn: async () => base44.entities.Employee.list('-full_name', 200) || [],
  });

  const stats = useMemo(() => {
    const list = tasks || [];
    const now = new Date();
    const total = list.length;
    const completed = list.filter((t) => ['completed', 'verified'].includes(t.status));
    const overdue = list.filter((t) =>
      t.due_date && new Date(t.due_date) < now &&
      !['completed', 'verified', 'cancelled', 'archived'].includes(t.status)
    );
    const inProgress = list.filter((t) =>
      ['assigned', 'acknowledged', 'in_progress', 'submitted_for_review'].includes(t.status)
    );
    const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;

    // Average completion time (days from created to completed)
    const completedWithDates = completed
      .filter((t) => t.completed_date && t.created_date)
      .map((t) => {
        const created = new Date(t.created_date);
        const done = new Date(t.completed_date);
        return Math.max(0, (done - created) / (1000 * 60 * 60 * 24));
      });
    const avgCompletionDays = completedWithDates.length > 0
      ? Math.round((completedWithDates.reduce((a, b) => a + b, 0) / completedWithDates.length) * 10) / 10
      : null;

    const byPriority = { low: 0, medium: 0, high: 0, urgent: 0 };
    const byStatus = {};
    const byModule = {};
    const byOutlet = {};
    const byAssignee = {};
    list.forEach((t) => {
      if (t.priority && byPriority[t.priority] !== undefined) byPriority[t.priority]++;
      const sl = STATUS_LABELS[t.status] || t.status || 'Unknown';
      byStatus[sl] = (byStatus[sl] || 0) + 1;
      const mod = t.module_context || 'Unspecified';
      byModule[mod] = (byModule[mod] || 0) + 1;
      const outletName = t.outlet_id || 'Unspecified';
      byOutlet[outletName] = (byOutlet[outletName] || 0) + 1;
      const assignee = t.responsible_agent_name || 'Unassigned';
      byAssignee[assignee] = (byAssignee[assignee] || 0) + 1;
    });

    // Completion trend (last 14 days)
    const trendData = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayCompleted = completed.filter((t) =>
        t.completed_date && new Date(t.completed_date).toISOString().split('T')[0] === dateStr
      ).length;
      const dayOverdue = overdue.filter((t) =>
        t.due_date && new Date(t.due_date).toISOString().split('T')[0] === dateStr
      ).length;
      trendData.push({ date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), completed: dayCompleted, overdue: dayOverdue });
    }

    return {
      total, completedCount: completed.length, overdueCount: overdue.length,
      inProgressCount: inProgress.length, completionRate, avgCompletionDays,
      byPriority, byStatus, byModule, byOutlet, byAssignee, trendData,
    };
  }, [tasks]);

  const hasData = stats.total > 0;

  const handleExport = () => {
    const headers = ['Title', 'Status', 'Priority', 'Assignee', 'Due Date', 'Module', 'Outlet', 'Created', 'Completed'];
    const rows = (tasks || []).map((t) => [
      t.title || '', t.status || '', t.priority || '',
      t.responsible_agent_name || '', t.due_date || '',
      t.module_context || '', t.outlet_id || '',
      t.created_date ? new Date(t.created_date).toLocaleDateString() : '',
      t.completed_date ? new Date(t.completed_date).toLocaleDateString() : '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `task-analytics-${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => setFilters({ priority: 'all', status: 'all', outlet: 'all', employee: 'all', module: 'all', dateFrom: '' });

  const updateFilter = (key, val) => setFilters((p) => ({ ...p, [key]: val }));
  const hasActiveFilters = Object.values(filters).some((v) => v !== 'all' && v !== '');

  const priorityData = Object.entries(stats.byPriority).filter(([, v]) => v > 0).map(([k, v]) => ({ name: PRIORITY_LABELS[k] || k, value: v, color: PRIORITY_COLORS[k] }));
  const statusData = Object.entries(stats.byStatus).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  const moduleData = Object.entries(stats.byModule).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name: name.length > 15 ? name.slice(0, 15) + '…' : name, fullName: name, value }));
  const assigneeData = Object.entries(stats.byAssignee).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name: name.length > 15 ? name.slice(0, 15) + '…' : name, value }));

  return (
    <div className="min-h-screen bg-background">
      <BackBar to={backTo} label={isAdmin ? 'Platform Console' : 'Workspace'} title="Task Analytics" />
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        <PageHeader
          title="Task Analytics"
          subtitle="Task performance, workload distribution, and completion trends across your organisation."
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}><RefreshCw className="w-4 h-4 mr-1.5" /> Refresh</Button>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={!hasData}><Download className="w-4 h-4 mr-1.5" /> Export CSV</Button>
            </div>
          }
        />

        {/* Filters */}
        <Card className="p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters</span>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="ml-auto text-xs" onClick={clearFilters}>
                <X className="w-3 h-3 mr-1" /> Clear All
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Select value={filters.status} onValueChange={(v) => updateFilter('status', v)}>
              <SelectTrigger className="w-full text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.priority} onValueChange={(v) => updateFilter('priority', v)}>
              <SelectTrigger className="w-full text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {Object.entries(PRIORITY_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.outlet} onValueChange={(v) => updateFilter('outlet', v)}>
              <SelectTrigger className="w-full text-xs"><SelectValue placeholder="Outlet" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outlets</SelectItem>
                {(outlets || []).map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.employee} onValueChange={(v) => updateFilter('employee', v)}>
              <SelectTrigger className="w-full text-xs"><SelectValue placeholder="Employee" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {(employees || []).map((e) => <SelectItem key={e.id} value={e.user_id || e.id}>{e.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.module} onValueChange={(v) => updateFilter('module', v)}>
              <SelectTrigger className="w-full text-xs"><SelectValue placeholder="Module" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {[...new Set((tasks || []).map((t) => t.module_context).filter(Boolean))].sort().map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={filters.dateFrom} onChange={(e) => updateFilter('dateFrom', e.target.value)} className="w-full text-xs" aria-label="Filter from date" />
          </div>
        </Card>

        {isLoading ? (
          <LoadingState message="Loading task data…" />
        ) : isError ? (
          <EmptyState icon={AlertCircle} title="Failed to load data" color="red"
            description="An error occurred while fetching task analytics. Please try again."
            actionLabel="Retry" onAction={() => refetch()} />
        ) : !hasData ? (
          <EmptyState icon={ListChecks} title="No task data found" color="blue"
            description="Tasks created by your team will appear here with analytics on completion rates, workload, and trends." />
        ) : (
          <>
            {/* KPI Strip */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              <StatCard title="Total Tasks" value={stats.total} icon={ListChecks} color="blue" compact />
              <StatCard title="Completed" value={stats.completedCount} icon={CheckCircle2} color="green" compact />
              <StatCard title="Overdue" value={stats.overdueCount} icon={AlertCircle} color="red" compact />
              <StatCard title="In Progress" value={stats.inProgressCount} icon={Clock} color="amber" compact />
              <StatCard title="Completion Rate" value={`${stats.completionRate}%`} icon={TrendingUp} color="purple" compact />
              <StatCard title="Avg Completion" value={stats.avgCompletionDays !== null ? `${stats.avgCompletionDays}d` : '—'} icon={Clock} color="slate" compact />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Status Distribution</CardTitle>
                  <p className="text-xs text-muted-foreground">{stats.total} tasks across {Object.keys(stats.byStatus).length} statuses</p>
                </CardHeader>
                <CardContent>
                  <div style={{ width: '100%', height: 240 }}>
                    <ResponsiveContainer>
                      <BarChart data={statusData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} interval={0} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Priority Distribution</CardTitle>
                  <p className="text-xs text-muted-foreground">{priorityData.length > 0 ? `${priorityData.reduce((a, b) => a + b.value, 0)} tasks by priority` : <NotMeasured />}</p>
                </CardHeader>
                <CardContent>
                  {priorityData.length > 0 ? (
                    <div style={{ width: '100%', height: 240 }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie data={priorityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} label={(e) => `${e.name}: ${e.value}`}>
                            {priorityData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: '11px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <div className="flex items-center justify-center h-[240px]"><NotMeasured /></div>}
                </CardContent>
              </Card>
            </div>

            {/* Completion Trend */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-sm">Completion & Overdue Trend (14 days)</CardTitle>
                <p className="text-xs text-muted-foreground">Daily task completions and overdue items over the last 14 days</p>
              </CardHeader>
              <CardContent>
                {stats.trendData.some((d) => d.completed > 0 || d.overdue > 0) ? (
                  <div style={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer>
                      <LineChart data={stats.trendData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} name="Completed" dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="overdue" stroke="#ef4444" strokeWidth={2} name="Overdue" dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : <div className="flex items-center justify-center h-[260px]"><NotMeasured /></div>}
              </CardContent>
            </Card>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2"><Layers className="w-4 h-4" /> Module Distribution</CardTitle>
                  <p className="text-xs text-muted-foreground">Tasks grouped by module context</p>
                </CardHeader>
                <CardContent>
                  {moduleData.length > 0 ? (
                    <div style={{ width: '100%', height: 200 }}>
                      <ResponsiveContainer>
                        <BarChart data={moduleData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                          <Tooltip />
                          <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <div className="flex items-center justify-center h-[200px]"><NotMeasured /></div>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4" /> Workload by Employee</CardTitle>
                  <p className="text-xs text-muted-foreground">Top assignees by task count</p>
                </CardHeader>
                <CardContent>
                  {assigneeData.length > 0 ? (
                    <div style={{ width: '100%', height: 200 }}>
                      <ResponsiveContainer>
                        <BarChart data={assigneeData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                          <Tooltip />
                          <Bar dataKey="value" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <div className="flex items-center justify-center h-[200px]"><NotMeasured /></div>}
                </CardContent>
              </Card>
            </div>

            {/* Outlet Distribution */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4" /> Outlet Distribution</CardTitle>
                <p className="text-xs text-muted-foreground">Tasks grouped by outlet</p>
              </CardHeader>
              <CardContent>
                {Object.keys(stats.byOutlet).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stats.byOutlet).sort((a, b) => b[1] - a[1]).map(([name, count]) => {
                      const outlet = (outlets || []).find((o) => o.id === name);
                      const display = outlet?.name || (name === 'Unspecified' ? 'Unspecified' : name.slice(-6));
                      return <Badge key={name} variant="secondary" className="text-xs">{display}: {count}</Badge>;
                    })}
                  </div>
                ) : <NotMeasured />}
              </CardContent>
            </Card>

            {/* Deep Link */}
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => navigate(isAdmin ? '/leader-org' : '/workspace')}>
                <ExternalLink className="w-4 h-4 mr-1.5" /> View Task List
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}