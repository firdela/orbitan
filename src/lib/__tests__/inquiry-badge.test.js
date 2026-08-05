// ============================================================
// ORBITANOS — Inquiry & Badge Tests (Build #28.2I)
// Pure-function tests for inquiry type resolution, CTA mapping,
// badge count formatting, and email routing configuration.
//
// These tests cover the testable pure functions. Backend email
// delivery and database persistence require a live environment.
// ============================================================

import {
  INQUIRY_TYPES, CTA_LABEL_MAP, getInquiryRoute, getInquiryType,
  ORGANISATION_SIZES, ORBITANOS_MODULES, CONTACT_METHODS,
  CONSENT_TEXT, CONSENT_VERSION,
} from '../inquiry-types';
import {
  formatBadgeCount, getBadgeAriaLabel, getBadgeVariant,
} from '../hooks/useAttentionCounts';

// ── Test runner ──
const results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, status: 'PASS' });
  } catch (err) {
    results.push({ name, status: 'FAIL', error: err.message });
  }
}
function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg || 'Assertion failed'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
function assertTruthy(val, msg) {
  if (!val) throw new Error(msg || 'Expected truthy value');
}
function assertFalsy(val, msg) {
  if (val) throw new Error(msg || 'Expected falsy value');
}

// ============================================================
// 1. CTA → Inquiry Type Mapping
// ============================================================

test('CTA "Request Pilot Access" maps to orbitanos_pilot', () => {
  const route = getInquiryRoute('Request Pilot Access');
  assertEqual(route, '/contact/interest?type=orbitanos_pilot', 'Route mismatch');
});

test('CTA "Register Interest" maps to orbit_nexus_interest', () => {
  const route = getInquiryRoute('Register Interest');
  assertEqual(route, '/contact/interest?type=orbit_nexus_interest', 'Route mismatch');
});

test('CTA "Join the Waitlist" maps to orbit_nexus_waitlist', () => {
  const route = getInquiryRoute('Join the Waitlist');
  assertEqual(route, '/contact/interest?type=orbit_nexus_waitlist', 'Route mismatch');
});

test('CTA "Enterprise Pilot Access" maps to enterprise_pilot', () => {
  const route = getInquiryRoute('Enterprise Pilot Access');
  assertEqual(route, '/contact/interest?type=enterprise_pilot', 'Route mismatch');
});

test('Unknown CTA falls back to generic inquiry route', () => {
  const route = getInquiryRoute('Unknown CTA');
  assertEqual(route, '/contact/interest', 'Fallback route mismatch');
});

// ============================================================
// 2. No CTA routes to Find Your Workplace (/request-access)
// ============================================================

test('No inquiry route contains /request-access', () => {
  Object.values(CTA_LABEL_MAP).forEach(type => {
    assertFalsy(type.route.includes('/request-access'), `Route for ${type.key} should not contain /request-access`);
  });
});

test('All inquiry routes start with /contact/interest', () => {
  Object.values(INQUIRY_TYPES).forEach(type => {
    assertTruthy(type.route.startsWith('/contact/interest'), `Route for ${type.key} should start with /contact/interest`);
  });
});

// ============================================================
// 3. Inquiry Type Resolution
// ============================================================

test('getInquiryType returns correct config for orbitanos_pilot', () => {
  const type = getInquiryType('orbitanos_pilot');
  assertEqual(type.key, 'orbitanos_pilot');
  assertEqual(type.product, 'orbitanos');
  assertEqual(type.ctaLabel, 'Request Pilot Access');
});

test('getInquiryType returns null for unknown type', () => {
  assertFalsy(getInquiryType('nonexistent_type'));
});

test('All 4 inquiry types are defined', () => {
  const keys = Object.keys(INQUIRY_TYPES);
  assertEqual(keys.length, 4, 'Should have exactly 4 inquiry types');
  assertTruthy(keys.includes('orbitanos_pilot'));
  assertTruthy(keys.includes('orbit_nexus_interest'));
  assertTruthy(keys.includes('orbit_nexus_waitlist'));
  assertTruthy(keys.includes('enterprise_pilot'));
});

// ============================================================
// 4. Form Field Configuration
// ============================================================

