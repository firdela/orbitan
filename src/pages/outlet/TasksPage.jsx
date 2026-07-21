import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTenant } from '@/lib/use-tenant';
import { useGlobalOutlet } from '@/lib/GlobalOutletContext';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Plus, CheckSquare } from 'lucide-react';
import TaskCard from '@/components/tasks/TaskCard';
import TaskCreateDialog from '@/components/tasks/TaskCreateDialog';
import TaskDetailSheet from '@/components/tasks/TaskDetailSheet';
import { TASK_STATUS_LABELS } from '@/components/tasks/TaskStatusConfig';

export default function TasksPage() {
  const { currentTenant } = useTenant();
  const { activeOutlet } = useGlobalOutlet();
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState('all');
  const [selectedTask, setSelectedTask] = useState(null);

  const tenantId = currentTenant?.id;
  const outletId = activeOutlet?.id || null;

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    const taskFilter = outletId ? { tenant_id: tenantId, outlet_id: outletId } : { tenant_id: tenantId };
    Promise.all([
      base44.entities.Task.filter(taskFilter, '-updated_date', 200),
      base44.entities.Employee.filter({ tenant_id: tenantId }, '-created_date', 100),
    ])
      .then(([taskData, empData]) => {
        setTasks(taskData || []);
        setEmployees(empData || []);
      })
      .catch(() => { setTasks([]); setEmployees([]); })
      .finally(() => setLoading(false));
  }, [tenantId, outletId]);

  const statusOrder = ['draft', 'assigned', 'acknowledged', 'in_progress', 'blocked', 'submitted_for_review', 'changes_required', 'completed', 'verified', 'cancelled', 'archived'];

  const counts = statusOrder.reduce((acc, s) => {
    acc[s] = tasks.filter(t => t.status === s).length;
    return acc;
  }, {});

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  const handleCreated = (task) => {
    setTasks(prev => [task, ...prev]);
  };

  const handleTransitioned = (updated) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? { ...updated } : t));
    setSelectedTask(updated);
  };

  const filterTabs = [
    { key: 'all', label: `All (${tasks.length})` },
    ...statusOrder.filter(s => counts[s] > 0).map(s => ({ key: s, label: `${TASK_STATUS_LABELS[s]} (${counts[s]})` })),
  ];

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
        <PageHeader
          title="Tasks"
          subtitle={`${counts.assigned || 0} assigned · ${counts.in_progress || 0} in progress · ${counts.submitted_for_review || 0} awaiting review · ${counts.verified || 0} verified`}
          actions={
            <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4" /> Add Task
            </Button>
          }
        />

        <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${filter === tab.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted/50 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(task => (
              <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
            ))}
            {filtered.length === 0 && (
              <EmptyState
                icon={CheckSquare}
                title="No tasks"
                description={filter === 'all' ? "Create your first task to start tracking work." : "No tasks in this state."}
                actionLabel="Add Task"
                onAction={() => setShowAdd(true)}
              />
            )}
          </div>
        )}
      </div>

      <TaskCreateDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        employees={employees}
        tenantId={tenantId}
        outletId={outletId}
        onCreated={handleCreated}
      />

      <TaskDetailSheet
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={(o) => { if (!o) setSelectedTask(null); }}
        onTransitioned={handleTransitioned}
      />
    </>
  );
}