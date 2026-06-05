import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import StatusBadge from '@/components/shared/StatusBadge';
import TenantSwitcher from '@/components/shared/TenantSwitcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, AlertTriangle, CheckCircle2, Clock, Shield, FileCheck, AlertCircle, Loader2, X, TrendingUp, Search, Filter } from 'lucide-react';
import { T1_NAV, T1_TENANT } from '@/lib/tenant-nav';
import { format, differenceInDays } from 'date-fns';

const T1_TENANT_ID = 'taqueria_pte_ltd';
const T1_OUTLET_ID = 'taqueria_pte_ltd_main';

const CATEGORY_CONFIG = {
  food_safety:   { color: 'bg-amber-50 text-amber-700 border-amber-200',   dot: 'bg-amber-500',   label: 'Food Safety' },
  licensing:     { color: 'bg-blue-50 text-blue-700 border-blue-200',      dot: 'bg-blue-500',    label: 'Licensing' },
  fire_safety:   { color: 'bg-red-50 text-red-700 border-red-200',         dot: 'bg-red-500',     label: 'Fire Safety' },
  hr:            { color: 'bg-purple-50 text-purple-700 border-purple-200',dot: 'bg-purple-500',  label: 'HR' },
  environmental: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Environmental' },
  financial:     { color: 'bg-indigo-50 text-indigo-700 border-indigo-200',dot: 'bg-indigo-500',  label: 'Financial' },
  other:         { color: 'bg-secondary text-muted-foreground border-border', dot: 'bg-muted-foreground', label: 'Other' },
};

const STATUS_PRIORITY = { overdue: 0, pending: 1, in_review: 2, submitted: 3, approved: 4, rejected: 5 };

function DaysChip({ dueDate, status }) {
  if (!dueDate || status === 'approved') return null;
  const days = differenceInDays(new Date(dueDate), new Date());
  if (status === 'overdue' || days < 0) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">Overdue</span>;
  if (days === 0) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">Due Today</span>;
  if (days <= 7) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">{days}d left</span>;
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">{days}d left</span>;
}

