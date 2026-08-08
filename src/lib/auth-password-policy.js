// ============================================================
// ORBITAN — Canonical Password Policy Helper
//
// Single source of truth for client-side password validation
// across Register and ResetPassword. Ensures ONE consistent
// policy is enforced everywhere.
//
// Client validation is UX only — Base44 server-side policy
// remains authoritative. Never falsely claim a password is
// accepted until Base44 accepts it.
// ============================================================

export const PASSWORD_MIN_LENGTH = 8;

/**
 * Validate password length against the canonical minimum.
 * @param {string} password
 * @returns {{ valid: boolean, message: string }}
 */
export function validatePasswordLength(password) {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return {
      valid: false,
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`,
    };
  }
  return { valid: true, message: '' };
}

/**
 * Validate that password and confirmation match.
 * @param {string} password
 * @param {string} confirmPassword
 * @returns {{ valid: boolean, message: string }}
 */
export function validatePasswordMatch(password, confirmPassword) {
  if (password !== confirmPassword) {
    return {
      valid: false,
      message: 'Passwords do not match. Please ensure both fields are identical.',
    };
  }
  return { valid: true, message: '' };
}

/**
 * Combined validation: length + match. Returns the first error
 * found, or { valid: true } if both pass.
 * @param {string} password
 * @param {string} confirmPassword
 * @returns {{ valid: boolean, message: string }}
 */
export function validatePassword(password, confirmPassword) {
  const lengthCheck = validatePasswordLength(password);
  if (!lengthCheck.valid) return lengthCheck;

  const matchCheck = validatePasswordMatch(password, confirmPassword);
  if (!matchCheck.valid) return matchCheck;

  return { valid: true, message: '' };
}