import React from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useWorkspace } from '@/lib/workspace';
import { Link } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  LogOut, User, Settings, Bell, Link2, LayoutGrid, Wallet, ScrollText,
  ShieldCheck, LifeBuoy, MessageSquare, Building2, ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const APP_VERSION = 'OrbitanOS v1.0 RC';
// Honest runtime environment: published builds run in production mode;
// the Base44 editor preview is the only non-production runtime.
const ENV_LABEL = import.meta.env.MODE === 'production' ? 'Production' : 'Preview';
const ENV_BADGE =
  ENV_LABEL === 'Production'
    ? 'bg-orbitan-green-light text-orbitan-green-700'
    : 'bg-orbitan-amber-light text-orbitan-amber-700';

/**
 * UserMenu — concise account-navigation menu (Build #26A.1).
 * variant: "sidebar" (dark rail) | "light" (light bg) | "dark" (marketing dark bg)
 *
 * Only primary destinations live here; Security, Sessions, Theme, Language,
 * Accessibility, MFA, Privacy, etc. are reached via Account Settings — not
 * duplicated in this dropdown. Fits the viewport with no internal scrollbar.
 */
export default function UserMenu({ variant = 'sidebar', className }) {
  const { user } = useAuth();
  const { tenant, activeRole } = useWorkspace();
  const isAdmin = user?.role === 'admin';
  const displayName = user?.full_name || 'User';
  const displayEmail = user?.email || '';
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  const isSidebar = variant === 'sidebar';
  const isDark = variant === 'dark';

  const triggerText = isSidebar
    ? 'text-sidebar-foreground/50 hover:text-sidebar-foreground'
    : isDark
    ? 'text-white/70 hover:text-white'
    : 'text-muted-foreground hover:text-foreground';
  const avatarBg = isSidebar ? 'bg-sidebar-accent text-sidebar-foreground/70' : 'bg-primary text-primary-foreground';

  const handleSignOut = () => {
    base44.auth.logout('/');
  };

  const itemClass =
    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';
  const labelClass = 'px-3 pt-2.5 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold';

  const roleLabel = activeRole || user?.role || '—';
  const tenantLabel = tenant?.name || 'No workspace';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'w-full flex items-center gap-2 pt-2 border-t transition-colors',
            isSidebar ? 'border-sidebar-border/40 px-0' : 'border-border/60 px-2 py-2 rounded-lg',
            isDark && 'border-white/10',
            triggerText,
            className
          )}
        >
          <Avatar className={cn('w-7 h-7 flex-shrink-0', avatarBg)}>
            <AvatarFallback className={cn('text-[11px] font-semibold', avatarBg)}>{initials}</AvatarFallback>
          </Avatar>
          <span className="flex-1 text-[11px] truncate text-left">{displayEmail || displayName}</span>
          <ChevronUp className={cn('w-3.5 h-3.5 flex-shrink-0', isSidebar ? 'text-sidebar-foreground/40' : isDark ? 'text-white/40' : 'text-muted-foreground/60')} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="top"
        sideOffset={8}
        className={cn('w-64 p-0', isSidebar && 'mb-2')}
      >
        {/* Profile Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <Avatar className="w-10 h-10 bg-primary text-primary-foreground flex-shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
          </div>
        </div>

        {/* Concise menu — fits viewport, no internal scroll */}
        <div className="p-1.5">
          {/* ── Account ── */}
          <p className={labelClass}>Account</p>
          <Link to="/settings" className={itemClass}>
            <User className="w-4 h-4" /> My Profile
          </Link>
          <Link to="/settings" className={itemClass}>
            <Settings className="w-4 h-4" /> Account Settings
          </Link>
          <Link to="/notifications" className={itemClass}>
            <Bell className="w-4 h-4" /> Notifications
          </Link>

          {/* ── Workspace ── */}
          <p className={labelClass}>Workspace</p>
          <Link to="/workspace" className={itemClass}>
            <LayoutGrid className="w-4 h-4" /> Switch Workspace
          </Link>
          <Link to="/platform/integrations" className={itemClass}>
            <Link2 className="w-4 h-4" /> Connected Accounts
          </Link>

          {/* ── Platform (admin only) ── */}
          {isAdmin && (
            <>
              <p className={labelClass}>Platform</p>
              <Link to="/platform/wallet" className={itemClass}>
                <Wallet className="w-4 h-4" /> Orbit Wallet
              </Link>
              <Link to="/audit-centre" className={itemClass}>
                <ScrollText className="w-4 h-4" /> Audit Logs
              </Link>
              <Link to="/platform/integrations" className={itemClass}>
                <ShieldCheck className="w-4 h-4" /> Platform Settings
              </Link>
            </>
          )}

          {/* ── Support ── */}
          <p className={labelClass}>Support</p>
          <Link to="/knowledge-hub" className={itemClass}>
            <LifeBuoy className="w-4 h-4" /> Help Centre
          </Link>
          <Link to="/feedback" className={itemClass}>
            <MessageSquare className="w-4 h-4" /> Send Feedback
          </Link>
        </div>

        {/* Sign Out */}
        <div className="p-1.5 border-t border-border">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>

        {/* Compact one-line footer — version · env · workspace · role */}
        <div className="px-3 py-2 border-t border-border bg-muted/40 rounded-b-md">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-medium text-foreground/70 truncate">{APP_VERSION}</span>
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0', ENV_BADGE)}>
              {ENV_LABEL}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1 min-w-0">
              <Building2 className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="truncate">{tenantLabel}</span>
            </span>
            <span className="flex items-center gap-1 flex-shrink-0">
              <ShieldCheck className="w-2.5 h-2.5" />
              <span className="capitalize">{String(roleLabel).replace(/_/g, ' ')}</span>
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}