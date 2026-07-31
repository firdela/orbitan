// Exception Centre — derived exception feed + retry queue (Build #16, Part 1).
import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, RefreshCw, AlertOctagon, RotateCw, Filter, ShieldAlert, CheckCircle2 } from 'lucide-react';
import BackBar from '@/components/shared/BackBar';

const SEV_COLOR = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function ExceptionCentrePage() {
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retrying, setRetrying] = useState(null);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await base44.functions.invoke('pilotDiagnostics', { action: 'diagnostics' });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setData(d);
    } catch (err) {
      setError(err.message || 'Exception centre unavailable (requires platform admin)');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const retry = async (entryId) => {
    setRetrying(entryId);
    try {
      const res = await base44.functions.invoke('pilotDiagnostics', { action: 'retry', entry_id: entryId });
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: 'Retry queued', description: 'The finance sync entry has been reset to pending.' });
      load();
    } catch (err) {
      toast({ title: 'Retry failed', description: err.message, variant: 'destructive' });
    } finally { setRetrying(null); }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (error) return <div className="p-8"><div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">{error}</div></div>;
  if (!data) return null;

  const exceptions = data.exceptions || [];
  const retryQueue = data.retry_queue || [];
  const filtered = filter === 'all' ? exceptions : exceptions.filter(e => e.severity === filter);
  const counts = exceptions.reduce((a, e) => { a[e.severity] = (a[e.severity] || 0) + 1; return a; }, {});

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <BackBar to="/leader-org" label="Back to Platform Console" />
      <PageHeader
        title="Exception Centre"
        subtitle={`${data.exception_count} exception(s) · ${retryQueue.length} awaiting retry · derived from live data`}
        actions={<Button size="sm" variant="outline" onClick={load} disabled={loading} className="gap-1.5"><RefreshCw className="w-3.5 h-3.5" />Refresh</Button>}
      />

      {/* Severity summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {['critical', 'high', 'medium', 'low'].map(sev => (
          <button key={sev} onClick={() => setFilter(filter === sev ? 'all' : sev)}
            className={`text-left bg-card border rounded-xl p-4 transition-all ${filter === sev ? 'border-primary ring-1 ring-primary/30' : 'border-border hover:border-primary/30'}`}>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{sev}</p>
            <p className={`text-2xl font-display font-bold mt-1 ${counts[sev] > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>{counts[sev] || 0}</p>
          </button>
        ))}
      </div>

      {/* Retry queue */}
      {retryQueue.length > 0 && (
        <section className="bg-card border border-orange-200 rounded-xl p-5">
          <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-orbitan-amber" /> Retry Queue ({retryQueue.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-muted-foreground border-b border-border"><th className="py-1.5 pr-3">Type</th><th className="py-1.5 pr-3">Source</th><th className="py-1.5 pr-3">Impact</th><th className="py-1.5 pr-3">Attempts</th><th className="py-1.5 pr-3">Error</th><th className="py-1.5">Action</th></tr></thead>
              <tbody>
                {retryQueue.map(r => (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="py-1.5 pr-3 font-mono">{r.queue_type}</td>
                    <td className="py-1.5 pr-3">{r.source_entity}</td>
                    <td className="py-1.5 pr-3">${r.financial_impact_sgd || 0}</td>
                    <td className="py-1.5 pr-3">{r.sync_attempts || 0}</td>
                    <td className="py-1.5 pr-3 max-w-xs truncate text-muted-foreground" title={r.last_error}>{r.last_error || '—'}</td>
                    <td className="py-1.5">
                      <Button size="sm" variant="outline" disabled={retrying === r.id} onClick={() => retry(r.id)} className="gap-1 h-7">
                        {retrying === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />} Retry
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Exceptions feed */}
      <section className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-orbitan-red" /> Exceptions {filter !== 'all' && <span className="text-xs font-normal text-muted-foreground">· filtered: {filter}</span>}
        </h3>
        {filtered.length === 0 ? (
          <div className="text-center py-10">
            <CheckCircle2 className="w-10 h-10 text-orbitan-green mx-auto mb-2 opacity-60" />
            <p className="text-sm font-semibold">No exceptions detected</p>
            <p className="text-xs text-muted-foreground mt-1">All systems nominal.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((e, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${SEV_COLOR[e.severity] || SEV_COLOR.low}`}>{e.severity}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-medium text-foreground">{e.type}</span>
                    <span className="text-[10px] text-muted-foreground">{e.source}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 break-words">{e.message}</p>
                </div>
                {e.retryable && (
                  <Button size="sm" variant="ghost" disabled={retrying === e.record_id} onClick={() => retry(e.record_id)} className="gap-1 h-7 shrink-0">
                    {retrying === e.record_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />} Retry
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="text-[10px] text-muted-foreground text-center">Exceptions are derived in real time from entity state — no persistent ticket store. Generated {data.scope?.generated_at ? new Date(data.scope.generated_at).toLocaleString() : '—'}</p>
    </div>
  );
}