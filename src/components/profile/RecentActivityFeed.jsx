import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ScrollText, Clock, ShieldAlert, FileCheck, Package } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const MODULE_ICONS = {
  finance: FileCheck,
  inventory: Package,
  procurement: Package,
  workforce: Clock,
  compliance: ShieldAlert,
  scheduling: Clock,
  system: ScrollText,
};

// ── Recent Activity Feed ────────────────────────────────────
// Queries AuditLog for the current user's recent actions across
// all tenants, rendered as a compact timeline.
// ─────────────────────────────────────────────────────────────
export default function RecentActivityFeed({ limit = 8 }) {
  const { user } = useAuth();
  const userId = user?.id;

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['profile-recent-activity', userId],
    queryFn: () =>
      base44.entities.AuditLog.filter({ actor_id: userId }, '-created_date', limit),
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 gap-2 text-xs text-muted-foreground">
        <Clock className="w-3.5 h-3.5 animate-spin" />
        Loading activity...
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="py-6 text-center">
        <ScrollText className="w-7 h-7 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">No recent activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 -mx-3">
      {logs.map((log, idx) => {
        const Icon = MODULE_ICONS[log.module] || ScrollText;
        return (
          <div key={log.id} className="flex items-start gap-2.5 px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors">
            <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center flex-shrink-0 mt-0.5">
              <Icon className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {log.details || log.action_type?.replace(/_/g, ' ')}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {log.created_date && formatDistanceToNow(new Date(log.created_date), { addSuffix: true })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}