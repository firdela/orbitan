import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Package, ShoppingCart, FileText, Users, CheckSquare,
  Shield, BarChart2, Link2, Calendar, Plus, Utensils,
  X, CheckCircle2, Clock, AlertTriangle, Circle
} from 'lucide-react';

const NAV = [
  { type: 'section', label: 'F&B Operations' },
  { href: '/t1/dashboard', icon: Utensils, label: 'Dashboard' },
  { href: '/t1/inventory', icon: Package, label: 'Inventory' },
  { href: '/t1/procurement', icon: ShoppingCart, label: 'Procurement' },
  { href: '/t1/sales', icon: FileText, label: 'Sales & Invoicing' },
  { href: '/t1/scheduling', icon: Calendar, label: 'Scheduling' },
  { type: 'section', label: 'People & Tasks' },
  { href: '/t1/workforce', icon: Users, label: 'Workforce' },
  { href: '/t1/tasks', icon: CheckSquare, label: 'Tasks' },
  { type: 'section', label: 'Governance' },
  { href: '/t1/compliance', icon: Shield, label: 'Compliance' },
  { href: '/t1/reporting', icon: BarChart2, label: 'Reporting' },
  { href: '/t1/xero', icon: Link2, label: 'Xero Integration' },
  { type: 'section', label: 'Platform' },
  { href: '/leader-org', icon: BarChart2, label: '← Platform Console' },
];

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', classes: 'bg-orbitan-red-light text-orbitan-red' },
  high: { label: 'High', classes: 'bg-orbitan-amber-light text-orbitan-amber' },
  medium: { label: 'Medium', classes: 'bg-orbitan-blue-light text-orbitan-blue' },
  low: { label: 'Low', classes: 'bg-secondary text-muted-foreground' },
};

const INIT_TASKS = [
  { id: 't1', title: 'Receive beef delivery from SG Meat Co.', description: 'Check quality, weigh and log into inventory', category: 'Procurement', priority: 'urgent', status: 'pending', due_date: '2026-06-04', assigned_to_name: 'Ahmad Fauzi', module_context: 'procurement' },
  { id: 't2', title: 'Complete monthly HACCP log', description: 'Fill temperature records for June audit', category: 'Compliance', priority: 'high', status: 'in_progress', due_date: '2026-06-10', assigned_to_name: 'Sarah Lim', module_context: 'compliance' },
  { id: 't3', title: 'Submit daily cash reconciliation', description: 'Tally POS cash vs system and submit', category: 'Finance', priority: 'high', status: 'pending', due_date: '2026-06-04', assigned_to_name: 'Nurul Ain', module_context: 'sales' },
  { id: 't4', title: 'Reorder tortillas — stock critical', description: 'Raise PO for at least 20 packs from Pan Asian', category: 'Inventory', priority: 'urgent', status: 'pending', due_date: '2026-06-04', assigned_to_name: 'Ahmad Fauzi', module_context: 'inventory' },
  { id: 't5', title: 'Brief new service crew on SOP', description: 'Cover food handling and customer service protocols', category: 'HR', priority: 'medium', status: 'pending', due_date: '2026-06-06', assigned_to_name: 'Sarah Lim', module_context: 'workforce' },
  { id: 't6', title: 'Check fire extinguisher expiry', description: 'Overdue — schedule re-certification immediately', category: 'Compliance', priority: 'urgent', status: 'overdue', due_date: '2026-05-31', assigned_to_name: 'Ahmad Fauzi', module_context: 'compliance' },
  { id: 't7', title: 'Update supplier contact — DairySG', description: 'New contact person is Wei Lin, update CRM', category: 'Procurement', priority: 'low', status: 'completed', due_date: '2026-06-02', assigned_to_name: 'James Tan', module_context: 'procurement' },
];

