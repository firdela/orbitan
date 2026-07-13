import React from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, User, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * UserMenu — reusable profile popover with sign-out.
 * variant: "sidebar" (dark rail) | "light" (light bg) | "dark" (marketing dark bg)
 */
export default function UserMenu({ variant = 'sidebar', className }) {
  const { user } = useAuth();
  const userInitial = user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?';
  const displayName = user?.full_name || 'User';
  const displayEmail = user?.email || '';
  const initials = displayName
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  const isSidebar = variant === 'sidebar';
  const isDark = variant === 'dark';

  const triggerText = isSidebar ? 'text-sidebar-foreground/50 hover:text-sidebar-foreground' : isDark ? 'text-white/70 hover:text-white' : 'text-muted-foreground hover:text-foreground';
  const avatarBg = isSidebar ? 'bg-sidebar-accent text-sidebar-foreground/70' : 'bg-primary text-primary-foreground';

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
          <span className="flex-1 text-[11px] truncate text-left">
            {displayEmail || displayName}
          </span>
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

        {/* Menu Items */}
        <div className="p-1.5">
          <a
            href="/worker"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
          >
            <User className="w-4 h-4" />
            My Profile
          </a>
          <button
            type="button"
            onClick={() => base44.auth.logout()}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}