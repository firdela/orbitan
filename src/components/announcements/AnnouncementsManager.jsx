// OrbitanOS — Announcements Manager
// Admin panel tab for managing broadcasts — used inside LeaderOrg
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, isAfter } from 'date-fns';
import { Megaphone, Plus, Trash2, Pin, PinOff, Eye, CheckCircle2, Clock, Flame, Info, AlertTriangle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BroadcastComposer from './BroadcastComposer';
import { cn } from '@/lib/utils';

const PRIORITY_CONFIG = {
  info:      { icon: Info,          badge: 'bg-blue-100 text-blue-700',   label: 'Info' },
  important: { icon: AlertTriangle, badge: 'bg-amber-100 text-amber-700', label: 'Important' },
  urgent:    { icon: Flame,         badge: 'bg-orange-100 text-orange-700', label: 'Urgent' },
  critical:  { icon: Zap,           badge: 'bg-red-100 text-red-700',     label: 'Critical' },
};

export default function AnnouncementsManager({ tenantId, publisherName, publisherRole }) {
  const queryClient = useQueryClient();
  const [composerOpen, setComposerOpen] = useState(false);

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements-admin', tenantId],
    queryFn: () => base44.entities.Announcement.filter({ tenant_id: tenantId }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Announcement.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['announcements-admin', tenantId]),
  });

  const togglePinMutation = useMutation({
    mutationFn: ({ id, pinned }) => base44.entities.Announcement.update(id, { pinned: !pinned }),
    onSuccess: () => queryClient.invalidateQueries(['announcements-admin', tenantId]),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.Announcement.update(id, { is_active: !is_active }),
    onSuccess: () => queryClient.invalidateQueries(['announcements-admin', tenantId]),
  });

  const now = new Date();
  const active = announcements.filter(a => a.is_active && (!a.expiry_date || isAfter(new Date(a.expiry_date), now)));
  const expired = announcements.filter(a => !a.is_active || (a.expiry_date && !isAfter(new Date(a.expiry_date), now)));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading font-bold text-base flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-orbitan-blue" /> Broadcast Centre
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Relate Principle · Push announcements to your workforce</p>
        </div>
        <Button size="sm" className="gap-1.5 h-8" onClick={() => setComposerOpen(true)}>
          <Plus className="w-3.5 h-3.5" /> New Broadcast
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active', value: active.length, color: 'text-orbitan-green' },
          { label: 'Expired', value: expired.length, color: 'text-muted-foreground' },
          { label: 'Total', value: announcements.length, color: 'text-orbitan-blue' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
            <p className={cn('text-xl font-display font-bold', s.color)}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Active Announcements */}
      {active.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active</p>
          {active.map(a => {
            const config = PRIORITY_CONFIG[a.priority] || PRIORITY_CONFIG.info;
            const Icon = config.icon;
            return (
              <div key={a.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-start gap-3">
                <Icon className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground truncate">{a.title}</p>
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', config.badge)}>{config.label}</span>
                    {a.pinned && <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded-full">Pinned</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{a.message}</p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {a.views_count || 0} views
                    </span>
                    {a.requires_acknowledgement && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {(a.acknowledged_by || []).length} acks
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatDistanceToNow(new Date(a.created_date), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => togglePinMutation.mutate({ id: a.id, pinned: a.pinned })}
                    className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground">
                    {a.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => toggleActiveMutation.mutate({ id: a.id, is_active: a.is_active })}
                    className="w-7 h-7 rounded-lg hover:bg-amber-50 flex items-center justify-center text-amber-500">
                    <Clock className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteMutation.mutate(a.id)}
                    className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Expired / Archived */}
      {expired.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Archived / Expired</p>
          {expired.map(a => (
            <div key={a.id} className="bg-muted/40 border border-border rounded-xl px-4 py-3 flex items-center gap-3 opacity-60">
              <Megaphone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground truncate">{a.title}</p>
                <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(a.created_date), { addSuffix: true })}</p>
              </div>
              <button onClick={() => deleteMutation.mutate(a.id)}
                className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-400">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {!isLoading && announcements.length === 0 && (
        <div className="text-center py-12 bg-muted/30 rounded-2xl border border-dashed border-border">
          <Megaphone className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm font-semibold text-muted-foreground">No broadcasts yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create your first announcement to connect with your team.</p>
        </div>
      )}

      <BroadcastComposer
        open={composerOpen}
        onClose={() => {
          setComposerOpen(false);
          queryClient.invalidateQueries(['announcements-admin', tenantId]);
        }}
        tenantId={tenantId}
        publisherName={publisherName}
        publisherRole={publisherRole}
      />
    </div>
  );
}