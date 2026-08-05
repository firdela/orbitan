// ============================================================
// WorkerProfileMenu — Avatar popover with worker-appropriate actions
// Quick navigation only — no admin/platform controls.
// ============================================================
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useUnreadInbox } from '@/hooks/useUnreadInbox';
import {
  ChevronRight, LogOut, Bell, Settings, LifeBuoy,
  User as UserIcon, Building2
} from 'lucide-react';

export default function WorkerProfileMenu({
  workerName = 'Worker',
  workerInitials = '??',
  workerRole = 'worker',
  position = 'Team Member',
  organisationName = '',
  outletName = '',
  onNavigate,
  onSignOut,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const buttonRef = useRef(null);
  const { unreadCount } = useUnreadInbox();

  // Close on outside click
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

  const roleLabel = workerRole === 'tenant_admin' ? 'Admin' :
    workerRole === 'outlet_manager' ? 'Manager' :
    workerRole === 'supervisor' ? 'Supervisor' : 'Team Member';

  const badgeText = unreadCount > 99 ? '99+' : unreadCount > 0 ? String(unreadCount) : '';

  return (
    <>
      {/* Avatar trigger button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen(o => !o)}
        aria-label="Open profile menu"
        aria-expanded={open}
        aria-haspopup="menu"
        className="w-9 h-9 rounded-full orbitan-gradient flex items-center justify-center text-white text-xs font-bold shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all min-h-[44px] min-w-[44px]"
      >
        {workerInitials}
      </button>

      {/* Popover menu */}
      {open && (
        <div
          ref={ref}
          role="menu"
          aria-label="Profile menu"
          className="fixed sm:absolute top-16 sm:top-12 right-0 sm:right-0 z-50 w-full sm:w-72 bg-card border border-border rounded-t-none sm:rounded-2xl shadow-2xl overflow-hidden animate-fade-in max-h-[85vh] overflow-y-auto"
          style={{ marginRight: 'auto', marginLeft: 'auto', maxWidth: '100%' }}
        >
          {/* Identity header */}
          <div className="bg-gradient-to-br from-[#1D4ED8] to-[#111827] p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-base font-bold font-display border-2 border-white/30 flex-shrink-0">
                {workerInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display font-bold text-sm truncate">{workerName}</p>
                <p className="text-white/70 text-xs truncate">{position || roleLabel}</p>
              </div>
            </div>
            {(organisationName || outletName) && (
              <div className="mt-3 space-y-1">
                {organisationName && (
                  <p className="text-[11px] text-white/60 flex items-center gap-1.5">
                    <Building2 className="w-3 h-3" /> {organisationName}
                  </p>
                )}
                {outletName && (
                  <p className="text-[11px] text-white/60 flex items-center gap-1.5">
                    <span className="w-3 h-3 text-center">📍</span> {outletName}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Menu items */}
          <div className="p-2">
            <MenuItem to="/notifications" icon={Bell} label="Notifications" badge={badgeText} />
            <MenuItem to="/settings" icon={Settings} label="Preferences" />
            <MenuItem to="/support" icon={LifeBuoy} label="Help & Support" />
            <button
              onClick={() => { setOpen(false); onNavigate?.('profile'); }}
              role="menuitem"
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/50 transition-colors text-sm font-medium text-foreground min-h-[44px]"
            >
              <UserIcon className="w-4 h-4 text-muted-foreground" />
              <span className="flex-1 text-left">My Profile</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Sign Out */}
          <div className="p-2 border-t border-border">
            <button
              onClick={() => { setOpen(false); onSignOut?.(); }}
              role="menuitem"
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-destructive/5 hover:text-destructive transition-colors text-sm font-semibold text-muted-foreground min-h-[44px]"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function MenuItem({ to, icon: Icon, label, badge }) {
  return (
    <Link
      to={to}
      role="menuitem"
      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/50 transition-colors text-sm font-medium text-foreground min-h-[44px]"
    >
      <Icon className="w-4 h-4 text-muted-foreground" />
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orbitan-red text-white tabular-nums">
          {badge}
        </span>
      )}
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </Link>
  );
}