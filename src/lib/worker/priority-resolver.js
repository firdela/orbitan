// ============================================================
// ORBITANOS — Worker Priority Resolver (Build #28.2J)
// ------------------------------------------------------------
// Single canonical resolver for the "Next Priority" widget.
// Determines the worker's highest-priority actionable item.
//
// Priority order (highest first):
//   1. Critical safety/compliance requirement
//   2. Overdue assigned task
//   3. Shift action requiring immediate attention
//   4. Urgent announcement (unread)
//   5. Next scheduled task (earliest due)
//
// If nothing requires attention, returns a "caught up" state.
//
// Exit-Ready: pure function, no platform dependencies.
// ============================================================

/**
 * Resolve the worker's next priority item.
 * @param {object} ctx — worker context
 * @param {Array} ctx.tasks — assigned tasks
 * @param {Array} ctx.complianceRecords — outlet compliance records
 * @param {object|null} ctx.todayShift — today's shift
 * @param {string} ctx.clockStatus — current clock status
 * @param {Array} ctx.announcements — active announcements
 * @param {string} ctx.workerId — for announcement read detection
 * @returns {object|null} priority item or "caught up" state
 */
export function resolveNextPriority(ctx = {}) {
  const {
    tasks = [],
    complianceRecords = [],
    todayShift = null,
    clockStatus = null,
    announcements = [],
    workerId = '',
  } = ctx;

  const now = new Date();

  // ── 1. Critical safety/compliance requirement ──
  const overdueCompliance = (complianceRecords || [])
    .filter(r => r.status === 'overdue' ||
      (r.due_date && new Date(r.due_date) < now && r.status !== 'approved'))
    .sort((a, b) => new Date(a.due_date || 0) - new Date(b.due_date || 0));

  if (overdueCompliance.length > 0) {
    const item = overdueCompliance[0];
    return {
      type: 'compliance',
      priority: 'critical',
      title: item.title || 'Compliance action required',
      description: item.type
        ? `${item.type} is overdue${item.due_date ? ` (due ${item.due_date})` : ''}.`
        : 'This compliance item requires immediate attention.',
      action: { label: 'Review', target: 'safety' },
    };
  }

  // ── 2. Overdue assigned task ──
  const overdueTasks = (tasks || [])
    .filter(t => t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'archived')
    .filter(t => t.due_date && new Date(t.due_date) < now)
    .sort((a, b) => {
      // urgent priority first, then earliest due date
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const aOrder = priorityOrder[a.priority] ?? 2;
      const bOrder = priorityOrder[b.priority] ?? 2;
      const pDiff = aOrder - bOrder;
      if (pDiff !== 0) return pDiff;
      return new Date(a.due_date) - new Date(b.due_date);
    });

  if (overdueTasks.length > 0) {
    const item = overdueTasks[0];
    return {
      type: 'overdue_task',
      priority: 'high',
      title: item.title,
      description: `This task is overdue${item.due_date ? ` (due ${item.due_date})` : ''}.`,
      action: { label: 'View Task', target: 'tasks' },
    };
  }

  // ── 3. Shift action requiring immediate attention ──
  if (todayShift) {
    const shiftStart = todayShift.start_time ? parseShiftTime(todayShift.start_time) : null;
    if (shiftStart && now > shiftStart && clockStatus !== 'clocked_in' && clockStatus !== 'on_break') {
      const lateMins = Math.floor((now - shiftStart) / 60000);
      return {
        type: 'shift_action',
        priority: 'high',
        title: 'Clock in for your shift',
        description: lateMins > 0
          ? `Your shift started ${lateMins} min ago. Clock in now.`
          : 'Your shift is starting. Clock in to begin.',
        action: { label: 'Clock In', target: 'home' },
      };
    }
  }

  // ── 4. Urgent announcement (unread) ──
  const urgentAnnouncements = (announcements || [])
    .filter(a => (a.priority === 'urgent' || a.priority === 'critical'))
    .filter(a => !(a.acknowledged_by || []).includes(workerId))
    .filter(a => !a.expiry_date || new Date(a.expiry_date) > now)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  if (urgentAnnouncements.length > 0) {
    const item = urgentAnnouncements[0];
    return {
      type: 'announcement',
      priority: 'medium',
      title: item.title,
      description: item.message
        ? (item.message.length > 80 ? item.message.slice(0, 80) + '…' : item.message)
        : 'You have an urgent announcement to read.',
      action: { label: 'Read', target: 'home' },
    };
  }

  // ── 5. Next scheduled task (earliest due) ──
  const upcomingTasks = (tasks || [])
    .filter(t => t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'archived')
    .filter(t => !t.due_date || new Date(t.due_date) >= now)
    .sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const aOrder = priorityOrder[a.priority] ?? 2;
      const bOrder = priorityOrder[b.priority] ?? 2;
      const pDiff = aOrder - bOrder;
      if (pDiff !== 0) return pDiff;
      if (a.due_date && b.due_date) return new Date(a.due_date) - new Date(b.due_date);
      return 0;
    });

  if (upcomingTasks.length > 0) {
    const item = upcomingTasks[0];
    return {
      type: 'next_task',
      priority: 'low',
      title: item.title,
      description: item.due_date
        ? `Due ${item.due_date}.`
        : 'Your next actionable task.',
      action: { label: 'View Task', target: 'tasks' },
    };
  }

  // ── Nothing requires attention ──
  return {
    type: 'caught_up',
    priority: 'info',
    title: "You're all caught up",
    description: 'No tasks or actions require your attention right now.',
    action: null,
  };
}

/**
 * Parse a shift time string (e.g. "09:00") into today's Date.
 */
function parseShiftTime(timeStr) {
  if (!timeStr) return null;
  try {
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return null;
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    return d;
  } catch {
    return null;
  }
}