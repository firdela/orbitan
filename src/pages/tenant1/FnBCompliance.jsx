import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Package, ShoppingCart, FileText, Users, CheckSquare,
  Shield, BarChart2, Link2, Calendar, Plus, AlertTriangle,
  CheckCircle2, Clock, Utensils
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
];

const DEMO_RECORDS = [
  { id: 'c1', title: 'SFA Food Safety Audit', type: 'Food Safety Audit', category: 'food_safety', status: 'approved', due_date: '2026-06-15', submitted_date: '2026-06-01', submitted_by: 'Firdaus' },
  { id: 'c2', title: 'Monthly HACCP Checklist', type: 'HACCP Review', category: 'food_safety', status: 'submitted', due_date: '2026-06-30', submitted_date: '2026-06-03', submitted_by: 'Roster Manager' },
  { id: 'c3', title: 'NEA Hygiene License Renewal', type: 'License Renewal', category: 'licensing', status: 'in_review', due_date: '2026-07-01', submitted_date: null, submitted_by: null },
  { id: 'c4', title: 'Fire Extinguisher Inspection', type: 'Fire Safety', category: 'fire_safety', status: 'overdue', due_date: '2026-05-31', submitted_date: null, submitted_by: null },
  { id: 'c5', title: 'Food Handler Health Declaration', type: 'HR Compliance', category: 'hr', status: 'pending', due_date: '2026-06-20', submitted_date: null, submitted_by: null },
  { id: 'c6', title: 'Monthly Temperature Log Review', type: 'Food Safety', category: 'food_safety', status: 'approved', due_date: '2026-06-10', submitted_date: '2026-06-04', submitted_by: 'Outlet Manager' },
];

const CATEGORY_COLORS = {
  food_safety: 'bg-orbitan-amber-light text-orbitan-amber',
  licensing: 'bg-orbitan-blue-light text-orbitan-blue',
  fire_safety: 'bg-orbitan-red-light text-orbitan-red',
  hr: 'bg-orbitan-purple-light text-orbitan-purple',
  environmental: 'bg-orbitan-green-light text-orbitan-green',
};

export default function FnBCompliance() {
  const [records, setRecords] = useState(DEMO_RECORDS);
  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [newRecord, setNewRecord] = useState({ title: '', type: '', due_date: '', category: 'food_safety' });

  const filtered = records.filter(r => filter === 'all' || r.status === filter || r.category === filter);

  function submitRecord(id) {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status: 'submitted', submitted_date: new Date().toISOString().split('T')[0] } : r));
  }

  function takeAction(id) {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status: 'in_review' } : r));
  }

  function addRecord() {
    if (!newRecord.title || !newRecord.type) return;
    setRecords(prev => [...prev, { ...newRecord, id: `c${Date.now()}`, status: 'pending', submitted_date: null, submitted_by: null }]);
    setShowAdd(false);
    setNewRecord({ title: '', type: '', due_date: '', category: 'food_safety' });
  }

  const overdueCount = records.filter(r => r.status === 'overdue').length;
  const pendingCount = records.filter(r => r.status === 'pending' || r.status === 'in_review').length;
  const approvedCount = records.filter(r => r.status === 'approved').length;

  return (
    <AppShell navigation={NAV} title="Compliance — La Birria Tacos">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Compliance & Food Safety"
          subtitle="La Birria Tacos · North Bridge Rd · F&B Pack"
          actions={
            <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4" /> New Record
            </Button>
          }
        />

        {/* Alerts */}
        {overdueCount > 0 && (
          <div className="bg-orbitan-red-light border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orbitan-red flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">{overdueCount} overdue compliance item{overdueCount > 1 ? 's' : ''}</p>
              <p className="text-xs text-muted-foreground">Immediate action required to remain compliant.</p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-orbitan-red-light border border-red-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-display font-bold text-orbitan-red">{overdueCount}</p>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </div>
          <div className="bg-orbitan-amber-light border border-amber-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-display font-bold text-orbitan-amber">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </div>
          <div className="bg-orbitan-green-light border border-green-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-display font-bold text-orbitan-green">{approvedCount}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap gap-2">
          {['all', 'overdue', 'pending', 'food_safety', 'licensing', 'fire_safety', 'hr'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Records */}
        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="font-heading font-semibold text-foreground">{r.title}</h4>
                    <StatusBadge status={r.status} />
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[r.category] || 'bg-secondary text-muted-foreground'}`}>
                      {r.category.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Type: {r.type} · Due: <span className={r.status === 'overdue' ? 'text-orbitan-red font-semibold' : 'text-foreground'}>{r.due_date}</span>
                    {r.submitted_by && ` · Submitted by: ${r.submitted_by}`}
                  </p>
                </div>
                {r.status === 'overdue' && (
                  <Button size="sm" variant="outline" className="text-xs text-orbitan-red border-orbitan-red flex-shrink-0" onClick={() => takeAction(r.id)}>Take Action</Button>
                )}
                {r.status === 'pending' && (
                  <Button size="sm" className="text-xs flex-shrink-0" onClick={() => submitRecord(r.id)}>Submit</Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {showAdd && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-bold text-lg">New Compliance Record</h3>
                <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
              <div className="space-y-3">
                <div><label className="text-xs font-medium text-muted-foreground">Title</label><Input value={newRecord.title} onChange={e => setNewRecord({ ...newRecord, title: e.target.value })} className="mt-1" placeholder="e.g. Monthly HACCP Checklist" /></div>
                <div><label className="text-xs font-medium text-muted-foreground">Type</label><Input value={newRecord.type} onChange={e => setNewRecord({ ...newRecord, type: e.target.value })} className="mt-1" placeholder="e.g. Food Safety Audit" /></div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Category</label>
                  <select value={newRecord.category} onChange={e => setNewRecord({ ...newRecord, category: e.target.value })} className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring">
                    <option value="food_safety">Food Safety</option>
                    <option value="licensing">Licensing</option>
                    <option value="fire_safety">Fire Safety</option>
                    <option value="hr">HR</option>
                    <option value="environmental">Environmental</option>
                    <option value="financial">Financial</option>
                  </select>
                </div>
                <div><label className="text-xs font-medium text-muted-foreground">Due Date</label><Input type="date" value={newRecord.due_date} onChange={e => setNewRecord({ ...newRecord, due_date: e.target.value })} className="mt-1" /></div>
              </div>
              <div className="flex gap-3 mt-5">
                <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button className="flex-1" onClick={addRecord}>Save Record</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}