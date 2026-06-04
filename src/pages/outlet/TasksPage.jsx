import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  CheckSquare, Plus, Home, Package, ShoppingCart, FileText,
  Users, Calendar, BarChart2, Shield, Layers, Building2,
  CheckCircle2, Clock, AlertCircle
} from 'lucide-react';

const NAV = [
  { type: 'section', label: 'Outlet' },
  { href: '/outlet', icon: Home, label: 'Dashboard' },
  { href: '/outlet/inventory', icon: Package, label: 'Inventory' },
  { href: '/outlet/procurement', icon: ShoppingCart, label: 'Purchase Orders' },
  { href: '/outlet/sales', icon: FileText, label: 'Sales & Reconciliation' },
  { type: 'section', label: 'Team' },
  { href: '/outlet/workforce', icon: Users, label: 'My Team' },
  { href: '/outlet/scheduling', icon: Calendar, label: 'Shift Schedule' },
  { href: '/outlet/tasks', icon: CheckSquare, label: 'Tasks' },
  { type: 'section', label: 'Reports' },
  { href: '/outlet/reports', icon: BarChart2, label: 'Reports' },
  { href: '/outlet/compliance', icon: Shield, label: 'Compliance' },
  { type: 'section', label: 'Navigation' },
  { href: '/company', icon: Building2, label: 'Company Dashboard' },
  { href: '/leader-org', icon: Layers, label: 'OrbitanOS Console' },
];

const EMPLOYEES = ['Ahmad Rizal', 'Siti Nora', 'Hafiz Rahman', 'Priya Kumar'];
const PRIORITY_COLORS = { low: 'bg-secondary text-muted-foreground', medium: 'bg-orbitan-blue-light text-orbitan-blue', high: 'bg-orbitan-amber-light text-orbitan-amber', urgent: 'bg-orbitan-red-light text-orbitan-red' };

const DEMO_TASKS = [
  { id: 't1', title: 'Morning prep checklist completion', priority: 'high', status: 'completed', assigned_to_name: 'Ahmad Rizal', due_date: new Date().toISOString().split('T')[0], module_context: 'operations' },
  { id: 't2', title: 'Food safety temperature log', priority: 'urgent', status: 'in_progress', assigned_to_name: 'Siti Nora', due_date: new Date().toISOString().split('T')[0], module_context: 'compliance' },
  { id: 't3', title: 'Inventory stock count', priority: 'medium', status: 'pending', assigned_to_name: 'Hafiz Rahman', due_date: new Date().toISOString().split('T')[0], module_context: 'inventory' },
  { id: 't4', title: 'End-of-day deep clean', priority: 'medium', status: 'pending', assigned_to_name: 'Priya Kumar', due_date: new Date().toISOString().split('T')[0], module_context: 'operations' },
  { id: 't5', title: 'Weekly supplier order review', priority: 'low', status: 'pending', assigned_to_name: 'Ahmad Rizal', due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], module_context: 'procurement' },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState(DEMO_TASKS);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState('all');
  const [newTask, setNewTask] = useState({ title: '', priority: 'medium', assigned_to_name: '', due_date: new Date().toISOString().split('T')[0] });

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);
  const counts = { pending: tasks.filter(t => t.status === 'pending').length, in_progress: tasks.filter(t => t.status === 'in_progress').length, completed: tasks.filter(t => t.status === 'completed').length };

  const handleAdd = async () => {
    const task = { ...newTask, id: 't' + Date.now(), status: 'pending', tenant_id: 'tenant_taqueria', outlet_id: 'outlet_nb' };
    const created = await base44.entities.Task.create(task);
    setTasks(prev => [created, ...prev]);
    setShowAdd(false);
    setNewTask({ title: '', priority: 'medium', assigned_to_name: '', due_date: new Date().toISOString().split('T')[0] });
  };

  const updateStatus = (id, status) => setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));

  return (
    <AppShell navigation={NAV} title="">
      <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
        <PageHeader
          title="Tasks"
          subtitle={`${counts.pending} pending · ${counts.in_progress} in progress · ${counts.completed} completed`}
          actions={
            <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4" />
              Add Task
            </Button>
          }
        />

        {/* Filter tabs */}
        <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
          {[
            { key: 'all', label: 'All Tasks' },
            { key: 'pending', label: `Pending (${counts.pending})` },
            { key: 'in_progress', label: `In Progress (${counts.in_progress})` },
            { key: 'completed', label: `Completed (${counts.completed})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${filter === tab.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filtered.map(task => (
            <div key={task.id} className="bg-card border border-border rounded-xl px-5 py-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
              <button
                onClick={() => updateStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${task.status === 'completed' ? 'bg-orbitan-green border-orbitan-green' : 'border-border hover:border-orbitan-green'}`}
              >
                {task.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {task.assigned_to_name && <span className="text-xs text-muted-foreground">{task.assigned_to_name}</span>}
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{task.due_date}</span>
                  {task.module_context && (
                    <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">{task.module_context}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
                <StatusBadge status={task.status} />
              </div>
            </div>
          ))}
          {filtered.length === 0 && <EmptyState icon={CheckSquare} title="No tasks" description="Add your first task to get started." action={() => setShowAdd(true)} actionLabel="Add Task" />}
        </div>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs mb-1 block">Task Title</Label>
              <Input value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Complete morning prep" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Assign To</Label>
                <Select value={newTask.assigned_to_name} onValueChange={v => setNewTask(p => ({ ...p, assigned_to_name: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{EMPLOYEES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Priority</Label>
                <Select value={newTask.priority} onValueChange={v => setNewTask(p => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Due Date</Label>
              <Input type="date" value={newTask.due_date} onChange={e => setNewTask(p => ({ ...p, due_date: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!newTask.title}>Add Task</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}