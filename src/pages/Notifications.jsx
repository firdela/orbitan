import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import EmptyState from '@/components/shared/EmptyState';
import InboxItem from '@/components/orbit-inbox/InboxItem';
import InboxSummary from '@/components/orbit-inbox/InboxSummary';
import InboxPreferences from '@/components/orbit-inbox/InboxPreferences';
import { ALL_CATEGORIES, CATEGORY_CONFIG } from '@/components/orbit-inbox/inboxConfig';
import { useUnreadInbox } from '@/hooks/useUnreadInbox';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import {
  Inbox, CheckCircle2, Activity, Archive, Search, Settings2,
  Bell, AlertTriangle, ListTodo,
} from 'lucide-react';

const SECTIONS = [
  { key: 'action', label: 'Needs My Action', Icon: AlertTriangle },
  { key: 'activity', label: 'Activity', Icon: Activity },
  { key: 'archived', label: 'Archived', Icon: Archive },
];

export default function NotificationsPage() {
  const [section, setSection] = useState('action');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [prefsOpen, setPrefsOpen] = useState(false);
  const { user } = useAuth();
  const { refresh } = useUnreadInbox();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['orbit-inbox'],
    queryFn: () => base44.entities.OrbitInbox.list('-created_date', 200),
  });

  const sectionItems = useMemo(() => {
    let result;
    if (section === 'action') {
      result = items.filter((i) => i.is_actionable && i.action_state === 'pending' && !i.archived_at);
    } else if (section === 'activity') {
      result = items.filter((i) => !i.is_actionable && !i.archived_at);
    } else {
      result = items.filter((i) => i.archived_at != null || i.action_state !== 'pending');
    }
    // category filter
    if (category !== 'all') result = result.filter((i) => i.category === category);
    // search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((i) => (i.title || '').toLowerCase().includes(q) || (i.body || '').toLowerCase().includes(q));
    }
    // pinned first, then by created_date desc
    return result.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.created_date || 0) - new Date(a.created_date || 0);
    });
  }, [items, section, category, search]);

  const stats = useMemo(() => {
    const active = items.filter((i) => !i.archived_at);
    return {
      total: active.length,
      action: active.filter((i) => i.is_actionable && i.action_state === 'pending').length,
      unread: active.filter((i) => !i.read_at && i.is_actionable && i.action_state === 'pending').length,
      activity: active.filter((i) => !i.is_actionable).length,
    };
  }, [items]);

  const handleAction = useCallback(async (item, action) => {
    const now = new Date().toISOString();
    try {
      if (action === 'read') {
        await base44.entities.OrbitInbox.update(item.id, { read_at: now });
      } else if (action === 'pin') {
        await base44.entities.OrbitInbox.update(item.id, { pinned: !item.pinned });
      } else if (action === 'archive') {
        await base44.entities.OrbitInbox.update(item.id, { archived_at: now });
      } else if (action === 'complete') {
        await base44.entities.OrbitInbox.update(item.id, { action_state: 'completed', read_at: item.read_at || now, archived_at: now });
      } else if (action === 'dismiss') {
        await base44.entities.OrbitInbox.update(item.id, { action_state: 'dismissed', read_at: item.read_at || now, archived_at: now });
      }
      refresh();
    } catch (e) {
      console.error('inbox action failed', e);
    }
  }, [refresh]);

  const markAllRead = async () => {
    const unread = items.filter((i) => !i.read_at && !i.archived_at);
    const now = new Date().toISOString();
    try {
      await base44.entities.OrbitInbox.bulkUpdate(
        unread.map((i) => ({ id: i.id, read_at: now }))
      );
      refresh();
    } catch (e) {
      console.error('mark all read failed', e);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
      <PageHeader
        title="Orbit Inbox"
        subtitle="Your unified operational inbox · Actionable items, activity & AI summaries"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={markAllRead}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border hover:bg-muted"
            >
              Mark all read
            </button>
            <button
              onClick={() => setPrefsOpen(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border hover:bg-muted"
            >
              <Settings2 className="w-3.5 h-3.5" />
              Preferences
            </button>
          </div>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Inbox Total" value={stats.total} subtitle="Active items" icon={Inbox} color="blue" />
        <StatCard title="Needs Action" value={stats.action} subtitle="Pending items" icon={AlertTriangle} color="red" />
        <StatCard title="Unread" value={stats.unread} subtitle="Actionable + unread" icon={Bell} color="amber" />
        <StatCard title="Activity" value={stats.activity} subtitle="Informational" icon={Activity} color="green" />
      </div>

      {/* Orbit Nexus Summary */}
      <InboxSummary items={items} />

      {/* Section tabs */}
      <div className="flex items-center gap-2 mb-5 border-b border-border" role="tablist" aria-label="Inbox sections">
        {SECTIONS.map((s) => {
          const count = s.key === 'action'
            ? items.filter((i) => i.is_actionable && i.action_state === 'pending' && !i.archived_at).length
            : s.key === 'activity'
              ? items.filter((i) => !i.is_actionable && !i.archived_at).length
              : items.filter((i) => i.archived_at != null || i.action_state !== 'pending').length;
          const active = section === s.key;
          return (
            <button
              key={s.key}
              role="tab"
              aria-selected={active}
              onClick={() => setSection(s.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                active
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <s.Icon className="w-4 h-4" />
              {s.label}
              {count > 0 && (
                <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Category filter + search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-1">
          <button
            onClick={() => setCategory('all')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border whitespace-nowrap transition-colors',
              category === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:bg-muted'
            )}
          >
            All
          </button>
          {ALL_CATEGORIES.filter((c) => c !== 'system').map((cat) => {
            const cfg = CATEGORY_CONFIG[cat];
            const active = category === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border whitespace-nowrap transition-colors',
                  active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:bg-muted'
                )}
              >
                <cfg.Icon className="w-3.5 h-3.5" />
                {cfg.label}
              </button>
            );
          })}
        </div>
        <div className="relative sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search inbox…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-input bg-card focus:outline-none focus:ring-1 focus:ring-ring"
            aria-label="Search inbox"
          />
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
          Loading your inbox…
        </div>
      ) : sectionItems.length > 0 ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {sectionItems.map((item) => (
            <InboxItem key={item.id} item={item} onAction={handleAction} />
          ))}
        </div>
      ) : (
        <div className="bg-card border border-dashed border-border rounded-xl">
          <EmptyState
            icon={section === 'action' ? CheckCircle2 : section === 'archived' ? Archive : ListTodo}
            title={
              section === 'action' ? 'Nothing needs your action'
                : section === 'archived' ? 'No archived items'
                  : 'No activity yet'
            }
            description={
              section === 'action'
                ? 'You are all caught up. New approvals, assignments, and compliance items will appear here as they occur.'
                : section === 'archived'
                  ? 'Completed and dismissed items are archived here for your reference.'
                  : 'Operational activity — user joins, inventory updates, module changes — will appear here.'
            }
            color={section === 'action' ? 'green' : 'slate'}
          />
        </div>
      )}

      <InboxPreferences
        open={prefsOpen}
        onOpenChange={setPrefsOpen}
        tenantId={user?.data?.tenant_id}
        userId={user?.id}
      />
    </div>
  );
}