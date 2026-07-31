// Operational Health Dashboard — system/transaction/inventory/finance/audit health (Build #16, Part 1).
import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import BackBar from '@/components/shared/BackBar';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Activity, TrendingUp, Package, Database, ShieldCheck, AlertOctagon, Server } from 'lucide-react';

function Stat({ label, value, sub, color }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-display font-bold mt-1 ${color || 'text-foreground'}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function OperationalHealthDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await base44.functions.invoke('pilotDiagnostics', { action: 'diagnostics' });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setData(d);
    } catch (err) {
      setError(err.message || 'Diagnostics unavailable (requires platform admin)');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (error) return <div className="p-8"><div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">{error}</div></div>;
  if (!data) return null;

  const sh = data.system_health || {};
  const th = data.transaction_health || {};
  const ih = data.inventory_health || {};
  const fs = data.finance_sync_status || {};
  const ai = data.audit_integrity || {};

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <BackBar to="/leader-org" label="Back to Platform Console" />
      <PageHeader
        title="Operational Health"
        subtitle={sh.scoped ? `Tenant: ${sh.tenant_name || '—'}` : 'Platform-wide operational health · live from real data'}
        actions={<Button size="sm" variant="outline" onClick={load} disabled={loading} className="gap-1.5"><RefreshCw className="w-3.5 h-3.5" />Refresh</Button>}
      />

      {/* System Health */}
      <section className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2"><Server className="w-4 h-4 text-orbitan-blue" /> System Health</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {sh.scoped ? (
            <>
              <Stat label="Tenant" value={sh.tenant_name || '—'} color="text-foreground" />
              <Stat label="Status" value={sh.tenant_status || '—'} color={sh.tenant_status === 'active' ? 'text-orbitan-green' : 'text-orbitan-amber'} />
              <Stat label="Pilot" value={sh.is_pilot ? 'Yes' : 'No'} />
              <Stat label="Sandbox" value={sh.is_sandbox ? 'Yes' : 'No'} />
            </>
          ) : (
            <>
              <Stat label="Total Tenants" value={sh.tenants_total} />
              <Stat label="Active" value={sh.active} color="text-orbitan-green" />
              <Stat label="Trial / Pilot" value={sh.trial} color="text-orbitan-blue" sub={`${sh.pilots} pilot(s)`} />
              <Stat label="Suspended" value={sh.suspended} color="text-orbitan-amber" sub={`${sh.onboarding} onboarding`} />
            </>
          )}
        </div>
      </section>

      {/* Transaction Health */}
      <section className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-orbitan-green" /> Transaction Health</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Sales (paid)" value={th.sales_paid} color="text-orbitan-green" sub={`${th.sales_cancelled} cancelled`} />
          <Stat label="Revenue (SGD)" value={th.revenue_sgd?.toLocaleString()} color="text-foreground" />
          <Stat label="Production Batches" value={th.production_batches} sub={`${th.production_completed} completed`} />
          <Stat label="Production Cancelled" value={th.production_cancelled} color={th.production_cancelled > 0 ? 'text-orbitan-amber' : 'text-foreground'} />
        </div>
      </section>

      {/* Inventory Health */}
      <section className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2"><Package className="w-4 h-4 text-orbitan-purple" /> Inventory Health</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Total Items" value={ih.total_items} />
          <Stat label="Low Stock" value={ih.low_stock} color={ih.low_stock > 0 ? 'text-orbitan-amber' : 'text-foreground'} />
          <Stat label="Out of Stock" value={ih.out_of_stock} color={ih.out_of_stock > 0 ? 'text-orbitan-red' : 'text-foreground'} />
          <Stat label="Negative Stock" value={ih.negative_stock} color={ih.negative_stock > 0 ? 'text-orbitan-red' : 'text-foreground'} sub={`Value: $${ih.total_value_sgd?.toLocaleString()}`} />
        </div>
      </section>

      {/* Finance Sync + Audit */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2"><Database className="w-4 h-4 text-orbitan-amber" /> Finance Sync Status</h3>
          <div className="flex flex-wrap gap-2">
            {Object.keys(fs.by_status || {}).length === 0 ? <p className="text-xs text-muted-foreground">No sync entries.</p> :
              Object.entries(fs.by_status).map(([s, n]) => (
                <span key={s} className={`text-xs font-medium px-3 py-1.5 rounded-full ${s === 'failed' ? 'bg-red-50 text-red-700' : s === 'synced' ? 'bg-emerald-50 text-emerald-700' : 'bg-muted'}`}>{s}: {n}</span>
              ))
            }
          </div>
          {fs.failed_retryable > 0 && <p className="text-xs text-orbitan-red mt-2 flex items-center gap-1"><AlertOctagon className="w-3.5 h-3.5" /> {fs.failed_retryable} failed entry(ies) awaiting retry</p>}
        </section>
        <section className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-orbitan-green" /> Audit Integrity</h3>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Audit Entries" value={ai.audit_entries} />
            <Stat label="Permission Denials" value={ai.permission_denied_count} color={ai.permission_denied_count > 0 ? 'text-orbitan-amber' : 'text-foreground'} />
          </div>
        </section>
      </div>

      <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1"><Activity className="w-3 h-3" /> Generated {data.scope?.generated_at ? new Date(data.scope.generated_at).toLocaleString() : '—'}</p>
    </div>
  );
}