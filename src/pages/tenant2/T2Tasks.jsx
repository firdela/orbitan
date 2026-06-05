import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import TenantSwitcher from '@/components/shared/TenantSwitcher';
import { Button } from '@/components/ui/button';
import { Plus, CheckCircle2, Clock, AlertCircle, Circle, X, User, Calendar } from 'lucide-react';
import { T2_NAV, T2_TENANT } from '@/lib/tenant-nav';

const DEMO_TASKS = [
  { id: 't1', title: 'Complete CapitaLand HQ collection report', assigned_to_name: 'Ahmad Fadzli', priority: 'high', status: 'in_progress', due_date: '2026-06-04', category: 'Collections', module: 'Operations', notes: 'Awaiting weight certificate from facility' },
  { id: 't2', title: 'Weigh and log e-waste batch from NUS', assigned_to_name: 'Siti Rahimah', priority: 'high', status: 'pending', due_date: '2026-06-04', category: 'Processing', module: 'Inventory', notes: '42kg batch pending measurement at Secure Bay D' },
  { id: 't3', title: 'Update aluminium stock levels after dispatch', assigned_to_name: 'Nurul Atikah', priority: 'medium', status: 'pending', due_date: '2026-06-05', category: 'Inventory', module: 'Inventory', notes: '' },
  { id: 't4', title: 'Schedule next week collection routes', assigned_to_name: 'Hamka Bin Yusof', priority: 'medium', status: 'pending', due_date: '2026-06-06', category: 'Operations', module: 'Scheduling', notes: 'Coordinate with EcoFleet Transport' },
  { id: 't5', title: 'Submit monthly environmental compliance report', assigned_to_name: 'Hamka Bin Yusof', priority: 'urgent', status: 'in_progress', due_date: '2026-06-07', category: 'Compliance', module: 'Compliance', notes: 'NEA submission deadline — cannot miss' },
  { id: 't6', title: 'Vehicle inspection — truck SG1234A', assigned_to_name: 'Benny Tan', priority: 'low', status: 'completed', due_date: '2026-06-03', category: 'Operations', module: 'Maintenance', notes: 'Passed inspection. Certificate filed.' },
  { id: 't7', title: 'Sort and grade textile batch from Raffles Hotel', assigned_to_name: 'Siti Rahimah', priority: 'medium', status: 'completed', due_date: '2026-06-03', category: 'Processing', module: 'Inventory', notes: '380kg sorted and shelved at Bay F1' },
  { id: 't8', title: 'Copper wire scrap — arrange smelter pickup', assigned_to_name: 'Ahmad Fadzli', priority: 'high', status: 'pending', due_date: '2026-06-08', category: 'Collections', module: 'Procurement', notes: 'High value batch — 18kg at Secure Bay E' },
];

