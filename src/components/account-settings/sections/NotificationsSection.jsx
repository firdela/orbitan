import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Loader2, Bell, ChevronRight } from 'lucide-react';
import InboxPreferences from '@/components/orbit-inbox/InboxPreferences';
import { ALL_CATEGORIES, CATEGORY_CONFIG } from '@/components/orbit-inbox/inboxConfig';

// Reuses the canonical NotificationPreference entity (ADR-0053) — no
// competing preference store.
export default function NotificationsSection() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id || user?.data?.tenant_id;
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    base44.entities.NotificationPreference.filter({ user_id: user.id }, '-created_date', 50)
      .then(setPrefs)
      .catch(() => setPrefs([]))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const mutedCount = prefs.filter((p) => p.muted).length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Control how you receive notifications per category — in-app, email, mute, and minimum
        priority. Changes apply to new items only.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading your preferences…
        </div>
      ) : (
        <div className="rounded-lg border border-border divide-y divide-border">
          {ALL_CATEGORIES.filter((c) => c !== 'system').slice(0, 6).map((cat) => {
            const cfg = CATEGORY_CONFIG[cat];
            const p = prefs.find((x) => x.category === cat);
            return (
              <div key={cat} className="flex items-center gap-3 p-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                  <cfg.Icon className={`w-4 h-4 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{cfg.label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {p?.muted
                      ? 'Muted'
                      : `In-app ${p?.in_app_enabled ?? true ? 'on' : 'off'} · Email ${p?.email_enabled ?? true ? 'on' : 'off'}`}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            );
          })}
        </div>
      )}

      <Button onClick={() => setOpen(true)} className="gap-1.5">
        <Bell className="w-4 h-4" /> Manage Notification Preferences
      </Button>
      {mutedCount > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {mutedCount} categor{mutedCount === 1 ? 'y' : 'ies'} muted.
        </p>
      )}

      <InboxPreferences open={open} onOpenChange={setOpen} tenantId={tenantId} userId={user?.id} />
    </div>
  );
}