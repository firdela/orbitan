import React from 'react';
import { Card } from '@/components/ui/card';
import CSHealthBadge, { HEALTH_TIERS } from './CSHealthBadge';
import EmptyState from '@/components/shared/EmptyState';
import { Heart, Activity, TrendingUp, LifeBuoy, ClipboardCheck, Users, Package, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const FACTOR_META = [
  { key: 'adoption', label: 'Feature Adoption', icon: TrendingUp, weight: '25%' },
  { key: 'activity', label: 'Login Frequency', icon: Activity, weight: '20%' },
  { key: 'support', label: 'Support Tickets', icon: LifeBuoy, weight: '15%' },
  { key: 'compliance', label: 'Compliance Completion', icon: ClipboardCheck, weight: '15%' },
  { key: 'workforce', label: 'Workforce Engagement', icon: Users, weight: '10%' },
  { key: 'inventory', label: 'Inventory Activity', icon: Package, weight: '7.5%' },
  { key: 'ai_usage', label: 'AI Usage', icon: Sparkles, weight: '7.5%' },
];

// Section 4 — Health Score: composite breakdown per tenant
export default function CSHealthScore({ customers, onSelectCustomer, selectedId }) {
  const sorted = [...customers].sort((a, b) => a.health - b.health);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Tier legend */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3"><Heart className="w-4 h-4 text-orbitan-purple" /><h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Health Tiers</h3></div>
        <div className="grid grid-cols-5 gap-2">
          {Object.entries(HEALTH_TIERS).map(([tier, cfg]) => {
            const range = { excellent: '85-100', healthy: '70-84', monitor: '50-69', at_risk: '25-49', critical: '0-24' }[tier];
            return (
              <div key={tier} className={cn('rounded-lg border px-2 py-2 text-center', cfg.classes)}>
                <p className="text-[10px] font-semibold uppercase">{cfg.label}</p><p className="text-[9px] opacity-70">{range}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {customers.length === 0 ? <EmptyState icon={Heart} title="No health data" description="No customers to score." color="purple" /> : (
        <div className="space-y-3">
          {sorted.map(c => {
            const isActive = selectedId === c.tenant_id;
            return (
              <Card key={c.tenant_id} onClick={() => onSelectCustomer?.(c)}
                className={cn('p-4 cursor-pointer transition-all', isActive && 'ring-2 ring-primary')} role="button" tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectCustomer?.(c); } }}>
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="min-w-0"><h3 className="font-heading font-semibold text-sm truncate">{c.name}</h3><p className="text-xs text-muted-foreground">{c.industry?.replace(/_/g, ' ')}</p></div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-2xl font-display font-bold tabular-nums">{c.health}<span className="text-sm text-muted-foreground">/100</span></span>
                    <CSHealthBadge tier={c.health_tier} />
                  </div>
                </div>
                {/* Factor bars */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                  {FACTOR_META.map(f => {
                    const val = c.health_factors?.[f.key] ?? 0;
                    const Icon = f.icon;
                    return (
                      <div key={f.key} className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-[10px] mb-0.5"><span className="text-muted-foreground truncate">{f.label}</span><span className="font-medium tabular-nums">{Math.round(val)}</span></div>
                          <div className="h-1 rounded-full bg-muted overflow-hidden"><div className={cn('h-full rounded-full', val >= 70 ? 'bg-orbitan-green' : val >= 40 ? 'bg-orbitan-amber' : 'bg-orbitan-red')} style={{ width: `${val}%` }} /></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}