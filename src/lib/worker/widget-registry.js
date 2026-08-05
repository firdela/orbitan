// ============================================================
// ORBITANOS — Worker Dashboard Widget Registry (Build #28.2J)
// ------------------------------------------------------------
// Canonical registry of all worker dashboard widgets.
// Each entry defines metadata for configurable rendering.
//
// This file is PURE DATA — no React imports — so it can be
// imported by tests and non-React contexts.
//
// The WorkerHomeScreen maps these IDs to React components
// via WIDGET_COMPONENTS in widget-components.jsx.
//
// Exit-Ready: pure data, portable to any stack.
// ============================================================

export const WIDGET_SIZES = {
  FULL: 'full',   // spans both columns on tablet/desktop
  HALF: 'half',  // spans one column on tablet/desktop
};

export const EMPTY_BEHAVIORS = {
  HIDE: 'hide',              // widget renders null when data is empty
  EMPTY_STATE: 'empty_state', // widget shows a meaningful empty state
};

/**
 * Canonical worker dashboard widget registry.
 * Order = default display order.
 */
export const WIDGET_REGISTRY = [
  {
    id: 'today_shift',
    title: "Today's Shift",
    size: WIDGET_SIZES.FULL,
    defaultOrder: 1,
    defaultVisible: true,
    allowWorkerToggle: false,  // always visible — core clock-in flow
    emptyBehavior: EMPTY_BEHAVIORS.EMPTY_STATE,
    roles: ['worker', 'supervisor'],
    description: 'Current shift details with clock-in/out action.',
  },
  {
    id: 'next_priority',
    title: 'Next Priority',
    size: WIDGET_SIZES.FULL,
    defaultOrder: 2,
    defaultVisible: true,
    allowWorkerToggle: false,  // always visible — safety-critical
    emptyBehavior: EMPTY_BEHAVIORS.EMPTY_STATE,
    roles: ['worker', 'supervisor'],
    description: 'Single highest-priority actionable item for the worker.',
  },
  {
    id: 'today_tasks',
    title: "Today's Tasks",
    size: WIDGET_SIZES.FULL,
    defaultOrder: 3,
    defaultVisible: true,
    allowWorkerToggle: true,
    emptyBehavior: EMPTY_BEHAVIORS.EMPTY_STATE,
    roles: ['worker', 'supervisor'],
    description: 'Task summary with counts, progress, and next actionable task.',
  },
  {
    id: 'quick_actions',
    title: 'Quick Actions',
    size: WIDGET_SIZES.FULL,
    defaultOrder: 4,
    defaultVisible: true,
    allowWorkerToggle: true,
    emptyBehavior: EMPTY_BEHAVIORS.HIDE,
    roles: ['worker', 'supervisor'],
    description: 'Compact grid of 3-4 highest-value navigation actions.',
  },
  {
    id: 'upcoming_shifts',
    title: 'Upcoming Shifts',
    size: WIDGET_SIZES.HALF,
    defaultOrder: 5,
    defaultVisible: true,
    allowWorkerToggle: true,
    emptyBehavior: EMPTY_BEHAVIORS.EMPTY_STATE,
    roles: ['worker', 'supervisor'],
    description: 'Next 2-3 scheduled shifts with date, time, outlet.',
  },
  {
    id: 'safety_compliance',
    title: 'Safety & Compliance',
    size: WIDGET_SIZES.HALF,
    defaultOrder: 6,
    defaultVisible: true,
    allowWorkerToggle: true,
    emptyBehavior: EMPTY_BEHAVIORS.HIDE,
    roles: ['worker', 'supervisor'],
    description: 'Required safety logs, incomplete checks, overdue acknowledgements.',
  },
  {
    id: 'weekly_attendance',
    title: 'Weekly Attendance',
    size: WIDGET_SIZES.HALF,
    defaultOrder: 7,
    defaultVisible: true,
    allowWorkerToggle: true,
    emptyBehavior: EMPTY_BEHAVIORS.EMPTY_STATE,
    roles: ['worker', 'supervisor'],
    description: 'Current-week attendance summary: scheduled vs completed hours.',
  },
  {
    id: 'my_progress',
    title: 'My Progress',
    size: WIDGET_SIZES.HALF,
    defaultOrder: 8,
    defaultVisible: true,
    allowWorkerToggle: true,
    emptyBehavior: EMPTY_BEHAVIORS.EMPTY_STATE,
    roles: ['worker', 'supervisor'],
    description: 'Single concise progress indicator (today\'s task completion).',
  },
  {
    id: 'announcements',
    title: 'Announcements',
    size: WIDGET_SIZES.FULL,
    defaultOrder: 9,
    defaultVisible: true,
    allowWorkerToggle: true,
    emptyBehavior: EMPTY_BEHAVIORS.EMPTY_STATE,
    roles: ['worker', 'supervisor'],
    description: 'Recent or unread workplace announcements.',
  },
  {
    id: 'voice_matters',
    title: 'Your Voice Matters',
    size: WIDGET_SIZES.FULL,
    defaultOrder: 10,
    defaultVisible: true,
    allowWorkerToggle: true,
    emptyBehavior: EMPTY_BEHAVIORS.HIDE,
    roles: ['worker', 'supervisor'],
    description: 'Feedback CTA — suggestions, praise, escalations.',
  },
];

/**
 * Get the default widget layout (visible widgets in default order).
 * @param {string} userRole — the worker's role
 * @returns {Array} visible widgets sorted by defaultOrder
 */
export function getDefaultLayout(userRole = 'worker') {
  return WIDGET_REGISTRY
    .filter(w => w.defaultVisible && w.roles.includes(userRole))
    .sort((a, b) => a.defaultOrder - b.defaultOrder);
}

/**
 * Resolve the effective widget layout given user preferences.
 * @param {string} userRole
 * @param {object} prefs — { hiddenWidgets: string[], widgetOrder: string[] }
 * @returns {Array} effective widget layout
 */
export function getEffectiveLayout(userRole = 'worker', prefs = {}) {
  const hidden = new Set(prefs.hiddenWidgets || []);
  const order = prefs.widgetOrder || [];

  let layout = getDefaultLayout(userRole);

  // Apply worker-toggled visibility (only for widgets that allow it)
  layout = layout.filter(w => {
    if (hidden.has(w.id) && w.allowWorkerToggle) return false;
    return true;
  });

  // Apply custom ordering if provided
  if (order.length > 0) {
    layout.sort((a, b) => {
      const aIdx = order.indexOf(a.id);
      const bIdx = order.indexOf(b.id);
      if (aIdx === -1 && bIdx === -1) return a.defaultOrder - b.defaultOrder;
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });
  }

  return layout;
}

/**
 * Get a single widget definition by ID.
 */
export function getWidgetById(id) {
  return WIDGET_REGISTRY.find(w => w.id === id) || null;
}