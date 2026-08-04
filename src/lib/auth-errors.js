// ============================================================
// ORBITAN — Canonical Authentication Error Mapping Layer
//
// Single source of truth for translating raw Base44 auth errors
// into safe, user-facing messages. Never exposes:
//   - raw backend messages
//   - provider error codes
//   - stack traces
//   - token values
//   - sensitive account state (existence/non-existence of accounts)
//
// Used by Login, Register, ForgotPassword, ResetPassword, and
// the AuthContext session-expiry handler.
// ============================================================

/**
 * Standard auth error categories. Each maps to a safe user-facing message.
 * Pages consume these to render appropriate UI (error alerts, redirect
 * prompts, resend actions, etc.).
 */
export const AUTH_ERROR_TYPES = {
  INVALID_CREDENTIALS: 'invalid_credentials',
  VERIFICATION_REQUIRED: 'verification_required',
  ACCOUNT_ALREADY_VERIFIED: 'account_already_verified',
  INVALID_VERIFICATION_CODE: 'invalid_verification_code',
  EXPIRED_VERIFICATION_CODE: 'expired_verification_code',
  INVALID_RESET_LINK: 'invalid_reset_link',
  EXPIRED_RESET_LINK: 'expired_reset_link',
  PASSWORD_POLICY: 'password_policy',
  PASSWORD_MISMATCH: 'password_mismatch',
  ACCOUNT_EXISTS: 'account_exists',
  ACCOUNT_DISABLED: 'account_disabled',
  RATE_LIMITED: 'rate_limited',
  NETWORK_FAILURE: 'network_failure',
  SERVICE_UNAVAILABLE: 'service_unavailable',
  UNAUTHORISED: 'unauthorised',
  FORBIDDEN: 'forbidden',
  SESSION_EXPIRED: 'session_expired',
  UNKNOWN: 'unknown',
};

/**
 * Maps a raw SDK error to a canonical auth error type + safe message.
 *
 * @param {Error|Object} err - The caught error from a base44.auth call.
 * @param {Object} [opts] - Optional context.
 * @param {string} [opts.context] - 'login' | 'register' | 'verify' | 'reset_request' | 'reset' | 'session'
 * @returns {{ type: string, message: string }}
 */
