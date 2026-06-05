import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/shared/PageHeader';
import TenantSwitcher from '@/components/shared/TenantSwitcher';
import { Button } from '@/components/ui/button';
import { Plus, CheckCircle2, AlertTriangle, Clock, XCircle, FileText, AlertCircle } from 'lucide-react';
import { T2_NAV, T2_TENANT } from '@/lib/tenant-nav';

const DEMO_RECORDS = [
  { id: 'c1', title: 'NEA Waste Collector Licence Renewal', type: 'Licensing', category: 'licensing', status: 'pending', due_date: '2026-07-01', submitted_by: null },
  { id: 'c2', title: 'Monthly Hazardous Waste Disposal Report', type: 'Environmental', category: 'environmental', status: 'submitted', due_date: '2026-06-07', submitted_by: 'Hamka Bin Yusof' },
  { id: 'c3', title: 'Vehicle Safety Inspection (SG1234A)', type: 'Safety', category: 'other', status: 'approved', due_date: '2026-05-30', submitted_by: 'Ahmad Fadzli' },
  { id: 'c4', title: 'Worker PPE Compliance Audit', type: 'HR', category: 'hr', status: 'in_review', due_date: '2026-06-10', submitted_by: 'Hamka Bin Yusof' },
  { id: 'c5', title: 'Q2 Sustainability Impact Report', type: 'Environmental', category: 'environmental', status: 'pending', due_date: '2026-06-30', submitted_by: null },
  { id: 'c6', title: 'Fire Safety Certificate (Warehouse)', type: 'Fire Safety', category: 'fire_safety', status: 'approved', due_date: '2026-04-15', submitted_by: 'Ahmad Fadzli' },
  { id: 'c7', title: 'E-Waste Handler Registration (NEA)', type: 'Licensing', category: 'licensing', status: 'overdue', due_date: '2026-05-20', submitted_by: null },
];

const STATUS_MAP = {
  pending:    { label: 'Pending',    icon: Clock,          bg: 'bg-muted',     color: 'text-muted-foreground', border: 'border-border' },
  in_review:  { label: 'In Review',  icon: AlertCircle,    bg: 'bg-blue-50',   color: 'text-blue-700',         border: 'border-blue-200' },
  submitted:  { label: 'Submitted',  icon: FileText,       bg: 'bg-purple-50', color: 'text-purple-700',       border: 'border-purple-200' },
  approved:   { label: 'Approved',   icon: CheckCircle2,   bg: 'bg-[#F0FDF4]', color: 'text-[#16A34A]',        border: 'border-green-200' },
  rejected:   { label: 'Rejected',   icon: XCircle,        bg: 'bg-red-50',    color: 'text-red-600',          border: 'border-red-200' },
  overdue:    { label: 'Overdue',    icon: AlertTriangle,  bg: 'bg-red-50',    color: 'text-red-600',          border: 'border-red-200' },
};

const CAT_COLORS = {
  environmental: 'bg-[#F0FDF4] text-[#16A34A]',
  licensing:     'bg-blue-50 text-blue-700',
  hr:            'bg-purple-50 text-purple-700',
  fire_safety:   'bg-amber-50 text-amber-700',
  other:         'bg-muted text-muted-foreground',
};

export default function T2Compliance() {
  const [filterStatus, setFilterStatus] = useState('all');

  const filtered = DEMO_RECORDS.filter(r => filterStatus === 'all' || r.status === filterStatus);
  const overdueCount = DEMO_RECORDS.filter(r => r.status === 'overdue').length;
  const pendingCount = DEMO_RECORDS.filter(r => r.status === 'pending').length;

  return (
    <AppShell navigation={T2_NAV} tenant={T2_TENANT} title="" headerRight={<TenantSwitcher />}>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
        <PageHeader
          title="Compliance"
          subtitle="Renewed Resources Pte Ltd · Regulatory & audit tracking"
          actions={
            <Button size="sm" className="gap-2" style={{ background: '#16A34A' }}>
              <Plus className="w-3.5 h-3.5" /> New Record
            </Button>
          }
        />

        {/* Alert Banner */}
        {overdueCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm font-medium text-red-700">
              {overdueCount} compliance item{overdueCount > 1 ? 's are' : ' is'} overdue and require immediate attention.
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Records', value: DEMO_RECORDS.length, color: 'text-foreground', bg: 'bg-card border-border' },
            { label: 'Overdue', value: overdueCount, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
            { label: 'Pending', value: pendingCount, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
            { label: 'Approved', value: DEMO_RECORDS.filter(r => r.status === 'approved').length, color: 'text-[#16A34A]', bg: 'bg-[#F0FDF4] border-green-200' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
              <p className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'overdue', 'pending', 'in_review', 'submitted', 'approved'].map(f => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all capitalize ${filterStatus === f ? 'bg-[#16A34A] text-white border-[#16A34A]' : 'bg-card text-muted-foreground border-border hover:border-[#16A34A]/50'}`}
            >
              {f === 'all' ? 'All' : STATUS_MAP[f]?.label || f}
            </button>
          ))}
        </div>

        {/* Records */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.map(rec => {
              const sc = STATUS_MAP[rec.status] || STATUS_MAP.pending;
              const StatusIcon = sc.icon;
              return (
                <div key={rec.id} className="px-5 py-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <StatusIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${sc.color}`} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{rec.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${CAT_COLORS[rec.category] || 'bg-muted text-muted-foreground'}`}>
                          {rec.type}
                        </span>
                        <span className="text-xs text-muted-foreground">Due {rec.due_date}</span>
                        {rec.submitted_by && <span className="text-xs text-muted-foreground">· {rec.submitted_by}</span>}
                      </div>
                    </div>
                  </div>
                  <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${sc.bg} ${sc.color} ${sc.border}`}>
                    {sc.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}