import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import CSHealthBadge from './CSHealthBadge';
import EmptyState from '@/components/shared/EmptyState';
import StatusBadge from '@/components/shared/StatusBadge';
import { Search, Users, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// Section 2 — Customer Overview: searchable list of all customers with key attributes
export default function CSCustomerOverview({ customers, onSelectCustomer, selectedId }) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter(c => c.name?.toLowerCase().includes(q) || c.contact_email?.toLowerCase().includes(q) || c.industry?.toLowerCase().includes(q));
  }, [customers, search]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, contact, or industry…" className="pl-9" aria-label="Search customers" />
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No customers found" description="No tenants match your search filter." color="blue" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(c => (
            <Card key={c.tenant_id} onClick={() => onSelectCustomer?.(c)}
              className={cn('p-4 card-elevated cursor-pointer transition-all', selectedId === c.tenant_id && 'ring-2 ring-primary')}
              role="button" tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectCustomer?.(c); } }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('w-2 h-2 rounded-full flex-shrink-0', tierDot(c.health_tier))} />
                    <h3 className="font-heading font-semibold text-sm truncate">{c.name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">{c.industry?.replace(/_/g, ' ')} · {c.plan?.replace('orbitan_', '')}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <CSHealthBadge tier={c.health_tier} score={c.health} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-3 text-xs text-muted-foreground">
                <span>CSM: <span className="text-foreground font-medium">{c.csm_name}</span></span>
                <span>Last activity: <span className="text-foreground">{c.last_activity_days == null ? '—' : `${c.last_activity_days}d ago`}</span></span>
                <span>Renewal: <span className="text-foreground">{c.renewal_date || '—'}</span></span>
                <span>Status: <StatusBadge status={c.status} size="sm" /></span>
              </div>
              <div className="flex items-center justify-between mt-3 text-[10px] text-muted-foreground">
                <span>{c.adoption.modules_used}/8 modules · {c.onboarding_pct}% onboard</span>
                <span className="flex items-center text-orbitan-blue">View details <ChevronRight className="w-3 h-3" /></span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function tierDot(tier) {
  const map = { excellent: 'bg-orbitan-green', healthy: 'bg-emerald-500', monitor: 'bg-orbitan-amber', at_risk: 'bg-orange-500', critical: 'bg-orbitan-red' };
  return map[tier] || 'bg-muted-foreground';
}