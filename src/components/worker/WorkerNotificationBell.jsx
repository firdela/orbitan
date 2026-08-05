// ============================================================
// WorkerNotificationBell — Canonical Worker notification bell.
// Desktop/tablet: compact Orbit Inbox preview popover.
// Mobile: navigates directly to /notifications (full Orbit Inbox).
// Uses useUnreadInbox for the canonical unread count (RLS-scoped).
// Uses TanStack Query for preview items (lazy — only fetches when open).
// ============================================================
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUnreadInbox } from '@/hooks/useUnreadInbox';
import { getCategoryConfig } from '@/components/orbit-inbox/inboxConfig';
import { resolveWorkerNotificationRoute, isSafeWorkerLink } from '@/lib/worker/notification-routing';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Bell, ChevronRight, CheckCheck } from 'lucide-react';

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

export default function WorkerNotificationBell({ onNavigate }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef(null);
  const buttonRef = useRef(null);
  const { unreadCount, loading, refresh: refreshUnread } = useUnreadInbox();
  const queryClient = useQueryClient();

  // Recent items for preview — lazy: only fetches when popover is open.
  // Uses a dedicated preview key to avoid loading 200 items just for the bell.
  const { data: recentItems = [] } = useQuery({
    queryKey: ['orbit-inbox-preview'],
    queryFn: () => base44.entities.OrbitInbox.list('-created_date', 10),
    enabled: open && !isMobile,
    staleTime: 30 * 1000,
  });

  const previewItems = (recentItems || [])
    .filter(i => !i.archived_at && !i.read_at)
    .slice(0, 5);

  // Close on outside click + Escape
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target) &&
          buttonRef.current && !buttonRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleKey(e) {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const handleBellClick = () => {
    if (isMobile) {
      navigate('/notifications');
    } else {
      setOpen(o => !o);
    }
  };

  const handleItemClick = (item) => {
    const route = resolveWorkerNotificationRoute(item);
    if (route && route.type === 'worker_section' && route.section && onNavigate) {
      onNavigate(route.section);
      setOpen(false);
    } else if (item.link && isSafeWorkerLink(item.link)) {
      navigate(item.link);
      setOpen(false);
    } else {
      navigate('/notifications');
      setOpen(false);
    }
  };

  const markAllRead = async () => {
    const unread = (recentItems || []).filter(i => !i.read_at && !i.archived_at);
    if (unread.length === 0) return;
    const now = new Date().toISOString();
    try {
      await base44.entities.OrbitInbox.bulkUpdate(
        unread.map(i => ({ id: i.id, read_at: now }))
      );
      queryClient.invalidateQueries({ queryKey: ['orbit-inbox-preview'] });
      queryClient.invalidateQueries({ queryKey: ['orbit-inbox'] });
      refreshUnread();
    } catch {
      // silent — error doesn't block UX
    }
  };

  const badgeText = unreadCount > 99 ? '99+' : unreadCount > 0 ? String(unreadCount) : '';
  const ariaLabel = unreadCount > 0
    ? `Notifications — ${unreadCount} unread`
    : 'Notifications';

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleBellClick}
        aria-label={ariaLabel}
        className="relative w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-h-[44px] min-w-[44px]"
      >
        <Bell className="w-[18px] h-[18px]" />
        {!loading && badgeText && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-orbitan-red text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 tabular-nums border-2 border-background">
            {badgeText}
          </span>
        )}
      </button>

      {open && !isMobile && (
        <div
          ref={ref}
          role="dialog"
          aria-label="Notification preview"
          className="absolute right-0 top-10 z-50 w-80 sm:w-96 bg-popover border border-border rounded-xl shadow-xl overflow-hidden animate-fade-in"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="font-heading font-semibold text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 min-h-[44px]"
                aria-label="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Content */}
          <div className="max-h-[400px] overflow-y-auto">
            {previewItems.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold text-foreground">You&rsquo;re all caught up.</p>
                <p className="text-xs text-muted-foreground mt-1">No unread Worker notifications.</p>
              </div>
            ) : (
              previewItems.map(item => {
                const cat = getCategoryConfig(item.category);
                const Icon = cat.Icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className="w-full flex items-start gap-3 p-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors text-left"
                  >
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', cat.bg)}>
                      <Icon className={cn('w-4 h-4', cat.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground leading-tight line-clamp-2">{item.title}</p>
                      {item.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.body}</p>}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={cn('text-[10px] font-semibold', cat.color)}>{cat.label}</span>
                        <span className="text-[10px] text-muted-foreground">{timeAgo(item.created_date)}</span>
                      </div>
                    </div>
                    {!item.read_at && (
                      <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" aria-label="Unread" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border bg-muted/20">
            <button
              onClick={() => { navigate('/notifications'); setOpen(false); }}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors min-h-[44px]"
            >
              View all in Orbit Inbox
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}