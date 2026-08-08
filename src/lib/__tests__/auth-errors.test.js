/* global process */
// ============================================================
// ORBITAN — Authentication Error Mapping Test Suite
//
// Pure-function tests for the canonical auth error classification
// layer (src/lib/auth-errors.js) and redirect utilities
// (src/lib/auth-redirects.js). No network calls, no SDK mocks.
//
// Run via the dev test runner or import in a backend harness.
// ============================================================

import {
  classifyAuthError,
  classifyLoginError,
  classifyRegisterError,
  classifyVerifyError,
  classifyResetError,
  classifySessionError,
  AUTH_ERROR_TYPES,
} from '../auth-errors.js';
import {
  sanitizePath,
  isAuthRoute,
  resolveReturnUrl,
} from '../auth-redirects.js';

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// ── Login Error Classification ──
test('Login: invalid credentials → safe generic message', () => {
  const result = classifyLoginError({ message: 'Invalid credentials', status: 400 });
  assert(result.type === AUTH_ERROR_TYPES.INVALID_CREDENTIALS, 'Should classify as invalid_credentials');
  assert(!result.message.includes('Invalid credentials'), 'Should not expose raw message');
  assert(result.message.includes('Invalid email or password'), 'Should show safe message');
});

test('Login: rate limited → safe message', () => {
  const result = classifyLoginError({ message: 'Too many requests', status: 429 });
  assert(result.type === AUTH_ERROR_TYPES.RATE_LIMITED, 'Should classify as rate_limited');
  assert(result.message.includes('Too many attempts'), 'Should show rate-limit message');
});

test('Login: disabled account → safe message', () => {
  const result = classifyLoginError({ message: 'Account disabled', status: 403 });
  assert(result.type === AUTH_ERROR_TYPES.ACCOUNT_DISABLED, 'Should classify as account_disabled');
  assert(result.message.includes('suspended'), 'Should show suspension message');
});

test('Login: unverified email → verification required', () => {
  const result = classifyLoginError({ message: 'Email not verified', status: 403 });
  assert(result.type === AUTH_ERROR_TYPES.VERIFICATION_REQUIRED, 'Should classify as verification_required');
  assert(result.message.includes('verify'), 'Should mention verification');
});

test('Login: network failure → safe message', () => {
  const result = classifyLoginError({ message: 'Failed to fetch', status: 0 });
  assert(result.type === AUTH_ERROR_TYPES.NETWORK_FAILURE, 'Should classify as network_failure');
  assert(result.message.includes('internet connection'), 'Should show network message');
});

test('Login: 5xx → service unavailable', () => {
  const result = classifyLoginError({ message: 'Internal server error', status: 500 });
  assert(result.type === AUTH_ERROR_TYPES.SERVICE_UNAVAILABLE, 'Should classify as service_unavailable');
  assert(result.message.includes('temporarily unavailable'), 'Should show service message');
});

// ── Registration Error Classification ──
test('Register: duplicate email → account exists', () => {
  const result = classifyRegisterError({ message: 'User already exists', status: 409 });
  assert(result.type === AUTH_ERROR_TYPES.ACCOUNT_EXISTS, 'Should classify as account_exists');
  assert(result.message.includes('already exists'), 'Should mention account exists');
});

test('Register: weak password → password policy', () => {
  const result = classifyRegisterError({ message: 'Password too weak' });
  assert(result.type === AUTH_ERROR_TYPES.PASSWORD_POLICY, 'Should classify as password_policy');
  assert(result.message.includes('8 characters'), 'Should mention password requirements');
});

test('Register: rate limited → safe message', () => {
  const result = classifyRegisterError({ message: 'Too many requests', status: 429 });
  assert(result.type === AUTH_ERROR_TYPES.RATE_LIMITED, 'Should classify as rate_limited');
});

// ── Verification Error Classification ──
test('Verify: expired code → expired verification', () => {
  const result = classifyVerifyError({ message: 'Code expired' });
  assert(result.type === AUTH_ERROR_TYPES.EXPIRED_VERIFICATION_CODE, 'Should classify as expired_verification_code');
  assert(result.message.includes('expired'), 'Should mention expiry');
});

test('Verify: invalid code → invalid verification', () => {
  const result = classifyVerifyError({ message: 'Invalid OTP code' });
  assert(result.type === AUTH_ERROR_TYPES.INVALID_VERIFICATION_CODE, 'Should classify as invalid_verification_code');
  assert(result.message.includes('incorrect'), 'Should mention incorrect');
});

test('Verify: already verified → already verified state', () => {
  const result = classifyVerifyError({ message: 'Email already verified' });
  assert(result.type === AUTH_ERROR_TYPES.ACCOUNT_ALREADY_VERIFIED, 'Should classify as already_verified');
});

// ── Reset Error Classification ──
test('Reset: expired token → expired reset link', () => {
  const result = classifyResetError({ message: 'Token expired' });
  assert(result.type === AUTH_ERROR_TYPES.EXPIRED_RESET_LINK, 'Should classify as expired_reset_link');
  assert(result.message.includes('expired'), 'Should mention expiry');
});

test('Reset: invalid token → expired reset link', () => {
  const result = classifyResetError({ message: 'Invalid token' });
  assert(result.type === AUTH_ERROR_TYPES.EXPIRED_RESET_LINK, 'Should classify as expired_reset_link');
  assert(result.message.includes('no longer valid'), 'Should mention invalidity');
});

test('Reset: weak password → password policy', () => {
  const result = classifyResetError({ message: 'Password too short' });
  assert(result.type === AUTH_ERROR_TYPES.PASSWORD_POLICY, 'Should classify as password_policy');
});

