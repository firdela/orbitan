// PilotReadinessDashboard — deterministic readiness % + checklist + go-live recommendation (Part W)
import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, CheckCircle2, Circle, ShieldAlert, Rocket } from 'lucide-react';

export default function PilotReadinessDashboard() {
  const [data, setData] = useState(null);
  const [checklist, setChecklist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantInput, setTenantInput] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('pilotReadiness', { action: 'readiness', tenant_id: tenantInput || undefined });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setData(d);
      // load manual checklist record
      try {
        const cls = await base44.entities.OnboardingChecklist.filter({ tenant_id: d.tenant_id });
        setChecklist(cls[0] || null);
      } catch (e) { setChecklist(null); }
    } catch (err) {
      setData({ error: err?.message || 'Failed to load readiness' });
    } finally { setLoading(false); }
  }, [tenantInput]);

  useEffect(() => { load(); }, [load]);

  const toggleFlag = async (flag) => {
    if (!data) return;
    setSaving(true);
    try {
      const me = await base44.auth.me();
      let rec = checklist;
      const flags = { ...(checklist?.manual_flags || {}), [flag]: !checklist?.manual_flags?.[flag] };
      const payload = { tenant_id: data.tenant_id, manual_flags: flags, updated_by: me.id, updated_by_name: me.full_name, updated_at: new Date().toISOString() };
      if (rec) {
        await base44.entities.OnboardingChecklist.update(rec.id, payload);
      } else {
        const created = await base44.entities.OnboardingChecklist.create(payload);
        rec = created;
      }
      setChecklist({ ...rec, manual_flags: flags });
      await load(); // recompute
    } catch (e) { /* ignore */ } finally { setSaving(false); }
  };

  const recColor = { 'Not Ready': 'text-orbitan-red', 'Conditionally Ready': 'text-orbitan-amber', 'Ready for Controlled Pilot': 'text-orbitan-green' };
  const recBg = { 'Not Ready': 'bg-red-50 border-red-200', 'Conditionally Ready': 'bg-amber-50 border-amber-200', 'Ready for Controlled Pilot': 'bg-green-50 border-green-200' };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (data?.error) return <div className="p-8"><div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">{data.error}</div></div>;
  if (!data) return null;

  const categories = {};
  (data.items || []).forEach(i => { (categories[i.category] = categories[i.category] || []).push(i); });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <PageHeader title="Pilot Readiness Dashboard" subtitle="Deterministic readiness · explainable · no fabricated percentages"
        actions={<Button size="sm" variant="outline" onClick={load} disabled={loading} className="gap-1.5"><RefreshCw className="w-3.5 h-3.5" />Refresh</Button>} />

      <div className="flex flex-col sm:flex-row gap-3 items-start">
        <input value={tenantInput} onChange={e => setTenantInput(e.target.value)} placeholder="Tenant ID (leave blank for your tenant)" className="w-full sm:w-72 h-9 rounded-md border border-input bg-transparent px-3 text-sm" />
        <Button size="sm" onClick={load} disabled={loading}>Assess</Button>
      </div>

      {/* Readiness ring + recommendation */}
      <div className={`border rounded-xl p-5 ${recBg[data.recommendation] || 'bg-card border-border'}`}>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative w-32 h-32 flex-shrink-0">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
              <circle cx="60" cy="60" r="52" fill="none" stroke={data.readiness_pct >= 90 ? '#16A34A' : data.readiness_pct >= 60 ? '#F59E0B' : '#DC2626'} strokeWidth="10" strokeLinecap="round" strokeDasharray={2 * Math.PI * 52} strokeDashoffset={2 * Math.PI * 52 * (1 - data.readiness_pct / 100)} className="transition-all duration-700" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-display font-bold tabular-nums">{data.readiness_pct}%</span>
              <span className="text-[10px] text-muted-foreground">ready</span>
            </div>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
              <Rocket className="w-5 h-5" />
              <span className={`text-lg font-heading font-bold ${recColor[data.recommendation]}`}>{data.recommendation}</span>
            </div>
            <p className="text-sm text-muted-foreground">{data.tenant_name || data.tenant_id} · {data.subscription_plan || 'no plan'} · {data.tenant_status}</p>
            {data.critical_blockers?.length > 0 ? (
              <div className="mt-2 text-xs text-red-700 flex items-start gap-1.5"><ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" /><span><span className="font-semibold">Critical blockers:</span> {data.critical_blockers.join(', ')}</span></div>
            ) : <p className="mt-2 text-xs text-green-700">No critical blockers.</p>}
          </div>
        </div>
      </div>

      {/* Checklist by category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(categories).map(([cat, items]) => (
          <div key={cat} className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-heading font-semibold text-sm mb-3">{cat}</h3>
            <div className="space-y-2">
              {items.map(it => (
                <div key={it.key} className="flex items-start gap-2">
                  {it.complete ? <CheckCircle2 className="w-4 h-4 text-orbitan-green flex-shrink-0 mt-0.5" /> : <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs ${it.complete ? 'text-foreground' : 'text-muted-foreground'}`}>{it.label}{it.critical && <span className="text-red-500 ml-1" title="Critical blocker">●</span>}</span>
                      {it.source === 'manual' && (
                        <button onClick={() => toggleFlag(it.key)} disabled={saving} className="text-[10px] px-2 py-0.5 rounded border border-border hover:bg-muted transition-colors">{checklist?.manual_flags?.[it.key] ? 'Attested ✓' : 'Attest'}</button>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{it.evidence} · {it.source === 'auto' ? 'auto-detected' : 'manual attestation'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* External dependencies */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-heading font-semibold text-sm mb-3">External Dependencies</h3>
        <div className="space-y-1.5">
          {data.external_dependencies?.map(d => (
            <div key={d.key} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{d.label}</span>
              <span className="flex items-center gap-2"><StatusPill status={d.status} /><span className="text-[10px] text-muted-foreground hidden sm:inline">{d.note}</span></span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground text-center">Rule set {data.rule_version} · app {data.app_version} · computed {new Date(data.computed_at).toLocaleString()}</p>
    </div>
  );
}

function StatusPill({ status }) {
  const map = { connected: 'bg-green-100 text-green-800', pending: 'bg-amber-100 text-amber-800', 'platform-managed': 'bg-blue-100 text-blue-800', available: 'bg-green-100 text-green-800' };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${map[status] || 'bg-muted text-muted-foreground'}`}>{status}</span>;
}