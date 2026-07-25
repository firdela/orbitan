import React from 'react';
import StatCard from '@/components/shared/StatCard';
import { Card } from '@/components/ui/card';
import CSHealthBadge, { HEALTH_TIERS } from './CSHealthBadge';
import EmptyState from '@/components/shared/EmptyState';
import { Heart, Users, AlertTriangle, ClipboardCheck, LifeBuoy, Flag, TrendingUp, RefreshCw, CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils';

// Section 1 — Executive Dashboard: portfolio rollup KPIs + tier distribution + at-risk + renewals
export default function CSExecutiveDashboard({ rollup, customers, onSelectCustomer }) {
  if (!rollup) return null;
  const atRisk = customers.filter(c => c.health_tier === 'at_risk' || c.health_tier === 'critical');
  const renewalsDue = customers.filter(c => c.renewal_status === 'due_soon' || c.renewal_status === 'overdue');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Customer Health" value={`${rollup.avg_health}/100`} icon={Heart} color="purple"
          subtitle={`${rollup.total_customers} customers`} />
        <StatCard title="Active Customers" value={rollup.active_customers} icon={Users} color="blue"
          subtitle={`${rollup.total_converted} converted to paid`} />
        <StatCard title="At-Risk Customers" value={rollup.at_risk_customers} icon={AlertTriangle} color="red"
          subtitle="Need immediate follow-up" />
        <StatCard title="Onboarding Progress" value={`${rollup.avg_onboarding}%`} icon={ClipboardCheck} color="amber"
          subtitle="Avg across portfolio" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Open Support Cases" value={rollup.total_open_support} icon={LifeBuoy} color="amber"
          subtitle={`${rollup.total_escalations} escalations`} />
        <StatCard title="Upcoming Milestones" value={rollup.upcoming_milestones} icon={Flag} color="blue"
          subtitle="Pending across tenants" />
        <StatCard title="Product Adoption" value={`${rollup.avg_adoption_score}%`} icon={TrendingUp} color="green"
          subtitle="Avg module adoption" />
        <StatCard title="Renewal Status" value={rollup.renewals.overdue + rollup.renewals.due_soon} icon={CalendarClock} color="red"
          subtitle={`${rollup.renewals.overdue} overdue · ${rollup.renewals.due_soon} due soon`} />
      </div>

      {/* Health tier distribution */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Health Distribution</h3>
        <div className="grid grid-cols-5 gap-3">
          {Object.entries(HEALTH_TIERS).map(([tier, cfg]) => {
            const count = rollup.tiers[tier] || 0;
            const pct = rollup.total_customers ? Math.round((count / rollup.total_customers) * 100) : 0;
            return (
              <div key={tier} className={cn('rounded-lg border p-3 text-center', cfg.classes)}>
                <p className="text-2xl font-display font-bold tabular-nums">{count}</p>
                <p className="text-[10px] uppercase tracking-wider mt-0.5">{cfg.label}</p>
                <p className="text-[10px] opacity-70">{pct}%</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* At-risk + renewals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3"><AlertTriangle className="w-4 h-4 text-orbitan-red" /><h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">At-Risk Customers</h3></div>
          {atRisk.length === 0 ? <EmptyState icon={Heart} title="No at-risk customers" description="All customers are healthy or monitoring." size="sm" color="green" /> :
            <div className="space-y-2">{atRisk.map(c => (
              <button key={c.tenant_id} onClick={() => onSelectCustomer?.(c)} className="w-full flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-left hover:bg-muted/50 transition-colors">
                <div className="min-w-0"><p className="text-sm font-medium truncate">{c.name}</p><p className="text-xs text-muted-foreground">{c.industry} · {c.plan}</p></div>
                <CSHealthBadge tier={c.health_tier} score={c.health} />
              </button>
            ))}</div>}
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3"><CalendarClock className="w-4 h-4 text-orbitan-amber" /><h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Renewal Follow-ups</h3></div>
          {renewalsDue.length === 0 ? <EmptyState icon={RefreshCw} title="No renewals due" description="No trials or renewals due in the next 14 days." size="sm" color="green" /> :
            <div className="space-y-2">{renewalsDue.map(c => (
              <button key={c.tenant_id} onClick={() => onSelectCustomer?.(c)} className="w-full flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-left hover:bg-muted/50 transition-colors">
                <div className="min-w-0"><p className="text-sm font-medium truncate">{c.name}</p><p className="text-xs text-muted-foreground">{c.renewal_status === 'overdue' ? 'Overdue' : `Due in ${Math.abs(c.renewal_days)}d`}</p></div>
                <span className={cn('text-xs font-medium', c.renewal_status === 'overdue' ? 'text-orbitan-red' : 'text-orbitan-amber')}>{c.renewal_date || '—'}</span>
              </button>
            ))}</div>}
        </Card>
      </div>
    </div>
  );
}