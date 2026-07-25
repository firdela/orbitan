import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { LifeBuoy, AlertTriangle, Clock, CheckCircle2, TrendingUp } from 'lucide-react';

// Section 8 — Support Overview: portfolio-wide ticket summary + resolution metrics + recent issues
export default function CSSupportOverview({ customers, onSelectCustomer }) {
  const stats = useMemo(() => {
    let open = 0, escalations = 0, total = 0;
    for (const c of customers) {
      open += c.feedback.open;
      escalations += c.feedback.escalations;
      total += c.feedback.total;
    }
    return { open, escalations, total };
  }, [customers]);

  const avgResolution = customers.length ? customers.filter(c => c.feedback.avg_resolution_days != null).reduce((s, c) => s + c.feedback.avg_resolution_days, 0) / Math.max(1, customers.filter(c => c.feedback.avg_resolution_days != null).length) : 0;
  const highVolumeTenants = customers.filter(c => c.feedback.open >= 3).sort((a, b) => b.feedback.open - a.feedback.open);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4"><div className="flex items-center gap-2 mb-1"><LifeBuoy className="w-3.5 h-3.5 text-orbitan-amber" /><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Open Cases</span></div><p className="text-xl font-display font-bold">{stats.open}</p></Card>
        <Card className="p-4"><div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-3.5 h-3.5 text-orbitan-red" /><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Escalations</span></div><p className="text-xl font-display font-bold">{stats.escalations}</p></Card>
        <Card className="p-4"><div className="flex items-center gap-2 mb-1"><Clock className="w-3.5 h-3.5 text-orbitan-blue" /><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg Resolution</span></div><p className="text-xl font-display font-bold">{avgResolution ? `${avgResolution}d` : '—'}</p></Card>
        <Card className="p-4"><div className="flex items-center gap-2 mb-1"><TrendingUp className="w-3.5 h-3.5 text-orbitan-purple" /><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Feedback</span></div><p className="text-xl font-display font-bold">{stats.total}</p></Card>
      </div>

      {/* High-volume tenants */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3"><AlertTriangle className="w-4 h-4 text-orbitan-red" /><h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">High-Volume Support Tenants</h3></div>
        {highVolumeTenants.length === 0 ? <EmptyState icon={CheckCircle2} title="No high-volume tenants" description="All tenants have fewer than 3 open support cases." size="sm" color="green" /> : (
          <div className="space-y-2">
            {highVolumeTenants.map(c => (
              <button key={c.tenant_id} onClick={() => onSelectCustomer?.(c)} className="w-full flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 hover:bg-muted/50 transition-colors text-left">
                <div className="min-w-0"><p className="text-sm font-medium truncate">{c.name}</p><p className="text-xs text-muted-foreground">{c.feedback.open} open · {c.feedback.support_tickets} tickets · {c.feedback.escalations} escalations</p></div>
                <StatusBadge status={c.feedback.escalations > 0 ? 'critical' : 'medium'} size="sm" />
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}