import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import EmptyState from '@/components/shared/EmptyState';
import { Flag, CheckCircle2, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const MILESTONE_LABELS = {
  go_live: 'Go-Live Completed',
  first_sale: 'First Sale Recorded',
  first_production: 'First Production Batch',
  first_reconciliation: 'First Daily Reconciliation',
  nexus_insight: 'First Orbit Nexus Insight',
  training_published: 'First Training Module Published',
  compliance_achieved: 'Compliance Sign-off Complete',
  converted_to_paid: 'Converted to Paid Subscription',
  first_successful_month: 'First Successful Month',
};

// Section 10 — Milestones: portfolio-wide milestone tracker
export default function CSMilestones({ customers, onSelectCustomer }) {
  const stats = useMemo(() => {
    const m = {};
    for (const c of customers) for (const ms of c.milestones) (m[ms.key] = m[ms.key] || { achieved: 0, total: 0 }).total++, ms.achieved && m[ms.key].achieved++;
    return m;
  }, [customers]);

  const upcoming = useMemo(() => {
    const list = [];
    for (const c of customers) for (const ms of c.milestones) if (!ms.achieved) list.push({ tenant_id: c.tenant_id, tenant_name: c.name, milestone: ms });
    return list;
  }, [customers]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Milestone completion grid */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4"><Flag className="w-4 h-4 text-orbitan-blue" /><h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Milestone Completion</h3></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(MILESTONE_LABELS).map(([key, label]) => {
            const s = stats[key] || { achieved: 0, total: 0 };
            const pct = s.total ? Math.round((s.achieved / s.total) * 100) : 0;
            return (
              <div key={key} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2 mb-1"><span className="text-xs font-medium truncate">{label}</span><span className="text-xs font-semibold tabular-nums">{s.achieved}/{s.total}</span></div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className={cn('h-full', pct === 100 ? 'bg-orbitan-green' : pct > 0 ? 'bg-orbitan-blue' : 'bg-muted')} style={{ width: `${pct}%` }} /></div>
                <p className="text-[10px] text-muted-foreground mt-1">{pct}% achieved</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Upcoming milestones */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Upcoming Milestones ({upcoming.length})</h3>
        {upcoming.length === 0 ? <EmptyState icon={CheckCircle2} title="All milestones achieved" description="Every customer has completed all success milestones." size="sm" color="green" /> : (
          <div className="space-y-1.5">
            {upcoming.map((u, i) => (
              <button key={i} onClick={() => onSelectCustomer?.({ tenant_id: u.tenant_id, name: u.tenant_name })}
                className="w-full flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 hover:bg-muted/50 transition-colors text-left">
                <div className="flex items-center gap-2 min-w-0"><Flag className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" /><span className="text-sm font-medium truncate">{u.tenant_name}</span></div>
                <span className="text-xs text-muted-foreground truncate">{u.milestone.label}</span>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}