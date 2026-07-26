// ============================================================
// ORBITANOS — User preference application (Build #26A.2)
// Applies theme + accessibility preferences to the document root
// so they take effect app-wide and persist across navigation.
// Source of truth: user.data.preferences (via base44.auth.updateMe).
// localStorage mirrors them so preferences apply before auth
// resolves on reload. EXIT-READY: pure DOM, zero platform deps.
// ============================================================

export const DEFAULT_PREFS = {
  theme: 'system',          // 'system' | 'light' | 'dark'
  reduce_motion: false,
  large_text: false,
  high_contrast: false,
};

export function applyPreferences(prefs = {}) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const merged = { ...DEFAULT_PREFS, ...(prefs || {}) };

  // Theme
  const prefersDark =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = merged.theme === 'dark' || (merged.theme === 'system' && prefersDark);
  root.classList.toggle('dark', isDark);

  // Accessibility
  root.classList.toggle('reduce-motion', !!merged.reduce_motion);
  root.classList.toggle('large-text', !!merged.large_text);
  root.classList.toggle('high-contrast', !!merged.high_contrast);

  try {
    localStorage.setItem('orbitan_prefs', JSON.stringify(merged));
  } catch (_) {
    /* storage unavailable — non-fatal */
  }
}

export function getStoredPrefs() {
  try {
    return JSON.parse(localStorage.getItem('orbitan_prefs') || '{}');
  } catch (_) {
    return {};
  }
}