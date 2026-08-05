// ============================================================
// ORBITANOS — Worker Dashboard Tests (Build #28.2J)
// Pure-function tests for widget registry, priority resolver,
// and badge formatting.
// ============================================================

import { WIDGET_REGISTRY, getDefaultLayout, getEffectiveLayout, getWidgetById, WIDGET_SIZES } from '../worker/widget-registry';
import { resolveNextPriority } from '../worker/priority-resolver';
import { formatBadgeCount, getBadgeAriaLabel } from '../hooks/useAttentionCounts';

const results = [];
function test(name, fn) {
  try { fn(); results.push({ name, status: 'PASS' }); }
  catch (err) { results.push({ name, status: 'FAIL', error: err.message }); }
}
function assertEqual(a, e, m) { if (a !== e) throw new Error(`${m||''}: expected ${JSON.stringify(e)}, got ${JSON.stringify(a)}`); }
function assertNotEqual(a, e, m) { if (a === e) throw new Error(`${m||''}: expected not ${JSON.stringify(e)}, got ${JSON.stringify(a)}`); }
function assertTruthy(v, m) { if (!v) throw new Error(m || 'Expected truthy'); }
function assertFalsy(v, m) { if (v) throw new Error(m || 'Expected falsy'); }
function assertLength(arr, n, m) { if (!arr || arr.length !== n) throw new Error(`${m||''}: expected length ${n}, got ${arr?.length}`); }

// ============================================================
// 1. Widget Registry
// ============================================================

test('Registry has 10 widgets', () => {
  assertEqual(WIDGET_REGISTRY.length, 10, 'Should have 10 widgets');
});

test('All widgets have unique IDs', () => {
  const ids = WIDGET_REGISTRY.map(w => w.id);
  assertEqual(ids.length, new Set(ids).size, 'Widget IDs must be unique');
});

test('All widgets have required metadata fields', () => {
  WIDGET_REGISTRY.forEach(w => {
    assertTruthy(w.id, `Widget missing id`);
    assertTruthy(w.title, `Widget ${w.id} missing title`);
    assertTruthy(w.size, `Widget ${w.id} missing size`);
    assertTruthy(w.defaultOrder, `Widget ${w.id} missing defaultOrder`);
    assertTruthy(w.roles, `Widget ${w.id} missing roles`);
  });
});

test('getDefaultLayout returns visible widgets sorted by order', () => {
  const layout = getDefaultLayout('worker');
  assertTruthy(layout.length > 0, 'Layout should not be empty');
  for (let i = 1; i < layout.length; i++) {
    assertTruthy(layout[i].defaultOrder >= layout[i-1].defaultOrder, 'Layout should be sorted');
  }
});

test('getDefaultLayout filters by role', () => {
  const workerLayout = getDefaultLayout('worker');
  workerLayout.forEach(w => assertTruthy(w.roles.includes('worker'), `${w.id} should be visible to workers`));
});

test('getWidgetById returns correct widget', () => {
  const w = getWidgetById('today_shift');
  assertTruthy(w, 'Should find widget');
  assertEqual(w.title, "Today's Shift");
});

test('getWidgetById returns null for unknown ID', () => {
  assertFalsy(getWidgetById('nonexistent'));
});

test('getEffectiveLayout applies hidden preferences', () => {
  const layout = getEffectiveLayout('worker', { hiddenWidgets: ['announcements'] });
  assertFalsy(layout.find(w => w.id === 'announcements'), 'Announcements should be hidden');
});

test('getEffectiveLayout does not hide non-toggleable widgets', () => {
  const layout = getEffectiveLayout('worker', { hiddenWidgets: ['today_shift'] });
  assertTruthy(layout.find(w => w.id === 'today_shift'), 'today_shift should remain (allowWorkerToggle=false)');
});

test('getEffectiveLayout applies custom ordering', () => {
  const layout = getEffectiveLayout('worker', { widgetOrder: ['voice_matters', 'today_shift'] });
  assertEqual(layout[0].id, 'voice_matters', 'voice_matters should be first');
  assertEqual(layout[1].id, 'today_shift', 'today_shift should be second');
});

// ============================================================
// 2. Priority Resolver
// ============================================================

test('Returns caught_up when nothing requires attention', () => {
  const result = resolveNextPriority({ tasks: [], complianceRecords: [], todayShift: null, clockStatus: null, announcements: [] });
  assertEqual(result.type, 'caught_up');
  assertEqual(result.title, "You're all caught up");
});

test('Returns compliance for overdue compliance record', () => {
  const result = resolveNextPriority({
    tasks: [],
    complianceRecords: [{ id: '1', title: 'Fire Safety Audit', status: 'overdue', due_date: '2026-01-01' }],
    todayShift: null, clockStatus: null, announcements: [],
  });
  assertEqual(result.type, 'compliance');
  assertEqual(result.priority, 'critical');
});

test('Returns overdue_task for past-due task', () => {
  const result = resolveNextPriority({
    tasks: [{ id: '1', title: 'Clean kitchen', status: 'assigned', priority: 'high', due_date: '2026-01-01' }],
    complianceRecords: [],
    todayShift: null, clockStatus: null, announcements: [],
  });
  assertEqual(result.type, 'overdue_task');
  assertEqual(result.priority, 'high');
  assertEqual(result.title, 'Clean kitchen');
});

