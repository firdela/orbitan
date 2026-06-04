import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Recycle, Package, ShoppingCart, CheckSquare, Shield,
  BarChart2, Users, Leaf, Plus, CheckCircle2, Clock, AlertCircle, Circle
} from 'lucide-react';

const NAV = [
  { type: 'section', label: 'Sustainability Ops' },
  { href: '/t2/dashboard', icon: Leaf, label: 'Dashboard' },
  { href: '/t2/collections', icon: Recycle, label: 'Collections' },
  { href: '/t2/inventory', icon: Package, label: 'Recovered Materials' },
  { href: '/t2/procurement', icon: ShoppingCart, label: 'Procurement' },
  { type: 'section', label: 'People & Tasks' },
  { href: '/t2/workforce', icon: Users, label: 'Workforce' },
  { href: '/t2/tasks', icon: CheckSquare, label: 'Tasks' },
  { type: 'section', label: 'Governance' },
  { href: '/t2/compliance', icon: Shield, label: 'Compliance' },
  { href: '/t2/reporting', icon: BarChart2, label: 'Reporting' },
];

const DEMO_TASKS = [
  { id: 't1', title: 'Complete CapitaLand HQ collection report', assigned_to_name: 'Ahmad Fadzli', priority: 'high', status: 'in_progress', due_date: '2026-06-04', category: 'Collections' },
  { id: 't2', title: 'Weigh and log e-waste batch from NUS', assigned_to_name: 'Siti Rahimah', priority: 'high', status: 'pending', due_date: '2026-06-04', category: 'Processing' },
  { id: 't3', title: 'Update aluminium stock levels after dispatch', assigned_to_name: 'Nurul Atikah', priority: 'medium', status: 'pending', due_date: '2026-06-05', category: 'Inventory' },
  { id: 't4', title: 'Schedule next week collection routes', assigned_to_name: 'Hamka Bin Yusof', priority: 'medium', status: 'pending', due_date: '2026-06-06', category: 'Operations' },
  { id: 't5', title: 'Submit monthly environmental compliance report', assigned_to_name: 'Hamka Bin Yusof', priority: 'urgent', status: 'in_progress', due_date: '2026-06-07', category: 'Compliance' },
  { id: 't6', title: 'Vehicle inspection — truck SG1234A', assigned_to_name: 'Benny Tan', priority: 'low', status: 'completed', due_date: '2026-06-03', category: 'Operations' },
  { id: 't7', title: 'Sort and grade textile batch from Raffles Hotel', assigned_to_name: 'Siti Rahimah', priority: 'medium', status: 'completed', due_date: '2026-06-03', category: 'Processing' },
];

const PRIORITY_MAP = {
  urgent: { label: 'Urgent', bg: 'bg-red-50', color: 'text-red-600', border: 'border-red-200' },
  high:   { label: 'High',   bg: 'bg-amber-50', color: 'text-amber-700', border: 'border-amber-200' },
  medium: { label: 'Medium', bg: 'bg-blue-50',  color: 'text-blue-700',  border: 'border-blue-200' },
  low:    { label: 'Low',    bg: 'bg-muted',    color: 'text-muted-foreground', border: 'border-border' },
};

const STATUS_MAP = {
  pending:     { label: 'Pending',     icon: Circle,        color: 'text-muted-foreground' },
  in_progress: { label: 'In Progress', icon: Clock,         color: 'text-blue-600' },
  completed:   { label: 'Completed',   icon: CheckCircle2,  color: 'text-[#16A34A]' },
  overdue:     { label: 'Overdue',     icon: AlertCircle,   color: 'text-red-500' },
};

export default function T2Tasks() {
  const [filter, setFilter] = useState('active');

  const filtered = DEMO_TASKS.filter(t => {
    if (filter === 'active') return t.status !== 'completed';
    if (filter === 'completed') return t.status === 'completed';
    return true;
  });

  return (
    <AppShell navigation={NAV} title="Tasks — Renewed Resources">
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
        <PageHeader
          title="Tasks"
          subtitle="Renewed Resources Pte Ltd · Operational assignments"
          actions={
            <Button size="sm" className="gap-2" style={{ background: '#16A34A' }}>
              <Plus className="w-3.5 h-3.5" /> New Task
            </Button>
          }
        />

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

        {/* Filter tabs */}
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          {[{ id: 'active', label: 'Active' }, { id: 'completed', label: 'Completed' }, { id: 'all', label: 'All Tasks' }].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`flex-1 text-sm font-medium py-2 rounded-lg transition-all ${filter === tab.id ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tasks */}
        <div className="space-y-2">
          {filtered.map(task => {
            const sc = STATUS_MAP[task.status] || STATUS_MAP.pending;
            const pc = PRIORITY_MAP[task.priority] || PRIORITY_MAP.medium;
            const StatusIcon = sc.icon;
            return (
              <div key={task.id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 hover:shadow-sm transition-shadow">
                <StatusIcon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${sc.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {task.title}
                    </p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${pc.bg} ${pc.color} ${pc.border}`}>
                      {pc.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{task.assigned_to_name}</span>
                    <span>·</span>
                    <span>{task.category}</span>
                    <span>·</span>
                    <span>Due {task.due_date}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}