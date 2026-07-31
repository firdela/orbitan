import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useWorkspace } from '@/lib/workspace';
import { Link, useNavigate } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  LogOut, Settings, Bell, Wallet, ScrollText,
  ShieldCheck, LifeBuoy, MessageSquare, Building2, ChevronUp,
  Check, Plus, ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PLATFORM_IDENTITY } from '@/lib/orbitan-config';

const APP_VERSION = `${PLATFORM_IDENTITY.os} v${PLATFORM_IDENTITY.version}`;
const ENV_LABEL = import.meta.env.MODE === 'production' ? 'Production' : 'Preview';
const ENV_BADGE =
  ENV_LABEL === 'Production'
    ? 'bg-orbitan-green-light text-orbitan-green-700'
    : 'bg-orbitan-amber-light text-orbitan-amber-700';

const ROLE_LABELS = {
  tenant_admin: 'Tenant Admin',
  outlet_manager: 'Outlet Manager',
  supervisor: 'Supervisor',
  worker: 'Worker',
  client_manager: 'Client Manager',
  admin: 'Platform Admin',
};

/**
 * UserMenu — concise account-navigation menu (Build #27).
 * variant: "sidebar" (dark rail) | "light" (light bg) | "dark" (marketing dark bg)
 *
 * Every menu item is click-validated and routes to a canonical destination.
 * Switch Workspace uses the canonical switchWorkspace() from useWorkspace().
 */
export default function UserMenu({ variant = 'sidebar', className }) {
  const { user } = useAuth();
  const { tenant, activeRole, memberships, activeMembership, switchWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

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

  const handleSwitchWorkspace = (membership) => {
    const ok = switchWorkspace(membership.organisation_id);
    setOpen(false);
    if (ok) {
      navigate(`/workspace/${membership.organisation_id}/dashboard`, { replace: true });
    }
  };

  const itemClass =
    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-full';
  const labelClass = 'px-3 pt-2.5 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold';

  const roleLabel = activeRole || user?.role || '—';
  const roleDisplay = ROLE_LABELS[roleLabel] || String(roleLabel).replace(/_/g, ' ');
  const tenantLabel = tenant?.name || 'No workspace';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Account menu for ${displayName}`}
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
        className={cn('w-72 p-0', isSidebar && 'mb-2')}
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

        <div className="p-1.5 max-h-[70vh] overflow-y-auto">
          {/* ── Account ── */}
          <p className={labelClass} role="heading" aria-level={3}>Account</p>
          <Link to="/settings" className={itemClass} onClick={() => setOpen(false)}>
            <Settings className="w-4 h-4 flex-shrink-0" /> <span className="flex-1">Settings</span>
          </Link>
          <Link to="/notifications" className={itemClass} onClick={() => setOpen(false)}>
            <Bell className="w-4 h-4 flex-shrink-0" /> <span className="flex-1">Notifications</span>
          </Link>

          {/* ── Workspace ── */}
          <p className={labelClass} role="heading" aria-level={3}>Workspace</p>
          {memberships.length === 0 ? (
            <div className="px-3 py-2 space-y-1.5">
              <p className="text-xs text-muted-foreground">No workspaces joined.</p>
              <Link to="/request-access" className={itemClass} onClick={() => setOpen(false)}>
                <Plus className="w-4 h-4 flex-shrink-0" /> <span className="flex-1">Request Access</span>
              </Link>
            </div>
          ) : memberships.length === 1 ? (
            <div className="px-3 py-2 flex items-center gap-2.5 rounded-lg bg-accent/50">
              <Building2 className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
              <span className="flex-1 text-sm text-foreground truncate">
                {memberships[0].display_name || 'Single workspace'}
              </span>
              <Check className="w-3.5 h-3.5 flex-shrink-0 text-orbitan-blue" />
            </div>
          ) : (
            <div className="space-y-0.5" role="group" aria-label="Switch workspace">
              {memberships.slice(0, 5).map((m) => {
                const isActive = activeMembership?.organisation_id === m.organisation_id;
                return (
                  <button
                    key={m.organisation_id}
                    type="button"
                    onClick={() => handleSwitchWorkspace(m)}
                    aria-current={isActive ? 'true' : undefined}
                    className={cn(itemClass, isActive && 'bg-accent text-foreground')}
                  >
                    <Building2 className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 text-left truncate">{m.display_name || 'Unnamed Workspace'}</span>
                    {isActive
                      ? <Check className="w-3.5 h-3.5 flex-shrink-0 text-orbitan-blue" />
                      : <ArrowRight className="w-3 h-3 flex-shrink-0 text-muted-foreground/40" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Platform (admin only) ── */}
          {isAdmin && (
            <>
              <p className={labelClass} role="heading" aria-level={3}>Platform</p>
              <Link to="/platform/wallet" className={itemClass} onClick={() => setOpen(false)}>
                <Wallet className="w-4 h-4 flex-shrink-0" /> <span className="flex-1">Orbit Wallet</span>
              </Link>
              <Link to="/audit-centre" className={itemClass} onClick={() => setOpen(false)}>
                <ScrollText className="w-4 h-4 flex-shrink-0" /> <span className="flex-1">Audit Logs</span>
              </Link>
              <Link to="/leader-org" className={itemClass} onClick={() => setOpen(false)}>
                <ShieldCheck className="w-4 h-4 flex-shrink-0" /> <span className="flex-1">Platform Console</span>
              </Link>
            </>
          )}

          {/* ── Support ── */}
          <p className={labelClass} role="heading" aria-level={3}>Support</p>
          <Link to="/knowledge-hub" className={itemClass} onClick={() => setOpen(false)}>
            <LifeBuoy className="w-4 h-4 flex-shrink-0" /> <span className="flex-1">Help Centre</span>
          </Link>
          <Link to={tenant?.id ? `/workspace/${tenant.id}/feedback` : '/workspace'} className={itemClass} onClick={() => setOpen(false)}>
            <MessageSquare className="w-4 h-4 flex-shrink-0" /> <span className="flex-1">Send Feedback</span>
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
              <span>{roleDisplay}</span>
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}