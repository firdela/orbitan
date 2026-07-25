import React from 'react';
import { Card } from '@/components/ui/card';
import EmptyState from '@/components/shared/EmptyState';
import { Package, ShoppingCart, Factory, CalendarClock, ListTodo, Users, CheckCircle2, Sparkles, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const MODULE_META = [
  { key: 'inventory', label: 'Inventory', icon: Package },
  { key: 'sales', label: 'Sales', icon: ShoppingCart },
  { key: 'production', label: 'Production', icon: Factory },
  { key: 'scheduling', label: 'Shifts', icon: CalendarClock },
  { key: 'tasks', label: 'Tasks', icon: ListTodo },
  { key: 'workforce', label: 'Employees', icon: Users },
  { key: 'reconciliation', label: 'Reconciles', icon: CheckCircle2 },
  { key: 'nexus', label: 'Nexus', icon: Sparkles },
];

// Section 5 — Product Adoption: module adoption + DAU/WAU + per-tenant usage
export default function CSProductAdoption({ customers }) {
  // Aggregate module adoption across portfolio
  const moduleCounts = MODULE_META.map(m => {
    const count = customers.filter(c => c.adoption.module_flags?.[m.key]).length;
    return { ...m, count, pct: customers.length ? Math.round((count / customers.length) * 100) : 0 };
  });
  const totalDau = customers.filter(c => c.dau).length;
  const totalWau = customers.filter(c => c.wau).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* DAU/WAU */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5"><div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-orbitan-green" /><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Daily Active Users (proxy)</span></div><p className="text-2xl font-display font-bold">{totalDau}</p><p className="text-xs text-muted-foreground mt-0.5">{customers.length ? Math.round((totalDau / customers.length) * 100) : 0}% of tenants</p></Card>
        <Card className="p-5"><div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-orbitan-blue" /><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Weekly Active Users (proxy)</span></div><p className="text-2xl font-display font-bold">{totalWau}</p><p className="text-xs text-muted-foreground mt-0.5">{customers.length ? Math.round((totalWau / customers.length) * 100) : 0}% of tenants</p></Card>
      </div>

      {/* Portfolio module adoption */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Module Adoption Across Portfolio</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {moduleCounts.map(m => {
            const Icon = m.icon;
            return (
              <div key={m.key} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 mb-2"><Icon className={cn('w-3.5 h-3.5', m.count > 0 ? 'text-orbitan-blue' : 'text-muted-foreground')} /><span className="text-xs font-medium truncate">{m.label}</span></div>
                <p className="text-lg font-display font-bold tabular-nums">{m.count}<span className="text-xs text-muted-foreground">/{customers.length}</span></p>
                <div className="h-1 rounded-full bg-muted overflow-hidden mt-1"><div className="h-full bg-orbitan-blue" style={{ width: `${m.pct}%` }} /></div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Per-tenant adoption */}
      {customers.length === 0 ? <EmptyState icon={TrendingUp} title="No adoption data" description="No customers to analyse." color="blue" /> : (
        <Card className="p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Per-Tenant Module Usage</h3>
          <div className="space-y-2">
            {customers.map(c => (
              <div key={c.tenant_id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <span className="text-sm font-medium w-32 sm:w-48 truncate flex-shrink-0">{c.name}</span>
                <div className="flex flex-wrap gap-1 flex-1">
                  {MODULE_META.map(m => {
                    const active = c.adoption.module_flags?.[m.key];
                    const Icon = m.icon;
                    return (
                      <span key={m.key} title={m.label} className={cn('inline-flex items-center justify-center w-6 h-6 rounded', active ? 'bg-orbitan-blue-light text-orbitan-blue' : 'bg-muted text-muted-foreground/40')}>
                        <Icon className="w-3 h-3" />
                      </span>
                    );
                  })}
                </div>
                <span className="text-xs font-semibold tabular-nums flex-shrink-0">{c.adoption.modules_used}/8</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}