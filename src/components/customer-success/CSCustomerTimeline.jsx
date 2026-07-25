import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import EmptyState from '@/components/shared/EmptyState';
import LoadingState from '@/components/shared/LoadingState';
import { History, MessageSquare, Activity, StickyNote, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';

const TYPE_META = {
  feedback: { icon: MessageSquare, color: 'text-orbitan-blue', bg: 'bg-orbitan-blue-light' },
  activity: { icon: Activity, color: 'text-orbitan-green', bg: 'bg-orbitan-green-light' },
  note: { icon: StickyNote, color: 'text-orbitan-amber', bg: 'bg-orbitan-amber-light' },
  milestone: { icon: Flag, color: 'text-orbitan-purple', bg: 'bg-orbitan-purple-light' },
};

// Section 6 — Customer Timeline: unified timeline for selected tenant (requires selection)
export default function CSCustomerTimeline({ selected, detail, detailLoading, milestones }) {
  const timeline = useMemo(() => {
    const items = [...(detail?.timeline || [])];
    for (const m of (milestones || [])) {
      if (m.achieved && m.date) {
        items.push({ id: `ms-${m.key}`, type: 'milestone', title: m.label, detail: 'Milestone achieved', actor_name: '—', date: m.date, icon: 'milestone' });
      }
    }
    return items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [detail, milestones]);

  if (!selected) {
    return <EmptyState icon={History} title="Select a customer" description="Choose a customer from the overview to view their unified activity timeline — onboarding, support, compliance, notes, and milestones." color="blue" size="large" />;
  }
  if (detailLoading) return <LoadingState message="Loading timeline…" size="lg" />;
  if (detail?.error) return <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">{detail.error}</div>;

  if (timeline.length === 0) {
    return <EmptyState icon={History} title="No timeline events" description={`No recorded activity for ${selected.name} yet.`} color="slate" />;
  }

  return (
    <div className="animate-fade-in">
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4"><History className="w-4 h-4 text-orbitan-blue" /><h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{selected.name} — Unified Timeline</h3></div>
        <ol className="relative border-l-2 border-border ml-3 space-y-4">
          {timeline.map(ev => {
            const meta = TYPE_META[ev.type] || TYPE_META.activity;
            const Icon = meta.icon;
            return (
              <li key={ev.id} className="ml-4">
                <span className={cn('absolute -left-[9px] flex items-center justify-center w-4 h-4 rounded-full ring-2 ring-background', meta.bg)}>
                  <Icon className={cn('w-2.5 h-2.5', meta.color)} />
                </span>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{ev.title}</p>
                    {ev.detail && <p className="text-xs text-muted-foreground mt-0.5">{ev.detail}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">{ev.actor_name || '—'} · {ev.date ? new Date(ev.date).toLocaleString() : '—'}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
}