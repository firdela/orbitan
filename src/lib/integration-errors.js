// ============================================================
// ORBITANOS — Integration Error Classification Utility
//
// Maps raw Base44 function invocation errors to user-friendly
// messages with contextual recovery actions. Prevents raw HTTP
// error strings ("Request failed with status code 400") from
// reaching the UI.
//
// Exit-Ready: pure utility, no platform dependencies.
// ============================================================

/**
 * Extracts the structured error body from a Base44 SDK error.
 * The SDK may wrap the response in various shapes depending on
 * the failure mode.
 */
function extractErrorBody(err) {
  // Direct response body
  if (err?.response?.data) return err.response.data;
  if (err?.data) return err.data;
  if (err?.response) return err.response;
  // Some errors carry a parsed JSON body
  if (err?.body && typeof err.body === 'object') return err.body;
  return null;
}

/**
 * Classifies a Base44 function invocation error into a structured
 * user-facing error with a friendly title, message, and suggested
 * recovery action.
 *
 * @param {Error} err — The error thrown by base44.functions.invoke
 * @param {object} opts — { action: 'connect'|'sync'|'disconnect'|'test', service: 'xero'|'stripe'|... }
 * @returns {{ title: string, message: string, variant: 'error'|'warning'|'info', action: { label: string, to: string|null, dismiss: boolean }|null }}
 */
export function classifyIntegrationError(err, opts = {}) {
  const { action = 'connect', service = 'xero' } = opts;
  const body = extractErrorBody(err);
  const status = err?.status || err?.response?.status || err?.statusCode;
  const rawMessage = err?.message || '';
  const bodyError = body?.error || body?.message || '';
  const combinedMsg = `${rawMessage} ${bodyError}`.toLowerCase();

  // ── Network failure / timeout ──
  if (
    rawMessage.includes('NetworkError') ||
    rawMessage.includes('Failed to fetch') ||
    rawMessage.includes('network') ||
    rawMessage.includes('timeout') ||
    rawMessage.includes('ENOTFOUND') ||
    rawMessage.includes('ECONNREFUSED')
  ) {
    return {
      title: 'Network Connection Issue',
      message: 'We could not reach the server. Please check your internet connection and try again.',
      variant: 'warning',
      action: { label: 'Retry', to: null, dismiss: true },
    };
  }

  // ── Missing tenant context ──
  if (combinedMsg.includes('tenant_id is required') || combinedMsg.includes('no workspace')) {
    return {
      title: 'No Workspace Selected',
      message: 'Please select a workspace before connecting your Xero organisation. Use the workspace switcher in the header.',
      variant: 'warning',
      action: { label: null, to: null, dismiss: true },
    };
  }

  // ── Platform not configured ──
  if (
    body?.configured === false ||
    combinedMsg.includes('not configured') ||
    combinedMsg.includes('not_configured') ||
    combinedMsg.includes('client_id') ||
    combinedMsg.includes('client_secret')
  ) {
    return {
      title: `${service === 'xero' ? 'Xero' : 'Integration'} Temporarily Unavailable`,
      message: `${service === 'xero' ? 'Xero' : 'This integration'} is temporarily unavailable. Please try again later or contact Orbitan Support.`,
      variant: 'info',
      action: { label: null, to: null, dismiss: true },
    };
  }

  // ── Expired credentials ──
  if (
    combinedMsg.includes('expired') ||
    combinedMsg.includes('reconnect') ||
    combinedMsg.includes('token refresh failed') ||
    status === 401
  ) {
    return {
      title: 'Connection Expired',
      message: 'Your Xero connection has expired or been revoked. Please reconnect to continue syncing.',
      variant: 'warning',
      action: { label: 'Reconnect', to: null, dismiss: true },
    };
  }

  // ── Forbidden (wrong role) ──
  if (status === 403 || combinedMsg.includes('forbidden')) {
    return {
      title: 'Permission Required',
      message: 'Only workspace administrators can manage Xero connections. Ask your admin to connect Xero for your organisation.',
      variant: 'warning',
      action: { label: null, to: null, dismiss: true },
    };
  }

  // ── OAuth cancelled by user ──
  if (combinedMsg.includes('cancelled') || combinedMsg.includes('access_denied') || combinedMsg.includes('user denied')) {
    return {
      title: 'Connection Cancelled',
      message: 'You cancelled the Xero authorisation. No changes were made — you can try again anytime.',
      variant: 'info',
      action: { label: null, to: null, dismiss: true },
    };
  }

  // ── Bad request (validation, wrong code, etc.) ──
  if (status === 400) {
    const friendlyMsg = bodyError || 'The request was invalid. This may be due to an expired authorisation code or a configuration mismatch.';
    return {
      title: `${action === 'connect' ? 'Connection' : 'Action'} Failed`,
      message: friendlyMsg,
      variant: 'error',
      action: { label: 'Retry', to: null, dismiss: true },
    };
  }

  // ── Service unavailable (503) ──
  if (status === 503 || combinedMsg.includes('unavailable') || combinedMsg.includes('service')) {
    return {
      title: 'Service Temporarily Unavailable',
      message: 'The integration service is temporarily unavailable. Please try again in a few minutes.',
      variant: 'warning',
      action: { label: 'Retry', to: null, dismiss: true },
    };
  }

  // ── Generic fallback ──
  return {
    title: `${action === 'connect' ? 'Connection' : 'Operation'} Failed`,
    message: 'An unexpected error occurred. Please try again, and if the problem persists, contact support.',
    variant: 'error',
    action: { label: 'Retry', to: null, dismiss: true },
  };
}