export function classifyAuthError(err, opts = {}) {
  const msg = String(err?.message || '').toLowerCase();
  const status = err?.status || err?.response?.status;
  const { context } = opts;

  // ── Rate limiting (429) ──
  if (status === 429 || msg.includes('rate') || msg.includes('too many') || msg.includes('throttl')) {
    return {
      type: AUTH_ERROR_TYPES.RATE_LIMITED,
      message: 'Too many attempts. Please wait a moment and try again.',
    };
  }

  // ── Network / connectivity ──
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('connection') || msg.includes('failed to fetch') || msg.includes('timeout') || status === 0) {
    return {
      type: AUTH_ERROR_TYPES.NETWORK_FAILURE,
      message: 'Unable to connect. Please check your internet connection and try again.',
    };
  }

  // ── Service unavailable (5xx) ──
  if (status >= 500 && status < 600) {
    return {
      type: AUTH_ERROR_TYPES.SERVICE_UNAVAILABLE,
      message: 'The authentication service is temporarily unavailable. Please try again shortly.',
    };
  }

  // ── Session expiry ──
  if (status === 401 && (context === 'session' || msg.includes('expired') || msg.includes('session') || msg.includes('token'))) {
    return {
      type: AUTH_ERROR_TYPES.SESSION_EXPIRED,
      message: 'Your session has expired. Please sign in again to continue.',
    };
  }

  // ── Account disabled / suspended (check BEFORE generic 403) ──
  if (msg.includes('disabled') || msg.includes('banned') || msg.includes('suspended') || msg.includes('deactivated')) {
    return {
      type: AUTH_ERROR_TYPES.ACCOUNT_DISABLED,
      message: 'Your account has been suspended. Please contact your administrator.',
    };
  }

  // ── Verification required (login with unverified email — check BEFORE generic 403) ──
  if (context === 'login' && (msg.includes('verif') || msg.includes('not verified') || msg.includes('email not confirmed'))) {
    return {
      type: AUTH_ERROR_TYPES.VERIFICATION_REQUIRED,
      message: 'Please verify your email before signing in. Check your inbox for the verification code.',
    };
  }

  // ── Forbidden / unauthorised ──
  if (status === 403) {
    if (msg.includes('not registered') || msg.includes('not_allowed') || msg.includes('forbidden')) {
      return {
        type: AUTH_ERROR_TYPES.FORBIDDEN,
        message: 'You do not have permission to access this workspace. Please contact your administrator.',
      };
    }
    return {
      type: AUTH_ERROR_TYPES.FORBIDDEN,
      message: 'Access denied. Please contact your administrator if you believe this is an error.',
    };
  }

  // ── Already verified ──
  if (msg.includes('already verified') || msg.includes('already confirmed') || msg.includes('already active')) {
    return {
      type: AUTH_ERROR_TYPES.ACCOUNT_ALREADY_VERIFIED,
      message: 'This account is already verified. You can sign in.',
    };
  }

  // ── Verification code errors ──
  if (context === 'verify') {
    if (msg.includes('expired')) {
      return {
        type: AUTH_ERROR_TYPES.EXPIRED_VERIFICATION_CODE,
        message: 'This verification code has expired. Please request a new one.',
      };
    }
    if (msg.includes('invalid') || msg.includes('wrong') || msg.includes('mismatch') || msg.includes('incorrect')) {
      return {
        type: AUTH_ERROR_TYPES.INVALID_VERIFICATION_CODE,
        message: 'The verification code is incorrect. Please check and try again.',
      };
    }
  }

  // ── Reset token errors ──
  if (context === 'reset') {
    if (msg.includes('expired') || msg.includes('invalid') || msg.includes('token') || msg.includes('used')) {
      return {
        type: AUTH_ERROR_TYPES.EXPIRED_RESET_LINK,
        message: 'This password reset link has expired or is no longer valid. Please request a new one.',
      };
    }
  }

  // ── Password policy ──
  if (msg.includes('weak') || msg.includes('password') && (msg.includes('short') || msg.includes('require') || msg.includes('strength') || msg.includes('policy'))) {
    return {
      type: AUTH_ERROR_TYPES.PASSWORD_POLICY,
      message: 'Password is too weak. Use at least 8 characters with a mix of letters, numbers, and symbols.',
    };
  }

  // ── Account already exists (registration) ──
  if (context === 'register' && (msg.includes('already') || msg.includes('exists') || status === 409)) {
    return {
      type: AUTH_ERROR_TYPES.ACCOUNT_EXISTS,
      message: 'An account with this email already exists. Please sign in instead.',
    };
  }

  // ── Invalid credentials (login fallback) ──
  if (context === 'login') {
    return {
      type: AUTH_ERROR_TYPES.INVALID_CREDENTIALS,
      message: 'Invalid email or password. Please try again.',
    };
  }

  // ── Generic fallback ──
  return {
    type: AUTH_ERROR_TYPES.UNKNOWN,
    message: getDefaultMessage(context),
  };
}

function getDefaultMessage(context) {
  switch (context) {
    case 'login':
      return 'Unable to sign in. Please check your details and try again.';
    case 'register':
      return 'Unable to create your account. Please try again.';
    case 'verify':
      return 'Unable to verify your code. Please try again or request a new code.';
    case 'reset_request':
      return 'Unable to send the reset email. Please try again.';
    case 'reset':
      return 'Unable to reset your password. Please try again or request a new reset link.';
    case 'session':
      return 'Your session has expired. Please sign in again to continue.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Convenience: classify for login context.
 */
export function classifyLoginError(err) {
  return classifyAuthError(err, { context: 'login' });
}

/**
 * Convenience: classify for registration context.
 */
export function classifyRegisterError(err) {
  return classifyAuthError(err, { context: 'register' });
}

/**
 * Convenience: classify for OTP verification context.
 */
export function classifyVerifyError(err) {
  return classifyAuthError(err, { context: 'verify' });
}

/**
 * Convenience: classify for password reset context.
 */
export function classifyResetError(err) {
  return classifyAuthError(err, { context: 'reset' });
}

/**
 * Convenience: classify for session expiry (mid-session API failure).
 */
export function classifySessionError(err) {
  return classifyAuthError(err, { context: 'session' });
}