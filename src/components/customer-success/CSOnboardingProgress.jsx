import React from 'react';
import { Card } from '@/components/ui/card';
import EmptyState from '@/components/shared/EmptyState';
import CSHealthBadge from './CSHealthBadge';
import { ClipboardCheck, AlertTriangle, CheckCircle2, Clock, UserCog } from 'lucide-react';
import { cn } from '@/lib/utils';

// Section 3 — Onboarding Progress: portfolio-wide outstanding setup tasks + per-tenant checklist
export default function CSOnboardingProgress({ customers, onSelectCustomer }) {
  const withTasks = customers.filter(c => c.outstanding_setup_tasks.length > 0);
  const totalOutstanding = customers.reduce((s, c) => s + c.outstanding_setup_tasks.length, 0);
  const pendingSignoffs = customers.filter(c => c.checklist && !c.checklist.tenant_admin_signoff);
  const avgPct = customers.length ? Math.round(customers.reduce((s, c) => s + c.onboarding_pct, 0) / customers.length) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Rollup stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4"><div className="flex items-center gap-2 mb-1"><Clock className="w-3.5 h-3.5 text-orbitan-blue" /><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg Progress</span></div><p className="text-xl font-display font-bold">{avgPct}%</p></Card>
        <Card className="p-4"><div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-3.5 h-3.5 text-orbitan-amber" /><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Outstanding Tasks</span></div><p className="text-xl font-display font-bold">{totalOutstanding}</p></Card>
        <Card className="p-4"><div className="flex items-center gap-2 mb-1"><UserCog className="w-3.5 h-3.5 text-orbitan-amber" /><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Pending Sign-offs</span></div><p className="text-xl font-display font-bold">{pendingSignoffs.length}</p></Card>
        <Card className="p-4"><div className="flex items-center gap-2 mb-1"><CheckCircle2 className="w-3.5 h-3.5 text-orbitan-green" /><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Onboarded</span></div><p className="text-xl font-display font-bold">{customers.filter(c => c.outstanding_setup_tasks.length === 0).length}</p></Card>
      </div>

      {withTasks.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="All customers onboarded" description="No outstanding setup tasks across the portfolio." color="green" size="large" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {withTasks.map(c => (
            <Card key={c.tenant_id} className="p-4">
              <button onClick={() => onSelectCustomer?.(c)} className="w-full flex items-center justify-between gap-3 mb-3 text-left">
                <div className="min-w-0"><h3 className="font-heading font-semibold text-sm truncate">{c.name}</h3><p className="text-xs text-muted-foreground">{c.onboarding_pct}% complete</p></div>
                <CSHealthBadge tier={c.health_tier} score={c.health} />
              </button>
              {/* Progress bar */}
              <div className="w-full h-1.5 rounded-full bg-muted mb-3 overflow-hidden">
                <div className="h-full bg-orbitan-blue transition-all" style={{ width: `${c.onboarding_pct}%` }} />
              </div>
              <div className="space-y-1.5">
                {c.outstanding_setup_tasks.map((task, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="w-3.5 h-3.5 text-orbitan-amber flex-shrink-0" />
                    <span>{task}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}