import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import EmptyState from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils';
import {
  Bell, PackageX, ListTodo, Megaphone, Loader2, AlertTriangle,
  CheckCircle2, Clock,
} from 'lucide-react';

const PRIORITY_STYLES = {
  critical: { badge: 'bg-orbitan-red-light text-orbitan-red', label: 'Critical' },
  urgent: { badge: 'bg-orbitan-red-light text-orbitan-red', label: 'Urgent' },
  high: { badge: 'bg-orbitan-amber-light text-orbitan-amber', label: 'High' },
  important: { badge: 'bg-orbitan-amber-light text-orbitan-amber', label: 'Important' },
  medium: { badge: 'bg-orbitan-blue-light text-orbitan-blue', label: 'Medium' },
  info: { badge: 'bg-muted text-muted-foreground', label: 'Info' },
  low: { badge: 'bg-muted text-muted-foreground', label: 'Low' },
};

function resolvePriority(priority) {
  return PRIORITY_STYLES[priority] || PRIORITY_STYLES.info;
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const FILTERS = [
  { key: 'all', label: 'All', icon: Bell },
  { key: 'system', label: 'System Updates', icon: Megaphone },
  { key: 'inventory', label: 'Inventory Alerts', icon: PackageX },
  { key: 'tasks', label: 'Task Assignments', icon: ListTodo },
];

const TYPE_STYLE = {
  system: { wrap: 'bg-orbitan-blue-light', icon: 'text-orbitan-blue', Icon: Megaphone },
  inventory: { wrap: 'bg-orbitan-amber-light', icon: 'text-orbitan-amber', Icon: PackageX },
  tasks: { wrap: 'bg-orbitan-purple-light', icon: 'text-orbitan-purple', Icon: ListTodo },
};

export default function NotificationsPage() {
  const [filter, setFilter] = useState('all');

  const { data: announcements = [], isLoading: annLoading } = useQuery({
    queryKey: ['notifications-announcements'],
    queryFn: () => base44.entities.Announcement.list('-created_date', 50),
  });

  const { data: alerts = [], isLoading: alertLoading } = useQuery({
    queryKey: ['notifications-alerts'],
    queryFn: () => base44.entities.ReplenishmentAlert.list('-created_date', 50),
  });

  const { data: tasks = [], isLoading: taskLoading } = useQuery({
    queryKey: ['notifications-tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 50),
  });

  const loading = annLoading || alertLoading || taskLoading;

  const activeAnnouncements = useMemo(
    () => announcements.filter(a => a.is_active !== false),
    [announcements]
  );
  const openAlerts = useMemo(
    () => alerts.filter(a => a.status === 'open' || a.status === 'po_created'),
    [alerts]
  );
  const pendingTasks = useMemo(
    () => tasks.filter(t => t.status === 'pending' || t.status === 'in_progress' || t.status === 'overdue'),
    [tasks]
  );

  const feed = useMemo(() => {
    const items = [];
    activeAnnouncements.forEach(a => items.push({
      id: `ann-${a.id}`, type: 'system', priority: a.priority, title: a.title,
      message: a.message, meta: a.published_by_name, time: a.created_date,
    }));
    openAlerts.forEach(a => items.push({
      id: `alert-${a.id}`, type: 'inventory', priority: a.urgency,
      title: `${a.inventory_item_name || 'Inventory item'} — low stock`,
      message: [
        `Current: ${a.current_stock ?? 0}`,
        a.reorder_point != null ? `Reorder at: ${a.reorder_point}` : null,
        a.days_until_stockout != null ? `Stockout in ${a.days_until_stockout}d` : null,
      ].filter(Boolean).join(' · '),
      meta: a.supplier_name, time: a.alert_date || a.created_date,
    }));
    pendingTasks.forEach(t => items.push({
      id: `task-${t.id}`, type: 'tasks', priority: t.priority, title: t.title,
      message: t.description || (t.module_context ? `Module: ${t.module_context}` : 'Task assigned to you'),
      meta: t.assigned_to_name, time: t.created_date, due: t.due_date,
    }));
    items.sort((x, y) => new Date(y.time || 0) - new Date(x.time || 0));
    return items;
  }, [activeAnnouncements, openAlerts, pendingTasks]);

  const filtered = filter === 'all' ? feed : feed.filter(i => i.type === filter);
  const urgentCount = feed.filter(i => ['critical', 'urgent'].includes(i.priority)).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
      <PageHeader title="Notifications" subtitle="System updates, inventory alerts & task assignments · Respond principle" />

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2.5">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading notifications…</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard title="Total Alerts" value={feed.length} subtitle="Across all outlets" icon={Bell} color="blue" />
            <StatCard title="Urgent" value={urgentCount} subtitle="Need attention" icon={AlertTriangle} color="red" />
            <StatCard title="Inventory Alerts" value={openAlerts.length} subtitle="Low / reorder" icon={PackageX} color="amber" />
            <StatCard title="Pending Tasks" value={pendingTasks.length} subtitle="Awaiting action" icon={ListTodo} color="purple" />
          </div>

          <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
            {FILTERS.map(f => {
              const count = f.key === 'all' ? feed.length : feed.filter(i => i.type === f.key).length;
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  <f.icon className="w-3.5 h-3.5" />
                  {f.label}
                  <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-bold", active ? "bg-primary-foreground/20" : "bg-muted")}>{count}</span>
                </button>
              );
            })}
          </div>

          {filtered.length > 0 ? (
            <div className="space-y-2.5">
              {filtered.map(item => {
                const p = resolvePriority(item.priority);
                const ts = TYPE_STYLE[item.type];
                return (
                  <div key={item.id} className="bg-card border border-border rounded-xl p-4 flex gap-3.5 hover:shadow-sm transition-shadow">
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", ts.wrap)}>
                      <ts.Icon className={cn("w-4 h-4", ts.icon)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <h4 className="font-medium text-sm text-foreground">{item.title}</h4>
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0", p.badge)}>{p.label}</span>
                      </div>
                      {item.message && <p className="text-xs text-muted-foreground leading-relaxed mb-1.5">{item.message}</p>}
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                        {item.meta && <span className="truncate max-w-[12rem]">{item.meta}</span>}
                        {item.due && (
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Due {item.due.slice(0, 10)}</span>
                        )}
                        {item.time && <span>{timeAgo(item.time)}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-card border border-dashed border-border rounded-xl">
              <EmptyState
                icon={CheckCircle2}
                title="You're all caught up"
                description="No notifications match this filter. New system updates, inventory alerts, and task assignments will appear here as they occur."
                color="green"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}