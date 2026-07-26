import React from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { applyPreferences } from '@/lib/preferences';
import { Zap, Type, Contrast, Info } from 'lucide-react';

export default function AccessibilitySection() {
  const { user, checkUserAuth } = useAuth();
  const { toast } = useToast();
  const prefs = user?.data?.preferences || {};

  const persist = useMutation({
    mutationFn: async (next) => {
      await base44.auth.updateMe({ data: { ...(user?.data || {}), preferences: next } });
    },
    onSuccess: () => checkUserAuth(),
    onError: (e) => toast({ variant: 'destructive', title: 'Could not save', description: e.message }),
  });

  const setPref = (key, value) => {
    const next = { ...prefs, [key]: value };
    applyPreferences(next);
    persist.mutate(next);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        These preferences enhance your experience instantly. OrbitanOS meets WCAG AA by default —
        these settings add personal customisation.
      </p>
      <Toggle icon={Zap} label="Reduced Motion" desc="Minimise animations and transitions" checked={!!prefs.reduce_motion} onChange={(v) => setPref('reduce_motion', v)} />
      <Toggle icon={Type} label="Large Text" desc="Increase the base text size throughout the app" checked={!!prefs.large_text} onChange={(v) => setPref('large_text', v)} />
      <Toggle icon={Contrast} label="High Contrast" desc="Strengthen borders and muted text for readability" checked={!!prefs.high_contrast} onChange={(v) => setPref('high_contrast', v)} />
      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3">
        <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Keyboard navigation and screen-reader support are built in. These toggles apply immediately
          and persist on your account.
        </p>
      </div>
    </div>
  );
}

function Toggle({ icon: Icon, label, desc, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 p-3 -mx-3 rounded-lg hover:bg-accent/50 transition-colors">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}