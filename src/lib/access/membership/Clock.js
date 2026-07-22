// ============================================================
// ORBITANOS — Access Engine :: Clock Abstraction (Milestone 3.1)
// Architecture Version 1.0
//
// A controllable clock so temporal RoleAssignment evaluation never
// depends on the device's uncontrolled current time. Production
// wiring uses createSystemClock(); tests inject createFixedClock().
//
// Pure, dependency-free. Exit-Ready.
// ============================================================

export const CLOCK_VERSION = '1.0.0';

/**
 * Real-time clock. `now()` returns a fresh Date on each call.
 */
export function createSystemClock() {
  return Object.freeze({
    type: 'system',
    now() { return new Date(); },
    nowIso() { return new Date().toISOString(); },
  });
}

/**
 * Fixed clock pinned to a single instant. `now()` returns a copy of
 * the pinned Date so callers cannot mutate the internal value.
 * @param {string|Date} isoOrDate ISO 8601 string or Date instance
 */
export function createFixedClock(isoOrDate) {
  const pinned = isoOrDate instanceof Date
    ? new Date(isoOrDate.getTime())
    : new Date(isoOrDate);
  if (Number.isNaN(pinned.getTime())) {
    throw new Error('createFixedClock: invalid date argument');
  }
  return Object.freeze({
    type: 'fixed',
    now() { return new Date(pinned.getTime()); },
    nowIso() { return pinned.toISOString(); },
  });
}

/**
 * Resolve a clock from optional context. Falls back to system clock.
 * Accepts either a Clock instance or an ISO string (treated as fixed).
 */
export function resolveClock(clock) {
  if (!clock) return createSystemClock();
  if (typeof clock.now === 'function') return clock;
  if (typeof clock === 'string') return createFixedClock(clock);
  return createSystemClock();
}