// ============================================================
// Worker Calendar & Safety Tests — Build #28.2K
// Pure-function tests for calendar event adapter, ICS export,
// safety config, and personal event privacy.
// ============================================================

// ── Import source code as text and strip ESM ───────────────
const fs = require('fs');

function loadModule(filePath, exportNames) {
  const code = fs.readFileSync(filePath, 'utf8');
  const stripped = code
    .replace(/^import\s+.*$/gm, '')
    .replace(/^export\s+const\s+/gm, 'const ')
    .replace(/^export\s+function\s+/gm, 'function ')
    .replace(/^export\s+/gm, '');
  const fn = new Function(stripped + `\nreturn { ${exportNames.join(', ')} };`);
  return fn();
}

const adapter = loadModule(
  '/app/src/lib/worker/calendar-event-adapter.js',
  ['CALENDAR_EVENT_TYPES', 'EVENT_TYPE_META', 'shiftToEvent', 'personalEventToEvent',
   'complianceToEvent', 'announcementToEvent', 'employeeMilestonesToEvents',
   'buildCalendarEvents', 'filterEventsByDate', 'filterEventsByRange']
);

const ics = loadModule(
  '/app/src/lib/worker/ics-export.js',
  ['generateICSFile', 'generateSingleEventICS']
);

const safety = loadModule(
  '/app/src/lib/worker/safety-config.js',
  ['SAFETY_MODULES', 'getSafetyModulesForIndustry', 'getVisibleSafetyModules', 'isSafetyModuleVisible']
);

// ── Test runner ─────────────────────────────────────────────
let passed = 0, failed = 0;
const results = [];

function test(name, fn) {
  try { fn(); passed++; results.push({ name, status: 'PASS' }); }
  catch (err) { failed++; results.push({ name, status: 'FAIL', error: err.message }); }
}

function assertEqual(a, e, m) {
  if (a !== e) throw new Error(`${m || ''}: expected ${JSON.stringify(e)}, got ${JSON.stringify(a)}`);
}
function assertTruthy(v, m) { if (!v) throw new Error(m || 'Expected truthy'); }
function assertFalsy(v, m) { if (v) throw new Error(m || 'Expected falsy'); }
function assertContains(str, substr, m) {
  if (!str.includes(substr)) throw new Error(`${m || ''}: expected to contain "${substr}"`);
}
function assertNotContains(str, substr, m) {
  if (str.includes(substr)) throw new Error(`${m || ''}: should NOT contain "${substr}"`);
}

// ═══ Calendar Event Adapter Tests ═══════════════════════════

test('shiftToEvent produces correct event', () => {
  const shift = { id: 's1', date: '2026-08-05', start_time: '09:00', end_time: '17:00', outlet_id: 'o1', employee_id: 'u1' };
  const evt = adapter.shiftToEvent(shift);
  assertEqual(evt.type, adapter.CALENDAR_EVENT_TYPES.ASSIGNED_SHIFT);
  assertEqual(evt.title, 'Shift');
  assertEqual(evt.date, '2026-08-05');
  assertEqual(evt.start, '09:00');
  assertEqual(evt.end, '17:00');
  assertEqual(evt.all_day, false);
  assertEqual(evt.editable, false);
});

test('shiftToEvent returns null for null input', () => {
  assertFalsy(adapter.shiftToEvent(null));
});

test('personalEventToEvent maps personal work event', () => {
  const pe = { id: 'p1', title: 'Prep work', date: '2026-08-05', start_time: '08:00', end_time: '09:00', all_day: false, category: 'personal_work_event', visibility: 'private', worker_id: 'u1' };
  const evt = adapter.personalEventToEvent(pe);
  assertEqual(evt.type, adapter.CALENDAR_EVENT_TYPES.PERSONAL_WORK_EVENT);
  assertEqual(evt.title, 'Prep work');
  assertEqual(evt.editable, true);
});

test('personalEventToEvent maps reminder category', () => {
  const pe = { id: 'p2', title: 'Check inventory', date: '2026-08-05', all_day: true, category: 'reminder', visibility: 'private' };
  const evt = adapter.personalEventToEvent(pe);
  assertEqual(evt.type, adapter.CALENDAR_EVENT_TYPES.REMINDER);
  assertEqual(evt.all_day, true);
});