export default function FnBCompliance() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [newRecord, setNewRecord] = useState({ title: '', type: '', due_date: '', category: 'food_safety' });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['compliance', T1_TENANT_ID],
    queryFn: () => base44.entities.ComplianceRecord.filter({ tenant_id: T1_TENANT_ID }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ComplianceRecord.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['compliance', T1_TENANT_ID]),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ComplianceRecord.create({ ...data, tenant_id: T1_TENANT_ID, outlet_id: T1_OUTLET_ID }),
    onSuccess: () => { queryClient.invalidateQueries(['compliance', T1_TENANT_ID]); setShowAdd(false); setNewRecord({ title: '', type: '', due_date: '', category: 'food_safety' }); },
  });

  const sorted = [...records].sort((a, b) => (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9));
  const filtered = sorted.filter(r => {
    const matchFilter = filter === 'all' || r.status === filter || r.category === filter;
    const matchSearch = !search || r.title?.toLowerCase().includes(search.toLowerCase()) || r.type?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const overdueCount = records.filter(r => r.status === 'overdue').length;
  const pendingCount = records.filter(r => r.status === 'pending' || r.status === 'in_review' || r.status === 'submitted').length;
  const approvedCount = records.filter(r => r.status === 'approved').length;
  const total = records.length;
  const healthScore = total > 0 ? Math.round((approvedCount / total) * 100) : 0;

  return (
    <AppShell navigation={T1_NAV} tenant={T1_TENANT} title="" headerRight={<TenantSwitcher />}>
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Hero Header — Orbitan Shield™ */}
        <div className="relative overflow-hidden rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 15% 50%, #7C3AED 0%, transparent 45%), radial-gradient(circle at 85% 30%, #2563EB 0%, transparent 40%)' }} />
          <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-purple-300" />
                </div>
                <span className="text-purple-300 text-xs font-semibold uppercase tracking-widest">Orbitan Shield™ · Regulate</span>
              </div>
              <h1 className="text-2xl font-display font-bold">Compliance Centre</h1>
              <p className="text-white/60 text-sm mt-1">La Birria Tacos · North Bridge Rd · F&B Pack</p>
            </div>
            <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white border-0 flex-shrink-0">
              <Plus className="w-4 h-4" /> New Record
            </Button>
          </div>

          {/* Health Score + Stats */}
          <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            <div className="col-span-2 sm:col-span-1 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <p className="text-[10px] text-white/60 uppercase tracking-wider mb-1">Compliance Score</p>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-display font-bold text-white">{healthScore}<span className="text-lg text-white/60">%</span></p>
                <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full mb-1 ${healthScore >= 80 ? 'bg-emerald-500/20 text-emerald-300' : healthScore >= 60 ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'}`}>
                  {healthScore >= 80 ? '✓ GOOD' : healthScore >= 60 ? '⚠ FAIR' : '✗ RISK'}
                </div>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-white/10"><div className="h-1.5 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 transition-all" style={{ width: `${healthScore}%` }} /></div>
            </div>
            {[
              { label: 'Overdue', value: overdueCount, color: 'text-red-300', icon: AlertCircle },
              { label: 'In Progress', value: pendingCount, color: 'text-amber-300', icon: Clock },
              { label: 'Approved', value: approvedCount, color: 'text-emerald-300', icon: CheckCircle2 },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <div className="flex items-center gap-1.5 mb-1"><Icon className={`w-3.5 h-3.5 ${color}`} /><span className="text-[10px] text-white/60 uppercase tracking-wider">{label}</span></div>
                <p className={`text-2xl font-display font-bold ${color}`}>{isLoading ? '–' : value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Critical Alert */}
        {overdueCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800">{overdueCount} overdue compliance item{overdueCount > 1 ? 's' : ''} — Immediate action required</p>
              <p className="text-xs text-red-600 mt-0.5">Unresolved overdue items may result in regulatory penalties and financial write-offs.</p>
            </div>
          </div>
        )}

        {/* Filters + Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search records..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['all', 'overdue', 'pending', 'approved', 'food_safety', 'fire_safety', 'licensing', 'hr'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${filter === f ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-card border border-border text-muted-foreground hover:text-foreground'}`}>
                {f.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Records */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Loading compliance records...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-card border border-border rounded-2xl">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-foreground">No records found</p>
            <p className="text-sm text-muted-foreground mt-1">All clear — or try a different filter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => {
              const cat = CATEGORY_CONFIG[r.category] || CATEGORY_CONFIG.other;
              const isOverdue = r.status === 'overdue';
              return (
                <div key={r.id} onClick={() => setSelected(r)}
                  className={`bg-card border rounded-xl p-5 cursor-pointer hover:shadow-md transition-all group ${isOverdue ? 'border-red-200 bg-red-50/30' : 'border-border hover:border-primary/30'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-1 h-full min-h-[2.5rem] rounded-full flex-shrink-0 ${cat.dot}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="font-heading font-semibold text-foreground group-hover:text-primary transition-colors">{r.title}</h4>
                          <StatusBadge status={r.status} />
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${cat.color}`}>{cat.label}</span>
                          <DaysChip dueDate={r.due_date} status={r.status} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {r.type} · Due: <span className={isOverdue ? 'text-red-600 font-semibold' : 'text-foreground'}>{r.due_date || '—'}</span>
                          {r.submitted_by && ` · Submitted by ${r.submitted_by}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      {(r.status === 'overdue') && (
                        <Button size="sm" variant="outline" className="text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => updateMutation.mutate({ id: r.id, data: { status: 'in_review' } })}>Take Action</Button>
                      )}
                      {r.status === 'pending' && (
                        <Button size="sm" className="text-xs" onClick={() => updateMutation.mutate({ id: r.id, data: { status: 'submitted', submitted_date: new Date().toISOString().split('T')[0] } })}>Submit</Button>
                      )}
                      {r.status === 'submitted' && (
                        <Button size="sm" variant="outline" className="text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => updateMutation.mutate({ id: r.id, data: { status: 'approved' } })}>Approve ✓</Button>
                      )}
                      {r.status === 'in_review' && (
                        <Button size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => updateMutation.mutate({ id: r.id, data: { status: 'submitted' } })}>Submit for Review</Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Detail Modal */}
        {selected && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-border">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <StatusBadge status={selected.status} />
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${(CATEGORY_CONFIG[selected.category] || CATEGORY_CONFIG.other).color}`}>
                        {(CATEGORY_CONFIG[selected.category] || CATEGORY_CONFIG.other).label}
                      </span>
                    </div>
                    <h3 className="font-heading font-bold text-lg">{selected.title}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{selected.type}</p>
                  </div>
                  <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="p-6 space-y-3">
                {[
                  { label: 'Due Date', value: selected.due_date || '—' },
                  { label: 'Submitted Date', value: selected.submitted_date || 'Not yet submitted' },
                  { label: 'Submitted By', value: selected.submitted_by || '—' },
                  { label: 'Notes', value: selected.notes || '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between py-2 border-b border-border/50 last:border-0 text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-foreground">{value}</span>
                  </div>
                ))}
              </div>
              <div className="px-6 pb-6"><Button className="w-full" onClick={() => setSelected(null)}>Close</Button></div>
            </div>
          </div>
        )}

        {/* Add Record Modal */}
        {showAdd && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <div><h3 className="font-heading font-bold text-lg">New Compliance Record</h3><p className="text-xs text-muted-foreground">Orbitan Shield™ · Regulate</p></div>
                <button onClick={() => setShowAdd(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-3">
                <div><label className="text-xs font-medium text-muted-foreground">Title *</label><Input value={newRecord.title} onChange={e => setNewRecord({ ...newRecord, title: e.target.value })} className="mt-1" placeholder="e.g. Monthly HACCP Checklist" /></div>
                <div><label className="text-xs font-medium text-muted-foreground">Type *</label><Input value={newRecord.type} onChange={e => setNewRecord({ ...newRecord, type: e.target.value })} className="mt-1" placeholder="e.g. Food Safety Audit" /></div>
                <div><label className="text-xs font-medium text-muted-foreground">Category</label>
                  <select value={newRecord.category} onChange={e => setNewRecord({ ...newRecord, category: e.target.value })} className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring">
                    <option value="food_safety">Food Safety</option><option value="licensing">Licensing</option><option value="fire_safety">Fire Safety</option>
                    <option value="hr">HR</option><option value="environmental">Environmental</option><option value="financial">Financial</option>
                  </select>
                </div>
                <div><label className="text-xs font-medium text-muted-foreground">Due Date</label><Input type="date" value={newRecord.due_date} onChange={e => setNewRecord({ ...newRecord, due_date: e.target.value })} className="mt-1" /></div>
              </div>
              <div className="flex gap-3 mt-5">
                <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button className="flex-1 gap-2 bg-purple-600 hover:bg-purple-700" onClick={() => createMutation.mutate(newRecord)} disabled={createMutation.isPending || !newRecord.title || !newRecord.type}>
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Save Record
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}