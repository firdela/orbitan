import React from 'react';
import { Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const DAY_LABELS = {
  0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
  4: 'Thursday', 5: 'Friday', 6: 'Saturday',
};
// Display Monday-first to match regional scheduling convention
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function OperatingHoursSection({ weeklyHours, onChange, disabled }) {
  const updateDay = (day, patch) => {
    onChange({ ...weeklyHours, [day]: { ...weeklyHours[day], ...patch } });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="w-4 h-4 text-primary" /> Operating Hours
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {DAY_ORDER.map((d) => {
          const day = weeklyHours[d] || { open: '09:00', close: '17:00', is_closed: false };
          return (
            <div key={d} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 py-2 border-b border-border last:border-b-0">
              <div className="sm:w-28 flex items-center justify-between sm:justify-start gap-2">
                <Label className="text-sm font-medium">{DAY_LABELS[d]}</Label>
                <Switch
                  checked={!day.is_closed}
                  disabled={disabled}
                  onCheckedChange={(v) => updateDay(d, { is_closed: !v })}
                  aria-label={`Open on ${DAY_LABELS[d]}`}
                />
              </div>
              {day.is_closed ? (
                <span className="text-sm text-muted-foreground sm:flex-1">Closed</span>
              ) : (
                <div className="flex items-center gap-2 sm:flex-1">
                  <Input type="time" value={day.open || '09:00'} disabled={disabled}
                    onChange={(e) => updateDay(d, { open: e.target.value })}
                    className="w-full sm:w-32" />
                  <span className="text-muted-foreground text-xs">to</span>
                  <Input type="time" value={day.close || '17:00'} disabled={disabled}
                    onChange={(e) => updateDay(d, { close: e.target.value })}
                    className="w-full sm:w-32" />
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}