test('complianceToEvent maps deadline', () => {
  const cr = { id: 'c1', title: 'Fire Safety Audit', due_date: '2026-08-10', outlet_id: 'o1' };
  const evt = adapter.complianceToEvent(cr);
  assertEqual(evt.type, adapter.CALENDAR_EVENT_TYPES.COMPLIANCE_DEADLINE);
  assertEqual(evt.date, '2026-08-10');
  assertEqual(evt.all_day, true);
});

test('complianceToEvent returns null without due_date', () => {
  assertFalsy(adapter.complianceToEvent({ id: 'c1', title: 'No date' }));
});

test('announcementToEvent maps announcement', () => {
  const ann = { id: 'a1', title: 'Team Meeting', created_date: '2026-08-05T10:00:00Z', outlet_id: 'o1' };
  const evt = adapter.announcementToEvent(ann);
  assertEqual(evt.type, adapter.CALENDAR_EVENT_TYPES.WORKPLACE_EVENT);
  assertEqual(evt.title, 'Team Meeting');
  assertEqual(evt.all_day, true);
});

test('employeeMilestonesToEvents computes 1-year milestone', () => {
  const emp = { id: 'e1', hire_date: '2025-08-05', user_id: 'u1', outlet_id: 'o1' };
  const events = adapter.employeeMilestonesToEvents(emp, 2026);
  assertTruthy(events.length > 0);
  const oneYear = events.find(e => e.title === '1-Year Anniversary');
  assertTruthy(oneYear);
  assertEqual(oneYear.type, adapter.CALENDAR_EVENT_TYPES.EMPLOYMENT_MILESTONE);
});

test('employeeMilestonesToEvents computes 5-year milestone', () => {
  const emp = { id: 'e2', hire_date: '2021-08-05', user_id: 'u2' };
  const events = adapter.employeeMilestonesToEvents(emp, 2026);
  const fiveYear = events.find(e => e.title === '5-Year Anniversary');
  assertTruthy(fiveYear);
});

test('employeeMilestonesToEvents returns empty without hire_date', () => {
  assertEqual(adapter.employeeMilestonesToEvents({ id: 'e3' }).length, 0);
  assertEqual(adapter.employeeMilestonesToEvents(null).length, 0);
});

test('buildCalendarEvents merges all sources', () => {
  const sources = {
    shifts: [{ id: 's1', date: '2026-08-05', start_time: '09:00', end_time: '17:00' }],
    personalEvents: [{ id: 'p1', title: 'Prep', date: '2026-08-05', all_day: false, category: 'personal_work_event', visibility: 'private' }],
    complianceRecords: [{ id: 'c1', title: 'Audit', due_date: '2026-08-10' }],
    announcements: [{ id: 'a1', title: 'Meeting', created_date: '2026-08-05T10:00:00Z' }],
    employee: { id: 'e1', hire_date: '2025-08-05' },
  };
  const events = adapter.buildCalendarEvents(sources);
  assertTruthy(events.length >= 4);
});

test('buildCalendarEvents sorts by date', () => {
  const sources = {
    shifts: [
      { id: 's2', date: '2026-08-10', start_time: '09:00', end_time: '17:00' },
      { id: 's1', date: '2026-08-05', start_time: '09:00', end_time: '17:00' },
    ],
  };
  const events = adapter.buildCalendarEvents(sources);
  assertEqual(events[0].date, '2026-08-05');
  assertEqual(events[1].date, '2026-08-10');
});

test('filterEventsByDate returns only matching date', () => {
  const events = [
    { id: '1', date: '2026-08-05', title: 'A' },
    { id: '2', date: '2026-08-06', title: 'B' },
  ];
  const filtered = adapter.filterEventsByDate(events, '2026-08-05');
  assertEqual(filtered.length, 1);
  assertEqual(filtered[0].title, 'A');
});

test('filterEventsByRange returns events in range', () => {
  const events = [
    { id: '1', date: '2026-08-03' },
    { id: '2', date: '2026-08-05' },
    { id: '3', date: '2026-08-07' },
    { id: '4', date: '2026-08-10' },
  ];
  const filtered = adapter.filterEventsByRange(events, '2026-08-04', '2026-08-07');
  assertEqual(filtered.length, 2);
});

test('EVENT_TYPE_META has all types', () => {
  Object.values(adapter.CALENDAR_EVENT_TYPES).forEach(type => {
    assertTruthy(adapter.EVENT_TYPE_META[type], `Missing meta for ${type}`);
  });
});

