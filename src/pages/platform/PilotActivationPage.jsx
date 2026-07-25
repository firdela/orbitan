// Pilot Activation — readiness verification + go-live assistant + activate (Build #17).
import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Loader2, RefreshCw, Rocket, CheckCircle2, XCircle, AlertTriangle, ShieldCheck,
  ListChecks, TrendingUp, Lightbulb,
} from 'lucide-react';

export default function PilotActivationPage() {
  const { toast } = useToast();
  const [tenants, setTenants] = useState([]);
  const [tenantId, setTenantId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState(false);

  const loadTenants = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('pilotAdmin', { action: 'list' });
      setTenants(res.data?.tenants || []);
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => { loadTenants(); }, [loadTenants]);

  const runReadiness = useCallback(async (tid) => {
    if (!tid) return;
    setLoading(true); setData(null);
    try {
      const res = await base44.functions.invoke('pilotReadiness', { action: 'readiness', tenant_id: tid });
      const d = res.data;
      if (d?.error) throw new Error(d.error);
      setData(d);
    } catch (err) {
      setData({ error: err.message });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (tenantId) runReadiness(tenantId); }, [tenantId, runReadiness]);

  const activate = async () => {
    const t = tenants.find(x => x.id === tenantId);
    if (!confirm(`Activate pilot for "${t?.name}"? This sets the tenant status to active.`)) return;
    setActivating(true);
    try {
      const res = await base44.functions.invoke('pilotAdmin', { action: 'activate', tenant_id: tenantId });
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: 'Pilot activated', description: t?.name });
      loadTenants();
      runReadiness(tenantId);
    } catch (err) {
      toast({ title: 'Activation failed', description: err.message, variant: 'destructive' });
    } finally { setActivating(false); }
  };

  const items = data?.items || [];
  const critical = items.filter(i => i.critical && !i.complete);
  const incomplete = items.filter(i => !i.complete && !i.critical);
  const ready = data?.recommendation === 'Ready for Controlled Pilot';
  const condReady = data?.recommendation === 'Conditionally Ready';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <PageHeader
        title="Pilot Activation"
        subtitle="Validate readiness, resolve blockers, and activate the pilot for go-live"
        actions={<Button size="sm" variant="outline" onClick={() => runReadiness(tenantId)} disabled={loading || !tenantId} className="gap-1.5"><RefreshCw className="w-3.5 h-3.5" />Re-check</Button>}
      />

      {/* Tenant selector */}
      <div className="bg-card border border-border rounded-xl p-4">
        <label className="text-xs font-medium block mb-1.5">Select Pilot Tenant</label>
        <div className="flex gap-2">
          <select value={tenantId} onChange={e => setTenantId(e.target.value)} className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 text-sm">
            <option value="">— choose a tenant —</option>
            {tenants.map(t => <option key={t.id} value={t.id}>{t.name} ({t.status})</option>)}
          </select>
        </div>
      </div>

      {!tenantId && <div className="text-center py-12 text-sm text-muted-foreground">Select a tenant to run the readiness verification.</div>}

      {loading && <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}

      {data?.error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">{data.error}</div>}

      {data && !data.error && (
        <>
          {/* Readiness summary */}
          <div className={`rounded-2xl p-5 text-white ${ready ? 'bg-gradient-to-br from-emerald-600 to-teal-700' : condReady ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-red-600 to-rose-700'}`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Readiness</p>
                <p className="text-3xl font-display font-bold">{data.readiness_pct}%</p>
                <p className="text-white/80 text-sm mt-0.5">{data.recommendation}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/70">{data.incomplete_count} item(s) incomplete</p>
                <p className="text-xs text-white/70">{critical.length} critical blocker(s)</p>
              </div>
            </div>
          </div>

          {/* Go-Live Assistant */}
          <section className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-orbitan-amber" /> Go-Live Assistant</h3>
            {critical.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-red-700 flex items-center gap-1 mb-1.5"><XCircle className="w-3.5 h-3.5" /> Critical blockers (must resolve before go-live)</p>
                <ul className="text-xs text-red-700 ml-5 list-disc space-y-0.5">{critical.map(b => <li key={b.key}>{b.label} — {b.evidence}</li>)}</ul>
              </div>
            )}
            {incomplete.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-amber-700 flex items-center gap-1 mb-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Remaining setup tasks</p>
                <ul className="text-xs text-muted-foreground ml-5 list-disc space-y-0.5">{incomplete.slice(0, 12).map(b => <li key={b.key}>{b.label} — {b.evidence}</li>)}</ul>
              </div>
            )}
            {critical.length === 0 && incomplete.length === 0 && (
              <p className="text-xs text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> All readiness checks complete. Ready for controlled pilot.</p>
            )}
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Estimated readiness: <strong className="text-foreground">{data.readiness_pct}%</strong> · {data.deterministic_note}</p>
            </div>
          </section>

          {/* Verification checks */}
          <section className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2"><ListChecks className="w-4 h-4 text-orbitan-blue" /> Verification Checks</h3>
            <div className="space-y-1">
              {items.map(it => (
                <div key={it.key} className="flex items-center gap-2 py-1.5 border-b border-border/40 last:border-0">
                  {it.complete ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className={`w-4 h-4 shrink-0 ${it.critical ? 'text-red-600' : 'text-amber-500'}`} />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{it.label}</p>
                    <p className="text-[10px] text-muted-foreground">{it.evidence} · {it.source} · weight {it.weight}{it.critical && ' · critical'}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{it.category}</span>
                </div>
              ))}
            </div>
          </section>

          {/* External dependencies */}
          <section className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-orbitan-green" /> External Dependencies</h3>
            <div className="space-y-1.5">
              {(data.external_dependencies || []).map(d => (
                <div key={d.key} className="flex items-center justify-between text-xs">
                  <span>{d.label}</span>
                  <span className={`font-medium ${d.status === 'connected' || d.status === 'available' ? 'text-emerald-600' : 'text-amber-600'}`}>{d.status}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Activate */}
          <div className="flex justify-end">
            <Button onClick={activate} disabled={activating || critical.length > 0} className="gap-1.5">
              {activating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              {critical.length > 0 ? 'Resolve blockers to activate' : 'Activate Pilot'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}