// PilotDeploymentCentre — leader cockpit for pilot lifecycle + deployment history (Build #18, Part 4)
// Principle: Regulate + Reach
// Wraps pilotAdmin (activate/suspend/extend/convert/archive/delete) with a
// deployment timeline + audit trail sourced from AuditLog (pilot_* actions).
import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import EmptyState from '@/components/shared/EmptyState';
import {
  Loader2, RefreshCw, Rocket, Pause, Play, Archive, Trash2, CalendarClock,
  CheckCircle2, Activity, History, AlertTriangle, Plane, Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

const ACTION_META = {
  pilot_tenant_created: { label: 'Created', icon: Plus, color: 'text-orbitan-blue' },
  pilot_activated: { label: 'Activated', icon: Rocket, color: 'text-orbitan-green' },
  pilot_suspended: { label: 'Suspended', icon: Pause, color: 'text-orbitan-amber' },
  pilot_extended: { label: 'Extended', icon: CalendarClock, color: 'text-orbitan-blue' },
  pilot_converted_to_paid: { label: 'Converted', icon: CheckCircle2, color: 'text-orbitan-green' },
  pilot_archived: { label: 'Archived', icon: Archive, color: 'text-muted-foreground' },
  sandbox_tenant_deleted: { label: 'Deleted', icon: Trash2, color: 'text-orbitan-red' },
};

export default function PilotDeploymentCentre() {
  const { toast } = useToast();
  const [tenants, setTenants] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filterTenant, setFilterTenant] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, histRes] = await Promise.all([
        base44.functions.invoke('pilotAdmin', { action: 'list' }),
        base44.functions.invoke('pilotAdmin', { action: 'deployment_history' }),
      ]);
      const l = listRes.data || listRes;
      const h = histRes.data || histRes;
      if (l.error) throw new Error(l.error);
      setTenants(l.tenants || []);
      setHistory(h.events || []);
    } catch (e) { toast({ title: 'Load failed', description: e?.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const run = async (tenant_id, action, label, extra = {}) => {
    setActing(`${tenant_id}:${action}`);
    try {
      const res = await base44.functions.invoke('pilotAdmin', { action, tenant_id, ...extra });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      toast({ title: `${label} successful`, description: d.tenant?.name || '' });
      await load();
    } catch (e) { toast({ title: `${label} failed`, description: e?.message, variant: 'destructive' }); }
    finally { setActing(null); }
  };

  const filteredHistory = filterTenant ? history.filter(h => h.tenant_id === filterTenant) : history;

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <PageHeader title="Pilot Deployment Centre" subtitle="Activate, pause, resume, close pilots · deployment timeline · full audit trail"
        actions={<div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load} disabled={loading} className="gap-1.5"><RefreshCw className="w-3.5 h-3.5" />Refresh</Button>
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5"><Plus className="w-3.5 h-3.5" />New Pilot</Button>
        </div>} />

      {/* Active pilots grid */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Pilot Tenants ({tenants.length})</h3>
        {tenants.length === 0 ? (
          <EmptyState icon={Plane} title="No pilot tenants" description="Create a new pilot tenant to begin a controlled deployment." color="blue" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tenants.map(t => (
              <Card key={t.id} className="p-4 card-elevated">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0"><h4 className="font-heading font-semibold text-sm truncate">{t.name}</h4><p className="text-[10px] text-muted-foreground">{t.industry} · {t.plan}</p></div>
                  <StatusPill status={t.status} />
                </div>
                <div className="text-[10px] text-muted-foreground space-y-0.5 mb-3">
                  {t.trial_ends_date && <p>Trial ends {t.trial_ends_date}</p>}
                  <p>{t.is_sandbox ? 'Sandbox' : 'Production'} · created {new Date(t.created_date).toLocaleDateString()}</p>
                  {t.contact_email && <p className="truncate">Contact: {t.contact_email}</p>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <ActBtn icon={Rocket} label="Activate" disabled={t.status === 'active'} loading={acting === `${t.id}:activate`} onClick={() => run(t.id, 'activate', 'Activate')} color="text-orbitan-green" />
                  <ActBtn icon={Pause} label="Pause" disabled={t.status !== 'active'} loading={acting === `${t.id}:suspend`} onClick={() => run(t.id, 'suspend', 'Pause')} color="text-orbitan-amber" />
                  <ActBtn icon={Play} label="Resume" disabled={t.status !== 'suspended'} loading={acting === `${t.id}:activate`} onClick={() => run(t.id, 'activate', 'Resume')} color="text-orbitan-green" />
                  <ActBtn icon={CalendarClock} label="Extend 30d" loading={acting === `${t.id}:extend`} onClick={() => run(t.id, 'extend', 'Extend', { days: 30 })} color="text-orbitan-blue" />
                  <ActBtn icon={CheckCircle2} label="Convert" disabled={!t.is_pilot_tenant} loading={acting === `${t.id}:convert`} onClick={() => run(t.id, 'convert', 'Convert')} color="text-orbitan-green" />
                  <ActBtn icon={Archive} label="Archive" disabled={t.status === 'cancelled'} loading={acting === `${t.id}:archive`} onClick={() => run(t.id, 'archive', 'Archive')} color="text-muted-foreground" />
                  {t.is_sandbox && <ActBtn icon={Trash2} label="Delete" loading={acting === `${t.id}:delete_sandbox`} onClick={() => { if (confirm(`Permanently delete sandbox "${t.name}"?`)) run(t.id, 'delete_sandbox', 'Delete'); }} color="text-orbitan-red" />}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Deployment timeline / audit trail */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><History className="w-3.5 h-3.5" />Deployment Timeline ({filteredHistory.length})</h3>
          {filterTenant && <Button size="sm" variant="ghost" onClick={() => setFilterTenant('')} className="text-xs h-7">Clear filter</Button>}
        </div>
        {filteredHistory.length === 0 ? (
          <Card className="p-6"><EmptyState icon={History} title="No deployment events yet" description="Pilot lifecycle actions (activate, pause, extend, convert, archive) will appear here as an immutable audit trail." color="slate" /></Card>
        ) : (
          <Card className="p-4">
            <div className="relative space-y-4">
              {filteredHistory.map(ev => {
                const meta = ACTION_META[ev.action_type] || { label: ev.action_type, icon: Activity, color: 'text-muted-foreground' };
                const Icon = meta.icon;
                return (
                  <div key={ev.id} className="flex gap-3 cursor-pointer hover:bg-muted/40 -mx-2 px-2 py-1.5 rounded-lg transition-colors" onClick={() => setFilterTenant(filterTenant ? '' : ev.tenant_id)}>
                    <div className="flex flex-col items-center">
                      <div className={cn('w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0', meta.color)}><Icon className="w-3.5 h-3.5" /></div>
                      <div className="w-px flex-1 bg-border mt-1" />
                    </div>
                    <div className="flex-1 min-w-0 pb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('text-sm font-medium', meta.color)}>{meta.label}</span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{ev.tenant_id}</span>
                        {!filterTenant && <button className="text-[10px] text-orbitan-blue hover:underline">filter</button>}
                      </div>
                      <p className="text-xs text-foreground/80 mt-0.5">{ev.details}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{ev.actor_name} · {new Date(ev.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {showCreate && <CreatePilotDialog onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
    </div>
  );
}

function StatusPill({ status }) {
  const map = { active: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400', trial: 'bg-primary/10 text-primary', suspended: 'bg-amber-500/10 text-amber-700 dark:text-amber-400', onboarding: 'bg-purple-500/10 text-purple-700 dark:text-purple-400', cancelled: 'bg-muted text-muted-foreground' };
  return <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0', map[status] || 'bg-muted text-muted-foreground')}>{status}</span>;
}

function ActBtn({ icon: Icon, label, onClick, disabled, loading, color }) {
  return (
    <Button size="sm" variant="outline" onClick={onClick} disabled={disabled || loading} className="h-7 px-2 text-[11px] gap-1">
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Icon className={cn('w-3 h-3', color)} />}
      {label}
    </Button>
  );
}

function CreatePilotDialog({ onClose, onCreated }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', industry: 'food_beverage', subscription_plan: 'orbitan_growth', pilot_days: 30, contact_email: '', contact_name: '', is_sandbox: false });
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!form.name || !form.industry) { toast({ title: 'Name and industry required', variant: 'destructive' }); return; }
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke('pilotAdmin', { action: 'create', ...form });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      toast({ title: 'Pilot tenant created', description: d.tenant?.name });
      onCreated();
    } catch (e) { toast({ title: 'Create failed', description: e?.message, variant: 'destructive' }); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <Card className="relative w-full max-w-md p-6 space-y-4">
        <h3 className="font-heading font-bold text-lg">Create Pilot Tenant</h3>
        <div className="space-y-3">
          <Field label="Name *"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Taqueria Pte Ltd" /></Field>
          <Field label="Industry *"><select value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"><option value="food_beverage">Food & Beverage</option><option value="recycling_sustainability">Recycling & Sustainability</option><option value="retail">Retail</option><option value="other">Other</option></select></Field>
          <Field label="Plan"><select value={form.subscription_plan} onChange={e => setForm({ ...form, subscription_plan: e.target.value })} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"><option value="orbitan_starter">Starter</option><option value="orbitan_growth">Growth</option><option value="orbitan_business">Business</option></select></Field>
          <Field label="Pilot days"><Input type="number" value={form.pilot_days} onChange={e => setForm({ ...form, pilot_days: Number(e.target.value) })} /></Field>
          <Field label="Contact name"><Input value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} /></Field>
          <Field label="Contact email"><Input type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_sandbox} onChange={e => setForm({ ...form, is_sandbox: e.target.checked })} /> Sandbox tenant (hard-deletable)</label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={submitting} className="gap-1.5">{submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}Create</Button>
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children }) {
  return <div><label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>{children}</div>;
}