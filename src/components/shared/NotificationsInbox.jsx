// ============================================================
// ORBITAN — Unified Notifications Inbox
// Surfaces alerts from: ReplenishmentAlert, ComplianceRecord, Task
// EXIT-READY: Pure React + base44 SDK. No external dependencies.
// ============================================================

import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, isPast, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { Bell, AlertTriangle, Shield, CheckSquare, Package, X, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const TYPE_CONFIG = {
  replenishment: {
    icon: Package,
    color: 'text-orbitan-amber',
    bg: 'bg-orbitan-amber-light',
    border: 'border-amber-200',
    label: 'Low Stock',
  },
  compliance: {
    icon: Shield,
    color: 'text-orbitan-red',
    bg: 'bg-orbitan-red-light',
    border: 'border-red-200',
    label: 'Compliance',
  },
  task: {
    icon: CheckSquare,
    color: 'text-orbitan-blue',
    bg: 'bg-orbitan-blue-light',
    border: 'border-blue-200',
    label: 'Task',
  },
};

function NotificationItem({ item, onDismiss }) {
  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.task;
  const Icon = cfg.icon;
  return (
    <div className={cn('flex items-start gap-3 p-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors', item.dismissed && 'opacity-40')}>
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', cfg.bg)}>
        <Icon className={cn('w-4 h-4', cfg.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-tight">{item.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', cfg.bg, cfg.color)}>
            {cfg.label}
          </span>
          {item.urgency === 'critical' && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orbitan-red-light text-orbitan-red">
              Critical
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">{item.time}</span>
        </div>
      </div>
      <button
        onClick={() => onDismiss(item.id)}
        className="text-muted-foreground hover:text-foreground transition-colors p-1 flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function NotificationsInbox({ tenantSlug = 't1', className }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(new Set());

  useEffect(() => {
    if (!open) return;
    setLoading(true);

    const fetchAll = async () => {
      const items = [];
      try {
        const alerts = await base44.entities.ReplenishmentAlert.filter({ status: 'open' });
        alerts.forEach(a => items.push({
          id: `ra-${a.id}`,
          type: 'replenishment',
          title: `Low stock: ${a.inventory_item_name}`,
          subtitle: `${a.current_stock} units left · ${a.days_until_stockout ?? '?'} days to stockout`,
          urgency: a.urgency,
          time: a.alert_date ? format(new Date(a.alert_date), 'd MMM') : 'Today',
          link: `/${tenantSlug}/inventory`,
        }));
      } catch (_) {}

      try {
        const records = await base44.entities.ComplianceRecord.filter({ status: 'overdue' });
        records.forEach(r => items.push({
          id: `cr-${r.id}`,
          type: 'compliance',
          title: `Overdue compliance: ${r.title}`,
          subtitle: `${r.type} · Due ${r.due_date ? format(new Date(r.due_date), 'd MMM yyyy') : '—'}`,
          urgency: 'high',
          time: r.due_date ? format(new Date(r.due_date), 'd MMM') : '',
          link: `/${tenantSlug}/compliance`,
        }));
      } catch (_) {}

      try {
        const tasks = await base44.entities.Task.filter({ status: 'overdue' });
        tasks.forEach(t => items.push({
          id: `tk-${t.id}`,
          type: 'task',
          title: `Overdue task: ${t.title}`,
          subtitle: `Priority: ${t.priority} · Due ${t.due_date ? format(new Date(t.due_date), 'd MMM') : '—'}`,
          urgency: t.priority === 'urgent' ? 'critical' : 'medium',
          time: t.due_date ? format(new Date(t.due_date), 'd MMM') : '',
          link: `/${tenantSlug}/tasks`,
        }));
      } catch (_) {}

      setNotifications(items);
      setLoading(false);
    };

    fetchAll();
  }, [open, tenantSlug]);

  const visible = notifications.filter(n => !dismissed.has(n.id));
  const unread = visible.length;

  const handleDismiss = (id) => setDismissed(prev => new Set([...prev, id]));
  const dismissAll = () => setDismissed(new Set(notifications.map(n => n.id)));

  return (
    <div className={cn('relative', className)}>
      {/* Bell trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-orbitan-red text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-80 sm:w-96 bg-popover border border-border rounded-xl shadow-xl overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <span className="font-heading font-semibold text-sm">Notifications</span>
                {unread > 0 && <Badge className="text-[10px] px-1.5 py-0 h-4">{unread}</Badge>}
              </div>
              {unread > 0 && (
                <button onClick={dismissAll} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Dismiss all
                </button>
              )}
            </div>

            {/* Content */}
            <div className="max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="py-8 text-center">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-muted-foreground mt-2">Loading alerts…</p>
                </div>
              ) : visible.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                  <p className="text-sm text-muted-foreground">All clear — no alerts</p>
                </div>
              ) : (
                visible.map(item => (
                  <NotificationItem key={item.id} item={item} onDismiss={handleDismiss} />
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-border bg-muted/20">
              <p className="text-[10px] text-muted-foreground text-center">
                Showing replenishment alerts, overdue compliance & tasks
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}