export default function FnBTasks() {
  const [tasks, setTasks] = useState(INIT_TASKS);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', category: 'Operations', priority: 'medium', due_date: new Date().toISOString().split('T')[0], assigned_to_name: '' });

  const filtered = tasks.filter(t => {
    const statusMatch = filterStatus === 'all' || t.status === filterStatus;
    const priorityMatch = filterPriority === 'all' || t.priority === filterPriority;
    return statusMatch && priorityMatch;
  });

  const counts = {
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    overdue: tasks.filter(t => t.status === 'overdue').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  function markComplete(id) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'completed', completed_date: new Date().toISOString().split('T')[0] } : t));
    setSelected(prev => prev ? { ...prev, status: 'completed' } : prev);
  }

  function markInProgress(id) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'in_progress' } : t));
    setSelected(prev => prev ? { ...prev, status: 'in_progress' } : prev);
  }

  function addTask() {
    if (!newTask.title) return;
    setTasks(prev => [...prev, { ...newTask, id: `t${Date.now()}`, status: 'pending' }]);
    setShowAdd(false);
    setNewTask({ title: '', description: '', category: 'Operations', priority: 'medium', due_date: new Date().toISOString().split('T')[0], assigned_to_name: '' });
  }

  return (
    <AppShell navigation={NAV} title="Tasks — La Birria Tacos">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Operational Tasks"
          subtitle="La Birria Tacos · North Bridge Rd · Task Module"
          actions={
            <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4" /> New Task
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-orbitan-amber-light border border-amber-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-display font-bold text-orbitan-amber">{counts.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div className="bg-orbitan-purple-light border border-purple-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-display font-bold text-orbitan-purple">{counts.in_progress}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </div>
          <div className="bg-orbitan-red-light border border-red-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-display font-bold text-orbitan-red">{counts.overdue}</p>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </div>
          <div className="bg-orbitan-green-light border border-green-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-display font-bold text-orbitan-green">{counts.completed}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {['all', 'pending', 'in_progress', 'overdue', 'completed'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${filterStatus === s ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {['all', 'urgent', 'high', 'medium', 'low'].map(p => (
              <button key={p} onClick={() => setFilterPriority(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${filterPriority === p ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-2">
          {filtered.map(task => (
            <button
              key={task.id}
              onClick={() => setSelected(task)}
              className={`w-full bg-card border rounded-xl p-4 text-left hover:shadow-md transition-all group ${
                task.status === 'overdue' ? 'border-orbitan-red/40 bg-orbitan-red-light/20' :
                task.status === 'completed' ? 'border-border opacity-60' : 'border-border hover:border-primary/30'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 flex-shrink-0">
                    {task.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-orbitan-green" /> :
                     task.status === 'overdue' ? <AlertTriangle className="w-4 h-4 text-orbitan-red" /> :
                     task.status === 'in_progress' ? <Clock className="w-4 h-4 text-orbitan-purple" /> :
                     <Circle className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0">
                    <p className={`font-medium text-sm ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground group-hover:text-primary transition-colors'}`}>
                      {task.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{task.assigned_to_name} · Due {task.due_date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PRIORITY_CONFIG[task.priority]?.classes}`}>
                    {PRIORITY_CONFIG[task.priority]?.label}
                  </span>
                  <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{task.category}</span>
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <CheckSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No tasks match your filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Task Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-lg">Task Details</h3>
              <button onClick={() => setSelected(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-2 text-sm mb-4">
              <div><p className="text-muted-foreground text-xs mb-1">Title</p><p className="font-semibold text-foreground">{selected.title}</p></div>
              {selected.description && <div><p className="text-muted-foreground text-xs mb-1">Description</p><p className="text-foreground">{selected.description}</p></div>}
              <div className="flex justify-between pt-1"><span className="text-muted-foreground">Assigned To</span><span className="font-medium">{selected.assigned_to_name || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Due Date</span><span className={selected.status === 'overdue' ? 'text-orbitan-red font-semibold' : ''}>{selected.due_date}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Priority</span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${PRIORITY_CONFIG[selected.priority]?.classes}`}>
                  {PRIORITY_CONFIG[selected.priority]?.label}
                </span>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><StatusBadge status={selected.status} /></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span>{selected.category}</span></div>
            </div>
            <div className="flex gap-2">
              {(selected.status === 'pending' || selected.status === 'overdue') && (
                <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => markInProgress(selected.id)}>
                  Start Task
                </Button>
              )}
              {selected.status !== 'completed' && (
                <Button size="sm" className="flex-1 text-xs gap-1" onClick={() => markComplete(selected.id)}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Mark Complete
                </Button>
              )}
              {selected.status === 'completed' && (
                <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => setSelected(null)}>Close</Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-lg">New Task</h3>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-xs font-medium text-muted-foreground">Task Title</label><Input value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} className="mt-1" placeholder="e.g. Reorder beef stock" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Description</label><Input value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} className="mt-1" placeholder="Optional details..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Priority</label>
                  <select value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })} className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring">
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div><label className="text-xs font-medium text-muted-foreground">Due Date</label><Input type="date" value={newTask.due_date} onChange={e => setNewTask({ ...newTask, due_date: e.target.value })} className="mt-1" /></div>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Assign To</label><Input value={newTask.assigned_to_name} onChange={e => setNewTask({ ...newTask, assigned_to_name: e.target.value })} className="mt-1" placeholder="e.g. Ahmad Fauzi" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Category</label><Input value={newTask.category} onChange={e => setNewTask({ ...newTask, category: e.target.value })} className="mt-1" placeholder="e.g. Inventory, Compliance..." /></div>
            </div>
            <div className="flex gap-3 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button className="flex-1" onClick={addTask}>Create Task</Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}