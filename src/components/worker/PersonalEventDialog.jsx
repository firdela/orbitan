// ============================================================
// PersonalEventDialog — Create/Edit personal work calendar event
// Worker-private by default. Never becomes attendance or payroll.
// ============================================================
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { X, StickyNote, Bell, MapPin } from 'lucide-react';

export default function PersonalEventDialog({ open, onClose, onSave, editingEvent }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [allDay, setAllDay] = useState(true);
  const [category, setCategory] = useState('personal_work_event');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title || '');
      setDate(editingEvent.date || '');
      setStartTime(editingEvent.start_time || '');
      setEndTime(editingEvent.end_time || '');
      setAllDay(editingEvent.all_day ?? true);
      setCategory(editingEvent.category || 'personal_work_event');
      setLocation(editingEvent.location || '');
      setDescription(editingEvent.description || '');
      setReminderEnabled(editingEvent.reminder_enabled || false);
    } else {
      setTitle(''); setDate(''); setStartTime(''); setEndTime('');
      setAllDay(true); setCategory('personal_work_event');
      setLocation(''); setDescription(''); setReminderEnabled(false);
    }
  }, [editingEvent, open]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !date) return;
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        date,
        start_time: allDay ? null : startTime,
        end_time: allDay ? null : endTime,
        all_day: allDay,
        category,
        location: location.trim() || null,
        description: description.trim() || null,
        reminder_enabled: reminderEnabled,
        visibility: 'private',
        status: 'active',
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl border border-border overflow-hidden animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="font-heading font-bold text-base flex items-center gap-2">
            {category === 'reminder' ? <Bell className="w-4 h-4 text-amber-500" /> : <StickyNote className="w-4 h-4 text-emerald-500" />}
            {editingEvent ? 'Edit Personal Event' : 'New Personal Event'}
          </h3>
          <button onClick={onClose} aria-label="Close"
            className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center min-h-[44px] min-w-[44px]">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Category toggle */}
          <div className="flex gap-1.5 bg-muted rounded-xl p-1">
            <button type="button" onClick={() => setCategory('personal_work_event')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all min-h-[36px] ${category === 'personal_work_event' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
              <StickyNote className="w-3.5 h-3.5" /> Event
            </button>
            <button type="button" onClick={() => setCategory('reminder')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all min-h-[36px] ${category === 'reminder' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
              <Bell className="w-3.5 h-3.5" /> Reminder
            </button>
          </div>

          <div>
            <Label htmlFor="evt-title" className="text-sm font-semibold mb-1.5 block">Title *</Label>
            <Input id="evt-title" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Prep for morning shift"
              className="h-11" autoFocus required />
          </div>

          <div>
            <Label htmlFor="evt-date" className="text-sm font-semibold mb-1.5 block">Date *</Label>
            <Input id="evt-date" type="date" value={date} onChange={e => setDate(e.target.value)}
              className="h-11" required />
          </div>

          {/* All-day toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="evt-allday" className="text-sm font-semibold">All day</Label>
            <Switch id="evt-allday" checked={allDay} onCheckedChange={setAllDay} />
          </div>

          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="evt-start" className="text-sm font-semibold mb-1.5 block">Start</Label>
                <Input id="evt-start" type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                  className="h-11" />
              </div>
              <div>
                <Label htmlFor="evt-end" className="text-sm font-semibold mb-1.5 block">End</Label>
                <Input id="evt-end" type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                  className="h-11" />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="evt-loc" className="text-sm font-semibold mb-1.5 block">Location (optional)</Label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input id="evt-loc" value={location} onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Kitchen, Store room" className="h-11 pl-9" />
            </div>
          </div>

          <div>
            <Label htmlFor="evt-desc" className="text-sm font-semibold mb-1.5 block">Work Note (optional)</Label>
            <Textarea id="evt-desc" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Add details..." rows={3} className="resize-none" />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="evt-reminder" className="text-sm font-semibold">Set reminder</Label>
            <Switch id="evt-reminder" checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
          </div>

          {/* Privacy notice */}
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3">
            <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-start gap-2">
              <StickyNote className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>This is a <strong>personal work event</strong>. Only you can see it. It does not count as a paid shift, does not affect attendance or payroll, and does not create obligations for your manager.</span>
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1 h-11" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1 h-11" disabled={saving || !title.trim() || !date}>
              {saving ? 'Saving...' : editingEvent ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}