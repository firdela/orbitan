// ============================================================
// WorkerCalendarView — Calendar UI with Agenda/Day/Week/Month
// Mobile-first: agenda is default on mobile.
// ============================================================
import React, { useState, useMemo } from 'react';
import {
  format, addDays, addWeeks, addMonths, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, startOfDay, endOfDay, isSameDay, isToday,
  parseISO, eachDayOfInterval
} from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft, ChevronRight, CalendarDays, List, Calendar as CalIcon,
  Download, Plus, Clock, MapPin, Shield, StickyNote, Bell, Award
} from 'lucide-react';
import { EVENT_TYPE_META } from '@/lib/worker/calendar-event-adapter';
import { exportEventsAsICS, exportSingleEventAsICS } from '@/lib/worker/ics-export';

const VIEWS = [
  { id: 'agenda', label: 'Agenda', icon: List },
  { id: 'week', label: 'Week', icon: CalendarDays },
  { id: 'month', label: 'Month', icon: CalIcon },
];

const TYPE_ICON_MAP = {
  Clock, StickyNote, Shield, CalendarDays, Bell, Award,
};

export default function WorkerCalendarView({
  events = [],
  currentDate = new Date(),
  onAddPersonalEvent,
  onSelectEvent,
}) {
  const [view, setView] = useState('agenda');
  const [navDate, setNavDate] = useState(currentDate);

  const navigate = (dir) => {
    if (view === 'agenda') setNavDate(addDays(navDate, dir * 7));
    else if (view === 'week') setNavDate(addWeeks(navDate, dir));
    else setNavDate(addMonths(navDate, dir));
  };

  const goToday = () => setNavDate(new Date());

  const headerLabel = useMemo(() => {
    if (view === 'agenda') return format(navDate, 'MMM yyyy');
    if (view === 'week') {
      const wkStart = startOfWeek(navDate, { weekStartsOn: 1 });
      const wkEnd = endOfWeek(navDate, { weekStartsOn: 1 });
      return `${format(wkStart, 'd MMM')} – ${format(wkEnd, 'd MMM yyyy')}`;
    }
    return format(navDate, 'MMMM yyyy');
  }, [view, navDate]);

  const handleExportRange = () => {
    const rangeEvents = view === 'agenda'
      ? events.filter(e => new Date(e.date) >= startOfDay(navDate))
      : view === 'week'
        ? events.filter(e => {
            const d = new Date(e.date);
            return d >= startOfWeek(navDate, { weekStartsOn: 1 }) && d <= endOfWeek(navDate, { weekStartsOn: 1 });
          })
        : events.filter(e => {
            const d = new Date(e.date);
            return d >= startOfMonth(navDate) && d <= endOfMonth(navDate);
          });
    exportEventsAsICS(rangeEvents, `orbitan-${view}-${format(navDate, 'yyyy-MM')}.ics`);
  };

  return (
    <div className="space-y-4">
      {/* Calendar header */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} aria-label="Previous"
              className="w-9 h-9 rounded-xl hover:bg-muted flex items-center justify-center min-h-[44px] min-w-[44px]">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="font-heading font-bold text-sm min-w-[8rem] text-center">
              {headerLabel}
            </h3>
            <button onClick={() => navigate(1)} aria-label="Next"
              className="w-9 h-9 rounded-xl hover:bg-muted flex items-center justify-center min-h-[44px] min-w-[44px]">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={goToday} className="h-9 text-xs">Today</Button>
            <Button variant="ghost" size="sm" onClick={handleExportRange} className="h-9 text-xs gap-1.5" aria-label="Download calendar as ICS">
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex gap-1.5 bg-muted rounded-xl p-1">
          {VIEWS.map(v => {
            const Icon = v.icon;
            return (
              <button key={v.id} onClick={() => setView(v.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all min-h-[36px] ${
                  view === v.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                }`}>
                <Icon className="w-3.5 h-3.5" /> {v.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Calendar body */}
      {view === 'agenda' && <AgendaView events={events} navDate={navDate} onSelectEvent={onSelectEvent} />}
      {view === 'week' && <WeekView events={events} navDate={navDate} onSelectEvent={onSelectEvent} />}
      {view === 'month' && <MonthView events={events} navDate={navDate} onSelectEvent={onSelectEvent} />}

      {/* Add personal event */}
      {onAddPersonalEvent && (
        <button onClick={onAddPersonalEvent}
          className="w-full flex items-center justify-center gap-2 bg-card border border-dashed border-border hover:border-primary/40 rounded-2xl py-3.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-all min-h-[44px]">
          <Plus className="w-4 h-4" /> Add Personal Work Event
        </button>
      )}
    </div>
  );
}

// ─── Agenda View (mobile default) ──────────────────────────
function AgendaView({ events, navDate, onSelectEvent }) {
  const upcoming = events
    .filter(e => new Date(e.date) >= startOfDay(navDate))
    .slice(0, 30);

  if (upcoming.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 text-center">
        <CalendarDays className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm font-semibold text-foreground">No upcoming events</p>
        <p className="text-xs text-muted-foreground mt-1">Your schedule is clear from {format(navDate, 'd MMM')}.</p>
      </div>
    );
  }

  // Group by date
  const grouped = {};
  upcoming.forEach(e => {
    if (!grouped[e.date]) grouped[e.date] = [];
    grouped[e.date].push(e);
  });

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([dateStr, dayEvents]) => (
        <div key={dateStr}>
          <div className="flex items-center gap-2 mb-2 px-1">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
              {isToday(parseISO(dateStr)) ? 'Today' : format(parseISO(dateStr), 'EEE, d MMM')}
            </p>
            {isToday(parseISO(dateStr)) && (
              <span className="w-2 h-2 rounded-full bg-primary" />
            )}
          </div>
          <div className="space-y-2">
            {dayEvents.map(e => <EventCard key={e.id} event={e} onSelect={onSelectEvent} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Week View ─────────────────────────────────────────────
function WeekView({ events, navDate, onSelectEvent }) {
  const weekStart = startOfWeek(navDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(navDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {days.map(day => (
          <div key={day.toISOString()} className={`text-center py-2 ${isToday(day) ? 'bg-primary/5' : ''}`}>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">{format(day, 'EEE')}</p>
            <p className={`text-sm font-bold ${isToday(day) ? 'text-primary' : 'text-foreground'}`}>{format(day, 'd')}</p>
          </div>
        ))}
      </div>
      {/* Event cells */}
      <div className="grid grid-cols-7 min-h-[200px]">
        {days.map(day => {
          const dayEvents = events.filter(e => isSameDay(parseISO(e.date), day));
          return (
            <div key={day.toISOString()} className={`border-r border-border last:border-r-0 p-1 ${isToday(day) ? 'bg-primary/5' : ''}`}>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map(e => (
                  <EventPill key={e.id} event={e} onSelect={onSelectEvent} />
                ))}
                {dayEvents.length > 3 && (
                  <p className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Month View ────────────────────────────────────────────
function MonthView({ events, navDate, onSelectEvent }) {
  const monthStart = startOfMonth(navDate);
  const monthEnd = endOfMonth(navDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });
  const currentMonth = navDate.getMonth();

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Day name headers */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/30">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="text-center py-2 text-[10px] font-bold text-muted-foreground uppercase">{d}</div>
        ))}
      </div>
      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days.map(day => {
          const inMonth = day.getMonth() === currentMonth;
          const dayEvents = events.filter(e => isSameDay(parseISO(e.date), day));
          return (
            <div key={day.toISOString()}
              className={`border-r border-b border-border last:border-r-0 p-1 min-h-[56px] ${inMonth ? '' : 'bg-muted/20'} ${isToday(day) ? 'bg-primary/5' : ''}`}>
              <div className="flex items-center justify-center mb-0.5">
                <span className={`text-[11px] font-semibold ${isToday(day) ? 'bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center' : inMonth ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                  {format(day, 'd')}
                </span>
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 2).map(e => (
                  <EventPill key={e.id} event={e} onSelect={onSelectEvent} compact />
                ))}
                {dayEvents.length > 2 && (
                  <p className="text-[9px] text-muted-foreground">+{dayEvents.length - 2}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Event Pill (compact, for calendar cells) ──────────────
function EventPill({ event, onSelect, compact }) {
  const meta = EVENT_TYPE_META[event.type] || EVENT_TYPE_META.personal_work_event;
  const Icon = TYPE_ICON_MAP[meta.icon] || StickyNote;
  return (
    <button onClick={() => onSelect?.(event)}
      className={`w-full flex items-center gap-1 ${compact ? 'px-1 py-0.5' : 'px-1.5 py-1'} rounded-md ${meta.bgColor} ${meta.textColor} hover:opacity-80 transition-opacity text-left`}>
      <Icon className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} flex-shrink-0`} />
      <span className={`${compact ? 'text-[9px]' : 'text-[10px]'} font-medium truncate flex-1`}>
        {event.title}
      </span>
    </button>
  );
}

// ─── Event Card (for agenda view) ──────────────────────────
function EventCard({ event, onSelect }) {
  const meta = EVENT_TYPE_META[event.type] || EVENT_TYPE_META.personal_work_event;
  const Icon = TYPE_ICON_MAP[meta.icon] || StickyNote;
  return (
    <div className={`bg-card border ${meta.borderColor} rounded-xl p-3 flex items-center gap-3`}>
      <button onClick={() => onSelect?.(event)} className="flex items-center gap-3 flex-1 text-left min-h-[44px]">
        <div className={`w-9 h-9 rounded-xl ${meta.bgColor} ${meta.textColor} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{event.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${meta.bgColor} ${meta.textColor}`}>{meta.label}</span>
            {event.start && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" /> {event.start}{event.end ? `–${event.end}` : ''}
              </span>
            )}
            {event.all_day && (
              <span className="text-[11px] text-muted-foreground">All day</span>
            )}
          </div>
        </div>
      </button>
      <button onClick={() => exportSingleEventAsICS(event)} aria-label="Add to calendar"
        className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center flex-shrink-0">
        <Download className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}