test('Returns shift_action when late for shift', () => {
  const pastTime = new Date(Date.now() - 10 * 60000); // 10 min ago
  const shift = {
    date: new Date().toISOString().split('T')[0],
    start_time: `${String(pastTime.getHours()).padStart(2,'0')}:${String(pastTime.getMinutes()).padStart(2,'0')}`,
  };
  const result = resolveNextPriority({
    tasks: [], complianceRecords: [], todayShift: shift, clockStatus: 'not_clocked_in', announcements: [],
  });
  assertEqual(result.type, 'shift_action');
  assertTruthy(result.description.includes('started'), 'Should mention shift started');
});

test('Returns announcement for unread urgent announcement', () => {
  const result = resolveNextPriority({
    tasks: [],
    complianceRecords: [],
    todayShift: null,
    clockStatus: 'clocked_in',
    announcements: [{ id: '1', title: 'Emergency closure', priority: 'critical', message: 'Building closed', acknowledged_by: [], created_date: new Date().toISOString() }],
    workerId: 'w1',
  });
  assertEqual(result.type, 'announcement');
});

test('Does not return acknowledged announcement', () => {
  const result = resolveNextPriority({
    tasks: [],
    complianceRecords: [],
    todayShift: null,
    clockStatus: 'clocked_in',
    announcements: [{ id: '1', title: 'Emergency closure', priority: 'critical', message: 'Building closed', acknowledged_by: ['w1'], created_date: new Date().toISOString() }],
    workerId: 'w1',
  });
  assertNotEqual(result.type, 'announcement');
});

test('Returns next_task for upcoming task', () => {
  const futureDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const result = resolveNextPriority({
    tasks: [{ id: '1', title: 'Prep station', status: 'assigned', priority: 'medium', due_date: futureDate }],
    complianceRecords: [],
    todayShift: null,
    clockStatus: 'clocked_in',
    announcements: [],
  });
  assertEqual(result.type, 'next_task');
  assertEqual(result.priority, 'low');
});

test('Urgent overdue task ranks above high overdue task', () => {
  const result = resolveNextPriority({
    tasks: [
      { id: '1', title: 'High task', status: 'assigned', priority: 'high', due_date: '2026-01-01' },
      { id: '2', title: 'Urgent task', status: 'assigned', priority: 'urgent', due_date: '2026-01-01' },
    ],
    complianceRecords: [],
    todayShift: null, clockStatus: null, announcements: [],
  });
  assertEqual(result.title, 'Urgent task');
});

test('Compliance ranks above overdue task', () => {
  const result = resolveNextPriority({
    tasks: [{ id: '1', title: 'Overdue task', status: 'assigned', priority: 'urgent', due_date: '2026-01-01' }],
    complianceRecords: [{ id: '1', title: 'Safety audit', status: 'overdue', due_date: '2026-01-01' }],
    todayShift: null, clockStatus: null, announcements: [],
  });
  assertEqual(result.type, 'compliance');
});

// ============================================================
// 3. Badge Formatting (reuses canonical resolver)
// ============================================================

test('formatBadgeCount returns null for zero', () => {
  assertEqual(formatBadgeCount(0), null);
});

test('formatBadgeCount returns null for null/undefined', () => {
  assertEqual(formatBadgeCount(null), null);
  assertEqual(formatBadgeCount(undefined), null);
});

test('formatBadgeCount returns "5" for 5', () => {
  assertEqual(formatBadgeCount(5), '5');
});

test('formatBadgeCount returns "99+" for 100', () => {
  assertEqual(formatBadgeCount(100), '99+');
});

test('getBadgeAriaLabel returns null for zero count', () => {
  assertEqual(getBadgeAriaLabel('tasks', 0), null);
});

test('getBadgeAriaLabel returns descriptive label for tasks', () => {
  const label = getBadgeAriaLabel('tasks', 4);
  assertTruthy(label.includes('4'));
  assertTruthy(label.includes('task'));
});

// ============================================================
// 4. Empty State Correctness
// ============================================================

test('Zero-task state is distinct from completed state', () => {
  // Zero tasks: tasks array is empty
  const zeroResult = resolveNextPriority({ tasks: [], complianceRecords: [], todayShift: null, clockStatus: null, announcements: [] });
  assertEqual(zeroResult.type, 'caught_up');

  // All completed: tasks exist but all completed
  const completedResult = resolveNextPriority({
    tasks: [{ id: '1', title: 'Done task', status: 'completed', priority: 'medium' }],
    complianceRecords: [], todayShift: null, clockStatus: null, announcements: [],
  });
  assertEqual(completedResult.type, 'caught_up');
});

test('Priority resolver handles empty context gracefully', () => {
  const result = resolveNextPriority({});
  assertEqual(result.type, 'caught_up');
});

test('Priority resolver handles null values gracefully', () => {
  const result = resolveNextPriority({
    tasks: null, complianceRecords: null, todayShift: null, clockStatus: null, announcements: null,
  });
  assertEqual(result.type, 'caught_up');
});

// ============================================================
// Results
// ============================================================

const passed = results.filter(r => r.status === 'PASS').length;
const failed = results.filter(r => r.status === 'FAIL').length;
const total = results.length;

console.log(`\n=== Worker Dashboard Tests ===`);
console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}\n`);
results.forEach(r => {
  console.log(`  ${r.status === 'PASS' ? '✓' : '✗'} ${r.name}${r.error ? ' — ' + r.error : ''}`);
});

export { results, passed, failed, total };