const PRIORITY_MAP = {
  urgent: { label: 'Urgent', bg: 'bg-red-50', color: 'text-red-600', border: 'border-red-200', dot: 'bg-red-500' },
  high:   { label: 'High',   bg: 'bg-amber-50', color: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  medium: { label: 'Medium', bg: 'bg-blue-50', color: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  low:    { label: 'Low',    bg: 'bg-muted', color: 'text-muted-foreground', border: 'border-border', dot: 'bg-muted-foreground' },
};

const STATUS_MAP = {
  pending:     { label: 'Pending',     icon: Circle,       color: 'text-muted-foreground', bg: 'bg-muted' },
  in_progress: { label: 'In Progress', icon: Clock,        color: 'text-blue-600', bg: 'bg-blue-50' },
  completed:   { label: 'Completed',   icon: CheckCircle2, color: 'text-[#16A34A]', bg: 'bg-[#F0FDF4]' },
  overdue:     { label: 'Overdue',     icon: AlertCircle,  color: 'text-red-500', bg: 'bg-red-50' },
};

const CAT_COLORS = {
  Collections: 'bg-green-50 text-green-700',
  Processing: 'bg-blue-50 text-blue-700',
  Inventory: 'bg-amber-50 text-amber-700',
  Operations: 'bg-slate-100 text-slate-700',
  Compliance: 'bg-red-50 text-red-700',
  Scheduling: 'bg-purple-50 text-purple-700',
  Procurement: 'bg-indigo-50 text-indigo-700',
  Maintenance: 'bg-orange-50 text-orange-700',
};

export default function T2Tasks() {
  const [filter, setFilter] = useState('active');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');

  const categories = [...new Set(DEMO_TASKS.map(t => t.category))];

  const filtered = DEMO_TASKS.filter(t => {
    const matchFilter = filter === 'active' ? t.status !== 'completed' : filter === 'completed' ? t.status === 'completed' : true;
    const matchCat = filterCategory === 'all' || t.category === filterCategory;
    return matchFilter && matchCat;
  });

  const urgentCount = DEMO_TASKS.filter(t => t.priority === 'urgent' && t.status !== 'completed').length;

  return (
    <AppShell navigation={T2_NAV} tenant={T2_TENANT} title="" headerRight={<TenantSwitcher />}>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
        <PageHeader
          title="Tasks"
          subtitle="Renewed Resources Pte Ltd · Operational assignments & follow-ups"
          actions={
            <Button size="sm" className="gap-2" style={{ background: '#16A34A' }} onClick={() => setShowNew(true)}>
              <Plus className="w-3.5 h-3.5" /> New Task
            </Button>
          }
        />

        {urgentCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm font-medium text-red-700">{urgentCount} urgent task{urgentCount > 1 ? 's' : ''} require immediate attention.</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Tasks', value: DEMO_TASKS.length, color: 'text-foreground', bg: 'bg-card border-border' },
            { label: 'In Progress', value: DEMO_TASKS.filter(t => t.status === 'in_progress').length, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
            { label: 'Urgent', value: DEMO_TASKS.filter(t => t.priority === 'urgent').length, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
            { label: 'Completed', value: DEMO_TASKS.filter(t => t.status === 'completed').length, color: 'text-[#16A34A]', bg: 'bg-[#F0FDF4] border-green-200' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
              <p className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1 bg-muted rounded-xl p-1">
            {[{ id: 'active', label: 'Active' }, { id: 'completed', label: 'Completed' }, { id: 'all', label: 'All' }].map(tab => (
              <button key={tab.id} onClick={() => setFilter(tab.id)}
                className={`flex-1 sm:flex-none text-sm font-medium px-4 py-2 rounded-lg transition-all ${filter === tab.id ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {tab.label}
              </button>
            ))}
          </div>
          <select className="px-3 py-2 text-sm border border-border rounded-lg bg-background" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Task list */}
        <div className="space-y-2">
          {filtered.map(task => {
            const sc = STATUS_MAP[task.status] || STATUS_MAP.pending;
            const pc = PRIORITY_MAP[task.priority] || PRIORITY_MAP.medium;
            const StatusIcon = sc.icon;
            return (
              <div key={task.id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 hover:shadow-sm transition-shadow cursor-pointer" onClick={() => setSelectedTask(task)}>
                <StatusIcon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${sc.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className={`text-sm font-medium leading-snug ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {task.title}
                    </p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 whitespace-nowrap ${pc.bg} ${pc.color} ${pc.border}`}>
                      {pc.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${CAT_COLORS[task.category] || 'bg-muted text-muted-foreground'}`}>{task.category}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" />{task.assigned_to_name}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />Due {task.due_date}</span>
                  </div>
                  {task.notes && <p className="text-xs text-muted-foreground mt-1.5 italic">{task.notes}</p>}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-[#16A34A] opacity-40" />
              <p className="text-sm">No tasks matching this filter.</p>
            </div>
          )}
        </div>
      </div>

      {/* Task Detail Drawer */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={() => setSelectedTask(null)}>
          <div className="bg-white w-full max-w-sm h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <p className="font-heading font-semibold text-foreground">Task Detail</p>
              <button onClick={() => setSelectedTask(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm font-semibold text-foreground leading-snug">{selectedTask.title}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${PRIORITY_MAP[selectedTask.priority]?.bg} ${PRIORITY_MAP[selectedTask.priority]?.color} ${PRIORITY_MAP[selectedTask.priority]?.border}`}>{PRIORITY_MAP[selectedTask.priority]?.label}</span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_MAP[selectedTask.status]?.bg} ${STATUS_MAP[selectedTask.status]?.color}`}>{STATUS_MAP[selectedTask.status]?.label}</span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${CAT_COLORS[selectedTask.category] || 'bg-muted text-muted-foreground'}`}>{selectedTask.category}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground"><User className="w-4 h-4" /><span>Assigned to <span className="font-medium text-foreground">{selectedTask.assigned_to_name}</span></span></div>
                <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="w-4 h-4" /><span>Due <span className="font-medium text-foreground">{selectedTask.due_date}</span></span></div>
              </div>
              {selectedTask.notes && (
                <div className="bg-muted/50 rounded-xl p-4">
                  <p className="text-xs font-medium text-foreground mb-1">Notes</p>
                  <p className="text-sm text-muted-foreground">{selectedTask.notes}</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1">Reassign</Button>
                <Button size="sm" className="flex-1" style={{ background: '#16A34A' }}>Mark Complete</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Task Modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <p className="font-heading font-semibold">Create New Task</p>
              <button onClick={() => setShowNew(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {[
                { label: 'Task Title', type: 'text', placeholder: 'What needs to be done?' },
                { label: 'Assigned To', type: 'text', placeholder: 'Staff member name' },
                { label: 'Due Date', type: 'date' },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-xs font-medium text-foreground mb-1">{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Priority</label>
                  <select className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background">
                    {Object.entries(PRIORITY_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Category</label>
                  <select className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background">
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Notes</label>
                <textarea rows={2} placeholder="Additional context..." className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-border">
              <Button variant="outline" className="flex-1" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button className="flex-1" style={{ background: '#16A34A' }} onClick={() => setShowNew(false)}>Create Task</Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}