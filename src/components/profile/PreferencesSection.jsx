import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Globe, Eye, Save, Loader2, Contrast } from 'lucide-react';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'ms', label: 'Bahasa Melayu' },
  { value: 'zh', label: '中文' },
  { value: 'ta', label: 'தமிழ்' },
];

const REGIONS = [
  { value: 'SG', label: 'Singapore (SGD)' },
  { value: 'MY', label: 'Malaysia (MYR)' },
  { value: 'ID', label: 'Indonesia (IDR)' },
  { value: 'US', label: 'United States (USD)' },
];

const DEFAULT_PREFS = {
  language: 'en',
  region: 'SG',
  high_contrast: false,
  reduce_motion: false,
  large_text: false,
};

// ── Preferences Section ──────────────────────────────────────
// Language, regional, and accessibility preferences stored in
// user.data.preferences via base44.auth.updateMe.
// ─────────────────────────────────────────────────────────────
export default function PreferencesSection() {
  const { user, checkUserAuth } = useAuth();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setPrefs({ ...DEFAULT_PREFS, ...(user?.data?.preferences || {}) });
    setIsDirty(false);
  }, [user]);

  const updatePref = (key, value) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      await base44.auth.updateMe({
        data: { ...(user?.data || {}), preferences: prefs },
      });
    },
    onSuccess: () => {
      checkUserAuth();
      setIsDirty(false);
      toast({ title: 'Preferences saved', description: 'Your preferences have been applied.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Save failed', description: error.message });
    },
  });

  return (
    <div className="space-y-4">
      {/* Language & Region */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <Globe className="w-3.5 h-3.5" /> Language & Region
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Language</Label>
            <Select value={prefs.language} onValueChange={(v) => updatePref('language', v)}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Region & Currency</Label>
            <Select value={prefs.region} onValueChange={(v) => updatePref('region', v)}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REGIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Accessibility */}
      <div className="space-y-1 pt-2 border-t border-border">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          <Eye className="w-3.5 h-3.5" /> Accessibility
        </div>
        <PrefToggle
          icon={Contrast}
          label="High Contrast"
          desc="Increase visual contrast for better readability"
          checked={prefs.high_contrast}
          onCheckedChange={(v) => updatePref('high_contrast', v)}
        />
        <PrefToggle
          icon={Eye}
          label="Large Text"
          desc="Use larger font sizes throughout the app"
          checked={prefs.large_text}
          onCheckedChange={(v) => updatePref('large_text', v)}
        />
        <PrefToggle
          icon={Contrast}
          label="Reduce Motion"
          desc="Minimize animations and transitions"
          checked={prefs.reduce_motion}
          onCheckedChange={(v) => updatePref('reduce_motion', v)}
        />
      </div>

      {isDirty && (
        <div className="flex justify-end pt-1">
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="gap-1.5"
          >
            {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Preferences
          </Button>
        </div>
      )}
    </div>
  );
}

function PrefToggle({ icon: Icon, label, desc, checked, onCheckedChange }) {
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
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}