import React, { useState } from 'react';
import { CalendarOff, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function HolidayScheduleSection({ holidays, onChange, disabled }) {
  const [draft, setDraft] = useState({ date: '', name: '', is_closed: true });

  const addHoliday = () => {
    if (!draft.date || !draft.name) return;
    onChange([...(holidays || []), { ...draft }]);
    setDraft({ date: '', name: '', is_closed: true });
  };

  const removeHoliday = (idx) => {
    onChange((holidays || []).filter((_, i) => i !== idx));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarOff className="w-4 h-4 text-primary" /> Holiday Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(holidays || []).length > 0 && (
          <div className="space-y-2">
            {(holidays || []).map((h, idx) => (
              <div key={idx} className="flex items-center gap-3 py-2 border-b border-border last:border-b-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{h.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {h.date} · {h.is_closed ? 'Closed' : 'Open (reduced)'}
                  </p>
                </div>
                {!disabled && (
                  <Button variant="ghost" size="icon" onClick={() => removeHoliday(idx)} aria-label="Remove holiday">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
        {!disabled && (
          <div className="flex flex-col sm:flex-row sm:items-end gap-2 pt-2 border-t border-border">
            <div className="flex-1">
              <Label className="text-xs mb-1 block">Date</Label>
              <Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
            </div>
            <div className="flex-1">
              <Label className="text-xs mb-1 block">Holiday Name</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Hari Raya Puasa" />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Switch checked={draft.is_closed} onCheckedChange={(v) => setDraft({ ...draft, is_closed: v })} id="hd-closed" />
              <Label htmlFor="hd-closed" className="text-xs whitespace-nowrap">{draft.is_closed ? 'Closed' : 'Open'}</Label>
            </div>
            <Button size="sm" onClick={addHoliday} disabled={!draft.date || !draft.name} className="gap-1.5">
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}