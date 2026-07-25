// Pilot Administration — governed pilot tenant lifecycle (Build Package #16, Part 1).
import React, { useState, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  Loader2, RefreshCw, Plus, Rocket, Pause, Play, CalendarClock,
  Archive, Trash2, CheckCircle2, Building2, Shield, X,
} from 'lucide-react';

const STATUS_COLOR = {
  active: 'bg-emerald-100 text-emerald-700',
  trial: 'bg-blue-100 text-blue-700',
  suspended: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-slate-200 text-slate-600',
  onboarding: 'bg-purple-100 text-purple-700',
};

export default function PilotAdminPage() {
  const { toast } = useToast();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('pilotAdmin', { action: 'list' });
      setTenants(res.data?.tenants || []);
    } catch (err) {
      toast({ title: 'Load failed', description: err.message, variant: 'destructive' });
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const run = async (action, tenant, extra = {}) => {
    const verb = { activate: 'Activate', suspend: 'Suspend', extend: 'Extend', convert: 'Convert', archive: 'Archive', delete_sandbox: 'Delete' }[action];
    if (action === 'delete_sandbox' && !confirm(`Permanently delete sandbox tenant "${tenant.name}"? This cannot be undone.`)) return;
    if (action === 'extend') {
      const days = prompt(`Extend pilot by how many days? (current end: ${tenant.trial_ends_date || 'none'})`, '30');
      if (!days) return;
      extra.days = days;
    }
    if (action === 'convert') {
      const plan = prompt('Subscription plan to convert to?', tenant.plan || 'orbitan_growth');
      if (!plan) return;
      extra.subscription_plan = plan;
    }
    setActing(action + tenant.id);
    try {
      const res = await base44.functions.invoke('pilotAdmin', { action, tenant_id: tenant.id, ...extra });
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: `${verb} successful`, description: tenant.name });
      load();
    } catch (err) {
      toast({ title: `${verb} failed`, description: err.message, variant: 'destructive' });
    } finally { setActing(null); }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <PageHeader
        title="Pilot Administration"
        subtitle="Provision, manage, and retire pilot tenants · platform admin only"
        actions={
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5"><Plus className="w-3.5 h-3.5" /> New Pilot</Button>
            <Button size="sm" variant="outline" onClick={load} disabled={loading} className="gap-1.5"><RefreshCw className="w-3.5 h-3.5" />Refresh</Button>
          </div>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : tenants.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <Rocket className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-semibold">No pilot or sandbox tenants yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create a pilot tenant to begin a controlled customer pilot.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tenants.map(t => (
            <div key={t.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Building2 className="w-4 h-4 text-orbitan-blue shrink-0" />
                    <h3 className="font-heading font-semibold text-sm truncate">{t.name}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[t.status] || 'bg-muted'}`}>{t.status}</span>
                    {t.is_pilot_tenant && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 flex items-center gap-1"><Rocket className="w-3 h-3" />Pilot</span>}
                    {t.is_sandbox && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">Sandbox</span>}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-xs text-muted-foreground">
                    <span>Plan: <span className="font-medium text-foreground">{t.plan}</span></span>
                    <span>Industry: <span className="font-medium text-foreground">{t.industry}</span></span>
                    <span>Pilot ends: <span className="font-medium text-foreground">{t.trial_ends_date || '—'}</span></span>
                    {t.contact_email && <span>Contact: <span className="font-medium text-foreground">{t.contact_email}</span></span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" variant="outline" disabled={acting === 'activate'+t.id} onClick={() => run('activate', t)} className="gap-1 h-8"><Play className="w-3.5 h-3.5" />Activate</Button>
                  <Button size="sm" variant="outline" disabled={acting === 'suspend'+t.id} onClick={() => run('suspend', t)} className="gap-1 h-8"><Pause className="w-3.5 h-3.5" />Suspend</Button>
                  <Button size="sm" variant="outline" disabled={acting === 'extend'+t.id} onClick={() => run('extend', t)} className="gap-1 h-8"><CalendarClock className="w-3.5 h-3.5" />Extend</Button>
                  <Button size="sm" variant="outline" disabled={acting === 'convert'+t.id} onClick={() => run('convert', t)} className="gap-1 h-8"><CheckCircle2 className="w-3.5 h-3.5" />Convert</Button>
                  <Button size="sm" variant="outline" disabled={acting === 'archive'+t.id} onClick={() => run('archive', t)} className="gap-1 h-8"><Archive className="w-3.5 h-3.5" />Archive</Button>
                  {t.is_sandbox && <Button size="sm" variant="destructive" disabled={acting === 'delete_sandbox'+t.id} onClick={() => run('delete_sandbox', t)} className="gap-1 h-8"><Trash2 className="w-3.5 h-3.5" />Delete</Button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreatePilotDialog onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
    </div>
  );
}

function CreatePilotDialog({ onClose, onCreated }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', industry: 'food_beverage', subscription_plan: 'orbitan_growth', pilot_days: 30, is_sandbox: true, contact_email: '', contact_name: '' });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name) { toast({ title: 'Name required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const res = await base44.functions.invoke('pilotAdmin', { action: 'create', ...form });
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: 'Pilot tenant created', description: `${res.data.tenant.name} — ends ${res.data.tenant.trial_ends_date}` });
      onCreated();
    } catch (err) {
      toast({ title: 'Create failed', description: err.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border animate-fade-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-heading font-bold flex items-center gap-2"><Rocket className="w-4 h-4 text-orbitan-blue" /> Create Pilot Tenant</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div><Label className="text-xs">Tenant / Organisation Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. La Birria Tacos Pte Ltd" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Industry</Label>
              <select value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                <option value="food_beverage">Food &amp; Beverage</option><option value="recycling_sustainability">Recycling</option><option value="retail">Retail</option><option value="other">Other</option>
              </select>
            </div>
            <div><Label className="text-xs">Subscription Plan</Label>
              <select value={form.subscription_plan} onChange={e => setForm({ ...form, subscription_plan: e.target.value })} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                <option value="orbitan_starter">Starter</option><option value="orbitan_growth">Growth</option><option value="orbitan_business">Business</option><option value="orbitan_enterprise">Enterprise</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Pilot Duration (days)</Label><Input type="number" value={form.pilot_days} onChange={e => setForm({ ...form, pilot_days: e.target.value })} /></div>
            <div><Label className="text-xs">Contact Email</Label><Input value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} placeholder="admin@tenant.com" /></div>
          </div>
          <div><Label className="text-xs">Contact Name</Label><Input value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-xs pt-1">
            <input type="checkbox" checked={form.is_sandbox} onChange={e => setForm({ ...form, is_sandbox: e.target.checked })} />
            <Shield className="w-3.5 h-3.5 text-orbitan-amber" /> Sandbox tenant (hidden from discovery, safe to hard-delete)
          </label>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="gap-1.5">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />} Create Pilot</Button>
        </div>
      </div>
    </div>
  );
}