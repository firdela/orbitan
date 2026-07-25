// SupportDiagnostics — authorised admin diagnostics view (Part O)
import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Activity, AlertOctagon, Database, Zap, Link2 } from 'lucide-react';

export default function SupportDiagnostics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tenantInput, setTenantInput] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('pilotReadiness', { action: 'diagnostics', tenant_id: tenantInput || undefined });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setData(d);
    } catch (err) {
      setData({ error: err?.message || 'Diagnostics unavailable (requires platform admin)' });
    } finally { setLoading(false);
    }
  }, [tenantInput]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (data?.error) return <div className="p-8"><div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">{data.error}</div></div>;
  if (!data) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <PageHeader title="Support Diagnostics" subtitle="Authorised admin view · correlation IDs for triage · no secrets exposed"
        actions={<Button size="sm" variant="outline" onClick={load} disabled={loading} className="gap-1.5"><RefreshCw className="w-3.5 h-3.5" />Refresh</Button>} />

      <div className="flex gap-3 items-center">
        <input value={tenantInput} onChange={e => setTenantInput(e.target.value)} placeholder="Tenant ID (blank = your tenant)" className="w-full sm:w-72 h-9 rounded-md border border-input bg-transparent px-3 text-sm" />
        <Button size="sm" onClick={load}>Run</Button>
      </div>

      {/* System identity */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-orbitan-blue" /> System Identity</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <Field label="App version" value={data.app_version} />
          <Field label="Build version" value={data.build_version} />
          <Field label="Tenant" value={data.tenant_name || data.tenant_id || '—'} />
          <Field label="Tenant status" value={data.tenant_status} />
          <Field label="Plan" value={data.subscription_plan || '—'} />
          <Field label="Pilot tenant" value={data.is_pilot_tenant ? 'Yes' : 'No'} />
          <Field label="Nexus AI enabled" value={data.nexus_ai_enabled ? 'Yes' : 'No'} />
          <Field label="Maintenance mode" value={data.maintenance_mode ? 'On' : 'Off'} />
        </div>
      </div>

      {/* Recent failures */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2"><AlertOctagon className="w-4 h-4 text-orbitan-red" /> Recent Backend Failures ({data.recent_failure_count})</h3>
        {data.recent_backend_failures?.length === 0 ? <p className="text-xs text-muted-foreground">No recent failures.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-muted-foreground border-b border-border"><th className="py-1.5 pr-3">When</th><th className="py-1.5 pr-3">Service</th><th className="py-1.5 pr-3">Status</th><th className="py-1.5 pr-3">Correlation ID</th><th className="py-1.5">Error</th></tr></thead>
              <tbody>
                {data.recent_backend_failures?.map(f => (
                  <tr key={f.id} className="border-b border-border/50">
                    <td className="py-1.5 pr-3 whitespace-nowrap">{f.created_date ? new Date(f.created_date).toLocaleString() : '—'}</td>
                    <td className="py-1.5 pr-3 font-mono">{f.service_key}</td>
                    <td className="py-1.5 pr-3">{f.status}</td>
                    <td className="py-1.5 pr-3 font-mono text-[10px] text-muted-foreground">{f.correlation_id?.slice(-8)}</td>
                    <td className="py-1.5 text-muted-foreground max-w-xs truncate" title={f.error_message}>{f.error_message || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Queue + insights + connections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-heading font-semibold text-sm mb-2 flex items-center gap-2"><Database className="w-4 h-4 text-orbitan-amber" /> Finance Queue</h3>
          <p className="text-xs text-muted-foreground mb-2">{data.finance_queue_health?.total} total record(s)</p>
          <div className="flex flex-wrap gap-1.5">{Object.entries(data.finance_queue_health?.by_status || {}).map(([s, n]) => <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-muted">{s}: {n}</span>)}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-heading font-semibold text-sm mb-2 flex items-center gap-2"><Zap className="w-4 h-4 text-orbitan-purple" /> Nexus Insights</h3>
          <p className="text-xs text-muted-foreground">Recent: {data.nexus_insight_status?.recent_count}</p>
          <p className="text-xs text-muted-foreground">Latest: {data.nexus_insight_status?.latest_type || '—'}</p>
          <p className="text-xs text-muted-foreground">Sufficiency: {data.nexus_insight_status?.latest_sufficiency === undefined ? '—' : (data.nexus_insight_status.latest_sufficiency ? 'Sufficient' : 'Insufficient')}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-heading font-semibold text-sm mb-2 flex items-center gap-2"><Link2 className="w-4 h-4 text-orbitan-blue" /> Connections</h3>
          {data.connections?.length === 0 ? <p className="text-xs text-muted-foreground">None configured.</p> : data.connections?.map(c => <p key={c.provider} className="text-xs">{c.provider}: <span className="font-medium">{c.status}</span></p>)}
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground text-center">{data.correlation_note}</p>
    </div>
  );
}

function Field({ label, value }) {
  return <div><p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p><p className="font-medium">{value}</p></div>;
}