// ============================================================
// ORBITANOS — Calendar Event Adapter (Build #28.2K)
// ------------------------------------------------------------
// Canonical unified calendar event model. Normalises data from
// multiple sources (Shift, WorkerCalendarEvent, ComplianceRecord,
// Announcement, Employee milestones) into a single event shape
// so the calendar UI has ONE render path.
//
// Pure JS — zero React imports — safe for tests.
// ============================================================

export const CALENDAR_EVENT_TYPES = {
  ASSIGNED_SHIFT: 'assigned_shift',
  PERSONAL_WORK_EVENT: 'personal_work_event',
  COMPLIANCE_DEADLINE: 'compliance_deadline',
  WORKPLACE_EVENT: 'workplace_event',
  REMINDER: 'reminder',
  EMPLOYMENT_MILESTONE: 'employment_milestone',
};

export const EVENT_VISIBILITY = {
  PUBLIC: 'public',
  WORKER_PRIVATE: 'worker_private',
  MANAGEMENT: 'management',
};

export const EVENT_TYPE_META = {
  [CALENDAR_EVENT_TYPES.ASSIGNED_SHIFT]: {
    label: 'Shift',
    color: 'bg-blue-500',
    textColor: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    icon: 'Clock',
    editability: false,
  },
  [CALENDAR_EVENT_TYPES.PERSONAL_WORK_EVENT]: {
    label: 'Personal',
    color: 'bg-emerald-500',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    icon: 'StickyNote',
    editability: true,
  },
  [CALENDAR_EVENT_TYPES.COMPLIANCE_DEADLINE]: {
    label: 'Compliance',
    color: 'bg-purple-500',
    textColor: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-200 dark:border-purple-800',
    icon: 'Shield',
    editability: false,
  },
  [CALENDAR_EVENT_TYPES.WORKPLACE_EVENT]: {
    label: 'Event',
    color: 'bg-amber-500',
    textColor: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
    icon: 'CalendarDays',
    editability: false,
  },
  [CALENDAR_EVENT_TYPES.REMINDER]: {
    label: 'Reminder',
    color: 'bg-slate-400',
    textColor: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-50 dark:bg-slate-900/30',
    borderColor: 'border-slate-200 dark:border-slate-800',
    icon: 'Bell',
    editability: true,
  },
  [CALENDAR_EVENT_TYPES.EMPLOYMENT_MILESTONE]: {
    label: 'Milestone',
    color: 'bg-gradient-to-br from-amber-400 to-orange-500',
    textColor: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-800',
    icon: 'Award',
    editability: false,
  },
};

/**
 * Normalises a Shift record into a calendar event.
 */
export function shiftToEvent(shift) {
  if (!shift) return null;
  return {
    id: `shift-${shift.id}`,
    source: 'Shift',
    source_id: shift.id,
    type: CALENDAR_EVENT_TYPES.ASSIGNED_SHIFT,
    title: 'Shift',
    date: shift.date,
    start: shift.start_time || null,
    end: shift.end_time || null,
    all_day: false,
    outlet_id: shift.outlet_id || null,
    worker_id: shift.employee_id || null,
    visibility: EVENT_VISIBILITY.PUBLIC,
    editable: false,
    meta: { shift },
  };
}

/**
 * Normalises a WorkerCalendarEvent into a calendar event.
 */
export function personalEventToEvent(evt) {
  if (!evt) return null;
  return {
    id: `personal-${evt.id}`,
    source: 'WorkerCalendarEvent',
    source_id: evt.id,
    type: evt.category === 'reminder'
      ? CALENDAR_EVENT_TYPES.REMINDER
      : CALENDAR_EVENT_TYPES.PERSONAL_WORK_EVENT,
    title: evt.title,
    date: evt.date,
    start: evt.all_day ? null : evt.start_time,
    end: evt.all_day ? null : evt.end_time,
    all_day: evt.all_day || false,
    outlet_id: evt.outlet_id || null,
    worker_id: evt.worker_id || null,
    visibility: evt.visibility === 'managers_only'
      ? EVENT_VISIBILITY.MANAGEMENT
      : EVENT_VISIBILITY.WORKER_PRIVATE,
    editable: true,
    meta: { event: evt },
  };
}

/**
 * Normalises a ComplianceRecord deadline into a calendar event.
 */
