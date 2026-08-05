// ============================================================
// ORBITANOS — Worker Home Screen (Build #28.2J)
// ------------------------------------------------------------
// Configurable overview dashboard replacing the previous
// inline Home section in WorkerPortal. Renders the widget
// grid based on the canonical widget registry + worker
// preferences.
//
// Receives all data from WorkerPortal as props — no duplicate
// data fetching. Only safety/compliance is fetched via
// useWorkerOverview (new query, shared cache key).
// ============================================================

import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { MapPin } from 'lucide-react';
import { getEffectiveLayout, WIDGET_SIZES } from '@/lib/worker/widget-registry';
import { resolveNextPriority } from '@/lib/worker/priority-resolver';
import { useWorkerOverview } from '@/lib/hooks/useWorkerOverview';

import TodayShiftWidget from '@/components/worker/widgets/TodayShiftWidget';
import NextPriorityWidget from '@/components/worker/widgets/NextPriorityWidget';
import TodayTasksWidget from '@/components/worker/widgets/TodayTasksWidget';
import QuickActionsWidget from '@/components/worker/widgets/QuickActionsWidget';
import UpcomingShiftsWidget from '@/components/worker/widgets/UpcomingShiftsWidget';
import SafetyComplianceWidget from '@/components/worker/widgets/SafetyComplianceWidget';
import WeeklyAttendanceWidget from '@/components/worker/widgets/WeeklyAttendanceWidget';
import MyProgressWidget from '@/components/worker/widgets/MyProgressWidget';
import AnnouncementsWidget from '@/components/worker/widgets/AnnouncementsWidget';
import VoiceMattersWidget from '@/components/worker/widgets/VoiceMattersWidget';

// Map widget IDs to components
const WIDGET_COMPONENTS = {
  today_shift: TodayShiftWidget,
  next_priority: NextPriorityWidget,
  today_tasks: TodayTasksWidget,
  quick_actions: QuickActionsWidget,
  upcoming_shifts: UpcomingShiftsWidget,
  safety_compliance: SafetyComplianceWidget,
  weekly_attendance: WeeklyAttendanceWidget,
  my_progress: MyProgressWidget,
  announcements: AnnouncementsWidget,
  voice_matters: VoiceMattersWidget,
};

export default function WorkerHomeScreen({
  // Worker context
  workerFirstName,
  employee,
  tenantId,
  outletId,
  workerId,
  userId,
  currentTime,
  // Data (already fetched by WorkerPortal — shared cache)
  tasks = [],
  shifts = [],
  clockRecords = [],
  announcements = [],
  // Clock state + handlers
  clockStatus,
  clocking,
  onClockIn,
  onClockOut,
  onStartBreak,
  onEndBreak,
  // Navigation
  onNavigate,
  onReportIssue,
  // Compliance gate
  pendingVerification = [],
}) {
  // Fetch compliance records (only new query — shared cache key)
  const { complianceRecords } = useWorkerOverview({ tenantId, outletId, workerId });

  // Resolve today's shift
  const todayShift = useMemo(() => {
    return (shifts || []).find(s => {
      try { return format(new Date(s.date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'); }
      catch { return false; }
    });
  }, [shifts]);

  // Resolve next priority
  const priorityItem = useMemo(() => {
    return resolveNextPriority({
      tasks,
      complianceRecords,
      todayShift,
      clockStatus: clockStatus?.status || null,
      announcements,
      workerId,
    });
  }, [tasks, complianceRecords, todayShift, clockStatus, announcements, workerId]);

  // Resolve effective layout
  const layout = useMemo(() => getEffectiveLayout('worker', {}), []);

  // Greeting
  const hour = currentTime.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Render a single widget by ID
  const renderWidget = (widgetDef) => {
    const Component = WIDGET_COMPONENTS[widgetDef.id];
    if (!Component) return null;

    const props = {
      today_shift: {
        todayShift, clockStatus: clockStatus?.status, clocking,
        onClockIn, onClockOut, onStartBreak, onEndBreak,
      },
      next_priority: { priorityItem, onNavigate },
      today_tasks: { tasks, onNavigate },
      quick_actions: { onNavigate, onReportIssue },
      upcoming_shifts: { shifts, onNavigate },
      safety_compliance: { complianceRecords, onNavigate },
      weekly_attendance: { clockRecords, shifts },
      my_progress: { tasks },
      announcements: { tenantId, workerId },
      voice_matters: { onNavigate },
    };

    const colSpan = widgetDef.size === WIDGET_SIZES.FULL ? 'md:col-span-2' : 'md:col-span-1';

    return (
      <div key={widgetDef.id} className={colSpan}>
        <Component {...(props[widgetDef.id] || {})} />
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Greeting */}
      <div>
        <p className="text-xs text-muted-foreground">{format(currentTime, 'EEEE, d MMMM yyyy')}</p>
        <h1 className="text-2xl font-display font-bold text-foreground mt-0.5">
          {greeting}, <span className="text-orbitan-blue">{workerFirstName}</span> 👋
        </h1>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
          <MapPin className="w-3 h-3" />{employee?.position || 'Team Member'}
        </p>
      </div>

      {/* Compliance Gate Alert */}
      {pendingVerification.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-amber-600 dark:text-amber-400 text-sm font-bold">⚠</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Attendance Verification Required</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
              {pendingVerification.length} clock record{pendingVerification.length > 1 ? 's are' : ' is'} pending
              manager verification.
            </p>
          </div>
        </div>
      )}

      {/* Configurable Widget Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {layout.map(renderWidget)}
      </div>
    </div>
  );
}