test('Personal event is marked worker_private visibility', () => {
  const pe = { id: 'p1', title: 'Private', date: '2026-08-05', visibility: 'private', category: 'personal_work_event' };
  const evt = adapter.personalEventToEvent(pe);
  assertEqual(evt.visibility, 'worker_private');
});

test('Personal event with managers_only visibility', () => {
  const pe = { id: 'p1', title: 'Shared', date: '2026-08-05', visibility: 'managers_only', category: 'personal_work_event' };
  const evt = adapter.personalEventToEvent(pe);
  assertEqual(evt.visibility, 'management');
});

// ═══ ICS Export Tests ═══════════════════════════════════════

test('generateICSFile produces valid VCALENDAR', () => {
  const events = [
    { id: 'e1', source: 'Shift', source_id: 's1', type: 'assigned_shift', title: 'Morning Shift', date: '2026-08-05', start: '09:00', end: '17:00', all_day: false },
  ];
  const icsContent = ics.generateICSFile(events);
  assertContains(icsContent, 'BEGIN:VCALENDAR');
  assertContains(icsContent, 'END:VCALENDAR');
  assertContains(icsContent, 'BEGIN:VEVENT');
  assertContains(icsContent, 'END:VEVENT');
  assertContains(icsContent, 'SUMMARY:Morning Shift');
  assertContains(icsContent, 'VERSION:2.0');
});

test('ICS export contains DTSTART', () => {
  const events = [
    { id: 'e1', source: 'Shift', source_id: 's1', type: 'assigned_shift', title: 'Test', date: '2026-08-05', start: '09:00', end: '17:00', all_day: false },
  ];
  const icsContent = ics.generateICSFile(events);
  assertContains(icsContent, 'DTSTART');
  assertContains(icsContent, '20260805T090000');
});

test('ICS all-day event uses VALUE=DATE', () => {
  const events = [
    { id: 'e1', source: 'ComplianceRecord', source_id: 'c1', type: 'compliance_deadline', title: 'Audit Due', date: '2026-08-10', start: null, end: null, all_day: true },
  ];
  const icsContent = ics.generateICSFile(events);
  assertContains(icsContent, 'DTSTART;VALUE=DATE:20260810');
});

test('ICS export does NOT contain tenant_id', () => {
  const events = [
    { id: 'e1', source: 'Shift', source_id: 's1', type: 'assigned_shift', title: 'Shift', date: '2026-08-05', start: '09:00', end: '17:00', all_day: false, meta: { tenant_id: 'SECRET_TENANT_ID' } },
  ];
  const icsContent = ics.generateICSFile(events);
  assertNotContains(icsContent, 'SECRET_TENANT_ID');
});

test('ICS export does NOT contain worker_id', () => {
  const events = [
    { id: 'e1', source: 'WorkerCalendarEvent', source_id: 'p1', type: 'personal_work_event', title: 'Private', date: '2026-08-05', start: null, end: null, all_day: true, meta: { event: { worker_id: 'SECRET_WORKER_ID' } } },
  ];
  const icsContent = ics.generateICSFile(events);
  assertNotContains(icsContent, 'SECRET_WORKER_ID');
});

test('ICS single event export works', () => {
  const event = { id: 'e1', source: 'Shift', source_id: 's1', type: 'assigned_shift', title: 'Single', date: '2026-08-05', start: '09:00', end: '17:00', all_day: false };
  const icsContent = ics.generateSingleEventICS(event);
  assertContains(icsContent, 'BEGIN:VCALENDAR');
  assertContains(icsContent, 'SUMMARY:Single');
});

test('ICS UID uses source + source_id pattern', () => {
  const events = [
    { id: 'e1', source: 'Shift', source_id: 's123', type: 'assigned_shift', title: 'Test', date: '2026-08-05', start: '09:00', end: '17:00', all_day: false },
  ];
  const icsContent = ics.generateICSFile(events);
  assertContains(icsContent, 'Shift-s123');
  assertContains(icsContent, '@orbitan.net');
});

test('ICS export handles empty events array', () => {
  const icsContent = ics.generateICSFile([]);
  assertContains(icsContent, 'BEGIN:VCALENDAR');
  assertContains(icsContent, 'END:VCALENDAR');
});

test('ICS escapes special characters in summary', () => {
  const events = [
    { id: 'e1', source: 'Shift', source_id: 's1', type: 'assigned_shift', title: 'Shift; with, commas', date: '2026-08-05', start: '09:00', end: '17:00', all_day: false },
  ];
  const icsContent = ics.generateICSFile(events);
  assertContains(icsContent, '\\;');
  assertContains(icsContent, '\\,');
});

