import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, BellOff } from 'lucide-react';
import { ALL_CATEGORIES, CATEGORY_CONFIG } from './inboxConfig';
import { cn } from '@/lib/utils';

// InboxPreferences — per-user per-category notification preferences.
// Edits NotificationPreference records. Creates defaults if none exist.
export default function InboxPreferences({ open, onOpenChange, tenantId, userId }) {
  const [prefs, setPrefs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;
    setLoading(true);
    base44.entities.NotificationPreference.filter({ user_id: userId }, '-created_date', 50)
      .then(setPrefs)
      .catch(() => setPrefs([]))
      .finally(() => setLoading(false));
  }, [open, userId]);

  const getPref = (category) => prefs.find((p) => p.category === category);

  const updatePref = async (category, field, value) => {
    const existing = getPref(category);
    try {
      if (existing) {
        const updated = await base44.entities.NotificationPreference.update(existing.id, { [field]: value });
        setPrefs((prev) => prev.map((p) => (p.id === existing.id ? updated : p)));
      } else {
        const created = await base44.entities.NotificationPreference.create({
          tenant_id: tenantId || 'system',
          user_id: userId,
          category,
          [field]: value,
        });
        setPrefs((prev) => [...prev, created]);
      }
    } catch (e) {
      console.error('preference update failed', e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Notification Preferences</DialogTitle>
          <DialogDescription>
            Control how you receive notifications per category. Changes apply to new items only.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-1">
            {ALL_CATEGORIES.filter((c) => c !== 'system').map((cat) => {
              const cfg = CATEGORY_CONFIG[cat];
              const p = getPref(cat);
              const muted = p?.muted ?? false;
              return (
                <div
                  key={cat}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border border-border',
                    muted && 'bg-muted/40'
                  )}
                >
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', cfg.bg)}>
                    <cfg.Icon className={cn('w-4 h-4', cfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Label className="text-sm font-medium">{cfg.label}</Label>
                    {muted && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                        <BellOff className="w-3 h-3" /> Muted
                      </span>
                    )}
                  </div>
                  {/* Channel toggles */}
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center gap-1">
                      <Switch
                        checked={p?.in_app_enabled ?? true}
                        onCheckedChange={(v) => updatePref(cat, 'in_app_enabled', v)}
                        aria-label={`In-app for ${cfg.label}`}
                      />
                      <span className="text-[9px] text-muted-foreground">In-app</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <Switch
                        checked={p?.email_enabled ?? true}
                        onCheckedChange={(v) => updatePref(cat, 'email_enabled', v)}
                        aria-label={`Email for ${cfg.label}`}
                      />
                      <span className="text-[9px] text-muted-foreground">Email</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <Switch
                        checked={muted}
                        onCheckedChange={(v) => updatePref(cat, 'muted', v)}
                        aria-label={`Mute ${cfg.label}`}
                      />
                      <span className="text-[9px] text-muted-foreground">Mute</span>
                    </div>
                    {/* Min priority */}
                    <Select
                      value={p?.min_priority ?? 'informational'}
                      onValueChange={(v) => updatePref(cat, 'min_priority', v)}
                    >
                      <SelectTrigger className="w-[110px] h-8 text-xs" aria-label={`Min priority for ${cfg.label}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="informational">All</SelectItem>
                        <SelectItem value="normal">Normal+</SelectItem>
                        <SelectItem value="important">Important+</SelectItem>
                        <SelectItem value="critical">Critical only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}