// ============================================================
// Widget: Upcoming Shifts
// Shows the next 2-3 scheduled shifts.
// ============================================================
import React from 'react';
import { format, isToday, isFuture } from 'date-fns';
import { Calendar, Clock, ChevronRight } from 'lucide-react';

export default function UpcomingShiftsWidget({ shifts = [], onNavigate }) {
  const now = new Date();
  // Upcoming = today or future, sorted by date
  const upcoming = (shifts || [])
    .filter(s => {
      try { return isFuture(new Date(s.date)) || isToday(new Date(s.date)); }
      catch { return false; }
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 3);

  if (upcoming.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4">
        <WidgetHeader />
        <div className="py-4 text-center">
          <Calendar className="w-7 h-7 text-muted-foreground/40 mx-auto mb-1.5" />
          <p className="text-xs font-semibold text-foreground">No upcoming shifts scheduled</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <WidgetHeader count={upcoming.length} onNavigate={onNavigate} />
      <div className="space-y-2 mt-2">
        {upcoming.map(shift => {
          const isTodayShift = isToday(new Date(shift.date));
          return (
            <div key={shift.id} className="flex items-center gap-2.5 py-1">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isTodayShift ? 'orbitan-gradient' : 'bg-muted'}`}>
                <Clock className={`w-4 h-4 ${isTodayShift ? 'text-white' : 'text-muted-foreground'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-foreground">{format(new Date(shift.date), 'EEE, d MMM')}</p>
                  {isTodayShift && <span className="text-[9px] font-bold bg-primary text-primary-foreground px-1 py-0.5 rounded-full">Today</span>}
                </div>
                <p className="text-[11px] text-muted-foreground">{shift.start_time}–{shift.end_time}</p>
              </div>
            </div>
          );
        })}
      </div>
      {onNavigate && (
        <button onClick={() => onNavigate('shifts')} className="w-full text-xs text-primary font-medium mt-2 hover:underline">
          View all shifts →
        </button>
      )}
    </div>
  );
}

function WidgetHeader({ count, onNavigate }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <Calendar className="w-3.5 h-3.5 text-orbitan-purple" />
        <span className="text-xs font-semibold">Upcoming Shifts</span>
        {count > 0 && <span className="text-[9px] bg-primary/10 text-primary font-bold px-1 py-0.5 rounded-full">{count}</span>}
      </div>
      {onNavigate && count > 0 && (
        <button onClick={() => onNavigate('shifts')} className="text-[10px] text-primary hover:underline">See all →</button>
      )}
    </div>
  );
}