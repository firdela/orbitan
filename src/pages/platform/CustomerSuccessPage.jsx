// CustomerSuccessPage — platform-admin cross-tenant customer success workspace (Build #18, Part 1)
// Principle: Reach + Relate
import React, { useState, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import EmptyState from '@/components/shared/EmptyState';
import {
  Loader2, RefreshCw, Heart, Activity, TrendingUp, AlertTriangle, CheckCircle2,
  Users, Package, ShoppingCart, Factory, CalendarClock, ListTodo, Sparkles,
  MessageSquare, Ticket, GraduationCap, Flag, ChevronRight, Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TIER_STYLES = {
  healthy: { label: 'Healthy', color: 'text-orbitan-green', bg: 'bg-green-50 border-green-200', dot: 'bg-orbitan-green' },
  watch: { label: 'Watch', color: 'text-orbitan-amber', bg: 'bg-amber-50 border-amber-200', dot: 'bg-orbitan-amber' },
  at_risk: { label: 'At Risk', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', dot: 'bg-orange-500' },
  critical: { label: 'Critical', color: 'text-orbitan-red', bg: 'bg-red-50 border-red-200', dot: 'bg-orbitan-red' },
};

export default function CustomerSuccessPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('customerSuccess', { action: 'overview' });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setData(d);
    } catch (err) {
      setData({ error: err?.message || 'Failed to load customer success data' });
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const loadDetail = async (tenantId) => {
    setDetailLoading(true); setDetail(null);
    try {
      const res = await base44.functions.invoke('customerSuccess', { action: 'tenant_detail', tenant_id: tenantId });
      setDetail(res.data || res);
    } catch (e) { setDetail({ error: e?.message }); }
    finally { setDetailLoading(false); }
  };

  const submitNote = async () => {
    if (!note.trim() || !selected) return;
    setSavingNote(true);
    try {
      await base44.functions.invoke('customerSuccess', { action: 'add_note', tenant_id: selected.tenant_id, note: note.trim() });
      setNote('');
      await loadDetail(selected.tenant_id);
    } catch (e) { /* ignore */ } finally { setSavingNote(false); }
  };

  const filtered = useMemo(() => {
    if (!data?.customers) return [];
    if (!search) return data.customers;
    const q = search.toLowerCase();
    return data.customers.filter(c => c.name?.toLowerCase().includes(q) || c.contact_email?.toLowerCase().includes(q));
  }, [data, search]);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (data?.error) return <div className="p-8"><div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">{data.error}</div></div>;

  const r = data?.rollup || {};

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <PageHeader title="Customer Success Workspace" subtitle="Cross-tenant health, adoption, onboarding, feedback & milestones — deterministic, evidence-based"
        actions={<Button size="sm" variant="outline" onClick={load} disabled={loading} className="gap-1.5"><RefreshCw className="w-3.5 h-3.5" />Refresh</Button>} />

      {/* Portfolio rollup */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <RollupCard icon={Users} label="Customers" value={r.total_customers} color="text-orbitan-blue" />
        <RollupCard icon={Heart} label="Avg Health" value={`${r.avg_health ?? 0}`} sub="/100" color="text-orbitan-purple" />
        <RollupCard icon={Activity} label="Avg Onboarding" value={`${r.avg_onboarding ?? 0}`} sub="%" color="text-orbitan-green" />
        <RollupCard icon={Ticket} label="Open Support" value={r.total_open_support} color="text-orbitan-amber" />
        <RollupCard icon={CheckCircle2} label="Converted" value={r.total_converted} color="text-orbitan-green" />
      </div>

      {/* Health distribution */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {['healthy', 'watch', 'at_risk', 'critical'].map(t => {
          const tier = TIER_STYLES[t];
          const count = t === 'healthy' ? r.healthy : t === 'watch' ? r.watch : t === 'at_risk' ? r.at_risk : r.critical;
          return (
            <Card key={t} className={cn('p-4 border', tier.bg)}>
              <div className="flex items-center gap-2">
                <span className={cn('w-2 h-2 rounded-full', tier.dot)} />
                <span className={cn('text-xs font-medium uppercase tracking-wider', tier.color)}>{tier.label}</span>
              </div>
              <p className="text-2xl font-display font-bold mt-1">{count ?? 0}</p>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or contact…"
          className="w-full h-9 rounded-md border border-input bg-transparent pl-8 pr-3 text-sm" />
      </div>

      {/* Customer list */}
      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No customers found" description="No pilot or sandbox tenants match your search." color="blue" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(c => <CustomerCard key={c.tenant_id} c={c} tier={TIER_STYLES[c.health_tier]} onSelect={() => { setSelected(c); loadDetail(c.tenant_id); }} active={selected?.tenant_id === c.tenant_id} />)}
        </div>
      )}

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-2xl bg-background border-l border-border overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-background/95 backdrop-blur border-b border-border px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-lg">{selected.name}</h3>
                <p className="text-xs text-muted-foreground">{selected.industry} · {selected.plan} · {selected.status}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Close</Button>
            </div>
            <div className="p-6 space-y-5">
              {detailLoading ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div> :
                <>
                  {/* Health + onboarding */}
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="p-4"><p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Health Score</p><p className="text-3xl font-display font-bold">{selected.health}<span className="text-sm text-muted-foreground">/100</span></p><p className={cn('text-xs font-medium', TIER_STYLES[selected.health_tier].color)}>{TIER_STYLES[selected.health_tier].label}</p></Card>
                    <Card className="p-4"><p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Onboarding</p><p className="text-3xl font-display font-bold">{selected.onboarding_pct}<span className="text-sm text-muted-foreground">%</span></p><p className="text-xs text-muted-foreground">Last activity {selected.last_activity_days ?? '—'}d ago</p></Card>
                  </div>

                  {/* Adoption */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Adoption ({selected.adoption.modules_used}/8 modules)</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <MiniStat icon={Package} label="Inventory" value={selected.adoption.inventory} />
                      <MiniStat icon={ShoppingCart} label="Sales" value={selected.adoption.sales} />
                      <MiniStat icon={Factory} label="Production" value={selected.adoption.production} />
                      <MiniStat icon={CalendarClock} label="Shifts" value={selected.adoption.shifts} />
                      <MiniStat icon={ListTodo} label="Tasks" value={selected.adoption.tasks} />
                      <MiniStat icon={Users} label="Employees" value={selected.adoption.employees} />
                      <MiniStat icon={CheckCircle2} label="Reconciles" value={selected.adoption.reconciliations} />
                      <MiniStat icon={Sparkles} label="Nexus" value={selected.adoption.nexus_insights} />
                    </div>
                  </div>

                  {/* Outstanding setup tasks */}
                  {selected.outstanding_setup_tasks.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Outstanding Setup Tasks</h4>
                      <div className="space-y-1.5">{selected.outstanding_setup_tasks.map((t, i) => <div key={i} className="flex items-center gap-2 text-sm"><AlertTriangle className="w-3.5 h-3.5 text-orbitan-amber flex-shrink-0" /><span>{t}</span></div>)}</div>
                    </div>
                  )}

                  {/* Milestones */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Success Milestones ({selected.milestones_achieved}/{selected.milestones_total})</h4>
                    <div className="space-y-1.5">{selected.milestones.map(m => <div key={m.key} className="flex items-center gap-2 text-sm">{m.achieved ? <CheckCircle2 className="w-3.5 h-3.5 text-orbitan-green flex-shrink-0" /> : <Flag className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}<span className={m.achieved ? 'text-foreground' : 'text-muted-foreground'}>{m.label}</span>{m.date && <span className="text-[10px] text-muted-foreground ml-auto">{new Date(m.date).toLocaleDateString()}</span>}</div>)}</div>
                  </div>

                  {/* Training */}
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-1"><GraduationCap className="w-3.5 h-3.5 text-orbitan-purple" /><span className="text-xs uppercase tracking-wider text-muted-foreground">Training</span></div>
                    <p className="text-sm">{selected.training.modules_published} published · {selected.training.modules_total} total modules</p>
                  </Card>

                  {/* Feedback */}
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2"><MessageSquare className="w-3.5 h-3.5 text-orbitan-blue" /><span className="text-xs uppercase tracking-wider text-muted-foreground">Feedback</span></div>
                    <p className="text-sm">{selected.feedback.total} items · {selected.feedback.open} open · {selected.feedback.support_tickets} support tickets</p>
                  </Card>

                  {/* Recent feedback + activity */}
                  {detail && !detail.error && (
                    <>
                      {detail.recent_feedback?.length > 0 && (
                        <div><h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Recent Feedback</h4>
                          <div className="space-y-1.5">{detail.recent_feedback.slice(0, 8).map(f => <div key={f.id} className="text-xs border border-border rounded-lg px-3 py-2"><p className="font-medium truncate">{f.title}</p><p className="text-muted-foreground mt-0.5">{f.type} · {f.severity} · {f.sentiment || '—'}</p></div>)}</div>
                        </div>
                      )}
                      {detail.recent_activity?.length > 0 && (
                        <div><h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Recent Activity</h4>
                          <div className="space-y-1.5">{detail.recent_activity.slice(0, 8).map(a => <div key={a.id} className="text-xs border-l-2 border-border pl-3"><p className="font-medium">{a.action_type}</p><p className="text-muted-foreground">{a.details}</p><p className="text-[10px] text-muted-foreground">{a.actor_name} · {new Date(a.created_date).toLocaleString()}</p></div>)}</div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Add note */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Customer Note (audited)</h4>
                    <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Add a customer success note…" className="w-full rounded-md border border-input bg-transparent p-3 text-sm" />
                    <Button size="sm" onClick={submitNote} disabled={!note.trim() || savingNote} className="mt-2 gap-1.5">{savingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}Save Note</Button>
                  </div>
                </>
              }
            </div>
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground text-center">Rule set {data.rule_version} · app {data.app_version} · computed {new Date(data.generated_at).toLocaleString()}</p>
    </div>
  );
}

function RollupCard({ icon: Icon, label, value, sub, color }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-1"><Icon className={cn('w-3.5 h-3.5', color)} /><span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span></div>
      <p className="text-xl font-display font-bold tabular-nums">{value}<span className="text-xs text-muted-foreground">{sub}</span></p>
    </Card>
  );
}

function MiniStat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-2.5 py-2">
      <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      <div className="min-w-0"><p className="text-[10px] text-muted-foreground truncate">{label}</p><p className="text-sm font-semibold tabular-nums">{value}</p></div>
    </div>
  );
}

function CustomerCard({ c, tier, onSelect, active }) {
  return (
    <Card className={cn('p-4 card-elevated cursor-pointer transition-all', active && 'ring-2 ring-primary', tier.bg, 'border')} onClick={onSelect}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('w-2 h-2 rounded-full flex-shrink-0', tier.dot)} />
            <h3 className="font-heading font-semibold text-sm truncate">{c.name}</h3>
          </div>
          <p className="text-[10px] text-muted-foreground">{c.industry} · {c.plan} · {c.status}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={cn('text-lg font-display font-bold tabular-nums', tier.color)}>{c.health}</p>
          <p className="text-[10px] text-muted-foreground">{tier.label}</p>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 text-[10px] text-muted-foreground">
        <span>{c.adoption.modules_used}/8 modules</span>
        <span>{c.onboarding_pct}% onboard</span>
        <span>{c.milestones_achieved}/{c.milestones_total} milestones</span>
      </div>
      {c.outstanding_setup_tasks.length > 0 && (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-orbitan-amber"><AlertTriangle className="w-3 h-3" />{c.outstanding_setup_tasks.length} outstanding task{c.outstanding_setup_tasks.length !== 1 ? 's' : ''}</div>
      )}
      <div className="mt-2 flex items-center justify-end text-[10px] text-orbitan-blue">View details <ChevronRight className="w-3 h-3" /></div>
    </Card>
  );
}