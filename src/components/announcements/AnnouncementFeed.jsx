// OrbitanOS — Announcement Feed
// Relate Principle: Worker-facing broadcast feed with priority tinting, acknowledgement, and expiry
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, isAfter } from 'date-fns';
import { Megaphone, Pin, Flame, Info, AlertTriangle, Zap, ChevronDown, ChevronUp, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const PRIORITY_CONFIG = {
  info: {
    icon: Info,
    banner: 'bg-blue-50 border-blue-200 text-blue-900',
    iconColor: 'text-blue-500',
    badge: 'bg-blue-100 text-blue-700',
    label: 'Info',
    bar: 'bg-blue-500',
  },
  important: {
    icon: AlertTriangle,
    banner: 'bg-amber-50 border-amber-200 text-amber-900',
    iconColor: 'text-amber-500',
    badge: 'bg-amber-100 text-amber-700',
    label: 'Important',
    bar: 'bg-amber-500',
  },
  urgent: {
    icon: Flame,
    banner: 'bg-orange-50 border-orange-200 text-orange-900',
    iconColor: 'text-orange-500',
    badge: 'bg-orange-100 text-orange-700',
    label: 'Urgent',
    bar: 'bg-orange-500',
  },
  critical: {
    icon: Zap,
    banner: 'bg-red-50 border-red-200 text-red-900',
    iconColor: 'text-red-600',
    badge: 'bg-red-100 text-red-700',
    label: 'Critical',
    bar: 'bg-red-600',
  },
};

function AnnouncementCard({ announcement, workerId, onAck }) {
  const [expanded, setExpanded] = useState(announcement.priority === 'critical' || announcement.priority === 'urgent');
  const config = PRIORITY_CONFIG[announcement.priority] || PRIORITY_CONFIG.info;
  const Icon = config.icon;
  const alreadyAcknowledged = (announcement.acknowledged_by || []).includes(workerId);
  const timeAgo = formatDistanceToNow(new Date(announcement.created_date), { addSuffix: true });

  return (
    <div className={cn('rounded-2xl border overflow-hidden transition-all', config.banner)}>
      {/* Priority bar */}
      <div className={cn('h-1 w-full', config.bar)} />

      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/60 mt-0.5')}>
            <Icon className={cn('w-4 h-4', config.iconColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {announcement.pinned && <Pin className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                <p className="text-sm font-bold leading-snug">{announcement.title}</p>
              </div>
              <button onClick={() => setExpanded(e => !e)} className="flex-shrink-0 p-0.5 rounded hover:bg-black/10">
                {expanded ? <ChevronUp className="w-4 h-4 opacity-50" /> : <ChevronDown className="w-4 h-4 opacity-50" />}
              </button>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', config.badge)}>{config.label}</span>
              <span className="text-[10px] opacity-60 capitalize">{announcement.category}</span>
              <span className="text-[10px] opacity-50">{timeAgo}</span>
              {announcement.published_by_name && (
                <span className="text-[10px] opacity-50">· {announcement.published_by_name}</span>
              )}
            </div>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 ml-11 space-y-3 animate-fade-in">
            <p className="text-sm opacity-80 leading-relaxed">{announcement.message}</p>
            {announcement.requires_acknowledgement && !alreadyAcknowledged && (
              <Button
                size="sm"
                className="gap-1.5 h-8 text-xs bg-white/80 hover:bg-white text-foreground border border-black/10"
                onClick={() => onAck(announcement.id)}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Got it
              </Button>
            )}
            {alreadyAcknowledged && (
              <div className="flex items-center gap-1.5 text-[11px] opacity-60">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> You acknowledged this
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnnouncementFeed({ tenantId, workerId, maxItems = 10 }) {
  const queryClient = useQueryClient();

  const { data: rawAnnouncements = [] } = useQuery({
    queryKey: ['announcements', tenantId],
    queryFn: () => base44.entities.Announcement.filter({ tenant_id: tenantId, is_active: true }),
    refetchInterval: 30000, // refresh every 30s
  });

  // Filter: not expired, sort pinned first then by created_date desc
  const now = new Date();
  const announcements = rawAnnouncements
    .filter(a => !a.expiry_date || isAfter(new Date(a.expiry_date), now))
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.created_date) - new Date(a.created_date);
    })
    .slice(0, maxItems);

  const acknowledgeMutation = useMutation({
    mutationFn: async (announcementId) => {
      const ann = rawAnnouncements.find(a => a.id === announcementId);
      const current = ann?.acknowledged_by || [];
      if (current.includes(workerId)) return;
      await base44.entities.Announcement.update(announcementId, {
        acknowledged_by: [...current, workerId],
      });
    },
    onSuccess: () => queryClient.invalidateQueries(['announcements', tenantId]),
  });

  if (announcements.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Megaphone className="w-4 h-4 text-orbitan-blue" />
        <span className="text-sm font-semibold text-foreground">Announcements</span>
        <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded-full">{announcements.length}</span>
      </div>
      {announcements.map(a => (
        <AnnouncementCard
          key={a.id}
          announcement={a}
          workerId={workerId}
          onAck={(id) => acknowledgeMutation.mutate(id)}
        />
      ))}
    </div>
  );
}