test('Organisation sizes have valid options', () => {
  assertTruthy(ORGANISATION_SIZES.length >= 5, 'Should have at least 5 org size options');
  assertTruthy(ORGANISATION_SIZES.some(s => s.value === 'solo'), 'Should have solo option');
  assertTruthy(ORGANISATION_SIZES.some(s => s.value === '500_plus'), 'Should have 500+ option');
});

test('OrbitanOS modules list is populated', () => {
  assertTruthy(ORBITANOS_MODULES.length >= 5, 'Should have at least 5 module options');
});

test('Contact methods include email and phone', () => {
  assertTruthy(CONTACT_METHODS.some(m => m.value === 'email'));
  assertTruthy(CONTACT_METHODS.some(m => m.value === 'phone'));
});

test('Consent text is non-empty and versioned', () => {
  assertTruthy(CONSENT_TEXT.length > 50, 'Consent text should be substantial');
  assertTruthy(CONSENT_VERSION.includes('2026'), 'Consent version should include year');
});

// ============================================================
// 5. Badge Count Formatting
// ============================================================

test('formatBadgeCount returns null for zero', () => {
  assertEqual(formatBadgeCount(0), null);
});

test('formatBadgeCount returns null for null/undefined', () => {
  assertEqual(formatBadgeCount(null), null);
  assertEqual(formatBadgeCount(undefined), null);
});

test('formatBadgeCount returns string for valid count', () => {
  assertEqual(formatBadgeCount(1), '1');
  assertEqual(formatBadgeCount(5), '5');
  assertEqual(formatBadgeCount(99), '99');
});

test('formatBadgeCount returns 99+ for counts above 99', () => {
  assertEqual(formatBadgeCount(100), '99+');
  assertEqual(formatBadgeCount(500), '99+');
});

// ============================================================
// 6. Badge Accessible Labels
// ============================================================

test('getBadgeAriaLabel returns null for zero count', () => {
  assertEqual(getBadgeAriaLabel('tasks', 0), null);
});

test('getBadgeAriaLabel returns descriptive label for tasks', () => {
  const label = getBadgeAriaLabel('tasks', 4);
  assertTruthy(label.includes('4'), 'Label should include count');
  assertTruthy(label.includes('task'), 'Label should include module name');
});

test('getBadgeAriaLabel returns descriptive label for inventory', () => {
  const label = getBadgeAriaLabel('inventory', 2);
  assertTruthy(label.includes('2'), 'Label should include count');
  assertTruthy(label.includes('low-stock'), 'Label should include description');
});

// ============================================================
// 7. Badge Variant (Severity)
// ============================================================

test('getBadgeVariant returns null for zero count', () => {
  assertEqual(getBadgeVariant('tasks', 0), null);
});

test('getBadgeVariant returns error for high compliance count', () => {
  assertEqual(getBadgeVariant('compliance', 10), 'error');
});

test('getBadgeVariant returns warning for moderate compliance count', () => {
  assertEqual(getBadgeVariant('compliance', 3), 'warning');
});

test('getBadgeVariant returns default for tasks', () => {
  assertEqual(getBadgeVariant('tasks', 5), 'default');
});

// ============================================================
// 8. CTA Label Consistency
// ============================================================

test('Each CTA label maps to a unique inquiry type', () => {
  const types = Object.values(CTA_LABEL_MAP).map(t => t.key);
  const unique = new Set(types);
  assertEqual(types.length, unique.size, 'CTA labels should map to unique inquiry types');
});

test('Each inquiry type has a unique route', () => {
  const routes = Object.values(INQUIRY_TYPES).map(t => t.route);
  const unique = new Set(routes);
  assertEqual(routes.length, unique.size, 'Inquiry types should have unique routes');
});

// ============================================================
// Results Summary
// ============================================================

const passed = results.filter(r => r.status === 'PASS').length;
const failed = results.filter(r => r.status === 'FAIL').length;
const total = results.length;

console.log(`\n=== Inquiry & Badge Tests ===`);
console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}\n`);
results.forEach(r => {
  console.log(`  ${r.status === 'PASS' ? '✓' : '✗'} ${r.name}${r.error ? ` — ${r.error}` : ''}`);
});

// Export for potential CI integration
export { results, passed, failed, total };