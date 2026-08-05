/* global require, module */
// ============================================================
// Tests: Worker Notification Deep-Link Routing
// Pure-function tests — no React, no network, no DB.
// Run via: node src/lib/__tests__/worker-notification-routing.test.js
// ============================================================
const {
  resolveWorkerNotificationRoute,
  isSafeWorkerLink,
  WORKER_SECTIONS,
} = require('../worker/notification-routing');

let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    results.push({ status: 'PASS', name });
  } catch (e) {
    failed++;
    results.push({ status: 'FAIL', name, error: e.message });
  }
}

function assertEqual(actual, expected, msg) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(msg || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertTruthy(val, msg) {
  if (!val) throw new Error(msg || `Expected truthy, got ${val}`);
}

function assertFalsy(val, msg) {
  if (val) throw new Error(msg || `Expected falsy, got ${val}`);
}

// ═══ resolveWorkerNotificationRoute ══════════════════════════

test('assignment category routes to tasks', () => {
  const result = resolveWorkerNotificationRoute({ category: 'assignment' });
  assertEqual(result, { section: 'tasks', type: 'worker_section' });
});

test('scheduling category routes to shifts', () => {
  const result = resolveWorkerNotificationRoute({ category: 'scheduling' });
  assertEqual(result, { section: 'shifts', type: 'worker_section' });
});

test('compliance category routes to safety', () => {
  const result = resolveWorkerNotificationRoute({ category: 'compliance' });
  assertEqual(result, { section: 'safety', type: 'worker_section' });
});

test('onboarding category routes to profile', () => {
  const result = resolveWorkerNotificationRoute({ category: 'onboarding' });
  assertEqual(result, { section: 'profile', type: 'worker_section' });
});

test('security category routes to profile', () => {
  const result = resolveWorkerNotificationRoute({ category: 'security' });
  assertEqual(result, { section: 'profile', type: 'worker_section' });
});

test('workforce category routes to tasks', () => {
  const result = resolveWorkerNotificationRoute({ category: 'workforce' });
  assertEqual(result, { section: 'tasks', type: 'worker_section' });
});

test('reminder category returns null (stay in inbox)', () => {
  const result = resolveWorkerNotificationRoute({ category: 'reminder' });
  assertEqual(result, null);
});

test('mention category returns null (stay in inbox)', () => {
  const result = resolveWorkerNotificationRoute({ category: 'mention' });
  assertEqual(result, null);
});

test('inventory category returns null (not Worker-relevant)', () => {
  const result = resolveWorkerNotificationRoute({ category: 'inventory' });
  assertEqual(result, null);
});

test('finance category returns null (not Worker-relevant)', () => {
  const result = resolveWorkerNotificationRoute({ category: 'finance' });
  assertEqual(result, null);
});

test('source_entity Task overrides category', () => {
  const result = resolveWorkerNotificationRoute({ category: 'system', source_entity: 'Task' });
  assertEqual(result, { section: 'tasks', type: 'worker_section' });
});

test('source_entity Shift routes to shifts', () => {
  const result = resolveWorkerNotificationRoute({ source_entity: 'Shift' });
  assertEqual(result, { section: 'shifts', type: 'worker_section' });
});

test('source_entity SafetyReport routes to safety', () => {
  const result = resolveWorkerNotificationRoute({ source_entity: 'SafetyReport' });
  assertEqual(result, { section: 'safety', type: 'worker_section' });
});

test('source_entity ComplianceRecord routes to safety', () => {
  const result = resolveWorkerNotificationRoute({ source_entity: 'ComplianceRecord' });
  assertEqual(result, { section: 'safety', type: 'worker_section' });
});

test('source_entity Employee routes to profile', () => {
  const result = resolveWorkerNotificationRoute({ source_entity: 'Employee' });
  assertEqual(result, { section: 'profile', type: 'worker_section' });
});

test('source_entity Announcement returns null', () => {
  const result = resolveWorkerNotificationRoute({ source_entity: 'Announcement' });
  assertEqual(result, null);
});

test('event_type with "task" keyword routes to tasks', () => {
  const result = resolveWorkerNotificationRoute({ event_type: 'task_assigned' });
  assertEqual(result, { section: 'tasks', type: 'worker_section' });
});

test('event_type with "shift" keyword routes to shifts', () => {
  const result = resolveWorkerNotificationRoute({ event_type: 'shift_change' });
  assertEqual(result, { section: 'shifts', type: 'worker_section' });
});

test('event_type with "compliance" keyword routes to safety', () => {
  const result = resolveWorkerNotificationRoute({ event_type: 'compliance_overdue' });
  assertEqual(result, { section: 'safety', type: 'worker_section' });
});

test('event_type with "onboarding" keyword routes to profile', () => {
  const result = resolveWorkerNotificationRoute({ event_type: 'onboarding_action' });
  assertEqual(result, { section: 'profile', type: 'worker_section' });
});

test('null item returns null', () => {
  assertEqual(resolveWorkerNotificationRoute(null), null);
});

test('undefined item returns null', () => {
  assertEqual(resolveWorkerNotificationRoute(undefined), null);
});

test('empty object returns null', () => {
  assertEqual(resolveWorkerNotificationRoute({}), null);
});

test('unknown category returns null', () => {
  assertEqual(resolveWorkerNotificationRoute({ category: 'unknown_category' }), null);
});

// ═══ isSafeWorkerLink ════════════════════════════════════════

test('/worker is safe', () => {
  assertTruthy(isSafeWorkerLink('/worker'));
});

test('/notifications is safe', () => {
  assertTruthy(isSafeWorkerLink('/notifications'));
});

test('/settings is safe', () => {
  assertTruthy(isSafeWorkerLink('/settings'));
});

test('/support is safe', () => {
  assertTruthy(isSafeWorkerLink('/support'));
});

test('https://external.com is unsafe', () => {
  assertFalsy(isSafeWorkerLink('https://external.com'));
});

test('http://external.com is unsafe', () => {
  assertFalsy(isSafeWorkerLink('http://external.com'));
});

test('protocol-relative URL is unsafe', () => {
  assertFalsy(isSafeWorkerLink('//evil.com'));
});

test('javascript: URL is unsafe', () => {
  assertFalsy(isSafeWorkerLink('javascript:alert(1)'));
});

test('data: URL is unsafe', () => {
  assertFalsy(isSafeWorkerLink('data:text/html,evil'));
});

test('blob: URL is unsafe', () => {
  assertFalsy(isSafeWorkerLink('blob:evil'));
});

test('backslash escape is unsafe', () => {
  assertFalsy(isSafeWorkerLink('\\evil.com'));
});

test('/workspace/ route is unsafe', () => {
  assertFalsy(isSafeWorkerLink('/workspace/tenant1/inventory'));
});

test('/leader-org route is unsafe', () => {
  assertFalsy(isSafeWorkerLink('/leader-org'));
});

test('/platform/ route is unsafe', () => {
  assertFalsy(isSafeWorkerLink('/platform/wallet'));
});

test('/outlet/ route is unsafe', () => {
  assertFalsy(isSafeWorkerLink('/outlet/dashboard'));
});

test('/audit-centre route is unsafe', () => {
  assertFalsy(isSafeWorkerLink('/audit-centre'));
});

test('/admin route is unsafe', () => {
  assertFalsy(isSafeWorkerLink('/admin/settings'));
});

test('null link is unsafe', () => {
  assertFalsy(isSafeWorkerLink(null));
});

test('undefined link is unsafe', () => {
  assertFalsy(isSafeWorkerLink(undefined));
});

test('empty string link is unsafe', () => {
  assertFalsy(isSafeWorkerLink(''));
});

test('non-string link is unsafe', () => {
  assertFalsy(isSafeWorkerLink(123));
});

// ═══ WORKER_SECTIONS ═════════════════════════════════════════

test('WORKER_SECTIONS contains home', () => {
  assertTruthy(WORKER_SECTIONS.includes('home'));
});

test('WORKER_SECTIONS contains tasks', () => {
  assertTruthy(WORKER_SECTIONS.includes('tasks'));
});

test('WORKER_SECTIONS contains shifts', () => {
  assertTruthy(WORKER_SECTIONS.includes('shifts'));
});

test('WORKER_SECTIONS contains safety', () => {
  assertTruthy(WORKER_SECTIONS.includes('safety'));
});

test('WORKER_SECTIONS contains profile', () => {
  assertTruthy(WORKER_SECTIONS.includes('profile'));
});

test('WORKER_SECTIONS does not contain admin', () => {
  assertFalsy(WORKER_SECTIONS.includes('admin'));
});

test('WORKER_SECTIONS does not contain management', () => {
  assertFalsy(WORKER_SECTIONS.includes('management'));
});

// ═══ Result Summary ════════════════════════════════════════

module.exports = {
  total: passed + failed,
  passed,
  failed,
  results: results.map(r => `${r.status === 'PASS' ? '✓' : '✗'} ${r.name}${r.error ? ' — ' + r.error : ''}`),
};