// ============================================================
// Widget: Today's Shift
// Shows current shift + clock-in/out action.
// ============================================================
import React from 'react';
import { format } from 'date-fns';
import { Clock, Calendar, MapPin, LogIn, LogOut, Loader2, Utensils, RotateCcw } from 'lucide-react';

export default function TodayShiftWidget({ todayShift, clockStatus, clocking, onClockIn, onClockOut, onStartBreak, onEndBreak }) {
  const clockedIn = clockStatus === 'clocked_in';
  const onBreak = clockStatus === 'on_break';

  if (!todayShift) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">No shift scheduled for today</p>
            <p className="text-xs text-muted-foreground mt-0.5">Enjoy your day off.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl p-5 text-white relative overflow-hidden ${onBreak ? 'bg-gradient-to-br from-amber-500 to-orange-600' : clockedIn ? 'bg-gradient-to-br from-emerald-600 to-teal-700' : 'bg-gradient-to-br from-blue-600 to-indigo-700'}`}>
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }} />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Today's Shift</p>
            <p className="text-xl font-display font-bold mt-0.5">
              {onBreak ? 'On Break ☕' : clockedIn ? 'Clocked In ✓' : 'Scheduled'}
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white/15 rounded-lg px-2.5 py-1.5">
            <Clock className="w-3.5 h-3.5 text-white/70" />
            <span className="text-sm font-mono font-bold">{todayShift.start_time}–{todayShift.end_time}</span>
          </div>
        </div>

        {todayShift.outlet_name && (
          <div className="flex items-center gap-1.5 text-white/80 text-xs mb-3">
            <MapPin className="w-3 h-3" /> {todayShift.outlet_name}
          </div>
        )}

        <button
          onClick={onBreak ? onEndBreak : clockedIn ? onClockOut : onClockIn}
          disabled={clocking}
          className="w-full bg-white/20 hover:bg-white/30 active:scale-[0.98] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all border border-white/20 disabled:opacity-50 min-h-[44px]"
        >
          {clocking ? <Loader2 className="w-4 h-4 animate-spin" /> : onBreak ? <RotateCcw className="w-4 h-4" /> : clockedIn ? <LogOut className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
          {clocking ? 'Please wait...' : onBreak ? 'End Break' : clockedIn ? 'Clock Out' : 'Clock In'}
        </button>

        {clockedIn && (
          <button
            onClick={onStartBreak}
            disabled={clocking}
            className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all border border-white/15 disabled:opacity-50 mt-2 min-h-[44px]"
          >
            <Utensils className="w-3.5 h-3.5" /> Start Break
          </button>
        )}
      </div>
    </div>
  );
}