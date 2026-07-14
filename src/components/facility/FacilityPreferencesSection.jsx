import React from 'react';
import { Settings, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TIMEZONES = ['Asia/Singapore', 'Asia/Kuala_Lumpur', 'Asia/Jakarta', 'Asia/Bangkok', 'Asia/Manila', 'UTC'];

const TOGGLES = [
  { key: 'accepts_walk_ins', label: 'Accepts Walk-Ins' },
  { key: 'requires_reservation', label: 'Requires Reservation' },
  { key: 'has_parking', label: 'Has Parking' },
  { key: 'wheelchair_accessible', label: 'Wheelchair Accessible' },
];

export default function FacilityPreferencesSection({ timezone, facilitySettings, onTimezone, onSettings, disabled }) {
  const setPref = (k, v) => onSettings({ ...facilitySettings, [k]: v });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings className="w-4 h-4 text-primary" /> Facility Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs mb-1 block flex items-center gap-1.5"><Globe className="w-3 h-3" /> Timezone</Label>
            <Select value={timezone} onValueChange={onTimezone} disabled={disabled}>
              <SelectTrigger><SelectValue placeholder="Select timezone" /></SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs mb-1 block">Max Capacity</Label>
            <Input type="number" min="0" value={facilitySettings?.max_capacity ?? ''} disabled={disabled}
              onChange={(e) => setPref('max_capacity', e.target.value === '' ? null : Number(e.target.value))}
              placeholder="e.g. 50" />
          </div>
        </div>
        <div className="pt-2 border-t border-border space-y-3">
          {TOGGLES.map((t) => (
            <div key={t.key} className="flex items-center justify-between">
              <Label htmlFor={t.key} className="text-sm font-normal cursor-pointer">{t.label}</Label>
              <Switch id={t.key} checked={!!facilitySettings?.[t.key]} disabled={disabled}
                onCheckedChange={(v) => setPref(t.key, v)} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}