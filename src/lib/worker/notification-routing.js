// ============================================================
// Worker Notification Deep-Link Routing
// Maps OrbitInbox categories and source entities to safe Worker
// destinations. Never routes to leader/admin/management workspaces.
// Pure JS — zero React imports — safe for tests.
// ============================================================

// OrbitInbox category → Worker Portal section
const CATEGORY_TO_SECTION = {
  assignment: 'tasks',
  scheduling: 'shifts',
  compliance: 'safety',
  onboarding: 'profile',
  security: 'profile',
  workforce: 'tasks',
  // Categories below stay in the inbox (no Worker section equivalent)
  reminder: null,
  mention: null,
  approval: null,
  inventory: null,
  procurement: null,
  finance: null,
  sales: null,
  customer_success: null,
  audit: null,
  ai_insight: null,
  renewal: null,
  system: null,
};

// OrbitInbox source_entity → Worker Portal section
const SOURCE_ENTITY_TO_SECTION = {
  Task: 'tasks',
  TaskAssignment: 'tasks',
  Shift: 'shifts',
  ShiftTradeRequest: 'shifts',
  ComplianceRecord: 'safety',
  SafetyReport: 'safety',
  FoodSafetyLog: 'safety',
  Employee: 'profile',
  AccessRequest: 'profile',
  WorkerCalendarEvent: 'shifts',
  Announcement: null,
};

// Worker Portal sections (valid destinations)
export const WORKER_SECTIONS = ['home', 'tasks', 'shifts', 'safety', 'profile'];

/**
 * Resolve an OrbitInbox item to a safe Worker destination.
 * Returns { section, type: 'worker_section' } or null (stay in inbox).
 */
export function resolveWorkerNotificationRoute(item) {
  if (!item || typeof item !== 'object') return null;

  // 1. Check source_entity first (most specific)
  if (item.source_entity && SOURCE_ENTITY_TO_SECTION[item.source_entity]) {
    return { section: SOURCE_ENTITY_TO_SECTION[item.source_entity], type: 'worker_section' };
  }

  // 2. Check category
  if (item.category && CATEGORY_TO_SECTION[item.category] !== undefined) {
    const section = CATEGORY_TO_SECTION[item.category];
    if (section) return { section, type: 'worker_section' };
  }

  // 3. Check event_type for keyword-based routing
  if (item.event_type && typeof item.event_type === 'string') {
    const et = item.event_type.toLowerCase();
    if (et.includes('task') || et.includes('assignment')) return { section: 'tasks', type: 'worker_section' };
    if (et.includes('shift') || et.includes('schedule')) return { section: 'shifts', type: 'worker_section' };
    if (et.includes('compliance') || et.includes('safety') || et.includes('food_safety')) return { section: 'safety', type: 'worker_section' };
    if (et.includes('profile') || et.includes('onboarding') || et.includes('account') || et.includes('security')) return { section: 'profile', type: 'worker_section' };
  }

  // 4. No matching Worker section — stay in inbox
  return null;
}

// Route prefixes that would take a Worker out of the Worker experience
const UNSAFE_ROUTE_PREFIXES = [
  '/workspace/',
  '/leader-org',
  '/platform/',
  '/admin',
  '/outlet/',
  '/audit-centre',
  '/user-roles',
  '/data-import',
  '/data-explorer',
  '/governance-log',
  '/suppliers',
  '/knowledge-hub',
  '/company',
  '/onboarding',
  '/request-access',
  '/checkout',
];

// Routes that are safe for Workers
const SAFE_WORKER_ROUTES = ['/worker', '/notifications', '/settings', '/support', '/contact/interest'];

/**
 * Validate that a link string is safe for a Worker to navigate to.
 * Rejects: absolute URLs, protocol-relative, javascript:, data:,
 * and any management/admin/leader route prefix.
 */
export function isSafeWorkerLink(link) {
  if (!link || typeof link !== 'string') return false;
  if (link.startsWith('http://') || link.startsWith('https://')) return false;
  if (link.startsWith('//')) return false;
  if (link.startsWith('javascript:')) return false;
  if (link.startsWith('data:')) return false;
  if (link.startsWith('blob:')) return false;
  if (link.startsWith('\\')) return false;

  for (const prefix of UNSAFE_ROUTE_PREFIXES) {
    if (link.startsWith(prefix)) return false;
  }

  return true;
}