export function complianceToEvent(record) {
  if (!record || !record.due_date) return null;
  return {
    id: `compliance-${record.id}`,
    source: 'ComplianceRecord',
    source_id: record.id,
    type: CALENDAR_EVENT_TYPES.COMPLIANCE_DEADLINE,
    title: record.title || record.type || 'Compliance Due',
    date: record.due_date,
    start: null,
    end: null,
    all_day: true,
    outlet_id: record.outlet_id || null,
    worker_id: null,
    visibility: EVENT_VISIBILITY.PUBLIC,
    editable: false,
    meta: { record },
  };
}

/**
 * Normalises an Announcement into a calendar event (if it has a date).
 */
export function announcementToEvent(ann) {
  if (!ann || !ann.created_date) return null;
  // Announcements are point-in-time; treat as all-day on creation date
  const dateStr = ann.created_date.split('T')[0];
  return {
    id: `announcement-${ann.id}`,
    source: 'Announcement',
    source_id: ann.id,
    type: CALENDAR_EVENT_TYPES.WORKPLACE_EVENT,
    title: ann.title,
    date: dateStr,
    start: null,
    end: null,
    all_day: true,
    outlet_id: ann.outlet_id || null,
    worker_id: null,
    visibility: EVENT_VISIBILITY.PUBLIC,
    editable: false,
    meta: { announcement: ann },
  };
}

/**
 * Computes employment milestone events from an Employee record.
 * Returns anniversary events for the current year (1, 5, 10, 15, 20+ years).
 */
export function employeeMilestonesToEvents(employee, year = new Date().getFullYear()) {
  if (!employee || !employee.hire_date) return [];
  const hireDate = new Date(employee.hire_date);
  if (isNaN(hireDate.getTime())) return [];

  const milestoneYears = [1, 2, 3, 5, 10, 15, 20, 25];
  const events = [];

  for (const years of milestoneYears) {
    const milestoneDate = new Date(hireDate);
    milestoneDate.setFullYear(hireDate.getFullYear() + years);
    if (milestoneDate.getFullYear() === year) {
      const dateStr = milestoneDate.toISOString().split('T')[0];
      events.push({
        id: `milestone-${employee.id}-${years}yr`,
        source: 'Employee',
        source_id: employee.id,
        type: CALENDAR_EVENT_TYPES.EMPLOYMENT_MILESTONE,
        title: `${years}-Year Anniversary`,
        date: dateStr,
        start: null,
        end: null,
        all_day: true,
        outlet_id: employee.outlet_id || null,
        worker_id: employee.user_id || null,
        visibility: EVENT_VISIBILITY.PUBLIC,
        editable: false,
        meta: { employee, milestoneYears: years },
      });
    }
  }

  return events;
}

/**
 * Merges and sorts all event sources into a single array.
 * @param {object} sources — { shifts, personalEvents, complianceRecords, announcements, employee }
 * @returns {array} sorted calendar events
 */
export function buildCalendarEvents(sources = {}) {
  const {
    shifts = [],
    personalEvents = [],
    complianceRecords = [],
    announcements = [],
    employee = null,
  } = sources;

  const events = [
    ...(shifts || []).map(shiftToEvent).filter(Boolean),
    ...(personalEvents || []).map(personalEventToEvent).filter(Boolean),
    ...(complianceRecords || []).map(complianceToEvent).filter(Boolean),
    ...(announcements || []).map(announcementToEvent).filter(Boolean),
    ...employeeMilestonesToEvents(employee),
  ];

  return events.sort((a, b) => {
    const dateCompare = new Date(a.date) - new Date(b.date);
    if (dateCompare !== 0) return dateCompare;
    if (a.start && b.start) return a.start.localeCompare(b.start);
    if (a.start) return -1;
    if (b.start) return 1;
    return 0;
  });
}

/**
 * Filters events to a specific date.
 */
export function filterEventsByDate(events, dateStr) {
  return (events || []).filter(e => e.date === dateStr);
}

/**
 * Filters events to a date range (inclusive).
 * @param {array} events
 * @param {string} startDateStr — YYYY-MM-DD
 * @param {string} endDateStr — YYYY-MM-DD
 */
export function filterEventsByRange(events, startDateStr, endDateStr) {
  return (events || []).filter(e => e.date >= startDateStr && e.date <= endDateStr);
}