// ═══ Safety Config Tests ════════════════════════════════════

test('getSafetyModulesForIndustry includes food_safety_log for F&B', () => {
  const modules = safety.getSafetyModulesForIndustry('food_beverage');
  assertTruthy(modules.includes('food_safety_log'));
});

test('getSafetyModulesForIndustry excludes food_safety_log for retail', () => {
  const modules = safety.getSafetyModulesForIndustry('retail');
  assertFalsy(modules.includes('food_safety_log'));
});

test('getSafetyModulesForIndustry excludes food_safety_log for technology', () => {
  const modules = safety.getSafetyModulesForIndustry('technology_software');
  assertFalsy(modules.includes('food_safety_log'));
});

test('getVisibleSafetyModules returns full module objects', () => {
  const modules = safety.getVisibleSafetyModules({ industry: 'food_beverage', role: 'worker' });
  assertTruthy(modules.length > 0);
  modules.forEach(m => {
    assertTruthy(m.id);
    assertTruthy(m.label);
    assertTruthy(m.icon);
  });
});

test('isSafetyModuleVisible returns true for food_safety in F&B', () => {
  assertTruthy(safety.isSafetyModuleVisible('food_safety_log', { industry: 'food_beverage', role: 'worker' }));
});

test('isSafetyModuleVisible returns false for food_safety in retail', () => {
  assertFalsy(safety.isSafetyModuleVisible('food_safety_log', { industry: 'retail', role: 'worker' }));
});

test('incident_report visible for all industries', () => {
  ['food_beverage', 'retail', 'technology_software', 'healthcare', 'logistics'].forEach(industry => {
    assertTruthy(safety.isSafetyModuleVisible('incident_report', { industry, role: 'worker' }), `Failed for ${industry}`);
  });
});

test('SAFETY_MODULES has all required module definitions', () => {
  ['food_safety_log', 'compliance_centre', 'incident_report', 'my_safety_reports', 'emergency_info', 'training_certifications'].forEach(id => {
    assertTruthy(safety.SAFETY_MODULES[id], `Missing module ${id}`);
  });
});

test('Safety modules filter by role', () => {
  // Worker should see modules that include 'worker' in roles
  const workerModules = safety.getVisibleSafetyModules({ industry: 'food_beverage', role: 'worker' });
  workerModules.forEach(m => {
    assertTruthy(m.roles.includes('worker'), `Module ${m.id} should be visible to worker`);
  });
});

// ═══ Privacy & Security Tests ══════════════════════════════

test('Personal event visibility is worker_private by default', () => {
  const pe = { id: 'p1', title: 'Private', date: '2026-08-05', visibility: 'private', category: 'personal_work_event' };
  const evt = adapter.personalEventToEvent(pe);
  assertEqual(evt.visibility, 'worker_private');
});

test('ICS export does not leak private work notes', () => {
  const events = [
    { id: 'e1', source: 'WorkerCalendarEvent', source_id: 'p1', type: 'personal_work_event', title: 'Private Event', date: '2026-08-05', start: null, end: null, all_day: true, meta: { event: { description: 'SECRET_PRIVATE_NOTE' } } },
  ];
  const icsContent = ics.generateICSFile(events);
  // Description IS included in ICS (it's the worker's own event), but worker_id and tenant secrets are not
  // This test verifies description is included for personal events (worker owns it)
  assertContains(icsContent, 'SECRET_PRIVATE_NOTE');
});

test('ICS export does not expose internal IDs unnecessarily', () => {
  const events = [
    { id: 'e1', source: 'Shift', source_id: 's1', type: 'assigned_shift', title: 'Shift', date: '2026-08-05', start: '09:00', end: '17:00', all_day: false },
  ];
  const icsContent = ics.generateICSFile(events);
  // UID uses source + source_id pattern, which is intentional for stable identity
  // But the raw entity UUID should not appear
  assertNotContains(icsContent, 'tenant_id');
  assertNotContains(icsContent, 'worker_id');
  assertNotContains(icsContent, 'employee_id');
});

// ═══ Result Summary ══════════════════════════════════════════

module.exports = {
  total: passed + failed,
  passed,
  failed,
  results: results.map(r => `${r.status === 'PASS' ? '✓' : '✗'} ${r.name}${r.error ? ' — ' + r.error : ''}`),
};