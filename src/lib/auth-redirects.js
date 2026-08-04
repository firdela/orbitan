// ============================================================
// ORBITAN — Canonical Auth Redirect Utility
//
// Consolidates all return-URL resolution and safe-redirect logic
// into one place. Used by Login, Register, and AuthContext to
// ensure consistent, secure post-auth navigation.
//
// Security: Never allows open redirects. Only same-origin paths
// with a single leading slash are permitted. Strips app-bootstrap
// params that could hijack a freshly issued session.
// ============================================================

const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/auth/gateway', '/join', '/verify-email'];
const SESSION_KEY = 'orbitan_auth_return_url';
const SESSION_EXPIRY_FLAG = 'orbitan_session_expired';

// Parameters that could hijack a session if present in a return URL.
const FORBIDDEN_PARAMS = [
  'access_token', 'clear_access_token', 'app_id', 'app_base_url',
  'functions_version', 'from_url', 'token',
];

/**
 * Check if the current path is an auth-related route.
 */
export function isAuthRoute(pathname = window.location.pathname) {
  return AUTH_ROUTES.some(r => pathname.startsWith(r));
}

/**
 * Capture the current path for post-auth return. Only captures if the
 * user is NOT on an auth route (to avoid redirect loops).
 */
export function captureReturnUrl(pathname = window.location.pathname, search = window.location.search) {
  if (isAuthRoute(pathname)) return;
  const current = pathname + search;
  try {
    sessionStorage.setItem(SESSION_KEY, current);
  } catch {
    // sessionStorage unavailable (private browsing) — best-effort
  }
}

/**
 * Mark that a session has expired, so the login page can show
 * a "your session expired" message instead of a generic login.
 */
export function flagSessionExpired() {
  try {
    sessionStorage.setItem(SESSION_EXPIRY_FLAG, 'true');
  } catch {
    // best-effort
  }
}

/**
 * Consume the session-expired flag. Returns true if the session
 * had expired, then clears the flag so it only shows once.
 */
export function consumeSessionExpiredFlag() {
  try {
    const flag = sessionStorage.getItem(SESSION_EXPIRY_FLAG);
    if (flag === 'true') {
      sessionStorage.removeItem(SESSION_EXPIRY_FLAG);
      return true;
    }
  } catch {
    // best-effort
  }
  return false;
}

/**
 * Resolve the safe post-auth destination. Checks:
 *   1. URL params (next / returnUrl / returnTo) — validated
 *   2. sessionStorage fallback — validated
 *   3. Default — provided fallback (usually /workspace)
 *
 * Strips forbidden params and rejects open-redirect attempts.
 */
export function resolveReturnUrl(defaultUrl = '/workspace') {
  // 1. URL params
  const urlParams = new URLSearchParams(window.location.search);
  const fromUrl = urlParams.get('next') || urlParams.get('returnUrl') || urlParams.get('returnTo');
  if (fromUrl) {
    const safe = sanitizePath(fromUrl);
    if (safe) return safe;
  }

  // 2. sessionStorage fallback
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      const safe = sanitizePath(stored);
      if (safe) return safe;
    }
  } catch {
    // sessionStorage unavailable
  }

  // 3. Default
  return defaultUrl;
}

/**
 * Consume (clear) the stored return URL after successful auth.
 */
export function clearReturnUrl() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // best-effort
  }
}

/**
 * Sanitize a path to ensure it's a safe same-origin redirect target.
 * Rejects:
 *   - Non-string or empty values
 *   - Paths not starting with "/"
 *   - Protocol-relative URLs (//evil.com)
 *   - Backslash-based escapes (/\evil.com)
 *   - Data/blob/javascript URLs
 *   - Paths starting with auth routes (to prevent redirect loops)
 * Strips forbidden app-bootstrap params.
 *
 * @param {string} raw - The raw path/URL to sanitize.
 * @returns {string|null} Safe path or null if rejected.
 */
export function sanitizePath(raw) {
  if (!raw || typeof raw !== 'string') return null;

  // Reject anything that looks like a URL with a scheme
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return null;

  // Must start with a single leading slash
  if (!raw.startsWith('/')) return null;
  if (raw.startsWith('//') || raw.startsWith('/\\')) return null;
  if (raw.includes('\\')) return null;

  try {
    // Parse as URL relative to current origin
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return null;

    // Strip forbidden params
    for (const p of FORBIDDEN_PARAMS) {
      url.searchParams.delete(p);
    }

    const path = url.pathname + url.search;

    // Re-validate the resolved path
    if (!path.startsWith('/') || path.startsWith('//')) return null;

    // Reject auth routes to prevent redirect loops
    if (isAuthRoute(url.pathname)) return null;

    return path;
  } catch {
    return null;
  }
}

/**
 * Navigate to the resolved return URL using a full page navigation
 * (required because the auth token is set in localStorage and the
 * SDK needs a fresh app boot to pick it up).
 */
export function navigateToReturnUrl(defaultUrl = '/workspace') {
  const destination = resolveReturnUrl(defaultUrl);
  clearReturnUrl();
  window.location.href = destination;
}