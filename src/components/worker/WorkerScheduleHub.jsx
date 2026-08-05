// ============================================================
// WorkerScheduleHub — Calendar + schedule + personal events
// Replaces the old ShiftsScreen. Calendar is the primary view.
// Clock status is a compact indicator, not a full hero (dedup).
// ============================================================
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, isToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import WorkerCalendarView from '@/components/worker/WorkerCalendarView';
import PersonalEventDialog from '@/components/worker/PersonalEventDialog';
import { buildCalendarEvents, EVENT_TYPE_META } from '@/lib/worker/calendar-event-adapter';
import { exportSingleEventAsICS } from '@/lib/worker/ics-export';
import {
  Clock, LogIn, LogOut, Loader2, Utensils, RotateCcw,
  Download, MapPin, X, Calendar as CalIcon
} from 'lucide-react';

export default function WorkerScheduleHub({
  employee,
  tenantId,
  outletId,
  workerId,
  userId,
  shifts = [],
  clockStatus,
  clocking,
  onClockIn,
  onClockOut,
  onStartBreak,
  onEndBreak,
  complianceRecords = [],
}) {
  const [personalEventOpen, setPersonalEventOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── Personal events query ──
  const { data: personalEvents = [] } = useQuery({
    queryKey: ['worker-personal-events', tenantId, userId],
    queryFn: async () => {
      if (!tenantId || !userId) return [];
      const events = await base44.entities.WorkerCalendarEvent.filter(
        { tenant_id: tenantId, worker_id: userId, status: 'active' },
        '-date',
        100
      );
      return events || [];
    },
    enabled: !!tenantId && !!userId,
    staleTime: 60 * 1000,
  });

  // ── Build unified calendar events ──
  const calendarEvents = useMemo(() => {
    return buildCalendarEvents({
      shifts,
      personalEvents,
      complianceRecords,
      employee,
    });
  }, [shifts, personalEvents, complianceRecords, employee]);

  // ── Create/update personal event ──
  const savePersonalEvent = async (data) => {
    try {
      if (editingEvent) {
        await base44.entities.WorkerCalendarEvent.update(editingEvent.id, data);
        toast({ title: '✓ Event Updated', description: 'Your personal event has been updated.' });
      } else {
        await base44.entities.WorkerCalendarEvent.create({
          ...data,
          tenant_id: tenantId,
          outlet_id: outletId,
          worker_id: userId,
          worker_name: employee?.full_name || '',
        });
        toast({ title: '✓ Event Created', description: 'Your personal event has been added to your calendar.' });
      }
      queryClient.invalidateQueries({ queryKey: ['worker-personal-events', tenantId, userId] });
      setEditingEvent(null);
    } catch (err) {
      toast({
        title: 'Save Failed',
        description: err.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  // ── Delete personal event ──
  const deletePersonalEvent = async (eventId) => {
    try {
      await base44.entities.WorkerCalendarEvent.update(eventId, { status: 'cancelled' });
      queryClient.invalidateQueries({ queryKey: ['worker-personal-events', tenantId, userId] });
      setSelectedEvent(null);
      toast({ title: 'Event Removed', description: 'Your personal event has been removed.' });
    } catch (err) {
      toast({ title: 'Delete Failed', description: err.message, variant: 'destructive' });
    }
  };

  // ── Compact clock status ──
  const clockedIn = clockStatus?.status === 'clocked_in';
  const onBreak = clockStatus?.status === 'on_break';
  const todayShift = shifts.find(s => isToday(new Date(s.date)));

  return (
    <div className="space-y-4">
      {/* Compact Clock Status (not a full hero — dedup from Home) */}
      <div className={`rounded-2xl p-4 text-white relative overflow-hidden ${
        onBreak ? 'bg-gradient-to-br from-amber-500 to-orange-600' :
        clockedIn ? 'bg-gradient-to-br from-emerald-600 to-teal-700' :
        'bg-gradient-to-br from-blue-600 to-indigo-700'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
              {onBreak ? 'On Break' : clockedIn ? 'Clocked In' : 'Not Started'}
            </p>
            <p className="text-sm font-display font-bold mt-0.5">
              {todayShift ? `${todayShift.start_time}–${todayShift.end_time}` : 'No shift today'}
            </p>
          </div>
          <button
            onClick={onBreak ? onEndBreak : clockedIn ? onClockOut : onClockIn}
            disabled={clocking || (!todayShift && !clockedIn)}
            className="bg-white/20 hover:bg-white/30 active:scale-[0.98] text-white font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all border border-white/20 disabled:opacity-50 min-h-[44px]"
          >
            {clocking ? <Loader2 className="w-4 h-4 animate-spin" /> :
             onBreak ? <RotateCcw className="w-4 h-4" /> :
             clockedIn ? <LogOut className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            {clocking ? '...' : onBreak ? 'End Break' : clockedIn ? 'Clock Out' : 'Clock In'}
          </button>
        </div>
        {clockedIn && !onBreak && (
          <button onClick={onStartBreak}
            disabled={clocking}
            className="mt-2 bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-3 rounded-lg flex items-center gap-1.5 transition-all border border-white/15 disabled:opacity-50 text-xs min-h-[36px]">
            <Utensils className="w-3 h-3" /> Start Break
          </button>
        )}
      </div>

      {/* Calendar */}
      <WorkerCalendarView
        events={calendarEvents}
        onAddPersonalEvent={() => { setEditingEvent(null); setPersonalEventOpen(true); }}
        onSelectEvent={(evt) => setSelectedEvent(evt)}
      />

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onEdit={() => {
            if (selectedEvent.source === 'WorkerCalendarEvent') {
              const rawEvent = personalEvents.find(e => e.id === selectedEvent.source_id);
              if (rawEvent) {
                setEditingEvent(rawEvent);
                setPersonalEventOpen(true);
                setSelectedEvent(null);
              }
            }
          }}
          onDelete={() => selectedEvent.source === 'WorkerCalendarEvent' && deletePersonalEvent(selectedEvent.source_id)}
        />
      )}

      {/* Personal Event Dialog */}
      <PersonalEventDialog
        open={personalEventOpen}
        onClose={() => { setPersonalEventOpen(false); setEditingEvent(null); }}
        onSave={savePersonalEvent}
        editingEvent={editingEvent}
      />
    </div>
  );
}

// ─── Event Detail Modal ─────────────────────────────────────
function EventDetailModal({ event, onClose, onEdit, onDelete }) {
  const meta = EVENT_TYPE_META[event.type] || EVENT_TYPE_META.personal_work_event;
  const isPersonal = event.source === 'WorkerCalendarEvent';
  const rawEvent = event.meta?.event;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl border border-border overflow-hidden animate-fade-in">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <h3 className="font-heading font-bold text-base">Event Details</h3>
          <button onClick={onClose} aria-label="Close"
            className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center min-h-[44px] min-w-[44px]">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${meta.bgColor} ${meta.textColor}`}>
              {meta.label}
            </span>
          </div>
          <p className="font-semibold text-foreground text-base">{event.title}</p>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalIcon className="w-3.5 h-3.5" />
              <span>{format(new Date(event.date), 'EEEE, d MMMM yyyy')}</span>
            </div>
            {event.start && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>{event.start}{event.end ? ` – ${event.end}` : ''}</span>
              </div>
            )}
            {event.all_day && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>All day</span>
              </div>
            )}
            {rawEvent?.location && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                <span>{rawEvent.location}</span>
              </div>
            )}
          </div>

          {rawEvent?.description && (
            <p className="text-sm text-muted-foreground bg-muted/50 rounded-xl p-3">{rawEvent.description}</p>
          )}

          {isPersonal && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3">
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                This is a personal work event. Only you can see it. It does not count as a paid shift.
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 h-11 gap-1.5" onClick={() => exportSingleEventAsICS(event)}>
              <Download className="w-4 h-4" /> Add to Calendar
            </Button>
            {isPersonal && (
              <>
                <Button variant="outline" className="flex-1 h-11" onClick={onEdit}>Edit</Button>
                <Button variant="destructive" className="h-11 px-3" onClick={onDelete} aria-label="Delete">Delete</Button>
              </>
            )}
            {!isPersonal && (
              <Button variant="outline" className="h-11 px-4" onClick={onClose}>Close</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}