// ── Session Error Classification ──
test('Session: 401 with token message → session expired', () => {
  const result = classifySessionError({ message: 'Token expired', status: 401 });
  assert(result.type === AUTH_ERROR_TYPES.SESSION_EXPIRED, 'Should classify as session_expired');
  assert(result.message.includes('session has expired'), 'Should mention session expiry');
});

test('Session: 403 forbidden → forbidden', () => {
  const result = classifySessionError({ message: 'Access forbidden', status: 403 });
  assert(result.type === AUTH_ERROR_TYPES.FORBIDDEN, 'Should classify as forbidden');
});

// ── Non-enumeration check ──
test('Non-enumeration: forgot-password should never reveal account existence', () => {
  // The ForgotPassword page always shows the same success message regardless
  // of whether the email exists. The classifyAuthError function should NOT
  // return account-existence-revealing errors for the reset_request context.
  const result = classifyAuthError({ message: 'User not found' }, { context: 'reset_request' });
  assert(!result.message.includes('not found'), 'Should not reveal account non-existence');
  assert(!result.message.includes('does not exist'), 'Should not reveal account non-existence');
});

// ── Redirect Sanitization ──
test('Sanitize: valid same-origin path → allowed', () => {
  const result = sanitizePath('/workspace');
  assert(result === '/workspace', 'Should allow valid path');
});

test('Sanitize: path with query params → allowed', () => {
  const result = sanitizePath('/workspace?tenant=123');
  assert(result === '/workspace?tenant=123', 'Should allow path with query');
});

test('Sanitize: protocol-relative URL → rejected (open redirect)', () => {
  const result = sanitizePath('//evil.com');
  assert(result === null, 'Should reject protocol-relative URL');
});

test('Sanitize: backslash escape → rejected (open redirect)', () => {
  const result = sanitizePath('/\\evil.com');
  assert(result === null, 'Should reject backslash escape');
});

test('Sanitize: javascript: URL → rejected', () => {
  const result = sanitizePath('javascript:alert(1)');
  assert(result === null, 'Should reject javascript: URL');
});

test('Sanitize: external URL → rejected', () => {
  const result = sanitizePath('https://evil.com');
  assert(result === null, 'Should reject external URL');
});

test('Sanitize: auth route → rejected (redirect loop prevention)', () => {
  const result = sanitizePath('/login');
  assert(result === null, 'Should reject auth route to prevent loop');
});

test('Sanitize: forbidden param stripped', () => {
  const result = sanitizePath('/workspace?access_token=evil');
  assert(result !== null, 'Should not reject entirely');
  assert(!result.includes('access_token'), 'Should strip forbidden param');
});

test('Sanitize: empty/null → rejected', () => {
  assert(sanitizePath('') === null, 'Should reject empty');
  assert(sanitizePath(null) === null, 'Should reject null');
  assert(sanitizePath(undefined) === null, 'Should reject undefined');
});

test('Sanitize: relative path without leading slash → rejected', () => {
  assert(sanitizePath('workspace') === null, 'Should reject relative path');
});

// ── Auth Route Detection ──
test('isAuthRoute: login path → true', () => {
  assert(isAuthRoute('/login') === true, 'Should detect /login as auth route');
});

test('isAuthRoute: workspace path → false', () => {
  assert(isAuthRoute('/workspace') === false, 'Should not detect /workspace as auth route');
});

test('isAuthRoute: reset-password path → true', () => {
  assert(isAuthRoute('/reset-password') === true, 'Should detect /reset-password as auth route');
});

// ── Raw message exposure check ──
test('Security: no raw backend error message exposed', () => {
  const contexts = ['login', 'register', 'verify', 'reset', 'session'];
  const rawMessages = [
    'Internal server error at /auth/v2/login',
    'Traceback: File "/app/auth.py", line 42',
    'token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    'password_hash=$2b$12$abcdef...',
  ];

  for (const ctx of contexts) {
    for (const raw of rawMessages) {
      const result = classifyAuthError({ message: raw }, { context: ctx });
      assert(!result.message.includes(raw), `Should not expose raw message in ${ctx} context`);
    }
  }
});

// ── Test Runner ──
function assert(condition, message) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

export function runAuthTests() {
  const results = [];
  let passed = 0;
  let failed = 0;

  for (const { name, fn } of tests) {
    try {
      fn();
      results.push({ name, status: 'pass' });
      passed++;
    } catch (err) {
      results.push({ name, status: 'fail', error: err.message });
      failed++;
    }
  }

  return {
    total: tests.length,
    passed,
    failed,
    passRate: `${Math.round((passed / tests.length) * 100)}%`,
    results,
  };
}

export const AUTH_TEST_COUNT = tests.length;

// ── Self-Executing Runner (for direct node execution) ──
// Polyfill browser environment for Node.js testing
if (typeof globalThis.window === 'undefined') {
  globalThis.window = { location: { origin: 'http://localhost:3000', pathname: '/', search: '' } };
}
if (typeof globalThis.sessionStorage === 'undefined') {
  const _store = new Map();
  globalThis.sessionStorage = {
    getItem: (k) => _store.has(k) ? _store.get(k) : null,
    setItem: (k, v) => _store.set(k, String(v)),
    removeItem: (k) => _store.delete(k),
    clear: () => _store.clear(),
  };
}

const _results = runAuthTests();
console.log('\n=== Auth Errors Test Results ===');
console.log(`Passed: ${_results.passed}`);
console.log(`Failed: ${_results.failed}`);
console.log(`Total: ${_results.total}`);
if (_results.failed > 0) {
  console.error('\n❌ FAILURES:');
  _results.results.filter(r => r.status === 'fail').forEach(r => console.error(`  - ${r.name}: ${r.error}`));
  process.exit(1);
}
console.log('\n✅ All auth error tests passed.');