import React from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnreadInbox } from '@/hooks/useUnreadInbox';

// OrbitInboxBadge — realtime unread actionable indicator.
// variant: 'topnav' (icon button in header) | 'sidebar' (nav-link style).
export default function OrbitInboxBadge({ variant = 'topnav', className }) {
  const { unreadCount, loading } = useUnreadInbox();

  if (variant === 'sidebar') {
    return (
      <Link
        to="/notifications"
        aria-label={`Orbit Inbox — ${unreadCount} unread items needing action`}
        className={cn(
          'relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150',
          'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40',
          className
        )}
      >
        <Bell className="w-[15px] h-[15px] flex-shrink-0" />
        <span className="flex-1 truncate">Orbit Inbox</span>
        {unreadCount > 0 && (
          <span className="text-[9px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-bold tabular-nums">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Link>
    );
  }

  // topnav variant
  return (
    <Link
      to="/notifications"
      aria-label={`Orbit Inbox — ${unreadCount} unread items needing action`}
      className={cn(
        'relative w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
        className
      )}
    >
      <Bell className="w-[18px] h-[18px]" />
      {!loading && unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-orbitan-red text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 tabular-nums">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}