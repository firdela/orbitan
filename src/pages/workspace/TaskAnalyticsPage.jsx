import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import BackBar from '@/components/shared/BackBar';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import EmptyState from '@/components/shared/EmptyState';
import LoadingState from '@/components/shared/LoadingState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Download, CheckCircle2, AlertCircle, ListChecks, TrendingUp, Users, Clock } from 'lucide-react';

const STATUS_LABELS = {
  draft: 'Draft', assigned: 'Assigned', acknowledged: 'Acknowledged',
  in_progress: 'In Progress', blocked: 'Blocked', submitted_for_review: 'Submitted',
  changes_required: 'Changes Required', completed: 'Completed', verified: 'Verified',
  cancelled: 'Cancelled', archived: 'Archived',
};
const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };

export default function TaskAnalyticsPage() {
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');

  const filter = useMemo(() => {
    const f = {};
    if (priorityFilter !== 'all') f.priority = priorityFilter;
    if (statusFilter !== 'all') f.status = statusFilter;
    return f;
  }, [priorityFilter, statusFilter]);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['task-analytics', filter, dateFrom],
    queryFn: async () => {
      const result = await base44.entities.Task.filter(filter, '-created_date', 500);
      let rows = result || [];
      if (dateFrom) rows = rows.filter((t) => t.created_date && new Date(t.created_date) >= new Date(dateFrom));
      return rows;
    },
  });

  const stats = useMemo(() => {
    const list = tasks || [];
    const total = list.length;
    const completed = list.filter((t) => ['completed', 'verified'].includes(t.status)).length;
    const overdue = list.filter((t) => t.due_date && new Date(t.due_date) < new Date() && !['completed', 'verified', 'cancelled', 'archived'].includes(t.status)).length;
    const inProgress = list.filter((t) => ['assigned', 'acknowledged', 'in_progress', 'submitted_for_review'].includes(t.status)).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const byPriority = { low: 0, medium: 0, high: 0, urgent: 0 };
    const byStatus = {};
    const byAssignee = {};
    list.forEach((t) => {
      if (t.priority && byPriority[t.priority] !== undefined) byPriority[t.priority]++;
      const sl = STATUS_LABELS[t.status] || t.status || 'Unknown';
      byStatus[sl] = (byStatus[sl] || 0) + 1;
      const assignee = t.responsible_agent_name || 'Unassigned';
      byAssignee[assignee] = (byAssignee[assignee] || 0) + 1;
    });
    return { total, completed, overdue, inProgress, completionRate, byPriority, byStatus, byAssignee };
  }, [tasks]);

  const handleExport = () => {
    const headers = ['Title', 'Status', 'Priority', 'Assignee', 'Due Date', 'Category', 'Created'];
    const rows = (tasks || []).map((t) => [
      t.title || '', t.status || '', t.priority || '',
      t.responsible_agent_name || '', t.due_date || '', t.category || t.module_context || '',
      t.created_date ? new Date(t.created_date).toLocaleDateString() : '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `task-analytics-${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <BackBar to="/leader-org" label="Platform Console" title="Task Analytics" />
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        <PageHeader
          title="Task Analytics"
          subtitle="Task performance, workload distribution, and completion trends across your organisation."
          actions={<Button variant="outline" size="sm" onClick={handleExport} disabled={!tasks?.length}><Download className="w-4 h-4 mr-1.5" /> Export CSV</Button>}
        />

        {isLoading ? (
          <LoadingState message="Loading task data…" />
        ) : stats.total === 0 ? (
          <EmptyState icon={ListChecks} title="No task data found" color="blue"
            description="Tasks created by your team will appear here with analytics on completion rates, workload, and trends."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatCard title="Total Tasks" value={stats.total} icon={ListChecks} color="blue" compact />
              <StatCard title="Completed" value={stats.completed} icon={CheckCircle2} color="green" compact />
              <StatCard title="Overdue" value={stats.overdue} icon={AlertCircle} color="red" compact />
              <StatCard title="Completion Rate" value={`${stats.completionRate}%`} icon={TrendingUp} color="purple" compact />
            </div>

            <Card className="p-4 mb-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    {Object.entries(PRIORITY_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {Object.entries(STATUS_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full sm:w-44" />
              </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">Status Distribution</CardTitle></CardHeader>
                <CardContent>
                  {Object.entries(stats.byStatus).sort((a, b) => b[1] - a[1]).map(([label, count]) => (
                    <div key={label} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                      <span className="text-sm">{label}</span>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Priority Distribution</CardTitle></CardHeader>
                <CardContent>
                  {Object.entries(stats.byPriority).filter(([, v]) => v > 0).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                      <span className="text-sm capitalize">{PRIORITY_LABELS[k] || k}</span>
                      <span className="text-sm font-medium">{v}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card className="mt-4">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4" /> Workload by Assignee</CardTitle></CardHeader>
              <CardContent>
                {Object.entries(stats.byAssignee).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-sm">{name}</span>
                    <span className="text-sm font-medium">{count} task{count !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}