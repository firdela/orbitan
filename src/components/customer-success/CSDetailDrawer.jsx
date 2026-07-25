import React from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import CSHealthBadge from './CSHealthBadge';
import StatusBadge from '@/components/shared/StatusBadge';
import LoadingState from '@/components/shared/LoadingState';
import { X, Activity, MessageSquare, StickyNote, Flag, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Enhanced detail drawer — tabs for timeline, notes, milestones, feedback
export default function CSDetailDrawer({ selected, detail, detailLoading, onClose, onAddNote, savingNote }) {
  if (!selected) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-2xl bg-background border-l border-border overflow-y-auto shadow-xl" role="dialog" aria-label={`${selected.name} details`}>
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div className="min-w-0">
            <h3 className="font-heading font-bold text-lg truncate">{selected.name}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-muted-foreground">{selected.industry?.replace(/_/g, ' ')} · {selected.plan?.replace('orbitan_', '')}</span>
              <CSHealthBadge tier={selected.health_tier} score={selected.health} />
              <StatusBadge status={selected.status} size="sm" />
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close detail drawer"><X className="w-4 h-4" /></Button>
        </div>

        {/* Summary band */}
        <div className="px-6 py-4 border-b border-border grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Health</p><p className="text-lg font-display font-bold">{selected.health}<span className="text-xs text-muted-foreground">/100</span></p></div>
          <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Onboarding</p><p className="text-lg font-display font-bold">{selected.onboarding_pct}<span className="text-xs text-muted-foreground">%</span></p></div>
          <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Modules</p><p className="text-lg font-display font-bold">{selected.adoption.modules_used}<span className="text-xs text-muted-foreground">/8</span></p></div>
          <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Milestones</p><p className="text-lg font-display font-bold">{selected.milestones_achieved}<span className="text-xs text-muted-foreground">/{selected.milestones_total}</span></p></div>
        </div>

        {/* Tabs */}
        <div className="p-6">
          <Tabs defaultValue="overview">
            <TabsList className="w-full justify-start flex-wrap h-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="timeline" className="gap-1.5"><Activity className="w-3.5 h-3.5" />Timeline</TabsTrigger>
              <TabsTrigger value="notes" className="gap-1.5"><StickyNote className="w-3.5 h-3.5" />Notes</TabsTrigger>
              <TabsTrigger value="milestones" className="gap-1.5"><Flag className="w-3.5 h-3.5" />Milestones</TabsTrigger>
              <TabsTrigger value="feedback" className="gap-1.5"><MessageSquare className="w-3.5 h-3.5" />Feedback</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              <DetailOverview selected={selected} />
            </TabsContent>
            <TabsContent value="timeline" className="mt-4">
              {detailLoading ? <LoadingState message="Loading timeline…" /> : <DetailTimeline detail={detail} />}
            </TabsContent>
            <TabsContent value="notes" className="mt-4">
              {detailLoading ? <LoadingState message="Loading notes…" /> : <DetailNotes detail={detail} onAddNote={onAddNote} savingNote={savingNote} tenantId={selected.tenant_id} />}
            </TabsContent>
            <TabsContent value="milestones" className="mt-4">
              <DetailMilestones milestones={selected.milestones} />
            </TabsContent>
            <TabsContent value="feedback" className="mt-4">
              {detailLoading ? <LoadingState message="Loading feedback…" /> : <DetailFeedback detail={detail} />}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function DetailOverview({ selected }) {
  return (
    <div className="space-y-4">
      {/* Adoption */}
      <div><h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Adoption ({selected.adoption.modules_used}/8 modules)</h4>
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          {[['Inventory', selected.adoption.inventory], ['Sales', selected.adoption.sales], ['Production', selected.adoption.production], ['Shifts', selected.adoption.shifts], ['Tasks', selected.adoption.tasks], ['Employees', selected.adoption.employees], ['Reconciles', selected.adoption.reconciliations], ['Nexus', selected.adoption.nexus_insights]].map(([l, v]) => (
            <div key={l} className="rounded-lg bg-muted/50 py-2"><p className="text-[10px] text-muted-foreground">{l}</p><p className="font-semibold tabular-nums">{v}</p></div>
          ))}
        </div>
      </div>
      {/* Outstanding tasks */}
      {selected.outstanding_setup_tasks.length > 0 && (
        <div><h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Outstanding Setup Tasks</h4>
          <div className="space-y-1.5">{selected.outstanding_setup_tasks.map((t, i) => <div key={i} className="text-sm text-orbitan-amber">• {t}</div>)}</div>
        </div>
      )}
      {/* Meta */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <MetaRow label="CSM" value={selected.csm_name} />
        <MetaRow label="Last Activity" value={selected.last_activity_days == null ? '—' : `${selected.last_activity_days}d ago`} />
        <MetaRow label="Renewal Date" value={selected.renewal_date || '—'} />
        <MetaRow label="Finance Failures" value={String(selected.finance_failures)} />
      </div>
    </div>
  );
}

function MetaRow({ label, value }) {
  return <div className="flex items-center justify-between border border-border rounded-lg px-3 py-2"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>;
}

function DetailTimeline({ detail }) {
  const items = detail?.timeline || [];
  if (!items.length) return <p className="text-sm text-muted-foreground">No timeline events recorded.</p>;
  return <ol className="space-y-2">{items.slice(0, 30).map(ev => (
    <li key={ev.id} className="border-l-2 border-border pl-3"><p className="text-sm font-medium">{ev.title}</p><p className="text-xs text-muted-foreground">{ev.detail}</p><p className="text-[10px] text-muted-foreground">{ev.actor_name} · {new Date(ev.date).toLocaleString()}</p></li>
  ))}</ol>;
}

function DetailNotes({ detail, onAddNote, savingNote, tenantId }) {
  const notes = detail?.notes || [];
  const [quickNote, setQuickNote] = React.useState('');
  return <div className="space-y-3">
    <textarea value={quickNote} onChange={e => setQuickNote(e.target.value)} rows={2} placeholder="Add a quick note…" className="w-full rounded-md border border-input bg-transparent p-3 text-sm" aria-label="Quick note" />
    <Button size="sm" onClick={() => { onAddNote?.(tenantId, quickNote.trim(), 'medium', []); setQuickNote(''); }} disabled={!quickNote.trim() || savingNote} className="gap-1.5">{savingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}Save Note</Button>
    {notes.length === 0 ? <p className="text-sm text-muted-foreground">No notes yet.</p> :
      <div className="space-y-2">{notes.map(n => <div key={n.id} className="border-l-2 border-orbitan-amber/40 pl-3"><p className="text-sm">{n.details}</p><p className="text-[10px] text-muted-foreground">{n.actor_name} · {new Date(n.created_date).toLocaleString()}</p></div>)}</div>}
  </div>;
}

function DetailMilestones({ milestones }) {
  return <div className="space-y-1.5">{milestones.map(m => <div key={m.key} className="flex items-center gap-2 text-sm">{m.achieved ? <Flag className="w-3.5 h-3.5 text-orbitan-green" /> : <Flag className="w-3.5 h-3.5 text-muted-foreground" />}<span className={m.achieved ? 'text-foreground' : 'text-muted-foreground'}>{m.label}</span>{m.date && <span className="text-[10px] text-muted-foreground ml-auto">{new Date(m.date).toLocaleDateString()}</span>}</div>)}</div>;
}

function DetailFeedback({ detail }) {
  const items = detail?.recent_feedback || [];
  if (!items.length) return <p className="text-sm text-muted-foreground">No feedback submitted.</p>;
  return <div className="space-y-1.5">{items.slice(0, 15).map(f => <div key={f.id} className="border border-border rounded-lg px-3 py-2"><p className="text-sm font-medium truncate">{f.title}</p><p className="text-xs text-muted-foreground mt-0.5">{f.type} · {f.severity} · {f.sentiment || '—'}</p></div>)}</div>;
}