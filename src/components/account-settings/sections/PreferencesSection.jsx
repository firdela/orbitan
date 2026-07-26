import React from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useCurrency } from '@/lib/CurrencyContext';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Palette, Globe, Coins, Clock } from 'lucide-react';
import { applyPreferences } from '@/lib/preferences';

export default function PreferencesSection() {
  const { user, checkUserAuth } = useAuth();
  const { activeCurrency, switchCurrency, supportedCurrencies } = useCurrency();
  const { toast } = useToast();
  const prefs = user?.data?.preferences || {};

  const persist = useMutation({
    mutationFn: async (next) => {
      await base44.auth.updateMe({ data: { ...(user?.data || {}), preferences: next } });
    },
    onSuccess: () => checkUserAuth(),
    onError: (e) =>
      toast({ variant: 'destructive', title: 'Could not save preference', description: e.message }),
  });

  const setPref = (key, value) => {
    const next = { ...prefs, [key]: value };
    applyPreferences(next);
    persist.mutate(next);
  };

  return (
    <div className="space-y-6">
      <Group icon={Palette} title="Theme">
        <Select value={prefs.theme || 'system'} onValueChange={(v) => setPref('theme', v)}>
          <SelectTrigger className="h-10 w-full sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="system">System</SelectItem>
            <SelectItem value="light">Light</SelectItem>
            <SelectItem value="dark">Dark</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground">Applies instantly across OrbitanOS.</p>
      </Group>

      <Group icon={Coins} title="Display Currency">
        <Select
          value={activeCurrency}
          onValueChange={(v) => { switchCurrency(v); setPref('display_currency', v); }}
        >
          <SelectTrigger className="h-10 w-full sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            {supportedCurrencies.map((c) => (
              <SelectItem key={c.code} value={c.code}>{c.flag} {c.code} ({c.symbol})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground">
          Personal display only — your organisation&rsquo;s accounting currency is unchanged.
        </p>
      </Group>

      <Group icon={Globe} title="Language">
        <div className="flex items-center justify-between">
          <span className="text-sm">English</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Current</span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Additional languages (Bahasa Melayu, 中文, தமிழ்) are planned. The interface remains English today.
        </p>
      </Group>

      <Group icon={Clock} title="Date &amp; Time Format">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">DD MMM YYYY · 24-hour</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orbitan-amber-light text-orbitan-amber-700">Planned</span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          A centralised date/time formatter with user-selectable formats is coming soon.
        </p>
      </Group>
    </div>
  );
}

function Group({ icon: Icon, title, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <Icon className="w-3.5 h-3.5" /> {title}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}